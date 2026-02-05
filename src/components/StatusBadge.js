import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StatusBadge = ({ isOpen, size = 'normal' }) => {
  const isSmall = size === 'small';
  
  return (
    <View style={[
      styles.container,
      isOpen ? styles.open : styles.closed,
      isSmall && styles.containerSmall
    ]}>
      <Ionicons
        name={isOpen ? 'checkmark-circle' : 'close-circle'}
        size={isSmall ? 12 : 14}
        color={isOpen ? '#4CAF50' : '#F44336'}
      />
      <Text style={[styles.text, isSmall && styles.textSmall]}>
        {isOpen ? 'Ouvert' : 'Fermé'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  open: {
    backgroundColor: '#E8F5E9',
  },
  closed: {
    backgroundColor: '#FFEBEE',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  textSmall: {
    fontSize: 9,
  },
});

export default StatusBadge;
