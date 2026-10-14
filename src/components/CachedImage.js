import React from 'react';
import AppImage from './AppImage';

// Anciennement téléchargeait les images via fetch()+base64 dans AsyncStorage,
// ce qui était très lent. On délègue désormais à FastImage (cache natif disque + mémoire).
const CachedImage = ({ source, style, defaultSource, ...props }) => {
  return (
    <AppImage
      source={source}
      style={style}
      defaultSource={defaultSource}
      {...props}
    />
  );
};

export default CachedImage;
