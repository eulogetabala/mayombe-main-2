import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

const NoConnectionScreen = ({ onRetry, isRetrying }) => {
  return (
    <View style={styles.container}>
      <Animatable.View
        animation="fadeInUp"
        duration={1000}
        style={styles.content}
      >
        {/* Icône animée */}
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          duration={2000}
          style={styles.iconContainer}
        >
          <Ionicons name="cloud-offline-outline" size={100} color="#FF9800" />
        </Animatable.View>

        {/* Titre */}
        <Text style={styles.title}>Oups ! Connexion Perdue</Text>

        {/* Message */}
        <Text style={styles.message}>
          Il semble que vous soyez déconnecté. Vérifiez vos paramètres réseau pour continuer à naviguer sur Mayombe.
        </Text>

        {/* Bouton Réessayer */}
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
            onPress={onRetry}
            disabled={isRetrying}
            activeOpacity={0.8}
          >
            {isRetrying ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#FFF" style={styles.retryIcon} />
                <Text style={styles.retryText}>Réessayer</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 40,
    backgroundColor: '#FFF8E1',
    padding: 30,
    borderRadius: 100,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: '#777',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800', // Coherent with Mayombe brand
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 180,
    justifyContent: 'center',
  },
  retryButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0.1,
  },
  retryIcon: {
    marginRight: 10,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

export default NoConnectionScreen;

