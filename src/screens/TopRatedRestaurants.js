import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { useRatings } from '../context/RatingsContext';
import restaurantStatusService from '../services/restaurantStatusService';
import InteractiveRating from '../components/InteractiveRating';
import StatusBadge from '../components/StatusBadge';
import { resolveImageUrl } from '../Utils/imageUtils';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const TopRatedRestaurants = ({ navigation }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const { getBatchRatings } = useRatings();

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Restaurants bien notés",
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
          console.log('Permission localisation refusée - TopRated - Utilisation défaut');
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
          console.log('Position technique impossible - TopRated - Utilisation défaut');
          setUserLocation({ latitude: -4.2634, longitude: 15.2429 });
        }
      } catch (error) {
        console.error('Erreur localisation TopRated:', error);
        setUserLocation({ latitude: -4.2634, longitude: 15.2429 });
      }
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
      const response = await fetch(`${API_BASE_URL}/resto`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
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
            name: restaurant.name || "Nom non disponible",
            address: restaurant.adresse || "Adresse non disponible",
            phone: restaurant.phone || "Téléphone non disponible",
            cover: restaurant.cover, // Garder le chemin original pour fallback
            logo: restaurant.logo, // Garder le chemin original pour fallback
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
            require("../../assets/images/2.jpg")
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
    >
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.restaurantImage} />
        {/* Logo du restaurant */}
        {item.logo && (
          <View style={styles.logoContainer}>
            <Image source={item.logo} style={styles.logoImage} />
          </View>
        )}
      </View>
      <View style={styles.restaurantInfo}>
        <View style={styles.headerRow}>
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
    <View style={styles.container}>
      <FlatList
        data={restaurants}
        renderItem={renderRestaurantItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContainer: {
    padding: 15,
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
  imageContainer: {
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  logoContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    padding: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 2,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    resizeMode: 'cover',
  },
  restaurantInfo: {
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
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
  reviews: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Montserrat',
    marginTop: 5,
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
    textAlign: 'center',
    fontFamily: 'Montserrat',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
});

export default TopRatedRestaurants; 