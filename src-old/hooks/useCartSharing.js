import { useState } from 'react';
import { Share, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanupAllOldCarts } from '../utils/cartCleanup';

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
  // Vérifier que setCartItems est disponible
  if (!setCartItems) {
    console.warn('useCartSharing: setCartItems n\'est pas disponible');
  }
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour charger un panier partagé
  const loadSharedCart = async (sharedCartId) => {
    try {
      setIsLoading(true);
      
      // Récupérer le panier partagé depuis le stockage local
      const sharedCartJson = await AsyncStorage.getItem(`shared_cart_${sharedCartId}`);
      
      if (sharedCartJson) {
        const sharedCartData = JSON.parse(sharedCartJson);
        
        // Vérifier si le panier a expiré
        if (sharedCartData.expiresAt && sharedCartData.expiresAt < Date.now()) {
          Alert.alert(
            "Panier expiré",
            "Ce panier partagé a expiré. Les paniers partagés sont valides pendant 7 jours."
          );
          return;
        }
        
        // Récupérer les articles du panier (nouvelle structure)
        const sharedCart = sharedCartData.items || sharedCartData; // Support de l'ancienne structure
        
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
          if (setCartItems) {
            setCartItems(transformedCart);
          }
          
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
          "Panier non trouvé",
          "Aucun panier trouvé avec ce code. Vérifiez que le code est correct et réessayez."
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
    if (!cartItems || cartItems.length === 0) {
      Alert.alert("Erreur", "Votre panier est vide");
      return;
    }

    setIsSharing(true);

    try {
      // Générer un ID unique pour le panier partagé
      const sharedCartId = generateUniqueId();
      
      // Préparer les données du panier pour le stockage
      const cartData = {
        items: cartItems.map(item => {
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
        }),
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 jours
      };

      // Nettoyer les anciens paniers avant de sauvegarder le nouveau
      await cleanupAllOldCarts();

      // Sauvegarder le panier partagé dans le stockage local
      await AsyncStorage.setItem(`shared_cart_${sharedCartId}`, JSON.stringify(cartData));
      
      // Créer les liens de partage avec fallback
      const shareUrl = `mayombe://cart/${sharedCartId}`;
      const primaryWebUrl = `https://www.mayombe-app.com/shared-cart/${sharedCartId}`;
      const fallbackWebUrl = `https://mayombe-app.com/shared-cart/${sharedCartId}`;
      const alternativeUrl = `https://www.mayombe-app.com/cart-share/${sharedCartId}`;
      const webPaymentUrl = `https://mayombe-payment.web.app/cart/${sharedCartId}`; // Page web de paiement
      
      // Vérifier l'accessibilité des liens
      const isPrimaryAccessible = await checkLinkAccessibility(primaryWebUrl);
      const isFallbackAccessible = await checkLinkAccessibility(fallbackWebUrl);
      const isAlternativeAccessible = await checkLinkAccessibility(alternativeUrl);
      const isWebPaymentAccessible = await checkLinkAccessibility(webPaymentUrl);
      
      // Choisir le meilleur lien disponible
      let finalWebUrl = primaryWebUrl;
      if (!isPrimaryAccessible) {
        if (isWebPaymentAccessible) {
          finalWebUrl = webPaymentUrl; // Priorité à la page web de paiement
        } else if (isFallbackAccessible) {
          finalWebUrl = fallbackWebUrl;
        } else if (isAlternativeAccessible) {
          finalWebUrl = alternativeUrl;
        } else {
          // Si aucun lien web n'est accessible, utiliser un lien de téléchargement direct
          finalWebUrl = `https://play.google.com/store/apps/details?id=com.mayombe.app`;
        }
      }
      
      // Créer le message de partage avec instructions
      const cartSummary = cartItems.map(item => `• ${item.name} (${item.quantity}x)`).join('\n');
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
      
      const message = `🛒 Mon panier Mayombe

${cartSummary}

💰 Total: ${totalAmount.toLocaleString()} FCFA

🆔 ID du panier: ${sharedCartId}

#Mayombe #Livraison #Congo`;

      // Partager via les applications disponibles
      await Share.share({
        message: message,
        url: finalWebUrl,
        title: 'Partager mon panier Mayombe'
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