import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Skeleton from '../Skeleton';

const { width } = Dimensions.get('window');

const TrouverRestaurantSkeleton = () => {
  return (
    <View style={styles.container}>
      <Skeleton width={150} height={20} borderRadius={4} style={styles.sectionTitle} />
      <View style={styles.restaurantsContainer}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.restaurantCard}>
            <Skeleton width="100%" height={120} borderRadius={8} style={styles.restaurantImage} />
            <View style={styles.restaurantInfo}>
              <Skeleton width={140} height={16} borderRadius={4} style={styles.restaurantName} />

              <Skeleton width={80} height={12} borderRadius={4} style={styles.restaurantDistance} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    marginBottom: 15,
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

export default TrouverRestaurantSkeleton;
