import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import { useFavorites } from '../context/FavoritesContext';
import { useRatings } from '../context/RatingsContext';
import * as Location from 'expo-location';
import restaurantStatusService from '../services/restaurantStatusService';
import InteractiveRating from '../components/InteractiveRating';
import StatusBadge from '../components/StatusBadge';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const AllRestaurants = ({ route, navigation }) => {
  const cityId = route?.params?.city;
  const cityName = route?.params?.cityName;
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const { toggleRestaurantFavorite, isRestaurantFavorite } = useFavorites();
  const { getBatchRatings } = useRatings();

  useEffect(() => {
    // Désactiver le header pour cet écran
    navigation.setOptions({
      headerShown: false
    });
    
    // Obtenir la localisation de l'utilisateur
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(null);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    })();
    
    fetchRestaurants();
  }, []);
  
  // Recharger les restaurants quand la localisation change
  useEffect(() => {
    if (userLocation) {
      fetchRestaurants();
    }
  }, [userLocation]);

  // Calcul de la distance (Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  // Calcul de la durée de livraison basée sur la distance
  const calculateDeliveryTime = (distance) => {
    if (!distance) return "20-30";
    const baseTime = 15;
    const timePerKm = 2;
    const totalTime = Math.round(baseTime + (distance * timePerKm));
    return `${totalTime}-${totalTime + 10}`;
  };

  const fetchRestaurants = async () => {
    try {
      const endpoint = cityId 
        ? `${API_BASE_URL}/resto-by-id-ville?id_ville=${cityId}`
        : `${API_BASE_URL}/resto`;
        
      const response = await fetch(endpoint);
      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        // Filtrer les restaurants actifs et uniquement Brazzaville et Pointe-Noire
        const activeRestaurants = data.filter(restaurant => {
          const isActive = restaurant.statut === "actif";
          const cityName = restaurant.ville?.libelle || restaurant.ville?.name || "";
          const isAllowedCity = cityName.toLowerCase().includes("brazzaville") || 
                               cityName.toLowerCase().includes("pointe-noire") ||
                               cityName.toLowerCase().includes("pointe noire");
          return isActive && isAllowedCity;
        });

        const mappedRestaurants = activeRestaurants.map(restaurant => {
          let distance = null;
          let deliveryTime = "20-30";
          
          // Calculer la distance si on a la localisation de l'utilisateur
          if (userLocation && restaurant.altitude && restaurant.longitude) {
            distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              parseFloat(restaurant.altitude),
              parseFloat(restaurant.longitude)
            );
            deliveryTime = calculateDeliveryTime(parseFloat(distance));
          }
          
          return {
            id: restaurant.id,
            name: restaurant.libelle || restaurant.name,
            address: restaurant.adresse || "Adresse non disponible",
            image: restaurant.cover && typeof restaurant.cover === 'string'
              ? { uri: `https://www.mayombe-app.com/uploads_admin/${restaurant.cover}` }
              : require("../../assets/images/2.jpg"),
            cuisine: restaurant.cuisine || "Cuisine africaine",
            deliveryTime: deliveryTime,
            distance: distance,
            minOrder: "5000",
            isOpen: true,
          };
        });

        // Récupérer les ratings et statuts depuis Firebase
        const restaurantIds = mappedRestaurants.map(r => r.id.toString());
        let ratingsMap = {};
        let statusesMap = {};
        
        try {
          if (getBatchRatings && typeof getBatchRatings === 'function') {
            ratingsMap = await getBatchRatings(restaurantIds, 'restaurant');
          }
          statusesMap = await restaurantStatusService.getBatchRestaurantStatuses(restaurantIds);
        } catch (error) {
          console.error('❌ Erreur lors de la récupération des ratings ou statuts:', error);
        }

        // Enrichir les restaurants avec ratings et statuts
        const enrichedRestaurants = mappedRestaurants.map(restaurant => {
          const restaurantIdStr = restaurant.id.toString();
          const rating = ratingsMap[restaurantIdStr] || { averageRating: 0, totalRatings: 0 };
          const status = statusesMap[restaurantIdStr] || { isOpen: true };
          
          return {
            ...restaurant,
            averageRating: rating.averageRating,
            totalRatings: rating.totalRatings,
            isOpen: status.isOpen,
          };
        });

        // Trier par note moyenne décroissante
        const sortedRestaurants = enrichedRestaurants.sort((a, b) => {
          if (b.averageRating !== a.averageRating) {
            return b.averageRating - a.averageRating;
          }
          return b.totalRatings - a.totalRatings;
        });
        setRestaurants(sortedRestaurants);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (error) {
      setError('Impossible de charger les restaurants');
    } finally {
      setLoading(false);
    }
  };

  const renderRestaurantItem = ({ item }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurant: item })}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.restaurantImage} />
        <View style={styles.overlay} />
        
        {/* Bouton favoris en haut à gauche */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleRestaurantFavorite(item)}
        >
          <Ionicons
            name={isRestaurantFavorite(item.id) ? "heart" : "heart-outline"}
            size={20}
            color={isRestaurantFavorite(item.id) ? "#4CAF50" : "#FFF"}
          />
        </TouchableOpacity>
        
        <View style={styles.badgeContainer}>
          <StatusBadge isOpen={item.isOpen} size="small" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.ratingContainer}>
          <InteractiveRating 
            itemId={item.id}
            type="restaurant"
            rating={item.averageRating || 0} 
            totalRatings={item.totalRatings || 0}
            size={12}
            onRatingSubmitted={fetchRestaurants}
          />
        </View>
        <Text style={styles.cuisineType} numberOfLines={1}>{item.cuisine}</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.deliveryContainer}>
            <Ionicons name="time-outline" size={scaleFont(12)} color="#FF9800" />
            <Text style={styles.deliveryTime}>{item.deliveryTime} min</Text>
          </View>
        </View>
        
        {/* Distance réelle */}
        {item.distance && (
          <View style={styles.distanceContainer}>
            <Ionicons name="location-outline" size={scaleFont(12)} color="#4CAF50" />
            <Text style={styles.distanceText}>{item.distance} km</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRestaurants}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {cityName ? `Restaurants à ${cityName}` : 'Tous les restaurants'}
        </Text>
      </View>

      <FlatList
        data={restaurants}
        renderItem={renderRestaurantItem}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FF9800',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
  listContainer: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  restaurantCard: {
    width: (width - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
  },
  open: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  closed: {
    backgroundColor: '#FF6B6B',
    color: '#fff',
  },
  cardContent: {
    padding: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold',
  },
  ratingContainer: {
    marginVertical: 4,
  },
  cuisineType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryTime: {
    marginLeft: 4,
    fontSize: 12,
    color: '#FF9800',
    fontFamily: 'Montserrat',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#4CAF50',
    fontFamily: 'Montserrat',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  retryButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
});

export default AllRestaurants;