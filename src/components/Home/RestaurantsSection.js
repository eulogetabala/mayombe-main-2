import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCart } from '../../context/CartContext';
import Toast from 'react-native-toast-message';
import { useRefresh } from '../../context/RefreshContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const BASE_URL = "https://www.api-mayombe.mayombe-app.com/public";
const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const RestaurantsSection = () => {
  const navigation = useNavigation();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCity, setUserCity] = useState(null);
  const [cities, setCities] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const { addToCart } = useCart();
  const refresh = useRefresh();
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(null);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    })();
    
    // Charger les villes
    fetchCities();
  }, []);

  useEffect(() => {
    if (refresh?.refreshTimestamp) {
      fetchRestaurants();
    }
  }, [refresh?.refreshTimestamp]);

  // Recharger les restaurants quand la localisation change
  useEffect(() => {
    if (userLocation) {
      fetchRestaurants();
    }
  }, [userLocation, cities]);

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

  const fetchCities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/villes`);
      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        const citiesMap = {};
        data.forEach(city => {
          citiesMap[city.id] = city.libelle;
        });
        setCities(citiesMap);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des villes:', error);
    }
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
      console.log("Données des restaurants reçues:", data);

      if (response.ok && Array.isArray(data)) {
        const mappedRestaurants = data.map(restaurant => {
          // Calcul distance si possible
          let distance = null;
          console.log('Restaurant:', restaurant.name, 'Altitude:', restaurant.altitude, 'Longitude:', restaurant.longitude);
          console.log('UserLocation:', userLocation);
          
          if (
            userLocation &&
            restaurant.altitude &&
            restaurant.longitude &&
            !isNaN(parseFloat(restaurant.altitude)) &&
            !isNaN(parseFloat(restaurant.longitude))
          ) {
            const lat = parseFloat(restaurant.altitude);
            const lon = parseFloat(restaurant.longitude);
            console.log('Coordonnées parsées - Lat:', lat, 'Lon:', lon);
            
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
              distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                lat,
                lon
              );
              console.log('Distance calculée:', distance, 'km');
            } else {
              console.log('Coordonnées invalides');
            }
          } else {
            console.log('Données manquantes pour le calcul de distance');
          }
          
          const deliveryTime = calculateDeliveryTime(distance);
          console.log('Temps de livraison calculé:', deliveryTime);
          
          return {
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.adresse,
            phone: restaurant.phone,
            website: restaurant.website,
            ville_id: restaurant.ville_id,
            ville: cities[restaurant.ville_id] || "Ville inconnue",
            rating: restaurant.rating || 4.5,
            reviews: Math.floor(Math.random() * 150) + 100,
            image: restaurant.cover
              ? { uri: `https://www.mayombe-app.com/uploads_admin/${restaurant.cover}` }
              : require("../../../assets/images/2.jpg"),
            deliveryTime: deliveryTime,
            minOrder: "2000",
            isOpen: true,
            distance: distance,
          };
        });

        console.log("Restaurants mappés:", mappedRestaurants);

        const topRatedRestaurants = mappedRestaurants
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 4);

        setRestaurants(topRatedRestaurants);
        if (mappedRestaurants.length > 0 && cities[mappedRestaurants[0].ville_id]) {
          setUserCity(cities[mappedRestaurants[0].ville_id]);
        }
      }
    } catch (error) {
      console.error("Erreur fetchRestaurants:", error);
      setError('Impossible de charger les restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item) => {
    const productToAdd = {
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      restaurant: item.name,
    };
    
    const success = await addToCart(productToAdd);
    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Produit ajouté',
        text2: 'Le produit a été ajouté à votre panier',
        position: 'bottom',
      });
    }
  };

  const onRefresh = useCallback(async () => {
    await fetchRestaurants();
  }, []);

  const fetchMenuByResto = async (restoId) => {
    try {
      console.log(`Récupération du menu pour le restaurant ID: ${restoId}`);
      
      // Récupérer d'abord la liste des sous-menus disponibles
      const submenuUrl = `${API_BASE_URL}/submenu-list`;
      console.log('URL submenu-list:', submenuUrl);
      
      const submenuResponse = await fetch(submenuUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const submenuData = await submenuResponse.json();
      console.log('Données submenu-list reçues:', JSON.stringify(submenuData, null, 2));
      
      // Si nous avons des sous-menus, essayer de récupérer le menu pour chaque sous-menu
      if (Array.isArray(submenuData) && submenuData.length > 0) {
        let allMenuItems = [];
        
        // Essayer avec le premier sous-menu d'abord
        const firstSubmenuId = submenuData[0].id;
        const menuUrl = `${API_BASE_URL}/get-menu-by-resto?debut=2025/04/15&fin=2025/06/22&sub_menu_id=${firstSubmenuId}&resto_id=${restoId}`;
        
        console.log('URL menu details:', menuUrl);
        
        const menuResponse = await fetch(menuUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        const menuData = await menuResponse.json();
        console.log('Détails du menu reçus:', JSON.stringify(menuData, null, 2));
        
        if (Array.isArray(menuData) && menuData.length > 0) {
          // Si nous avons des données pour le premier sous-menu, les ajouter
          allMenuItems = [...menuData];
        }
        
        // Si nous n'avons pas de données pour le premier sous-menu, essayer les autres
        if (allMenuItems.length === 0 && submenuData.length > 1) {
          for (let i = 1; i < submenuData.length; i++) {
            const submenuId = submenuData[i].id;
            const additionalMenuUrl = `${API_BASE_URL}/get-menu-by-resto?debut=2025/04/15&fin=2025/06/22&sub_menu_id=${submenuId}&resto_id=${restoId}`;
            
            console.log(`Essai avec sous-menu ${submenuId}:`, additionalMenuUrl);
            
            const additionalMenuResponse = await fetch(additionalMenuUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              }
            });
            
            const additionalMenuData = await additionalMenuResponse.json();
            
            if (Array.isArray(additionalMenuData) && additionalMenuData.length > 0) {
              allMenuItems = [...allMenuItems, ...additionalMenuData];
              break; // Arrêter dès qu'on trouve des données
            }
          }
        }
        
        // Transformer les données du menu avec les images
        if (allMenuItems.length > 0) {
          const menuWithImages = allMenuItems.map(item => ({
            ...item,
            cover: item.cover ? `${BASE_URL}/storage/${item.cover}` : null,
            complements: item.complements?.map(complement => ({
              ...complement,
              cover: complement.cover ? `${BASE_URL}/storage/${complement.cover}` : null
            }))
          }));
          
          console.log('Menu transformé avec succès:', menuWithImages.length, 'éléments');
          return menuWithImages;
        }
      }
      
      // Si nous n'avons pas trouvé de menu, retourner un tableau vide
      console.log('Aucun menu trouvé pour ce restaurant');
      return [];
      
    } catch (error) {
      console.error('Erreur détaillée:', error);
      setError('Impossible de charger le menu du restaurant');
      return null;
    }
  };

  const renderRestaurantItem = ({ item: restaurant }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={async () => {
        const menuData = await fetchMenuByResto(restaurant.id);
        navigation.navigate('RestaurantDetails', { 
          restaurant,
          menuData
        });
      }}
      activeOpacity={0.85}
    >
      <View style={styles.imageContainer}>
        <Image source={restaurant.image} style={styles.restaurantImage} />
        <View style={styles.overlay} />
        <View style={styles.badgeContainer}>
          <Text style={[styles.badge, restaurant.isOpen ? styles.open : styles.closed]}>
            {restaurant.isOpen ? 'Ouvert' : 'Fermé'}
          </Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.restaurantAddress} numberOfLines={1}>{restaurant.address}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="star" size={scaleFont(10)} color="#FFD700" />
          <Text style={styles.rating}>{restaurant.rating}</Text>
          {restaurant.distance && (
            <>
              <Ionicons name="walk-outline" size={scaleFont(10)} color="#FF9800" style={styles.infoIcon} />
              <Text style={styles.distance}>{restaurant.distance} km</Text>
            </>
          )}
          <Ionicons name="time-outline" size={scaleFont(10)} color="#FF9800" style={styles.infoIcon} />
          <Text style={[styles.deliveryTime, { color: '#FF9800' }]}>{restaurant.deliveryTime} min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title} numberOfLines={1}>Restaurants disponibles</Text>
      <TouchableOpacity 
        style={styles.viewAllContainer}
        onPress={() => navigation.navigate('AllRestaurants')}
      >
        <Text style={styles.viewAllText} numberOfLines={1}>{t.home.seeAll}</Text>
        <Ionicons name="chevron-forward" size={15} color="#EB9A07" />
      </TouchableOpacity>
    </View>
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
        numColumns={2}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    marginTop: 22,
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 15,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    color: "#333",
    fontFamily: "Montserrat-Bold",
    flex: 1,
    marginRight: 10,
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 70,
    maxWidth: 100,
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: "#EB9A07",
    fontFamily: "Montserrat-Bold",
    marginRight: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 18,
    marginHorizontal: 4,
    overflow: 'hidden',
    elevation: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    width: '48%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1.3,
    backgroundColor: '#f5f5f5',
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.13)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
    overflow: 'hidden',
  },
  open: {
    backgroundColor: '#51A905',
  },
  closed: {
    backgroundColor: '#FF4B4B',
  },
  content: {
    padding: 12,
    alignItems: 'flex-start',
  },
  restaurantName: {
    fontSize: scaleFont(15),
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 2,
  },
  restaurantAddress: {
    fontSize: scaleFont(12),
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  infoIcon: {
    marginLeft: 3,
  },
  rating: {
    fontSize: scaleFont(9),
    color: '#FFD700',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 1,
  },
  distance: {
    fontSize: scaleFont(9),
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 1,
  },
  deliveryTime: {
    fontSize: scaleFont(9),
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Montserrat',
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

export default RestaurantsSection;