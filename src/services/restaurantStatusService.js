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
      const statusRef = ref(database, `restaurant_status/${restaurantId}`);
      const snapshot = await get(statusRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      
      // Par défaut, le restaurant est ouvert
      return { isOpen: true };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du statut:', error);
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
   * Récupérer les statuts de plusieurs restaurants (batch)
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
