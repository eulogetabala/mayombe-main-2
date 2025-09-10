import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, StatusBar, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SimpleHeader = ({ 
  onBack, 
  title, 
  rightComponent, 
  backIcon = 'arrow-back',
  backText,
  iconColor = '#333',
  backgroundColor = '#fff',
  style 
}) => {
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
      >
        <Ionicons name={backIcon} size={24} color={iconColor} />
        {backText && (
          <Text style={[styles.backText, { color: iconColor }]}>{backText}</Text>
        )}
      </TouchableOpacity>
      
      {title && (
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 15 : (StatusBar.currentHeight || 0) + 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 10,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    marginLeft: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  rightContainer: {
    marginLeft: 'auto',
  },
});

export default SimpleHeader; 