import { ref, get, set, push, update, remove, onValue, off } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { database, storage } from '../config/firebase'

/**
 * Service Firebase pour récupérer et gérer les données
 */
class FirebaseService {
  /**
   * Récupérer tous les restaurants depuis Firebase
   */
  async getRestaurants() {
    try {
      const restaurantsRef = ref(database, 'restaurants')
      const snapshot = await get(restaurantsRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        // Convertir l'objet en tableau
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
      }
      return []
    } catch (error) {
      console.error('Erreur lors de la récupération des restaurants:', error)
      return []
    }
  }

  /**
   * Écouter les changements des restaurants en temps réel
   */
  subscribeToRestaurants(callback) {
    const restaurantsRef = ref(database, 'restaurants')
    
    const unsubscribe = onValue(restaurantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const restaurants = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
        callback(restaurants)
      } else {
        callback([])
      }
    }, (error) => {
      console.error('Erreur lors de l\'écoute des restaurants:', error)
      callback([])
    })

    return () => off(restaurantsRef)
  }

  /**
   * Mettre à jour un restaurant
   */
  async updateRestaurant(restaurantId, data) {
    try {
      const restaurantRef = ref(database, `restaurants/${restaurantId}`)
      await update(restaurantRef, {
        ...data,
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la mise à jour du restaurant:', error)
      throw error
    }
  }

  /**
   * Mettre à jour le statut d'un restaurant (ouvert/fermé)
   */
  async updateRestaurantStatus(restaurantId, status) {
    try {
      const restaurantRef = ref(database, `restaurant_status/${restaurantId}`)
      await update(restaurantRef, {
        isOpen: status === 'ouvert' || status === 'actif',
        statut: status,
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error)
      throw error
    }
  }

  /**
   * Télécharger une image vers Firebase Storage et récupérer son URL
   */
  async uploadImage(file, path) {
    try {
      const storageReference = storageRef(storage, path)
      const snapshot = await uploadBytes(storageReference, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      return downloadURL
    } catch (error) {
      console.error(`Erreur lors du téléchargement de l'image (${path}):`, error)
      throw error
    }
  }

  /**
   * Synchroniser les images d'un restaurant avec Firebase pour le temps réel
   */
  async syncRestaurantImages(restaurantId, cover, logo) {
    try {
      const restaurantRef = ref(database, `restaurant_status/${restaurantId}`)
      const updates = {}
      if (cover) updates.cover = cover
      if (logo) updates.logo = logo
      
      if (Object.keys(updates).length > 0) {
        await update(restaurantRef, updates)
      }
      return true
    } catch (error) {
      console.error('Erreur lors de la synchronisation des images:', error)
      throw error
    }
  }

  /**
   * Récupérer toutes les promos depuis Firebase
   */
  async getPromos() {
    try {
      const promosRef = ref(database, 'promotions')
      const snapshot = await get(promosRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        // Convertir l'objet en tableau
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
      }
      return []
    } catch (error) {
      console.error('Erreur lors de la récupération des promos:', error)
      return []
    }
  }

  /**
   * Écouter les changements des promos en temps réel
   */
  subscribeToPromos(callback) {
    const promosRef = ref(database, 'promotions')
    
    const unsubscribe = onValue(promosRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const promos = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
        callback(promos)
      } else {
        callback([])
      }
    }, (error) => {
      console.error('Erreur lors de l\'écoute des promos:', error)
      callback([])
    })

    return () => off(promosRef)
  }

  /**
   * Créer une nouvelle promo
   */
  async createPromo(data) {
    try {
      const promosRef = ref(database, 'promotions')
      const newPromoRef = push(promosRef)
      await set(newPromoRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return newPromoRef.key
    } catch (error) {
      console.error('Erreur lors de la création de la promo:', error)
      throw error
    }
  }

  /**
   * Mettre à jour une promo
   */
  async updatePromo(promoId, data) {
    try {
      const promoRef = ref(database, `promotions/${promoId}`)
      await update(promoRef, {
        ...data,
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la promo:', error)
      throw error
    }
  }

  /**
   * Supprimer une promo
   */
  async deletePromo(promoId) {
    try {
      const promoRef = ref(database, `promotions/${promoId}`)
      await remove(promoRef)
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression de la promo:', error)
      throw error
    }
  }

  /**
   * Récupérer les statistiques du dashboard
   */
  async getDashboardStats() {
    try {
      const [restaurants, promos, orders] = await Promise.all([
        this.getRestaurants(),
        this.getPromos(),
        this.getOrders()
      ])

      const activeRestaurants = restaurants.filter(r => r.statut === 'actif' || r.statut === 'ouvert')
      const activePromos = promos.filter(p => p.active === true || p.statut === 'active')
      
      // Calculer les revenus (exemple depuis les commandes)
      const totalRevenue = orders.reduce((sum, order) => {
        return sum + (parseFloat(order.total) || 0)
      }, 0)

      return {
        restaurants: activeRestaurants.length,
        promos: activePromos.length,
        revenus: totalRevenue,
        commandes: orders.length,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      return {
        restaurants: 0,
        promos: 0,
        revenus: 0,
        commandes: 0,
      }
    }
  }

  /**
   * Définir un prix promotionnel pour un produit
   */
  async setProductPromoPrice(productId, promoPrice, startDate = null, endDate = null) {
    try {
      const promoRef = ref(database, `product_promos/${productId}`)
      await set(promoRef, {
        productId,
        originalPrice: null, // Sera rempli par l'app mobile
        promoPrice: parseFloat(promoPrice),
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || null,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Erreur lors de la définition du prix promo:', error)
      throw error
    }
  }

  /**
   * Récupérer le prix promotionnel d'un produit
   */
  async getProductPromoPrice(productId) {
    try {
      const promoRef = ref(database, `product_promos/${productId}`)
      const snapshot = await get(promoRef)
      
      if (snapshot.exists()) {
        return snapshot.val()
      }
      return null
    } catch (error) {
      console.error('Erreur lors de la récupération du prix promo:', error)
      return null
    }
  }

  /**
   * Récupérer tous les prix promotionnels
   */
  async getAllProductPromos() {
    try {
      const promosRef = ref(database, 'product_promos')
      const snapshot = await get(promosRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
      }
      return []
    } catch (error) {
      console.error('Erreur lors de la récupération des prix promos:', error)
      return []
    }
  }

  /**
   * Supprimer le prix promotionnel d'un produit
   */
  async removeProductPromoPrice(productId) {
    try {
      const promoRef = ref(database, `product_promos/${productId}`)
      await remove(promoRef)
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression du prix promo:', error)
      throw error
    }
  }

  /**
   * Récupérer les commandes récentes
   */
  async getOrders() {
    try {
      const ordersRef = ref(database, 'orders')
      const snapshot = await get(ordersRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
      }
      return []
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error)
      return []
    }
  }
}

export default new FirebaseService()
