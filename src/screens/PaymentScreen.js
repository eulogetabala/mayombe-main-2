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
  SafeAreaView,
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
import { LinearGradient } from 'expo-linear-gradient';

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
      id: 'mambopay',
      name: 'MamboPay',
      logo: require('../../assets/images/mambo.jpeg'),
      disabled: false,
      description: 'Paiement mobile sécurisé'
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
      description: 'Paiement sécurisé par Stripe'
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
    console.log('🎯 handleProceedToPayment appelé avec selectedMethod:', selectedMethod);
    
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

    // Pour le paiement cash, on peut procéder sans adresse et téléphone
    console.log('🔍 Méthode de paiement sélectionnée:', selectedMethod);
    
    if (selectedMethod !== 'cash') {
      if (!address.trim()) {
        Alert.alert('Erreur', 'Veuillez entrer votre adresse de livraison');
        return;
      }

      if (!phone.trim()) {
        Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone de livraison');
        return;
      }
    }

    setIsProcessing(true);

    // Pour le paiement cash, on peut procéder même si savePaymentMethod échoue
    if (selectedMethod === 'cash') {
      console.log('🚀 Paiement cash sélectionné, redirection directe...');
      proceedWithPayment({
        ...orderDetails,
        paymentMethod: selectedMethod,
        address: address || orderDetails.address || '',
        phone: phone || orderDetails.phone || '',
      });
      return;
    }

    // Pour les autres méthodes, on vérifie que savePaymentMethod fonctionne
    const paymentMethodSaved = await savePaymentMethod(selectedMethod);
    
    if (!paymentMethodSaved) {
      Alert.alert("Erreur", "Impossible d'enregistrer le mode de paiement. Veuillez réessayer.");
      setIsProcessing(false);
      return;
    }

    proceedWithPayment({
      ...orderDetails,
      paymentMethod: selectedMethod,
      address: address || orderDetails.address || '',
      phone: phone || orderDetails.phone || '',
    });
  };

  // Fonction pour continuer le processus de paiement
  const proceedWithPayment = (updatedOrderDetails) => {
    console.log('🔄 proceedWithPayment appelé avec:', selectedMethod);
    
    if (selectedMethod === 'cash') {
      console.log('💵 Paiement cash détecté, redirection vers ProcessPayment...');
      
      // Pour le paiement cash, on passe aussi par ProcessPayment pour envoyer les données à l'API
      setIsProcessing(false);
      
      // Rediriger vers ProcessPayment pour le cash aussi
      navigation.navigate('ProcessPayment', {
        orderDetails: {
          ...updatedOrderDetails,
          address: address,
          paymentMethod: selectedMethod, // 'cash'
        },
        onPaymentSuccess: onPaymentSuccess,
      });
    } else {
      console.log('💳 Autre méthode de paiement, redirection vers ProcessPayment...');
      
      // Pour les autres modes, on redirige vers l'écran de paiement
      setIsProcessing(false);
      
      // Rediriger vers l'écran de paiement spécifique
      navigation.navigate('ProcessPayment', {
        orderDetails: {
          ...updatedOrderDetails,
          address: address,
          paymentMethod: selectedMethod, // Ajouter le paymentMethod sélectionné
        },
        onPaymentSuccess: onPaymentSuccess,
      });
    }
  };

  const handleAddressSelect = (address) => {
    setAddress(address);
  };

  const handleMethodSelection = (methodId) => {
    console.log('📱 handleMethodSelection appelé avec methodId:', methodId);
    
    const method = paymentMethods.find(m => m.id === methodId);
    
    if (method && method.disabled) {
      Alert.alert(
        'Mode de paiement non disponible',
        method.id === 'mambopay' 
          ? 'Le paiement par MamboPay n\'est pas encore disponible. Veuillez choisir un autre mode de paiement.'
          : 'Le paiement par carte bancaire n\'est pas encore disponible. Veuillez choisir un autre mode de paiement.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('✅ Méthode sélectionnée:', methodId);
    setSelectedMethod(methodId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9800" />
      <LinearGradient
        colors={['#FF9800', '#FF6B00']}
        style={styles.customHeader}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mode de paiement</Text>
            <Text style={styles.headerSubtitle}>Choisissez votre méthode de paiement préférée</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="card-outline" size={24} color="#fff" />
          </View>
        </View>
      </LinearGradient>

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
              <View style={styles.methodContent}>
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
          <Text style={styles.label}>
            <Ionicons name="location" size={16} color="#FF6B00" style={{ marginRight: 8 }} />
            Adresse de livraison
          </Text>
          <TouchableOpacity 
            style={styles.addressInput}
            onPress={() => setAddressModalVisible(true)}
          >
            <View style={styles.addressInputContent}>
              <Ionicons name="location-outline" size={20} color="#FF6B00" style={styles.addressIcon} />
              <View style={styles.addressTextContainer}>
                <Text style={address ? styles.addressText : styles.placeholderText} numberOfLines={2}>
                  {address || 'Sélectionnez votre adresse de livraison'}
                </Text>
                {address && (
                  <Text style={styles.addressHint}>Appuyez pour modifier</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" style={styles.addressArrow} />
            </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
  },
  customHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: scaleFont(14),
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
  },
  headerIcon: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    padding: scaleFont(15),
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 120,
  },
  selectedMethod: {
    borderColor: '#51A905',
    backgroundColor: '#F0F9ED',
  },
  methodContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  methodLogo: {
    width: scaleFont(50),
    height: scaleFont(50),
    resizeMode: 'contain',
    marginBottom: 8,
  },
  methodInfo: {
    alignItems: 'center',
  },
  methodName: {
    fontSize: scaleFont(12),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
  },
  methodDescription: {
    fontSize: scaleFont(10),
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat',
    textAlign: 'center',
    lineHeight: scaleFont(12),
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
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addressInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIcon: {
    marginRight: 12,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: scaleFont(14),
    color: '#333',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  placeholderText: {
    fontSize: scaleFont(14),
    color: '#999',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  addressHint: {
    fontSize: scaleFont(12),
    color: '#FF6B00',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  addressArrow: {
    marginLeft: 8,
  },
  addressHelpText: {
    fontSize: scaleFont(12),
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 6,
    fontStyle: 'italic',
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