import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

const HomeSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <Skeleton width={120} height={24} borderRadius={4} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
        <Skeleton width={200} height={16} borderRadius={4} style={styles.subtitle} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Skeleton width={width - 40} height={50} borderRadius={25} />
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Skeleton width={100} height={20} borderRadius={4} style={styles.sectionTitle} />
        <View style={styles.categoriesContainer}>
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.categoryItem}>
              <Skeleton width={60} height={60} borderRadius={30} />
              <Skeleton width={50} height={12} borderRadius={4} style={styles.categoryText} />
            </View>
          ))}
        </View>
      </View>

      {/* Popular Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Skeleton width={150} height={20} borderRadius={4} />
          <Skeleton width={60} height={16} borderRadius={4} />
        </View>
        <View style={styles.productsContainer}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.productCard}>
              <Skeleton width="100%" height={120} borderRadius={8} style={styles.productImage} />
              <Skeleton width={120} height={16} borderRadius={4} style={styles.productName} />
              <Skeleton width={80} height={14} borderRadius={4} style={styles.productPrice} />
            </View>
          ))}
        </View>
      </View>

      {/* Restaurants */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Skeleton width={180} height={20} borderRadius={4} />
          <Skeleton width={60} height={16} borderRadius={4} />
        </View>
        <View style={styles.restaurantsContainer}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.restaurantCard}>
              <Skeleton width="100%" height={100} borderRadius={8} style={styles.restaurantImage} />
              <View style={styles.restaurantInfo}>
                <Skeleton width={140} height={16} borderRadius={4} style={styles.restaurantName} />

                <Skeleton width={80} height={12} borderRadius={4} style={styles.restaurantDistance} />
              </View>
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
    paddingHorizontal: 20,
  },
  headerSection: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtitle: {
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryText: {
    marginTop: 8,
  },
  productsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 60) / 3,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    marginBottom: 8,
  },
  productName: {
    marginBottom: 4,
  },
  productPrice: {
    marginBottom: 0,
  },
  restaurantsContainer: {
    gap: 15,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantImage: {
    marginBottom: 0,
  },
  restaurantInfo: {
    padding: 12,
    gap: 6,
  },
  restaurantName: {
    marginBottom: 0,
  },

  restaurantDistance: {
    marginBottom: 0,
  },
});

export default HomeSkeleton;
