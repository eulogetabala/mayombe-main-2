import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebViewMapComponent from '../components/WebViewMapComponent';
import SimpleMapComponent from '../components/SimpleMapComponent';
import DeliveryStepsComponent from '../components/DeliveryStepsComponent';
import RealtimeTrackingService from '../services/RealtimeTrackingService';
import FirebaseTrackingService from '../services/firebase';
import { ref, get, database } from '../services/firebase';
import pushNotificationService from '../services/pushNotifications';
import geofencingService from '../services/geofencingService';
import geocodingService from '../services/geocodingService';
import DistanceCalculationService from '../services/DistanceCalculationService';

const { width, height } = Dimensions.get('window');

const OrderTrackingScreen = ({ route, navigation }) => {
  const [trackingData, setTrackingData] = useState({
    driverLocation: null,
    destinationLocation: null,
    distance: 0,
    estimatedTime: 0,
    status: 'En attente'
  });
  const [isRealtime, setIsRealtime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commandeDetails, setCommandeDetails] = useState(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const mapRef = useRef(null);
  
  
  const orderId = route.params?.orderId || 'order_123456';
  const orderDetails = route.params?.orderDetails || {};
  const userLocation = route.params?.userLocation || null;
  const isPendingOrder = route.params?.isPendingOrder || false;


  const lastNotificationDistance = useRef(null);

  // Récupérer les données de commande depuis Firebase
  const fetchOrderDataFromFirebase = async () => {
    try {
      
      // Utiliser directement l'OrderId sans préfixe (compatible avec le driver)
      const firebaseOrderId = orderId;
      
      // Récupérer toutes les données d'un coup
      const orderData = await FirebaseTrackingService.getOrderData(firebaseOrderId);
      
      if (orderData) {
        
        // Récupérer la position du driver si disponible
        const driverLocation = await FirebaseTrackingService.getDriverLocation(firebaseOrderId);
        if (driverLocation) {
        }
        
        // Récupérer le statut de livraison si disponible
        const deliveryStatus = await FirebaseTrackingService.getDeliveryStatus(firebaseOrderId);
        if (deliveryStatus) {
        }
        
        // Mettre à jour les détails de commande avec les vraies données Firebase
        setCommandeDetails({
          delivery_address: orderData.delivery_address?.address || orderData.customer?.address || 'Adresse de livraison',                                                                                             
          delivery_phone: orderData.customer?.phone || 'N/A',
          order: {
            total_amount: orderData.order?.total_amount || 0
          }
        });
        
        // Mettre à jour le tracking avec les données Firebase
        setTrackingData(prev => ({
          ...prev,
          status: orderData.status || 'pending',
          destinationLocation: orderData.delivery_address && orderData.delivery_address.latitude && orderData.delivery_address.longitude ? {
            latitude: orderData.delivery_address.latitude,
            longitude: orderData.delivery_address.longitude
          } : prev.destinationLocation,
          driverLocation: driverLocation && driverLocation.latitude && driverLocation.longitude ? driverLocation : prev.driverLocation,
          lastUpdate: new Date().toISOString()
        }));
        
      } else {
      }
    } catch (error) {
      console.error('❌ Erreur récupération Firebase:', error);
    }
  };

  // Initialiser le tracking
  const initializeTracking = async () => {
    try {
      
      // Initialiser les services
      await pushNotificationService.initialize();
      await geofencingService.initialize();
      await geocodingService.initialize();

      // Vérifier la connexion Firebase
      const firebaseService = RealtimeTrackingService.firebaseService;
      const isFirebaseConnected = await firebaseService.checkConnection();
      setFirebaseConnected(isFirebaseConnected);

      // Récupérer la position de l'utilisateur (adresse de livraison)
      let currentUserLocation = userLocation && userLocation.latitude && userLocation.longitude ? userLocation : null;
      
      // PRIORITÉ 1: Utiliser l'adresse de livraison depuis Firebase/commande
      if (!currentUserLocation && orderDetails?.address) {
        try {
          const geocodedLocation = await geocodingService.geocodeAddress(orderDetails.address);
          if (geocodedLocation && geocodedLocation.latitude && geocodedLocation.longitude) {
            currentUserLocation = {
              latitude: geocodedLocation.latitude,
              longitude: geocodedLocation.longitude
            };
          } else {
          }
        } catch (error) {
        }
      }
      
      // PRIORITÉ 2: Utiliser les coordonnées depuis Firebase si disponibles
      if (!currentUserLocation && orderDetails?.delivery_address) {
        const deliveryAddress = orderDetails.delivery_address;
        if (deliveryAddress.latitude && deliveryAddress.longitude) {
          currentUserLocation = {
            latitude: parseFloat(deliveryAddress.latitude),
            longitude: parseFloat(deliveryAddress.longitude)
          };
        }
      }
      
      // PRIORITÉ 3: Géolocalisation GPS (seulement si pas d'adresse)
      if (!currentUserLocation) {
        try {
          
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              maximumAge: 5000, // Plus récent
              timeout: 10000 // Plus rapide
            });

            currentUserLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            };
            
          }
        } catch (error) {
        }
      }

      // VÉRIFICATION: Éviter les positions par défaut comme "Union Square"
      if (currentUserLocation) {
        // Vérifier si c'est une position par défaut (Union Square = -4.2634, 15.2429)
        const isDefaultPosition = 
          (Math.abs(currentUserLocation.latitude - (-4.2634)) < 0.001 && 
           Math.abs(currentUserLocation.longitude - 15.2429) < 0.001);
        
        if (isDefaultPosition) {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                maximumAge: 0, // Forcer une nouvelle position
                timeout: 15000
              });

              currentUserLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              };
              
            }
          } catch (error) {
          }
        }
      }
      
      // PRIORITÉ 4: AsyncStorage (adresse saisie précédemment)
      if (!currentUserLocation) {
        try {
          const ordersData = await AsyncStorage.getItem('orders');
          if (ordersData) {
            const orders = JSON.parse(ordersData);
            const lastOrder = orders[orders.length - 1];
            if (lastOrder?.deliveryInfo?.coordinates) {
              currentUserLocation = lastOrder.deliveryInfo.coordinates;
            }
          }
        } catch (storageError) {
        }
      }
      
      // FALLBACK: Position par défaut (Kinshasa)
      if (!currentUserLocation || !currentUserLocation.latitude || !currentUserLocation.longitude) {
        currentUserLocation = { latitude: -4.2634, longitude: 15.2429 };
      }

      // Vérification finale - s'assurer que currentUserLocation est valide
      if (!currentUserLocation || typeof currentUserLocation.latitude !== 'number' || typeof currentUserLocation.longitude !== 'number') {
        currentUserLocation = { latitude: -4.2634, longitude: 15.2429 };
      }

      // Position du livreur (attendre les vraies données Firebase)
      const driverLocation = null; // Pas de position simulée, attendre Firebase

      // Récupérer la position du restaurant avec géocodage
      let restaurantLocation = null;
      if (orderDetails?.restaurant?.coordinates) {
        restaurantLocation = orderDetails.restaurant.coordinates;
      } else if (orderDetails?.restaurant?.latitude && orderDetails?.restaurant?.longitude) {
        restaurantLocation = {
          latitude: parseFloat(orderDetails.restaurant.latitude),
          longitude: parseFloat(orderDetails.restaurant.longitude)
        };
      } else {
        // Essayer de géocoder l'adresse du restaurant
        try {
          const restaurantAddress = orderDetails?.restaurant?.address || 'Brazzaville, République du Congo';
          
          // Utiliser le service de géocodage
          const geocodedLocation = await geocodingService.geocodeAddress(restaurantAddress);
          if (geocodedLocation) {
            restaurantLocation = geocodedLocation;
          } else {
            // Position par défaut du restaurant (Brazzaville centre)
            restaurantLocation = { latitude: -4.2634, longitude: 15.2429 };
          }
        } catch (error) {
          restaurantLocation = { latitude: -4.2634, longitude: 15.2429 };
        }
      }

      // Vérification finale restaurant
      if (!restaurantLocation || !restaurantLocation.latitude || !restaurantLocation.longitude) {
        restaurantLocation = { latitude: -4.2634, longitude: 15.2429 };
      }


      // Configuration initiale - CENTRER SUR L'ADRESSE DE LIVRAISON
      const baseData = {
        driverLocation: null,
        destinationLocation: currentUserLocation, // Adresse de livraison géocodée
        restaurantLocation: restaurantLocation,
        distance: 0,
        estimatedTime: 0,
        status: isPendingOrder ? 'En attente d\'assignation' : 'En attente du driver'
      };
      

      setTrackingData(baseData);
      
      // Récupérer les données de livraison depuis les paramètres de route
      const realDeliveryAddress = orderDetails.address || orderDetails.delivery_address || 'Adresse de livraison';
      const realDeliveryPhone = orderDetails.phone || orderDetails.delivery_phone || orderDetails.customer?.phone || 'N/A';
      
      
      
      setCommandeDetails({
        delivery_address: realDeliveryAddress,
        delivery_phone: realDeliveryPhone,
        order: {
          total_amount: orderDetails.total || 0
        }
      });

      // Démarrer le tracking temps réel si ce n'est pas une commande en attente
      if (!isPendingOrder) {
        const cleanup = startRealtimeTracking();
        
        // Sauvegarder la fonction de nettoyage
        if (cleanup && typeof cleanup === 'function') {
          // Le cleanup sera appelé dans le useEffect
        }
      }

      // Récupérer les données depuis Firebase
      await fetchOrderDataFromFirebase();
      
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Erreur initialisation tracking:', error);
      setLoading(false);
    }
  };

  // Démarrer le tracking temps réel avec Firebase - COMPATIBLE AVEC DRIVER
  const startRealtimeTracking = () => {
    try {
      setIsRealtime(true);
      
      // Utiliser directement l'OrderId sans préfixe (compatible avec le driver)
      const firebaseOrderId = orderId;
      console.log('🔍 ORDER: OrderId original:', orderId);
      console.log('🔍 ORDER: OrderId Firebase:', firebaseOrderId);
      
      const cleanup = FirebaseTrackingService.startTracking(firebaseOrderId, {
        onLocationUpdate: (update) => {
          console.log('🔍 ORDER: Callback position reçu:', update);
          console.log('🔍 ORDER: Position driver actuelle:', trackingData.driverLocation);
          console.log('🔍 ORDER: Destination actuelle:', trackingData.destinationLocation);
          
          if (update.type === 'location' && update.data) {
            const driverLocation = {
              latitude: update.data.latitude,
              longitude: update.data.longitude,
              accuracy: update.data.accuracy || 5,
              speed: update.data.speed || 0,
              heading: update.data.heading || 0,
              timestamp: update.data.timestamp || Date.now()
            };
            
            
            // Vérifier que driverLocation est valide
            if (!driverLocation || !driverLocation.latitude || !driverLocation.longitude) {
              return;
            }
            
            
            // Vérifier que destinationLocation est valide
            if (!trackingData.destinationLocation || !trackingData.destinationLocation.latitude || !trackingData.destinationLocation.longitude) {
              return;
            }
            
            // Calculer la distance réelle avec le service avancé
            console.log('🔍 ORDER: Calcul distance entre:', {
              driver: { lat: driverLocation.latitude, lng: driverLocation.longitude },
              destination: { lat: trackingData.destinationLocation.latitude, lng: trackingData.destinationLocation.longitude }
            });
            
            const distance = DistanceCalculationService.calculateDistance(
              driverLocation.latitude,
              driverLocation.longitude,
              trackingData.destinationLocation.latitude,
              trackingData.destinationLocation.longitude
            );
            
            console.log('🔍 ORDER: Distance calculée:', distance, 'km');
            
            
            // Calculer le temps estimé DYNAMIQUE avec le service avancé
            const timeEstimate = DistanceCalculationService.calculateEstimatedTime(
              distance,
              driverLocation.speed,
              'motorbike' // Type de véhicule par défaut
            );
            
            
            const newDistance = distance; // Distance déjà en kilomètres
            
            // Déterminer le statut avec le service avancé
            const status = DistanceCalculationService.determineDeliveryStatus(
              distance,
              driverLocation.speed,
              trackingData.status
            );
            
            setTrackingData(prev => ({
              ...prev,
              driverLocation: driverLocation,
              distance: newDistance,
              estimatedTime: timeEstimate.minutes,
              estimatedTimeSeconds: timeEstimate.seconds,
              status: status,
              speed: timeEstimate.speed,
              lastUpdate: Date.now()
            }));
            
            console.log('🔍 ORDER: Données mises à jour:', {
              distance: newDistance,
              estimatedTime: timeEstimate.minutes,
              speed: timeEstimate.speed
            });
            
            // Mettre à jour la carte en temps réel
            if (mapRef.current && mapRef.current.updateDriverPosition && driverLocation && driverLocation.latitude && driverLocation.longitude) {
              mapRef.current.updateDriverPosition(driverLocation.latitude, driverLocation.longitude);
            } else {
            }
            
          } else {
          }
        },
        onStatusUpdate: (update) => {
          
          if (update.type === 'status' && update.data) {
            const newStatus = update.data.status || update.data;
            
            setTrackingData(prev => ({
              ...prev,
              status: newStatus,
              lastStatusUpdate: Date.now()
            }));
            
            // Gérer les notifications selon le statut
            handleStatusNotifications(newStatus);
          }
        },
        onMessageReceived: (message) => {
          // Ici on peut gérer les messages du livreur
        }
      }, {
        updateFrequency: 3000 // Mise à jour toutes les 3 secondes pour un suivi fluide
      });
      
      // Retourner la fonction de nettoyage
      return cleanup;
      
    } catch (error) {
      console.error('❌ Erreur tracking temps réel Firebase:', error);
      // Pas de fallback, attendre les vraies données
      return () => {};
    }
  };

  // Gérer les notifications selon le statut
  const handleStatusNotifications = (status) => {
    const now = Date.now();
    
    // Éviter les notifications trop fréquentes
    if (lastNotificationDistance.current && (now - lastNotificationDistance.current) < 30000) {
      return; // Pas de notification dans les 30 secondes
    }
    
    switch (status) {
      case 'Arrivé à destination':
        // Notification supprimée pour éviter l'erreur
        lastNotificationDistance.current = now;
        break;
      case 'Presque arrivé':
        // Notification supprimée pour éviter l'erreur
        lastNotificationDistance.current = now;
        break;
      case 'À proximité':
        // Notification supprimée pour éviter l'erreur
        lastNotificationDistance.current = now;
        break;
      case 'Dans le quartier':
        // Notification supprimée pour éviter l'erreur
        lastNotificationDistance.current = now;
        break;
      case 'En route rapide':
        // Notification supprimée pour éviter l'erreur
        lastNotificationDistance.current = now;
        break;
      case 'terminé':
      case 'delivered':
      case 'completed':
      case 'livré':
        // Notification supprimée pour éviter l'erreur
        lastNotificationDistance.current = now;
        
        // Afficher une alerte de confirmation
        Alert.alert(
          '🎉 Livraison terminée !',
          'Votre commande a été livrée avec succès. Merci d\'avoir utilisé Mayombe !',
          [
            {
              text: 'Noter le livreur',
              onPress: () => {
                // Rediriger vers la page de notation
                navigation.navigate('DriverRating', {
                  orderId: orderId,
                  driverName: 'Le livreur'
                });
              }
            },
            {
              text: 'Retour à l\'accueil',
              onPress: () => {
                navigation.navigate('Home');
              }
            }
          ]
        );
        break;
    }
  };

  // Fonction de calcul de distance (Haversine) - AMÉLIORÉE
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Utiliser les fonctions de formatage du service avancé
  const formatDistance = (distanceInMeters) => {
    return DistanceCalculationService.formatDistance(distanceInMeters);
  };

  const formatEstimatedTime = (minutes) => {
    return DistanceCalculationService.formatEstimatedTime(minutes);
  };

  // Obtenir l'icône selon le statut - VERSION ÉTENDUE
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Arrivé à destination':
        return 'checkmark-circle';
      case 'Presque arrivé':
        return 'location';
      case 'À proximité':
        return 'navigate';
      case 'Dans le quartier':
        return 'map';
      case 'En cours de livraison':
        return 'bicycle';
      case 'En route rapide':
        return 'flash';
      case 'En déplacement':
        return 'car';
      case 'En attente':
        return 'time';
      case 'En attente d\'assignation':
        return 'hourglass';
      default:
        return 'ellipse';
    }
  };

  // Obtenir la couleur selon le statut - VERSION ÉTENDUE
  const getStatusColor = (status) => {
    switch (status) {
      case 'Arrivé à destination':
        return '#4CAF50';
      case 'Presque arrivé':
        return '#FF9800';
      case 'À proximité':
        return '#2196F3';
      case 'Dans le quartier':
        return '#9C27B0';
      case 'En cours de livraison':
        return '#FF5722';
      case 'En route rapide':
        return '#E91E63';
      case 'En déplacement':
        return '#3F51B5';
      case 'En attente':
        return '#9E9E9E';
      case 'En attente d\'assignation':
        return '#607D8B';
      default:
        return '#666';
    }
  };

  // Formater la dernière mise à jour
  const formatLastUpdate = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return `Il y a ${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `Il y a ${minutes}min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      return `Il y a ${hours}h`;
    }
  };



  // Obtenir la référence de commande - VERSION SIMPLE ET CORRECTE
  const getCommandeReference = (details) => {
    // PRIORITÉ 1: Utiliser la référence complète si disponible dans les détails
    if (details?.orderId && typeof details.orderId === 'string' && details.orderId.includes('CMD-')) {
      return details.orderId;
    }
    
    // PRIORITÉ 2: Utiliser l'OrderId tel quel s'il contient déjà CMD-
    if (orderId && typeof orderId === 'string' && orderId.includes('CMD-')) {
      return orderId;
    }
    
    // PRIORITÉ 3: Utiliser l'ID depuis les détails
    if (details?.id && typeof details.id === 'string' && details.id.includes('CMD-')) {
      return details.id;
    }
    
    // PRIORITÉ 4: Sinon, utiliser l'OrderId tel quel (sans ajouter de zéros)
    return orderId || 'CMD-N/A';
  };

  // Gérer les messages du WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'routeCalculated' || data.type === 'routeUpdated') {
        // Mettre à jour les données de distance et temps avec les vraies données de l'API
        const distanceText = data.data.distance;
        const durationText = data.data.duration;
        
        // Extraire les valeurs numériques
        const distanceValue = parseInt(distanceText.replace(/[^\d]/g, ''));
        const durationValue = parseInt(durationText.replace(/[^\d]/g, ''));
        
        setTrackingData(prev => ({
          ...prev,
          distance: distanceValue || prev.distance,
          estimatedTime: durationValue || prev.estimatedTime
        }));
        
      }
    } catch (error) {
      console.error('❌ Erreur parsing message WebView:', error);
    }
  };

  // Initialiser au montage du composant
  useEffect(() => {
    let cleanupFunction = null;
    
    const init = async () => {
      try {
        await initializeTracking();
        
        // Si ce n'est pas une commande en attente, démarrer le tracking
        if (!isPendingOrder) {
          cleanupFunction = startRealtimeTracking();
          
        }
      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
      }
    };
    
    init();
    
    // Nettoyer à la destruction
    return () => {
      
      // Arrêter le tracking Firebase
      if (cleanupFunction && typeof cleanupFunction === 'function') {
        try {
          cleanupFunction();
        } catch (error) {
        }
      }
      
      // Arrêter le service de tracking (compatible driver)
      const firebaseOrderId = orderId;
      FirebaseTrackingService.stopTracking(firebaseOrderId);
    };
  }, [orderId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initialisation du tracking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec boutons */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        {/* Bouton de basculement vue */}
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setShowSteps(!showSteps)}
        >
          <Ionicons 
            name={showSteps ? "map" : "list"} 
            size={24} 
            color="#FFF" 
          />
        </TouchableOpacity>
        
        
      </View>

      {/* Carte Google Maps ou Étapes de livraison */}
      <View style={styles.mapContainer}>
        {showSteps ? (
          // Vue des étapes de livraison
          <View style={styles.stepsViewContainer}>
            <DeliveryStepsComponent 
              currentStatus={trackingData.status}
              orderStatus={trackingData.status || orderDetails?.status || 'pending'}
            />
          </View>
        ) : (
          // Vue de la carte
          <>
            {/* Carte masquée si livraison terminée */}
            {!(trackingData.status === 'terminé' || trackingData.status === 'delivered' || trackingData.status === 'completed' || trackingData.status === 'livré') ? (
              trackingData.destinationLocation && trackingData.restaurantLocation ? (
                <SimpleMapComponent
                  ref={mapRef}
                  driverLocation={trackingData.driverLocation}
                  destinationLocation={trackingData.destinationLocation}
                  pickupLocation={trackingData.restaurantLocation}
                  orderStatus={trackingData.status}
                  onMessage={handleWebViewMessage}
                />
              ) : (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.loadingText}>
                    {!trackingData.destinationLocation && !trackingData.restaurantLocation 
                      ? 'Initialisation de la carte...' 
                      : !trackingData.destinationLocation 
                        ? 'Récupération de l\'adresse de livraison...'
                        : 'Récupération de la position du restaurant...'
                    }
                  </Text>
                  <Text style={styles.loadingSubText}>
                    Destination: {trackingData.destinationLocation ? '✅' : '❌'} | 
                    Restaurant: {trackingData.restaurantLocation ? '✅' : '❌'}
                  </Text>
                </View>
              )
            ) : null}
          </>
        )}
      </View>

      {/* Container compact en bas */}
      <View style={styles.bottomInfoContainer}>
        {/* Header avec statut et référence */}
        <View style={styles.compactHeader}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: firebaseConnected ? '#4CAF50' : '#FF9800' }]} />
            <Text style={styles.statusText}>
              {firebaseConnected ? 'Firebase connecté' : 'Firebase déconnecté'}
            </Text>
          </View>
          <Text style={styles.orderId}>
            {getCommandeReference(commandeDetails)}
          </Text>
        </View>
        
        
        {/* Message d'information */}
        {!trackingData.driverLocation && trackingData.status !== 'terminé' && trackingData.status !== 'delivered' && trackingData.status !== 'completed' && trackingData.status !== 'livré' && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              ⚠️ En attente de la position du livreur. 
              Le livreur doit démarrer sa course pour que vous puissiez le suivre en temps réel.
            </Text>
            
            
          </View>
        )}

        
        {/* Message de livraison terminée */}
        {(trackingData.status === 'terminé' || trackingData.status === 'delivered' || trackingData.status === 'completed' || trackingData.status === 'livré') && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              🎉 Livraison terminée avec succès !
            </Text>
            <Text style={styles.successSubText}>
              Votre commande a été livrée. Merci d'avoir utilisé Mayombe !
            </Text>
            
            <TouchableOpacity 
              style={styles.ratingButton}
              onPress={() => {
                // Rediriger vers la page de notation
                navigation.navigate('DriverRating', {
                  orderId: orderId,
                  driverName: 'Le livreur'
                });
              }}
            >
              <Ionicons name="star" size={20} color="#FFF" />
              <Text style={styles.ratingButtonText}>Noter le livreur</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Métriques compactes - VERSION AMÉLIORÉE - Masquées si livraison terminée */}
        {!(trackingData.status === 'terminé' || trackingData.status === 'delivered' || trackingData.status === 'completed' || trackingData.status === 'livré') && (
          <View style={styles.compactMetrics}>
            <View style={styles.compactMetric}>
              <Ionicons name="location" size={20} color="#FF9800" />
              <Text style={styles.compactMetricValue}>
                {trackingData.distance !== null && trackingData.distance !== undefined ? formatDistance(trackingData.distance) : '--'}
              </Text>
              <Text style={styles.compactMetricLabel}>Distance</Text>
            </View>
            
            <View style={styles.compactMetric}>
              <Ionicons name="time" size={20} color="#FF9800" />
              <Text style={styles.compactMetricValue}>
                {trackingData.estimatedTime !== null && trackingData.estimatedTime !== undefined ? formatEstimatedTime(trackingData.estimatedTime) : '--'}
              </Text>
              <Text style={styles.compactMetricLabel}>Temps estimé</Text>
            </View>
            
            <View style={styles.compactMetric}>
              <Ionicons name="speedometer" size={20} color="#FF9800" />
              <Text style={styles.compactMetricValue}>
                {trackingData.speed ? `${Math.round(trackingData.speed)} km/h` : '--'}
              </Text>
              <Text style={styles.compactMetricLabel}>Vitesse</Text>
            </View>
          </View>
        )}

        {/* Bouton Terminer la course - Après les métriques */}
        {trackingData.driverLocation && trackingData.status !== 'terminé' && trackingData.status !== 'delivered' && trackingData.status !== 'completed' && trackingData.status !== 'livré' && (
          <View style={styles.completeDeliveryContainer}>
            <TouchableOpacity 
              style={styles.completeDeliveryButton}
              onPress={async () => {
                Alert.alert(
                  'Terminer la course',
                  'Confirmez-vous avoir reçu votre commande ?',
                  [
                    {
                      text: 'Annuler',
                      style: 'cancel'
                    },
                    {
                      text: 'Confirmer',
                      onPress: async () => {
                        try {
                          
                          // Utiliser directement l'OrderId sans préfixe (compatible avec le driver)
                          const firebaseOrderId = orderId;
                          
                          // 1. Mettre à jour le statut dans Firebase
                          await FirebaseTrackingService.updateDeliveryStatus(firebaseOrderId, 'terminé');
                          
                          // 2. Mettre à jour le statut dans l'API backend
                          try {
                            const response = await fetch(`https://www.api-mayombe.mayombe-app.com/public/api/orders/${orderId}/status`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                status: 'delivered',
                                delivery_status: 'Livré'
                              })
                            });
                            
                            if (response.ok) {
                              console.log('✅ Statut API backend mis à jour vers "Livré"');
                            } else {
                              console.log('⚠️ Erreur mise à jour API backend:', response.status);
                            }
                          } catch (apiError) {
                            console.log('⚠️ Erreur API backend:', apiError);
                          }
                          
                          // Mettre à jour l'état local
                          setTrackingData(prev => ({
                            ...prev,
                            status: 'terminé',
                            lastUpdate: Date.now()
                          }));
                          
                          
                          // Déclencher les notifications de fin de livraison
                          handleStatusNotifications('terminé');
                          
                        } catch (error) {
                          console.error('❌ Erreur lors de la fin de course:', error);
                          Alert.alert('Erreur', 'Impossible de terminer la course. Veuillez réessayer.');
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.completeDeliveryButtonText}>Terminer la course</Text>
            </TouchableOpacity>
          </View>
        )}
        
        
        
        {/* Statut détaillé */}
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Ionicons 
              name={getStatusIcon(trackingData.status)} 
              size={24} 
              color={getStatusColor(trackingData.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(trackingData.status) }]}>
              {trackingData.status}
            </Text>
          </View>
          
          {/* Indicateurs dynamiques */}
          {trackingData.driverLocation && (
            <View style={styles.dynamicIndicators}>
              <View style={styles.indicatorRow}>
                <Ionicons name="speedometer" size={16} color="#FF9800" />
                <Text style={styles.indicatorText}>
                  Vitesse: {trackingData.driverLocation.speed || 0} km/h
                </Text>
              </View>
              <View style={styles.indicatorRow}>
                <Ionicons name="location" size={16} color="#4CAF50" />
                <Text style={styles.indicatorText}>
                  Distance: {trackingData.distance?.toFixed(2) || 0} km
                </Text>
              </View>
              <View style={styles.indicatorRow}>
                <Ionicons name="time" size={16} color="#2196F3" />
                <Text style={styles.indicatorText}>
                  ETA: {trackingData.estimatedTime || 0} min
                </Text>
              </View>
            </View>
          )}
          
          {trackingData.lastUpdate && (
            <Text style={styles.lastUpdateText}>
              Dernière mise à jour: {formatLastUpdate(trackingData.lastUpdate)}
            </Text>
          )}
        </View>
        
        {/* Informations de livraison - Seulement l'adresse */}
        <View style={styles.deliveryInfo}>
          <View style={styles.deliveryRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.deliveryText} numberOfLines={2}>
              {commandeDetails?.delivery_address}
            </Text>
          </View>
        </View>
        
        {/* Message informatif compact */}
        {!trackingData.driverLocation && (
          <View style={styles.compactInfoMessage}>
            <Ionicons name="information-circle" size={16} color="#2196F3" />
            <Text style={styles.compactInfoText}>
              {firebaseConnected 
                ? 'Données en attente du driver'
                : 'Connexion lente - mise à jour plus lente'
              }
            </Text>
          </View>
        )}
      </View>

      {/* Message pour commandes en attente */}
      {isPendingOrder && (
        <View style={styles.pendingMessage}>
          <Ionicons name="information-circle" size={20} color="#FF9800" />
          <Text style={styles.pendingText}>
            Votre commande est en attente d'assignation à un livreur
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stepsViewContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#9E9E9E',
  },
  loadingSubText: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center'
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
 },
  bottomInfoContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: 'blur(10px)',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800',
  },
  commandeInfoContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  commandeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commandeAddress: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  commandePhone: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  commandeAmount: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 8,
    fontWeight: '600',
  },
  compactMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  compactMetric: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  compactMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  compactMetricLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastUpdateText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  dynamicIndicators: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  indicatorText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500'
  },
  diagnosticContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8
  },
  diagnosticText: {
    color: '#FFF',
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'monospace'
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: '#FF9800',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  infoText: {
    color: '#FF9800',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500'
  },
  successContainer: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#45A049'
  },
  successText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  successSubText: {
    color: '#E8F5E8',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500'
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  ratingButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  completeDeliveryContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  completeDeliveryText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  completeDeliverySubText: {
    color: '#1976D2',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic'
  },
  completeDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  completeDeliveryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  deliveryInfo: {
    marginBottom: 8,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  compactInfoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  compactInfoText: {
    fontSize: 11,
    color: '#1976D2',
    marginLeft: 6,
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },

  pendingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  pendingText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
  },
});

export default OrderTrackingScreen;
