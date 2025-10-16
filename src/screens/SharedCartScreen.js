import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';
import sharedCartService from '../services/sharedCartService';
import { ref, set, get } from 'firebase/database';
import { getDatabase } from 'firebase/database';

// Initialiser Firebase
const database = getDatabase();

const SharedCartScreen = () => {
  const navigation = useNavigation();
  const { setCartItems } = useCart();
  const [cartId, setCartId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sharedCart, setSharedCart] = useState(null);
  const [cartLoaded, setCartLoaded] = useState(false);

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent && clipboardContent.trim()) {
        setCartId(clipboardContent.trim());
        Alert.alert('Collé', 'L\'ID du panier a été collé depuis le presse-papiers.');
      } else {
        Alert.alert('Presse-papiers vide', 'Aucun contenu trouvé dans le presse-papiers.');
      }
    } catch (error) {
      console.error('Erreur lors du collage:', error);
      Alert.alert('Erreur', 'Impossible de coller depuis le presse-papiers.');
    }
  };

  const handleLoadSharedCart = async () => {
    if (!cartId.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un ID de panier');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🔍 TENTATIVE CHARGEMENT PANIER: ${cartId.trim()}`);
      
      // Récupérer le panier partagé (Firebase en priorité, puis local)
      const cartData = await sharedCartService.loadSharedCart(cartId.trim());
      
      console.log(`📊 RÉSULTAT CHARGEMENT:`, cartData ? `${cartData.length} articles` : 'null');
        
        if (cartData && cartData.length > 0) {
          // Transformer les données du panier partagé
          const transformedCart = cartData.map(item => ({
            ...item,
            productKey: item.id ? item.id.toString() : Math.random().toString(),
            imageUrl: item.imageUrl || (item.cover 
              ? `https://www.api-mayombe.mayombe-app.com/public/storage/${item.cover}`
              : null),
            image: item.image || require('../../assets/images/2.jpg')
          }));
          
          setSharedCart(transformedCart);
          setCartLoaded(true);
          
          Alert.alert(
            'Panier trouvé',
            'Le panier partagé a été trouvé. Que souhaitez-vous faire ?',
            [
              {
                text: 'Annuler',
                style: 'cancel'
              },
              {
                text: 'Voir le panier',
                onPress: () => {
                  // Juste afficher l'aperçu, ne pas charger dans le panier actuel
                }
              },
              {
                text: 'Payer maintenant',
                onPress: () => {
                  setCartItems(transformedCart);
                  Alert.alert(
                    'Panier chargé',
                    'Le panier a été chargé. Vous allez être redirigé vers la page de paiement.',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          navigation.navigate('CartTab', { screen: 'CartMain' });
                        }
                      }
                    ]
                  );
                }
              }
            ]
          );
        } else {
          console.log(`❌ PANIER NON TROUVÉ`);
          Alert.alert('Panier non trouvé', 'Aucun panier trouvé avec cet ID.');
        }
    } catch (error) {
      console.error('Erreur lors du chargement du panier partagé:', error);
      Alert.alert('Erreur', 'Impossible de charger le panier partagé');
    } finally {
      setIsLoading(false);
    }
  };

  // Détecter automatiquement les IDs de panier dans le presse-papiers
  React.useEffect(() => {
    const checkClipboardForCartId = async () => {
      try {
        const clipboardContent = await Clipboard.getString();
        if (clipboardContent && clipboardContent.trim()) {
          // Vérifier si le contenu ressemble à un ID de panier
          const cartIdPattern = /cart_\d+_[a-zA-Z0-9]+/;
          const match = clipboardContent.trim().match(cartIdPattern);
          if (match) {
            setCartId(match[0]);
            Alert.alert(
              'ID détecté',
              `Un ID de panier a été détecté dans le presse-papiers: ${match[0]}\n\nVoulez-vous le charger ?`,
              [
                {
                  text: 'Non',
                  style: 'cancel'
                },
                {
                  text: 'Oui',
                  onPress: () => handleLoadSharedCart()
                }
              ]
            );
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du presse-papiers:', error);
      }
    };

    checkClipboardForCartId();
  }, []);

  const handlePayNow = () => {
    if (!sharedCart) {
      Alert.alert('Erreur', 'Aucun panier à payer');
      return;
    }

    setCartItems(sharedCart);
    Alert.alert(
      'Paiement',
      'Le panier partagé a été chargé. Vous allez être redirigé vers la page de paiement.',
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('CartTab', { screen: 'CartMain' });
          }
        }
      ]
    );
  };

  const handleAddToMyCart = () => {
    if (!sharedCart) {
      Alert.alert('Erreur', 'Aucun panier à ajouter');
      return;
    }

    // Récupérer le panier actuel
    AsyncStorage.getItem('cart').then(storedCart => {
      let currentCart = [];
      if (storedCart) {
        currentCart = JSON.parse(storedCart);
      }

      // Fusionner avec le panier partagé
      const mergedCart = [...currentCart, ...sharedCart];
      
      setCartItems(mergedCart);
      AsyncStorage.setItem('cart', JSON.stringify(mergedCart));
      
      Alert.alert(
        'Succès',
        'Le panier partagé a été ajouté à votre panier actuel.',
        [
          {
            text: 'Voir mon panier',
            onPress: () => navigation.navigate('CartTab', { screen: 'CartMain' })
          },
          {
            text: 'Continuer',
            style: 'cancel'
          }
        ]
      );
    });
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImage}>
        <Ionicons name="restaurant" size={24} color="#FF9800" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemQuantity}>Quantité: {item.quantity}</Text>
        <Text style={styles.itemPrice}>{item.total?.toLocaleString()} FCFA</Text>
      </View>
    </View>
  );

  const totalAmount = sharedCart ? sharedCart.reduce((sum, item) => sum + (item.total || 0), 0) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Panier partagé</Text>
          <Text style={styles.headerSubtitle}>Entrez l'ID du panier à charger</Text>
        </View>
      </Animatable.View>

      <ScrollView style={styles.content}>
        <Animatable.View animation="fadeInUp" delay={200} style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <Ionicons name="key" size={20} color="#FF9800" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Entrez l'ID du panier partagé"
              value={cartId}
              onChangeText={setCartId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {
                Clipboard.setString(cartId);
                Alert.alert('Copié', 'L\'ID du panier a été copié dans le presse-papiers.');
              }}
            >
              <Ionicons name="copy" size={20} color="#FF9800" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.pasteButton}
              onPress={handlePasteFromClipboard}
            >
              <Ionicons name="clipboard" size={20} color="#FF9800" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.loadButton, isLoading && styles.loadButtonDisabled]}
            onPress={handleLoadSharedCart}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="#FFF" />
                <Text style={styles.loadButtonText}>Charger le panier</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Bouton de diagnostic temporaire */}
          <TouchableOpacity
            style={[styles.loadButton, { backgroundColor: '#FF6B6B', marginTop: 10 }]}
            onPress={async () => {
              console.log('🔍 DIAGNOSTIC FIREBASE...');
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
                  Alert.alert('Diagnostic', `Firebase connecté. ${Object.keys(carts).length} panier(s) trouvé(s).`);
                } else {
                  console.log('❌ AUCUN PANIER');
                  Alert.alert('Diagnostic', 'Firebase connecté mais aucun panier trouvé.');
                }
              } catch (error) {
                console.error('❌ ERREUR FIREBASE:', error);
                Alert.alert('Erreur Firebase', error.message);
              }
            }}
          >
            <Ionicons name="bug" size={20} color="#FFF" />
            <Text style={styles.loadButtonText}>🔍 Diagnostic Firebase</Text>
          </TouchableOpacity>
        </Animatable.View>

        {sharedCart && (
          <Animatable.View animation="fadeInUp" delay={400} style={styles.cartPreview}>
            <Text style={styles.previewTitle}>Aperçu du panier :</Text>
            <FlatList
              data={sharedCart}
              renderItem={renderCartItem}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
            />
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total :</Text>
              <Text style={styles.totalAmount}>
                {totalAmount.toLocaleString()} FCFA
              </Text>
            </View>

            {cartLoaded && (
              <Animatable.View animation="fadeInUp" delay={600} style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={handlePayNow}
                >
                  <Ionicons name="card" size={20} color="#FFF" />
                  <Text style={styles.payButtonText}>Payer maintenant</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.addToCartButton}
                  onPress={handleAddToMyCart}
                >
                  <Ionicons name="add-circle" size={20} color="#FF9800" />
                  <Text style={styles.addToCartButtonText}>Ajouter à mon panier</Text>
                </TouchableOpacity>
              </Animatable.View>
            )}
          </Animatable.View>
        )}

        <Animatable.View animation="fadeInUp" delay={600} style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>Comment ça marche ?</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="help-circle" size={16} color="#FF9800" />
            <Text style={styles.instructionText}>Demandez l'ID du panier à la personne qui l'a partagé</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="key" size={16} color="#FF9800" />
            <Text style={styles.instructionText}>Entrez l'ID dans le champ ci-dessus</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="search" size={16} color="#FF9800" />
            <Text style={styles.instructionText}>Cliquez sur "Charger le panier"</Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="card" size={16} color="#FF9800" />
            <Text style={styles.instructionText}>Choisissez de payer directement ou d'ajouter à votre panier</Text>
          </View>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Montserrat',
    color: '#333',
    paddingVertical: 15,
  },
  copyButton: {
    padding: 8,
    marginLeft: 10,
  },
  pasteButton: {
    padding: 8,
    marginLeft: 10,
  },
  loadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  cartPreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 10,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
  actionButtons: {
    gap: 12,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#51A905',
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  addToCartButtonText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  instructionsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
});

export default SharedCartScreen; 