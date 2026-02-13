import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ConnectionError = ({ onRetry, message = null }) => {
  // Message par défaut élégant
  const defaultMessage = "📡";
  const defaultSubMessage = "Pas de connexion";
  const defaultHint = "Vérifiez votre connexion internet";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{defaultMessage}</Text>
        <Text style={styles.message}>{message || defaultSubMessage}</Text>
        <Text style={styles.subMessage}>{defaultHint}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={18} color="#FFF" style={styles.retryIcon} />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    minHeight: 200,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  message: {
    fontSize: 18,
    fontFamily: 'Montserrat-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
  },
});

export default ConnectionError;
