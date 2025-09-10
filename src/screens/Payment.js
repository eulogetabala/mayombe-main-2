import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import translations from '../translations';

const Payment = ({ navigation, route }) => {
  const { orderDetails } = route.params;
  const { completeOrder, clearCart } = useCart();
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Simuler un délai de paiement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Marquer la commande comme terminée dans le contexte
      await completeOrder();
      
      // Vider le panier et attendre que ce soit fait
      await clearCart();
      
      // Attendre un court instant pour s'assurer que le panier est bien vidé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      Alert.alert(
        t.payment.paymentSuccess,
        t.payment.paymentSuccessMessage,
        [
          {
            text: "OK",
            onPress: () => {
              // Forcer la navigation vers l'écran de suivi
              navigation.reset({
                index: 0,
                routes: [{ name: 'OrderTracking', params: { orderId: orderDetails.orderId } }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      Alert.alert(t.payment.error, t.payment.paymentError);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.payment.title}</Text>
      
      <View style={styles.orderSummary}>
        <Text style={styles.summaryTitle}>{t.payment.orderSummary}</Text>
        <Text style={styles.summaryText}>{t.payment.subtotal}: {orderDetails.subtotal} FCFA</Text>
        <Text style={styles.summaryText}>{t.payment.deliveryFee}: {orderDetails.deliveryFee} FCFA</Text>
        <Text style={styles.totalText}>{t.payment.total}: {orderDetails.total} FCFA</Text>
      </View>

      <TouchableOpacity 
        style={[styles.payButton, isProcessing && styles.disabledButton]}
        onPress={handlePayment}
        disabled={isProcessing}
      >
        <Text style={styles.payButtonText}>
          {isProcessing ? t.payment.processing : t.payment.payNow}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  orderSummary: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 5,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  payButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
   
  },
});

export default Payment; 