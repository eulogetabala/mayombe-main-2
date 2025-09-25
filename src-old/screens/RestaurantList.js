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

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const RestaurantList = ({ route, navigation }) => {
  const city = route?.params?.city || "Toutes les villes"; // Valeur par défaut
  const { width, height } = useWindowDimensions(); // Pour le responsive
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    fetchRestaurants();
  }, [city]);

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
        const mappedRestaurants = data.map(resto => ({
          id: resto.id,
          name: resto.name || "Nom non disponible",
          address: resto.adresse || "Adresse non disponible",
          phone: resto.phone || "Téléphone non disponible",
          website: resto.website,
          image: staticImage,
        }));

        setRestaurants(mappedRestaurants);
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

  const renderRestaurantItem = ({ item }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurant: item })}
    >
      <Image source={item.image} style={styles.restaurantImage} />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.address}</Text>
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
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchRestaurants}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
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
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 10,
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
