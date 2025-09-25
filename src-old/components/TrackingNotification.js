import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const TrackingNotification = ({ 
  visible, 
  message, 
  type = 'info', 
  onClose, 
  autoHide = true,
  duration = 3000 
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'entrée
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide si activé
      if (autoHide) {
        const timer = setTimeout(() => {
          hideNotification();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideNotification();
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose && onClose();
    });
  };

  const getNotificationStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          icon: 'checkmark-circle',
          iconColor: '#fff',
        };
      case 'error':
        return {
          backgroundColor: '#F44336',
          icon: 'close-circle',
          iconColor: '#fff',
        };
      case 'warning':
        return {
          backgroundColor: '#FF9800',
          icon: 'warning',
          iconColor: '#fff',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#2196F3',
          icon: 'information-circle',
          iconColor: '#fff',
        };
    }
  };

  const notificationStyle = getNotificationStyle();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: notificationStyle.backgroundColor,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={notificationStyle.icon}
            size={24}
            color={notificationStyle.iconColor}
          />
        </View>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={hideNotification}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: scaleFont(14),
    color: '#fff',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
});

export default TrackingNotification;
