import React, { useState, useEffect } from 'react';
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
  TextInput,
  FlatList,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddressModal from '../components/AddressModal';
import CountryPicker, { 
  CountryModalProvider,
  DARK_THEME,
  DEFAULT_THEME
} from "react-native-country-picker-modal";
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const { width, height } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const PaymentScreen = ({ route, navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const { orderDetails, onPaymentSuccess } = route.params;
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [countryCode, setCountryCode] = useState("CG"); // Code pays par défaut (Congo)
  const [callingCode, setCallingCode] = useState("242"); // Indicatif par défaut (Congo)

  const paymentMethods = [
    {
      id: 'airtel',
      name: 'Airtel Money',
      logo: require('../../assets/images/airtel.png'),
      disabled: true,
      description: 'Disponible bientôt'
    },
    {
      id: 'mtn',
      name: 'MTN Mobile Money',
      logo: require('../../assets/images/mtn.jpeg'),
      disabled: false,
      description: 'Paiement mobile sécurisé'
    },
    {
      id: 'cb',
      name: 'Carte Bancaire',
      logo: require('../../assets/images/visa-mastercard.webp'),
      disabled: false,
      description: 'Visa, Mastercard acceptées'
    },
    {
      id: 'cash',
      name: 'Paiement à la livraison',
      logo: require('../../assets/images/cash.jpg'),
      disabled: false,
      description: 'Payer à la réception'
    },
  ];

  // Fonction pour enregistrer le mode de paiement via l'API
  const savePaymentMethod = async (paymentMethod) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert("Erreur", "Vous devez être connecté pour effectuer cette action");
        return false;
      }
      
      if (!orderDetails.orderId) {
        console.error("Erreur: ID de commande manquant", orderDetails);
        Alert.alert("Erreur", "Impossible de trouver l'identifiant de la commande");
        return false;
      }
      
      const requestData = {
        order_id: orderDetails.orderId,
        payment_method: paymentMethod
      };
      
      const response = await fetch(`${API_BASE_URL}/mode-paiement`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("Mode de paiement enregistré avec succès:", data);
        return true;
      } else {
        console.error("Erreur lors de l'enregistrement du mode de paiement:", data);
        return false;
      }
    } catch (error) {
      console.error("Erreur détaillée lors de l'enregistrement du mode de paiement:", error.message, error.stack);
      return false;
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner un mode de paiement');
      return;
    }

    // Vérifier si la méthode sélectionnée est désactivée
    const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);
    if (selectedMethodData && selectedMethodData.disabled) {
      Alert.alert(
        'Mode de paiement non disponible',
        'Le mode de paiement sélectionné n\'est pas encore disponible. Veuillez choisir un autre mode de paiement.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse de livraison');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone de livraison');
      return;
    }

    setIsProcessing(true);

    const paymentMethodSaved = await savePaymentMethod(selectedMethod);
    
    if (!paymentMethodSaved) {
      Alert.alert("Erreur", "Impossible d'enregistrer le mode de paiement. Veuillez réessayer.");
      setIsProcessing(false);
      return;
    }

    proceedWithPayment({
      ...orderDetails,
      paymentMethod: selectedMethod,
      address: address,
      phone: phone,
    });
  };

  // Fonction pour continuer le processus de paiement
  const proceedWithPayment = (updatedOrderDetails) => {
    if (selectedMethod === 'cash') {
      // Pour le paiement à la livraison, on confirme directement
      Alert.alert(
        'Confirmation',
        'Votre commande a été enregistrée. Vous paierez à la livraison.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsProcessing(false);
              // Appeler la fonction de succès de paiement avec les détails mis à jour
              if (onPaymentSuccess) {
                onPaymentSuccess(updatedOrderDetails);
              } else {
                navigation.navigate('OrderSuccess', { orderDetails: updatedOrderDetails });
              }
            },
          },
        ]
      );
    } else {
      // Pour les autres modes, on redirige vers l'écran de paiement
      setIsProcessing(false);
      
      // Rediriger vers l'écran de paiement spécifique
      navigation.navigate('ProcessPayment', {
        orderDetails: {
          ...updatedOrderDetails,
          address: address,
        },
        onPaymentSuccess: onPaymentSuccess,
      });
    }
  };

  const handleAddressSelect = (address) => {
    setAddress(address);
  };

  const handleMethodSelection = (methodId) => {
    const method = paymentMethods.find(m => m.id === methodId);
    
    if (method && method.disabled) {
      Alert.alert(
        'Mode de paiement non disponible',
        'Le paiement par Airtel Money n\'est pas encore disponible. Veuillez choisir un autre mode de paiement.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedMethod(methodId);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sélectionnez votre mode de paiement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.methodsContainer}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.selectedMethod,
                method.disabled && styles.disabledMethod,
              ]}
              onPress={() => handleMethodSelection(method.id)}
            >
              <Image 
                source={method.logo} 
                style={[
                  styles.methodLogo,
                  method.disabled && styles.disabledLogo
                ]} 
              />
              <View style={styles.methodInfo}>
                <Text style={[
                  styles.methodName,
                  method.disabled && styles.disabledText
                ]}>
                  {method.name}
                </Text>
                <Text style={[
                  styles.methodDescription,
                  method.disabled && styles.disabledText
                ]}>
                  {method.description}
                </Text>
              </View>
              {method.disabled && (
                <View style={styles.comingSoonBadge}>
                  <Ionicons name="time-outline" size={16} color="#FFA500" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Adresse de livraison</Text>
          <TouchableOpacity 
            style={styles.addressInput}
            onPress={() => setAddressModalVisible(true)}
          >
            <Ionicons name="location-outline" size={20} color="#FF6B00" style={styles.addressIcon} />
            <Text style={address ? styles.addressText : styles.placeholderText} numberOfLines={1}>
              {address || 'Sélectionnez votre adresse de livraison'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t.payment.deliveryPhone}</Text>
          <View style={styles.phoneInput}>
            <View style={styles.countryPickerContainer}>
              <CountryPicker
                containerButtonStyle={styles.countryButton}
                countryCode={countryCode}
                withFilter
                withFlag
                withCallingCode
                withCallingCodeButton
                onSelect={(country) => {
                  setCountryCode(country.cca2);
                  setCallingCode(country.callingCode[0]);
                }}
                translation={currentLanguage}
                theme={Platform.OS === 'ios' ? DEFAULT_THEME : DARK_THEME}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t.payment.enterPhoneNumber}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>{t.payment.summary}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.payment.subtotal}</Text>
            <Text style={styles.summaryValue}>
              {orderDetails.subtotal} FCFA
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.payment.deliveryFee}</Text>
            <Text style={styles.summaryValue}>
              {orderDetails.deliveryFee} FCFA
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t.payment.total}</Text>
            <Text style={styles.totalValue}>{orderDetails.total} FCFA</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedMethod || isProcessing) && styles.payButtonDisabled,
          ]}
          onPress={handleProceedToPayment}
          disabled={!selectedMethod || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.payButtonText}>
              {t.payment.proceedToPayment.replace('{amount}', orderDetails.total)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <AddressModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSelectAddress={handleAddressSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
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
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat',
  },
  methodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  methodCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: scaleFont(12),
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedMethod: {
    borderColor: '#51A905',
    backgroundColor: '#F0F9ED',
  },
  methodLogo: {
    width: scaleFont(40),
    height: scaleFont(40),
    resizeMode: 'contain',
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodName: {
    fontSize: scaleFont(15),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  methodDescription: {
    fontSize: scaleFont(12),
    color: '#666',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 12,
    marginTop: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  summaryValue: {
    fontSize: scaleFont(14),
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalValue: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 20 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  payButton: {
    backgroundColor: '#51A905',
    padding: scaleFont(15),
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 90,
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  scrollViewContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: scaleFont(12),
    color: '#666',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  addressInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: scaleFont(12),
    backgroundColor: '#fff',
  },
  addressIcon: {
    marginRight: 8,
  },
  addressText: {
    fontSize: scaleFont(16),
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    fontSize: scaleFont(16),
    color: '#999',
    flex: 1,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    height: scaleFont(50),
    marginBottom: 15,
  },
  countryPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countryButton: {
    padding: 0,
  },
  countryButtonText: {
    fontSize: scaleFont(14),
    color: '#333',
    fontFamily: 'Montserrat',
  },
  disabledMethod: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  disabledLogo: {
    opacity: 0.7,
  },
  disabledText: {
    color: '#999',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
});

export default PaymentScreen; 