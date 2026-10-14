import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';
import { getDistanceToRestaurant, formatDistance } from '../services/LocationService';
import { setPaymentFlowHandlers } from '../navigation/paymentFlowBridge';

const OrderScreen = ({ route, navigation }) => {
  const { cartItems = [], totalAmount = 0 } = route.params || {};
  const { clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState(5); // Distance par défaut
  const [deliveryFee, setDeliveryFee] = useState(1000); // Frais par défaut
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const finalTotal = totalAmount + deliveryFee;

  // Fonction pour calculer les frais de livraison selon la distance
  const calculateDeliveryFee = (distance) => {
    if (!distance || isNaN(distance)) {
      return 1000; // Frais par défaut si pas de distance
    }
    
    const distanceNum = parseFloat(distance);
    
    if (distanceNum <= 5) {
      return 1000; // Zone 1 : 0-5km : 1000 FCFA
    } else if (distanceNum <= 10) {
      return 1500; // Zone 2 : 5-10km : 1500 FCFA
    } else if (distanceNum <= 15) {
      return 2000; // Zone 3 : 10-15km : 2000 FCFA
    } else if (distanceNum <= 20) {
      return 2500; // Zone 4 : 15-20km : 2500 FCFA
    } else if (distanceNum <= 30) {
      return 3000; // Zone 5 : 20-30km : 3000 FCFA
    } else {
      return 3000; // Au-delà de 30km : 3000 FCFA (Zone 5)
    }
  };

  // Fonction pour obtenir la description des frais
  const getDeliveryFeeDescription = (distance) => {
    if (!distance || isNaN(distance)) {
      return "Frais de livraison (distance non disponible)";
    }
    
    const distanceNum = parseFloat(distance);
    
    if (distanceNum <= 5) {
      return `Frais de livraison (Zone 1: 0-5km)`;
    } else if (distanceNum <= 10) {
      return `Frais de livraison (Zone 2: 5-10km)`;
    } else if (distanceNum <= 15) {
      return `Frais de livraison (Zone 3: 10-15km)`;
    } else if (distanceNum <= 20) {
      return `Frais de livraison (Zone 4: 15-20km)`;
    } else if (distanceNum <= 30) {
      return `Frais de livraison (Zone 5: 20-30km)`;
    } else {
      return `Frais de livraison (Zone 5: 20-30km+)`;
    }
  };

  // Calculer les frais quand la distance change
  useEffect(() => {
    const calculatedFee = calculateDeliveryFee(deliveryDistance);
    setDeliveryFee(calculatedFee);
  }, [deliveryDistance]);

  // Obtenir la géolocalisation au chargement de l'écran
  useEffect(() => {
    const getLocationAndCalculateFee = async () => {
      setIsLoadingLocation(true);
      try {
        const distance = await getDistanceToRestaurant();
        setDeliveryDistance(distance);
        console.log('📍 Distance obtenue (OrderScreen):', distance, 'km');
      } catch (error) {
        console.log('⚠️ Erreur géolocalisation (OrderScreen):', error.message);
        // Garder la distance par défaut (5km)
        Alert.alert(
          'Localisation non disponible',
          'Impossible d\'obtenir votre position. Les frais de livraison seront calculés avec une distance par défaut.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getLocationAndCalculateFee();
  }, []); // Se déclenche une seule fois au chargement

  const saveOrder = async (orderDetails) => {
    try {
      const orderNumber = Date.now().toString();
      const newOrder = {
        orderNumber,
        date: new Date().toISOString(),
        items: cartItems,
        totalAmount: finalTotal,
        status: 'pending',
        deliveryInfo: {
          address,
          phone,
          rating
        },
        ...orderDetails
      };

      const existingOrders = await AsyncStorage.getItem('orders');
      const orders = existingOrders ? JSON.parse(existingOrders) : [];
      orders.push(newOrder);
      await AsyncStorage.setItem('orders', JSON.stringify(orders));
      
      await clearCart();
      
      // Navigation vers l'écran de succès
      navigation.navigate('OrderSuccess', {
        orderDetails: {
          ...orderDetails,
          orderNumber
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la commande:', error);
      Alert.alert("Erreur", "Une erreur est survenue lors de l'enregistrement de la commande");
    }
  };

  const handlePayment = () => {
    if (!address.trim() || !phone.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Validation du numéro de téléphone (exemple simple)
    const phoneRegex = /^\d{8,}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      Alert.alert("Erreur", "Veuillez entrer un numéro de téléphone valide");
      return;
    }

    setPaymentFlowHandlers({
      onSuccess: saveOrder,
      onCancel: () => {},
    });
    navigation.navigate('Payment', {
      orderDetails: {
        items: cartItems,
        subtotal: totalAmount,
        deliveryFee,
        total: finalTotal,
        address,
        phone,
        rating,
        orderId: route.params?.orderId,
      },
    });
  };

  // Fonction pour gérer le clic sur une étoile
  const handleRatingPress = (selectedRating) => {
    setRating(selectedRating);
  };

  // Rendu des étoiles
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity 
          key={i} 
          onPress={() => handleRatingPress(i)}
          style={styles.starContainer}
        >
          <Ionicons 
            name={i <= rating ? "star" : "star-outline"} 
            size={28} 
            color={i <= rating ? "#FFD700" : "#CCCCCC"} 
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Récapitulatif de la commande</Text>
        </View>

        {/* Articles commandés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles ({cartItems.length})</Text>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>Quantité: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{item.price}</Text>
            </View>
          ))}
        </View>

        {/* Informations de livraison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de livraison</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Adresse de livraison *"
              value={address}
              onChangeText={setAddress}
            />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Numéro de téléphone *"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          
          {/* Système d'étoiles pour la note */}
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Évaluation de la livraison:</Text>
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>
            <Text style={styles.ratingText}>
              {rating > 0 ? `${rating} étoile${rating > 1 ? 's' : ''}` : 'Aucune évaluation'}
            </Text>
          </View>
        </View>

        {/* Récapitulatif des prix */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Sous-total</Text>
            <Text style={styles.priceValue}>{totalAmount} FCFA</Text>
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
            <Text style={styles.totalValue}>{finalTotal} FCFA</Text>
          </View>
        </View>

        {/* Bouton de paiement */}
        <TouchableOpacity 
          style={styles.paymentButton} 
          onPress={handlePayment}
        >
          <Text style={styles.paymentButtonText}>
            Procéder au paiement ({finalTotal} FCFA)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  header: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  itemPrice: {
    fontSize: 14,
    color: '#51A905',
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    height: 42,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  // Nouveaux styles pour le système d'étoiles
  ratingContainer: {
    marginTop: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Montserrat-Bold',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starContainer: {
    padding: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 5,
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
  scrollViewContent: {
    paddingBottom: Platform.OS === 'android' ? 80 : 30,
  },
  paymentButton: {
    backgroundColor: '#51A905',
    margin: 12,
    marginTop: 5,
    marginBottom: Platform.OS === 'android' ? 70 : 20,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  loadingText: {
    fontSize: 14,
    color: '#51A905',
    fontFamily: 'Montserrat-Regular',
  },
});

export default OrderScreen;