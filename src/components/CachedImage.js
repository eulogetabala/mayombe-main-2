import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImagePlaceholder from './ImagePlaceholder';

const CachedImage = ({ source, style, defaultSource, ...props }) => {
  const [imageSource, setImageSource] = useState(defaultSource);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (source && source.uri) {
      loadCachedImage(source.uri);
    } else if (source) {
      setImageSource(source);
    }
  }, [source]);

  const loadCachedImage = async (uri) => {
    try {
      setIsLoading(true);
      setHasError(false);

      // Vérifier si l'image est en cache
      const cacheKey = `cached_image_${uri.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        // Image en cache, l'utiliser
        const { uri: cachedUri, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        const cacheAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
        
        if (now - timestamp < cacheAge) {
          setImageSource({ uri: cachedUri });
          setIsLoading(false);
          return;
        }
      }

      // Image pas en cache ou expirée, la télécharger
      const response = await fetch(uri);
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onload = async () => {
          const base64 = reader.result;
          const cacheData = {
            uri: base64,
            timestamp: Date.now()
          };
          
          // Sauvegarder en cache
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
          setImageSource({ uri: base64 });
          setIsLoading(false);
        };
        
        reader.readAsDataURL(blob);
      } else {
        throw new Error('Failed to load image');
      }
    } catch (error) {
      console.error('Erreur de chargement d\'image:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  if (hasError) {
    return <ImagePlaceholder size={style?.width || 100} text="Image" />;
  }

  if (isLoading) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color="#51A905" />
      </View>
    );
  }

  return (
    <Image
      source={imageSource}
      style={style}
      defaultSource={defaultSource}
      {...props}
    />
  );
};

export default CachedImage;
