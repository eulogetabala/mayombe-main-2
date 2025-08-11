import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import LivreurRatingCard from '../components/LivreurRatingCard';
import FirebaseTrackingService from '../services/firebase';
import GoogleMap from '../components/GoogleMap';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const OrderTrackingScreen = ({ route, navigation }) => {
  const [currentStatus, setCurrentStatus] = useState('preparing');
  const [showRatingCard, setShowRatingCard] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('15 min');
  const [trackingData, setTrackingData] = useState(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [loading, setLoading] = useState(true);

  const orderId = route.params?.orderId || 'order_123456';
  const orderDetails = route.params?.orderDetails || {};

  // Initialiser le suivi temps réel avec Firebase
  useEffect(() => {
    const initializeTracking = async () => {
      try {
        console.log('📱 Initialisation du suivi Firebase pour:', orderId);
        setLoading(true);
        
        // 🔥 DÉMARRER FIREBASE TRACKING (LIVE TRACKING)
        const firebaseCleanup = FirebaseTrackingService.startTracking(orderId, {
          onLocationUpdate: (update) => {
            console.log('🔥 Firebase - Nouvelle position reçue:', update);
            if (update.type === 'location') {
              setIsRealtime(true);
              setTrackingData(prev => ({
                ...prev,
                location: {
                  current: {
                    latitude: update.data.latitude,
                    longitude: update.data.longitude
                  }
                },
                lastUpdate: update.data.timestamp
              }));
            }
          },
          onStatusUpdate: (update) => {
            console.log('🔥 Firebase - Nouveau statut reçu:', update);
            if (update.type === 'status') {
              setCurrentStatus(update.data.status);
              setTrackingData(prev => ({
                ...prev,
                status: update.data.status
              }));
            }
          },
          onMessageReceived: (message) => {
            console.log('🔥 Firebase - Nouveau message reçu:', message);
          }
        });
        
        // Initialiser les données de base
        const initialData = {
          driver: {
            id: 24,
            name: "Jean Express",
            phone: "+225 0701234567",
            vehicle: "Moto",
            rating: 4.8,
            photo: null
          },
          destination: {
            address: orderDetails.address || "123 Rue de la Paix, Abidjan",
            latitude: -4.3217,
            longitude: 15.3125
          },
          pickup: {
            address: "456 Avenue du Commerce, Abidjan",
            latitude: -4.3250,
            longitude: 15.3200
          },
          status: 'preparing',
          estimatedTime: 15,
          distance: 2300
        };
        
        setTrackingData(initialData);
        setCurrentStatus(initialData.status);
        setIsRealtime(false);
        setLoading(false);
        
        return firebaseCleanup;
        
      } catch (error) {
        console.error('❌ Erreur initialisation suivi:', error);
        setLoading(false);
      }
    };

    const cleanup = initializeTracking();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [orderId]);

  const getStatusInfo = (status) => {
    switch(status) {
      case 'preparing':
        return {
          title: 'Préparation de la commande',
          subtitle: 'Votre commande est en cours de préparation',
          icon: 'box',
          color: '#FF9800',
        };
      case 'driver_assigned':
        return {
          title: 'Livreur attribué',
          subtitle: 'Un livreur a été assigné à votre commande',
          icon: 'person',
          color: '#2196F3',
        };
      case 'en_route':
        return {
          title: 'Livreur en route',
          subtitle: 'Votre livreur se dirige vers le point de collecte',
          icon: 'bicycle',
          color: '#FF9800',
        };
      case 'arrived':
        return {
          title: 'Livreur arrivé',
          subtitle: 'Le livreur est arrivé au point de collecte',
          icon: 'location',
          color: '#2196F3',
        };
      case 'picking_up':
        return {
          title: 'Récupération du colis',
          subtitle: 'Le livreur récupère votre commande',
          icon: 'bag-handle',
          color: '#9C27B0',
        };
      case 'delivering':
        return {
          title: 'Livraison en cours',
          subtitle: 'Votre commande est en route vers vous',
          icon: 'car',
          color: '#4CAF50',
        };
      case 'delivered':
        return {
          title: 'Livraison terminée',
          subtitle: 'Votre commande a été livrée avec succès',
          icon: 'checkmark-circle',
          color: '#4CAF50',
        };
      default:
        return {
          title: 'En attente',
          subtitle: 'Attente de mise à jour',
          icon: 'time',
          color: '#9E9E9E',
        };
    }
  };

  const handleRatingComplete = (rating) => {
    console.log('⭐ Note donnée:', rating);
    setShowRatingCard(false);
    navigation.navigate('MainApp', { screen: 'Home' });
  };

  const statusInfo = getStatusInfo(currentStatus);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animatable.View animation="pulse" iterationCount="infinite">
          <Ionicons name="map" size={60} color="#FF9800" />
        </Animatable.View>
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Carte plein écran */}
      <GoogleMap
        driverLocation={trackingData?.location?.current || { latitude: -4.3217, longitude: 15.3125 }}
        destinationLocation={trackingData?.destination || { latitude: -4.3217, longitude: 15.3125 }}
        pickupLocation={trackingData?.pickup || { latitude: -4.3250, longitude: 15.3200 }}
        showRoute={true}
        style={styles.map}
      />

      {/* Bouton retour flottant */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Status flottant en haut */}
      <View style={styles.statusOverlay}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIcon, { backgroundColor: `${statusInfo.color}20` }]}>
              <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
            </View>
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>{statusInfo.title}</Text>
              <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>
            </View>
          </View>
          <Text style={styles.etaText}>Arrivée dans {estimatedTime}</Text>
          
          {/* Indicateur temps réel */}
          {isRealtime && (
            <View style={styles.realtimeIndicator}>
              <Ionicons name="radio" size={12} color="#4CAF50" />
              <Text style={styles.realtimeText}>Temps réel</Text>
            </View>
          )}
        </View>
      </View>

      {/* Carte de notation */}
      <LivreurRatingCard
        livreur={trackingData?.driver || { name: 'Livreur', phone: 'N/A' }}
        orderId={orderDetails.orderId || orderId}
        visible={showRatingCard}
        onRatingComplete={handleRatingComplete}
        onClose={() => setShowRatingCard(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 20,
    fontFamily: 'Montserrat',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  statusOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  statusSubtitle: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  etaText: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginTop: 8,
    textAlign: 'center',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  realtimeText: {
    fontSize: scaleFont(10),
    fontFamily: 'Montserrat',
    marginLeft: 4,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default OrderTrackingScreen;
