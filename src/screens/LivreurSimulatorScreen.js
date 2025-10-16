import React, { useState, useEffect, useRef } from 'react';
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
import FirebaseTrackingService from '../services/firebase';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const LivreurSimulatorScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showRatingCard, setShowRatingCard] = useState(false);
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('pending');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  
  const simulationInterval = useRef(null);
  const currentPosition = useRef({ lat: -4.2634, lng: 15.2429 });
  const destinationPosition = useRef({ lat: -4.3217, lng: 15.3125 });

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

  // Calculer la distance entre deux points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Simuler le mouvement du livreur
  const simulateDriverMovement = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }

    setIsSimulating(true);
    setSimulationProgress(0);

    // Calculer le nombre total d'étapes (simulation de 2 minutes)
    const totalSteps = 120; // 2 minutes * 60 secondes
    let currentStep = 0;

    simulationInterval.current = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      setSimulationProgress(progress);

      // Calculer la nouvelle position (interpolation linéaire)
      const latDiff = destinationPosition.current.lat - currentPosition.current.lat;
      const lngDiff = destinationPosition.current.lng - currentPosition.current.lng;
      
      const newLat = currentPosition.current.lat + (latDiff * progress / 100);
      const newLng = currentPosition.current.lng + (lngDiff * progress / 100);

      currentPosition.current = { lat: newLat, lng: newLng };

      // Calculer la distance restante
      const remainingDistance = calculateDistance(
        newLat, newLng,
        destinationPosition.current.lat, destinationPosition.current.lng
      );

      // Envoyer la position à Firebase
      FirebaseTrackingService.updateDriverLocation(orderId, {
        latitude: newLat,
        longitude: newLng,
        accuracy: 5,
        speed: 20, // km/h
        heading: 45
      });

      // Mettre à jour le statut selon la progression
      if (progress < 20) {
        FirebaseTrackingService.updateDeliveryStatus(orderId, {
          status: 'en_route',
          distance: Math.round(remainingDistance * 1000),
          estimatedTime: Math.max(1, Math.round(remainingDistance * 2))
        });
      } else if (progress > 90) {
        FirebaseTrackingService.updateDeliveryStatus(orderId, {
          status: 'arrived',
          distance: Math.round(remainingDistance * 1000),
          estimatedTime: 0
        });
      } else {
        FirebaseTrackingService.updateDeliveryStatus(orderId, {
          status: 'en_route',
          distance: Math.round(remainingDistance * 1000),
          estimatedTime: Math.max(1, Math.round(remainingDistance * 2))
        });
      }

      // Arrêter la simulation quand terminée
      if (currentStep >= totalSteps) {
        clearInterval(simulationInterval.current);
        setIsSimulating(false);
        setSimulationProgress(100);
        
        // Marquer comme terminé
        FirebaseTrackingService.updateDeliveryStatus(orderId, {
          status: 'completed',
          distance: 0,
          estimatedTime: 0
        });

        // Passer à l'étape de notation
        setTimeout(() => {
          setCurrentStep(6);
        }, 2000);
      }
    }, 1000); // Mise à jour toutes les secondes
  };

  const simulateStep = (step) => {
    setCurrentStep(step);
    
    switch(step) {
      case 1:
        // Étape 1: Sélection du livreur
        Alert.alert('Étape 1', 'Sélection du livreur');
        break;
      case 2:
        // Étape 2: Création de la commande
        const newOrderId = `order_${Date.now()}`;
        setOrderId(newOrderId);
        
        // Créer la commande dans Firebase avec des données réalistes
        FirebaseTrackingService.createOrder(newOrderId, {
          customer: {
            phone: "+242000000000" // Seulement le téléphone (pas de nom ni email)
          },
          delivery_address: {
            latitude: destinationPosition.current.lat,
            longitude: destinationPosition.current.lng,
            address: "Adresse de livraison simulée"
          },
          order: {
            id: newOrderId,
            items: [
              {
                name: "Produit de test",
                quantity: 1,
                price: 5000,
                total: 5000
              }
            ],
            total_amount: 6000,
            delivery_fee: 1000,
            subtotal: 5000,
            distance: 2.5
          },
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        Alert.alert('Étape 2', `Commande créée: ${newOrderId}`);
        break;
      case 3:
        // Étape 3: Paiement
        Alert.alert('Étape 3', 'Paiement effectué');
        break;
      case 4:
        // Étape 4: Démarrer la simulation de livraison
        setDeliveryStatus('en_cours');
        Alert.alert('Étape 4', 'Simulation de livraison en cours...');
        
        // Démarrer la simulation de mouvement
        simulateDriverMovement();
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
            setIsSimulating(false);
            setSimulationProgress(0);
            if (simulationInterval.current) {
              clearInterval(simulationInterval.current);
            }
          }
        },
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // Nettoyer l'intervalle au démontage
  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

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
              La commande a été créée avec succès
            </Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="receipt" size={20} color="#FF9800" />
                <Text style={styles.infoText}>ID Commande: {orderId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={20} color="#FF9800" />
                <Text style={styles.infoText}>Livreur: {selectedLivreur?.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={20} color="#FF9800" />
                <Text style={styles.infoText}>Statut: En attente de paiement</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => simulateStep(3)}
            >
              <Text style={styles.nextButtonText}>Continuer vers le paiement</Text>
            </TouchableOpacity>
          </Animatable.View>
        );

      case 3:
        return (
          <Animatable.View animation="fadeInUp" style={styles.stepContent}>
            <Text style={styles.stepTitle}>Étape 3: Paiement</Text>
            <Text style={styles.stepDescription}>
              Le paiement a été effectué avec succès
            </Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>Paiement confirmé</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="card" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>Méthode: Carte bancaire</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="cash" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>Montant: 15 000 FCFA</Text>
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
              Simulation de la livraison en temps réel
            </Text>
            
            <View style={styles.deliveryCard}>
              <Ionicons name="bicycle" size={60} color="#FF9800" />
              <Text style={styles.deliveryText}>Livraison en cours...</Text>
              <Text style={styles.deliveryTime}>
                {isSimulating ? 'Simulation en cours...' : 'Simulation terminée'}
              </Text>
              
              {/* Barre de progression */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${simulationProgress}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{Math.round(simulationProgress)}%</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleStartTracking}
              disabled={isSimulating}
            >
              <Text style={styles.nextButtonText}>
                {isSimulating ? 'Simulation en cours...' : 'Voir le tracking'}
              </Text>
            </TouchableOpacity>
          </Animatable.View>
        );

      case 5:
        return (
          <Animatable.View animation="fadeInUp" style={styles.stepContent}>
            <Text style={styles.stepTitle}>Étape 5: Livraison terminée</Text>
            <Text style={styles.stepDescription}>
              La livraison a été effectuée avec succès
            </Text>
            
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              <Text style={styles.successText}>Livraison terminée !</Text>
              <Text style={styles.successSubtext}>
                Votre commande a été livrée avec succès
              </Text>
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => simulateStep(6)}
            >
              <Text style={styles.nextButtonText}>Noter la livraison</Text>
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
  progressContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 4,
  },
  progressText: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 8,
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
  successSubtext: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 4,
    textAlign: 'center',
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
