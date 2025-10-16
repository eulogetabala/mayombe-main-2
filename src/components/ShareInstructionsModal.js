import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { ref, set, get } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import sharedCartService from '../services/sharedCartService';

// Initialiser Firebase
const database = getDatabase();

const ShareInstructionsModal = ({ visible, onClose, cartItems, sharedCartId }) => {
  const handleCopyId = () => {
    Clipboard.setString(sharedCartId);
    Alert.alert(
      "✅ ID copié !", 
      `L'ID du panier a été copié dans le presse-papiers.\n\n🆔 ${sharedCartId}\n\nVous pouvez maintenant le partager ou le coller ailleurs.`,
      [
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );
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
              <Text style={styles.idLabel}>🆔 ID du panier :</Text>
              <TouchableOpacity 
                style={styles.idContainer}
                onPress={handleCopyId}
                activeOpacity={0.7}
              >
                <View style={styles.idTextContainer}>
                  <Ionicons name="link" size={16} color="#FF9800" />
                  <Text style={styles.idText}>{sharedCartId}</Text>
                </View>
                <View style={styles.copyIndicator}>
                  <Ionicons name="copy" size={16} color="#FF9800" />
                  <Text style={styles.copyHint}>Appuyer pour copier</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.copyIdButton}
                onPress={handleCopyId}
              >
                <Ionicons name="copy" size={20} color="#FFF" />
                <Text style={styles.copyIdButtonText}>Copier l'ID</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionsSection}>
              <Text style={styles.instructionsTitle}>Instructions :</Text>
              <View style={styles.instructionItem}>
                <Ionicons name="download" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Téléchargez l'app Mayombe</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="share" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Cliquez sur "Panier partagé"</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="key" size={16} color="#FF9800" />
                <View style={styles.instructionTextContainer}>
                  <Text style={styles.instructionText}>Entrez l'ID :</Text>
                  <TouchableOpacity 
                    style={styles.instructionIdContainer}
                    onPress={handleCopyId}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="link" size={12} color="#FF9800" />
                    <Text style={styles.instructionIdText}>{sharedCartId}</Text>
                    <Ionicons name="copy" size={12} color="#FF9800" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="card" size={16} color="#FF9800" />
                <Text style={styles.instructionText}>Cliquez sur "Payer maintenant"</Text>
              </View>
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
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF9800',
    marginBottom: 10,
  },
  idTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  idText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  copyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyHint: {
    fontSize: 10,
    color: '#FF9800',
    fontFamily: 'Montserrat',
    marginLeft: 4,
    fontWeight: '500',
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
  instructionTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  instructionIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  instructionIdText: {
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 4,
    marginRight: 4,
    textDecorationLine: 'underline',
  },
});

export default ShareInstructionsModal; 