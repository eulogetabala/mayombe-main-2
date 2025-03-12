import React from 'react';
import { View, Animated } from 'react-native';

export const SearchSkeleton = () => {
  return (
    <View style={{ padding: 15 }}>
      <View style={{
        backgroundColor: '#E0E0E0',
        height: 20,
        width: '70%',
        borderRadius: 4,
        marginBottom: 15
      }} />
      <View style={{
        backgroundColor: '#E0E0E0',
        height: 100,
        width: '100%',
        borderRadius: 8,
        marginBottom: 10
      }} />
      {/* Ajoutez d'autres éléments de squelette selon vos besoins */}
    </View>
  );
}; 