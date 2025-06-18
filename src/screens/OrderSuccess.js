import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking, Platform } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useCart } from '../context/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OrderSuccess = ({ navigation, route }) => {
  const { orderDetails } = route.params;
  const { currentLanguage } = useLanguage();
  const { clearCart } = useCart();
  const t = translations[currentLanguage];
  const [estimatedTime, setEstimatedTime] = useState('15-20');
  const [estimatedDistance, setEstimatedDistance] = useState('2.5');

  // Nettoyer le panier au montage du composant
  useEffect(() => {
    const cleanupCart = async () => {
      try {
        await AsyncStorage.removeItem('cart');
        await clearCart();
      } catch (error) {
        console.error("Erreur lors du nettoyage du panier:", error);
      }
    };
    cleanupCart();
  }, []);

  // Simuler le temps de livraison
  useEffect(() => {
    const randomTime = Math.floor(Math.random() * 10) + 15; // 15-25 minutes
    const randomDistance = (Math.random() * 2 + 1).toFixed(1); // 1-3 km
    setEstimatedTime(`${randomTime}`);
    setEstimatedDistance(randomDistance);
  }, []);

  const handleGoToOrders = () => {
    // Navigation vers l'historique des commandes
    navigation.reset({
      index: 0,
      routes: [
        { name: 'MainApp' },
        { name: 'OrdersHistory' }
      ],
    });
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
          Votre commande a été enregistrée avec succès.
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
              Temps estimé : {estimatedTime} minutes
            </Text>
          </View>
          
          <View style={styles.orderDetailRow}>
            <Ionicons name="location-outline" size={24} color="#51A905" />
            <Text style={styles.orderDetailText}>
              Distance : {estimatedDistance} km
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