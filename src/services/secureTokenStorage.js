import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

const TOKEN_KEY = 'userToken';
const LEGACY_TOKEN_KEY = 'userToken'; // clé historique AsyncStorage

// Récupère le module natif sans crasher s'il est absent (Expo Go / client non reconstruit).
// Si le module natif est absent, on retombe silencieusement sur AsyncStorage.
const NativeSecureStore = requireOptionalNativeModule('ExpoSecureStore');

const nativeAvailable = !!NativeSecureStore;

/**
 * Stockage sécurisé du token d'authentification.
 * Utilise le Keychain (iOS) / Keystore (Android) via expo-secure-store
 * lorsqu'il est disponible, sinon AsyncStorage en fallback.
 */
class SecureTokenStorage {
  /**
   * Lire le token : stockage sécurisé d'abord, sinon migration depuis l'ancien AsyncStorage.
   */
  async getToken() {
    let secureToken = null;
    if (nativeAvailable) {
      try {
        secureToken = await NativeSecureStore.getValueWithKeyAsync(TOKEN_KEY);
        if (secureToken) {
          await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
          return secureToken;
        }
      } catch (error) {
        console.error('Erreur lecture token sécurisé:', error);
      }
    }

    // Fallback / migration depuis l'ancien stockage non chiffré.
    // On ne retourne JAMAIS null tant qu'un token existe en AsyncStorage,
    // même si la migration vers le Keychain échoue.
    try {
      const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
      if (legacyToken) {
        if (nativeAvailable) {
          try {
            await NativeSecureStore.setValueWithKeyAsync(legacyToken, TOKEN_KEY);
            await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
          } catch (migrationError) {
            console.warn('Migration SecureStore impossible, utilisation du token AsyncStorage:', migrationError);
          }
        }
        return legacyToken;
      }
      return secureToken || null;
    } catch (error) {
      console.error('Erreur lecture token fallback:', error);
      return secureToken || null;
    }
  }

  /**
   * Écrire le token dans le stockage sécurisé (ou AsyncStorage en fallback).
   */
  async setToken(token) {
    try {
      if (nativeAvailable) {
        await NativeSecureStore.setValueWithKeyAsync(token, TOKEN_KEY);
      } else {
        await AsyncStorage.setItem(LEGACY_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Erreur écriture token sécurisé:', error);
      await AsyncStorage.setItem(LEGACY_TOKEN_KEY, token);
    }
  }

  /**
   * Supprimer le token des deux stockages.
   */
  async removeToken() {
    try {
      if (nativeAvailable) {
        await NativeSecureStore.deleteValueWithKeyAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Erreur suppression token sécurisé:', error);
    }
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}

export default new SecureTokenStorage();
