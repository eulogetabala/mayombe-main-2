import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const RestaurantHeader = ({ restaurant, onBack }) => {
  const resolveImageUrl = (p) => {
    if (!p) return require('../../../assets/images/2.jpg');
    if (typeof p === 'string' && (p.startsWith('http://') || p.startsWith('https://'))) {
      return { uri: p };
    }
    return { uri: `https://www.mayombe-app.com/uploads_admin/${p}` };
  };

  return (
    <View style={styles.header}>
      <Image 
        source={resolveImageUrl(restaurant.cover || restaurant.image)} 
        style={styles.coverImage} 
      />
    <View style={styles.headerOverlay} />
    <TouchableOpacity
      style={styles.backButton}
      onPress={onBack}
    >
      <Ionicons name="arrow-back" size={24} color="#FFF" />
    </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerName}>{restaurant.name}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 1,
  },
  headerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  headerName: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  }
}); 