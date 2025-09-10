import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

const RestaurantDetailsSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <Skeleton width={150} height={18} borderRadius={4} />
        <Skeleton width={24} height={24} borderRadius={12} />
      </View>

      {/* Restaurant Image */}
      <Skeleton width={width} height={200} borderRadius={0} style={styles.restaurantImage} />

      {/* Restaurant Info */}
      <View style={styles.restaurantInfo}>
        <Skeleton width={200} height={24} borderRadius={4} style={styles.restaurantName} />
        <Skeleton width={150} height={16} borderRadius={4} style={styles.restaurantAddress} />
        <View style={styles.ratingContainer}>
          <Skeleton width={80} height={16} borderRadius={4} />
          <Skeleton width={60} height={16} borderRadius={4} />
        </View>
      </View>

      {/* Menu Categories */}
      <View style={styles.section}>
        <Skeleton width={120} height={20} borderRadius={4} style={styles.sectionTitle} />
        <View style={styles.categoriesContainer}>
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} width={80} height={32} borderRadius={16} style={styles.categoryTab} />
          ))}
        </View>
      </View>

      {/* Products */}
      <View style={styles.section}>
        <Skeleton width={100} height={20} borderRadius={4} style={styles.sectionTitle} />
        <View style={styles.productsContainer}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={styles.productCard}>
              <Skeleton width={80} height={80} borderRadius={8} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Skeleton width={120} height={16} borderRadius={4} style={styles.productName} />
                <Skeleton width={100} height={12} borderRadius={4} style={styles.productDescription} />
                <Skeleton width={80} height={16} borderRadius={4} style={styles.productPrice} />
              </View>
              <Skeleton width={32} height={32} borderRadius={16} style={styles.addButton} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  restaurantImage: {
    marginBottom: 0,
  },
  restaurantInfo: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  restaurantName: {
    marginBottom: 8,
  },
  restaurantAddress: {
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryTab: {
    marginRight: 0,
  },
  productsContainer: {
    gap: 15,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    marginRight: 12,
    marginBottom: 0,
  },
  productInfo: {
    flex: 1,
    gap: 6,
  },
  productName: {
    marginBottom: 0,
  },
  productDescription: {
    marginBottom: 0,
  },
  productPrice: {
    marginBottom: 0,
  },
  addButton: {
    marginLeft: 12,
    marginBottom: 0,
  },
});

export default RestaurantDetailsSkeleton;
