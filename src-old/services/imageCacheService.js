import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

class ImageCacheService {
  constructor() {
    this.memoryCache = new Map();
    this.diskCache = new Map();
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB en mémoire
    this.maxDiskSize = 200 * 1024 * 1024; // 200MB sur disque
    this.currentMemorySize = 0;
    this.initialized = false;
  }

  // Initialiser le service
  async initialize() {
    if (this.initialized) return;

    try {
      // Charger le cache depuis AsyncStorage
      const cachedData = await AsyncStorage.getItem('imageCache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.diskCache = new Map(parsed);
        console.log('✅ Cache d\'images chargé:', this.diskCache.size, 'images');
      }

      // Nettoyer le cache expiré
      await this.cleanupExpiredCache();
      
      this.initialized = true;
      console.log('✅ Service de cache d\'images initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation cache d\'images:', error);
    }
  }

  // Générer une clé de cache pour une URL
  generateCacheKey(url, width = null, quality = null) {
    const params = new URLSearchParams();
    if (width) params.append('width', width);
    if (quality) params.append('quality', quality);
    
    const paramString = params.toString();
    return paramString ? `${url}?${paramString}` : url;
  }

  // Optimiser l'URL d'une image
  optimizeImageUrl(url, options = {}) {
    if (!url || typeof url !== 'string') return url;

    // Si c'est une image locale, pas d'optimisation
    if (url.startsWith('file://') || url.startsWith('data:')) {
      return url;
    }

    // Optimiser les images distantes
    if (url.includes('mayombe-app.com')) {
      const { width = screenWidth * 0.8, quality = 60, format = 'webp' } = options;
      
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}quality=${quality}&width=${Math.floor(width)}&format=${format}`;
    }

    return url;
  }

  // Vérifier si une image est en cache
  async isCached(url, options = {}) {
    const cacheKey = this.generateCacheKey(url, options.width, options.quality);
    
    // Vérifier le cache mémoire
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24h
        return true;
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    // Vérifier le cache disque
    if (this.diskCache.has(cacheKey)) {
      const cached = this.diskCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 jours
        return true;
      } else {
        this.diskCache.delete(cacheKey);
      }
    }

    return false;
  }

  // Obtenir une image depuis le cache
  async getCachedImage(url, options = {}) {
    const cacheKey = this.generateCacheKey(url, options.width, options.quality);
    
    // Essayer le cache mémoire d'abord
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return cached.data;
      }
    }

    // Essayer le cache disque
    if (this.diskCache.has(cacheKey)) {
      const cached = this.diskCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        // Déplacer vers le cache mémoire
        this.addToMemoryCache(cacheKey, cached.data);
        return cached.data;
      }
    }

    return null;
  }

  // Ajouter une image au cache mémoire
  addToMemoryCache(key, data) {
    const size = this.estimateSize(data);
    
    // Nettoyer le cache si nécessaire
    while (this.currentMemorySize + size > this.maxMemorySize && this.memoryCache.size > 0) {
      const firstKey = this.memoryCache.keys().next().value;
      const firstItem = this.memoryCache.get(firstKey);
      this.currentMemorySize -= this.estimateSize(firstItem.data);
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      size
    });
    this.currentMemorySize += size;
  }

  // Ajouter une image au cache disque
  async addToDiskCache(key, data) {
    const size = this.estimateSize(data);
    
    // Nettoyer le cache si nécessaire
    let currentDiskSize = 0;
    for (const [k, v] of this.diskCache) {
      currentDiskSize += v.size;
    }

    while (currentDiskSize + size > this.maxDiskSize && this.diskCache.size > 0) {
      const firstKey = this.diskCache.keys().next().value;
      const firstItem = this.diskCache.get(firstKey);
      currentDiskSize -= firstItem.size;
      this.diskCache.delete(firstKey);
    }

    this.diskCache.set(key, {
      data,
      timestamp: Date.now(),
      size
    });

    // Sauvegarder sur disque
    try {
      await AsyncStorage.setItem('imageCache', JSON.stringify(Array.from(this.diskCache.entries())));
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache disque:', error);
    }
  }

  // Estimer la taille d'une image
  estimateSize(data) {
    if (typeof data === 'string') {
      return data.length * 2; // Estimation pour base64
    }
    return 1024; // Taille par défaut
  }

  // Nettoyer le cache expiré
  async cleanupExpiredCache() {
    const now = Date.now();
    const memoryExpiry = 24 * 60 * 60 * 1000; // 24h
    const diskExpiry = 7 * 24 * 60 * 60 * 1000; // 7 jours

    // Nettoyer le cache mémoire
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > memoryExpiry) {
        this.memoryCache.delete(key);
        this.currentMemorySize -= value.size;
      }
    }

    // Nettoyer le cache disque
    let hasChanges = false;
    for (const [key, value] of this.diskCache.entries()) {
      if (now - value.timestamp > diskExpiry) {
        this.diskCache.delete(key);
        hasChanges = true;
      }
    }

    // Sauvegarder les changements
    if (hasChanges) {
      try {
        await AsyncStorage.setItem('imageCache', JSON.stringify(Array.from(this.diskCache.entries())));
      } catch (error) {
        console.error('❌ Erreur nettoyage cache:', error);
      }
    }
  }

  // Vider tout le cache
  async clearCache() {
    this.memoryCache.clear();
    this.diskCache.clear();
    this.currentMemorySize = 0;
    
    try {
      await AsyncStorage.removeItem('imageCache');
      console.log('✅ Cache d\'images vidé');
    } catch (error) {
      console.error('❌ Erreur vidage cache:', error);
    }
  }

  // Obtenir les statistiques du cache
  getCacheStats() {
    let diskSize = 0;
    for (const [key, value] of this.diskCache.entries()) {
      diskSize += value.size;
    }

    return {
      memoryCount: this.memoryCache.size,
      memorySize: this.currentMemorySize,
      diskCount: this.diskCache.size,
      diskSize: diskSize,
      maxMemorySize: this.maxMemorySize,
      maxDiskSize: this.maxDiskSize
    };
  }
}

// Instance singleton
const imageCacheService = new ImageCacheService();

export default imageCacheService;



