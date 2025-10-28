import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ImagePlaceholder = ({ size = 100, text = "Image" }) => (
  <View style={[styles.placeholder, { width: size, height: size }]}>
    <Ionicons name="image-outline" size={size * 0.4} color="#ccc" />
    <Text style={[styles.placeholderText, { fontSize: size * 0.1 }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  placeholderText: {
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ImagePlaceholder;
