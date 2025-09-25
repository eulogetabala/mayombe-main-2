import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Nettoie tous les anciens paniers partagés expirés
 * Cette fonction supprime les paniers partagés qui ont dépassé leur date d'expiration
 */
const cleanupAllOldCarts = async () => {
  try {
    // Récupérer toutes les clés du stockage local
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filtrer les clés qui correspondent aux paniers partagés
    const sharedCartKeys = allKeys.filter(key => key.startsWith('shared_cart_'));
    
    if (sharedCartKeys.length === 0) {
      console.log('Aucun panier partagé trouvé pour le nettoyage');
      return;
    }
    
    let cleanedCount = 0;
    const currentTime = Date.now();
    
    // Vérifier chaque panier partagé
    for (const key of sharedCartKeys) {
      try {
        const cartDataJson = await AsyncStorage.getItem(key);
        
        if (cartDataJson) {
          const cartData = JSON.parse(cartDataJson);
          
          // Vérifier si le panier a expiré
          if (cartData.expiresAt && cartData.expiresAt < currentTime) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
            console.log(`Panier expiré supprimé: ${key}`);
          }
        }
      } catch (error) {
        console.error(`Erreur lors du traitement du panier ${key}:`, error);
        // Si le panier est corrompu, le supprimer
        try {
          await AsyncStorage.removeItem(key);
          cleanedCount++;
          console.log(`Panier corrompu supprimé: ${key}`);
        } catch (removeError) {
          console.error(`Impossible de supprimer le panier corrompu ${key}:`, removeError);
        }
      }
    }
    
    console.log(`Nettoyage terminé: ${cleanedCount} paniers supprimés sur ${sharedCartKeys.length} paniers vérifiés`);
    
  } catch (error) {
    console.error('Erreur lors du nettoyage des paniers partagés:', error);
  }
};

/**
 * Nettoie un panier partagé spécifique par son ID
 * @param {string} cartId - L'ID du panier à nettoyer
 */
const cleanupSpecificCart = async (cartId) => {
  try {
    const key = `shared_cart_${cartId}`;
    await AsyncStorage.removeItem(key);
    console.log(`Panier spécifique supprimé: ${cartId}`);
  } catch (error) {
    console.error(`Erreur lors de la suppression du panier ${cartId}:`, error);
  }
};

/**
 * Obtient le nombre de paniers partagés actifs (non expirés)
 * @returns {Promise<number>} - Le nombre de paniers actifs
 */
const getActiveSharedCartsCount = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const sharedCartKeys = allKeys.filter(key => key.startsWith('shared_cart_'));
    
    let activeCount = 0;
    const currentTime = Date.now();
    
    for (const key of sharedCartKeys) {
      try {
        const cartDataJson = await AsyncStorage.getItem(key);
        
        if (cartDataJson) {
          const cartData = JSON.parse(cartDataJson);
          
          // Vérifier si le panier est encore actif
          if (!cartData.expiresAt || cartData.expiresAt >= currentTime) {
            activeCount++;
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification du panier ${key}:`, error);
      }
    }
    
    return activeCount;
  } catch (error) {
    console.error('Erreur lors du comptage des paniers actifs:', error);
    return 0;
  }
};

// Exports
export { cleanupAllOldCarts, cleanupSpecificCart, getActiveSharedCartsCount };
