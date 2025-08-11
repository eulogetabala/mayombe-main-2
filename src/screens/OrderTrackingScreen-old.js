import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import CustomHeader from '../components/common/CustomHeader';
import LivreurRatingCard from '../components/LivreurRatingCard';
import RealtimeTrackingService from '../services/RealtimeTrackingService';
import FirebaseTrackingService from '../services/firebase';
import GoogleMap from '../components/GoogleMap';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const OrderTrackingScreen = ({ route, navigation }) => {
  const [currentStatus, setCurrentStatus] = useState('preparing');
  const [showRatingCard, setShowRatingCard] = useState(false);
  const [livreurLocation, setLivreurLocation] = useState({ lat: 0, lng: 0 });
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
              const newLocation = {
                lat: update.data.latitude,
                lng: update.data.longitude
              };
              
              setLivreurLocation(newLocation);
              setIsRealtime(true);
              
              // Mettre à jour les données de tracking
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
              
              // Calculer le temps estimé d'arrivée
              calculateETA(newLocation);
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
              
              // Mettre à jour l'ETA selon le statut
              updateETAForStatus(update.data.status);
            }
          },
          onMessageReceived: (message) => {
            console.log('🔥 Firebase - Nouveau message reçu:', message);
            // Gérer les notifications push
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
            latitude: -4.3217,
            longitude: 15.3125
          },
          pickup: {
            address: "456 Avenue du Commerce, Abidjan",
            latitude: -4.3250,
            longitude: 15.3200
          },
          estimatedTime: 15,
          distance: 2300
        });
        
        setTrackingData(initialData);
        setCurrentStatus(initialData.status);
        setIsRealtime(initialData.isRealtime || false);
        
        // S'abonner aux mises à jour
        try {
          RealtimeTrackingService.subscribeToUpdates(orderId, (updatedData) => {
            console.log('📱 Données de suivi mises à jour:', updatedData);
            setTrackingData(updatedData);
            setCurrentStatus(updatedData.status);
            setIsRealtime(updatedData.isRealtime || false);
            
            // Mettre à jour la position du livreur
            if (updatedData.location?.current) {
              setLivreurLocation({
                lat: updatedData.location.current.latitude,
                lng: updatedData.location.current.longitude
              });
            }
            
            // Mettre à jour le temps estimé
            if (updatedData.estimatedTime) {
              setEstimatedTime(`${updatedData.estimatedTime} min`);
            }
          });
        } catch (subscribeError) {
          console.warn('⚠️ Erreur abonnement mises à jour:', subscribeError.message);
        }
        
      } catch (error) {
        console.error('❌ Erreur initialisation suivi:', error);
        // Ne pas afficher d'alerte, permettre le mode simulation
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    initializeTracking();

    // Cleanup
    return () => {
      firebaseCleanup();
      RealtimeTrackingService.unsubscribeFromUpdates(orderId, () => {});
    };
  }, [orderId]);

  // Calculer le temps estimé d'arrivée
  const calculateETA = (driverLocation) => {
    if (!trackingData?.destination) return;
    
    const destination = trackingData.destination;
    const distance = Math.sqrt(
      Math.pow(driverLocation.lat - destination.latitude, 2) +
      Math.pow(driverLocation.lng - destination.longitude, 2)
    ) * 111000; // Conversion en mètres
    
    const estimatedMinutes = Math.max(5, Math.round(distance / 500)); // 500m/min
    setEstimatedTime(`${estimatedMinutes} min`);
  };

  // Mettre à jour l'ETA selon le statut
  const updateETAForStatus = (status) => {
    switch(status) {
      case 'preparing':
        setEstimatedTime('15 min');
        break;
      case 'driver_assigned':
        setEstimatedTime('12 min');
        break;
      case 'en_route':
        setEstimatedTime('8 min');
        break;
      case 'arrived':
        setEstimatedTime('5 min');
        break;
      case 'picking_up':
        setEstimatedTime('3 min');
        break;
      case 'delivering':
        setEstimatedTime('2 min');
        break;
      default:
        setEstimatedTime('5 min');
    }
  };

  const getStatusInfo = (status) => {
    switch(status) {
      case 'preparing':
        return {
          title: 'Préparation de la commande',
          subtitle: 'Votre commande est en cours de préparation',
          icon: 'box',
          color: '#FF9800',
          progress: 10
        };
      case 'driver_assigned':
        return {
          title: 'Livreur attribué',
          subtitle: 'Un livreur a été assigné à votre commande',
          icon: 'person',
          color: '#2196F3',
          progress: 20
        };
      case 'en_route':
        return {
          title: 'Livreur en route',
          subtitle: 'Votre livreur se dirige vers le point de collecte',
          icon: 'bicycle',
          color: '#FF9800',
          progress: 30
        };
      case 'arrived':
        return {
          title: 'Livreur arrivé',
          subtitle: 'Le livreur est arrivé au point de collecte',
          icon: 'location',
          color: '#2196F3',
          progress: 50
        };
      case 'picking_up':
        return {
          title: 'Récupération du colis',
          subtitle: 'Le livreur récupère votre commande',
          icon: 'bag-handle',
          color: '#9C27B0',
          progress: 60
        };
      case 'delivering':
        return {
          title: 'Livraison en cours',
          subtitle: 'Votre commande est en route vers vous',
          icon: 'car',
          color: '#4CAF50',
          progress: 80
        };
      case 'delivered':
        return {
          title: 'Livraison terminée',
          subtitle: 'Votre commande a été livrée avec succès',
          icon: 'checkmark-circle',
          color: '#4CAF50',
          progress: 100
        };
      default:
        return {
          title: 'En attente',
          subtitle: 'Préparation de votre commande',
          icon: 'time',
          color: '#666',
          progress: 0
        };
    }
  };

  const handleStatusAction = () => {
    switch(currentStatus) {
      case 'arrived':
        Alert.alert(
          'Livreur arrivé',
          'Le livreur est arrivé au point de collecte. Confirmez-vous la récupération ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Confirmer', 
              onPress: () => setCurrentStatus('picking_up')
            }
          ]
        );
        break;
      case 'picking_up':
        Alert.alert(
          'Colis récupéré',
          'Le livreur a récupéré votre commande. Démarrer la livraison ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Démarrer', 
              onPress: () => setCurrentStatus('delivering')
            }
          ]
        );
        break;
      case 'delivering':
        Alert.alert(
          'Livraison terminée',
          'Confirmez-vous que la livraison est terminée ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Terminer', 
              onPress: () => setCurrentStatus('delivered')
            }
          ]
        );
        break;
      case 'delivered':
        setShowRatingCard(true);
        break;
    }
  };

  const handleRatingComplete = (rating) => {
    console.log('✅ Notation complétée:', rating);
    setShowRatingCard(false);
    Alert.alert(
      'Merci !',
      `Votre note de ${rating}/5 a été enregistrée.`,
      [
        {
          text: 'Retour à l\'accueil',
          onPress: () => navigation.navigate('Home')
        }
      ]
    );
  };

  const statusInfo = getStatusInfo(currentStatus);

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
        </View>
      </View>

      {/* Informations livreur flottantes - SUPPRIMÉE pour une interface plus propre */}

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
    margin: 0,
    padding: 0,
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 152, 0, 0.95)',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 100,
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
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    margin: 0,
    padding: 0,
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
    margin: 0,
    padding: 0,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 1000,
  },
  statusSection: {
    marginBottom: 20,
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
  // Styles de la card livreur supprimés pour une interface plus propre
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  realtimeText: {
    fontSize: scaleFont(10),
    fontFamily: 'Montserrat',
    marginLeft: 4,
  },
  orderSection: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  orderAmount: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
  orderAddress: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  estimatedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  estimatedTimeText: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    marginLeft: 6,
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  realtimeText: {
    fontSize: scaleFont(12),
    fontFamily: 'Montserrat-Medium',
    marginLeft: 6,
  },
  livreurCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 16,
  },
  livreurInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livreurAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  livreurDetails: {
    flex: 1,
  },
  livreurName: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  livreurRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livreurRatingText: {
    fontSize: scaleFont(14),
    color: '#FFA000',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  livreurVehicle: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    marginLeft: 4,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  map: {
    flex: 1,
    borderRadius: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderInfo: {
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderText: {
    fontSize: scaleFont(14),
    color: '#333',
    fontFamily: 'Montserrat',
    marginLeft: 8,
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  itemsTitle: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  itemQuantity: {
    fontSize: scaleFont(14),
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
  actionContainer: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
});

export default OrderTrackingScreen;
