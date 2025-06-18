import { useState } from 'react';
import { Share, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      
      // Récupérer le panier partagé depuis le stockage local
      const sharedCartJson = await AsyncStorage.getItem(`shared_cart_${sharedCartId}`);
      
      if (sharedCartJson) {
        const sharedCart = JSON.parse(sharedCartJson);
        console.log("Données du panier partagé reçues:", JSON.stringify(sharedCart, null, 2));
        
        if (sharedCart && sharedCart.length > 0) {
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
            "Erreur",
            "Le panier partagé est vide ou n'existe pas."
          );
        }
      } else {
        Alert.alert(
          "Erreur",
          "Impossible de trouver le panier partagé."
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

      // Sauvegarder le panier partagé dans le stockage local
      await AsyncStorage.setItem(`shared_cart_${sharedCartId}`, JSON.stringify(cartData));
      
      // Créer le lien de partage
      const shareUrl = `mayombe://cart/${sharedCartId}`;
      const webShareUrl = `https://www.mayombe-app.com/shared-cart/${sharedCartId}`;
      
      // Message à partager
      const message = `Voici mon panier Mayombe ! Cliquez sur le lien pour le voir et continuer le processus de paiement : ${webShareUrl}`;
      
      // Partager via WhatsApp ou autres applications
      await Share.share({
        message: message,
        url: webShareUrl,
        title: 'Partager mon panier Mayombe'
      });
      
      Alert.alert(
        "Partage réussi",
        "Votre panier a été partagé avec succès."
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