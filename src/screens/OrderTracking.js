import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import MapView, { Marker, Polyline } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const OrderTracking = ({ route, navigation }) => {
  const { orderDetails } = route.params;
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  
  const [userLocation, setUserLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(15);
  const [estimatedDistance, setEstimatedDistance] = useState(2.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [deliveryStatus, setDeliveryStatus] = useState('en_route');
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1 = normal, 2 = fast, 3 = very fast
  
  const mapRef = useRef(null);
  const animationRef = useRef(null);
  
  // Simuler la position du livreur avec animation
  const simulateDeliveryLocation = () => {
    if (!userLocation) return;
    
    // Calculer la direction vers l'utilisateur
    const dx = userLocation.longitude - deliveryLocation?.longitude || 0;
    const dy = userLocation.latitude - deliveryLocation?.latitude || 0;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Vitesse de déplacement (accélérée pour la simulation)
    const speed = 0.0005 * simulationSpeed; // Accéléré pour un mouvement plus rapide
    
    // Nouvelle position (déplacement direct vers l'utilisateur)
    const newLocation = {
      latitude: (deliveryLocation?.latitude || userLocation.latitude - 0.01) + (dy / distance) * speed,
      longitude: (deliveryLocation?.longitude || userLocation.longitude - 0.01) + (dx / distance) * speed,
    };
    
    // Vérifier si le livreur est très proche de l'utilisateur
    const distanceToUser = Math.sqrt(
      Math.pow(newLocation.latitude - userLocation.latitude, 2) +
      Math.pow(newLocation.longitude - userLocation.longitude, 2)
    );
    
    // Si le livreur est très proche, le positionner exactement à la position de l'utilisateur
    if (distanceToUser < 0.0001) {
      newLocation.latitude = userLocation.latitude;
      newLocation.longitude = userLocation.longitude;
    }
    
    setDeliveryLocation(newLocation);
    
    // Mettre à jour le temps estimé et la distance plus rapidement
    if (estimatedTime > 0) {
      setEstimatedTime(prev => Math.max(0, prev - 0.2 * simulationSpeed)); // Accéléré pour une diminution plus rapide
    }
    
    if (estimatedDistance > 0) {
      setEstimatedDistance(prev => Math.max(0, prev - 0.04 * simulationSpeed)); // Accéléré pour une diminution plus rapide
    }
    
    // Vérifier si le livreur est arrivé
    if (estimatedTime <= 0 && estimatedDistance <= 0 && deliveryStatus === 'en_route') {
      setDeliveryStatus('arrived');
      
      // Forcer la position finale du livreur à être exactement celle de l'utilisateur
      setDeliveryLocation({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
      
      // Afficher le popup après un court délai
      setTimeout(() => {
        setDeliveryStatus('completed');
        setShowRatingModal(true);
      }, 1000); // Délai réduit
    }
    
    // Centrer la carte sur les deux marqueurs
    if (mapRef.current && userLocation && newLocation) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: newLocation.latitude, longitude: newLocation.longitude }
        ],
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true
        }
      );
    }
  };
  
  // Obtenir la position de l'utilisateur
  useEffect(() => {
    const getLocation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setError('Permission de localisation refusée');
          setIsLoading(false);
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        // Position initiale du livreur (plus éloignée pour mieux voir le mouvement)
        setDeliveryLocation({
          latitude: location.coords.latitude - 0.01,
          longitude: location.coords.longitude - 0.01,
        });
        
        setIsLoading(false);
        
        // Démarrer l'animation plus rapidement (25 FPS)
        const interval = setInterval(simulateDeliveryLocation, 40);
        
        return () => {
          clearInterval(interval);
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        };
      } catch (err) {
        console.error('Erreur lors de la récupération de la position:', err);
        setError('Impossible de récupérer votre position');
        setIsLoading(false);
      }
    };
    
    getLocation();
  }, []);
  
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setEstimatedTime(15);
    setEstimatedDistance(2.5);
    setDeliveryStatus('en_route');
    setSimulationSpeed(1);
    setShowRatingModal(false);
    
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
      .then(location => {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        // Position initiale du livreur (plus éloignée)
        setDeliveryLocation({
          latitude: location.coords.latitude - 0.01,
          longitude: location.coords.longitude - 0.01,
        });
        
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Erreur lors de la récupération de la position:', err);
        setError('Impossible de récupérer votre position');
        setIsLoading(false);
      });
  };
  
  const handleSpeedChange = () => {
    setSimulationSpeed(prev => {
      if (prev >= 3) return 1;
      return prev + 1;
    });
  };
  
  const handleRating = (value) => {
    setRating(value);
  };
  
  const handleSubmitRating = () => {
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez donner une note au livreur');
      return;
    }
    
    Alert.alert('Merci', 'Votre note a été enregistrée');
    setShowRatingModal(false);
    navigation.goBack();
  };
  
  const getStatusText = () => {
    switch (deliveryStatus) {
      case 'en_route':
        return 'En route vers vous';
      case 'arrived':
        return 'Livreur arrivé';
      case 'completed':
        return 'Livraison terminée';
      default:
        return 'En route vers vous';
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suivi de commande</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.speedButton} onPress={handleSpeedChange}>
            <Text style={styles.speedButtonText}>
              {simulationSpeed === 1 ? '1x' : simulationSpeed === 2 ? '2x' : '3x'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#51A905" />
          <Text style={styles.loadingText}>Chargement de la carte...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color="#FF6B00" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'ios' ? undefined : 'google'}
              initialRegion={{
                latitude: userLocation?.latitude || 0,
                longitude: userLocation?.longitude || 0,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              showsScale={true}
            >
              {userLocation && (
                <Marker
                  coordinate={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                  }}
                  title="Votre position"
                  description="Point de livraison"
                >
                  <View style={styles.userMarker}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                </Marker>
              )}
              
              {deliveryLocation && (
                <Marker
                  coordinate={{
                    latitude: deliveryLocation.latitude,
                    longitude: deliveryLocation.longitude,
                  }}
                  title="Livreur"
                  description={getStatusText()}
                >
                  <View style={styles.deliveryMarker}>
                    <Ionicons name="bicycle" size={20} color="#fff" />
                  </View>
                </Marker>
              )}
              
              {userLocation && deliveryLocation && (
                <Polyline
                  coordinates={[
                    {
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    },
                    {
                      latitude: deliveryLocation.latitude,
                      longitude: deliveryLocation.longitude,
                    },
                  ]}
                  strokeColor="#FF6B00"
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              )}
            </MapView>
          </View>
          
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={24} color="#51A905" />
              <Text style={styles.infoText}>
                Temps estimé : {Math.ceil(estimatedTime)} minutes
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={24} color="#51A905" />
              <Text style={styles.infoText}>
                Distance : {estimatedDistance.toFixed(1)} km
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="bicycle-outline" size={24} color="#51A905" />
              <Text style={styles.infoText}>
                Livreur : {getStatusText()}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="receipt-outline" size={24} color="#51A905" />
              <Text style={styles.infoText}>
                Montant : {orderDetails.total} FCFA
              </Text>
            </View>
          </View>
        </>
      )}
      
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingTitle}>Évaluez votre livreur</Text>
            <Text style={styles.ratingSubtitle}>Comment était votre expérience de livraison ?</Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRating(star)}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={40}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitRating}
            >
              <Text style={styles.submitButtonText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  speedButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
  },
  speedButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  refreshButton: {
    padding: 10,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  userMarker: {
    backgroundColor: '#51A905',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  deliveryMarker: {
    backgroundColor: '#FF6B00',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  infoContainer: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 15,
    fontFamily: 'Montserrat',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#51A905',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  ratingContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  ratingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  ratingSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#51A905',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

export default OrderTracking; 