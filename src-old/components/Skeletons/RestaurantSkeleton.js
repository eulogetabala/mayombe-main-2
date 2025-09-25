import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { View, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const RestaurantSkeleton = () => (
  <SkeletonPlaceholder backgroundColor="#F0F0F0" highlightColor="#E0E0E0">
    <View style={{ padding: 15 }}>
      {/* Image du restaurant */}
      <View style={{ width: width - 30, height: 200, borderRadius: 8 }} />
      
      {/* Nom et infos du restaurant */}
      <View style={{ marginTop: 15 }}>
        <View style={{ width: 200, height: 20, borderRadius: 4 }} />
        <View style={{ width: 150, height: 15, borderRadius: 4, marginTop: 8 }} />
      </View>
    </View>
  </SkeletonPlaceholder>
);

// components/Skeletons/MenuSkeleton.js
export const MenuSkeleton = () => (
  <SkeletonPlaceholder backgroundColor="#F0F0F0" highlightColor="#E0E0E0">
    <View style={{ padding: 15 }}>
      {/* Tabs des sous-menus */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {[1, 2, 3].map((_, index) => (
          <View
            key={index}
            style={{
              width: 100,
              height: 35,
              borderRadius: 20,
              marginRight: 10,
            }}
          />
        ))}
      </View>

      {/* Items du menu */}
      {[1, 2, 3, 4].map((_, index) => (
        <View key={index} style={{ marginBottom: 15 }}>
          <View style={{ width: '100%', height: 80, borderRadius: 8 }} />
          <View style={{ width: 150, height: 15, marginTop: 8, borderRadius: 4 }} />
          <View style={{ width: 100, height: 15, marginTop: 5, borderRadius: 4 }} />
        </View>
      ))}
    </View>
  </SkeletonPlaceholder>
);