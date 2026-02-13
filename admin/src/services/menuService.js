import api from './api'
import { UPLOADS_BASE_URL } from '../config/constants'
import restaurantService from './restaurantService'

/**
 * Service pour gérer les menus (produits) via l'API externe
 */
class MenuService {
  /**
   * Récupérer tous les menus de tous les restaurants
   * Récupère les produits de TOUS les sous-menus (déjeuner, repas, dîner, boisson, etc.)
   */
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
      
      // 3. Pour chaque restaurant, récupérer les menus de TOUS les sous-menus
      const allMenus = []
      const menuMap = new Map() // Pour éviter les doublons
      
      for (const restaurant of restaurants) {
        for (const subMenu of subMenus) {
          try {
            const subMenuId = subMenu.id || subMenu.sub_menu_id
            if (!subMenuId) continue
            
            // Utiliser le service api qui gère automatiquement le proxy
            const menusResponse = await api.get(
              `/get-menu-by-resto?debut=2025-01-01&fin=2026-12-31&sub_menu_id=${subMenuId}&resto_id=${restaurant.id}`
            )

            const menus = menusResponse.data
            
            if (Array.isArray(menus) && menus.length > 0) {
              // Enrichir chaque menu avec les infos du restaurant et du sous-menu
              menus.forEach(menu => {
                // Créer une clé unique pour éviter les doublons
                const uniqueKey = `${restaurant.id}_${menu.id || menu.libelle}_${menu.prix}`
                
                if (!menuMap.has(uniqueKey)) {
                  const enrichedMenu = {
                    ...menu,
                    restaurant_name: restaurant.name || restaurant.libelle,
                    restaurant_id: restaurant.id,
                    sub_menu_id: subMenuId,
                    sub_menu_name: subMenu.libelle || subMenu.name || `Sous-menu ${subMenuId}`,
                    // Construire l'URL complète de l'image
                    image_url: menu.cover 
                      ? `${UPLOADS_BASE_URL}/${menu.cover}`
                      : null,
                  }
                  
                  menuMap.set(uniqueKey, enrichedMenu)
                  allMenus.push(enrichedMenu)
                }
              })
            }
          } catch (error) {
            console.warn(`⚠️ [MenuService] Erreur pour restaurant ${restaurant.id}, sous-menu ${subMenu.id}:`, error.message)
            // Continuer avec les autres sous-menus même en cas d'erreur
          }
        }
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
