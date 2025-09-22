import { useState, useEffect, useCallback, useRef } from 'react';
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const useImageOptimization = (images = [], options = {}) => {
  const {
    preloadDistance = 200, // Distance en pixels pour précharger
    batchSize = 3, // Nombre d'images à charger en parallèle
    priority = 'normal', // Priorité de chargement
    enableLazyLoading = true
  } = options;

  const [loadedImages, setLoadedImages] = useState(new Set());
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [visibleImages, setVisibleImages] = useState(new Set());
  const scrollPosition = useRef(0);
  const imageCache = useRef(new Map());

  // Optimiser l'URL d'une image
  const optimizeImageUrl = useCallback((url, priority = 'normal') => {
    if (!url || typeof url !== 'string') return url;

    // Si c'est une image locale, pas d'optimisation
    if (url.startsWith('file://') || url.startsWith('data:')) {
      return url;
    }

    // Optimiser les images distantes
    if (url.includes('mayombe-app.com')) {
      const separator = url.includes('?') ? '&' : '?';
      const quality = priority === 'high' ? '80' : priority === 'normal' ? '60' : '40';
      const width = Math.floor(screenWidth * (priority === 'high' ? 1 : priority === 'normal' ? 0.8 : 0.6));
      
      return `${url}${separator}quality=${quality}&width=${width}&format=webp`;
    }

    return url;
  }, []);

  // Vérifier si une image est visible à l'écran
  const isImageVisible = useCallback((imageIndex, scrollY = 0) => {
    if (!enableLazyLoading) return true;

    const imageHeight = 200; // Hauteur estimée d'une image
    const imageTop = imageIndex * imageHeight;
    const imageBottom = imageTop + imageHeight;
    const viewportTop = scrollY;
    const viewportBottom = scrollY + screenHeight;

    return imageBottom >= viewportTop - preloadDistance && 
           imageTop <= viewportBottom + preloadDistance;
  }, [enableLazyLoading, preloadDistance]);

  // Charger une image
  const loadImage = useCallback(async (imageUrl, imageIndex) => {
    if (!imageUrl || loadedImages.has(imageIndex) || loadingImages.has(imageIndex)) {
      return;
    }

    setLoadingImages(prev => new Set(prev).add(imageIndex));

    try {
      const optimizedUrl = optimizeImageUrl(imageUrl, priority);
      
      // Simuler le chargement d'image (dans une vraie app, on utiliserait Image.prefetch)
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          imageCache.current.set(imageIndex, optimizedUrl);
          setLoadedImages(prev => new Set(prev).add(imageIndex));
          setLoadingImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(imageIndex);
            return newSet;
          });
          resolve();
        };
        img.onerror = reject;
        img.src = optimizedUrl;
      });
    } catch (error) {
      console.warn(`Erreur chargement image ${imageIndex}:`, error);
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageIndex);
        return newSet;
      });
    }
  }, [loadedImages, loadingImages, optimizeImageUrl, priority]);

  // Charger un batch d'images
  const loadImageBatch = useCallback(async (imageUrls, startIndex = 0) => {
    const batch = imageUrls.slice(startIndex, startIndex + batchSize);
    const promises = batch.map((url, index) => 
      loadImage(url, startIndex + index)
    );
    
    await Promise.all(promises);
  }, [loadImage, batchSize]);

  // Mettre à jour les images visibles lors du scroll
  const updateVisibleImages = useCallback((scrollY) => {
    scrollPosition.current = scrollY;
    
    const newVisibleImages = new Set();
    images.forEach((image, index) => {
      if (isImageVisible(index, scrollY)) {
        newVisibleImages.add(index);
      }
    });
    
    setVisibleImages(newVisibleImages);
  }, [images, isImageVisible]);

  // Précharger les images visibles
  useEffect(() => {
    if (!enableLazyLoading) {
      // Charger toutes les images si le lazy loading est désactivé
      images.forEach((image, index) => {
        if (image && typeof image === 'string') {
          loadImage(image, index);
        }
      });
      return;
    }

    // Charger seulement les images visibles
    const visibleImageUrls = images
      .map((image, index) => ({ url: image, index }))
      .filter(({ url, index }) => 
        url && 
        typeof url === 'string' && 
        visibleImages.has(index) && 
        !loadedImages.has(index) && 
        !loadingImages.has(index)
      );

    if (visibleImageUrls.length > 0) {
      const urls = visibleImageUrls.map(item => item.url);
      const indices = visibleImageUrls.map(item => item.index);
      
      // Charger en batch
      loadImageBatch(urls, Math.min(...indices));
    }
  }, [visibleImages, loadedImages, loadingImages, images, enableLazyLoading, loadImage, loadImageBatch]);

  // Charger les images initiales visibles
  useEffect(() => {
    if (images.length > 0) {
      updateVisibleImages(0);
    }
  }, [images, updateVisibleImages]);

  return {
    loadedImages,
    loadingImages,
    visibleImages,
    updateVisibleImages,
    optimizeImageUrl,
    isImageVisible,
    imageCache: imageCache.current
  };
};

