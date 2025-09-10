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

const StripePaymentCorrect = ({ 
  orderDetails,
  onPaymentSuccess, 
  onPaymentError, 
  isLoading, 
  setIsLoading 
}) => {
  const { createPaymentMethod, createToken } = useStripe();
  const [cardDetails, setCardDetails] = useState(null);
  const [cardholderName, setCardholderName] = useState('');
  
  console.log('🔍 StripePaymentCorrect - cardDetails initial:', cardDetails);
  console.log('🔍 StripePaymentCorrect - cardholderName:', cardholderName);
  console.log('🔍 StripePaymentCorrect - Composant rendu');

  const handlePayPress = async () => {
    console.log('🔍 Début du processus de paiement');
    
    // Validation
    if (!cardDetails || !cardDetails.complete) {
      Alert.alert('Erreur', 'Veuillez compléter les détails de votre carte');
      return;
    }
    
    if (!cardholderName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom du titulaire de la carte');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 cardDetails:', cardDetails);
      console.log('🔍 Création du PaymentMethod avec Stripe...');

      // Vérifier que cardDetails existe
      if (!cardDetails) {
        Alert.alert('Erreur', 'Veuillez saisir les détails de votre carte');
        setIsLoading(false);
        return;
      }

      // Créer le PaymentMethod selon la documentation Stripe v0.51.0
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: {
          type: 'Card',
          billingDetails: {
            name: cardholderName.trim() || 'Test User',
          },
        },
        card: cardDetails, // Utiliser directement l'objet du CardField
      });

      if (error) {
        console.error('❌ Erreur Stripe:', error);
        Alert.alert('Erreur Stripe', error.message);
        onPaymentError(error);
        return;
      }

      console.log('✅ PaymentMethod créé avec succès:', paymentMethod.id);

      // Récupérer le token d'authentification
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert('Erreur', 'Vous devez être connecté pour effectuer cette action');
        return;
      }

      console.log('🔍 Envoi au backend avec payment_method_id:', paymentMethod.id);

      // Appel au backend avec le payment_method_id
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
          payment_method_id: paymentMethod.id, // ✅ Vrai PaymentMethod ID
          card_data: {
            number: '****', // Masqué pour la sécurité
            exp_month: cardDetails?.expMonth || 12,
            exp_year: cardDetails?.expYear || 2025,
            cvc: '***', // Masqué pour la sécurité
            name: cardholderName.trim() || 'Test User'
          }
        })
      });

      const responseData = await response.json();
      console.log('🔍 Réponse API:', responseData);

      if (response.ok && responseData.success) {
        console.log('✅ Paiement réussi:', responseData);
        onPaymentSuccess(responseData);
      } else {
        console.error('❌ Erreur API:', responseData);
        throw new Error(responseData.message || 'Erreur lors du traitement du paiement');
      }

    } catch (error) {
      console.error('❌ Erreur lors du paiement:', error);
      Alert.alert('Erreur de paiement', error.message);
      onPaymentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const cardValid = cardDetails && cardDetails.complete;
    const nameValid = cardholderName.trim().length > 0;
    
    console.log('🔍 Validation - cardValid:', cardValid, 'nameValid:', nameValid);
    return cardValid && nameValid;
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <Ionicons name="card" size={24} color="#51A905" style={styles.cardIcon} />
        <Text style={styles.title}>Paiement par carte bancaire</Text>
        <Text style={styles.description}>
          Paiement sécurisé via Stripe
        </Text>
      </View>

      {/* Test avec CardField */}
      <View style={styles.cardFieldContainer}>
        <CardField
          postalCodeEnabled={false}
          placeholder={{
            number: "1234 5678 9012 3456",
          }}
          cardStyle={{
            backgroundColor: '#FFFFFF',
            textColor: '#000000',
          }}
          style={styles.cardField}
          onCardChange={(cardDetails) => {
            console.log('🔍 CardField change:', cardDetails);
            console.log('🔍 cardDetails.complete:', cardDetails?.complete);
            console.log('🔍 cardDetails.validNumber:', cardDetails?.validNumber);
            console.log('🔍 cardDetails.validExpiryDate:', cardDetails?.validExpiryDate);
            console.log('🔍 cardDetails.validCVC:', cardDetails?.validCVC);
            setCardDetails(cardDetails);
          }}
          onFocus={() => {
            console.log('🔍 CardField focus');
          }}
        />
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

      <View style={styles.securityInfo}>
        <Ionicons name="shield-checkmark" size={16} color="#51A905" />
        <Text style={styles.securityText}>
          Paiement sécurisé par Stripe
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
  cardFieldContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  cardField: {
    width: '100%',
    height: 50,
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
});

export default StripePaymentCorrect;
