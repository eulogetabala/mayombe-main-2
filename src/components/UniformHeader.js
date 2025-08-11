import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, StatusBar, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const UniformHeader = ({ 
  onBack, 
  title, 
  rightComponent, 
  backgroundColor = 'rgba(0,0,0,0.3)',
  iconColor = '#FFF',
  style,
  showTitle = true,
  backIcon = 'arrow-back',
  backText,
  containerStyle
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor }]}
        onPress={onBack}
      >
        <Ionicons name={backIcon} size={24} color={iconColor} />
        {backText && (
          <Text style={[styles.backText, { color: iconColor }]}>{backText}</Text>
        )}
      </TouchableOpacity>
      
      {showTitle && title && (
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: iconColor }]}>{title}</Text>
        </View>
      )}
      
      {rightComponent && (
        <View style={styles.rightContainer}>
          {rightComponent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : (StatusBar.currentHeight || 0) + 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    marginLeft: 8,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#FFF',
  },
  rightContainer: {
    marginLeft: 'auto',
  },
});

export default UniformHeader; 