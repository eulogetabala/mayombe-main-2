import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Text, 
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  Image,
  Linking,
  Alert
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';

function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [allRestaurants, setAllRestaurants] = useState([]);

  // Fonction pour calculer la distance entre deux points en km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fonction pour rechercher les restaurants via l'API
  const searchNearbyRestaurants = async (latitude, longitude) => {
    try {
      setLoading(true);
      console.log('Recherche des restaurants avec les coordonnées:', { latitude, longitude });
      
      // Récupérer tous les restaurants depuis l'API
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      console.log('Réponse de l\'API:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la récupération des restaurants');
      }

      const data = await response.json();
      console.log('Données reçues:', data);

      if (!Array.isArray(data)) {
        throw new Error('Format de données invalide');
      }

      // Filtrer et calculer la distance pour chaque restaurant
      const restaurantsData = data
        .map(restaurant => {
          const distance = calculateDistance(
            latitude,
            longitude,
            parseFloat(restaurant.latitude),
            parseFloat(restaurant.longitude)
          );

          return {
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            coordinate: {
              latitude: parseFloat(restaurant.latitude),
              longitude: parseFloat(restaurant.longitude),
            },
            distance: distance.toFixed(1),
            image: restaurant.image,
            category: restaurant.category || 'Restaurant',
            rating: restaurant.rating,
            isOpen: restaurant.is_open
          };
        })
        // Filtrer les restaurants dans un rayon de 10km
        .filter(restaurant => parseFloat(restaurant.distance) <= 10)
        // Trier par distance
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

      setAllRestaurants(restaurantsData);
    } catch (error) {
      console.error('Erreur détaillée:', error);
      let errorMessage = 'Une erreur est survenue lors de la recherche des restaurants.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'La requête a pris trop de temps. Veuillez réessayer.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.';
      }

      Alert.alert(
        'Erreur',
        errorMessage,
        [
          {
            text: 'Réessayer',
            onPress: () => searchNearbyRestaurants(latitude, longitude)
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLocationPermission();
  }, []);

  useEffect(() => {
    if (location) {
      searchNearbyRestaurants(location.coords.latitude, location.coords.longitude);
    }
  }, [location]);

  const checkLocationPermission = async () => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(existingStatus);

      if (existingStatus === 'granted') {
        getCurrentLocation();
        return;
      }

      if (existingStatus === 'undetermined') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setPermissionStatus(status);
        if (status === 'granted') {
          getCurrentLocation();
        }
      }
    } catch (error) {
      console.error('Erreur de permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    } catch (error) {
      console.error('Erreur de localisation:', error);
    }
  };

  const handleRetryPermission = () => {
    checkLocationPermission();
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const openInMaps = (restaurant) => {
    const scheme = Platform.select({
      ios: `maps:${restaurant.coordinate.latitude},${restaurant.coordinate.longitude}`,
      android: `geo:${restaurant.coordinate.latitude},${restaurant.coordinate.longitude}?q=${restaurant.name}`
    });
    Linking.openURL(scheme);
  };

  const renderRestaurantItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.restaurantItem}
      onPress={() => setSelectedRestaurant(item)}
    >
      <Image 
        source={item.image ? { uri: item.image } : require('../../assets/images/2.jpg')}
        style={styles.restaurantImage}
        defaultSource={require('../../assets/images/2.jpg')}
      />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.restaurantAddress} numberOfLines={2}>
          {item.address}
        </Text>
        <View style={styles.detailsContainer}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.distance}>{item.distance} km</Text>
        </View>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.directionsButton}
          onPress={() => openInMaps(item)}
        >
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.directionsButtonText}>Itinéraire</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (permissionStatus !== 'granted') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>
          {t.permissions.locationMessage}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetryPermission}
        >
          <Text style={styles.retryButtonText}>
            {t.permissions.openSettings}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurants de la ville</Text>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{
              latitude: location?.coords?.latitude || -4.2634,
              longitude: location?.coords?.longitude || 15.2429,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
          >
            {allRestaurants.map((restaurant) => (
              <Marker
                key={restaurant.id}
                coordinate={restaurant.coordinate}
                title={restaurant.name}
                description={`${restaurant.distance} km`}
                pinColor="#51A905"
              />
            ))}
          </MapView>
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            {allRestaurants.length} restaurant{allRestaurants.length > 1 ? 's' : ''} trouvé{allRestaurants.length > 1 ? 's' : ''}
          </Text>
          <FlatList
            data={allRestaurants}
            renderItem={renderRestaurantItem}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Aucun restaurant trouvé dans cette zone
              </Text>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginLeft: 10,
  },
  mapContainer: {
    height: '50%',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  map: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginVertical: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  restaurantItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 12,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restaurantImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  restaurantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  restaurantAddress: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginTop: 4,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  category: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat-Medium',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  distance: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginLeft: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginBottom: 80,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    fontFamily: 'Montserrat-Regular',
  },
  retryButton: {
    backgroundColor: '#51A905',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
    marginTop: 20,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#51A905',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  directionsButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat-Medium',
  },
  loadingContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#51A905',
    fontFamily: 'Montserrat-Medium',
  },
});

export default MapScreen; 