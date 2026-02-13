import { getDatabase, ref, get, set, onValue, off } from 'firebase/database';
import { initializeApp, getApps } from 'firebase/app';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB6Foh29YS-VQLMhw-gO83L_OSVullVvI8",
  authDomain: "mayombe-ba11b.firebaseapp.com",
  databaseURL: "https://mayombe-ba11b-default-rtdb.firebaseio.com",
  projectId: "mayombe-ba11b",
  storageBucket: "mayombe-ba11b.firebasestorage.app",
  messagingSenderId: "784517096614",
  appId: "1:784517096614:android:41b02898b40426e23fc067"
};

// Initialiser Firebase App (réutiliser si déjà initialisé)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const database = getDatabase(app);

/**
 * Service pour gérer les statuts ouverts/fermés des restaurants
 */
class RestaurantStatusService {
  /**
   * Récupérer le statut d'un restaurant
   */
  async getRestaurantStatus(restaurantId) {
    try {
      console.log(`🔍 [RestaurantStatusService] Récupération statut pour ${restaurantId}...`);
      const statusRef = ref(database, `restaurant_status/${restaurantId}`);
      const snapshot = await get(statusRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log(`✅ [RestaurantStatusService] Statut trouvé pour ${restaurantId}:`, data);
        return data;
      }
      
      console.log(`⚠️ [RestaurantStatusService] Aucun statut trouvé pour ${restaurantId}, défaut: Ouvert`);
      // Par défaut, le restaurant est ouvert
      return { isOpen: true };
    } catch (error) {
      console.error(`❌ [RestaurantStatusService] Erreur récupération ${restaurantId}:`, error);
      return { isOpen: true };
    }
  }

  /**
   * Mettre à jour le statut d'un restaurant
   */
  async updateRestaurantStatus(restaurantId, isOpen) {
    try {
      const statusRef = ref(database, `restaurant_status/${restaurantId}`);
      await set(statusRef, {
        isOpen,
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  /**
   * S'abonner aux changements de statut d'un restaurant
   */
  subscribeToRestaurantStatus(restaurantId, callback) {
    const statusRef = ref(database, `restaurant_status/${restaurantId}`);
    
    onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({ isOpen: true });
      }
    });
    
    // Retourner une fonction pour se désabonner
    return () => {
      off(statusRef);
    };
  }

  /**
   * S'abonner aux changements de tous les statuts
   */
  subscribeToAllRestaurantStatuses(callback) {
    const statusRef = ref(database, 'restaurant_status');
    
    onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({});
      }
    });
    
    return () => {
      off(statusRef);
    };
  }

  /**
   * Récupérer les images d'un restaurant (cover + logo)
   */
  async getRestaurantImages(restaurantId) {
    try {
      console.log(`🖼️ [RestaurantStatusService] Récupération images pour ${restaurantId}...`);
      const statusRef = ref(database, `restaurant_status/${restaurantId}`);
      const snapshot = await get(statusRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const images = {
          cover: data.cover || null,
          logo: data.logo || null,
        };
        console.log(`✅ [RestaurantStatusService] Images trouvées pour ${restaurantId}:`, images);
        return images;
      }
      
      console.log(`⚠️ [RestaurantStatusService] Aucune image trouvée pour ${restaurantId}`);
      return { cover: null, logo: null };
    } catch (error) {
      console.error(`❌ [RestaurantStatusService] Erreur récupération images ${restaurantId}:`, error);
      return { cover: null, logo: null };
    }
  }

  /**
   * Récupérer les images de plusieurs restaurants (batch)
   */
  async getBatchRestaurantImages(restaurantIds) {
    try {
      const imagesMap = {};
      const promises = restaurantIds.map(async (restaurantId) => {
        const images = await this.getRestaurantImages(restaurantId.toString());
        imagesMap[restaurantId.toString()] = images;
      });
      
      await Promise.all(promises);
      return imagesMap;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération batch des images:', error);
      return {};
    }
  }

  /**
   * Récupérer les statuts de plusieurs restaurants (batch)
   * Inclut maintenant aussi les images (cover + logo)
   */
  async getBatchRestaurantStatuses(restaurantIds) {
    try {
      const statusesMap = {};
      const promises = restaurantIds.map(async (restaurantId) => {
        const status = await this.getRestaurantStatus(restaurantId.toString());
        statusesMap[restaurantId.toString()] = status;
      });
      
      await Promise.all(promises);
      return statusesMap;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération batch des statuts:', error);
      return {};
    }
  }
}

export default new RestaurantStatusService();
