import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import CustomHeader from '../components/common/CustomHeader';
import LivreurRatingCard from '../components/LivreurRatingCard';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const DeliveryCompleteScreen = ({ route, navigation }) => {
  const [showRatingCard, setShowRatingCard] = useState(false);
  
  // Données de démonstration
  const deliveryData = {
    livreur: {
      id: 24,
      name: "Jean Livreur",
      rating: 4.8,
      vehicle: "Moto",
      distance: "2.3 km"
    },
    orderId: "order_123456",
    deliveryTime: "15 minutes",
    totalAmount: 2500
  };

  const handleRatingComplete = (rating) => {
    console.log('✅ Notation complétée:', rating);
    setShowRatingCard(false);
    // Ici on peut naviguer vers la page suivante ou fermer
    navigation.goBack();
  };

  const handleShowRating = () => {
    setShowRatingCard(true);
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Livraison terminée"
        backgroundColor="#4CAF50"
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Carte de succès */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.successCard}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.successTitle}>Livraison terminée !</Text>
          <Text style={styles.successSubtitle}>
            Votre commande a été livrée avec succès
          </Text>
        </Animatable.View>

        {/* Informations de la livraison */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Détails de la livraison</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="bicycle" size={20} color="#FF9800" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Livreur</Text>
              <Text style={styles.infoValue}>{deliveryData.livreur.name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={20} color="#FF9800" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Temps de livraison</Text>
              <Text style={styles.infoValue}>{deliveryData.deliveryTime}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={20} color="#FF9800" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Distance</Text>
              <Text style={styles.infoValue}>{deliveryData.livreur.distance}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="cash-outline" size={20} color="#FF9800" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Montant total</Text>
              <Text style={styles.infoValue}>{deliveryData.totalAmount} FCFA</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Actions */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.rateButton}
            onPress={handleShowRating}
          >
            <Ionicons name="star" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.rateButtonText}>Noter le livreur</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="home" size={20} color="#FF9800" style={{ marginRight: 8 }} />
            <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>

      {/* Carte de notation */}
      <LivreurRatingCard
        livreur={deliveryData.livreur}
        orderId={deliveryData.orderId}
        visible={showRatingCard}
        onRatingComplete={handleRatingComplete}
        onClose={() => setShowRatingCard(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: scaleFont(16),
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoCardTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scaleFont(12),
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  actionsContainer: {
    marginTop: 20,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  rateButtonText: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  homeButtonText: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
});

export default DeliveryCompleteScreen;
