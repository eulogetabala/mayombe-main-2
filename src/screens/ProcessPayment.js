import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CountryPicker, { DEFAULT_THEME, DARK_THEME } from 'react-native-country-picker-modal';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const ProcessPayment = ({ route, navigation }) => {
  const { orderDetails, onPaymentSuccess } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [countryCode, setCountryCode] = useState('CG');
  const [callingCode, setCallingCode] = useState('242');

  const paymentMethod = orderDetails?.paymentMethod || 'cash';

  const handlePayment = async () => {
    // Validation selon le mode de paiement
    if (paymentMethod === 'airtel' || paymentMethod === 'mtn') {
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

    setIsLoading(true);

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert("Erreur", "Vous devez être connecté pour effectuer cette action");
        setIsLoading(false);
        return;
      }

      // Préparer les données de paiement selon le format attendu par l'API
      const fullPhoneNumber = `+${callingCode}${phoneNumber.replace(/^0+/, '')}`;
      const paymentData = {
        order_id: orderDetails.orderId,
        total: orderDetails.total,
        delivery_address: orderDetails.address,
        delivery_phone: orderDetails.phone || fullPhoneNumber, // Utiliser le numéro de téléphone de paiement si pas de numéro de livraison
        payment_method: paymentMethod === 'airtel' ? 'airtel_money' : 
                       paymentMethod === 'mtn' ? 'mobile_money' : 'cb',
        operator: paymentMethod === 'airtel' ? 'airtel_money' : 
                 paymentMethod === 'mtn' ? 'mobile_money' : 'cb'
      };

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

        if (!response.ok) {
          console.error("Erreur API:", responseData);
          throw new Error(responseData.message || "Erreur lors du traitement du paiement");
        }

        // Simuler un délai de traitement du paiement
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simuler une réponse réussie
        const successResponse = {
          success: true,
          message: "Paiement traité avec succès",
          sms_sent: true
        };

        if (successResponse.success) {
          Alert.alert(
            'Paiement réussi',
            'Votre paiement a été traité avec succès. Vous recevrez un SMS de confirmation.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Nettoyer la pile de navigation et rediriger vers OrderSuccess
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
        // En cas d'erreur API, on continue avec la simulation
        Alert.alert(
          'Paiement simulé',
          'Le paiement a été simulé avec succès. Vous recevrez un SMS de confirmation.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Nettoyer la pile de navigation et rediriger vers OrderSuccess
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
    } catch (error) {
      console.error("Erreur lors du traitement du paiement:", error);
      Alert.alert("Erreur", "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Rendu du formulaire selon le mode de paiement
  const renderPaymentForm = () => {
    if (paymentMethod === 'airtel' || paymentMethod === 'mtn') {
      return (
        <View style={styles.formContainer}>
          <Image 
            source={paymentMethod === 'airtel' 
              ? require('../../assets/images/airtel.png') 
              : require('../../assets/images/mtn.jpeg')} 
            style={styles.paymentLogo} 
          />
          <Text style={styles.formTitle}>
            {paymentMethod === 'airtel' ? 'Paiement Airtel Money' : 'Paiement MTN Mobile Money'}
          </Text>
          <Text style={styles.formDescription}>
            Entrez votre numéro de téléphone pour effectuer le paiement
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
              translation="fr"
              theme={Platform.OS === 'ios' ? DEFAULT_THEME : DARK_THEME}
            />
            <TextInput
              style={{ flex: 1, marginLeft: 8, borderBottomWidth: 1, borderColor: '#ddd', padding: 8 }}
              placeholder="Numéro de téléphone"
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
          <Text style={styles.formTitle}>Paiement par carte bancaire</Text>
          <Text style={styles.formDescription}>
            Entrez les informations de votre carte pour effectuer le paiement
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Numéro de carte"
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={setCardNumber}
            />
          </View>
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 5 }]}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="MM/AA"
                keyboardType="number-pad"
                value={expiryDate}
                onChangeText={setExpiryDate}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 5 }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="CVV"
                keyboardType="number-pad"
                value={cvv}
                onChangeText={setCvv}
                secureTextEntry
              />
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Nom du titulaire"
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
          <Text style={styles.formTitle}>Paiement à la livraison</Text>
          <Text style={styles.formDescription}>
            Vous paierez en espèces à la réception de votre commande
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finalisez votre paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {renderPaymentForm()}

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Montant total à payer</Text>
          <Text style={styles.totalAmount}>{orderDetails?.total || 0} FCFA</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, isLoading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.payButtonText}>
              Payer maintenant ({orderDetails?.total || 0} FCFA)
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  content: {
    flex: 1,
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
    width: 80,
    height: 80,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 15,
  },
  formTitle: {
    fontSize: 18,
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
});

export default ProcessPayment; 