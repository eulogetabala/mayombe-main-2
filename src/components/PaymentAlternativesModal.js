import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const PaymentAlternativesModal = ({ visible, onClose, cartItems, sharedCartId }) => {
  const handleWhatsAppPayment = () => {
    const cartSummary = cartItems.map(item => `• ${item.name} (${item.quantity}x)`).join('\n');
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    const message = `Bonjour ! Je souhaite payer un panier partagé Mayombe.

🛒 Détails du panier :
${cartSummary}

💰 Total: ${totalAmount.toLocaleString()} FCFA
🆔 ID du panier: ${sharedCartId}

Pouvez-vous m'aider à finaliser le paiement ?`;

    Share.share({
      message: message,
      title: 'Paiement panier partagé'
    });
  };

  const handleCallPayment = () => {
    Alert.alert(
      'Paiement par téléphone',
      'Appelez notre service client au +242 06 12 34 56 78 et mentionnez l\'ID du panier pour finaliser le paiement.',
      [
        {
          text: 'Appeler maintenant',
          onPress: () => Linking.openURL('tel:+2420612345678')
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ]
    );
  };

  const handleWebPayment = () => {
    const webUrl = `https://mayombe-payment.web.app/cart/${sharedCartId}`;
    Linking.openURL(webUrl).catch(() => {
      Alert.alert(
        'Lien non accessible',
        'La page web de paiement n\'est pas encore disponible. Veuillez utiliser une des autres options.'
      );
    });
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animatable.View 
          animation="slideInUp" 
          duration={300}
          style={styles.modalContainer}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Options de paiement</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.infoSection}>
              <Ionicons name="information-circle" size={24} color="#FF9800" />
              <Text style={styles.infoText}>
                Choisissez votre méthode de paiement préférée :
              </Text>
            </View>

            <View style={styles.cartSummary}>
              <Text style={styles.summaryTitle}>Résumé du panier :</Text>
              {cartItems.map((item, index) => (
                <Text key={index} style={styles.summaryItem}>
                  • {item.name} ({item.quantity}x) - {item.total?.toLocaleString()} FCFA
                </Text>
              ))}
              <Text style={styles.totalText}>
                Total: {totalAmount.toLocaleString()} FCFA
              </Text>
            </View>

            <View style={styles.paymentOptions}>
              <TouchableOpacity style={styles.paymentOption} onPress={handleWebPayment}>
                <View style={styles.optionIcon}>
                  <Ionicons name="globe" size={24} color="#FF9800" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Paiement web</Text>
                  <Text style={styles.optionDescription}>
                    Payez directement sur notre site web sans télécharger l'app
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#FF9800" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.paymentOption} onPress={handleWhatsAppPayment}>
                <View style={styles.optionIcon}>
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Paiement WhatsApp</Text>
                  <Text style={styles.optionDescription}>
                    Contactez notre service client via WhatsApp
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#25D366" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.paymentOption} onPress={handleCallPayment}>
                <View style={styles.optionIcon}>
                  <Ionicons name="call" size={24} color="#007AFF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Paiement par téléphone</Text>
                  <Text style={styles.optionDescription}>
                    Appelez notre service client pour payer
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.noteSection}>
              <Text style={styles.noteTitle}>💡 Note importante :</Text>
              <Text style={styles.noteText}>
                Toutes ces méthodes sont sécurisées et vous permettent de payer sans créer de compte sur l'application.
              </Text>
            </View>
          </ScrollView>
        </Animatable.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  cartSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
  },
  summaryItem: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 5,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginTop: 10,
  },
  paymentOptions: {
    gap: 15,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  noteSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
});

export default PaymentAlternativesModal; 