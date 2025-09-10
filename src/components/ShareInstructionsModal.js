import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const ShareInstructionsModal = ({ visible, onClose, cartItems, sharedCartId }) => {
  const handleCopyId = () => {
    Clipboard.setString(sharedCartId);
    Alert.alert("ID copié", "L'ID du panier a été copié dans le presse-papiers.");
  };

  const handleShareWhatsApp = () => {
    const cartSummary = cartItems.map(item => `• ${item.name} (${item.quantity}x)`).join('\n');
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    const message = `🛒 Mon panier Mayombe

${cartSummary}

💰 Total: ${totalAmount.toLocaleString()} FCFA

📱 Pour payer ce panier :
1. Téléchargez l'app Mayombe
2. Ouvrez l'app et cliquez sur "Panier partagé"
3. Entrez l'ID: ${sharedCartId}
4. Cliquez sur "Payer maintenant" pour régler directement

💳 Paiement sécurisé par MTN Money, Airtel Money ou carte bancaire

#Mayombe #Livraison #Congo`;

    Share.share({
      message: message,
      title: 'Mon panier Mayombe'
    });
  };

  const handlePayViaWhatsApp = () => {
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

  const handleShareSMS = () => {
    const cartSummary = cartItems.map(item => `• ${item.name} (${item.quantity}x)`).join('\n');
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    const message = `Mon panier Mayombe: ${cartSummary} - Total: ${totalAmount.toLocaleString()} FCFA. ID: ${sharedCartId}. Téléchargez l'app Mayombe et cliquez sur "Panier partagé" puis "Payer maintenant".`;
    
    Share.share({
      message: message,
      title: 'Panier Mayombe'
    });
  };

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
            <Text style={styles.title}>Partager mon panier</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.infoSection}>
              <Ionicons name="information-circle" size={24} color="#FF9800" />
              <Text style={styles.infoText}>
                Le lien web n'est pas accessible pour le moment. Utilisez une de ces méthodes :
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
                Total: {cartItems.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString()} FCFA
              </Text>
            </View>

            <View style={styles.idSection}>
              <Text style={styles.idLabel}>ID du panier :</Text>
              <View style={styles.idContainer}>
                <Text style={styles.idText}>{sharedCartId}</Text>
                <TouchableOpacity onPress={handleCopyId} style={styles.copyButton}>
                  <Ionicons name="copy" size={16} color="#FF9800" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.copyIdButton}
                onPress={handleCopyId}
              >
                <Ionicons name="copy" size={20} color="#FFF" />
                <Text style={styles.copyIdButtonText}>Copier l'ID</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionsSection}>
              <Text style={styles.instructionsTitle}>Instructions pour le destinataire :</Text>
              <View style={styles.instructionItem}>
                <Ionicons name="download" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Téléchargez l'app Mayombe depuis le Play Store</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="share" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Ouvrez l'app et cliquez sur "Panier partagé"</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="key" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Entrez l'ID du panier : {sharedCartId}</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="card" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Cliquez sur "Payer maintenant" pour régler directement</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="shield-checkmark" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Paiement sécurisé par MTN Money, Airtel Money ou carte bancaire</Text>
              </View>
              
              <View style={styles.alternativeSection}>
                <Text style={styles.alternativeTitle}>💡 Alternative sans inscription :</Text>
                <Text style={styles.alternativeText}>
                  Si vous ne voulez pas télécharger l'app, vous pouvez payer directement via WhatsApp en contactant notre service client avec l'ID : {sharedCartId}
                </Text>
              </View>
            </View>

            <View style={styles.shareOptions}>
              <TouchableOpacity style={styles.shareButton} onPress={handleShareWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                <Text style={styles.shareButtonText}>Partager via WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.shareButton, styles.whatsappPayButton]} onPress={handlePayViaWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                <Text style={styles.shareButtonText}>Payer via WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.shareButton, styles.smsButton]} onPress={handleShareSMS}>
                <Ionicons name="chatbubble" size={20} color="#FFF" />
                <Text style={styles.shareButtonText}>Partager via SMS</Text>
              </TouchableOpacity>
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
  idSection: {
    marginBottom: 20,
  },
  idLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  idText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#333',
  },
  copyButton: {
    padding: 5,
  },
  copyIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    marginTop: 10,
  },
  copyIdButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  instructionsSection: {
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  shareOptions: {
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
  },
  smsButton: {
    backgroundColor: '#007AFF',
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  alternativeSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  alternativeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
  },
  alternativeText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  whatsappPayButton: {
    backgroundColor: '#25D366', // Same color as shareButton for consistency
  },
});

export default ShareInstructionsModal; 