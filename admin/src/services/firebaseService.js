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
      // Vérification du fichier
      if (!file) {
        throw new Error("Fichier manquant")
      }
      
      // Vérifier la taille du fichier (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum: 10MB`)
      }

      console.log(`📤 Début upload: ${path}`, {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)}KB`
      })
      
      // S'assurer qu'on est authentifié (anonymement au minimum)
      const { auth } = await import('../config/firebase')
      const { signInAnonymously } = await import('firebase/auth')
      
      if (!auth.currentUser) {
          console.log("🔐 Authentification anonyme avant upload...")
          try {
            await signInAnonymously(auth)
            console.log("✅ Authentification anonyme réussie")
          } catch (authError) {
            console.warn("⚠️ Echec auth anonyme:", authError.message)
            // On continue quand même, peut-être que les règles sont ouvertes
          }
      } else {
        console.log("✅ Utilisateur déjà authentifié:", auth.currentUser.uid)
      }
      
      const storageReference = storageRef(storage, path)
      let snapshot;

      try {
        // Méthode 1: Standard uploadBytes (recommandé)
        console.log("📤 Tentative upload via SDK Firebase...")
        snapshot = await uploadBytes(storageReference, file)
        const downloadURL = await getDownloadURL(snapshot.ref)
        console.log(`✅ Upload réussi (SDK): ${downloadURL}`)
        return downloadURL
      } catch (uploadError) {
        console.warn("⚠️ Echec uploadBytes standard:", {
          code: uploadError.code,
          message: uploadError.message,
          stack: uploadError.stack
        })
        
        // Analyser l'erreur pour donner des conseils
        if (uploadError.code === 'storage/unauthorized') {
          throw new Error("❌ Permission refusée. Vérifiez les règles Firebase Storage dans la console Firebase (Storage > Rules).")
        } else if (uploadError.code === 'storage/canceled') {
          throw new Error("❌ Upload annulé. Vérifiez votre connexion internet.")
        } else if (uploadError.code === 'storage/unknown') {
          // Vérifier si c'est lié au plan Firebase
          if (uploadError.message && (
            uploadError.message.includes('billing') || 
            uploadError.message.includes('plan') ||
            uploadError.message.includes('upgrade') ||
            uploadError.message.includes('forfait')
          )) {
            throw new Error("❌ Firebase Storage nécessite le plan Blaze. Allez dans Firebase Console > Paramètres du projet > Utilisation et facturation > Passer au plan Blaze (gratuit dans les limites : 5 GB stockage, 1 GB/jour téléchargement).")
          }
          throw new Error("❌ Erreur inconnue. Vérifiez que Firebase Storage est activé et que les règles sont correctes.")
        } else if (uploadError.message && (
          uploadError.message.includes('billing') || 
          uploadError.message.includes('plan') ||
          uploadError.message.includes('upgrade') ||
          uploadError.message.includes('forfait') ||
          uploadError.message.includes('Storage') && uploadError.message.includes('supérieur')
        )) {
          throw new Error("❌ Firebase Storage nécessite le plan Blaze. Allez dans Firebase Console > Paramètres du projet > Utilisation et facturation > Passer au plan Blaze (gratuit dans les limites : 5 GB stockage, 1 GB/jour téléchargement).")
        }
        
        console.warn("⚠️ Tentative alternative via REST API...")
        
        // Méthode 2: API REST Directe (Bypass SDK)
        try {
            const bucketName = "mayombe-ba11b.firebasestorage.app"
            const encodedPath = encodeURIComponent(path)
            const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodedPath}`
            
            console.log("📤 Tentative upload via REST API...")
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': file.type
                },
                body: file
            })
            
            if (!response.ok) {
                const errorText = await response.text()
                console.error("❌ Erreur REST API:", {
                  status: response.status,
                  statusText: response.statusText,
                  body: errorText
                })
                throw new Error(`REST API Error (${response.status}): ${errorText}`)
            }
            
            const data = await response.json()
            // Construire l'URL de téléchargement publique
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${data.downloadTokens}`
            console.log(`✅ Upload réussi (REST): ${publicUrl}`)
            return publicUrl

        } catch (restError) {
             console.error("❌ Echec upload REST:", restError.message)
             
             // Méthode 3: Fallback conversion arrayBuffer (Dernier recours)
             try {
                console.warn("⚠️ Tentative fallback arrayBuffer...")
                const arrayBuffer = await file.arrayBuffer()
                snapshot = await uploadBytes(storageReference, arrayBuffer, {
                    contentType: file.type
                })
                const downloadURL = await getDownloadURL(snapshot.ref)
                console.log(`✅ Upload réussi (arrayBuffer): ${downloadURL}`)
                return downloadURL
             } catch (bufferError) {
                 console.error("❌ Echec upload arrayBuffer:", bufferError.message)
                 // Lancer l'erreur la plus informative
                 const finalError = new Error(
                   `Échec de l'upload après 3 tentatives. ` +
                   `Erreur SDK: ${uploadError.message}. ` +
                   `Erreur REST: ${restError.message}. ` +
                   `Vérifiez les règles Firebase Storage et votre connexion.`
                 )
                 finalError.originalError = uploadError
                 throw finalError
             }
        }
      }
    } catch (error) {
      console.error(`❌ Erreur finale lors du téléchargement de l'image (${path}):`, {
        message: error.message,
        code: error.code,
        stack: error.stack
      })
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
        console.log(`✅ Images synchronisées dans Firebase pour restaurant ${restaurantId}:`, updates)
      }
      return true
    } catch (error) {
      console.error('Erreur lors de la synchronisation des images:', error)
      throw error
    }
  }

  /**
   * Récupérer les images d'un restaurant depuis Firebase Realtime Database
   */
  async getRestaurantImages(restaurantId) {
    try {
      const restaurantRef = ref(database, `restaurant_status/${restaurantId}`)
      const snapshot = await get(restaurantRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        return {
          cover: data.cover || null,
          logo: data.logo || null
        }
      }
      return { cover: null, logo: null }
    } catch (error) {
      console.error(`Erreur lors de la récupération des images pour ${restaurantId}:`, error)
      return { cover: null, logo: null }
    }
  }

  /**
   * Récupérer les images de tous les restaurants depuis Firebase
   */
  async getAllRestaurantImages() {
    try {
      const statusRef = ref(database, 'restaurant_status')
      const snapshot = await get(statusRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        const imagesMap = {}
        
        Object.keys(data).forEach(restaurantId => {
          const status = data[restaurantId]
          imagesMap[restaurantId] = {
            cover: status.cover || null,
            logo: status.logo || null
          }
        })
        
        return imagesMap
      }
      return {}
    } catch (error) {
      console.error('Erreur lors de la récupération de toutes les images:', error)
      return {}
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

  /**
   * Récupérer les activités récentes pour le dashboard
   */
  async getRecentActivities(limit = 5) {
    try {
      const activities = []

      const safeGet = async (dbRef) => {
        try {
          return await get(dbRef)
        } catch (error) {
          console.error('Erreur lecture RTDB (activités):', error)
          return null
        }
      }

      const statusRef = ref(database, 'restaurant_status')
      const promotionsRef = ref(database, 'promotions')
      const productPromosRef = ref(database, 'product_promos')
      const ordersRef = ref(database, 'orders')

      const [statusSnapshot, promotionsSnapshot, productPromosSnapshot, ordersSnapshot] =
        await Promise.all([
          safeGet(statusRef),
          safeGet(promotionsRef),
          safeGet(productPromosRef),
          safeGet(ordersRef),
        ])

      if (statusSnapshot?.exists()) {
        const statusData = statusSnapshot.val()
        Object.keys(statusData).forEach((restaurantId) => {
          const status = statusData[restaurantId]
          if (status.updatedAt) {
            activities.push({
              type: status.isOpen ? 'restaurant_opened' : 'restaurant_closed',
              title: status.isOpen ? 'Restaurant ouvert' : 'Restaurant fermé',
              description: `Restaurant ID: ${restaurantId}`,
              timestamp: status.updatedAt,
              color: status.isOpen ? 'yellow' : 'red',
              icon: 'store',
            })
          }
        })
      }

      if (promotionsSnapshot?.exists()) {
        const data = promotionsSnapshot.val()
        Object.keys(data).forEach((key) => {
          const promo = data[key]
          if (promo.createdAt) {
            activities.push({
              type: 'promo_created',
              title: 'Promo créée',
              description: `Promotion créée`,
              timestamp: promo.createdAt,
              color: 'blue',
              icon: 'tag',
            })
          }
        })
      }

      if (productPromosSnapshot?.exists()) {
        const productPromosData = productPromosSnapshot.val()
        Object.keys(productPromosData).forEach((productId) => {
          const promo = productPromosData[productId]
          if (promo.createdAt) {
            activities.push({
              type: 'product_promo_created',
              title: 'Prix promo défini',
              description: `Produit ID: ${productId}`,
              timestamp: promo.createdAt,
              color: 'blue',
              icon: 'tag',
            })
          }
        })
      }

      if (ordersSnapshot?.exists()) {
        const ordersData = ordersSnapshot.val()
        Object.keys(ordersData).forEach((key) => {
          const order = ordersData[key]
          const orderWithId = { id: key, ...order }
          if (order.createdAt) {
            activities.push({
              type: 'order_created',
              title: 'Nouvelle commande',
              description: `Commande #${orderWithId.id || order.clientOrderId || 'N/A'}`,
              timestamp: order.createdAt,
              color: 'green',
              icon: 'shopping-cart',
            })
          }
        })
      }

      // Trier par date (plus récent en premier) et limiter
      const sortedActivities = activities
        .filter(activity => activity.timestamp)
        .sort((a, b) => {
          const dateA = new Date(a.timestamp)
          const dateB = new Date(b.timestamp)
          return dateB - dateA
        })
        .slice(0, limit)

      return sortedActivities
    } catch (error) {
      console.error('Erreur lors de la récupération des activités récentes:', error)
      return []
    }
  }
}

export default new FirebaseService()
