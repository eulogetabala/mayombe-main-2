import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const StripeTest = () => {
  const { createPaymentMethod } = useStripe();
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cvv, setCvv] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Test Stripe - Début');

      // Validation
      if (!cardNumber.trim() || !expiryDate.trim() || !cardholderName.trim() || !cvv.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return;
      }

      const [month, year] = expiryDate.split('/');
      if (!month || !year) {
        Alert.alert('Erreur', 'Format de date invalide (MM/YY)');
        return;
      }

      console.log('🔍 Test Stripe - Validation OK');
      console.log('🔍 Test Stripe - Création PaymentMethod...');

      // Créer un PaymentMethod
      const { paymentMethod, error } = await createPaymentMethod({
        type: 'Card',
        billingDetails: {
          name: cardholderName.trim(),
        },
        card: {
          number: cardNumber.replace(/\s/g, ''),
          expMonth: parseInt(month),
          expYear: parseInt('20' + year),
          cvc: cvv,
        },
      });

      if (error) {
        console.error('❌ Erreur Stripe:', error);
        Alert.alert('Erreur Stripe', error.message);
        return;
      }

      console.log('✅ PaymentMethod créé:', paymentMethod.id);
      Alert.alert('Succès', `PaymentMethod créé: ${paymentMethod.id}`);

    } catch (error) {
      console.error('❌ Erreur:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="card" size={24} color="#51A905" />
        <Text style={styles.title}>Test Stripe</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Numéro de carte (4242424242424242)"
        keyboardType="numeric"
        value={cardNumber}
        onChangeText={setCardNumber}
        maxLength={19}
      />

      <TextInput
        style={styles.input}
        placeholder="Nom du titulaire"
        value={cardholderName}
        onChangeText={setCardholderName}
        autoCapitalize="words"
      />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="MM/YY"
          keyboardType="numeric"
          value={expiryDate}
          onChangeText={setExpiryDate}
          maxLength={5}
        />
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 8 }]}
          placeholder="CVC"
          keyboardType="numeric"
          value={cvv}
          onChangeText={setCvv}
          maxLength={4}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handlePayment}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Tester Stripe</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  button: {
    backgroundColor: '#51A905',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StripeTest;
