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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStripe } from '@stripe/stripe-react-native';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const StripePaymentFormDirect = ({ 
  orderDetails,
  onPaymentSuccess, 
  onPaymentError, 
  isLoading, 
  setIsLoading 
}) => {
  const { createPaymentMethod } = useStripe();
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handlePayPress = async () => {
    console.log('🔍 cardNumber:', cardNumber);
    console.log('🔍 expiryDate:', expiryDate);
    console.log('🔍 cvc:', cvc);
    console.log('🔍 cardholderName:', cardholderName);
    
    // Validation manuelle
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Erreur', 'Numéro de carte invalide');
      return;
    }
    
    if (!expiryDate || expiryDate.length !== 5) {
      Alert.alert('Erreur', 'Date d\'expiration invalide (format MM/YY)');
      return;
    }
    
    if (!cvc || cvc.length < 3) {
      Alert.alert('Erreur', 'Code CVC invalide (minimum 3 chiffres)');
      return;
    }
    
    if (!cardholderName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom du titulaire de la carte');
      return;
    }

    setIsLoading(true);

    try {
      // Préparer les données de carte pour Stripe
      const [expMonth, expYear] = expiryDate.split('/');
      const cardData = {
        number: cardNumber.replace(/\s/g, ''),
        expMonth: parseInt(expMonth),
        expYear: parseInt('20' + expYear),
        cvc: cvc,
      };

      console.log('🔍 cardData pour Stripe:', cardData);

      // Créer un PaymentMethod avec Stripe
      const { paymentMethod, error } = await createPaymentMethod({
        type: 'Card',
        card: cardData,
      });

      if (error) {
        console.error('Erreur Stripe:', error);
        Alert.alert('Erreur', `Erreur: ${error.message}`);
        onPaymentError(error);
        return;
      }

      console.log('🔍 PaymentMethod créé:', paymentMethod.id);

      // Récupérer le token d'authentification
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert('Erreur', 'Vous devez être connecté pour effectuer cette action');
        return;
      }

      // Appel à votre API backend avec le vrai payment_method_id
      const response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/paiement', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          order_id: orderDetails.orderId,
          total: orderDetails.total,
          delivery_address: orderDetails.address,
          delivery_phone: orderDetails.phone,
          payment_method: 'cb',
          operator: 'cb',
          payment_method_id: paymentMethod.id, // Vrai ID Stripe
          card_data: {
            number: cardData.number,
            exp_month: cardData.expMonth,
            exp_year: cardData.expYear,
            cvc: cardData.cvc,
            name: cardholderName.trim()
          }
        })
      });

      const responseData = await response.json();
      console.log('🔍 Réponse API:', responseData);

      if (response.ok && responseData.success) {
        console.log('Paiement réussi:', responseData);
        onPaymentSuccess(responseData);
      } else {
        console.error('Erreur API:', responseData);
        throw new Error(responseData.message || 'Erreur lors du traitement du paiement');
      }

    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      Alert.alert('Erreur de paiement', error.message);
      onPaymentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const cardNumberValid = cardNumber.replace(/\s/g, '').length >= 13;
    const expiryDateValid = expiryDate.length === 5;
    const cvcValid = cvc.length >= 3;
    const nameValid = cardholderName.trim().length > 0;
    
    console.log('🔍 Validation détaillée:', {
      cardNumber: cardNumber.replace(/\s/g, ''),
      cardNumberLength: cardNumber.replace(/\s/g, '').length,
      cardNumberValid,
      expiryDate,
      expiryDateLength: expiryDate.length,
      expiryDateValid,
      cvc,
      cvcLength: cvc.length,
      cvcValid,
      cardholderName: cardholderName.trim(),
      nameLength: cardholderName.trim().length,
      nameValid
    });
    
    return cardNumberValid && expiryDateValid && cvcValid && nameValid;
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <Ionicons name="card" size={24} color="#51A905" style={styles.cardIcon} />
        <Text style={styles.title}>Paiement par carte bancaire</Text>
        <Text style={styles.description}>
          Entrez les informations de votre carte pour finaliser le paiement
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="card-outline" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="1234 5678 9012 3456"
          keyboardType="number-pad"
          value={cardNumber}
          onChangeText={(text) => {
            // Formater le numéro de carte avec des espaces
            const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            setCardNumber(formatted);
          }}
          maxLength={19} // 16 chiffres + 3 espaces
        />
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
            placeholder="CVC"
            keyboardType="number-pad"
            value={cvc}
            onChangeText={(text) => {
              const formatted = text.replace(/\D/g, '').substring(0, 4);
              setCvc(formatted);
            }}
            secureTextEntry
            maxLength={4}
          />
        </View>
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

      {/* Informations de débogage */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Numéro: {cardNumber ? `${cardNumber.substring(0, 4)}****` : 'Non saisi'} 
          {cardNumber.replace(/\s/g, '').length >= 13 ? ' ✅' : ' ❌'}
        </Text>
        <Text style={styles.debugText}>
          Date: {expiryDate || 'Non saisie'} 
          {expiryDate.length === 5 ? ' ✅' : ' ❌'}
        </Text>
        <Text style={styles.debugText}>
          CVC: {cvc ? `${cvc.length} chiffres` : 'Non saisi'} 
          {cvc.length >= 3 ? ' ✅' : ' ❌'}
        </Text>
        <Text style={styles.debugText}>
          Nom: {cardholderName || 'Non saisi'} 
          {cardholderName.trim().length > 0 ? ' ✅' : ' ❌'}
        </Text>
        <Text style={[styles.debugText, { fontWeight: 'bold', color: isFormValid() ? '#51A905' : '#FF0000' }]}>
          Formulaire valide: {isFormValid() ? 'Oui ✅' : 'Non ❌'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.payButton, (isLoading || !isFormValid()) && styles.payButtonDisabled]}
        onPress={handlePayPress}
        disabled={isLoading || !isFormValid()}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.payButtonText}>
            Payer {orderDetails?.total || 0} FCFA
          </Text>
        )}
      </TouchableOpacity>

      {/* Bouton de test temporaire */}
      <TouchableOpacity
        style={[styles.testButton]}
        onPress={() => {
          console.log('🔍 Test - État actuel des champs:');
          console.log('cardNumber:', cardNumber);
          console.log('expiryDate:', expiryDate);
          console.log('cvc:', cvc);
          console.log('cardholderName:', cardholderName);
          console.log('isFormValid():', isFormValid());
        }}
      >
        <Text style={styles.testButtonText}>
          🔍 Debug - Voir l'état des champs
        </Text>
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
  debugInfo: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 2,
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
  testButton: {
    backgroundColor: '#FFA500',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
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
});

export default StripePaymentFormDirect;
