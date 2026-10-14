import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppImage from './AppImage';

// Compatible avec l'ancienne interface OptimizedImage.
// Les images distantes passent par FastImage (cache natif disque + mémoire),
// ce qui évite les re-téléchargements et accélère l'affichage.
const OptimizedImage = ({ 
  source, 
  style, 
  defaultSource = require('../assets/images/2.jpg'),
  resizeMode = 'cover',
  placeholderColor = '#f0f0f0',
  onLoad,
  onError,
  priority = 'normal',
  enableCache = true,
  ...props 
}) => {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [source]);

  const isRemote = source && typeof source === 'object' && source.uri &&
    (source.uri.startsWith('http://') || source.uri.startsWith('https://'));

  // Fallback sur l'image par défaut en cas d'erreur
  if (failed || (!source && !defaultSource)) {
    return (
      <View style={[styles.container, style, { backgroundColor: placeholderColor }]}>
        <Ionicons name="image-outline" size={24} color="#ccc" />
      </View>
    );
  }

  return (
    <AppImage
      source={source}
      defaultSource={defaultSource}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      priority={priority}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...props}
    >
      {!loaded && isRemote && (
        <View style={[styles.loader, { backgroundColor: placeholderColor }]}>
          <Ionicons name="image-outline" size={24} color="#ccc" />
        </View>
      )}
    </AppImage>
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
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OptimizedImage;
