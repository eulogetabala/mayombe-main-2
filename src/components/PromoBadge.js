import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PromoBadge = ({ originalPrice, promoPrice, discountPercentage, size = 'normal' }) => {
  const isSmall = size === 'small';
  
  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <View style={[styles.badge, isSmall && styles.badgeSmall]}>
        <Text style={[styles.badgeText, isSmall && styles.badgeTextSmall]}>PROMO</Text>
      </View>
      <View style={styles.pricesContainer}>
        <Text style={[styles.originalPrice, isSmall && styles.originalPriceSmall]}>
          {originalPrice} FCFA
        </Text>
        <Text style={[styles.promoPrice, isSmall && styles.promoPriceSmall]}>
          {promoPrice} FCFA
        </Text>
      </View>
      {discountPercentage && (
        <Text style={[styles.discount, isSmall && styles.discountSmall]}>
          -{discountPercentage}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  containerSmall: {
    gap: 4,
    marginVertical: 2,
  },
  badge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeTextSmall: {
    fontSize: 8,
  },
  pricesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  originalPriceSmall: {
    fontSize: 10,
  },
  promoPrice: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: 'bold',
  },
  promoPriceSmall: {
    fontSize: 12,
  },
  discount: {
    fontSize: 11,
    color: '#FF4444',
    fontWeight: '600',
  },
  discountSmall: {
    fontSize: 9,
  },
});

export default PromoBadge;
