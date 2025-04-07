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

const RestaurantsSection = () => {
  const navigation = useNavigation();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCity, setUserCity] = useState(null);
  const [cities, setCities] = useState({});
  const { addToCart } = useCart();
  const refresh = useRefresh();
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  useEffect(() => {
    if (refresh?.refreshTimestamp) {
      fetchRestaurants();
    }
  }, [refresh?.refreshTimestamp]);

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
        const mappedRestaurants = data.map(restaurant => ({
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.adresse,
          phone: restaurant.phone,
          website: restaurant.website,
          ville_id: restaurant.ville_id,
          ville: cities[restaurant.ville_id] || "Ville inconnue",
          rating: 4.8,
          reviews: Math.floor(Math.random() * 150) + 100,
          image: require("../../../assets/images/2.jpg"),
          
          deliveryTime: "20-30",
          minOrder: "2000",
          isOpen: true,
        }));

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
      const today = new Date();
      const jour = today.toISOString().split('T')[0];

      const url = `${API_BASE_URL}/get-menu-by-resto?jour=${jour}&sub_menu_id=1&resto_id=${restoId}`;
      
      console.log('URL de la requête:', url);
      console.log('Restaurant ID:', restoId);
      console.log('Date du jour:', jour);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = await response.json();
      console.log('Réponse du menu:', data);

      if (response.ok) {
        if (!Array.isArray(data)) {
          console.log('La réponse n\'est pas un tableau:', data);
          return [];
        }

        const menuWithImages = data.map(item => ({
          ...item,
          cover: item.cover ? `${BASE_URL}/storage/${item.cover}` : null,
          complements: item.complements?.map(complement => ({
            ...complement,
            cover: complement.cover ? `${BASE_URL}/storage/${complement.cover}` : null
          }))
        }));

        console.log('Menu transformé:', menuWithImages);
        return menuWithImages;
      } else {
        throw new Error('Erreur lors de la récupération du menu');
      }
    } catch (error) {
      console.error('Erreur détaillée:', error);
      setError('Impossible de charger le menu du restaurant');
      return null;
    }
  };

  const renderRestaurantItem = ({ item: restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={async () => {
        console.log("Restaurant sélectionné:", restaurant);
        const menuData = await fetchMenuByResto(restaurant.id);
        console.log("Menu avant navigation:", menuData);
        navigation.navigate('RestaurantDetails', { 
          restaurant,
          menuData
        });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image source={restaurant.image} style={styles.restaurantImage} />
        <View style={styles.badgesContainer}>
          <View style={styles.deliveryBadge}>
            <Ionicons name="time-outline" size={12} color="#FFF" />
            <Text style={styles.deliveryTime}>{restaurant.deliveryTime} min</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{restaurant.rating}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.cuisineType} numberOfLines={1}>
            {restaurant.cuisine}
          </Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.reviews}>{restaurant.reviews} avis</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.minOrderContainer}>
            <Text style={styles.minOrderLabel}>Commande min.</Text>
            <Text style={styles.minOrderPrice}>{restaurant.minOrder} FCFA</Text>
          </View>
          <View style={styles.deliveryInfo}>
            <Ionicons name="location-outline" size={12} color="#666" />
            <Text style={styles.deliveryDistance}>1.2 km</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title} numberOfLines={1}>{t.home.nearbyRestaurants}</Text>
      <TouchableOpacity 
        style={styles.viewAllContainer}
        onPress={() => navigation.navigate('AllRestaurants')}
      >
        <Text style={styles.viewAllText} numberOfLines={1}>{t.home.seeAll}</Text>
        <Ionicons name="chevron-forward" size={15} color="#EB9A07" />
      </TouchableOpacity>
    </View>
  );

  const getLocationDetails = async (latitude, longitude) => {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      if (reverseGeocode && reverseGeocode[0]) {
        const address = reverseGeocode[0];
        return {
          city: address.city,
          region: address.region,
          country: address.country
        };
      }
      return null;
    } catch (error) {
      console.error('Erreur de géocodage:', error);
      return null;
    }
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
  restaurantCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  deliveryTime: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Montserrat-Medium',
  },
  ratingText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Montserrat-Medium',
  },
  cardContent: {
    padding: 12,
  },
  restaurantName: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 4,
    
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cuisineType: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  dot: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 4,
  },
  reviews: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  minOrderContainer: {
    flex: 1,
  },
  minOrderLabel: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'Montserrat',
  },
  minOrderPrice: {
    fontSize: 13,
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  deliveryDistance: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Montserrat-Medium',
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