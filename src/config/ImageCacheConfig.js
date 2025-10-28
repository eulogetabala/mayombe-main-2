import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration globale du cache d'images
export const initializeImageCache = async () => {
  try {
    // Nettoyer les images expirées au démarrage
    await cleanupExpiredCache();
    console.log('✅ Cache d\'images initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du cache:', error);
  }
};

// Fonction pour vider le cache si nécessaire
export const clearImageCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const imageKeys = keys.filter(key => key.startsWith('cached_image_'));
    await AsyncStorage.multiRemove(imageKeys);
    console.log('✅ Cache d\'images vidé');
  } catch (error) {
    console.error('❌ Erreur lors du vidage du cache:', error);
  }
};

// Fonction pour obtenir la taille du cache
export const getCacheSize = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const imageKeys = keys.filter(key => key.startsWith('cached_image_'));
    let totalSize = 0;
    
    for (const key of imageKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        totalSize += data.length;
      }
    }
    
    console.log(`📊 Taille du cache: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    return totalSize;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la taille du cache:', error);
    return 0;
  }
};

// Fonction pour nettoyer le cache (supprimer les images expirées)
export const cleanupExpiredCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const imageKeys = keys.filter(key => key.startsWith('cached_image_'));
    const now = Date.now();
    const cacheAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
    const expiredKeys = [];
    
    for (const key of imageKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        try {
          const { timestamp } = JSON.parse(data);
          if (now - timestamp > cacheAge) {
            expiredKeys.push(key);
          }
        } catch (e) {
          // Données corrompues, les supprimer
          expiredKeys.push(key);
        }
      }
    }
    
    if (expiredKeys.length > 0) {
      await AsyncStorage.multiRemove(expiredKeys);
      console.log(`🧹 ${expiredKeys.length} images expirées supprimées du cache`);
    }
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage du cache:', error);
  }
};
