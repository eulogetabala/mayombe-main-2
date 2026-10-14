import React, { useState, useCallback, useEffect } from 'react';
import { Image } from 'react-native';
import FastImage from 'react-native-fast-image';

// Vérifie si la source est une image distante (URL) ou locale (require -> nombre)
const isRemoteSource = (source) => {
  if (!source) return false;
  if (typeof source === 'number') return false; // require() local
  if (typeof source === 'object' && source.uri) {
    return source.uri.startsWith('http://') || source.uri.startsWith('https://');
  }
  return false;
};

const isGsUri = (source) => {
  if (typeof source === 'object' && source.uri) {
    return source.uri.startsWith('gs://');
  }
  return false;
};

// Convertit un chemin gs:// en URL Firebase Storage téléchargeable
const gsToHttp = (uri) => {
  const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) return uri;
  const [, bucket, objectPath] = match;
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
};

const AppImage = ({
  source,
  defaultSource,
  style,
  resizeMode = 'cover',
  priority = 'normal',
  cache = 'immutable',
  children,
  ...props
}) => {
  const [failed, setFailed] = useState(false);

  // Réinitialiser l'état d'erreur quand la source change
  useEffect(() => {
    setFailed(false);
  }, [source]);

  const handleError = useCallback((e) => {
    if (!failed) {
      setFailed(true);
    }
    props.onError?.(e);
  }, [failed, props.onError]);

  // Image locale -> Image standard de React Native
  if (!isRemoteSource(source)) {
    const resolvedSource = isGsUri(source) ? { uri: gsToHttp(source.uri) } : source;
    return (
      <Image
        source={resolvedSource || defaultSource}
        style={style}
        resizeMode={resizeMode}
        {...props}
      >
        {children}
      </Image>
    );
  }

  // Image distante -> FastImage (cache natif disque + mémoire)
  if (failed) {
    if (defaultSource) {
      return (
        <Image source={defaultSource} style={style} resizeMode={resizeMode}>
          {children}
        </Image>
      );
    }
    return null;
  }

  const priorityMap = {
    low: FastImage.priority.low,
    normal: FastImage.priority.normal,
    high: FastImage.priority.high,
  };

  const cacheMap = {
    immutable: FastImage.cacheControl.immutable,
    web: FastImage.cacheControl.web,
    cacheOnly: FastImage.cacheControl.cacheOnly,
  };

  const { onError, onLoad, onLoadStart, onLoadEnd, ...imageProps } = props;

  return (
    <FastImage
      style={style}
      source={{
        uri: isGsUri(source) ? gsToHttp(source.uri) : source.uri,
        priority: priorityMap[priority] || FastImage.priority.normal,
        cache: cacheMap[cache] || FastImage.cacheControl.immutable,
      }}
      resizeMode={FastImage.resizeMode[resizeMode] || FastImage.resizeMode.cover}
      onError={handleError}
      onLoad={onLoad}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      {...imageProps}
    >
      {children}
    </FastImage>
  );
};

export default React.memo(AppImage);
