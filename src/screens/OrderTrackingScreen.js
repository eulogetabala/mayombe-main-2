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
import RealtimeTrackingService from '../services/RealtimeTrackingService';
import pushNotificationService from '../services/pushNotifications';
import geofencingService from '../services/geofencingService';
import geocodingService from '../services/geocodingService';

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
  const mapRef = useRef(null);
  
  
  const orderId = route.params?.orderId || 'order_123456';
  const orderDetails = route.params?.orderDetails || {};
  const userLocation = route.params?.userLocation || null;
  const isPendingOrder = route.params?.isPendingOrder || false;

  const lastNotificationDistance = useRef(null);

  // Initialiser le tracking
  const initializeTracking = async () => {
    try {
      console.log('🗺️ Initialisation tracking client pour:', orderId);
      
      // Initialiser les services
      await pushNotificationService.initialize();
      await geofencingService.initialize();
      await geocodingService.initialize();

      // Vérifier la connexion Firebase
      const firebaseService = RealtimeTrackingService.firebaseService;
      const isFirebaseConnected = await firebaseService.checkConnection();
      setFirebaseConnected(isFirebaseConnected);
      console.log('🔥 Firebase connecté:', isFirebaseConnected);

      // Récupérer la position de l'utilisateur (adresse de livraison)
      let currentUserLocation = userLocation && userLocation.latitude && userLocation.longitude ? userLocation : null;
      
      // PRIORITÉ 1: Utiliser l'adresse de livraison depuis Firebase/commande
      if (!currentUserLocation && orderDetails?.address) {
        try {
          console.log('📍 Géocodage adresse de livraison:', orderDetails.address);
          const geocodedLocation = await geocodingService.geocodeAddress(orderDetails.address);
          if (geocodedLocation) {
            currentUserLocation = {
              latitude: geocodedLocation.latitude,
              longitude: geocodedLocation.longitude
            };
            console.log('✅ Position utilisateur depuis adresse de livraison:', currentUserLocation);
          }
        } catch (error) {
          console.log('⚠️ Erreur géocodage adresse de livraison:', error);
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
          console.log('✅ Position utilisateur depuis Firebase:', currentUserLocation);
        }
      }
      
      // PRIORITÉ 3: Géolocalisation GPS (seulement si pas d'adresse)
      if (!currentUserLocation) {
        try {
          console.log('📍 Récupération position GPS...');
          
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              maximumAge: 10000,
              timeout: 15000
            });

            currentUserLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            };
            
            console.log('✅ Position GPS récupérée:', currentUserLocation);
          }
        } catch (error) {
          console.log('⚠️ Impossible de récupérer la position GPS:', error);
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
              console.log('📍 Position depuis AsyncStorage:', currentUserLocation);
            }
          }
        } catch (storageError) {
          console.log('⚠️ Impossible de récupérer depuis AsyncStorage:', storageError);
        }
      }
      
      // FALLBACK: Position par défaut (Kinshasa)
      if (!currentUserLocation || !currentUserLocation.latitude || !currentUserLocation.longitude) {
        currentUserLocation = { latitude: -4.2634, longitude: 15.2429 };
        console.log('📍 Utilisation position par défaut (Kinshasa):', currentUserLocation);
      }

      // Vérification finale - s'assurer que currentUserLocation est valide
      if (!currentUserLocation || typeof currentUserLocation.latitude !== 'number' || typeof currentUserLocation.longitude !== 'number') {
        currentUserLocation = { latitude: -4.2634, longitude: 15.2429 };
        console.log('📍 Position par défaut appliquée (vérification finale):', currentUserLocation);
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
          console.log('🏪 Géocodage adresse restaurant:', restaurantAddress);
          
          // Utiliser le service de géocodage
          const geocodedLocation = await geocodingService.geocodeAddress(restaurantAddress);
          if (geocodedLocation) {
            restaurantLocation = geocodedLocation;
            console.log('✅ Restaurant géocodé:', restaurantLocation);
          } else {
            // Position par défaut du restaurant (Brazzaville centre)
            restaurantLocation = { latitude: -4.2634, longitude: 15.2429 };
            console.log('📍 Utilisation position par défaut restaurant:', restaurantLocation);
          }
        } catch (error) {
          console.log('⚠️ Erreur géocodage restaurant:', error);
          restaurantLocation = { latitude: -4.2634, longitude: 15.2429 };
        }
      }

      // Vérification finale restaurant
      if (!restaurantLocation || !restaurantLocation.latitude || !restaurantLocation.longitude) {
        restaurantLocation = { latitude: -4.2634, longitude: 15.2429 };
        console.log('📍 Position restaurant par défaut appliquée:', restaurantLocation);
      }

      console.log('🏪 Position restaurant finale:', restaurantLocation);

      // Configuration initiale - CENTRER SUR L'ADRESSE DE LIVRAISON
      const baseData = {
        driverLocation: null,
        destinationLocation: currentUserLocation, // Adresse de livraison géocodée
        restaurantLocation: restaurantLocation,
        distance: 0,
        estimatedTime: 0,
        status: isPendingOrder ? 'En attente d\'assignation' : 'En attente du driver'
      };
      
      console.log('🎯 CENTRAGE CARTE - Adresse de livraison:', currentUserLocation);

      setTrackingData(baseData);
      setCommandeDetails({
        delivery_address: orderDetails.address || 'Adresse de livraison',
        delivery_phone: 'N/A',
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

      setLoading(false);
      console.log('✅ Tracking client initialisé avec Firebase:', isFirebaseConnected);
      
    } catch (error) {
      console.error('❌ Erreur initialisation tracking:', error);
      setLoading(false);
    }
  };

  // Démarrer le tracking temps réel avec Firebase
  const startRealtimeTracking = () => {
    try {
      console.log('🔄 Démarrage tracking temps réel avec Firebase');
      setIsRealtime(true);
      
      // Démarrer le tracking Firebase
      const cleanup = RealtimeTrackingService.startTracking(orderId, {
        onLocationUpdate: (update) => {
          console.log('📍 Mise à jour position Firebase reçue:', update);
          if (update.type === 'location' && update.data) {
            const driverLocation = {
              latitude: update.data.latitude,
              longitude: update.data.longitude
            };
            
            console.log('🗺️ Coordonnées driver:', driverLocation);
            console.log('🗺️ Coordonnées destination:', trackingData.destinationLocation);
            
            // Calculer la distance réelle
            const distance = calculateDistance(
              driverLocation.latitude,
              driverLocation.longitude,
              trackingData.destinationLocation.latitude,
              trackingData.destinationLocation.longitude
            );
            
            console.log('📏 Distance calculée:', distance, 'km');
            
            // Calculer le temps estimé (vitesse moyenne de 30 km/h)
            const estimatedTime = Math.ceil(distance * 1000 / 8.33); // 8.33 m/s = 30 km/h
            
            const newDistance = Math.round(distance * 1000); // Convertir en mètres
            
            setTrackingData(prev => ({
              ...prev,
              driverLocation: driverLocation,
              distance: newDistance,
              estimatedTime: estimatedTime,
              status: distance < 0.05 ? 'Arrivé' : 'En cours de livraison'
            }));
            
            console.log('✅ Données Firebase mises à jour:', {
              distance: newDistance,
              time: estimatedTime,
              status: distance < 0.05 ? 'Arrivé' : 'En cours de livraison'
            });
          } else {
            console.log('⚠️ Données Firebase invalides:', update);
          }
        },
        onStatusUpdate: (update) => {
          console.log('📊 Mise à jour statut Firebase reçue:', update);
          if (update.type === 'status' && update.data) {
            setTrackingData(prev => ({
              ...prev,
              status: update.data.status || update.data
            }));
          }
        },
        onMessageReceived: (message) => {
          console.log('💬 Message Firebase reçu:', message);
        }
      });
      
      // Retourner la fonction de nettoyage
      return cleanup;
      
    } catch (error) {
      console.error('❌ Erreur tracking temps réel Firebase:', error);
      // Pas de fallback, attendre les vraies données
      return () => {};
    }
  };

  // Pas de simulation - on attend les vraies données Firebase

  // Fonction de calcul de distance (Haversine)
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



  // Obtenir la référence de commande
  const getCommandeReference = (details) => {
    return `CMD-${orderId.slice(-6)}`;
  };

  // Gérer les messages du WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 Message WebView reçu:', data);
      
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
        
        console.log('✅ Données d\'itinéraire mises à jour:', { distance: distanceValue, time: durationValue });
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
      console.log('🧹 Nettoyage OrderTrackingScreen');
      
      // Arrêter le tracking Firebase
      if (cleanupFunction && typeof cleanupFunction === 'function') {
        try {
          cleanupFunction();
        } catch (error) {
          console.warn('⚠️ Erreur nettoyage tracking:', error);
        }
      }
      
      // Arrêter le service de tracking
      RealtimeTrackingService.stopTracking();
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
      {/* Bouton de retour */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
      </View>

      {/* Carte Google Maps */}
      <View style={styles.mapContainer}>
        {console.log('🗺️ OrderTrackingScreen - Données envoyées à SimpleMapComponent:', {
          driverLocation: trackingData.driverLocation,
          destinationLocation: trackingData.destinationLocation,
          pickupLocation: trackingData.restaurantLocation
        })}
        {trackingData.destinationLocation && trackingData.restaurantLocation ? (
          <SimpleMapComponent
            ref={mapRef}
            driverLocation={trackingData.driverLocation}
            destinationLocation={trackingData.destinationLocation}
            pickupLocation={trackingData.restaurantLocation}
            onMessage={handleWebViewMessage}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Chargement de la carte...</Text>
          </View>
        )}
      </View>

      {/* Container compact en bas */}
      <View style={styles.bottomInfoContainer}>
        {/* Header avec statut et référence */}
        <View style={styles.compactHeader}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: firebaseConnected ? '#4CAF50' : '#FF9800' }]} />
            <Text style={styles.statusText}>
              {firebaseConnected ? 'En attente du driver' : 'Connexion lente'}
            </Text>
          </View>
          <Text style={styles.orderId}>
            {getCommandeReference(commandeDetails)}
          </Text>
        </View>
        
        {/* Métriques compactes */}
        <View style={styles.compactMetrics}>
          <View style={styles.compactMetric}>
            <Ionicons name="location" size={20} color="#FF9800" />
            <Text style={styles.compactMetricValue}>
              {trackingData.distance > 0 
                ? (trackingData.distance > 1000 
                    ? `${(trackingData.distance / 1000).toFixed(1)}km` 
                    : `${Math.round(trackingData.distance)}m`)
                : '--'
              }
            </Text>
            <Text style={styles.compactMetricLabel}>Distance</Text>
          </View>
          
          <View style={styles.compactMetric}>
            <Ionicons name="time" size={20} color="#FF9800" />
            <Text style={styles.compactMetricValue}>
              {trackingData.estimatedTime > 0 
                ? (trackingData.estimatedTime > 60 
                    ? `${Math.round(trackingData.estimatedTime / 60)}h${trackingData.estimatedTime % 60}min` 
                    : `${Math.round(trackingData.estimatedTime)}min`)
                : '--'
              }
            </Text>
            <Text style={styles.compactMetricLabel}>Temps</Text>
          </View>
          
          <View style={styles.compactMetric}>
            <Ionicons name="bicycle" size={20} color="#FF9800" />
            <Text style={styles.compactMetricValue}>
              {trackingData.status === 'En attente d\'assignation' ? 'En attente' : trackingData.status}
            </Text>
            <Text style={styles.compactMetricLabel}>Statut</Text>
          </View>
        </View>
        
        {/* Informations de livraison */}
        <View style={styles.deliveryInfo}>
          <View style={styles.deliveryRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.deliveryText} numberOfLines={1}>
              {commandeDetails?.delivery_address}
            </Text>
          </View>
          <View style={styles.deliveryRow}>
            <Ionicons name="card" size={16} color="#666" />
            <Text style={styles.deliveryText}>
              {commandeDetails?.order?.total_amount} FCFA
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
    zIndex: 1000,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#9E9E9E',
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
    flexDirection: 'row',
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
