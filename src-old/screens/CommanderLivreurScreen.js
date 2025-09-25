import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground, 
  Dimensions, 
  Alert, 
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../components/common/CustomHeader';
import { getDistanceToRestaurant, formatDistance } from '../services/LocationService';

const { width, height } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const CommanderLivreurScreen = () => {
  const navigation = useNavigation();
  const [deliveryDistance, setDeliveryDistance] = useState(5); // Distance par défaut en km
  const [deliveryFee, setDeliveryFee] = useState(1000); // Prix initial
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculer les frais de livraison selon la distance
  const calculateDeliveryFee = (distance) => {
    if (distance <= 3) {
      return 1000; // Prix de base
    } else if (distance <= 7) {
      return 1500; // Prix intermédiaire
    } else {
      return 2000; // Prix élevé
    }
  };

  // Obtenir la description des frais
  const getDeliveryFeeDescription = (distance) => {
    if (distance <= 3) {
      return '📍 Livraison proche';
    } else if (distance <= 7) {
      return '📍 Livraison moyenne';
    } else {
      return '📍 Livraison éloignée';
    }
  };

  // Obtenir la géolocalisation au chargement
  useEffect(() => {
    const getLocationAndCalculateFee = async () => {
      setIsLoadingLocation(true);
      try {
        const distance = await getDistanceToRestaurant();
        setDeliveryDistance(distance);
        console.log('📍 Distance obtenue:', distance, 'km');
      } catch (error) {
        console.log('⚠️ Erreur géolocalisation:', error.message);
        Alert.alert(
          'Localisation non disponible',
          'Impossible d\'obtenir votre position. Les frais de livraison seront calculés avec une distance par défaut.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoadingLocation(false);
      }
    };

    getLocationAndCalculateFee();
  }, []);

  // Calculer les frais quand la distance change
  useEffect(() => {
    const calculatedFee = calculateDeliveryFee(deliveryDistance);
    setDeliveryFee(calculatedFee);
  }, [deliveryDistance]);

  const handleCommanderLivreur = async () => {
    setIsSubmitting(true);
    
    try {
      // Ici on peut ajouter la logique pour réserver un livreur
      console.log('Réservation livreur:', {
        distance: deliveryDistance,
        fee: deliveryFee,
        total: deliveryFee
      });

      // Simuler une réservation réussie
      setTimeout(() => {
        setIsSubmitting(false);
        // Naviguer vers la page de paiement
        navigation.navigate('PaymentScreen', {
          orderType: 'livreur',
          amount: deliveryFee,
          distance: deliveryDistance,
          description: 'Réservation livreur'
        });
      }, 1000);

    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Erreur', 'Impossible de réserver le livreur. Veuillez réessayer.');
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Commander un livreur"
        backgroundColor="#FF9800"
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Section principale */}
        <View style={styles.mainSection}>
          <ImageBackground
            source={require('../../assets/images/m-3.jpg')}
            style={styles.banner}
            resizeMode="cover"
            imageStyle={styles.bannerImage}
          >
            <View style={styles.overlay} />
            
            <View style={styles.bannerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="bicycle" size={scaleFont(32)} color="#FF9800" />
              </View>
              <Text style={styles.bannerTitle}>Livraison Express</Text>
              <Text style={styles.bannerSubtitle}>Commandez et faites-vous livrer en 30 minutes</Text>
            </View>
          </ImageBackground>
        </View>

        {/* Section des fonctionnalités */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <Ionicons name="time-outline" size={scaleFont(24)} color="#FF9800" />
            <Text style={styles.featureTitle}>30 min</Text>
            <Text style={styles.featureDesc}>Livraison rapide</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="location-outline" size={scaleFont(24)} color="#FF9800" />
            <Text style={styles.featureTitle}>Partout</Text>
            <Text style={styles.featureDesc}>Zone de livraison</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark-outline" size={scaleFont(24)} color="#FF9800" />
            <Text style={styles.featureTitle}>Sécurisé</Text>
            <Text style={styles.featureDesc}>Livraison sécurisée</Text>
          </View>
        </View>

        {/* Section des prix */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Tarifs de livraison</Text>
          
          <View style={styles.pricingCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Distance</Text>
              <Text style={styles.priceValue}>
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#FF9800" />
                ) : (
                  formatDistance(deliveryDistance)
                )}
              </Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {isLoadingLocation 
                  ? '📍 Calcul de la distance...'
                  : getDeliveryFeeDescription(deliveryDistance)
                }
              </Text>
              <Text style={styles.priceValue}>
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#FF9800" />
                ) : (
                  `${deliveryFee} FCFA`
                )}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{deliveryFee} FCFA</Text>
            </View>
          </View>
        </View>

        {/* Section des informations */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informations importantes</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <View style={styles.iconContainer}>
                <Ionicons name="time-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.infoText}>Le livreur sera disponible dans les 30 minutes</Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.iconContainer}>
                <Ionicons name="card-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.infoText}>Paiement sécurisé à la livraison</Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.iconContainer}>
                <Ionicons name="location-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.infoText}>Suivi en temps réel de votre livreur</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bouton de commande */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.commandButton, isSubmitting && styles.disabledButton]}
          onPress={handleCommanderLivreur}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={scaleFont(20)} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.commandButtonText}>Réserver ce livreur</Text>
              <Ionicons name="arrow-forward" size={scaleFont(18)} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  mainSection: {
    marginBottom: 20,
  },
  banner: {
    height: scaleFont(200),
    marginHorizontal: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerSubtitle: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  featureTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginTop: 8,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: scaleFont(12),
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 4,
    textAlign: 'center',
  },
  pricingSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 15,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  priceValue: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
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
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 4,
  },
  infoText: {
    fontSize: scaleFont(14),
    color: '#666',
    fontFamily: 'Montserrat',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  commandButton: {
    backgroundColor: '#FF9800',
    borderRadius: 25,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  commandButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default CommanderLivreurScreen;
