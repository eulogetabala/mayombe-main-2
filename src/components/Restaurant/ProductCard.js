import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../OptimizedImage';

export const ProductCard = ({ item, onPress }) => {
  console.log('Rendu ProductCard avec image:', item.image);
  console.log('URL originale:', item.originalCover);

  return (
    <TouchableOpacity 
      style={styles.productCard} 
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      <OptimizedImage 
        source={item.image}
        style={styles.productImage}
        defaultSource={require('../../assets/images/2.jpg')}
        resizeMode="cover"
        priority="normal"
        onLoad={() => {
          console.log('Image optimisée chargée avec succès:', 
            item.image?.uri || 'Image par défaut');
        }}
        onError={(e) => {
          console.error('Erreur chargement image optimisée:', e.nativeEvent?.error || e);
          console.log('URL qui a échoué:', item.image?.uri);
          console.log('URL originale:', item.originalCover);
        }}
      />
      <View style={styles.productContent}>
        <View>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            {item.price} FCFA
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={(e) => {
              e.stopPropagation();
              onPress(item);
            }}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    flexDirection: 'row',
    height: 110,
  },
  productImage: {
    width: 110,
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  productContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  productDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginVertical: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#FF9800',
  },
  addButton: {
    backgroundColor: '#FF9800',
    padding: 8,
    borderRadius: 20,
  }
}); 