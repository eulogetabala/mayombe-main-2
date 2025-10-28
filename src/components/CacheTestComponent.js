import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { clearImageCache, getCacheSize } from '../config/ImageCacheConfig';

const CacheTestComponent = () => {
  const handleClearCache = async () => {
    await clearImageCache();
    alert('Cache vidé !');
  };

  const handleCheckCacheSize = async () => {
    const size = await getCacheSize();
    alert(`Taille du cache: ${(size / 1024 / 1024).toFixed(2)} MB`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test du Cache d'Images</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleCheckCacheSize}>
        <Text style={styles.buttonText}>Vérifier la taille du cache</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearCache}>
        <Text style={styles.buttonText}>Vider le cache</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#51A905',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default CacheTestComponent;
