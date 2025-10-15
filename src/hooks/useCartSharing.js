import { useState } from 'react';
import { Share, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import sharedCartService from '../services/sharedCartService';

// Fonction pour générer un ID unique
const generateUniqueId = () => {
  return 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Fonction par défaut pour formater les prix
const defaultFormatPrice = (price) => {
  if (typeof price === 'number') {
    return price.toFixed(2);
  }
  return price || '0.00';
};

/**
 * Hook personnalisé pour gérer le partage de panier
 * @param {Array} cartItems - Les articles du panier
 * @param {Function} setCartItems - Fonction pour mettre à jour les articles du panier
 * @param {Function} formatPrice - Fonction pour formater les prix (optionnelle)
 * @returns {Object} - Fonctions et états pour le partage de panier
 */
const useCartSharing = (cartItems, setCartItems, formatPrice = defaultFormatPrice) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour charger un panier partagé
  const loadSharedCart = async (sharedCartId) => {
    try {
      setIsLoading(true);
      console.log(`Tentative de chargement du panier partagé: ${sharedCartId}`);
      
      // Récupérer le panier partagé (Firebase en priorité, puis local)
      const sharedCart = await sharedCartService.loadSharedCart(sharedCartId);
      
      if (sharedCart && sharedCart.length > 0) {
        console.log("Données du panier partagé reçues:", JSON.stringify(sharedCart, null, 2));
        
        // Transformer les données du panier partagé si nécessaire
        const transformedCart = sharedCart.map(item => ({
          ...item,
          productKey: item.id ? item.id.toString() : Math.random().toString(),
          imageUrl: item.imageUrl || (item.cover 
            ? `https://www.api-mayombe.mayombe-app.com/public/storage/${item.cover}`
            : null),
          image: item.image || require('../../assets/images/2.jpg')
        }));
        
        // Sauvegarder le panier partagé dans le panier actuel
        await AsyncStorage.setItem('cart', JSON.stringify(transformedCart));
        setCartItems(transformedCart);
        
        Alert.alert(
          "Panier partagé chargé",
          "Le panier partagé a été chargé avec succès."
        );
      } else {
        Alert.alert(
          "Panier non trouvé",
          "Aucun panier trouvé avec cet ID."
        );
      }
    } catch (error) {
      console.error("Erreur lors du chargement du panier partagé:", error);
      Alert.alert(
        "Erreur",
        "Impossible de charger le panier partagé. Veuillez réessayer plus tard."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour vérifier si un lien est accessible
  const checkLinkAccessibility = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.log('Lien non accessible:', url);
      return false;
    }
  };

  // Fonction pour partager le panier
  const shareCart = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Erreur", "Votre panier est vide");
      return;
    }

    setIsSharing(true);

    try {
      // Générer un ID unique pour le panier partagé
      const sharedCartId = generateUniqueId();
      console.log(`ID du panier partagé généré: ${sharedCartId}`);
      
      // Préparer les données du panier pour le stockage
      const cartData = cartItems.map(item => {
        const isMenu = item.type === 'menu';
        return {
          id: item.id,
          type: isMenu ? 'menu' : 'product',
          menu_id: isMenu ? item.id : null,
          product_id: !isMenu ? item.id : null,
          quantity: item.quantity,
          price_at_order: formatPrice(item.unitPrice),
          name: item.name,
          unitPrice: item.unitPrice,
          total: item.total,
          imageUrl: item.imageUrl,
          cover: item.cover,
          complements: item.complements || []
        };
      });

      console.log("Données du panier à partager:", JSON.stringify(cartData, null, 2));

      // Sauvegarder le panier partagé (local + Firebase)
      await sharedCartService.saveToLocalStorage(sharedCartId, cartData);
      await sharedCartService.saveSharedCart(sharedCartId, cartData, 24); // Expire dans 24h
      
      // Message simple avec ID du panier
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const shareMessage = `🛒 Panier Mayombe à payer

💰 Total: ${totalAmount.toLocaleString()} FCFA
🆔 ID: ${sharedCartId}

📱 Téléchargez l'app Mayombe → Panier partagé → Entrez l'ID → Payer`;

      // Partager via les applications disponibles
      await Share.share({
        message: shareMessage,
        title: 'Panier Mayombe'
      });
      
      Alert.alert(
        "Partage réussi",
        "Votre panier a été partagé avec succès. L'ID du panier a été inclus dans le message pour faciliter le partage."
      );
    } catch (error) {
      console.error("Erreur lors du partage du panier:", error);
      Alert.alert(
        "Erreur",
        "Impossible de partager le panier. Veuillez réessayer plus tard."
      );
    } finally {
      setIsSharing(false);
    }
  };

  return {
    isSharing,
    isLoading,
    shareCart,
    loadSharedCart
  };
};

export default useCartSharing; 