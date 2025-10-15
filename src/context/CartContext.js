import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [orderInProgress, setOrderInProgress] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);

  // Charger le panier depuis le stockage local
  useEffect(() => {
    loadCartFromStorage();
  }, []);

  // Protection contre le vidage accidentel du panier
  useEffect(() => {
    const handleBeforeRemove = () => {
      console.log('🛡️ Protection du panier - sauvegarde avant navigation');
      if (cartItems.length > 0) {
        saveCartToStorage();
      }
    };

    // Écouter les changements de navigation pour protéger le panier
    return () => {
      handleBeforeRemove();
    };
  }, [cartItems]);

  // Sauvegarder le panier dans le stockage local
  useEffect(() => {
    saveCartToStorage();
  }, [cartItems]);

  const loadCartFromStorage = async () => {
    try {
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        console.log('📦 Chargement du panier depuis le stockage:', parsedCart.length, 'articles');
        setCartItems(parsedCart);
      } else {
        console.log('📦 Aucun panier trouvé dans le stockage');
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement du panier:', error);
    }
  };

  const saveCartToStorage = async () => {
    try {
      if (cartItems.length > 0) {
        console.log('💾 Sauvegarde du panier:', cartItems.length, 'articles');
        await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du panier:', error);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    try {
      const existingCart = await AsyncStorage.getItem('cart');
      let cart = existingCart ? JSON.parse(existingCart) : [];
      
      // Créer un identifiant unique pour le produit avec ses compléments
      const productKey = product.complements?.length > 0 
        ? `${product.id}-${product.complements.map(c => c.id).join('-')}`
        : `${product.id}`;

      // Convertir le prix en nombre
      const productPrice = Number(product.price.toString().replace(/[^\d.-]/g, ''));
      
      // Calculer le prix des compléments
      const complementsPrice = product.complements?.reduce((sum, comp) => 
        sum + Number(comp.price || 0), 0) || 0;

      // Prix total pour une unité
      const unitPrice = productPrice + complementsPrice;
      
      const existingItem = cart.find(item => 
        item.productKey === productKey
      );

      if (existingItem) {
        // Mettre à jour l'item existant
        cart = cart.map(item => 
          item.productKey === productKey
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total: (item.quantity + quantity) * unitPrice
              }
            : item
        );
      } else {
        // Ajouter un nouvel item
        cart.push({
          ...product,
          productKey,
          quantity,
          unitPrice,
          total: quantity * unitPrice
        });
      }

      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      setCartItems(cart);
      Toast.show({
        type: 'success',
        text1: 'Panier mis à jour',
        text2: 'Le produit a été ajouté à votre panier',
        position: 'bottom',
      });
      return true;
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'ajouter au panier',
        position: 'bottom',
      });
      return false;
    }
  };

  const removeFromCart = async (productKey) => {
    try {
      const updatedCart = cartItems.filter(item => item.productKey !== productKey);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
      setCartItems(updatedCart);
      Toast.show({
        type: 'success',
        text1: 'Produit retiré',
        text2: 'Le produit a été retiré du panier',
        position: 'bottom',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de retirer le produit',
        position: 'bottom',
      });
    }
  };

  const updateQuantity = async (productKey, newQuantity) => {
    try {
      if (newQuantity <= 0) {
        await removeFromCart(productKey);
        return;
      }

      const updatedCart = cartItems.map(item =>
        item.productKey === productKey
          ? {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.unitPrice
            }
          : item
      );

      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
      setCartItems(updatedCart);
      Toast.show({
        type: 'success',
        text1: 'Quantité mise à jour',
        text2: 'La quantité a été modifiée',
        position: 'bottom',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de mettre à jour la quantité',
        position: 'bottom',
      });
    }
  };

  const clearCart = async () => {
    try {
      console.log('🧹 clearCart appelé - suppression du panier');
      console.log('📦 Panier avant suppression:', cartItems.length, 'articles');
      await AsyncStorage.removeItem('cart');
      setCartItems([]);
      console.log('✅ Panier vidé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du panier:', error);
    }
  };

  const calculateCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const startOrder = (orderDetails) => {
    setOrderInProgress(true);
    setPendingOrder(orderDetails);
  };

  const completeOrder = () => {
    console.log('✅ completeOrder appelé - finalisation de la commande');
    setOrderInProgress(false);
    setPendingOrder(null);
    clearCart();
  };

  const cancelOrder = () => {
    console.log('❌ cancelOrder appelé - annulation de la commande');
    setOrderInProgress(false);
    setPendingOrder(null);
  };

  const reloadCartFromStorage = async () => {
    console.log('🔄 Rechargement forcé du panier depuis le stockage');
    await loadCartFromStorage();
  };

  const value = {
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    calculateCartTotal,
    orderInProgress,
    pendingOrder,
    startOrder,
    completeOrder,
    cancelOrder,
    reloadCartFromStorage
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext; 