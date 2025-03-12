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
  Image
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { Ionicons } from '@expo/vector-icons';

function MapScreen() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const [restaurants] = useState([
    {
      id: 1,
      name: "Restaurant Le Parisien",
      address: "123 Avenue de Paris",
      rating: 4.5,
      distance: "1.2 km",
      image: require('../../assets/images/2.jpg'),
      coordinate: {
        latitude: -4.2634,
        longitude: 15.2429,
      },
    },
    {
      id: 2,
      name: "La Mandarine",
      coordinate: {
        latitude: -4.2644,
        longitude: 15.2439,
      },
    },
    {
      id: 3,
      name: "Le Massamba",
      coordinate: {
        latitude: -4.2654,
        longitude: 15.2449,
      },
    },
  ]);

  useEffect(() => {
    checkLocationPermission();
  }, []);

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

  const renderRestaurantItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.restaurantItem}
      onPress={() => setSelectedRestaurant(item)}
    >
      <Image source={item.image} style={styles.restaurantImage} />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.restaurantAddress}>{item.address}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.rating}>{item.rating}</Text>
          <Text style={styles.distance}>{item.distance}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#51A905" />
      </View>
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
            {restaurants.map((restaurant) => (
              <Marker
                key={restaurant.id}
                coordinate={restaurant.coordinate}
                title={restaurant.name}
                pinColor="#51A905"
              />
            ))}
          </MapView>
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Restaurants à proximité</Text>
          <FlatList
            data={restaurants}
            renderItem={renderRestaurantItem}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
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
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  restaurantInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginLeft: 4,
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
});

export default MapScreen; 