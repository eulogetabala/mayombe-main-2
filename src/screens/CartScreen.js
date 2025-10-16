import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView, Platform, StatusBar, Alert, ActivityIndicator, Dimensions, RefreshControl, Clipboard, Share } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useAuth } from '../../contexts/AuthContext';
import useCartSharing from '../hooks/useCartSharing';
import { getDistanceToRestaurant, formatDistance, getCurrentLocation } from '../services/LocationService';
import CustomHeader from '../components/common/CustomHeader';
import ShareInstructionsModal from '../components/ShareInstructionsModal';
import FirebaseTrackingService from '../services/firebase';
import sharedCartService from '../services/sharedCartService';
import { CartSkeleton } from '../components/Skeletons';


const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const { width, height } = Dimensions.get('window');

const CartScreen = ({ navigation, route }) => {
  const { cartItems, setCartItems, removeFromCart, updateQuantity, calculateCartTotal, reloadCartFromStorage } = useCart();
  const { currentLanguage } = useLanguage();
  const { getCurrentUser } = useAuth();
  const t = translations[currentLanguage];
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(5); // Distance par défaut en km
  const [deliveryFee, setDeliveryFee] = useState(1000); // Frais par défaut
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentSharedCartId, setCurrentSharedCartId] = useState(null);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  
  // Utiliser le hook de partage de panier
  const { isSharing, shareCart, loadSharedCart } = useCartSharing(cartItems, setCartItems, formatPrice);

  useEffect(() => {
    loadCartItems();
    const unsubscribe = navigation.addListener('focus', () => {
      loadCartItems();
    });
    return unsubscribe;
  }, []);

  // Recharger le panier depuis le stockage quand on revient sur l'écran
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Focus sur CartScreen - rechargement du panier');
      if (reloadCartFromStorage) {
        reloadCartFromStorage();
      }
    }, [])
  );

  useEffect(() => {
    const total = calculateCartTotal();
    setTotalAmount(total);
  }, [cartItems]);

  // Calculer les frais de livraison quand la distance change
  useEffect(() => {
    const calculatedFee = calculateDeliveryFee(deliveryDistance);
    setDeliveryFee(calculatedFee);
  }, [deliveryDistance]);

  // Obtenir la géolocalisation au chargement de l'écran
  useEffect(() => {
    const getLocationAndCalculateFee = async () => {
      if (cartItems.length === 0) return; // Pas besoin si panier vide
      
      setIsLoadingLocation(true);
      try {
        // Récupérer la position actuelle de l'utilisateur
        const userLocation = await getCurrentLocation();
        
        // Récupérer les coordonnées du restaurant depuis le premier article du panier
        const firstItem = cartItems[0];
        if (firstItem && firstItem.restaurant) {
          const restaurantLocation = {
            latitude: parseFloat(firstItem.restaurant.altitude || firstItem.restaurant.latitude),
            longitude: parseFloat(firstItem.restaurant.longitude)
          };
          
          // Vérifier que les coordonnées sont valides
          if (!isNaN(restaurantLocation.latitude) && !isNaN(restaurantLocation.longitude)) {
            const distance = getDistanceToRestaurant(userLocation, restaurantLocation);
            setDeliveryDistance(distance);
            console.log('📍 Distance obtenue:', distance, 'km');
            console.log('📍 Position utilisateur:', userLocation);
            console.log('📍 Position restaurant:', restaurantLocation);
          } else {
            console.log('⚠️ Coordonnées du restaurant invalides');
            setDeliveryDistance(5); // Distance par défaut
          }
        } else {
          console.log('⚠️ Aucun restaurant trouvé dans le panier');
          setDeliveryDistance(5); // Distance par défaut
        }
      } catch (error) {
        console.log('⚠️ Erreur géolocalisation:', error.message);
        // Garder la distance par défaut (5km)
        Alert.alert(
          'Localisation non disponible',
          'Impossible d\'obtenir votre position. Les frais de livraison seront calculés avec une distance par défaut.',
          [{ text: 'OK' }]
        );
        setDeliveryDistance(5);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getLocationAndCalculateFee();
  }, [cartItems.length]); // Se déclenche quand le panier change

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

  // Fonction de rafraîchissement
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCartItems();
      console.log('🔄 Panier rafraîchi');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du panier:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

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

  // Fonction pour calculer les frais de livraison selon la distance
  const calculateDeliveryFee = (distance) => {
    if (!distance || isNaN(distance)) {
      return 1000; // Frais par défaut si pas de distance
    }
    
    const distanceNum = parseFloat(distance);
    
    if (distanceNum <= 10) {
      return 1000; // 0-10km : 1000 FCFA
    } else if (distanceNum <= 20) {
      return 1500; // 11-20km : 1500 FCFA
    } else {
      return 2000; // 21km+ : 2000 FCFA
    }
  };

  // Fonction pour obtenir la description des frais
  const getDeliveryFeeDescription = (distance) => {
    if (!distance || isNaN(distance)) {
      return "Frais de livraison (distance non disponible)";
    }
    
    const distanceNum = parseFloat(distance);
    
    if (distanceNum <= 10) {
      return `Frais de livraison (0-10km)`;
    } else if (distanceNum <= 20) {
      return `Frais de livraison (11-20km)`;
    } else {
      return `Frais de livraison (21km+)`;
    }
  };

  const createOrder = async () => {
    console.log('🛒 createOrder appelé - début de la fonction');
    console.log('📦 Nombre d\'articles dans le panier:', cartItems.length);
    
    if (cartItems.length === 0) {
      console.log('❌ Panier vide - arrêt de la fonction');
      Alert.alert("Erreur", "Votre panier est vide");
      return;
    }

    console.log('✅ Panier non vide - début du processus de commande');
    setIsSubmitting(true);

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const isGuest = await AsyncStorage.getItem('isGuest');
      
      if (!userToken && !isGuest) {
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

      if (isGuest) {
        Alert.alert(
          "Connexion requise",
          "Pour passer une commande, vous devez créer un compte ou vous connecter",
          [
            { text: "Annuler", style: "cancel" },
            { 
              text: "Se connecter", 
              onPress: () => navigation.navigate('Login', { returnToCart: true })
            },
            { 
              text: "Créer un compte", 
              onPress: () => navigation.navigate('Register', { returnToCart: true })
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
        delivery_fee: deliveryFee // Utiliser les frais dynamiques calculés
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

      // 🔥 ENVOYER LES VRAIES DONNÉES VERS FIREBASE POUR LE TRACKING
      try {
        console.log('🔥 Envoi des vraies données vers Firebase pour tracking...');
        
        // Récupérer l'adresse de livraison saisie par l'utilisateur
        let deliveryLocation = null;
        let userAddress = '';
        let userPhone = '';
        
        try {
          // Récupérer l'adresse depuis AsyncStorage (sauvegardée dans OrderScreen)
          const ordersData = await AsyncStorage.getItem('orders');
          if (ordersData) {
            const orders = JSON.parse(ordersData);
            const lastOrder = orders[orders.length - 1]; // Dernière commande
            if (lastOrder && lastOrder.deliveryInfo) {
              userAddress = lastOrder.deliveryInfo.address || '';
              userPhone = lastOrder.deliveryInfo.phone || '';
              console.log('📍 Adresse utilisateur récupérée:', userAddress);
              console.log('📞 Téléphone utilisateur récupéré:', userPhone);
            }
          }
        } catch (storageError) {
          console.log('⚠️ Impossible de récupérer l\'adresse depuis le stockage:', storageError);
        }
        
        // Si pas d'adresse utilisateur, essayer la position GPS
        if (!userAddress) {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const location = await Location.getCurrentPositionAsync({});
              deliveryLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                address: 'Adresse de livraison (GPS)'
              };
            }
          } catch (locationError) {
            console.log('⚠️ Impossible d\'obtenir la position GPS:', locationError);
          }
        }
        
        // Si toujours pas d'adresse, utiliser des coordonnées par défaut
        if (!deliveryLocation && !userAddress) {
          deliveryLocation = {
            latitude: -4.2634,
            longitude: 15.2429,
            address: 'Kinshasa, République Démocratique du Congo'
          };
        }
        
        // Géocoder l'adresse utilisateur si disponible
        if (userAddress && !deliveryLocation) {
          try {
            console.log('📍 Géocodage de l\'adresse utilisateur:', userAddress);
            const geocodingService = require('../services/geocodingService');
            const geocodedLocation = await geocodingService.geocodeAddress(userAddress);
            
            if (geocodedLocation) {
              deliveryLocation = {
                latitude: geocodedLocation.latitude,
                longitude: geocodedLocation.longitude,
                address: userAddress
              };
              console.log('✅ Adresse utilisateur géocodée avec succès:', deliveryLocation);
            } else {
              throw new Error('Géocodage échoué');
            }
          } catch (geocodingError) {
            console.log('⚠️ Erreur géocodage adresse utilisateur:', geocodingError);
            // Fallback: utiliser des coordonnées par défaut avec l'adresse utilisateur
            deliveryLocation = {
              latitude: -4.2634,
              longitude: 15.2429,
              address: userAddress
            };
          }
        }

        // Récupérer les vraies données client (seulement ce qu'on collecte réellement)
        let customerData = {
          phone: userPhone || '+243 000 000 000' // Seulement le téléphone saisi par l'utilisateur
        };
        
        try {
          const currentUser = await getCurrentUser();
          if (currentUser && currentUser.phone) {
            // Seulement si l'utilisateur a un téléphone enregistré
            customerData.phone = userPhone || currentUser.phone;
          }
        } catch (userError) {
          console.log('⚠️ Impossible de récupérer les données utilisateur:', userError);
        }

        // Envoyer les vraies données vers Firebase
        await FirebaseTrackingService.createOrder(orderId.toString(), {
          order: {
            id: orderId,
            items: cartItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.unitPrice,
              total: item.total
            })),
            total_amount: formatPrice(totalAmount + deliveryFee),
            delivery_fee: formatPrice(deliveryFee),
            subtotal: formatPrice(totalAmount),
            distance: deliveryDistance
          },
          customer: customerData,
          delivery_address: deliveryLocation,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log('✅ Vraies données envoyées vers Firebase avec succès');
      } catch (firebaseError) {
        console.error('❌ Erreur envoi Firebase:', firebaseError);
        // Continuer même si Firebase échoue
      }



      // Sauvegarder les détails avant de vider le panier
      const orderDetails = {
        items: [...cartItems],
        subtotal: totalAmount,
        deliveryFee: deliveryFee,
        total: totalAmount + deliveryFee,
        orderId: orderId,
        distance: deliveryDistance
      };

      // Vider complètement le panier
      await AsyncStorage.removeItem('cart');
      setCartItems([]);

      navigation.navigate('PaymentScreen', { 
        orderDetails,
        onPaymentSuccess: async (updatedOrderDetails) => {
          try {
            await AsyncStorage.removeItem('cart');
            setCartItems([]);
            
            // Redirection vers OrderSuccess avec les détails mis à jour
            navigation.navigate('OrderSuccess', { 
              orderDetails: updatedOrderDetails || orderDetails,
              showTracking: updatedOrderDetails?.payment_method === 'cash'
            });
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

  // Fonction pour gérer le partage avec fallback
  const handleShareCart = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Erreur", "Votre panier est vide");
      return;
    }

    if (isPreparingShare) {
      console.log('⚠️ Partage déjà en cours...');
      return;
    }

    try {
      setIsPreparingShare(true);
      console.log('🔄 Début du partage de panier...');
      
      // Générer un ID unique pour le panier partagé
      const sharedCartId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      setCurrentSharedCartId(sharedCartId);
      
      console.log('🆔 ID généré:', sharedCartId);
      
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

      console.log('💾 Sauvegarde des données du panier...');

      // Sauvegarder le panier partagé dans le stockage local
      await AsyncStorage.setItem(`shared_cart_${sharedCartId}`, JSON.stringify(cartData));
      
      // Sauvegarder le panier partagé sur Firebase (en arrière-plan)
      sharedCartService.saveSharedCart(sharedCartId, cartData, 24).catch(error => {
        console.log('⚠️ Erreur Firebase (non bloquante):', error);
      });
      
      console.log('✅ Données sauvegardées, affichage du modal...');
      
      // Afficher directement le modal de partage
      setShowShareModal(true);
      
    } catch (error) {
      console.error("❌ Erreur lors de la préparation du partage:", error);
      Alert.alert("Erreur", "Impossible de préparer le partage du panier.");
    } finally {
      setIsPreparingShare(false);
    }
  };

  // Fonction pour gérer les liens de partage non accessibles
  const handleShareLinkError = () => {
    Alert.alert(
      "Lien non accessible",
      "Le lien de partage n'est pas accessible pour le moment. Voici les alternatives :",
      [
        {
          text: "Copier l'ID du panier",
          onPress: () => {
            const sharedCartId = generateUniqueId();
            Clipboard.setString(sharedCartId);
            Alert.alert("ID copié", "L'ID du panier a été copié dans le presse-papiers. Partagez-le manuellement.");
          }
        },
        {
          text: "Partager via WhatsApp",
          onPress: () => {
            const cartSummary = cartItems.map(item => `• ${item.name} (${item.quantity}x)`).join('\n');
            const totalAmount = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
            const message = `🛒 Mon panier Mayombe\n\n${cartSummary}\n\n💰 Total: ${totalAmount.toLocaleString()} FCFA\n\n📱 Téléchargez l'app Mayombe pour continuer la commande.`;
            
            Share.share({
              message: message,
              title: 'Mon panier Mayombe'
            });
          }
        },
        {
          text: "Annuler",
          style: "cancel"
        }
      ]
    );
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
    <View style={styles.safeArea}>
      <CustomHeader 
        title={t.cart.title}
        rightComponent={
          <View style={styles.headerTextContainer}>
            <Text style={styles.subtitle}>
              {cartItems.length} {cartItems.length > 1 ? 'articles' : 'article'}
            </Text>
          </View>
        }
      />
      <View style={styles.container}>

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
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#51A905']}
                  tintColor="#51A905"
                  title="Rafraîchir..."
                  titleColor="#51A905"
                />
              }
              ListFooterComponent={() => (
                <>
                  <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Récapitulatif</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Sous-total</Text>
                      <Text style={styles.priceValue}>{formatPrice(totalAmount)} FCFA</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        {isLoadingLocation 
                          ? '📍 Calcul de la distance...'
                          : getDeliveryFeeDescription(deliveryDistance)
                        }
                      </Text>
                      <Text style={styles.priceValue}>
                        {isLoadingLocation ? (
                          <ActivityIndicator size="small" color="#51A905" />
                        ) : (
                          `${deliveryFee} FCFA`
                        )}
                      </Text>
                    </View>
                    {!isLoadingLocation && (
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Distance</Text>
                        <Text style={styles.priceValue}>{formatDistance(deliveryDistance)}</Text>
                      </View>
                    )}
                    <View style={[styles.priceRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>{formatPrice(totalAmount + deliveryFee)} FCFA</Text>
                    </View>
                  </View>

                  <View style={styles.footer}>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        style={[
                          styles.checkoutButton,
                          isSubmitting && styles.disabledButton
                        ]}
                        onPress={() => {
                          console.log('🔘 Bouton "Choisir le mode de paiement" cliqué');
                          createOrder();
                        }}
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
                          (isSharing || isPreparingShare) && styles.disabledButton
                        ]}
                        onPress={handleShareCart}
                        disabled={isSharing || isPreparingShare}
                      >
                        {(isSharing || isPreparingShare) ? (
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
      
      <ShareInstructionsModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        cartItems={cartItems}
        sharedCartId={currentSharedCartId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: width * 0.05,
  },
  headerTextContainer: {
    flex: 1,
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
  loadingText: {
    fontSize: 14,
    color: '#51A905',
    fontFamily: 'Montserrat-Regular',
  },
});

export default CartScreen; 