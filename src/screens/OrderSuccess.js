import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const OrderSuccess = ({ navigation, route }) => {
  const { orderDetails } = route.params;

  const handleGoToOrders = () => {
    // Navigation vers l'historique des commandes
    navigation.reset({
      index: 0,
      routes: [
        { name: 'MainApp' },
        { name: 'OrdersHistory' }
      ],
    });
  };

  const handleGoHome = () => {
    // Retour à l'accueil en réinitialisant la pile de navigation
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={80} color="#51A905" />
      <Text style={styles.title}>Commande Confirmée !</Text>
      <Text style={styles.subtitle}>
        Votre commande a été enregistrée avec succès.
      </Text>
      <Text style={styles.orderNumber}>
        Montant total : {orderDetails.total} FCFA
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={handleGoToOrders}
        >
          <Text style={styles.buttonText}>Voir mes commandes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={handleGoHome}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Retour à l'accueil
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  orderNumber: {
    fontSize: 18,
    color: '#51A905',
    marginBottom: 30,
    fontFamily: 'Montserrat-Bold',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#51A905',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#51A905',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#51A905',
  },
});

export default OrderSuccess; 