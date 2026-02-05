import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ConnectivityBanner = ({ isConnected }) => {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState('offline'); // 'offline', 'restored'
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (!isConnected) {
      setStatus('offline');
      setVisible(true);
      showBanner();
    } else if (visible && status === 'offline') {
      setStatus('restored');
      // Keep visible for a moment to show "Back online"
      setTimeout(() => {
        hideBanner();
      }, 3000);
    }
  }, [isConnected]);

  const showBanner = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideBanner = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  const isRestored = status === 'restored';

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: isRestored ? '#4CAF50' : '#FF5252' 
        }
      ]}
    >
      <View style={styles.content}>
        <Ionicons 
          name={isRestored ? "wifi" : "cloud-offline"} 
          size={18} 
          color="#FFF" 
        />
        <Text style={styles.text}>
          {isRestored 
            ? "Connexion rétablie" 
            : "Pas de connexion Internet. L'app est limitée."}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
    marginLeft: 10,
  },
});

export default ConnectivityBanner;
