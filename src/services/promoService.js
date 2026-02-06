import { getDatabase, ref, get, onValue, off } from 'firebase/database';
import { initializeApp, getApps } from 'firebase/app';

// Configuration Firebase (Doit correspondre à celle utilisée dans les autres services)
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
 * Service pour gérer les prix promotionnels des produits
 */
class PromoService {
  /**
   * Récupérer toutes les promos de produits
   */
  async getAllProductPromos() {
    try {
      const promosRef = ref(database, 'product_promos');
      const snapshot = await get(promosRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return {};
    } catch (error) {
      console.error('❌ [PromoService] Erreur lors de la récupération des promos:', error);
      return {};
    }
  }

  /**
   * Récupérer la promo d'un produit spécifique
   */
  async getProductPromo(productId) {
    try {
      const promoRef = ref(database, `product_promos/${productId}`);
      const snapshot = await get(promoRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error(`❌ [PromoService] Erreur pour le produit ${productId}:`, error);
      return null;
    }
  }

  /**
   * S'abonner aux changements des promos
   */
  subscribeToPromos(callback) {
    const promosRef = ref(database, 'product_promos');
    
    onValue(promosRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({});
      }
    });
    
    return () => off(promosRef);
  }
}

export default new PromoService();
