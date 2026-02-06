import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const PaymentLivreurScreen = ({ route, navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const { orderDetails, onPaymentSuccess } = route.params;
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods = [
    {
      id: 'mambopay',
      name: 'MamboPay',
      logo: require('../../assets/images/mambo.jpeg'),
      disabled: false,
      color: '#E3F2FD',
      description: 'Paiement sécurisé par MamboPay'
    },
    {
      id: 'cb',
      name: 'Carte Bancaire',
      logo: require('../../assets/images/visa-mastercard.webp'),
      disabled: false,
      color: '#F3E5F5',
      description: 'Visa, Mastercard via Stripe'
    },
    {
      id: 'cash',
      name: 'Paiement cash',
      logo: require('../../assets/images/cash.jpg'),
      disabled: false,
      color: '#E8F5E9',
      description: 'Payer à réception'
    },
  ];

  const handleMethodSelection = (methodId) => {
    setSelectedMethod(methodId);
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner un mode de paiement');
      return;
    }

    setIsProcessing(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      
      // 1. Enregistrer le mode de paiement
      const response = await fetch(`${API_BASE_URL}/mode-paiement`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          order_id: orderDetails.orderId,
          payment_method: selectedMethod
        })
      });

      if (response.ok) {
        // 2. Naviguer vers l'écran de traitement final
        navigation.navigate('ProcessPayment', {
          orderDetails: {
            ...orderDetails,
            paymentMethod: selectedMethod,
          },
          onPaymentSuccess: onPaymentSuccess,
        });
      } else {
        const data = await response.json();
        Alert.alert('Erreur', data.message || "Erreur lors de l'enregistrement du paiement");
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header Premium */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card Résumé Premium */}
        <LinearGradient
          colors={['#FF9800', '#F57C00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryGradientCard}
        >
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.orderLabel}>TOTAL À PAYER</Text>
              <Text style={styles.orderTotal}>{(orderDetails.total || 0).toLocaleString()} FCFA</Text>
            </View>
            <MaterialCommunityIcons name="truck-delivery-outline" size={40} color="rgba(255,255,255,0.7)" />
          </View>
          
          <View style={styles.dashedDivider} />
          
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={styles.dot} />
              <Text style={styles.routeText} numberOfLines={1}>{orderDetails.deliveryDetails?.pickupAddress}</Text>
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.routePoint}>
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.routeText} numberOfLines={1}>{orderDetails.deliveryDetails?.deliveryAddress}</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Choisissez votre mode de paiement</Text>
        
        {/* Liste des méthodes de paiement */}
        <View style={styles.methodsGrid}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodItem,
                selectedMethod === method.id && styles.methodItemSelected
              ]}
              onPress={() => handleMethodSelection(method.id)}
            >
              <View style={[styles.logoContainer, { backgroundColor: method.color }]}>
                <Image source={method.logo} style={styles.methodLogo} />
              </View>
              <View style={styles.methodTextContainer}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodDesc}>{method.description}</Text>
              </View>
              <View style={[
                styles.selector,
                selectedMethod === method.id && styles.selectorActive
              ]}>
                {selectedMethod === method.id && <View style={styles.selectorDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Détails supplémentaires type Ticket */}
        <View style={styles.ticketSection}>
          <Text style={styles.sectionTitle}>Détails de la course</Text>
          <View style={styles.ticketCard}>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Colis</Text>
              <Text style={styles.ticketValue}>{orderDetails.deliveryDetails?.packageNature}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Destinataire</Text>
              <Text style={styles.ticketValue}>{orderDetails.deliveryDetails?.recipientName}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Distance</Text>
              <Text style={styles.ticketValue}>{orderDetails.distance?.toFixed(1) || 0} km</Text>
            </View>
            <View style={styles.ticketRow}>
              <Text style={styles.ticketLabel}>Date & Heure</Text>
              <Text style={styles.ticketValue}>{orderDetails.deliveryDetails?.deliveryDate} à {orderDetails.deliveryDetails?.deliveryTime}</Text>
            </View>
          </View>
        </View>

        {/* Bouton de confirmation déplacé ici pour être scrollable */}
        <View style={styles.paymentButtonContainer}>
          <TouchableOpacity
            style={[styles.payButton, !selectedMethod && styles.disabledButton]}
            onPress={handleConfirmPayment}
            disabled={!selectedMethod || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <LinearGradient
                colors={selectedMethod ? ['#FF9800', '#F57C00'] : ['#CCC', '#BBB']}
                style={styles.payButtonGradient}
              >
                <Text style={styles.payButtonText}>Confirmer le paiement</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{marginLeft: 8}} />
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  backButton: {
    padding: 5,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // Plus d'espace pour le bouton et le scroll
  },
  summaryGradientCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    letterSpacing: 1.5,
    fontFamily: 'Montserrat-Bold',
  },
  orderTotal: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Montserrat-Bold',
    marginTop: 4,
  },
  dashedDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 15,
    borderStyle: 'dashed',
  },
  routeContainer: {
    marginTop: 5,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  routeText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat',
    flex: 1,
  },
  routeConnector: {
    width: 2,
    height: 15,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginLeft: 4,
    marginVertical: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 20,
  },
  methodsGrid: {
    marginBottom: 30,
  },
  methodItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  methodItemSelected: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF9F1',
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodLogo: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  methodTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  methodName: {
    fontSize: 15,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  methodDesc: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  selector: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorActive: {
    borderColor: '#FF9800',
  },
  selectorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
  },
  ticketSection: {
    marginBottom: 30,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketLabel: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  ticketValue: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  paymentButtonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  payButton: {
    borderRadius: 18,
    height: 60,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  payButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

export default PaymentLivreurScreen;
