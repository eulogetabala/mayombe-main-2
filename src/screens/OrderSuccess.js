import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking, Platform } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useCart } from '../context/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { saveOrder } from '../services/orderHistoryService';

const OrderSuccess = ({ navigation, route }) => {
  const { orderDetails, showTracking } = route.params;
  const { currentLanguage } = useLanguage();
  const { clearCart } = useCart();
  const t = translations[currentLanguage];
  const [estimatedTime, setEstimatedTime] = useState('...');
  const [estimatedDistance, setEstimatedDistance] = useState('...');
  const [userLocation, setUserLocation] = useState(null);

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
    return (R * c).toFixed(2);
  };

  // Calcul de la durée estimée de livraison selon la distance
  const getEstimatedDeliveryTime = (distance) => {
    if (!distance) return '...';
    // Exemple : 5 min de base + 2 min par km
    const base = 5;
    const perKm = 2;
    const estimated = Math.round(base + perKm * parseFloat(distance));
    return `${estimated}`;
  };

  // Récupérer la position de l'utilisateur et calculer la vraie distance
  useEffect(() => {
    const getLocationAndCalculateDistance = async () => {
      try {
        // Demander la permission de localisation
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission de localisation refusée');
          return;
        }

        // Obtenir la position actuelle
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);

        // Vérifier si on a les coordonnées du restaurant
        if (orderDetails.restaurant && orderDetails.restaurant.altitude && orderDetails.restaurant.longitude) {
          const lat = parseFloat(orderDetails.restaurant.altitude);
          const lon = parseFloat(orderDetails.restaurant.longitude);
          
          // Vérifier que les coordonnées sont plausibles
          const plausible = lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
          
          if (plausible) {
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              lat,
              lon
            );
            setEstimatedDistance(distance);
            setEstimatedTime(getEstimatedDeliveryTime(distance));
          } else {
            console.log('Coordonnées du restaurant invalides');
            // Utiliser des valeurs par défaut
            setEstimatedDistance('2.5');
            setEstimatedTime('15');
          }
        } else {
          console.log('Coordonnées du restaurant non disponibles');
          // Utiliser des valeurs par défaut
          setEstimatedDistance('2.5');
          setEstimatedTime('15');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de la position:', error);
        // Utiliser des valeurs par défaut en cas d'erreur
        setEstimatedDistance('2.5');
        setEstimatedTime('15');
      }
    };

    getLocationAndCalculateDistance();
  }, [orderDetails]);

  // Nettoyer le panier et sauvegarder la commande au montage du composant
  useEffect(() => {
    const cleanupCartAndSaveOrder = async () => {
      try {
        // Sauvegarder la commande dans l'historique
        await saveOrder(orderDetails);
        
        // Nettoyer le panier
        await AsyncStorage.removeItem('cart');
        await clearCart();
      } catch (error) {
        console.error("Erreur lors du nettoyage du panier et de la sauvegarde:", error);
      }
    };
    cleanupCartAndSaveOrder();
  }, []);

  // Redirection automatique vers le tracking pour les paiements cash
  useEffect(() => {
    if (showTracking && orderDetails.payment_method === 'cash') {
      // Attendre un peu pour que l'utilisateur voie le message de succès
      const timer = setTimeout(() => {
        handleTrackOrder();
      }, 2000); // 2 secondes de délai

      return () => clearTimeout(timer);
    }
  }, [showTracking, orderDetails.payment_method]);

  const handleGoToOrders = () => {
    // Navigation vers l'historique des commandes
    navigation.navigate('OrdersHistory');
  };

  const handleGoHome = () => {
    // Retour à l'accueil en réinitialisant la pile de navigation
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleTrackOrder = () => {
    // Navigation vers l'écran de suivi de commande
    navigation.navigate('OrderTracking', { orderDetails });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark-circle" size={100} color="#51A905" />
        </View>
        
        <Text style={styles.title}>Commande Confirmée !</Text>
        <Text style={styles.subtitle}>
          {orderDetails.payment_method === 'cash' 
            ? 'Votre commande a été enregistrée. Vous paierez à la livraison.'
            : 'Votre commande a été enregistrée avec succès.'
          }
        </Text>
        
        <View style={styles.orderDetailsContainer}>
          <View style={styles.orderDetailRow}>
            <Ionicons name="receipt-outline" size={24} color="#51A905" />
            <Text style={styles.orderDetailText}>
              Montant total : {orderDetails.total} FCFA
            </Text>
          </View>
          
          <View style={styles.orderDetailRow}>
            <Ionicons name="time-outline" size={24} color="#51A905" />
            <Text style={styles.orderDetailText}>
              Temps estimé : {estimatedTime === '...' ? 'Calcul en cours...' : `${estimatedTime} minutes`}
            </Text>
          </View>
          
          <View style={styles.orderDetailRow}>
            <Ionicons name="location-outline" size={24} color="#51A905" />
            <Text style={styles.orderDetailText}>
              Distance : {estimatedDistance === '...' ? 'Calcul en cours...' : `${estimatedDistance} km`}
            </Text>
          </View>
          
          <View style={styles.orderDetailRow}>
            <Ionicons name="bicycle-outline" size={24} color="#51A905" />
            <Text style={styles.orderDetailText}>
              Livreur : En route vers vous
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.trackButton]}
            onPress={handleTrackOrder}
          >
            <Ionicons name="navigate" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Suivre ma commande</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={handleGoToOrders}
          >
            <Ionicons name="list" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Voir mes commandes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={handleGoHome}
          >
            <Ionicons name="home" size={24} color="#51A905" style={styles.buttonIcon} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Retour à l'accueil
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.thankYouContainer}>
          <Text style={styles.thankYouText}>
            Merci de votre confiance !
          </Text>
          <Text style={styles.thankYouSubtext}>
            Nous apprécions votre commande et espérons vous revoir bientôt.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  successIconContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(81, 169, 5, 0.1)',
    borderRadius: 60,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    fontFamily: 'Montserrat',
  },
  orderDetailsContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderDetailText: {
    fontSize: 16,
    marginLeft: 15,
    fontFamily: 'Montserrat',
    color: '#333',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  trackButton: {
    backgroundColor: '#FF6B00',
  },
  primaryButton: {
    backgroundColor: '#51A905',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#51A905',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#51A905',
  },
  thankYouContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  thankYouText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    fontFamily: 'Montserrat-Bold',
  },
  thankYouSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
});

export default OrderSuccess; 