import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFavorites } from '../context/FavoritesContext';
import { useRatings } from '../context/RatingsContext';
import restaurantStatusService from '../services/restaurantStatusService';
import InteractiveRating from '../components/InteractiveRating';
import StatusBadge from '../components/StatusBadge';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const RestaurantListScreen = ({ route, navigation }) => {
  const { city, cityName } = route.params || {};
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const { toggleRestaurantFavorite, isRestaurantFavorite } = useFavorites();
  const { getBatchRatings } = useRatings();

  useEffect(() => {
    // Récupérer la localisation de l'utilisateur
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission de localisation refusée');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    })();
    
    fetchRestaurants();
  }, [city]);

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
    
    const distanceNum = parseFloat(distance);
    
    // Temps de base : 15 minutes
    const baseTime = 15;
    
    // Temps supplémentaire par km : 2 minutes
    const timePerKm = 2;
    
    // Calcul du temps total
    const totalTime = Math.round(baseTime + (distanceNum * timePerKm));
    
    // Retourner une fourchette de temps
    const minTime = Math.max(15, totalTime - 5);
    const maxTime = totalTime + 5;
    
    return `${minTime}-${maxTime}`;
  };

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = city 
        ? `${API_BASE_URL}/resto-by-id-ville?id_ville=${city}`
        : `${API_BASE_URL}/resto`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        // Filtrer uniquement Brazzaville et Pointe-Noire
        const filteredData = data.filter(restaurant => {
          const cityName = restaurant.ville?.libelle || restaurant.ville?.name || "";
          return cityName.toLowerCase().includes("brazzaville") || 
                 cityName.toLowerCase().includes("pointe-noire") ||
                 cityName.toLowerCase().includes("pointe noire");
        });

        const mappedRestaurants = filteredData.map(restaurant => {
          // Calcul distance si possible
          let distance = null;
          
          if (
            userLocation &&
            restaurant.altitude &&
            restaurant.longitude &&
            !isNaN(parseFloat(restaurant.altitude)) &&
            !isNaN(parseFloat(restaurant.longitude))
          ) {
            const lat = parseFloat(restaurant.altitude);
            const lon = parseFloat(restaurant.longitude);
            
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
              distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                lat,
                lon
              );
            }
          }
          
          const deliveryTime = calculateDeliveryTime(distance);
          
          return {
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.adresse,
            ville_id: restaurant.ville_id,
            ville: restaurant.ville?.libelle || "Ville inconnue",
            image: restaurant.cover && typeof restaurant.cover === 'string'
              ? { uri: `https://www.mayombe-app.com/uploads_admin/${restaurant.cover}` }
              : require("../../assets/images/2.jpg"),
            cuisine: "Cuisine africaine",
            deliveryTime: deliveryTime,
            distance: distance,
            minOrder: "5000",
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
      }
    } catch (error) {
      setError('Impossible de charger les restaurants');
    } finally {
      setLoading(false);
    }
  };

  const renderRestaurantCard = ({ item: restaurant }) => {
    const handleRestaurantPress = async () => {
      try {
        // 1. Récupérer les sous-menus
        const subMenuResponse = await fetch(`${API_BASE_URL}/submenu-list`);
        const subMenus = await subMenuResponse.json();
        console.log('Sous-menus reçus:', subMenus);

        // 2. Récupérer les menus du restaurant pour le premier sous-menu
        if (Array.isArray(subMenus) && subMenus.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const url = `${API_BASE_URL}/get-menu-by-resto?jour=${today}&sub_menu_id=${subMenus[0].id}&resto_id=${restaurant.id}`;
          
          const menuResponse = await fetch(url);
          const menus = await menuResponse.json();
          console.log('Menus reçus:', menus);

          // 3. Naviguer avec les données
          navigation.navigate('RestaurantDetails', {
            restaurant: {
              ...restaurant,
              subMenus: subMenus,
              menus: menus
            }
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des menus:', error);
        navigation.navigate('RestaurantDetails', { restaurant });
      }
    };

    return (
      <TouchableOpacity
        style={styles.restaurantCard}
        onPress={handleRestaurantPress}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Image source={restaurant.image} style={styles.restaurantImage} />
          
          {/* Bouton favoris en haut à gauche */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleRestaurantFavorite(restaurant)}
          >
            <Ionicons
              name={isRestaurantFavorite(restaurant.id) ? "heart" : "heart-outline"}
              size={20}
              color={isRestaurantFavorite(restaurant.id) ? "#4CAF50" : "#FFF"}
            />
          </TouchableOpacity>
          
          <View style={styles.deliveryBadge}>
            {restaurant.distance && (
              <>
                <Ionicons name="walk-outline" size={12} color="#FFF" />
                <Text style={styles.deliveryTime}>
                  {restaurant.distance} km
                </Text>
              </>
            )}
            <Ionicons name="time-outline" size={14} color="#FFF" />
            <Text style={styles.deliveryTime}>
              {restaurant.deliveryTime} min
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <View style={styles.ratingContainer}>
              <InteractiveRating 
                itemId={restaurant.id}
                type="restaurant"
                rating={restaurant.averageRating || 0} 
                totalRatings={restaurant.totalRatings || 0}
                size={12}
                onRatingSubmitted={fetchRestaurants}
              />
            </View>
          </View>

          <View style={styles.statusContainer}>
            <StatusBadge isOpen={restaurant.isOpen} size="small" />
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.cuisineType}>{restaurant.cuisine}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.minOrderContainer}>
              <Ionicons name="cart-outline" size={14} color="#666" />
              <Text style={styles.minOrder}>Min. {restaurant.minOrder} FCFA</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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

      <View style={styles.mainContainer}>
        <FlatList
          data={restaurants}
          renderItem={renderRestaurantCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          numColumns={2}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginLeft: 16,
    color: '#333',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  restaurantCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    maxWidth: '47%',
  },
  imageContainer: {
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  deliveryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
    borderRadius: 4,
  },
  deliveryTime: {
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    color: '#FFF',
  },
  cardContent: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    marginVertical: 4,
  },
  statusContainer: {
    marginVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  cuisineType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Montserrat',
  },
  reviews: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Montserrat',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minOrderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minOrder: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  status: {
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
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
    marginBottom: 16,
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

export default RestaurantListScreen; 