import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView, Platform, StatusBar, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import useCartSharing from '../hooks/useCartSharing';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const { width, height } = Dimensions.get('window');

const CartScreen = ({ navigation, route }) => {
  const { cartItems, setCartItems, removeFromCart, updateQuantity, calculateCartTotal } = useCart();
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Utiliser le hook de partage de panier
  const { isSharing, shareCart, loadSharedCart } = useCartSharing(cartItems, setCartItems, formatPrice);

  useEffect(() => {
    loadCartItems();
    const unsubscribe = navigation.addListener('focus', () => {
      loadCartItems();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const total = calculateCartTotal();
    setTotalAmount(total);
  }, [cartItems]);

  // Vérifier si nous avons reçu un panier partagé
  useEffect(() => {
    if (route.params?.sharedCartId) {
      loadSharedCart(route.params.sharedCartId);
    }
  }, [route.params?.sharedCartId]);

  const loadCartItems = async () => {
    try {
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        const transformedCart = parsedCart.map(item => ({
          ...item,
          imageUrl: item.imageUrl || (item.cover 
            ? `https://www.api-mayombe.mayombe-app.com/public/storage/${item.cover}`
            : null),
          image: item.image || require('../../assets/images/2.jpg')
        }));
        setCartItems(transformedCart);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error);
    }
  };

  const updateItemQuantity = async (itemId, change) => {
    const item = cartItems.find(i => i.productKey === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity > 0) {
        await updateQuantity(itemId, newQuantity);
      }
    }
  };

  const removeItem = async (itemId) => {
    const updatedCart = cartItems.filter(item => item.productKey !== itemId);
    setCartItems(updatedCart);
    await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const formatPrice = (price) => {
    const numPrice = Number(price);
    return isNaN(numPrice) ? 0 : numPrice;
  };

  const createOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Erreur", "Votre panier est vide");
      return;
    }

    setIsSubmitting(true);

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert(
          "Connexion requise",
          "Vous devez être connecté pour passer une commande",
          [
            { text: "Annuler", style: "cancel" },
            { 
              text: "Se connecter", 
              onPress: () => navigation.navigate('Login', { returnToCart: true })
            }
          ]
        );
        setIsSubmitting(false);
        return;
      }

      // Formatage et validation des articles
      const formattedItems = cartItems.map(item => {
        // S'assurer que l'ID est un nombre
        const itemId = parseInt(item.id);
        if (isNaN(itemId)) {
          throw new Error(`ID invalide pour l'article: ${item.name}`);
        }

        // S'assurer que le prix est un nombre
        const price = formatPrice(item.unitPrice);
        if (isNaN(price)) {
          throw new Error(`Prix invalide pour l'article: ${item.name}`);
        }

        return {
          item_type: item.type === 'menu' ? "menu" : "product",
          menu_id: item.type === 'menu' ? itemId : null,
          product_id: item.type !== 'menu' ? itemId : null,
          quantity: parseInt(item.quantity),
          price_at_order: price
        };
      });

      const requestBody = {
        items: formattedItems,
        total_amount: formatPrice(totalAmount),
        delivery_fee: 1000
      };

      console.log("Données de la commande:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${API_BASE_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Réponse du serveur:", responseText);
        throw new Error("Format de réponse invalide");
      }

      if (!response.ok) {
        console.error("Erreur serveur:", {
          status: response.status,
          data: data
        });
        
        if (response.status === 401) {
          Alert.alert(
            "Session expirée",
            "Votre session a expiré. Veuillez vous reconnecter.",
            [
              { 
                text: "Se reconnecter", 
                onPress: () => navigation.navigate('Login', { returnToCart: true })
              }
            ]
          );
          return;
        }

        throw new Error(data?.message || `Erreur du serveur (${response.status})`);
      }

      const orderId = data.order_id || data.id;
      if (!orderId) {
        throw new Error("ID de commande manquant dans la réponse");
      }

      // Sauvegarder les détails avant de vider le panier
      const orderDetails = {
        items: [...cartItems],
        subtotal: totalAmount,
        deliveryFee: 1000,
        total: totalAmount + 1000,
        orderId: orderId
      };

      // Vider complètement le panier
      await AsyncStorage.removeItem('cart');
      setCartItems([]);

      navigation.navigate('PaymentScreen', { 
        orderDetails,
        onPaymentSuccess: async () => {
          try {
            await AsyncStorage.removeItem('cart');
            setCartItems([]);
          } catch (error) {
            console.error("Erreur lors du nettoyage du panier:", error);
          }
        }
      });

    } catch (error) {
      console.error("Erreur détaillée:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de la création de la commande. Veuillez vérifier vos articles et réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Image 
        source={
          item.imageUrl 
            ? { uri: item.imageUrl }
            : item.image 
              ? item.image 
              : require('../../assets/images/2.jpg')
        }
        style={styles.itemImage}
        defaultSource={require('../../assets/images/2.jpg')}
      />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name}</Text>
        
        {item.complements && item.complements.length > 0 ? (
          <View style={styles.complementsList}>
            <Text style={styles.complementsTitle}>Compléments :</Text>
            {item.complements.map((complement) => (
              <View 
                key={`${item.productKey}-${complement.id || complement.name.replace(/\s+/g, '')}`} 
                style={styles.complementRow}
              >
                <Text style={styles.complementText}>- {complement.name}</Text>
                <Text style={styles.complementPrice}>
                  +{formatPrice(complement.price)} FCFA
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.priceContainer}>
          <Text style={styles.itemPrice}>
            Prix unitaire: {formatPrice(item.unitPrice)} FCFA
          </Text>
          
          <Text style={styles.itemTotalPrice}>
            Total: {formatPrice(item.total)} FCFA
          </Text>
        </View>

        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => updateItemQuantity(item.productKey, -1)}
          >
            <Ionicons name="remove" size={20} color="#51A905" />
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => updateItemQuantity(item.productKey, 1)}
          >
            <Ionicons name="add" size={20} color="#51A905" />
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeItem(item.productKey)}
      >
        <Text style={styles.removeText}>{t.cart.remove}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{t.cart.title}</Text>
            <Text style={styles.subtitle}>
              {cartItems.length} {cartItems.length > 1 ? 'articles' : 'article'}
            </Text>
          </View>
        </View>

        {cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t.cart.empty}</Text>
          </View>
        ) : (
          <View style={styles.mainContainer}>
            <FlatList
              data={cartItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.productKey}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={() => (
                <>
                  <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Récapitulatif</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Sous-total</Text>
                      <Text style={styles.priceValue}>{formatPrice(totalAmount)} FCFA</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Frais de livraison</Text>
                      <Text style={styles.priceValue}>1000 FCFA</Text>
                    </View>
                    <View style={[styles.priceRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>{formatPrice(totalAmount + 1000)} FCFA</Text>
                    </View>
                  </View>

                  <View style={styles.footer}>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        style={[
                          styles.checkoutButton,
                          isSubmitting && styles.disabledButton
                        ]}
                        onPress={createOrder}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.checkoutButtonText}>Choisir le mode de paiement</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[
                          styles.shareButton,
                          isSharing && styles.disabledButton
                        ]}
                        onPress={shareCart}
                        disabled={isSharing}
                      >
                        {isSharing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="share-social" size={20} color="#fff" style={styles.buttonIcon} />
                            <Text style={styles.shareButtonText}>Partager le panier</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: width * 0.05,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: '#333',
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: "Montserrat",
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 150,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: width * 0.9,
  },
  itemImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    fontFamily: "Montserrat-Bold",
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    fontFamily: "Montserrat-Regular",
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  quantity: {
    marginHorizontal: 15,
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  removeButton: {
    padding: 8,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    elevation: 10,
    zIndex: 1000,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  shareButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  buttonIcon: {
    marginRight: 8,
  },
  checkoutButton: {
    backgroundColor: '#51A905',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    width: '100%',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontFamily: "Montserrat-Regular",
  },
  complementsList: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 8,
  },
  complementsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Montserrat-SemiBold',
  },
  complementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  complementText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
  },
  complementPrice: {
    fontSize: 13,
    color: '#51A905',
    fontFamily: 'Montserrat-Medium',
  },
  itemTotalPrice: {
    fontSize: 16,
    color: '#51A905',
    fontWeight: 'bold',
    marginTop: 4,
    fontFamily: 'Montserrat-Bold',
  },
  priceContainer: {
    marginVertical: 8,
  },
  removeText: {
    color: '#FF0000',
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
    opacity: 0.7,
  },
  mainContainer: {
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
  },
});

export default CartScreen; 