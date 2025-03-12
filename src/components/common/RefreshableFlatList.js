import React from 'react';
import { FlatList, RefreshControl } from 'react-native';

export const RefreshableFlatList = ({
  data,
  renderItem,
  loading,
  onRefresh,
  refreshing,
  SkeletonComponent,
  ...props
}) => {
  if (loading) {
    return <SkeletonComponent />;
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      {...props}
    />
  );
}; 