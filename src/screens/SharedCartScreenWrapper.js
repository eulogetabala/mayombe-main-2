import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SharedCartScreen from './SharedCartScreen';

const SharedCartScreenWrapper = () => {
  return (
    <View style={styles.container}>
      <SharedCartScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SharedCartScreenWrapper;
