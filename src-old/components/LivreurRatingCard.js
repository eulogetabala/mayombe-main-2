import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const LivreurRatingCard = ({ 
  livreur, 
  orderId, 
  onRatingComplete, 
  onClose,
  visible = false 
}) => {
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comment, setComment] = useState('');

  const handleStarPress = (starIndex) => {
    setRating(starIndex + 1);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez donner une note au livreur');
      return;
    }

    setIsSubmitting(true);

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert('Erreur', 'Vous devez être connecté pour noter le livreur');
        return;
      }

      const ratingData = {
        admin_id: livreur.id, // ID du livreur
        order_id: orderId,    // ID de la commande
        note: rating          // Note (1-5)
      };

      console.log('📝 Envoi de la notation:', ratingData);

      const response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/noter-livreur', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ratingData),
      });

      const data = await response.json();
      console.log('📥 Réponse notation:', data);

      if (response.ok && (data.success || data.message?.includes('succès'))) {
        console.log('✅ Notation envoyée avec succès');
        Alert.alert(
          'Merci !',
          `Votre note de ${rating}/5 a été enregistrée pour ${livreur.name}`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onRatingComplete) {
                  onRatingComplete(rating);
                }
              },
            },
          ]
        );
      } else {
        console.error('❌ Erreur lors de la notation:', data);
        Alert.alert('Erreur', data.message || 'Impossible d\'enregistrer votre note');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la notation:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi de votre note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Animatable.View 
      animation="slideInUp" 
      duration={600}
      style={styles.overlay}
    >
      <View style={styles.modalContainer}>
        <Animatable.View 
          animation="zoomIn" 
          delay={200}
          style={styles.ratingCard}
        >
          {/* Header avec avatar */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow}>
                <Ionicons name="person" size={24} color="#FF9800" />
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.livreurName}>{livreur?.name || 'Votre livreur'}</Text>
              <Text style={styles.headerSubtitle}>Comment était votre livraison ?</Text>
            </View>
          </View>

          {/* Section de notation avec étoiles */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingTitle}>Notez votre expérience</Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star, index) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(index)}
                  style={styles.starButton}
                >
                  <Animatable.View 
                    animation={rating >= star ? "bounceIn" : "fadeIn"}
                    delay={index * 100}
                  >
                    <Ionicons 
                      name={rating >= star ? "star" : "star-outline"} 
                      size={scaleFont(32)} 
                      color={rating >= star ? "#FFD700" : "#DDD"} 
                    />
                  </Animatable.View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingText}>
              {rating === 0 && "Appuyez sur une étoile"}
              {rating === 1 && "Très déçu"}
              {rating === 2 && "Déçu"}
              {rating === 3 && "Correct"}
              {rating === 4 && "Très bien"}
              {rating === 5 && "Excellent !"}
            </Text>
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Plus tard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton, 
                rating === 0 && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitRating}
              disabled={rating === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>Envoyer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerText: {
    flex: 1,
  },
  livreurName: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat-Bold',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    marginLeft: 8,
    elevation: 4,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: scaleFont(14),
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 6,
  },
});

export default LivreurRatingCard;
