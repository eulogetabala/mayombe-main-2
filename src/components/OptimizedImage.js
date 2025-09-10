import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import imageCacheService from '../services/imageCacheService';

const { width: screenWidth } = Dimensions.get('window');

const OptimizedImage = ({ 
  source, 
  style, 
  defaultSource = require('../assets/images/2.jpg'),
  resizeMode = 'cover',
  placeholderColor = '#f0f0f0',
  onLoad,
  onError,
  priority = 'normal', // 'high', 'normal', 'low'
  enableCache = true,
  ...props 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cachedSource, setCachedSource] = useState(null);

  // Initialiser le service de cache
  useEffect(() => {
    if (enableCache) {
      imageCacheService.initialize();
    }
  }, [enableCache]);

  // Optimiser l'URL de l'image selon la priorité
  const optimizedSource = useMemo(() => {
    if (!source || !source.uri) {
      return defaultSource;
    }

    const uri = source.uri;
    
    // Si c'est une image locale, pas d'optimisation nécessaire
    if (uri.startsWith('file://') || uri.startsWith('data:')) {
      return source;
    }

    // Optimiser les images distantes selon la priorité
    if (uri.includes('mayombe-app.com')) {
      const quality = priority === 'high' ? '80' : priority === 'normal' ? '60' : '40';
      const width = Math.floor(screenWidth * (priority === 'high' ? 1 : priority === 'normal' ? 0.8 : 0.6));
      
      return imageCacheService.optimizeImageUrl(uri, { quality, width, format: 'webp' });
    }

    return uri;
  }, [source, priority, defaultSource]);

  // Vérifier le cache et charger l'image
  useEffect(() => {
    if (!enableCache || !optimizedSource || typeof optimizedSource !== 'string') {
      return;
    }

    const loadImageFromCache = async () => {
      try {
        // Vérifier si l'image est en cache
        const isCached = await imageCacheService.isCached(optimizedSource, {
          width: Math.floor(screenWidth * (priority === 'high' ? 1 : priority === 'normal' ? 0.8 : 0.6)),
          quality: priority === 'high' ? '80' : priority === 'normal' ? '60' : '40'
        });

        if (isCached) {
          console.log('✅ Image trouvée en cache:', optimizedSource);
          setCachedSource({ uri: optimizedSource });
          setIsLoading(false);
          setImageLoaded(true);
          onLoad?.();
        }
      } catch (error) {
        console.warn('Erreur vérification cache:', error);
      }
    };

    loadImageFromCache();
  }, [optimizedSource, enableCache, priority, onLoad]);

  const handleLoadStart = useCallback(() => {
    if (!cachedSource) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [cachedSource]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setImageLoaded(true);
    
    // Ajouter au cache si activé
    if (enableCache && optimizedSource && typeof optimizedSource === 'string') {
      imageCacheService.addToMemoryCache(optimizedSource, optimizedSource);
    }
    
    onLoad?.();
  }, [enableCache, optimizedSource, onLoad]);

  const handleError = useCallback((error) => {
    console.warn('Erreur chargement image optimisée:', error.nativeEvent?.error || error);
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  }, [onError]);

  // Déterminer la source finale
  const finalSource = useMemo(() => {
    if (cachedSource) return cachedSource;
    if (typeof optimizedSource === 'string') return { uri: optimizedSource };
    return optimizedSource || defaultSource;
  }, [cachedSource, optimizedSource, defaultSource]);

  // Afficher le placeholder pendant le chargement
  if (isLoading && !imageLoaded && !cachedSource) {
    return (
      <View style={[styles.container, style, { backgroundColor: placeholderColor }]}>
        <ActivityIndicator size="small" color="#51A905" />
      </View>
    );
  }

  // Afficher l'icône d'erreur si l'image n'a pas pu être chargée
  if (hasError) {
    return (
      <View style={[styles.container, style, { backgroundColor: placeholderColor }]}>
        <Ionicons name="image-outline" size={24} color="#ccc" />
      </View>
    );
  }

  return (
    <Image
      source={finalSource}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      onLoadStart={handleLoadStart}
      onLoad={handleLoad}
      onError={handleError}
      // Optimisations supplémentaires
      fadeDuration={300}
      progressiveRenderingEnabled={true}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default OptimizedImage;
