import { ref, set, get, remove } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from './firebase';

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
      const cartRef = ref(this.database, `shared_carts/${cartId}`);
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      
      await set(cartRef, {
        cart_data: cartData,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        cart_id: cartId
      });
      
      console.log(`✅ Panier sauvegardé sur Firebase: ${cartId}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur sauvegarde Firebase:`, error);
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
      const cartRef = ref(this.database, `shared_carts/${cartId}`);
      const snapshot = await get(cartRef);
      
      if (snapshot.exists()) {
        const firebaseData = snapshot.val();
        
        // Vérifier si le panier n'a pas expiré
        const now = new Date();
        const expiresAt = new Date(firebaseData.expires_at);
        
        if (now < expiresAt) {
          console.log(`✅ Panier récupéré depuis Firebase: ${cartId}`);
          
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
        return null;
      }
    } catch (error) {
      console.error(`❌ Erreur récupération Firebase:`, error);
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
    // Essayer d'abord Firebase
    let cartData = await this.getSharedCart(cartId);
    
    // Si pas trouvé sur Firebase, essayer le stockage local
    if (!cartData) {
      cartData = await this.getFromLocalStorage(cartId);
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
