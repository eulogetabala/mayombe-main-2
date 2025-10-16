import { ref, set, get, remove } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from 'firebase/database';
import { initializeApp } from 'firebase/app';

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

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Service pour gérer les paniers partagés via Firebase
 * Solution 100% frontend - pas besoin d'endpoints backend
 */
class SharedCartService {
  constructor() {
    this.database = database;
  }

  /**
   * Sauvegarder un panier partagé sur Firebase
   * @param {string} cartId - ID unique du panier
   * @param {Array} cartData - Données du panier
   * @param {number} expirationHours - Heures avant expiration (défaut: 24h)
   */
  async saveSharedCart(cartId, cartData, expirationHours = 24) {
    try {
      console.log(`🔄 Tentative de sauvegarde Firebase pour: ${cartId}`);
      console.log(`📊 Données à sauvegarder:`, cartData.length, 'articles');
      
      // Nettoyer les données pour Firebase (supprimer les valeurs undefined)
      const cleanedCartData = cartData.map(item => {
        const cleanedItem = {};
        Object.keys(item).forEach(key => {
          if (item[key] !== undefined && item[key] !== null) {
            cleanedItem[key] = item[key];
          }
        });
        return cleanedItem;
      });
      
      console.log(`🧹 Données nettoyées:`, cleanedCartData.length, 'articles');
      
      const cartRef = ref(database, `shared_carts/${cartId}`);
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      
      const cartPayload = {
        cart_data: cleanedCartData,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        cart_id: cartId
      };
      
      console.log(`📦 Payload Firebase nettoyé:`, JSON.stringify(cartPayload, null, 2));
      
      await set(cartRef, cartPayload);
      
      console.log(`✅ Panier sauvegardé sur Firebase: ${cartId}`);
      
      // Vérifier que la sauvegarde a bien fonctionné
      const verificationSnapshot = await get(cartRef);
      if (verificationSnapshot.exists()) {
        console.log(`✅ VÉRIFICATION: Panier confirmé sur Firebase`);
        const savedData = verificationSnapshot.val();
        console.log(`📊 ARTICLES SAUVEGARDÉS: ${savedData.cart_data?.length || 0}`);
      } else {
        console.log(`❌ VÉRIFICATION: Panier NON trouvé après sauvegarde !`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Erreur sauvegarde Firebase:`, error);
      console.error(`❌ Détails de l'erreur:`, error.message);
      console.error(`❌ Stack trace:`, error.stack);
      return false;
    }
  }

  /**
   * Récupérer un panier partagé depuis Firebase
   * @param {string} cartId - ID du panier à récupérer
   * @returns {Array|null} Données du panier ou null si non trouvé/expiré
   */
  async getSharedCart(cartId) {
    try {
      console.log(`🔍 RECHERCHE FIREBASE - ID: ${cartId}`);
      const cartRef = ref(this.database, `shared_carts/${cartId}`);
      const snapshot = await get(cartRef);
      
      console.log(`📊 SNAPSHOT EXISTS: ${snapshot.exists()}`);
      
      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        console.log(`📦 DONNÉES FIREBASE RÉCUPÉRÉES:`, JSON.stringify(firebaseData, null, 2));
        
        // Vérifier si le panier n'a pas expiré
        const now = new Date();
        const expiresAt = new Date(firebaseData.expires_at);
        
        console.log(`⏰ VÉRIFICATION EXPIRATION:`);
        console.log(`   - Maintenant: ${now.toISOString()}`);
        console.log(`   - Expire à: ${expiresAt.toISOString()}`);
        console.log(`   - Expiré: ${now >= expiresAt}`);
        
        if (now < expiresAt) {
          console.log(`✅ Panier récupéré depuis Firebase: ${cartId}`);
          console.log(`📊 NOMBRE D'ARTICLES: ${firebaseData.cart_data?.length || 0}`);
          
          // Sauvegarder localement pour un accès plus rapide
          await this.saveToLocalStorage(cartId, firebaseData.cart_data);
          
          return firebaseData.cart_data;
        } else {
          console.log(`⚠️ Panier expiré: ${cartId}`);
          // Supprimer le panier expiré
          await this.deleteSharedCart(cartId);
          return null;
        }
      } else {
        console.log(`⚠️ Panier non trouvé sur Firebase: ${cartId}`);
        console.log(`🔍 Vérification de la structure Firebase...`);
        
        // Vérifier la structure générale
        const allCartsRef = ref(this.database, 'shared_carts');
        const allSnapshot = await get(allCartsRef);
        if (allSnapshot.exists()) {
          const allCarts = allSnapshot.val();
          console.log(`📋 PANIERS DISPONIBLES:`, Object.keys(allCarts));
        } else {
          console.log(`❌ AUCUN PANIER DANS FIREBASE`);
        }
        
        return null;
      }
    } catch (error) {
      console.error(`❌ Erreur récupération Firebase:`, error);
      console.error(`❌ Détails:`, error.message);
      return null;
    }
  }

  /**
   * Supprimer un panier partagé de Firebase
   * @param {string} cartId - ID du panier à supprimer
   */
  async deleteSharedCart(cartId) {
    try {
      const cartRef = ref(this.database, `shared_carts/${cartId}`);
      await remove(cartRef);
      console.log(`🗑️ Panier supprimé de Firebase: ${cartId}`);
    } catch (error) {
      console.error(`❌ Erreur suppression Firebase:`, error);
    }
  }

  /**
   * Sauvegarder un panier dans le stockage local
   * @param {string} cartId - ID du panier
   * @param {Array} cartData - Données du panier
   */
  async saveToLocalStorage(cartId, cartData) {
    try {
      await AsyncStorage.setItem(`shared_cart_${cartId}`, JSON.stringify(cartData));
      console.log(`💾 Panier sauvegardé localement: ${cartId}`);
    } catch (error) {
      console.error(`❌ Erreur sauvegarde locale:`, error);
    }
  }

  /**
   * Récupérer un panier depuis le stockage local
   * @param {string} cartId - ID du panier
   * @returns {Array|null} Données du panier ou null si non trouvé
   */
  async getFromLocalStorage(cartId) {
    try {
      const cartJson = await AsyncStorage.getItem(`shared_cart_${cartId}`);
      if (cartJson) {
        const cartData = JSON.parse(cartJson);
        console.log(`💾 Panier récupéré localement: ${cartId}`);
        return cartData;
      }
      return null;
    } catch (error) {
      console.error(`❌ Erreur récupération locale:`, error);
      return null;
    }
  }

  /**
   * Récupérer un panier partagé (Firebase en priorité, puis local)
   * @param {string} cartId - ID du panier
   * @returns {Array|null} Données du panier ou null si non trouvé
   */
  async loadSharedCart(cartId) {
    console.log(`🔄 DÉBUT CHARGEMENT PANIER: ${cartId}`);
    
    // Essayer d'abord Firebase
    console.log(`🔍 ÉTAPE 1: Recherche sur Firebase...`);
    let cartData = await this.getSharedCart(cartId);
    
    if (cartData) {
      console.log(`✅ TROUVÉ SUR FIREBASE: ${cartData.length} articles`);
      return cartData;
    }
    
    // Si pas trouvé sur Firebase, essayer le stockage local
    console.log(`🔍 ÉTAPE 2: Recherche en local...`);
    cartData = await this.getFromLocalStorage(cartId);
    
    if (cartData) {
      console.log(`✅ TROUVÉ EN LOCAL: ${cartData.length} articles`);
    } else {
      console.log(`❌ PANIER NON TROUVÉ: Ni sur Firebase ni en local`);
    }
    
    return cartData;
  }

  /**
   * Nettoyer les paniers expirés (fonction utilitaire)
   */
  async cleanupExpiredCarts() {
    try {
      const allCartsRef = ref(this.database, 'shared_carts');
      const snapshot = await get(allCartsRef);
      
      if (snapshot.exists()) {
        const carts = snapshot.val();
        const now = new Date();
        
        for (const [cartId, cartData] of Object.entries(carts)) {
          const expiresAt = new Date(cartData.expires_at);
          if (now >= expiresAt) {
            await this.deleteSharedCart(cartId);
            console.log(`🧹 Panier expiré nettoyé: ${cartId}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Erreur nettoyage:`, error);
    }
  }
}

// Export d'une instance singleton
export const sharedCartService = new SharedCartService();
export default sharedCartService;
