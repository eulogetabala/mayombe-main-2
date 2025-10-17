import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [orderInProgress, setOrderInProgress] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger le panier depuis le stockage local au démarrage
  useEffect(() => {
    const initializeCart = async () => {
      try {
        console.log('🔄 CartContext - Initialisation du panier...');
        const storedCart = await AsyncStorage.getItem('cart');
        console.log('📦 CartContext - Panier stocké:', storedCart);
        
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart);
          console.log('📦 CartContext - Panier parsé:', parsedCart);
          if (parsedCart.length > 0) {
            setCartItems(parsedCart);
            console.log('✅ CartContext - Panier chargé avec', parsedCart.length, 'articles');
          } else {
            console.log('📦 CartContext - Panier vide dans le stockage');
          }
        } else {
          console.log('📦 CartContext - Aucun panier dans le stockage');
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du panier:', error);
        setIsInitialized(true);
      }
    };
    
    initializeCart();
  }, []);

  // Sauvegarder automatiquement le panier quand il change
  useEffect(() => {
    if (isInitialized) {
      saveCartToStorage();
    }
  }, [cartItems, isInitialized]);

  const saveCartToStorage = async () => {
    try {
      console.log('💾 CartContext - Sauvegarde du panier:', cartItems.length, 'articles');
      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      console.log('✅ CartContext - Panier sauvegardé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du panier:', error);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    try {
      // Utiliser l'état actuel du panier au lieu de recharger depuis AsyncStorage
      let cart = [...cartItems];
      
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
      console.log('🗑️ CartContext - Vidage du panier...');
      setCartItems([]);
      await AsyncStorage.removeItem('cart');
      console.log('✅ CartContext - Panier vidé avec succès');
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

  const completeOrder = (shouldClearCart = true) => {
    setOrderInProgress(false);
    setPendingOrder(null);
    if (shouldClearCart) {
      clearCart();
    }
  };

  const cancelOrder = () => {
    console.log('🚫 CartContext - Annulation de la commande, conservation du panier');
    setOrderInProgress(false);
    setPendingOrder(null);
    // Ne pas vider le panier lors de l'annulation - c'est le comportement souhaité
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
    cancelOrder
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext; 