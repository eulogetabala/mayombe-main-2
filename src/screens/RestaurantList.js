import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { useRatings } from '../context/RatingsContext';
import restaurantStatusService from '../services/restaurantStatusService';
import InteractiveRating from '../components/InteractiveRating';
import StatusBadge from '../components/StatusBadge';
import { resolveImageUrl } from '../Utils/imageUtils';
import ConnectionError from '../components/ConnectionError';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const RestaurantList = ({ route, navigation }) => {
  const city = route?.params?.city || "Toutes les villes"; // Valeur par défaut
  const { width, height } = useWindowDimensions(); // Pour le responsive
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const { getBatchRatings } = useRatings();

  // Image statique pour les restaurants
  const staticImage = require("../../assets/images/mayombe_1.jpg");

  // Configuration du header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: route?.params?.city ? `Restaurants à ${city}` : "Restaurants",
      headerTitleStyle: {
        fontFamily: 'Montserrat-Bold',
        fontSize: 18,
      },
      headerTintColor: '#333',
      headerStyle: {
        backgroundColor: '#fff',
        elevation: 2,
      },
    });
  }, [navigation, city]);

  useEffect(() => {
    // Récupérer la localisation de l'utilisateur
    // Récupérer la localisation de l'utilisateur
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          const permission = await Location.requestForegroundPermissionsAsync();
          status = permission.status;
        }

        if (status !== 'granted') {
          console.log('Permission localisation refusée - RestaurantList - Utilisation défaut');
          setUserLocation({ latitude: -4.2634, longitude: 15.2429 });
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(err => {
          console.warn("Impossible d'obtenir la position précise:", err);
          return null;
        });

        if (location) {
          setUserLocation(location.coords);
        } else {
          console.log('Position technique impossible - RestaurantList - Utilisation défaut');
          setUserLocation({ latitude: -4.2634, longitude: 15.2429 });
        }
      } catch (error) {
        console.error('Erreur localisation RestaurantList:', error);
        setUserLocation({ latitude: -4.2634, longitude: 15.2429 });
      }
    })();
  }, [city]);
    
  // Recharger les restaurants quand la localisation change OU le filtre de ville
  useEffect(() => {
    fetchRestaurants();
  }, [city, userLocation]);

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
      const url = route?.params?.city 
        ? `${API_BASE_URL}/resto?ville=${city}`
        : `${API_BASE_URL}/resto`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Restaurants reçus:', data);

      if (response.ok && Array.isArray(data)) {
        // Si un city est fourni, on fait confiance à l'API et on ne filtre pas par nom de ville
        // Sinon, on filtre par nom de ville (Brazzaville ou Pointe-Noire)
        const filteredData = route?.params?.city 
          ? data // Si city est fourni, on prend tous les restaurants retournés par l'API
          : data.filter(resto => {
              const cityName = resto.ville?.libelle || resto.ville?.name || "";
              return cityName.toLowerCase().includes("brazzaville") || 
                     cityName.toLowerCase().includes("pointe-noire") ||
                     cityName.toLowerCase().includes("pointe noire");
            });

        const mappedRestaurants = filteredData.map(resto => {
          // Calcul distance si possible
          let distance = null;
          
          if (
            userLocation &&
            resto.altitude &&
            resto.longitude &&
            !isNaN(parseFloat(resto.altitude)) &&
            !isNaN(parseFloat(resto.longitude))
          ) {
            const lat = parseFloat(resto.altitude);
            const lon = parseFloat(resto.longitude);
            
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
            id: resto.id,
            name: resto.name || "Nom non disponible",
            address: resto.adresse || "Adresse non disponible",
            phone: resto.phone || "Téléphone non disponible",
            website: resto.website,
            cover: resto.cover, // Garder le chemin original pour fallback
            logo: resto.logo, // Garder le chemin original pour fallback
            distance: distance,
            deliveryTime: deliveryTime,
          };
        });

        // Récupérer les ratings, statuts et images depuis Firebase
        const restaurantIds = mappedRestaurants.map(r => r.id.toString());
        let ratingsMap = {};
        let statusesMap = {};
        let imagesMap = {};
        
        try {
          if (getBatchRatings && typeof getBatchRatings === 'function') {
            ratingsMap = await getBatchRatings(restaurantIds, 'restaurant');
          }
          statusesMap = await restaurantStatusService.getBatchRestaurantStatuses(restaurantIds);
          imagesMap = await restaurantStatusService.getBatchRestaurantImages(restaurantIds);
        } catch (error) {
          console.error('❌ Erreur lors de la récupération des ratings, statuts ou images:', error);
        }

        // Enrichir les restaurants avec ratings, statuts et images
        const enrichedRestaurants = mappedRestaurants.map(restaurant => {
          const restaurantIdStr = restaurant.id.toString();
          const rating = ratingsMap[restaurantIdStr] || { averageRating: 0, totalRatings: 0 };
          const status = statusesMap[restaurantIdStr] || { isOpen: true };
          const images = imagesMap[restaurantIdStr] || { cover: null, logo: null };
          
          // Résoudre les URLs d'images avec priorité Firebase > API > défaut
          const coverImage = resolveImageUrl(
            images.cover,
            restaurant.cover,
            staticImage
          );
          
          const logoImage = images.logo 
            ? resolveImageUrl(images.logo, null, null)
            : (restaurant.logo ? resolveImageUrl(null, restaurant.logo, null) : null);
          
          return {
            ...restaurant,
            image: coverImage,
            logo: logoImage,
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
        throw new Error('Erreur lors du chargement des restaurants');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Impossible de charger les restaurants');
    } finally {
      setLoading(false);
    }
  };

  // 📡 Écouter les changements de statut Firebase en temps réel pour tous les restaurants
  useEffect(() => {
    const unsubscribe = restaurantStatusService.subscribeToAllRestaurantStatuses((allStatuses) => {
      setRestaurants(prevRestaurants => {
        return prevRestaurants.map(restaurant => {
          const restaurantIdStr = restaurant.id.toString();
          if (allStatuses[restaurantIdStr]) {
            const status = allStatuses[restaurantIdStr];
            const updated = {
              ...restaurant,
              isOpen: status.isOpen
            };
            
            // Sync images en temps réel depuis Firebase
            if (status.cover) {
              updated.image = resolveImageUrl(status.cover, updated.cover, staticImage);
            }
            if (status.logo) {
              updated.logo = resolveImageUrl(status.logo, null, null);
            }
            
            return updated;
          }
          return restaurant;
        });
      });
    });

    return () => unsubscribe();
  }, []);

  const renderRestaurantItem = ({ item }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurant: item })}
    >
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.restaurantImage} />
        {item.logo && (
          <View style={styles.logoContainer}>
            <Image source={item.logo} style={styles.logoImage} />
          </View>
        )}
      </View>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
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
        <View style={styles.statusContainer}>
          <StatusBadge isOpen={item.isOpen} size="small" />
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.address}</Text>
        </View>
        <View style={styles.infoRow}>
          {item.distance && (
            <>
              <Ionicons name="walk-outline" size={14} color="#FF9800" />
              <Text style={styles.distance}>{item.distance} km</Text>
            </>
          )}
          <Ionicons name="time-outline" size={14} color="#FF9800" />
          <Text style={[styles.deliveryTime, { color: '#FF9800' }]}>{item.deliveryTime} min</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.phone}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getCardHeight = () => {
    if (width >= 768) { // Tablette
      return 180;
    }
    return width < 350 ? 140 : 160; // Petit téléphone vs normal
  };

  const getCardWidth = () => {
    if (width >= 768) { // Tablette
      return (width - 36) / 2; // 2 colonnes avec padding
    }
    return width - 24; // Pleine largeur - padding
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={restaurants}
        renderItem={renderRestaurantItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF9800" />
            </View>
          ) : error ? (
            <ConnectionError onRetry={fetchRestaurants} />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f8f8',
  },
  restaurantsContainer: {
    padding: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  restaurantCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restaurantImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  restaurantInfo: {
    padding: 15,
    paddingTop: 25, // Espace pour le logo
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 10,
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
    marginBottom: 5,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  distance: {
    fontSize: 12,
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginRight: 8,
  },
  deliveryTime: {
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    fontFamily: "Montserrat",
  },
  retryButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
  },
  listContainer: {
    padding: 15,
  },
});

export default RestaurantList;
