import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CountryPicker, { DEFAULT_THEME, DARK_THEME } from 'react-native-country-picker-modal';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const { width, height } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const ProcessPayment = ({ route, navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  
  const { orderDetails, onPaymentSuccess } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardType, setCardType] = useState('');
  const [cardTypeIcon, setCardTypeIcon] = useState('');
  const [countryCode, setCountryCode] = useState('CG');
  const [callingCode, setCallingCode] = useState('242');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');

  const paymentMethod = orderDetails?.paymentMethod || 'cash';

  // Fonction pour générer un payment_method_id pour Stripe
  const generatePaymentMethodId = () => {
    // Simulation d'un payment_method_id Stripe
    // En production, cela devrait être généré par Stripe.js
    return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Détection automatique du type de carte
  const detectCardType = (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    // Visa: commence par 4
    if (/^4/.test(cleanNumber)) {
      return { type: 'Visa', icon: 'card', cvvLength: 3 };
    }
    
    // Mastercard: commence par 51-55 ou 2221-2720
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7][2-9][0-9]/.test(cleanNumber) || /^222[1-9]/.test(cleanNumber)) {
      return { type: 'Mastercard', icon: 'card', cvvLength: 3 };
    }
    
    // American Express: commence par 34 ou 37
    if (/^3[47]/.test(cleanNumber)) {
      return { type: 'American Express', icon: 'card', cvvLength: 4 };
    }
    
    // Discover: commence par 6011, 622126-622925, 644-649, 65
    if (/^6(?:011|5[0-9]{2}|4[4-9][0-9]|22(?:12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]))/.test(cleanNumber)) {
      return { type: 'Discover', icon: 'card', cvvLength: 3 };
    }
    
    // JCB: commence par 2131, 1800, ou 35
    if (/^(?:2131|1800|35)/.test(cleanNumber)) {
      return { type: 'JCB', icon: 'card', cvvLength: 3 };
    }
    
    // Diners Club: commence par 300-305, 36, ou 38
    if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) {
      return { type: 'Diners Club', icon: 'card', cvvLength: 3 };
    }
    
    // UnionPay: commence par 62
    if (/^62/.test(cleanNumber)) {
      return { type: 'UnionPay', icon: 'card', cvvLength: 3 };
    }
    
    // Maestro: commence par 5018, 5020, 5038, 6304, 6759, 6761, 6763
    if (/^(?:5018|5020|5038|6304|6759|6761|6763)/.test(cleanNumber)) {
      return { type: 'Maestro', icon: 'card', cvvLength: 3 };
    }
    
    return { type: '', icon: 'card-outline', cvvLength: 3 };
  };

  // Validation du numéro de carte avec l'algorithme de Luhn
  const isValidCardNumber = (cardNumber) => {
    if (!cardNumber || cardNumber.length < 13) return false;
    
    let sum = 0;
    let isEven = false;
    
    // Parcourir le numéro de droite à gauche
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  // Validation des données de carte bancaire
  const validateCardData = () => {
    if (paymentMethod !== 'cb') return true;
    
    if (!cardNumber || cardNumber.length < 13) {
      Alert.alert('Erreur', 'Numéro de carte invalide');
      return false;
    }
    
    // Validation du numéro de carte (algorithme de Luhn)
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (!isValidCardNumber(cleanCardNumber)) {
      Alert.alert('Erreur', 'Numéro de carte invalide');
      return false;
    }
    
    if (!expiryDate || expiryDate.length !== 5) {
      Alert.alert('Erreur', 'Date d\'expiration invalide (format MM/YY)');
      return false;
    }
    
    // Validation de la date d'expiration
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Année sur 2 chiffres
    const currentMonth = currentDate.getMonth() + 1;
    
    if (parseInt(month) < 1 || parseInt(month) > 12) {
      Alert.alert('Erreur', 'Mois invalide (01-12)');
      return false;
    }
    
    if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      Alert.alert('Erreur', 'Carte expirée');
      return false;
    }
    
    // Validation du CVV selon le type de carte
    const detected = detectCardType(cardNumber);
    const expectedCvvLength = detected.cvvLength || 3;
    if (!cvv || cvv.length !== expectedCvvLength) {
      Alert.alert('Erreur', `Code CVV invalide (${expectedCvvLength} chiffres requis)`);
      return false;
    }
    
    if (!cardholderName || cardholderName.trim().length < 2) {
      Alert.alert('Erreur', 'Nom du titulaire de la carte requis');
      return false;
    }
    
    return true;
  };

  const proceedWithPayment = async () => {
    setIsLoading(true);

    try {
      // Validation des données de carte si nécessaire
      if (!validateCardData()) {
        setIsLoading(false);
        return;
      }

      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert("Erreur", "Vous devez être connecté pour effectuer cette action");
        setIsLoading(false);
        return;
      }

      // Préparer les données de paiement selon le format attendu par l'API
      const fullPhoneNumber = `+${callingCode}${phoneNumber.replace(/^0+/, '')}`;
      
      // Données de base pour tous les modes de paiement
      const paymentData = {
        order_id: orderDetails.orderId,
        total: orderDetails.total,
        delivery_address: orderDetails.address,
        delivery_phone: orderDetails.phone || fullPhoneNumber,
        payment_method: paymentMethod,
        operator: paymentMethod
      };

      // Ajouter les données spécifiques selon le mode de paiement
      if (paymentMethod === 'mtn') {
        // Utiliser le format international complet avec le 0 après l'indicatif
        const internationalPhoneNumber = `+${callingCode}0${phoneNumber.replace(/^0+/, '')}`;
        paymentData.phone_momo = internationalPhoneNumber;
        console.log("📱 Numéro MTN envoyé (format international):", internationalPhoneNumber);
      } else if (paymentMethod === 'cb') {
        // Données spécifiques pour carte bancaire
        paymentData.payment_method = 'cb';
        paymentData.operator = 'cb';
        paymentData.payment_method_id = generatePaymentMethodId(); // À implémenter
        console.log("💳 Paiement par carte bancaire");
      }

      // Ajouter phone_momo pour MTN
      if (paymentMethod === 'mtn') {
        // Utiliser le format international complet avec le 0 après l'indicatif
        const internationalPhoneNumber = `+${callingCode}0${phoneNumber.replace(/^0+/, '')}`;
        paymentData.phone_momo = internationalPhoneNumber;
        console.log("📱 Numéro MTN envoyé (format international):", internationalPhoneNumber);
        console.log("📱 Numéro original:", phoneNumber);
        console.log("📱 Indicatif:", callingCode);
      }

      console.log("Données de paiement envoyées:", paymentData);

      try {
        const response = await fetch(`${API_BASE_URL}/paiement`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify(paymentData)
        });

        const responseData = await response.json();
        console.log("Réponse de l'API:", responseData);

        // Vérifier d'abord les erreurs MTN même si response.ok
        if (responseData.payment_api_response && !responseData.payment_api_response.success) {
          const mtnError = responseData.payment_api_response;
          console.error("Erreur MTN:", mtnError);
          
          if (mtnError.reason === 'PAYER_NOT_FOUND') {
            throw new Error("Numéro de téléphone non trouvé ou compte non activé pour le mobile money. Veuillez vérifier votre numéro et votre solde.");
          } else if (mtnError.code === 'LOW_BALANCE') {
            throw new Error("Solde insuffisant. Votre solde MTN Mobile Money n'est pas suffisant pour effectuer cette transaction. Veuillez recharger votre compte et réessayer.");
          } else {
            throw new Error(`Erreur MTN: ${mtnError.message || 'Vérifiez votre solde et réessayez'}`);
          }
        }

        if (!response.ok) {
          console.error("Erreur API:", responseData);
          throw new Error(responseData.message || "Erreur lors du traitement du paiement");
        }

        // Si c'est un paiement MTN, démarrer la vérification du statut
        if (paymentMethod === 'mtn') {
          Alert.alert(
            'Paiement initié',
            'Votre demande de paiement a été envoyée. Veuillez confirmer le paiement sur votre téléphone.',
            [{ text: 'OK' }]
          );
          
          // Réactiver le polling automatique
          startPaymentStatusCheck(orderDetails.orderId, userToken);
          
          // Redirection directe vers OrderSuccess pour le moment
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [
                { 
                  name: 'OrderSuccess',
                  params: { 
                    orderDetails: {
                      ...orderDetails,
                      paymentStatus: 'pending_verification',
                    }
                  }
                }
              ],
            });
          }, 2000);
        } else {
          // Pour les autres modes de paiement (cash, cb), continuer avec le flow existant
          Alert.alert(
            'Paiement réussi',
            'Votre paiement a été traité avec succès. Vous recevrez un SMS de confirmation.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [
                      { 
                        name: 'OrderSuccess',
                        params: { 
                          orderDetails: {
                            ...orderDetails,
                            paymentStatus: 'paid',
                          }
                        }
                      }
                    ],
                  });
                },
              },
            ]
          );
        }
      } catch (apiError) {
        console.error("Erreur API détaillée:", apiError);
        
        // Gérer les erreurs spécifiques avec des messages appropriés
        let errorMessage = "Une erreur est survenue lors du traitement du paiement. Veuillez réessayer.";
        let errorTitle = "Erreur de paiement";
        
        if (apiError.message.includes("Solde insuffisant")) {
          errorTitle = "Solde insuffisant";
          errorMessage = apiError.message;
        } else if (apiError.message.includes("Numéro de téléphone non trouvé")) {
          errorTitle = "Numéro non trouvé";
          errorMessage = apiError.message;
        } else if (apiError.message.includes("Erreur MTN")) {
          errorTitle = "Erreur MTN Mobile Money";
          errorMessage = apiError.message;
        }
        
        Alert.alert(errorTitle, errorMessage, [
          { text: 'OK', style: 'default' },
          { 
            text: 'Vérifier le solde', 
            onPress: () => {
              Alert.alert(
                'Vérification du solde',
                'Pour vérifier votre solde MTN Mobile Money, composez *126*2# sur votre téléphone.',
                [{ text: 'OK' }]
              );
            }
          }
        ]);
      }
    } catch (error) {
      console.error("Erreur lors du traitement du paiement:", error);
      Alert.alert("Erreur", "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour vérifier le statut du paiement MTN
  const startPaymentStatusCheck = (orderId, userToken) => {
    let checkCount = 0;
    const maxChecks = 60; // Maximum 3 minutes (60 * 3 secondes)
    
    setIsCheckingPayment(true);
    setPaymentStatus('Vérification du paiement en cours...');
    
    const checkInterval = setInterval(async () => {
      checkCount++;
      
      try {
        const response = await fetch(`${API_BASE_URL}/paiement/check-payment-status?order_id=${orderId}`, {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          }
        });

        const responseData = await response.json();
        console.log(`Vérification ${checkCount} - Statut paiement:`, responseData);

        // Vérifier si l'endpoint existe
        if (response.status === 404) {
          clearInterval(checkInterval);
          setIsCheckingPayment(false);
          setPaymentStatus('Endpoint de vérification non disponible');
          Alert.alert(
            'Fonctionnalité en cours de développement',
            'La vérification automatique du statut de paiement n\'est pas encore disponible. Veuillez contacter le support pour vérifier votre paiement.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (response.ok) {
          const status = responseData.status || responseData.payment_status;
          
          if (status === 'payé' || status === 'paid') {
            clearInterval(checkInterval);
            setIsCheckingPayment(false);
            setPaymentStatus('Paiement confirmé !');
            Alert.alert(
              'Paiement confirmé',
              'Votre paiement a été confirmé avec succès !',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [
                        { 
                          name: 'OrderSuccess',
                          params: { 
                            orderDetails: {
                              ...orderDetails,
                              paymentStatus: 'paid',
                            }
                          }
                        }
                      ],
                    });
                  },
                },
              ]
            );
          } else if (status === 'échoué' || status === 'failed') {
            clearInterval(checkInterval);
            setIsCheckingPayment(false);
            setPaymentStatus('Paiement échoué');
            Alert.alert(
              'Paiement échoué',
              'Le paiement a échoué. Veuillez vérifier votre solde et réessayer.',
              [{ text: 'OK' }]
            );
          } else if (status === 'en attente' || status === 'pending') {
            // Continuer la vérification
            setPaymentStatus(`Vérification en cours... (${checkCount}/${maxChecks})`);
            console.log('Paiement en attente...');
          }
        } else {
          // Gérer les autres erreurs HTTP
          console.error('Erreur HTTP:', response.status, responseData);
          setPaymentStatus(`Erreur de vérification (${response.status})`);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut:', error);
        setPaymentStatus('Erreur de connexion...');
      }

      // Arrêter après le nombre maximum de vérifications
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
        setIsCheckingPayment(false);
        setPaymentStatus('Délai dépassé');
        Alert.alert(
          'Délai dépassé',
          'Le délai de paiement a expiré. Veuillez vérifier votre paiement et contacter le support si nécessaire.',
          [{ text: 'OK' }]
        );
      }
    }, 3000); // Vérification toutes les 3 secondes
  };

  const handlePayment = async () => {
    // Empêcher le paiement si Airtel est sélectionné
    if (paymentMethod === 'airtel') {
      Alert.alert(
        'Mode de paiement non disponible',
        'Le paiement par Airtel Money n\'est pas encore disponible. Veuillez choisir un autre mode de paiement.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validation selon le mode de paiement
    if (paymentMethod === 'mtn') {
      if (!phoneNumber || phoneNumber.length < 8) {
        Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
        return;
      }
    } else if (paymentMethod === 'cb') {
      if (!cardNumber || cardNumber.length < 16) {
        Alert.alert('Erreur', 'Veuillez entrer un numéro de carte valide');
        return;
      }
      if (!expiryDate || expiryDate.length < 5) {
        Alert.alert('Erreur', 'Veuillez entrer une date d\'expiration valide');
        return;
      }
      if (!cvv || cvv.length < 3) {
        Alert.alert('Erreur', 'Veuillez entrer un code CVV valide');
        return;
      }
      if (!cardholderName) {
        Alert.alert('Erreur', 'Veuillez entrer le nom du titulaire de la carte');
        return;
      }
    }

    // Vérification des champs obligatoires
    if (!orderDetails.address) {
      Alert.alert('Erreur', 'Veuillez sélectionner une adresse de livraison');
      return;
    }

    if (!orderDetails.phone) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone pour la livraison');
      return;
    }

    // Pour les autres modes de paiement, procéder directement
    proceedWithPayment();
  };

  // Rendu du formulaire selon le mode de paiement
  const renderPaymentForm = () => {
    if (paymentMethod === 'airtel') {
      return (
        <View style={styles.formContainer}>
          <Image 
            source={require('../../assets/images/airtel.png')} 
            style={styles.paymentLogo} 
          />
          <Text style={styles.formTitle}>
            {t.payment.airtelPayment}
          </Text>
          <View style={styles.comingSoonContainer}>
            <Ionicons name="time-outline" size={48} color="#FFA500" />
            <Text style={styles.comingSoonTitle}>Disponible bientôt</Text>
            <Text style={styles.comingSoonDescription}>
              Le paiement par Airtel Money sera bientôt disponible. Veuillez choisir un autre mode de paiement pour le moment.
            </Text>
          </View>
        </View>
      );
    } else if (paymentMethod === 'mtn') {
      return (
        <View style={styles.formContainer}>
          <Image 
            source={require('../../assets/images/mtn.jpeg')} 
            style={styles.paymentLogo} 
          />
          <Text style={styles.formTitle}>
            {t.payment.mtnPayment}
          </Text>
          <Text style={styles.formDescription}>
            {t.payment.enterPhoneForPayment}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <CountryPicker
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
            <TextInput
              style={{ flex: 1, marginLeft: 8, borderBottomWidth: 1, borderColor: '#ddd', padding: 8 }}
              placeholder={t.payment.phoneNumber}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
        </View>
      );
    } else if (paymentMethod === 'cb') {
      return (
        <View style={styles.formContainer}>
          <Image source={require('../../assets/images/visa-mastercard.webp')} style={styles.paymentLogo} />
          <Text style={styles.formTitle}>{t.payment.cardPayment}</Text>
          <Text style={styles.formDescription}>
            {t.payment.enterCardInfo}
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name={cardTypeIcon || "card-outline"} size={20} color={cardType ? "#FF9800" : "#666"} />
            <TextInput
              style={styles.input}
              placeholder="1234 5678 9012 3456"
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={(text) => {
                // Formater le numéro de carte avec des espaces
                const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                setCardNumber(formatted);
                
                // Détecter le type de carte automatiquement
                if (formatted.length >= 4) {
                  const detected = detectCardType(formatted);
                  setCardType(detected.type);
                  setCardTypeIcon(detected.icon);
                } else {
                  setCardType('');
                  setCardTypeIcon('card-outline');
                }
              }}
              maxLength={19} // 16 chiffres + 3 espaces
            />
            {cardType && (
              <View style={styles.cardTypeBadge}>
                <Text style={styles.cardTypeText}>{cardType}</Text>
              </View>
            )}
          </View>
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 5 }]}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="MM/YY"
                keyboardType="number-pad"
                value={expiryDate}
                onChangeText={(text) => {
                  // Formater la date d'expiration
                  const formatted = text.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                  setExpiryDate(formatted);
                }}
                maxLength={5}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 5 }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder={cardType === 'American Express' ? 'CVV (4)' : 'CVV (3)'}
                keyboardType="number-pad"
                value={cvv}
                onChangeText={(text) => {
                  // Limiter selon le type de carte détecté
                  const detected = detectCardType(cardNumber);
                  const maxLength = detected.cvvLength || 3;
                  const formatted = text.replace(/\D/g, '').substring(0, maxLength);
                  setCvv(formatted);
                }}
                secureTextEntry
                maxLength={cardType === 'American Express' ? 4 : 3}
              />
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder={t.payment.cardholderName}
              value={cardholderName}
              onChangeText={setCardholderName}
            />
          </View>
        </View>
      );
    } else if (paymentMethod === 'cash') {
      return (
        <View style={styles.formContainer}>
          <Image source={require('../../assets/images/cash.jpg')} style={styles.paymentLogo} />
          <Text style={styles.formTitle}>{t.payment.cashPayment}</Text>
          <Text style={styles.formDescription}>
            {t.payment.payOnDelivery}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.payment.finalizePayment}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {renderPaymentForm()}

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>{t.payment.totalAmountToPay}</Text>
          <Text style={styles.totalAmount}>{orderDetails?.total || 0} FCFA</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.payButton, 
            (isLoading || paymentMethod === 'airtel' || isCheckingPayment) && styles.payButtonDisabled
          ]}
          onPress={handlePayment}
          disabled={isLoading || paymentMethod === 'airtel' || isCheckingPayment}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : isCheckingPayment ? (
            <View style={styles.checkingContainer}>
              <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
              <Text style={styles.payButtonText}>
                Vérification...
              </Text>
            </View>
          ) : paymentMethod === 'airtel' ? (
            <Text style={styles.payButtonText}>
              Non disponible
            </Text>
          ) : (
            <Text style={styles.payButtonText}>
              {t.payment.payNowAmount.replace('{amount}', orderDetails?.total || 0)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Affichage du statut de paiement MTN */}
        {isCheckingPayment && paymentMethod === 'mtn' && (
          <View style={styles.paymentStatusContainer}>
            <Text style={styles.paymentStatusText}>{paymentStatus}</Text>
          </View>
        )}

        {/* Espace en bas pour éviter que le bouton soit caché */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  content: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 100,
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentLogo: {
    width: scaleFont(80),
    height: scaleFont(80),
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 15,
  },
  formTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Montserrat-Bold',
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    height: 50,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Montserrat',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
  },

  payButton: {
    backgroundColor: '#51A905',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFA500',
    marginTop: 10,
    fontFamily: 'Montserrat-Bold',
  },
  comingSoonDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'Montserrat',
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  paymentStatusContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentStatusText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
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
  cardTypeBadge: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardTypeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
  },
});

export default ProcessPayment; 