import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView
} from 'react-native';
import { CardField, useStripe, useConfirmPayment } from '@stripe/stripe-react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const StripePaymentScreen = ({ route, navigation }) => {
  const { orderDetails, onPaymentSuccess } = route.params;
  const { createPaymentMethod } = useStripe();
  const { confirmPayment } = useConfirmPayment();
  const { clearCart } = useCart();
  const [cardDetails, setCardDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Erreur', 'Veuillez entrer une carte valide.');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🔍 Création du PaymentMethod...');
      
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
        card: cardDetails,
      });

      if (error) {
        console.log('❌ Erreur createPaymentMethod:', error);
        Alert.alert('Erreur', error.message);
        setIsProcessing(false);
        return;
      }

      console.log('✅ PaymentMethod créé:', paymentMethod);
      
      // Récupérer le token d'authentification
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert("Erreur", "Vous devez être connecté pour effectuer cette action");
        setIsProcessing(false);
        return;
      }
      
      // Étape 1: Créer le PaymentIntent côté backend
      const requestData = {
        order_id: orderDetails.orderId,
        total: orderDetails.total,
        delivery_address: orderDetails.address,
        delivery_phone: orderDetails.phone,
        payment_method: 'cb', // carte bancaire
        operator: 'cb',
        payment_method_id: paymentMethod.id, // ID Stripe
        return_url: 'mayombe://payment-return', // URL de retour pour l'app
      };
      
      console.log('📤 Données envoyées au backend:', requestData);
      
      const response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/paiement', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log('📱 Réponse backend:', data);
      console.log('🔍 Client Secret reçu:', data.client_secret ? 'OUI' : 'NON');

      if (response.ok && data.success) {
        // Étape 2: Confirmer le paiement avec le client_secret
        if (data.client_secret) {
          console.log('🔐 Confirmation du paiement avec client_secret');
          
          // Confirmer le paiement (avec ou sans 3D Secure)
          const { error: confirmError, paymentIntent } = await confirmPayment(
            data.client_secret,
            {
              paymentMethodType: 'Card',
              paymentMethodId: paymentMethod.id
            }
          );

          if (confirmError) {
            console.log('❌ Erreur confirmation:', confirmError);
            
            // Gérer l'erreur de confirmation_method manual
            if (confirmError.code === 'payment_intent_invalid_parameter' && 
                confirmError.message.includes('confirmation_method')) {
              Alert.alert(
                'Configuration Stripe', 
                'Le backend doit être configuré avec confirmation_method: automatic. Contactez le développeur backend.',
                [{ text: 'OK' }]
              );
            } else if (confirmError.code === 'payment_intent_payment_attempt_failed') {
              // Erreur de paiement - vérifier le type d'erreur
              let errorMessage = confirmError.message;
              
              if (confirmError.paymentIntent?.last_payment_error) {
                const error = confirmError.paymentIntent.last_payment_error;
                if (error.decline_code === 'insufficient_funds') {
                  errorMessage = 'Fonds insuffisants. Veuillez vérifier le solde de votre compte ou utiliser une autre carte.';
                } else if (error.decline_code === 'generic_decline') {
                  errorMessage = 'Transaction refusée par votre banque. Veuillez contacter votre banque ou utiliser une autre carte.';
                } else if (error.decline_code === 'expired_card') {
                  errorMessage = 'Votre carte a expiré. Veuillez utiliser une autre carte.';
                } else if (error.decline_code === 'incorrect_cvc') {
                  errorMessage = 'Code de sécurité incorrect. Veuillez vérifier le CVC de votre carte.';
                }
              }
              
              Alert.alert('Paiement échoué', errorMessage);
            } else {
              Alert.alert('Erreur de paiement', confirmError.message);
            }
            setIsProcessing(false);
            return;
          }

          console.log('✅ Paiement confirmé:', paymentIntent);
          console.log('🔍 Statut du paiement:', paymentIntent.status);
          console.log('🔍 NextAction (3D Secure):', paymentIntent.nextAction);
          console.log('🔍 ConfirmationMethod:', paymentIntent.confirmationMethod);
          console.log('🔍 PaymentMethod:', paymentIntent.paymentMethod);
          console.log('🔍 Amount:', paymentIntent.amount);
          console.log('🔍 Currency:', paymentIntent.currency);

          // Vérifier si 3D Secure est requis
          if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_source_action') {
            console.log('🔐 3D Secure requis - authentification en cours...');
            // Stripe devrait automatiquement ouvrir 3D Secure
            // Pas besoin de code supplémentaire, Stripe gère automatiquement
            return;
          }

          if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'Succeeded') {
            // Vider le panier seulement si le paiement a réussi
            try {
              await clearCart();
              await AsyncStorage.removeItem('cart');
              console.log('✅ Panier vidé après paiement réussi');
            } catch (error) {
              console.error('❌ Erreur lors du vidage du panier:', error);
            }

            Alert.alert(
              'Paiement réussi !', 
              'Votre paiement par carte bancaire a été traité avec succès. Vous recevrez un SMS de confirmation.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (onPaymentSuccess) {
                      onPaymentSuccess(data);
                    }
                    navigation.navigate('OrderSuccess', { orderDetails: data });
                  }
                }
              ]
            );
          } else if (paymentIntent.status === 'requires_payment_method' || 
                     paymentIntent.status === 'requires_action' ||
                     paymentIntent.status === 'canceled') {
            // Paiement échoué - ne pas enregistrer la commande
            let errorMessage = 'Votre paiement n\'a pas pu être traité. Veuillez vérifier vos informations de carte ou essayer une autre méthode de paiement.';
            
            // Vérifier si c'est une erreur de fonds insuffisants
            if (paymentIntent.last_payment_error) {
              const error = paymentIntent.last_payment_error;
              if (error.decline_code === 'insufficient_funds' || 
                  error.code === 'card_declined' && error.decline_code === 'insufficient_funds') {
                errorMessage = 'Fonds insuffisants. Veuillez vérifier le solde de votre compte ou utiliser une autre carte.';
              } else if (error.decline_code === 'generic_decline') {
                errorMessage = 'Transaction refusée par votre banque. Veuillez contacter votre banque ou utiliser une autre carte.';
              } else if (error.decline_code === 'expired_card') {
                errorMessage = 'Votre carte a expiré. Veuillez utiliser une autre carte.';
              } else if (error.decline_code === 'incorrect_cvc') {
                errorMessage = 'Code de sécurité incorrect. Veuillez vérifier le CVC de votre carte.';
              }
            }
            
            Alert.alert(
              'Paiement échoué', 
              errorMessage,
              [{ text: 'OK' }]
            );
          } else {
            // Autres statuts (processing, etc.) - ne pas enregistrer encore
            Alert.alert(
              'Paiement en cours', 
              'Votre paiement est en cours de traitement. Vous recevrez un SMS de confirmation de votre banque.',
              [{ text: 'OK' }]
            );
          }
        } else {
          // Pas de client_secret - vérifier le statut du backend
          console.log('📱 Paiement direct - vérification du statut backend:', data);
          
          if (data.payment_status === 'success' || data.payment_status === 'completed') {
            // Paiement réussi côté backend
            try {
              await clearCart();
              await AsyncStorage.removeItem('cart');
              console.log('✅ Panier vidé après paiement direct réussi');
            } catch (error) {
              console.error('❌ Erreur lors du vidage du panier:', error);
            }

            Alert.alert(
              'Paiement réussi !', 
              'Votre paiement par carte bancaire a été traité avec succès. Vous recevrez un SMS de confirmation.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (onPaymentSuccess) {
                      onPaymentSuccess(data);
                    }
                    navigation.navigate('OrderSuccess', { orderDetails: data });
                  }
                }
              ]
            );
          } else {
            // Paiement échoué côté backend
            let errorMessage = data.message || 'Votre paiement n\'a pas pu être traité. Veuillez réessayer.';
            
            // Vérifier si c'est une erreur de fonds insuffisants côté backend
            if (data.error_code === 'insufficient_funds' || 
                data.message?.toLowerCase().includes('insufficient') ||
                data.message?.toLowerCase().includes('fonds insuffisants')) {
              errorMessage = 'Fonds insuffisants. Veuillez vérifier le solde de votre compte ou utiliser une autre carte.';
            } else if (data.error_code === 'card_declined') {
              errorMessage = 'Transaction refusée par votre banque. Veuillez contacter votre banque ou utiliser une autre carte.';
            } else if (data.error_code === 'expired_card') {
              errorMessage = 'Votre carte a expiré. Veuillez utiliser une autre carte.';
            }
            
            Alert.alert(
              'Paiement échoué', 
              errorMessage,
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        Alert.alert('Erreur de paiement', data.message || 'Une erreur est survenue lors du paiement.');
      }

    } catch (err) {
      console.error('❌ Erreur paiement:', err);
      Alert.alert('Erreur', 'Impossible de traiter le paiement. Veuillez réessayer.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9800" />
      
      <LinearGradient
        colors={['#FF9800', '#FF6B00']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              try {
                // Toujours aller au panier, pas de goBack()
                navigation.navigate('Cart');
              } catch (error) {
                console.log('Erreur navigation:', error);
                // Fallback vers l'écran principal
                navigation.navigate('Home');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Paiement par carte</Text>
            <Text style={styles.headerSubtitle}>Paiement sécurisé par Stripe</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="card" size={24} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Ionicons name="card" size={24} color="#51A905" />
            <Text style={styles.cardTitle}>Informations de la carte</Text>
          </View>
          
          <CardField
            postalCodeEnabled={false}
            placeholders={{ 
              number: '4242 4242 4242 4242',
              expiryDate: 'MM/AA',
              cvc: 'CVC'
            }}
            cardStyle={{
              backgroundColor: '#FFFFFF',
              textColor: '#000000',
              borderColor: '#E0E0E0',
              borderWidth: 1,
              borderRadius: 8,
              fontSize: 16,
              fontFamily: 'Montserrat',
            }}
            style={styles.cardField}
            onCardChange={(card) => setCardDetails(card)}
          />

          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark" size={16} color="#51A905" />
            <Text style={styles.securityText}>
              Paiement sécurisé par Stripe - Vos données sont protégées
            </Text>
          </View>
        </View>

        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Résumé de la commande</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryValue}>{orderDetails.subtotal} FCFA</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frais de livraison</Text>
            <Text style={styles.summaryValue}>{orderDetails.deliveryFee} FCFA</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{orderDetails.total} FCFA</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!cardDetails?.complete || isProcessing) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!cardDetails?.complete || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="#fff" style={styles.payButtonIcon} />
              <Text style={styles.payButtonText}>
                Payer {orderDetails.total} FCFA
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: scaleFont(14),
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
  },
  headerIcon: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 10,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 10,
  },
  cardField: {
    height: 50,
    marginVertical: 20,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9ED',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  securityText: {
    fontSize: scaleFont(12),
    color: '#51A905',
    fontFamily: 'Montserrat',
    marginLeft: 8,
    flex: 1,
  },
  orderSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  summaryValue: {
    fontSize: scaleFont(14),
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalValue: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: '#51A905',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonIcon: {
    marginRight: 10,
  },
  payButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});

export default StripePaymentScreen;