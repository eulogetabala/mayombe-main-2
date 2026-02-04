import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';

// Essayer d'importer Clipboard
let Clipboard = null;
try {
  // React Native moderne
  const RN = require('react-native');
  if (RN.Clipboard) {
    Clipboard = RN.Clipboard;
  }
} catch (e) {
  // Clipboard non disponible
}
import { Ionicons } from '@expo/vector-icons';
// Clipboard sera importé depuis react-native si disponible
import fcmService from '../services/fcmService';
import { showFCMToken, forceGetFCMToken } from '../Utils/showFCMToken';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCMTokenScreen = ({ navigation }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState(Platform.OS);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      setLoading(true);
      
      // Méthode 1: Depuis le service FCM
      let fcmToken = fcmService.getToken();
      
      // Méthode 2: Depuis AsyncStorage
      if (!fcmToken) {
        fcmToken = await AsyncStorage.getItem('fcmToken');
      }
      
      // Méthode 3: Forcer l'obtention
      if (!fcmToken) {
        fcmToken = await forceGetFCMToken();
      }
      
      setToken(fcmToken);
    } catch (error) {
      console.error('Erreur chargement token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (token) {
      try {
        if (Clipboard && Clipboard.setString) {
          Clipboard.setString(token);
          Alert.alert('✅ Copié !', 'Le token FCM a été copié dans le presse-papiers.');
        } else {
          // Fallback : le token est déjà sélectionnable dans le Text
          Alert.alert(
            '💡 Copie du token',
            'Le token est affiché ci-dessus. Appuyez longuement sur le token pour le sélectionner et le copier.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        Alert.alert(
          '💡 Copie du token',
          'Le token est affiché ci-dessus. Appuyez longuement sur le token pour le sélectionner et le copier.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleRefreshToken = async () => {
    try {
      setLoading(true);
      const newToken = await forceGetFCMToken();
      setToken(newToken);
      if (newToken) {
        Alert.alert('Succès', 'Nouveau token obtenu !');
      } else {
        Alert.alert('Erreur', 'Impossible d\'obtenir un nouveau token.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunTest = async () => {
    try {
      setTesting(true);
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🧪 LANCEMENT DU TEST COMPLET FCM...');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      
      const results = await fcmService.runCompleteTest();
      
      // Afficher un résumé dans une alerte
      const criticalCount = results.criticalIssues?.length || 0;
      const warningCount = results.warnings?.length || 0;
      
      if (criticalCount === 0) {
        Alert.alert(
          '✅ Test terminé',
          `Tous les tests sont passés !\n\nVérifiez les logs dans le terminal Metro pour les détails complets.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '⚠️ Problèmes détectés',
          `${criticalCount} problème(s) critique(s) détecté(s).\n${warningCount} avertissement(s).\n\nVérifiez les logs dans le terminal Metro pour les détails.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur lors du test:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du test. Vérifiez les logs.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Token FCM</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF9800" />
              <Text style={styles.loadingText}>Chargement du token...</Text>
            </View>
          ) : token ? (
            <>
              <View style={styles.infoCard}>
                <Ionicons name="checkmark-circle" size={48} color="#51A905" />
                <Text style={styles.successTitle}>Token FCM disponible</Text>
                <Text style={styles.successSubtitle}>
                  Utilisez ce token pour tester les notifications depuis Firebase Console
                </Text>
              </View>

              <View style={styles.tokenCard}>
                <View style={styles.tokenHeader}>
                  <Text style={styles.tokenLabel}>Token FCM</Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyToken}
                  >
                    <Ionicons name="copy-outline" size={20} color="#FF9800" />
                    <Text style={styles.copyButtonText}>Copier</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.tokenContainer}>
                  <Text style={styles.tokenText} selectable>
                    {token}
                  </Text>
                </View>
                <View style={styles.tokenInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="phone-portrait-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>Plateforme: {platform}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="resize-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>Longueur: {token.length} caractères</Text>
                  </View>
                </View>
              </View>

              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsTitle}>Comment tester</Text>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>1</Text>
                  <Text style={styles.instructionText}>
                    Allez dans Firebase Console {'>'} Cloud Messaging
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>2</Text>
                  <Text style={styles.instructionText}>
                    Cliquez sur "Nouvelle campagne" ou "Envoyer un message de test"
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>3</Text>
                  <Text style={styles.instructionText}>
                    Sélectionnez "Appareil de test" et collez le token ci-dessus
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.instructionNumber}>4</Text>
                  <Text style={styles.instructionText}>
                    Utilisez le format avec "notification" payload
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.testButton}
                onPress={handleRunTest}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="bug-outline" size={20} color="#FFF" />
                )}
                <Text style={styles.testButtonText}>
                  {testing ? 'Test en cours...' : 'Lancer le test complet FCM'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefreshToken}
              >
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={styles.refreshButtonText}>Actualiser le token</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={48} color="#FF4444" />
              <Text style={styles.errorTitle}>Token FCM non disponible</Text>
              <Text style={styles.errorSubtitle}>
                Le token n'a pas encore été généré. Cela peut arriver si :
              </Text>
              <View style={styles.errorList}>
                <Text style={styles.errorItem}>• Les permissions de notifications ne sont pas accordées</Text>
                <Text style={styles.errorItem}>• L'utilisateur n'est pas encore connecté</Text>
                <Text style={styles.errorItem}>• L'app n'a pas été reconstruite avec les modules natifs</Text>
              </View>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRefreshToken}
              >
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={styles.retryButtonText}>Essayer d'obtenir le token</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  tokenCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tokenLabel: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
  tokenContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: '#333',
    lineHeight: 20,
  },
  tokenInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    opacity: 1,
  },
  testButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  refreshButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#FF4444',
    marginTop: 15,
    marginBottom: 10,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Montserrat',
    marginBottom: 15,
  },
  errorList: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  errorItem: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 8,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 15,
    minWidth: 200,
  },
  retryButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

export default FCMTokenScreen;

