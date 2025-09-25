import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Skeleton from '../Skeleton';

const { width } = Dimensions.get('window');

const CategorieSkeleton = () => {
  return (
    <View style={styles.container}>
      <Skeleton width={120} height={20} borderRadius={4} style={styles.sectionTitle} />
      <View style={styles.categoriesContainer}>
        {[1, 2, 3, 4, 5].map((item) => (
          <View key={item} style={styles.categoryItem}>
            <Skeleton width={60} height={60} borderRadius={30} />
            <Skeleton width={50} height={12} borderRadius={4} style={styles.categoryText} />
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
});

export default CategorieSkeleton;
