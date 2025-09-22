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
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const StripePaymentForm = ({ 
  orderDetails,
  onPaymentSuccess, 
  onPaymentError, 
  isLoading, 
  setIsLoading 
}) => {
  const { createPaymentMethod } = useStripe();
  const [cardDetails, setCardDetails] = useState(null);
  const [cardholderName, setCardholderName] = useState('');

  const handlePayPress = async () => {
    console.log('🔍 cardDetails:', cardDetails);
    console.log('🔍 cardholderName:', cardholderName);
    console.log('🔍 cardDetails.complete:', cardDetails?.complete);
    console.log('🔍 cardDetails.number:', cardDetails?.number);
    console.log('🔍 cardDetails.expiryMonth:', cardDetails?.expiryMonth);
    console.log('🔍 cardDetails.expiryYear:', cardDetails?.expiryYear);
    console.log('🔍 cardDetails.cvc:', cardDetails?.cvc);
    
    // Validation manuelle plus détaillée
    if (!cardDetails) {
      Alert.alert('Erreur', 'Aucune donnée de carte détectée');
      return;
    }
    
    if (!cardDetails.number || cardDetails.number.length < 13) {
      Alert.alert('Erreur', 'Numéro de carte invalide');
      return;
    }
    
    if (!cardDetails.expiryMonth || !cardDetails.expiryYear) {
      Alert.alert('Erreur', 'Date d\'expiration invalide');
      return;
    }
    
    if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
      Alert.alert('Erreur', 'Code CVC invalide (minimum 3 chiffres)');
      return;
    }
    
    if (!cardholderName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom du titulaire de la carte');
      return;
    }

    setIsLoading(true);

    try {
      // Créer un payment method via Stripe React Native SDK
      const { paymentMethod, error } = await createPaymentMethod({
        type: 'Card',
        card: cardDetails,
        billingDetails: {
          name: cardholderName.trim(),
        },
      });

      if (error) {
        console.error('Erreur Stripe:', error);
        Alert.alert('Erreur', `Erreur: ${error.message}`);
        onPaymentError(error);
        return;
      }

      console.log('Payment Method ID:', paymentMethod.id);
      
      // Envoie paymentMethod.id à ton backend
      // Ici, appelle ton API Laravel en POST avec paymentMethod.id et total
      const paymentData = {
        order_id: orderDetails.orderId,
        total: orderDetails.total,
        delivery_address: orderDetails.address,
        delivery_phone: orderDetails.phone,
        payment_method_id: paymentMethod.id,
        currency: 'xaf' // FCFA
      };

      // Appel à votre API backend existante
      const response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/paiement', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: paymentData.order_id,
          total: paymentData.total,
          delivery_address: paymentData.delivery_address,
          delivery_phone: paymentData.delivery_phone,
          payment_method: 'cb',
          operator: 'cb',
          payment_method_id: paymentMethod.id,
          card_data: {
            number: cardDetails.number,
            exp_month: cardDetails.expiryMonth,
            exp_year: cardDetails.expiryYear,
            cvc: cardDetails.cvc,
            name: cardholderName.trim()
          }
        })
      });

      const responseData = await response.json();

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

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <Ionicons name="card" size={24} color="#51A905" style={styles.cardIcon} />
        <Text style={styles.title}>Paiement par carte bancaire</Text>
        <Text style={styles.description}>
          Entrez les informations de votre carte pour finaliser le paiement
        </Text>
      </View>

      <View style={styles.cardFieldContainer}>
        <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: '4242 4242 4242 4242',
          }}
          cardStyle={{
            backgroundColor: '#FFFFFF',
            textColor: '#000000',
            fontSize: 16,
            fontFamily: 'Montserrat',
          }}
          style={styles.cardField}
          onCardChange={(card) => {
            console.log('🔍 CardField onChange:', card);
            setCardDetails(card);
          }}
        />
        {cardDetails && (
          <View style={styles.validationStatus}>
            <Ionicons 
              name={cardDetails.complete ? "checkmark-circle" : "alert-circle"} 
              size={16} 
              color={cardDetails.complete ? "#51A905" : "#FFA500"} 
            />
            <Text style={[
              styles.validationText, 
              { color: cardDetails.complete ? "#51A905" : "#FFA500" }
            ]}>
              {cardDetails.complete ? "Carte valide" : "Complétez les informations de la carte"}
            </Text>
          </View>
        )}
        
        {/* Informations de débogage */}
        {cardDetails && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              Numéro: {cardDetails.number ? `${cardDetails.number.substring(0, 4)}****` : 'Non saisi'}
            </Text>
            <Text style={styles.debugText}>
              Date: {cardDetails.expiryMonth && cardDetails.expiryYear ? `${cardDetails.expiryMonth}/${cardDetails.expiryYear}` : 'Non saisie'}
            </Text>
            <Text style={styles.debugText}>
              CVC: {cardDetails.cvc ? `${cardDetails.cvc.length} chiffres` : 'Non saisi'}
            </Text>
            <Text style={styles.debugText}>
              Statut: {cardDetails.complete ? 'Complet' : 'Incomplet'}
            </Text>
          </View>
        )}
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
        style={[
          styles.payButton, 
          (isLoading || !cardDetails || !cardholderName.trim()) && styles.payButtonDisabled
        ]}
        onPress={handlePayPress}
        disabled={isLoading || !cardDetails || !cardholderName.trim()}
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
  cardFieldContainer: {
    marginBottom: 20,
  },
  cardField: {
    height: 50,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
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
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingHorizontal: 5,
  },
  validationText: {
    fontSize: 12,
    marginLeft: 5,
    fontFamily: 'Montserrat',
  },
  debugInfo: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
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

export default StripePaymentForm;
