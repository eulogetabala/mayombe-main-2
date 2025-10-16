import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { ref, set, get } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import sharedCartService from '../services/sharedCartService';

// Initialiser Firebase
const database = getDatabase();

const ShareInstructionsModal = ({ visible, onClose, cartItems, sharedCartId }) => {
  const handleCopyId = () => {
    Clipboard.setString(sharedCartId);
    Alert.alert(
      "✅ ID copié !", 
      `L'ID du panier a été copié dans le presse-papiers.\n\n🆔 ${sharedCartId}\n\nVous pouvez maintenant le partager ou le coller ailleurs.`,
      [
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animatable.View 
          animation="slideInUp" 
          duration={300}
          style={styles.modalContainer}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Partager mon panier</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.cartSummary}>
              <Text style={styles.summaryTitle}>Résumé du panier :</Text>
              {cartItems.map((item, index) => (
                <Text key={index} style={styles.summaryItem}>
                  • {item.name} ({item.quantity}x) - {item.total?.toLocaleString()} FCFA
                </Text>
              ))}
              <Text style={styles.totalText}>
                Total: {cartItems.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString()} FCFA
              </Text>
            </View>

            <View style={styles.idSection}>
              <Text style={styles.idLabel}>🆔 ID du panier :</Text>
              <TouchableOpacity 
                style={styles.idContainer}
                onPress={handleCopyId}
                activeOpacity={0.7}
              >
                <View style={styles.idTextContainer}>
                  <Ionicons name="link" size={16} color="#FF9800" />
                  <Text style={styles.idText}>{sharedCartId}</Text>
                </View>
                <View style={styles.copyIndicator}>
                  <Ionicons name="copy" size={16} color="#FF9800" />
                  <Text style={styles.copyHint}>Appuyer pour copier</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.copyIdButton}
                onPress={handleCopyId}
              >
                <Ionicons name="copy" size={20} color="#FFF" />
                <Text style={styles.copyIdButtonText}>Copier l'ID</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionsSection}>
              <Text style={styles.instructionsTitle}>Instructions :</Text>
              <View style={styles.instructionItem}>
                <Ionicons name="download" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Téléchargez l'app Mayombe</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="share" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Cliquez sur "Panier partagé"</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="key" size={16} color="#FF9800" />
                <View style={styles.instructionTextContainer}>
                  <Text style={styles.instructionText}>Entrez l'ID :</Text>
                  <TouchableOpacity 
                    style={styles.instructionIdContainer}
                    onPress={handleCopyId}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="link" size={12} color="#FF9800" />
                    <Text style={styles.instructionIdText}>{sharedCartId}</Text>
                    <Ionicons name="copy" size={12} color="#FF9800" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="card" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Cliquez sur "Payer maintenant"</Text>
              </View>
            </View>

            {/* Section de diagnostic temporaire */}
            <View style={styles.diagnosticSection}>
              <Text style={styles.diagnosticTitle}>🔍 Diagnostic (Temporaire)</Text>
              
              <TouchableOpacity 
                style={styles.diagnosticButton}
                onPress={async () => {
                  console.log('🔍 DIAGNOSTIC FIREBASE - Test de connexion...');
                  try {
                    // Tester la connexion Firebase
                    const testRef = ref(database, 'test_connection');
                    await set(testRef, { timestamp: Date.now() });
                    console.log('✅ FIREBASE CONNECTÉ');
                    
                    // Lister tous les paniers
                    const allCartsRef = ref(database, 'shared_carts');
                    const snapshot = await get(allCartsRef);
                    if (snapshot.exists()) {
                      const carts = snapshot.val();
                      console.log('📋 PANIERS DISPONIBLES:', Object.keys(carts));
                      Alert.alert(
                        '✅ Diagnostic Firebase', 
                        `Firebase connecté.\n${Object.keys(carts).length} panier(s) trouvé(s).\n\nPaniers: ${Object.keys(carts).join(', ')}`
                      );
                    } else {
                      console.log('❌ AUCUN PANIER');
                      Alert.alert('⚠️ Diagnostic Firebase', 'Firebase connecté mais aucun panier trouvé.');
                    }
                  } catch (error) {
                    console.error('❌ ERREUR FIREBASE:', error);
                    Alert.alert('❌ Erreur Firebase', error.message);
                  }
                }}
              >
                <Ionicons name="bug" size={16} color="#FFF" />
                <Text style={styles.diagnosticButtonText}>Test Firebase</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.diagnosticButton, { backgroundColor: '#4CAF50' }]}
                onPress={async () => {
                  console.log('🔍 DIAGNOSTIC PANIER - Test de sauvegarde...');
                  try {
                    // Tester la sauvegarde d'un panier de test
                    const testCartId = 'test_' + Date.now();
                    const testCartData = [
                      {
                        id: 999,
                        name: 'Test Product',
                        quantity: 1,
                        unitPrice: 1000,
                        total: 1000
                      }
                    ];
                    
                    console.log(`🔄 Test sauvegarde panier: ${testCartId}`);
                    const saved = await sharedCartService.saveSharedCart(testCartId, testCartData, 1); // 1h d'expiration
                    
                    if (saved) {
                      console.log('✅ Test sauvegarde réussi');
                      
                      // Tester la récupération
                      const retrieved = await sharedCartService.loadSharedCart(testCartId);
                      if (retrieved && retrieved.length > 0) {
                        console.log('✅ Test récupération réussi');
                        Alert.alert(
                          '✅ Test Panier Réussi', 
                          `Sauvegarde: ✅\nRécupération: ✅\nArticles: ${retrieved.length}\n\nID de test: ${testCartId}`
                        );
                      } else {
                        console.log('❌ Test récupération échoué');
                        Alert.alert('⚠️ Test Panier', 'Sauvegarde: ✅\nRécupération: ❌');
                      }
                    } else {
                      console.log('❌ Test sauvegarde échoué');
                      Alert.alert('❌ Test Panier', 'Sauvegarde: ❌');
                    }
                  } catch (error) {
                    console.error('❌ ERREUR TEST PANIER:', error);
                    Alert.alert('❌ Erreur Test', error.message);
                  }
                }}
              >
                <Ionicons name="flask" size={16} color="#FFF" />
                <Text style={styles.diagnosticButtonText}>Test Panier</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.diagnosticButton, { backgroundColor: '#9C27B0' }]}
                onPress={async () => {
                  console.log('🔍 DIAGNOSTIC - Test avec ID existant...');
                  try {
                    // Utiliser le premier panier disponible pour le test
                    const allCartsRef = ref(database, 'shared_carts');
                    const snapshot = await get(allCartsRef);
                    if (snapshot.exists()) {
                      const carts = snapshot.val();
                      const cartIds = Object.keys(carts);
                      if (cartIds.length > 0) {
                        const testId = cartIds[0]; // Premier panier disponible
                        console.log(`🔄 Test récupération avec ID existant: ${testId}`);
                        
                        const retrieved = await sharedCartService.loadSharedCart(testId);
                        if (retrieved && retrieved.length > 0) {
                          console.log('✅ Récupération ID existant réussie');
                          Alert.alert(
                            '✅ Test ID Existant Réussi', 
                            `ID testé: ${testId}\nArticles: ${retrieved.length}\n\nLe système fonctionne !`
                          );
                        } else {
                          console.log('❌ Récupération ID existant échouée');
                          Alert.alert('❌ Test ID Existant', `ID testé: ${testId}\nRécupération: ❌`);
                        }
                      } else {
                        Alert.alert('⚠️ Test', 'Aucun panier disponible pour le test');
                      }
                    }
                  } catch (error) {
                    console.error('❌ ERREUR TEST ID EXISTANT:', error);
                    Alert.alert('❌ Erreur Test', error.message);
                  }
                }}
              >
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.diagnosticButtonText}>Test ID Existant</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.diagnosticButton, { backgroundColor: '#607D8B' }]}
                onPress={async () => {
                  console.log('🔍 DIAGNOSTIC - Vérification configuration Firebase...');
                  try {
                    // Vérifier la configuration Firebase
                    const config = {
                      apiKey: "AIzaSyB6Foh29YS-VQLMhw-gO83L_OSVullVvI8",
                      authDomain: "mayombe-ba11b.firebaseapp.com",
                      databaseURL: "https://mayombe-ba11b-default-rtdb.firebaseio.com",
                      projectId: "mayombe-ba11b"
                    };
                    
                    console.log('🔧 Configuration Firebase:', config);
                    
                    // Tester l'accès en lecture/écriture
                    const testRef = ref(database, 'config_test');
                    await set(testRef, { 
                      timestamp: Date.now(),
                      test: 'configuration_ok',
                      device: 'test_device'
                    });
                    
                    const readTest = await get(testRef);
                    if (readTest.exists()) {
                      const data = readTest.val();
                      console.log('✅ Configuration Firebase OK:', data);
                      Alert.alert(
                        '✅ Configuration Firebase', 
                        `✅ Connexion: OK\n✅ Écriture: OK\n✅ Lecture: OK\n\nDatabase URL: ${config.databaseURL}\n\nLa configuration est correcte !`
                      );
                    } else {
                      Alert.alert('❌ Configuration Firebase', 'Problème de lecture après écriture');
                    }
                  } catch (error) {
                    console.error('❌ ERREUR CONFIGURATION:', error);
                    Alert.alert('❌ Erreur Configuration', `Erreur: ${error.message}\n\nVérifiez les règles Firebase !`);
                  }
                }}
              >
                <Ionicons name="settings" size={16} color="#FFF" />
                <Text style={styles.diagnosticButtonText}>Config Firebase</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.diagnosticButton, { backgroundColor: '#E91E63' }]}
                onPress={async () => {
                  console.log('🔍 DIAGNOSTIC - Test de lecture approfondi...');
                  try {
                    // Test 1: Lecture directe avec ref
                    console.log('📖 TEST 1: Lecture directe avec ref...');
                    const directRef = ref(database, 'shared_carts');
                    const directSnapshot = await get(directRef);
                    
                    if (directSnapshot.exists()) {
                      const directData = directSnapshot.val();
                      console.log('✅ Lecture directe réussie:', Object.keys(directData));
                      
                      // Test 2: Lecture d'un panier spécifique
                      const cartIds = Object.keys(directData);
                      if (cartIds.length > 0) {
                        const testCartId = cartIds[0];
                        console.log(`📖 TEST 2: Lecture panier spécifique: ${testCartId}`);
                        
                        const specificRef = ref(database, `shared_carts/${testCartId}`);
                        const specificSnapshot = await get(specificRef);
                        
                        if (specificSnapshot.exists()) {
                          const specificData = specificSnapshot.val();
                          console.log('✅ Lecture panier spécifique réussie:', specificData);
                          
                          // Test 3: Vérification des données
                          if (specificData.cart_data && Array.isArray(specificData.cart_data)) {
                            console.log('✅ Données du panier valides:', specificData.cart_data.length, 'articles');
                            
                            Alert.alert(
                              '✅ Tests de Lecture Réussis', 
                              `✅ Lecture directe: OK\n✅ Lecture spécifique: OK\n✅ Données valides: OK\n\nPanier testé: ${testCartId}\nArticles: ${specificData.cart_data.length}\n\nLe problème n'est PAS dans la lecture Firebase !`
                            );
                          } else {
                            console.log('❌ Structure des données invalide:', specificData);
                            Alert.alert('❌ Structure Invalide', `Panier: ${testCartId}\nStructure: ${JSON.stringify(specificData)}`);
                          }
                        } else {
                          console.log('❌ Lecture panier spécifique échouée');
                          Alert.alert('❌ Lecture Spécifique', `Impossible de lire le panier: ${testCartId}`);
                        }
                      } else {
                        Alert.alert('⚠️ Aucun Panier', 'Aucun panier disponible pour le test');
                      }
                    } else {
                      console.log('❌ Lecture directe échouée');
                      Alert.alert('❌ Lecture Directe', 'Impossible de lire la collection shared_carts');
                    }
                  } catch (error) {
                    console.error('❌ ERREUR TESTS LECTURE:', error);
                    Alert.alert('❌ Erreur Tests', `Erreur: ${error.message}\n\nCode: ${error.code || 'N/A'}`);
                  }
                }}
              >
                <Ionicons name="book" size={16} color="#FFF" />
                <Text style={styles.diagnosticButtonText}>Tests Lecture</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.diagnosticButton, { backgroundColor: '#795548' }]}
                onPress={async () => {
                  console.log('🔍 DIAGNOSTIC - Simulation utilisateur externe...');
                  try {
                    // Simuler exactement ce que fait un autre utilisateur
                    const testCartId = sharedCartId || 'cart_1760547331158_y0io6q3tw'; // Utiliser l'ID actuel ou un ID connu
                    
                    console.log(`🔄 SIMULATION: Utilisateur externe cherche: ${testCartId}`);
                    
                    // Étape 1: Appel direct à loadSharedCart (comme dans SharedCartScreen)
                    console.log('📱 ÉTAPE 1: Appel loadSharedCart...');
                    const result = await sharedCartService.loadSharedCart(testCartId);
                    
                    if (result && result.length > 0) {
                      console.log('✅ SIMULATION RÉUSSIE:', result.length, 'articles trouvés');
                      Alert.alert(
                        '✅ Simulation Réussie', 
                        `L'utilisateur externe DEVRAIT pouvoir récupérer ce panier !\n\nID: ${testCartId}\nArticles: ${result.length}\n\nSi ça ne marche pas sur l'autre appareil, le problème est ailleurs.`
                      );
                    } else {
                      console.log('❌ SIMULATION ÉCHOUÉE: Aucun résultat');
                      
                      // Diagnostic plus poussé
                      console.log('🔍 DIAGNOSTIC APPROFONDI...');
                      
                      // Test direct Firebase
                      const directRef = ref(database, `shared_carts/${testCartId}`);
                      const directSnapshot = await get(directRef);
                      
                      if (directSnapshot.exists()) {
                        const directData = directSnapshot.val();
                        console.log('✅ Panier existe sur Firebase:', directData);
                        
                        // Vérifier l'expiration
                        const now = new Date();
                        const expiresAt = new Date(directData.expires_at);
                        const isExpired = now >= expiresAt;
                        
                        console.log(`⏰ Expiration: ${isExpired ? 'EXPIRÉ' : 'VALIDE'}`);
                        console.log(`   - Maintenant: ${now.toISOString()}`);
                        console.log(`   - Expire à: ${expiresAt.toISOString()}`);
                        
                        Alert.alert(
                          '⚠️ Panier Trouvé Mais Problème', 
                          `Le panier existe sur Firebase mais loadSharedCart échoue.\n\nExpiré: ${isExpired ? 'OUI' : 'NON'}\n\nVérifiez les logs pour plus de détails.`
                        );
                      } else {
                        console.log('❌ Panier n\'existe pas sur Firebase');
                        Alert.alert('❌ Panier Introuvable', `Le panier ${testCartId} n'existe pas sur Firebase.`);
                      }
                    }
                  } catch (error) {
                    console.error('❌ ERREUR SIMULATION:', error);
                    Alert.alert('❌ Erreur Simulation', `Erreur: ${error.message}`);
                  }
                }}
              >
                <Ionicons name="person" size={16} color="#FFF" />
                <Text style={styles.diagnosticButtonText}>Simulation User</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.diagnosticButton, { backgroundColor: '#FF5722' }]}
                onPress={async () => {
                  console.log('🔍 DIAGNOSTIC - Test règles Firebase...');
                  try {
                    // Test simple de lecture/écriture
                    const testRef = ref(database, 'rules_test');
                    
                    // Test écriture
                    console.log('✍️ Test écriture...');
                    await set(testRef, { 
                      timestamp: Date.now(),
                      test: 'rules_ok',
                      message: 'Les règles Firebase fonctionnent !'
                    });
                    console.log('✅ Écriture réussie');
                    
                    // Test lecture
                    console.log('📖 Test lecture...');
                    const snapshot = await get(testRef);
                    if (snapshot.exists()) {
                      const data = snapshot.val();
                      console.log('✅ Lecture réussie:', data);
                      
                      Alert.alert(
                        '✅ Règles Firebase OK', 
                        `✅ Écriture: OK\n✅ Lecture: OK\n\nTimestamp: ${data.timestamp}\nMessage: ${data.message}\n\nLes règles Firebase fonctionnent correctement !`
                      );
                    } else {
                      Alert.alert('❌ Lecture Échouée', 'Impossible de lire après écriture');
                    }
                  } catch (error) {
                    console.error('❌ ERREUR RÈGLES:', error);
                    Alert.alert(
                      '❌ Erreur Règles Firebase', 
                      `Erreur: ${error.message}\n\nCode: ${error.code || 'N/A'}\n\nVérifiez que les règles sont bien:\n{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`
                    );
                  }
                }}
              >
                <Ionicons name="shield" size={16} color="#FFF" />
                <Text style={styles.diagnosticButtonText}>Test Règles</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.diagnosticButton, { backgroundColor: '#FF9800' }]}
                onPress={() => {
                  console.log('🔍 DIAGNOSTIC - Affichage des logs...');
                  Alert.alert(
                    '📋 Logs de Diagnostic', 
                    `ID du panier: ${sharedCartId}\n\nVérifiez la console pour voir tous les logs détaillés.\n\nLes logs incluent:\n• Sauvegarde Firebase\n• Récupération Firebase\n• Vérification expiration\n• Structure des données`
                  );
                }}
              >
                <Ionicons name="list" size={16} color="#FFF" />
                <Text style={styles.diagnosticButtonText}>Voir Logs</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </Animatable.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  cartSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
  },
  summaryItem: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 5,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginTop: 10,
  },
  idSection: {
    marginBottom: 20,
  },
  idLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF9800',
    marginBottom: 10,
  },
  idTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  idText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  copyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyHint: {
    fontSize: 10,
    color: '#FF9800',
    fontFamily: 'Montserrat',
    marginLeft: 4,
    fontWeight: '500',
  },
  copyIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    marginTop: 10,
  },
  copyIdButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  instructionsSection: {
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  instructionTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  instructionIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  instructionIdText: {
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 4,
    marginRight: 4,
    textDecorationLine: 'underline',
  },
  diagnosticSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  diagnosticTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  diagnosticButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    marginBottom: 8,
  },
  diagnosticButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 6,
  },
});

export default ShareInstructionsModal; 