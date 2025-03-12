import React, { useState } from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';

export const withLoadingAndRefresh = (WrappedComponent, SkeletonComponent) => {
  return function WithLoadingAndRefresh({ onRefresh: parentOnRefresh, loading, ...props }) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
      setRefreshing(true);
      if (parentOnRefresh) {
        await parentOnRefresh();
      }
      setRefreshing(false);
    };

    if (loading) {
      return (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <SkeletonComponent />
        </ScrollView>
      );
    }

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <WrappedComponent {...props} />
      </ScrollView>
    );
  };
}; 