import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe, CardField } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const StripePaymentSheet = ({
  orderDetails,
  onPaymentSuccess,
  onPaymentError,
  isLoading,
  setIsLoading
}) => {
  const { createPaymentMethod } = useStripe();
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cvv, setCvv] = useState('');

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      // Validation avec logs détaillés
      console.log(' Validation - cardNumber:', cardNumber);
      console.log(' Validation - expiryDate:', expiryDate);
      console.log(' Validation - cardholderName:', cardholderName);
      console.log(' Validation - cvv:', cvv);

      if (!cardNumber.trim()) {
        Alert.alert('Erreur', 'Veuillez saisir le numéro de carte');
        return;
      }

      if (!expiryDate.trim()) {
        Alert.alert('Erreur', 'Veuillez saisir la date d\'expiration');
        return;
      }

      if (!cardholderName.trim()) {
        Alert.alert('Erreur', 'Veuillez saisir le nom du titulaire');
        return;
      }

      if (!cvv.trim()) {
        Alert.alert('Erreur', 'Veuillez saisir le CVC');
        return;
      }

      if (cvv.length < 3) {
        Alert.alert('Erreur', 'Veuillez saisir un CVC valide (3 ou 4 chiffres)');
        return;
      }

      // Extraire mois et année
      const [month, year] = expiryDate.split('/');
      if (!month || !year) {
        Alert.alert('Erreur', 'Format de date invalide (MM/YY)');
        return;
      }
      
      console.log('🔍 Envoi des données de carte au backend...');

      const requestData = {
        order_id: orderDetails.orderId,
        total: orderDetails.total,
        delivery_address: orderDetails.address,
        delivery_phone: orderDetails.phone,
        payment_method: 'cb',
        operator: 'cb',
        // Pas de payment_method_id - le backend va le créer
        card_data: {
          number: cardNumber.replace(/\s/g, ''),
          exp_month: parseInt(month),
          exp_year: parseInt('20' + year),
          cvc: cvv,
          name: cardholderName.trim()
        }
      };

      console.log(' Données envoyées:', JSON.stringify(requestData, null, 2));

      const response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/paiement', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(requestData)
      });

      const responseData = await response.json();
      console.log(' Réponse complète:', responseData);
      console.log(' Status code:', response.status);
      console.log(' Headers:', response.headers);

      if (response.ok && responseData.success) {
        console.log('✅ Paiement réussi:', responseData);
        onPaymentSuccess(responseData);
      } else {
        console.error('❌ Erreur API:', responseData);
        throw new Error(responseData.message || responseData.error || 'Erreur de paiement');
      }

    } catch (error) {
      console.error('❌ Erreur:', error);
      Alert.alert('Erreur de paiement', error.message);
      onPaymentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <Ionicons name="card" size={24} color="#51A905" style={styles.cardIcon} />
        <Text style={styles.title}>Paiement par carte bancaire</Text>
        <Text style={styles.description}>
          Entrez les informations de votre carte
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Nom du titulaire de la carte"
          value={cardholderName}
          onChangeText={setCardholderName}
          autoCapitalize="words"
        />
      </View>

      {/* Champ numéro de carte */}
      <View style={styles.inputContainer}>
        <Ionicons name="card-outline" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Numéro de carte (ex: 4242424242424242)"
          keyboardType="numeric"
          value={cardNumber}
          onChangeText={setCardNumber}
          maxLength={19}
        />
      </View>

      {/* Champs expiration et CVV */}
      <View style={styles.rowContainer}>
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Ionicons name="calendar-outline" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="MM/YY"
            keyboardType="numeric"
            value={expiryDate}
            onChangeText={setExpiryDate}
            maxLength={5}
          />
        </View>
        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="CVC"
            keyboardType="numeric"
            value={cvv}
            onChangeText={setCvv}
            maxLength={4}
            secureTextEntry
          />
        </View>
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
            Payer {orderDetails?.total || 0} FCFA
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.securityInfo}>
        <Ionicons name="shield-checkmark" size={16} color="#51A905" />
        <Text style={styles.securityText}>
          Paiement sécurisé par votre backend
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    marginBottom: 10,
  },
  title: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Montserrat-Bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  payButton: {
    backgroundColor: '#51A905',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
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
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
          securityText: {
          fontSize: 12,
          color: '#666',
          marginLeft: 5,
          fontFamily: 'Montserrat',
        },
        cardFieldContainer: {
          marginBottom: 15,
        },
        cardField: {
          width: '100%',
          height: 50,
          marginVertical: 8,
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 8,
          backgroundColor: '#fff',
        },
});

export default StripePaymentSheet;
