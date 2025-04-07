import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const SkeletonItem = ({ width, height, style }) => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeletonItem,
        {
          width,
          height,
          opacity: animatedValue,
        },
        style,
      ]}
    />
  );
};

export const ProductSkeleton = () => {
  return (
    <View style={styles.productContainer}>
      <SkeletonItem width="100%" height={150} />
      <View style={styles.productInfo}>
        <SkeletonItem width="70%" height={20} style={styles.marginBottom} />
        <SkeletonItem width="40%" height={15} style={styles.marginBottom} />
        <SkeletonItem width="60%" height={15} />
      </View>
    </View>
  );
};

export const RestaurantSkeleton = () => {
  return (
    <View style={styles.restaurantContainer}>
      <SkeletonItem width="100%" height={180} />
      <View style={styles.restaurantInfo}>
        <SkeletonItem width="80%" height={24} style={styles.marginBottom} />
        <SkeletonItem width="60%" height={18} style={styles.marginBottom} />
        <SkeletonItem width="40%" height={18} />
      </View>
    </View>
  );
};

export const CategorySkeleton = () => {
  return (
    <View style={styles.categoryContainer}>
      <SkeletonItem width={80} height={80} style={styles.marginBottom} />
      <SkeletonItem width={60} height={16} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonItem: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  marginBottom: {
    marginBottom: 10,
  },
  productContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productInfo: {
    padding: 15,
  },
  restaurantContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restaurantInfo: {
    padding: 15,
  },
  categoryContainer: {
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 5,
  },
}); 