import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const CartScreen = ({ navigation }) => {
  const { cartItems, setCartItems, removeFromCart, updateQuantity, calculateCartTotal } = useCart();
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Nouvelle fonction pour créer une commande via l'API
  const createOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Erreur", "Votre panier est vide");
      return;
    }

    setIsSubmitting(true);

    try {
      // Récupérer le token d'authentification
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
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

      // Formater les données selon le format requis par l'API
      const items = cartItems.map(item => {
        // Déterminer si c'est un menu ou un produit
        const isMenu = item.type === 'menu';
        
        return {
          item_type: isMenu ? "menu" : "product",
          menu_id: isMenu ? item.id : null,
          product_id: !isMenu ? item.id : null,
          quantity: item.quantity,
          price_at_order: formatPrice(item.unitPrice)
        };
      });

      // Préparer le corps de la requête
      const requestBody = {
        items: items
      };

      console.log("Envoi de la commande:", JSON.stringify(requestBody));

      // Appel à l'API avec le token d'authentification
      const response = await fetch(`${API_BASE_URL}/create-order`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Commande créée avec succès:", data);
        
        // Vider le panier après une commande réussie
        await AsyncStorage.removeItem('cart');
        setCartItems([]);
        
        // Naviguer vers l'écran de commande avec les détails
        navigation.navigate('Order', { 
          cartItems, 
          totalAmount,
          orderId: data.order_id || data.id
        });
      } else {
        if (response.status === 401) {
          // Token expiré ou invalide
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
        } else {
          throw new Error(data.message || "Erreur lors de la création de la commande");
        }
      }
    } catch (error) {
      console.error("Erreur de création de commande:", error);
      Alert.alert(
        "Erreur",
        "Impossible de créer la commande. Veuillez réessayer plus tard."
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
          <>
            <FlatList
              data={cartItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.productKey}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.footer}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>{t.cart.total}</Text>
                <Text style={styles.totalAmount}>
                  {formatPrice(totalAmount)} FCFA
                </Text>
              </View>
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
                  <Text style={styles.checkoutButtonText}>{t.cart.checkout}</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
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
  },
  itemImage: {
    width: 80,
    height: 80,
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
    paddingBottom: Platform.OS === 'ios' ? 25 : 85,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    zIndex: 1000,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    color: '#333',
    fontFamily: "Montserrat-Bold",
  },
  totalAmount: {
    fontSize: 20,
    color: '#51A905',
    fontFamily: "Montserrat-Bold",
  },
  checkoutButton: {
    backgroundColor: '#51A905',
    borderRadius: 25,
    padding: 15,
    
    alignItems: 'center',
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
});

export default CartScreen; 