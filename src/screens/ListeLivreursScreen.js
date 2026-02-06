import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastImage from 'react-native-fast-image';
import CustomHeader from '../components/common/CustomHeader';
import { getCurrentLocation, formatDistance } from '../services/LocationService';

const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const ListeLivreursScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [reservingLivreur, setReservingLivreur] = useState(null);
  const [imageLoadingMap, setImageLoadingMap] = useState({});
  const [deliveryDistance, setDeliveryDistance] = useState(5); // Distance par défaut en km
  const [deliveryFee, setDeliveryFee] = useState(1000); // Prix initial
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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
        console.log('📍 Tentative de récupération position utilisateur...');
        const location = await getCurrentLocation();
        
        // Pour la liste des livreurs, on utilise une distance par défaut 
        // ou on pourrait la calculer par rapport à un point central si nécessaire
        // Ici on garde 5km comme base de référence si on n'a pas d'adresse cible
        setDeliveryDistance(5); 
        console.log('📍 Position obtenue, distance de référence fixée à 5km');
      } catch (error) {
        console.log('⚠️ Erreur géolocalisation dans la récupération côté livreur:', error.message);
        setDeliveryDistance(5); // Fallback distance
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

  useEffect(() => {
    fetchLivreurs();
  }, []);

  const fetchLivreurs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Récupération des livreurs disponibles...');
      
      let response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/get-livreurs-dispo', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Fallback to demo data
          setLivreurs([
            { id: 1, name: 'Jean Livreur', vehicle: 'Moto', distance: '2.3 km', rating: 4.8, status: 'Disponible', specialite: 'Tous types' },
            { id: 2, name: 'Marie Express', vehicle: 'Moto', distance: '1.8 km', rating: 4.9, status: 'Disponible', specialite: 'Express' },
          ]);
          return;
        }
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setLivreurs(data.map((l, i) => ({
          id: l.id || i + 1,
          name: l.name || `Livreur ${i + 1}`,
          phone: l.phone || '+242000000000',
          avatar: l.avatar ? `https://www.mayombe-app.com/uploads_admin/${l.avatar}` : null,
          status: l.status || 'Disponible',
          rating: l.rating || 4.5,
          vehicle: l.vehicle || 'Moto',
          distance: l.distance || `${(Math.random() * 3 + 1).toFixed(1)} km`,
          specialite: l.specialite || 'Tous types'
        })));
      }
    } catch (e) {
      setError('Erreur lors du chargement des livreurs');
    } finally {
      setLoading(false);
    }
  };

  const handleReserveLivreur = (livreur) => {
    navigation.navigate('CommanderLivreur', {
      livreur: livreur,
      distance: deliveryDistance,
      fee: deliveryFee
    });
  };

  const handleImageError = (livreurId) => {
    setImageErrors(prev => ({
      ...prev,
      [livreurId]: true
    }));
  };

  const handleImageLoading = (livreurId, loading) => {
    setImageLoadingMap(prev => ({ ...prev, [livreurId]: loading }));
  };

  const renderLivreur = ({ item, index }) => {
    const hasImageError = imageErrors[item.id];
    const isReserving = reservingLivreur === item.id;
    const imageLoading = imageLoadingMap[item.id] !== false;

    return (
      <Animatable.View 
        animation="zoomIn" 
        delay={index * 150}
        duration={800}
        style={styles.wowLivreurCard}
      >
        {/* Carte avec dégradé et effet glassmorphism */}
        <View style={styles.wowCardContainer}>
          {/* Avatar avec effet glow */}
          <View style={styles.wowAvatarSection}>
            {item.avatar && !hasImageError ? (
              <>
                <View style={styles.wowAvatarGlow}>
                  <FastImage
                    style={styles.wowAvatar}
                    source={{ uri: item.avatar, priority: FastImage.priority.normal }}
                    resizeMode={FastImage.resizeMode.cover}
                    onError={() => handleImageError(item.id)}
                    onLoadStart={() => handleImageLoading(item.id, true)}
                    onLoadEnd={() => handleImageLoading(item.id, false)}
                  />
                </View>
                {imageLoading && (
                  <View style={styles.wowAvatarLoaderOverlay}>
                    <ActivityIndicator size="small" color="#FF9800" />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.wowAvatarPlaceholder}>
                <Ionicons name="person" size={24} color="#FF9800" />
              </View>
            )}
            
            {/* Badge de statut animé */}
            <Animatable.View 
              animation="pulse" 
              iterationCount="infinite" 
              duration={2000}
              style={styles.wowStatusBadge}
            >
              <View style={[styles.wowStatusDot, { backgroundColor: item.status === "Disponible" ? "#4CAF50" : "#FF6B6B" }]} />
            </Animatable.View>
          </View>

          {/* Informations avec style moderne */}
          <View style={styles.wowInfoSection}>
            <Text style={styles.wowLivreurName} numberOfLines={1}>{item.name}</Text>
            
            {/* Rating avec étoiles animées */}
            <View style={styles.wowRatingSection}>
              <View style={styles.wowStarsContainer}>
                {[1, 2, 3, 4, 5].map((star, starIndex) => (
                  <Animatable.View 
                    key={star}
                    animation="bounceIn" 
                    delay={starIndex * 100}
                    duration={600}
                  >
                    <Ionicons 
                      name={star <= Math.floor(parseFloat(item.rating)) ? "star" : "star-outline"} 
                      size={12} 
                      color="#FFD700" 
                    />
                  </Animatable.View>
                ))}
              </View>
              <Text style={styles.wowRatingText}>{item.rating}</Text>
            </View>

            {/* Détails avec icônes modernes */}
            <View style={styles.wowDetailsRow}>
              <View style={styles.wowDetailItem}>
                <View style={styles.wowDetailIcon}>
                  <Ionicons name="bicycle" size={12} color="#FF9800" />
                </View>
                <Text style={styles.wowDetailText}>{item.vehicle}</Text>
              </View>
              <View style={styles.wowDetailItem}>
                <View style={styles.wowDetailIcon}>
                  <Ionicons name="location" size={12} color="#FF9800" />
                </View>
                <Text style={styles.wowDetailText}>{item.distance}</Text>
              </View>
            </View>

            {/* Spécialité avec badge moderne */}
            <View style={styles.wowSpecialiteSection}>
              <Ionicons name="flash" size={12} color="#FF9800" />
              <Text style={styles.wowSpecialiteText} numberOfLines={1}>{item.specialite}</Text>
            </View>
          </View>

          {/* Bouton de réservation avec effet hover */}
          <TouchableOpacity
            style={[styles.wowReserveButton, isReserving && styles.wowReserveButtonDisabled]}
            onPress={() => handleReserveLivreur(item)}
            disabled={isReserving}
            activeOpacity={0.9}
          >
            {isReserving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Animatable.View animation="pulse" iterationCount="infinite" duration={1500}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                </Animatable.View>
                <Text style={styles.wowReserveButtonText}>Réserver</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animatable.View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Livreurs disponibles"
        backgroundColor="#FF9800"
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>Recherche de livreurs...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Oups ! Une erreur s'est produite</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLivreurs}>
            <Ionicons name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Header avec nouvelle disposition */}
          <Animatable.View animation="fadeInDown" delay={200} style={styles.newHeader}>
            <View style={styles.newHeaderContent}>
              {/* Section titre principale */}
              <View style={styles.newTitleSection}>
                <View style={styles.newTitleRow}>
                  <Ionicons name="bicycle" size={28} color="#fff" />
                  <Text style={styles.newMainTitle}>
                    {livreurs.length} Livreurs Express
                  </Text>
                </View>
                <Text style={styles.newSubtitle}>
                  {isLoadingLocation 
                    ? 'Calcul de votre position...'
                    : `${formatDistance(deliveryDistance)} • Livraison rapide`
                  }
                </Text>
              </View>
              
              {/* Section prix centrée */}
              <View style={styles.newPriceSection}>
                <Text style={styles.newPriceLabel}>Prix de livraison</Text>
                <Text style={styles.newPriceValue}>
                  {isLoadingLocation ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    `${deliveryFee} FCFA`
                  )}
                </Text>
              </View>
              
              {/* Section stats en ligne */}
              <View style={styles.newStatsSection}>
                <View style={styles.newStatItem}>
                  <Ionicons name="time" size={16} color="#FFD700" />
                  <Text style={styles.newStatText}>30 min</Text>
                </View>
                <View style={styles.newStatDivider} />
                <View style={styles.newStatItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
                  <Text style={styles.newStatText}>Sécurisé</Text>
                </View>
                <View style={styles.newStatDivider} />
                <View style={styles.newStatItem}>
                  <Ionicons name="location" size={16} color="#FFD700" />
                  <Text style={styles.newStatText}>Partout</Text>
                </View>
              </View>
            </View>
          </Animatable.View>

          {/* Liste compacte des livreurs */}
          <FlatList
            data={livreurs}
            renderItem={renderLivreur}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            numColumns={2}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 20,
  },
  livreurCard: {
    backgroundColor: 'white',
    borderRadius: 0,
    marginBottom: 16,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 0,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoSection: {
    flex: 1,
  },
  livreurName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#FFA000',
    fontFamily: 'Montserrat-Bold',
  },
  zoneText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  cardBody: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 4,
  },
  statValue: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginTop: 2,
  },
  specialiteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  specialiteText: {
    fontSize: 12,
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 6,
  },
  cardFooter: {
    padding: 16,
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reserveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  reserveButtonText: {
    fontSize: 15,
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  reserveButtonPrice: {
    fontSize: 12,
    color: '#FFF',
    fontFamily: 'Montserrat',
    marginLeft: 8,
    opacity: 0.9,
  },
  cardFooterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryInfoText: {
    fontSize: scaleFont(12),
    color: '#666',
    fontFamily: 'Montserrat',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    padding: 14,
    borderRadius: 25,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  avatarLoaderOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 25,
  },
  deliveryFeeSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  deliveryFeeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deliveryFeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveryFeeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deliveryFeeHeaderText: {
    flex: 1,
  },
  deliveryFeeTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 2,
  },
  deliveryFeeSubtitle: {
    fontSize: scaleFont(12),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  deliveryFeeBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deliveryFeeBadgeText: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
  },
  deliveryFeeProgress: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: scaleFont(10),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  // Nouveau design compact
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactHeaderLeft: {
    flex: 1,
  },
  compactHeaderTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  compactHeaderSubtitle: {
    fontSize: scaleFont(12),
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  compactHeaderRight: {
    marginLeft: 12,
  },
  livreurCardCompact: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 6,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: (width - 32) / 2,
    minHeight: 140,
  },
  compactAvatarSection: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  compactAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactStatusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  compactStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  compactInfoSection: {
    flex: 1,
  },
  compactLivreurName: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  compactRatingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  compactStarsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  compactRatingText: {
    fontSize: scaleFont(10),
    color: '#FFA000',
    fontFamily: 'Montserrat-Bold',
  },
  compactDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compactDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactDetailText: {
    fontSize: scaleFont(10),
    color: '#666',
    fontFamily: 'Montserrat',
    marginLeft: 2,
  },
  compactSpecialiteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'center',
  },
  compactSpecialiteText: {
    fontSize: scaleFont(9),
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  compactReserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  compactReserveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  compactReserveButtonText: {
    fontSize: scaleFont(12),
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  compactAvatarLoaderOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  // Styles WOW avec effets modernes
  wowHeader: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  wowHeaderGradient: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  wowHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  wowHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wowHeaderIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  wowHeaderText: {
    flex: 1,
  },
  wowHeaderTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  wowHeaderSubtitle: {
    fontSize: scaleFont(12),
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Montserrat',
  },
  wowHeaderRight: {
    marginLeft: 12,
  },
  wowPriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  wowPriceBadgeText: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
  },
  wowLivreurCard: {
    margin: 8,
    width: (width - 32) / 2,
  },
  wowCardContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.1)',
    minHeight: 160,
  },
  wowAvatarSection: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  wowAvatarGlow: {
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
  wowAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  wowAvatarPlaceholder: {
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
  wowStatusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  wowStatusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  wowInfoSection: {
    flex: 1,
  },
  wowLivreurName: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  wowRatingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  wowStarsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  wowRatingText: {
    fontSize: scaleFont(12),
    color: '#FFA000',
    fontFamily: 'Montserrat-Bold',
  },
  wowDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  wowDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wowDetailIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  wowDetailText: {
    fontSize: scaleFont(10),
    color: '#666',
    fontFamily: 'Montserrat',
  },
  wowSpecialiteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 12,
  },
  wowSpecialiteText: {
    fontSize: scaleFont(10),
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  wowReserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    elevation: 4,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  wowReserveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  wowReserveButtonText: {
    fontSize: scaleFont(12),
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 6,
  },
  wowAvatarLoaderOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 30,
  },
  
  // Nouvelle disposition simplifiée
  newHeader: {
    marginHorizontal: 0,
    marginBottom: 20,
    backgroundColor: '#FF9800',
    elevation: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  newHeaderContent: {
    padding: 24,
    paddingBottom: 20,
  },
  newTitleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  newTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  newMainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 12,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  newSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  newPriceSection: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  newPriceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  newPriceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
  },
  newStatsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  newStatText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 6,
  },
  newStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 8,
  },
});

export default ListeLivreursScreen; 