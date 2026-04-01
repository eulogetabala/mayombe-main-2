import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { applyMarkup, getMarkupPercentageFromProduct } from '../Utils/priceUtils';

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
        const storedCart = await AsyncStorage.getItem('cart');
        
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart);
          if (parsedCart.length > 0) {
            setCartItems(parsedCart);
          }
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du panier:', error);
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
      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du panier:', error);
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

      // Vérifier si le prix unitaire est déjà calculé (venant de RestaurantProductModal)
      let unitPrice;
      
      const markupPct = getMarkupPercentageFromProduct(product);

      if (product.unitPrice) {
        // Le prix est déjà majoré, on l'utilise directement
        unitPrice = product.unitPrice;
      } else {
        // Fallback: calculer le prix avec majoration (pour compatibilité avec d'autres écrans)
        let basePriceToUse;

        const hasPromo = product.hasPromo || (product.promo && product.promo.promoPrice);
        const promoPrice = product.promoPrice || (product.promo && product.promo.promoPrice);

        if (hasPromo && promoPrice) {
          basePriceToUse = promoPrice;
        } else if (product.rawPrice !== undefined && product.rawPrice !== null) {
          basePriceToUse = product.rawPrice;
        } else if (product.originalPrice !== undefined && product.originalPrice !== null) {
          basePriceToUse = product.originalPrice;
        } else {
          const extractedPrice = Number(product.price.toString().replace(/[^\d.-]/g, ''));
          const divisor = 1 + markupPct / 100;
          const assumedBasePrice = extractedPrice / divisor;
          if (assumedBasePrice > 0 && assumedBasePrice < extractedPrice) {
            basePriceToUse = Math.round(assumedBasePrice);
          } else {
            basePriceToUse = extractedPrice;
          }
        }
        const basePrice = Number(basePriceToUse.toString().replace(/[^\d.-]/g, ''));
        const productPrice = applyMarkup(basePrice, markupPct);

        const complementsPrice = product.complements?.reduce((sum, comp) =>
          sum + applyMarkup(Number(comp.price || 0), markupPct), 0) || 0;

        unitPrice = productPrice + complementsPrice;
      }
      
      const existingItem = cart.find(item => 
        item.productKey === productKey
      );

      if (existingItem) {
        cart = cart.map(item =>
          item.productKey === productKey
            ? {
                ...item,
                quantity: item.quantity + quantity,
                unitPrice,
                total: (item.quantity + quantity) * unitPrice,
                markupPercentage: product.markupPercentage ?? item.markupPercentage ?? markupPct,
                hasPromo: product.hasPromo !== undefined ? product.hasPromo : item.hasPromo,
                promoPrice: product.promoPrice || item.promoPrice,
                originalPrice: product.originalPrice || product.price || item.originalPrice,
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
          total: quantity * unitPrice,
          markupPercentage: product.markupPercentage ?? getMarkupPercentageFromProduct(product),
          hasPromo: product.hasPromo || false,
          promoPrice: product.promoPrice || null,
          originalPrice: product.originalPrice || product.price,
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
      setCartItems([]);
      await AsyncStorage.removeItem('cart');
    } catch (error) {
      console.error('Erreur lors de la suppression du panier:', error);
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