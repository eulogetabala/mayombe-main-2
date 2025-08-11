import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import CustomHeader from '../components/common/CustomHeader';
import LivreurRatingCard from '../components/LivreurRatingCard';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const LivreurSimulatorScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showRatingCard, setShowRatingCard] = useState(false);
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('pending');

  // Données de simulation
  const livreurs = [
    {
      id: 1,
      name: "Jean Express",
      rating: 4.8,
      vehicle: "Moto",
      distance: "1.2 km",
      experience: "3 ans",
      deliveries: 1247,
      status: "Disponible"
    },
    {
      id: 2,
      name: "Marie Flash",
      rating: 4.9,
      vehicle: "Moto",
      distance: "2.1 km",
      experience: "5 ans",
      deliveries: 2156,
      status: "Disponible"
    },
    {
      id: 3,
      name: "Paul Rapide",
      rating: 4.7,
      vehicle: "Moto",
      distance: "0.8 km",
      experience: "2 ans",
      deliveries: 892,
      status: "Disponible"
    }
  ];

  const simulateStep = (step) => {
    setCurrentStep(step);
    
    switch(step) {
      case 1:
        // Étape 1: Sélection du livreur
        Alert.alert('Étape 1', 'Sélection du livreur');
        break;
      case 2:
        // Étape 2: Création de la commande (Endpoint 27)
        setOrderId(`order_${Date.now()}`);
        Alert.alert('Étape 2', `Commande créée: ${orderId || 'order_' + Date.now()}`);
        break;
      case 3:
        // Étape 3: Paiement
        Alert.alert('Étape 3', 'Paiement effectué');
        break;
      case 4:
        // Étape 4: Livraison en cours
        setDeliveryStatus('en_cours');
        Alert.alert('Étape 4', 'Livraison en cours...');
        break;
      case 5:
        // Étape 5: Livraison terminée
        setDeliveryStatus('terminée');
        Alert.alert('Étape 5', 'Livraison terminée !');
        break;
      case 6:
        // Étape 6: Notation
        setShowRatingCard(true);
        break;
    }
  };

  const handleLivreurSelection = (livreur) => {
    setSelectedLivreur(livreur);
    simulateStep(2);
  };

  const handleStartTracking = () => {
    navigation.navigate('OrderTracking', {
      orderId: orderId || `order_${Date.now()}`,
      livreur: selectedLivreur
    });
  };

  const handleRatingComplete = (rating) => {
    console.log('✅ Notation complétée:', rating);
    setShowRatingCard(false);
    Alert.alert(
      'Simulation terminée !',
      `Processus complet testé avec succès.\nNote donnée: ${rating}/5`,
      [
        {
          text: 'Recommencer',
          onPress: () => {
            setCurrentStep(1);
            setSelectedLivreur(null);
            setOrderId(null);
            setDeliveryStatus('pending');
          }
        },
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5, 6].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step ? styles.stepActive : styles.stepInactive
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep >= step ? styles.stepNumberActive : styles.stepNumberInactive
            ]}>
              {step}
            </Text>
          </View>
          {step < 6 && (
            <View style={[
              styles.stepLine,
              currentStep > step ? styles.stepLineActive : styles.stepLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <Animatable.View animation="fadeInUp" style={styles.stepContent}>
            <Text style={styles.stepTitle}>Étape 1: Sélection du livreur</Text>
            <Text style={styles.stepDescription}>
              Choisissez un livreur disponible pour votre livraison
            </Text>
            
            <View style={styles.livreursGrid}>
              {livreurs.map((livreur, index) => (
                <TouchableOpacity
                  key={livreur.id}
                  style={styles.livreurCard}
                  onPress={() => handleLivreurSelection(livreur)}
                >
                  <View style={styles.livreurAvatar}>
                    <Ionicons name="person" size={24} color="#FF9800" />
                  </View>
                  <Text style={styles.livreurName}>{livreur.name}</Text>
                  <View style={styles.livreurRating}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.livreurRatingText}>{livreur.rating}</Text>
                  </View>
                  <Text style={styles.livreurDistance}>{livreur.distance}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animatable.View>
        );

      case 2:
        return (
          <Animatable.View animation="fadeInUp" style={styles.stepContent}>
            <Text style={styles.stepTitle}>Étape 2: Commande créée</Text>
            <Text style={styles.stepDescription}>
              La commande a été créée avec l'endpoint 27
            </Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>Livreur sélectionné: {selectedLivreur?.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>ID Commande: {orderId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>Prix: 1500 FCFA</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => simulateStep(3)}
            >
              <Text style={styles.nextButtonText}>Continuer vers le paiement</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: '#4CAF50', marginTop: 12 }]}
              onPress={handleStartTracking}
            >
              <Text style={styles.nextButtonText}>Commencer le suivi</Text>
            </TouchableOpacity>
          </Animatable.View>
        );

      case 3:
        return (
          <Animatable.View animation="fadeInUp" style={styles.stepContent}>
            <Text style={styles.stepTitle}>Étape 3: Paiement</Text>
            <Text style={styles.stepDescription}>
              Simulation du processus de paiement
            </Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="card" size={20} color="#FF9800" />
                <Text style={styles.infoText}>Paiement par MTN Mobile Money</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>Paiement confirmé</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => simulateStep(4)}
            >
              <Text style={styles.nextButtonText}>Démarrer la livraison</Text>
            </TouchableOpacity>
          </Animatable.View>
        );

      case 4:
        return (
          <Animatable.View animation="fadeInUp" style={styles.stepContent}>
            <Text style={styles.stepTitle}>Étape 4: Livraison en cours</Text>
            <Text style={styles.stepDescription}>
              Le livreur est en route vers vous
            </Text>
            
            <View style={styles.deliveryCard}>
              <Animatable.View animation="pulse" iterationCount="infinite">
                <Ionicons name="bicycle" size={60} color="#FF9800" />
              </Animatable.View>
              <Text style={styles.deliveryText}>En route...</Text>
              <Text style={styles.deliveryTime}>Temps estimé: 15-20 min</Text>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => simulateStep(5)}
            >
              <Text style={styles.nextButtonText}>Livraison terminée</Text>
            </TouchableOpacity>
          </Animatable.View>
        );

      case 5:
        return (
          <Animatable.View animation="fadeInUp" style={styles.stepContent}>
            <Text style={styles.stepTitle}>Étape 5: Livraison terminée</Text>
            <Text style={styles.stepDescription}>
              Votre commande a été livrée avec succès
            </Text>
            
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              <Text style={styles.successText}>Livraison terminée !</Text>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => simulateStep(6)}
            >
              <Text style={styles.nextButtonText}>Noter le livreur</Text>
            </TouchableOpacity>
          </Animatable.View>
        );

      case 6:
        return (
          <Animatable.View animation="fadeInUp" style={styles.stepContent}>
            <Text style={styles.stepTitle}>Étape 6: Notation</Text>
            <Text style={styles.stepDescription}>
              Donnez votre avis sur la livraison
            </Text>
            
            <View style={styles.ratingCard}>
              <Ionicons name="star" size={60} color="#FFD700" />
              <Text style={styles.ratingText}>Cliquez pour noter</Text>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setShowRatingCard(true)}
            >
              <Text style={styles.nextButtonText}>Ouvrir la notation</Text>
            </TouchableOpacity>
          </Animatable.View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Simulateur Livreur"
        backgroundColor="#FF9800"
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepIndicator()}
        {renderStepContent()}
      </ScrollView>

      {/* Carte de notation */}
      <LivreurRatingCard
        livreur={selectedLivreur}
        orderId={orderId}
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#FF9800',
  },
  stepInactive: {
    backgroundColor: '#ddd',
  },
  stepNumber: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepNumberInactive: {
    color: '#666',
  },
  stepLine: {
    width: 30,
    height: 2,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#FF9800',
  },
  stepLineInactive: {
    backgroundColor: '#ddd',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: scaleFont(16),
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    marginBottom: 24,
  },
  livreursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  livreurCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    width: (width - 48) / 2,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  livreurAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  livreurName: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  livreurRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  livreurRatingText: {
    fontSize: scaleFont(12),
    color: '#FFA000',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  livreurDistance: {
    fontSize: scaleFont(12),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: scaleFont(14),
    color: '#333',
    fontFamily: 'Montserrat',
    marginLeft: 12,
  },
  nextButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  nextButtonText: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deliveryText: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginTop: 12,
  },
  deliveryTime: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 4,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  successText: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'Montserrat-Bold',
    marginTop: 12,
  },
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ratingText: {
    fontSize: scaleFont(16),
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 12,
  },
});

export default LivreurSimulatorScreen;
