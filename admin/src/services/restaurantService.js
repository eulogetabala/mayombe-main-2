import { UPLOADS_BASE_URL } from '../config/constants'
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
   */
  async updateStatus(id, status) {
    try {
      // Récupérer d'abord le restaurant complet car le backend attend l'objet complet pour un PUT
      const restaurant = await this.getById(id)
      
      const response = await api.put(`/resto/${id}`, {
        name: restaurant.name || restaurant.libelle,
        adresse: restaurant.adresse || restaurant.address,
        phone: restaurant.phone || restaurant.telephone,
        altitude: restaurant.altitude,
        longitude: restaurant.longitude,
        ville_id: restaurant.ville_id,
        statut: status,
      })
      return response.data
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un restaurant
   */
  async update(id, data) {
    try {
      // Si c'est du FormData (multipart), on tente l'envoi mais on s'attend à ce que ça puisse échouer
      if (data instanceof FormData) {
        // Ajouter le spoofing de méthode dans le corps du FormData
        if (!data.has('_method')) {
          data.append('_method', 'PUT')
        }
        
        const response = await api.post(`/resto/${id}`, data, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        })
        return response.data
      } else {
        // Envoi JSON standard
        const response = await api.put(`/resto/${id}`, data)
        return response.data
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du restaurant:', error)
      throw error
    }
  }

  /**
   * Uploader la photo de couverture
   */
  async uploadCover(id, file) {
    try {
      const formData = new FormData()
      formData.append('cover', file)

      const response = await fetch(`${API_BASE_URL}/resto/${id}/cover`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("L'endpoint d'upload dédié (/cover) n'existe pas sur le serveur (404).")
        }
        
        let errorMessage = `Erreur HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (e) {
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (e2) {}
        }
        throw new Error(`Upload couverture échoué: ${errorMessage}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo de couverture:', error)
      throw error
    }
  }

  /**
   * Uploader le logo
   */
  async uploadLogo(id, file) {
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch(`${API_BASE_URL}/resto/${id}/logo`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = `Erreur HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (e) {
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (e2) {}
        }
        throw new Error(`Upload logo échoué: ${errorMessage}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Erreur lors de l\'upload du logo:', error)
      throw error
    }
  }
}

export default new RestaurantService()
