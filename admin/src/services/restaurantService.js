import { UPLOADS_BASE_URL, API_BASE_URL } from '../config/constants'
import api from './api'

/**
 * Service pour gérer les restaurants via l'API externe
 */
class RestaurantService {
  /**
   * Récupérer tous les restaurants depuis l'API
   */
  async getAll() {
    try {
      const response = await api.get('/resto')
      const data = response.data
      
      // Normaliser les données
      if (Array.isArray(data)) {
        return data.map(restaurant => {
          // Fonction helper pour construire l'URL de l'image
          const buildImageUrl = (imagePath) => {
            if (!imagePath) return null
            
            // Si c'est déjà une URL complète
            if (typeof imagePath === 'string' && imagePath.startsWith('http')) {
              return imagePath
            }
            
            // Si le chemin commence déjà par uploads_admin, ne pas le dupliquer
            if (typeof imagePath === 'string' && imagePath.startsWith('uploads_admin/')) {
              return `${UPLOADS_BASE_URL}/${imagePath}`
            }
            
            // Sinon, construire l'URL complète
            return `${UPLOADS_BASE_URL}/${imagePath}`
          }

          const normalizedRestaurant = {
            // Garder toutes les propriétés originales en premier
            ...restaurant,
            id: restaurant.id,
            name: restaurant.name || restaurant.libelle,
            libelle: restaurant.libelle,
            adresse: restaurant.adresse || restaurant.address,
            address: restaurant.address,
            phone: restaurant.phone || restaurant.telephone,
            telephone: restaurant.telephone,
            statut: restaurant.statut || 'actif',
            // Photo de couverture (comme dans l'app mobile)
            cover: buildImageUrl(restaurant.cover),
            cover_url: buildImageUrl(restaurant.cover),
            cover_original: restaurant.cover, // Garder le chemin original pour les mises à jour
            // Logo (utiliser le logo si présent, sinon fallback sur la photo de couverture)
            logo: buildImageUrl(restaurant.logo) || buildImageUrl(restaurant.cover),
            logo_url: buildImageUrl(restaurant.logo) || buildImageUrl(restaurant.cover),
            logo_original: restaurant.logo, // Garder le chemin original
            ville_id: restaurant.ville_id,
            altitude: restaurant.altitude,
            longitude: restaurant.longitude,
            website: restaurant.website,
          }

          return normalizedRestaurant
        })
      }
      
      return []
    } catch (error) {
      console.error('Erreur lors de la récupération des restaurants:', error)
      throw error
    }
  }

  /**
   * Récupérer un restaurant par ID
   */
  async getById(id) {
    try {
      const response = await api.get(`/resto/${id}`)
      return response.data
    } catch (error) {
      console.error('Erreur lors de la récupération du restaurant:', error)
      throw error
    }
  }

  /**
   * Mettre à jour le statut d'un restaurant (ouvrir/fermer)
   * Note: L'API ne supporte pas la mise à jour du statut, donc on met à jour uniquement Firebase
   */
  async updateStatus(id, status, restaurantData = null) {
    console.log(`[updateStatus] Starting status update for ID: ${id} to ${status}`)
    
    // L'API ne supporte pas la mise à jour du statut des restaurants (404)
    // On retourne simplement un succès car Firebase sera mis à jour séparément
    // dans handleToggleStatus de Restaurants.jsx
    console.log(`[updateStatus] API ne supporte pas la mise à jour du statut, Firebase sera mis à jour séparément`)
    
    return { success: true, message: 'Statut mis à jour dans Firebase uniquement (API non supportée)' }
  }

  /**
   * Mettre à jour un restaurant
   */
  async update(id, data) {
    try {
      // Si c'est du FormData (multipart), on essaie d'abord avec PUT direct
      if (data instanceof FormData) {
        try {
          // Essayer d'abord avec PUT direct
          const response = await api.put(`/resto/${id}`, data, {
            headers: {
              'Content-Type': 'multipart/form-data',
            }
          })
          return response.data
        } catch (putError) {
          // Si PUT échoue avec 404 ou 405, essayer avec POST + _method: PUT
          if (putError.response?.status === 404 || putError.response?.status === 405) {
            console.log('⚠️ PUT non supporté, tentative avec POST + _method: PUT')
            if (!data.has('_method')) {
              data.append('_method', 'PUT')
            }
            
            const response = await api.post(`/resto/${id}`, data, {
              headers: {
                'Content-Type': 'multipart/form-data',
              }
            })
            return response.data
          }
          throw putError
        }
      } else {
        // Envoi JSON standard
        const response = await api.put(`/resto/${id}`, data)
        return response.data
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du restaurant:', error)
      if (error.response?.status === 404) {
        const endpoint = error.config?.url || `/resto/${id}`
        const method = error.config?.method?.toUpperCase() || 'PUT'
        throw new Error(`L'endpoint ${method} ${endpoint} n'existe pas sur le serveur (404). L'API ne supporte peut-être pas la mise à jour des restaurants. Les images ont été uploadées vers Firebase Storage avec succès.`)
      }
      throw error
    }
  }

  /**
   * Uploader la photo de couverture
   * NOTE: Cette méthode n'est plus utilisée. Les images sont maintenant uploadées vers Firebase Storage
   * et les URLs sont envoyées via la méthode update(). Cette méthode est conservée pour compatibilité.
   */
  async uploadCover(id, file) {
    try {
      const formData = new FormData()
      formData.append('cover', file)

      const response = await api.post(`/resto/${id}/cover`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo de couverture:', error)
      if (error.response?.status === 404) {
        throw new Error("L'endpoint d'upload dédié (/cover) n'existe pas sur le serveur (404). Veuillez utiliser l'upload via Firebase Storage.")
      }
      throw error
    }
  }

  /**
   * Uploader le logo
   * NOTE: Cette méthode n'est plus utilisée. Les images sont maintenant uploadées vers Firebase Storage
   * et les URLs sont envoyées via la méthode update(). Cette méthode est conservée pour compatibilité.
   */
  async uploadLogo(id, file) {
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await api.post(`/resto/${id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
    } catch (error) {
      console.error('Erreur lors de l\'upload du logo:', error)
      if (error.response?.status === 404) {
        throw new Error("L'endpoint d'upload dédié (/logo) n'existe pas sur le serveur (404). Veuillez utiliser l'upload via Firebase Storage.")
      }
      throw error
    }
  }
}

export default new RestaurantService()
