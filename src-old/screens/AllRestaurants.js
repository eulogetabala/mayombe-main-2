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

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const { width } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const AllRestaurants = ({ route, navigation }) => {
  const cityId = route?.params?.city;
  const cityName = route?.params?.cityName;
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toggleRestaurantFavorite, isRestaurantFavorite } = useFavorites();

  useEffect(() => {
    // Désactiver le header pour cet écran
    navigation.setOptions({
      headerShown: false
    });
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const endpoint = cityId 
        ? `${API_BASE_URL}/resto-by-id-ville?id_ville=${cityId}`
        : `${API_BASE_URL}/resto`;
        
      const response = await fetch(endpoint);
      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        // Filtrer les restaurants actifs
        const activeRestaurants = data.filter(restaurant => restaurant.statut === "actif");

        const mappedRestaurants = activeRestaurants.map(restaurant => ({
          id: restaurant.id,
          name: restaurant.libelle || restaurant.name,
          address: restaurant.adresse || "Adresse non disponible",
          rating: restaurant.rating || 4.5,
          reviews: restaurant.reviews || Math.floor(Math.random() * 150) + 50,
          image: restaurant.cover && typeof restaurant.cover === 'string'
            ? { uri: `https://www.mayombe-app.com/uploads_admin/${restaurant.cover}` }
            : require("../../assets/images/2.jpg"),
          cuisine: restaurant.cuisine || "Cuisine africaine",
          deliveryTime: "20-30",
          minOrder: "5000",
          isOpen: true,
        }));

        // Trier les restaurants par ID décroissant (les plus récents en premier)
        const sortedRestaurants = mappedRestaurants.sort((a, b) => b.id - a.id);
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
          <Text style={[styles.badge, item.isOpen ? styles.open : styles.closed]}>
            {item.isOpen ? 'Ouvert' : 'Fermé'}
          </Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cuisineType} numberOfLines={1}>{item.cuisine}</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={scaleFont(14)} color="#FFD700" />
            <Text style={styles.rating}>{item.rating}</Text>
            <Text style={styles.reviews}>({item.reviews})</Text>
          </View>
          <View style={styles.deliveryContainer}>
            <Ionicons name="time-outline" size={scaleFont(14)} color="#FF9800" />
            <Text style={styles.deliveryTime}>{item.deliveryTime} min</Text>
          </View>
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
    color: '#333',
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#FFA000',
    fontFamily: 'Montserrat-Bold',
  },
  reviews: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
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
    fontSize: 14,
    color: '#FF9800',
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