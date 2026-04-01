import api from './api'
import { UPLOADS_BASE_URL } from '../config/constants'
import restaurantService from './restaurantService'

/** Requêtes API menu en parallèle par paquets (fallback si products-list indisponible) */
const MENU_FETCH_CONCURRENCY = 12

/**
 * Service pour gérer les menus (produits) via l'API externe
 */
class MenuService {
  /**
   * Catalogue « simple » (products-list), normalisé pour l’admin Promos.
   * @returns {Promise<Array>} liste vide si erreur / pas de données
   */
  async _fetchCatalogProductsListNormalized() {
    try {
      const [response, restaurants] = await Promise.all([
        api.get('/products-list'),
        restaurantService.getAll(),
      ])
      const data = response.data
      if (!Array.isArray(data) || data.length === 0) {
        return []
      }
      const restoById = new Map(
        restaurants.map((r) => [Number(r.id), r.name || r.libelle || ''])
      )

      const mapped = []
      const seen = new Set()

      for (const p of data) {
        const id = p.id
        if (id == null || seen.has(id)) continue
        seen.add(id)

        const ridRaw =
          p.restaurant_id ??
          p.resto_id ??
          p.restaurant_restaurant_id ??
          p.resto?.id

        const rid = ridRaw != null ? Number(ridRaw) : null
        const rname =
          p.restaurant_name ??
          p.resto_name ??
          p.resto?.name ??
          p.resto?.libelle ??
          (rid != null ? restoById.get(rid) : null) ??
          '—'

        const cover = p.image_url || p.cover
        let image_url = null
        if (cover && typeof cover === 'string') {
          if (cover.startsWith('http')) {
            image_url = cover
          } else {
            const path = cover.replace(/^\//, '')
            image_url = `${UPLOADS_BASE_URL}/${path}`
          }
        }

        const prix = p.prix ?? p.price ?? 0

        mapped.push({
          ...p,
          id,
          libelle: p.libelle || p.name || 'Produit',
          description: p.desc || p.description || '',
          prix,
          restaurant_id: ridRaw != null ? ridRaw : null,
          restaurant_name: rname,
          image_url,
        })
      }
      return mapped
    } catch (error) {
      console.warn('⚠️ [MenuService] products-list indisponible:', error.message)
      return []
    }
  }

  /**
   * Onglet Promos : fusion **catalogue** (products-list) + **menus restaurants** (tous sous-menus).
   * Chaque ligne a `productOrigin`: `catalog` | `restaurant`.
   */
  async getProductsForPromosAdmin() {
    console.log('📋 [MenuService] Promos — fusion catalogue + menus restaurants...')
    const [menus, catalog] = await Promise.all([
      this.getAllMenus().catch((e) => {
        console.error('❌ [MenuService] getAllMenus:', e)
        return []
      }),
      this._fetchCatalogProductsListNormalized(),
    ])

    const rowKey = (p, segment) => {
      const rid =
        p.restaurant_id != null && p.restaurant_id !== ''
          ? String(p.restaurant_id)
          : 'none'
      const sid =
        p.sub_menu_id != null && p.sub_menu_id !== ''
          ? String(p.sub_menu_id)
          : '-'
      return `${segment}|${rid}|${sid}|${String(p.id)}|${String(p.prix ?? p.price ?? '')}`
    }

    const seen = new Set()
    const out = []

    for (const p of menus) {
      const row = {
        ...p,
        libelle: p.libelle || p.name || 'Produit',
        description: p.desc || p.description || '',
        prix: p.prix ?? p.price ?? 0,
        productOrigin: 'restaurant',
      }
      const k = rowKey(row, 'R')
      if (seen.has(k)) continue
      seen.add(k)
      out.push(row)
    }

    for (const p of catalog) {
      const row = { ...p, productOrigin: 'catalog' }
      const k = rowKey(row, 'C')
      if (seen.has(k)) continue
      seen.add(k)
      out.push(row)
    }

    if (out.length === 0 && menus.length === 0 && catalog.length === 0) {
      console.warn('⚠️ [MenuService] Aucune donnée Promos (menus + catalogue vides)')
    }

    console.log(
      `✅ [MenuService] Promos: ${menus.length} lignes menus + ${catalog.length} catalogue → ${out.length} lignes affichables`
    )
    return out
  }

  async getAllMenus() {
    try {
      console.log('📋 [MenuService] Chargement de tous les menus...')
      
      // 1. Récupérer tous les sous-menus disponibles
      let subMenus = []
      try {
        const subMenusResponse = await api.get('/submenu-list')
        subMenus = Array.isArray(subMenusResponse.data) ? subMenusResponse.data : []
        console.log(`📋 [MenuService] ${subMenus.length} sous-menus trouvés:`, subMenus.map(sm => sm.libelle || sm.name).join(', '))
      } catch (error) {
        console.warn('⚠️ [MenuService] Impossible de récupérer la liste des sous-menus, utilisation des IDs par défaut:', error)
        // Fallback: utiliser des IDs de sous-menus communs si l'API ne répond pas
        subMenus = [
          { id: 1, libelle: 'Déjeuner' },
          { id: 2, libelle: 'Repas' },
          { id: 3, libelle: 'Boissons' },
          { id: 4, libelle: 'Dîner' },
          { id: 5, libelle: 'Desserts' },
        ]
      }
      
      // 2. Récupérer tous les restaurants
      const restaurants = await restaurantService.getAll()
      console.log(`📋 [MenuService] ${restaurants.length} restaurants trouvés`)

      const jobs = []
      for (const restaurant of restaurants) {
        for (const subMenu of subMenus) {
          const subMenuId = subMenu.id || subMenu.sub_menu_id
          if (subMenuId) {
            jobs.push({ restaurant, subMenu, subMenuId })
          }
        }
      }

      const allMenus = []
      const menuMap = new Map()

      const fetchJobMenus = async ({ restaurant, subMenu, subMenuId }) => {
        try {
          const menusResponse = await api.get(
            `/get-menu-by-resto?debut=2025-01-01&fin=2026-12-31&sub_menu_id=${subMenuId}&resto_id=${restaurant.id}`
          )
          const menus = menusResponse.data
          if (!Array.isArray(menus) || menus.length === 0) {
            return []
          }
          const rows = []
          menus.forEach((menu) => {
            const uniqueKey = `${restaurant.id}_${menu.id || menu.libelle}_${menu.prix}`
            rows.push({
              uniqueKey,
              enriched: {
                ...menu,
                libelle: menu.libelle || menu.name || 'Produit',
                description: menu.desc || menu.description || '',
                prix: menu.prix ?? menu.price ?? 0,
                restaurant_name: restaurant.name || restaurant.libelle,
                restaurant_id: restaurant.id,
                sub_menu_id: subMenuId,
                sub_menu_name: subMenu.libelle || subMenu.name || `Sous-menu ${subMenuId}`,
                image_url: menu.cover ? `${UPLOADS_BASE_URL}/${menu.cover}` : null,
              },
            })
          })
          return rows
        } catch (error) {
          console.warn(
            `⚠️ [MenuService] Erreur pour restaurant ${restaurant.id}, sous-menu ${subMenu.id}:`,
            error.message
          )
          return []
        }
      }

      for (let i = 0; i < jobs.length; i += MENU_FETCH_CONCURRENCY) {
        const chunk = jobs.slice(i, i + MENU_FETCH_CONCURRENCY)
        const chunkRows = await Promise.all(chunk.map(fetchJobMenus))
        chunkRows.flat().forEach(({ uniqueKey, enriched }) => {
          if (!menuMap.has(uniqueKey)) {
            menuMap.set(uniqueKey, enriched)
            allMenus.push(enriched)
          }
        })
      }

      console.log(`✅ [MenuService] Total: ${allMenus.length} produits chargés de tous les sous-menus`)
      return allMenus
    } catch (error) {
      console.error('❌ [MenuService] Erreur lors de la récupération de tous les menus:', error)
      throw error
    }
  }

  /**
   * Récupérer les menus d'un restaurant spécifique
   */
  async getMenusByRestaurant(restaurantId) {
    try {
      // Utiliser le service api qui gère automatiquement le proxy
      const response = await api.get(
        `/get-menu-by-resto?debut=2025-01-01&fin=2026-12-31&sub_menu_id=4&resto_id=${restaurantId}`
      )

      const menus = response.data
      
      // Enrichir avec les URLs d'images
      return menus.map(menu => ({
        ...menu,
        image_url: menu.cover 
          ? `${UPLOADS_BASE_URL}/${menu.cover}`
          : null,
      }))
    } catch (error) {
      console.error('❌ [MenuService] Erreur lors de la récupération des menus du restaurant:', error)
      throw error
    }
  }
}

export default new MenuService()
