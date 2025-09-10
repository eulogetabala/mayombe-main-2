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
import { useFavorites } from '../context/FavoritesContext';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const RestaurantListScreen = ({ route, navigation }) => {
  const { city, cityName } = route.params || {};
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toggleRestaurantFavorite, isRestaurantFavorite } = useFavorites();

  useEffect(() => {
    fetchRestaurants();
  }, [city]);

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
        const mappedRestaurants = data.map(restaurant => ({
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.adresse,
          ville_id: restaurant.ville_id,
          ville: restaurant.ville?.libelle || "Ville inconnue",
          rating: "4.8",
          reviews: Math.floor(Math.random() * 150) + 100,
          image: require("../../assets/images/2.jpg"),
          cuisine: "Cuisine africaine",
          deliveryTime: "20-30",
          minOrder: "5000",
          isOpen: true,
        }));

        setRestaurants(mappedRestaurants);
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
            <Ionicons name="time-outline" size={14} color="#FFF" />
            <Text style={styles.deliveryTime}>
              Livraison: {restaurant.deliveryTime} min
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{restaurant.rating}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.cuisineType}>{restaurant.cuisine}</Text>
            <Text style={styles.reviews}>({restaurant.reviews} avis)</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.minOrderContainer}>
              <Ionicons name="cart-outline" size={14} color="#666" />
              <Text style={styles.minOrder}>Min. {restaurant.minOrder} FCFA</Text>
            </View>
            <Text style={styles.status}>
              {restaurant.isOpen ? 'Ouvert' : 'Fermé'}
            </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
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