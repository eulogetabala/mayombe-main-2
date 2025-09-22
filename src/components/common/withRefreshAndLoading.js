import React, { useState } from 'react';
import { View, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { ProductSkeleton, RestaurantSkeleton, CategorySkeleton } from './SkeletonLoader';

const getSkeletonComponent = (type) => {
  switch (type) {
    case 'product':
      return ProductSkeleton;
    case 'restaurant':
      return RestaurantSkeleton;
    case 'category':
      return CategorySkeleton;
    default:
      return ProductSkeleton;
  }
};

export const withRefreshAndLoading = (WrappedComponent, options = {}) => {
  const {
    skeletonType = 'product',
    skeletonCount = 4,
    scrollEnabled = true,
  } = options;

  return function WithRefreshAndLoadingComponent({ onRefresh, loading, ...props }) {
    const [refreshing, setRefreshing] = useState(false);
    const SkeletonComponent = getSkeletonComponent(skeletonType);

    const handleRefresh = async () => {
      setRefreshing(true);
      if (onRefresh) {
        await onRefresh();
      }
      setRefreshing(false);
    };

    if (loading) {
      const skeletons = Array(skeletonCount).fill(null);
      return (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          scrollEnabled={scrollEnabled}
        >
          <View style={styles.skeletonContainer}>
            {skeletons.map((_, index) => (
              <SkeletonComponent key={index} />
            ))}
          </View>
        </ScrollView>
      );
    }

    if (scrollEnabled) {
      return (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <WrappedComponent {...props} />
        </ScrollView>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonContainer: {
    padding: 15,
  },
}); 