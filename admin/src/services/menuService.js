import { API_BASE_URL, UPLOADS_BASE_URL } from '../config/constants'

/**
 * Service pour gérer les menus (produits) via l'API externe
 */
class MenuService {
  /**
   * Récupérer tous les menus de tous les restaurants
   */
  async getAllMenus() {
    try {
      // Récupérer tous les restaurants
      const restaurantsResponse = await fetch(`${API_BASE_URL}/resto`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!restaurantsResponse.ok) {
        throw new Error(`Erreur HTTP: ${restaurantsResponse.status}`)
      }

      const restaurants = await restaurantsResponse.json()
      
      // Pour chaque restaurant, récupérer ses menus
      const allMenus = []
      
      for (const restaurant of restaurants) {
        try {
          // Utiliser une plage de dates large pour récupérer tous les menus
          const menusResponse = await fetch(
            `${API_BASE_URL}/get-menu-by-resto?debut=2025-01-01&fin=2026-12-31&sub_menu_id=4&resto_id=${restaurant.id}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            }
          )

          if (menusResponse.ok) {
            const menus = await menusResponse.json()
            
            if (Array.isArray(menus)) {
              // Enrichir chaque menu avec les infos du restaurant
              const enrichedMenus = menus.map(menu => ({
                ...menu,
                restaurant_name: restaurant.name,
                restaurant_id: restaurant.id,
                // Construire l'URL complète de l'image
                image_url: menu.cover 
                  ? `${UPLOADS_BASE_URL}/${menu.cover}`
                  : null,
              }))
              
              allMenus.push(...enrichedMenus)
            }
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération des menus du restaurant ${restaurant.id}:`, error)
          // Continuer avec les autres restaurants même en cas d'erreur
        }
      }

      return allMenus
    } catch (error) {
      console.error('Erreur lors de la récupération de tous les menus:', error)
      throw error
    }
  }

  /**
   * Récupérer les menus d'un restaurant spécifique
   */
  async getMenusByRestaurant(restaurantId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/get-menu-by-resto?debut=2025-01-01&fin=2026-12-31&sub_menu_id=4&resto_id=${restaurantId}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const menus = await response.json()
      
      // Enrichir avec les URLs d'images
      return menus.map(menu => ({
        ...menu,
        image_url: menu.cover 
          ? `${UPLOADS_BASE_URL}/${menu.cover}`
          : null,
      }))
    } catch (error) {
      console.error('Erreur lors de la récupération des menus du restaurant:', error)
      throw error
    }
  }
}

export default new MenuService()
