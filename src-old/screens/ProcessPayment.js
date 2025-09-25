import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CountryPicker, { DEFAULT_THEME, DARK_THEME } from 'react-native-country-picker-modal';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';


const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const { width, height } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const ProcessPayment = () => {
  const route = useRoute();
  const navigation = useNavigation();
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
  console.log('🔍 ProcessPayment - orderDetails:', orderDetails);
  console.log('🔍 ProcessPayment - paymentMethod:', paymentMethod);

  const proceedWithPayment = async () => {
    setIsLoading(true);

    try {

      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert("Erreur", "Vous devez être connecté pour effectuer cette action");
        setIsLoading(false);
        return;
      }

      // Préparer les données de paiement selon le format attendu par l'API
      const fullPhoneNumber = phoneNumber ? `+${callingCode}${phoneNumber.replace(/^0+/, '')}` : '';
      
      // Données de base pour tous les modes de paiement
      const paymentData = {
        order_id: orderDetails.orderId,
        total: orderDetails.total,
        delivery_address: orderDetails.address,
        delivery_phone: orderDetails.phone || fullPhoneNumber || '',
        payment_method: paymentMethod,
        operator: paymentMethod
      };
      
      console.log("🔍 Données de base créées:", {
        payment_method: paymentData.payment_method,
        operator: paymentData.operator,
        paymentMethod: paymentMethod
      });

      // Ajouter les données spécifiques selon le mode de paiement
      if (paymentMethod === 'mtn') {
        // Format selon la doc API : phone_momo requis pour MTN
        const internationalPhoneNumber = `+${callingCode}0${phoneNumber.replace(/^0+/, '')}`;
        paymentData.phone_momo = internationalPhoneNumber;
        paymentData.payment_method = 'mtn';
        paymentData.operator = 'mtn';
        console.log("📱 Numéro MTN envoyé (format international):", internationalPhoneNumber);
      } else if (paymentMethod === 'cash') {
        console.log("🔍 Entrée dans le bloc cash");
        // Données spécifiques pour paiement cash selon la doc API
        paymentData.payment_method = 'cash';
        paymentData.operator = 'cash';
        console.log("💵 Paiement cash - structure selon doc API");
        console.log("💵 Données cash envoyées:", {
          payment_method: paymentData.payment_method,
          operator: paymentData.operator,
          order_id: paymentData.order_id,
          total: paymentData.total,
          delivery_address: paymentData.delivery_address,
          delivery_phone: paymentData.delivery_phone
        });
      }



      console.log("Données de paiement envoyées:", paymentData);
      console.log("🔍 Vérification finale - operator:", paymentData.operator, "payment_method:", paymentData.payment_method);
      console.log("🔍 Vérification payment_method_id dans paymentData:", paymentData.payment_method_id);

      try {
        // Utiliser /paiement pour toutes les méthodes mais avec format adapté pour cash
        const endpoint = '/paiement';
        
        // Pour le cash, adapter les données au format attendu par /paiement
        let requestData;
        if (paymentMethod === 'cash') {
          console.log("🔍 orderDetails.items:", orderDetails.items);
          console.log("🔍 orderDetails:", {
            total: orderDetails.total,
            deliveryFee: orderDetails.deliveryFee,
            address: orderDetails.address,
            phone: orderDetails.phone
          });
          
          // Format simplifié pour cash - juste les données essentielles selon la doc API
          requestData = {
            order_id: orderDetails.orderId,
            total: orderDetails.total,
            delivery_address: orderDetails.address,
            delivery_phone: orderDetails.phone,
            payment_method: 'cash',
            operator: 'cash'
            // Pas besoin de phone_momo pour cash
          };
          
          console.log("🔍 requestData final pour cash:", requestData);
        } else {
          requestData = paymentData;
          // Pour les cartes bancaires, le payment_method_id est géré par StripePaymentCorrect
        }
        
        console.log(`🌐 Appel API: ${endpoint}`);
        console.log(`📦 Données envoyées:`, requestData);
        console.log(`🔍 Vérification payment_method_id:`, requestData.payment_method_id);
        console.log(`🔍 Type de payment_method_id:`, typeof requestData.payment_method_id);
        console.log(`🔍 Toutes les clés de requestData:`, Object.keys(requestData));
        
        // Pour le cash, d'abord enregistrer le mode de paiement
        if (paymentMethod === 'cash') {
          console.log("🔧 Étape 1: Enregistrement du mode de paiement cash");
          
          const modePaiementResponse = await fetch(`${API_BASE_URL}/mode-paiement`, {
            method: 'PUT',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
              order_id: orderDetails.orderId,
              payment_method: 'cash'
            })
          });
          
          const modePaiementData = await modePaiementResponse.text();
          console.log("🔧 Réponse mode-paiement:", modePaiementData);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify(requestData)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.log("Réponse brute:", responseText);
          responseData = {};
        }
        
        console.log("Réponse de l'API:", responseData);

        // Vérifier d'abord les erreurs MTN même si response.ok (uniquement pour MTN)
        if (paymentMethod === 'mtn' && responseData.payment_api_response && !responseData.payment_api_response.success) {
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

        // Pour le cash, on ne vérifie pas response.ok car le paiement se fait à la livraison
        if (paymentMethod !== 'cash' && !response.ok) {
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
        } else if (paymentMethod === 'cash') {
          // Gestion spécifique pour le mode cash
          const orderId = responseData.order_id || responseData.id;
          
          if (!orderId) {
            console.error("ID de commande manquant dans la réponse:", responseData);
            // Continuer quand même avec l'ID existant
          }
          
          Alert.alert(
            'Paiement cash confirmé',
            'Votre commande a été confirmée. Vous paierez à la livraison. Vous recevrez un SMS de confirmation.',
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
                            orderId: orderId || orderDetails.orderId, // Utiliser le nouvel ID si disponible
                            paymentStatus: 'pending',
                            payment_method: 'cash',
                            operator: 'cash'
                          }
                        }
                      }
                    ],
                  });
                },
              },
            ]
          );
        } else {
          // Pour les autres modes de paiement (cb), continuer avec le flow existant
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
        
        // Pour le cash, on ne traite pas les erreurs API comme des erreurs de paiement
        if (paymentMethod === 'cash') {
          console.log("💵 Erreur API pour cash ignorée, continuation du processus...");
          // Continuer avec le succès pour le cash
          Alert.alert(
            'Paiement cash confirmé',
            'Votre commande a été confirmée. Vous paierez à la livraison. Vous recevrez un SMS de confirmation.',
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
                            paymentStatus: 'pending',
                            payment_method: 'cash',
                            operator: 'cash'
                          }
                        }
                      }
                    ],
                  });
                },
              },
            ]
          );
          return;
        }
        
        // Gérer les erreurs spécifiques avec des messages appropriés (pour MTN et CB)
        let errorMessage = "Une erreur est survenue lors du traitement du paiement. Veuillez réessayer.";
        let errorTitle = "Erreur de paiement";
        
        if (paymentMethod === 'mtn') {
          // Messages d'erreur spécifiques pour MTN Mobile Money
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
                  'Pour vérifier votre solde MTN Mobile Money, composez *555# sur votre téléphone.',
                  [{ text: 'OK' }]
                );
              }
            }
          ]);
        } else if (paymentMethod === 'cb') {
          // Messages d'erreur spécifiques pour carte bancaire
          if (apiError.message.includes("Solde insuffisant") || apiError.message.includes("vérifier le solde")) {
            errorTitle = "Paiement refusé";
            errorMessage = "Votre requête ne peut être traitée. Veuillez vérifier les informations de votre carte ou contacter votre banque.";
          } else if (apiError.message.includes("Carte refusée")) {
            errorTitle = "Carte refusée";
            errorMessage = "Votre carte a été refusée. Veuillez vérifier les informations ou utiliser une autre carte.";
          } else if (apiError.message.includes("Carte expirée")) {
            errorTitle = "Carte expirée";
            errorMessage = "Votre carte est expirée. Veuillez utiliser une autre carte.";
          } else if (apiError.message.includes("Code de sécurité incorrect")) {
            errorTitle = "Code CVC incorrect";
            errorMessage = "Le code de sécurité de votre carte est incorrect. Veuillez vérifier et réessayer.";
          } else if (apiError.message.includes("Fonds insuffisants")) {
            errorTitle = "Fonds insuffisants";
            errorMessage = "Votre carte n'a pas suffisamment de fonds pour effectuer cette transaction.";
          } else if (apiError.message.includes("Date d'expiration invalide")) {
            errorTitle = "Date d'expiration invalide";
            errorMessage = "La date d'expiration de votre carte est invalide. Veuillez vérifier et réessayer.";
          } else if (apiError.message.includes("Numéro de carte invalide")) {
            errorTitle = "Numéro de carte invalide";
            errorMessage = "Le numéro de votre carte est invalide. Veuillez vérifier et réessayer.";
          } else if (apiError.message.includes("Erreur de traitement")) {
            errorTitle = "Erreur de traitement";
            errorMessage = "Une erreur est survenue lors du traitement. Veuillez réessayer ou contacter le support.";
          } else {
            errorTitle = "Erreur de paiement";
            errorMessage = "Votre requête ne peut être traitée. Veuillez vérifier les informations de votre carte ou contacter votre banque.";
          }
          
          Alert.alert(errorTitle, errorMessage, [
            { text: 'OK', style: 'default' },
            { 
              text: 'Aide', 
              onPress: () => {
                Alert.alert(
                  'Aide pour le paiement par carte',
                  'Vérifiez que :\n• Votre carte est valide et non expirée\n• Le code CVC est correct\n• Votre carte a suffisamment de fonds\n• Les informations sont correctement saisies\n• Votre banque autorise les paiements en ligne',
                  [{ text: 'OK' }]
                );
              }
            }
          ]);
        } else {
          // Erreur générique pour les autres méthodes
          Alert.alert(errorTitle, errorMessage, [{ text: 'OK', style: 'default' }]);
        }
      }
    } catch (error) {
      console.error("Erreur lors du traitement du paiement:", error);
      
      // Pour le cash, on ne traite pas les erreurs comme des échecs
      if (paymentMethod === 'cash') {
        console.log("💵 Erreur générale pour cash ignorée, continuation du processus...");
        Alert.alert(
          'Paiement cash confirmé',
          'Votre commande a été confirmée. Vous paierez à la livraison. Vous recevrez un SMS de confirmation.',
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
                          paymentStatus: 'pending',
                          payment_method: 'cash',
                          operator: 'cash'
                        }
                      }
                    }
                  ],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert("Erreur", "Une erreur est survenue. Veuillez réessayer.");
      }
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
    // Empêcher le paiement si Airtel ou carte bancaire est sélectionné
    if (paymentMethod === 'airtel' || paymentMethod === 'cb') {
      Alert.alert(
        'Mode de paiement non disponible',
        paymentMethod === 'airtel' 
          ? 'Le paiement par Airtel Money n\'est pas encore disponible. Veuillez choisir un autre mode de paiement.'
          : 'Le paiement par carte bancaire n\'est pas encore disponible. Veuillez choisir un autre mode de paiement.',
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
    }
    // Pour les cartes bancaires, la validation est gérée par le composant StripePaymentCorrect

    // Vérification des champs obligatoires
    if (!orderDetails.address) {
      Alert.alert('Erreur', 'Veuillez sélectionner une adresse de livraison');
      return;
    }

    // Pour le cash, le téléphone est optionnel
    if (!orderDetails.phone && paymentMethod !== 'cash') {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone pour la livraison');
      return;
    }

    // Pour les cartes bancaires, le paiement est géré par le composant StripePaymentCorrect
    if (paymentMethod === 'cb') {
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
          <Text style={styles.formTitle}>
            Paiement par carte bancaire
          </Text>
          <View style={styles.comingSoonContainer}>
            <Ionicons name="time-outline" size={48} color="#FFA500" />
            <Text style={styles.comingSoonTitle}>Disponible bientôt</Text>
            <Text style={styles.comingSoonDescription}>
              Le paiement par carte bancaire sera bientôt disponible. Veuillez choisir un autre mode de paiement pour le moment.
            </Text>
          </View>
        </View>
      );
    } else if (paymentMethod === 'cash') {
      return (
        <View style={styles.formContainer}>
          <Image source={require('../../assets/images/cash.jpg')} style={styles.paymentLogo} />
          <Text style={styles.formTitle}>{t.payment.cashPayment}</Text>
          <Text style={styles.formDescription}>
            Cliquez sur "Valider la commande" pour confirmer votre commande. Vous paierez à la livraison.
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
        <Text style={styles.headerTitle}>
          {paymentMethod === 'cash' ? 'Confirmation de commande' : t.payment.finalizePayment}
        </Text>
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

        {/* Bouton de paiement - affiché pour tous */}
        {(
          <TouchableOpacity
            style={[
              styles.payButton, 
              (isLoading || paymentMethod === 'airtel' || paymentMethod === 'cb' || isCheckingPayment) && styles.payButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={isLoading || paymentMethod === 'airtel' || paymentMethod === 'cb' || isCheckingPayment}
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
            ) : paymentMethod === 'airtel' || paymentMethod === 'cb' ? (
              <Text style={styles.payButtonText}>
                Non disponible
              </Text>
            ) : paymentMethod === 'cash' ? (
              <Text style={styles.payButtonText}>
                Valider la commande
              </Text>
            ) : (
              <Text style={styles.payButtonText}>
                {t.payment.payNowAmount.replace('{amount}', orderDetails?.total || 0)}
              </Text>
            )}
          </TouchableOpacity>
        )}

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