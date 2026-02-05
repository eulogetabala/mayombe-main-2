import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ActivityIndicator, FlatList, Image, Linking } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

const FindNearbyRestaurants = () => {
  const navigation = useNavigation();
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

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
    return (R * c).toFixed(1);
  };

  // Récupérer la localisation de l'utilisateur
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission de localisation refusée');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error('Erreur localisation:', error);
      setError('Impossible de récupérer votre position');
      return null;
    }
  };

  // Ouvrir les directions vers un restaurant
  const handleOpenDirections = (restaurant) => {
    try {
      // Fermer le modal de la carte
      setMapModalVisible(false);
      
      // Ouvrir Google Maps avec les directions vers le restaurant
      const destination = `${restaurant.address}`;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
      
      // Vérifier si on peut ouvrir l'URL
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback : ouvrir dans le navigateur
          Linking.openURL(`https://maps.google.com/maps?daddr=${encodeURIComponent(destination)}`);
        }
      });
    } catch (error) {
      console.error('Erreur ouverture directions:', error);
    }
  };

  // Récupérer les restaurants à proximité
  const fetchNearbyRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer la position de l'utilisateur
      const location = await getUserLocation();
      if (!location) {
        setLoading(false);
        return;
      }

      setUserLocation(location);

      // Récupérer tous les restaurants
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

        // Calculer la distance pour chaque restaurant
        const restaurantsWithDistance = filteredData
          .filter(restaurant => 
            restaurant.altitude && 
            restaurant.longitude && 
            !isNaN(parseFloat(restaurant.altitude)) && 
            !isNaN(parseFloat(restaurant.longitude))
          )
          .map(restaurant => {
            const distance = calculateDistance(
              location.latitude,
              location.longitude,
              parseFloat(restaurant.altitude),
              parseFloat(restaurant.longitude)
            );

            return {
              id: restaurant.id,
              name: restaurant.name || "Nom non disponible",
              address: restaurant.adresse || "Adresse non disponible",
              phone: restaurant.phone || "Téléphone non disponible",
              distance: parseFloat(distance),
              altitude: restaurant.altitude,
              longitude: restaurant.longitude,
              address: restaurant.adresse || "Adresse non disponible",
              image: restaurant.cover
                ? { uri: `https://www.mayombe-app.com/uploads_admin/${restaurant.cover}` }
                : require("../../../assets/images/2.jpg"),
            };
          })
          .sort((a, b) => a.distance - b.distance) // Trier par distance
          .slice(0, 10); // Prendre les 10 plus proches

        setNearbyRestaurants(restaurantsWithDistance);
      }
    } catch (error) {
      console.error('Erreur récupération restaurants:', error);
      setError('Impossible de charger les restaurants');
    } finally {
      setLoading(false);
    }
  };

  // Charger les restaurants quand le modal s'ouvre
  useEffect(() => {
    if (mapModalVisible) {
      fetchNearbyRestaurants();
    }
  }, [mapModalVisible]);

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={() => setMapModalVisible(true)}
      >
      <View style={styles.card}>
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="restaurant" size={28} color="#51A905" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Restaurants à proximité</Text>
            <Text style={styles.subtitle}>
              Trouvez les meilleurs restaurants près de chez vous
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setMapModalVisible(true)}
        >
          <Text style={styles.buttonText}>Voir la carte</Text>
          <Ionicons name="map-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>

      {/* Modal de la carte */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header amélioré avec gradient */}
          <LinearGradient
            colors={['#FF9800', '#FF6B00']}
            style={styles.modalHeader}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setMapModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.modalTitle}>Restaurants à proximité</Text>
                <Text style={styles.modalSubtitle}>
                  {userLocation ? `${nearbyRestaurants.length} restaurants trouvés` : 'Recherche en cours...'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchNearbyRestaurants}
                disabled={loading}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Contenu avec carte et liste */}
          <View style={styles.modalContent}>
            {/* Carte */}
            <View style={styles.mapSection}>
              {userLocation ? (
                <MapView
                  style={styles.mapContainer}
                  initialRegion={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                >
                  {nearbyRestaurants.map((restaurant) => {
                    if (restaurant.altitude && restaurant.longitude) {
                      const lat = parseFloat(restaurant.altitude);
                      const lon = parseFloat(restaurant.longitude);
                      if (!isNaN(lat) && !isNaN(lon)) {
                        return (
                          <Marker
                            key={restaurant.id}
                            coordinate={{
                              latitude: lat,
                              longitude: lon,
                            }}
                            title={restaurant.name}
                            description={restaurant.address}
                          />
                        );
                      }
                    }
                    return null;
                  })}
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <ActivityIndicator size="large" color="#FF9800" />
                  <Text style={styles.mapPlaceholderText}>Chargement de la carte...</Text>
                </View>
              )}
            </View>

            {/* Liste des restaurants */}
            <View style={styles.restaurantsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant" size={20} color="#FF9800" />
                <Text style={styles.sectionTitle}>Restaurants les plus proches</Text>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF9800" />
                  <Text style={styles.loadingText}>Recherche des restaurants...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={40} color="#FF6B6B" />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={fetchNearbyRestaurants}>
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={nearbyRestaurants}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.restaurantCard}>
                      <Image source={item.image} style={styles.restaurantImage} />
                      <View style={styles.restaurantInfo}>
                        <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.restaurantAddress} numberOfLines={1}>{item.address}</Text>
                        <View style={styles.restaurantMeta}>
                          <View style={styles.distanceContainer}>
                            <Ionicons name="location" size={14} color="#FF9800" />
                            <Text style={styles.distanceText}>{item.distance} km</Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.routeButton}
                            onPress={() => handleOpenDirections(item)}
                          >
                            <Ionicons name="navigate" size={14} color="#2196F3" />
                            <Text style={styles.routeButtonText}>Itinéraire</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.restaurantsList}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  button: {
    backgroundColor: '#51A905',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    paddingTop: 50, // Pour éviter le notch
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalContent: {
    flex: 1,
  },
  mapSection: {
    height: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapPlaceholderText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  restaurantsSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  restaurantsList: {
    paddingBottom: 20,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  routeButton: {
    padding: 8,
    borderRadius: 15,
    backgroundColor: '#E3F2FD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  routeButtonText: {
    fontSize: 10,
    color: '#2196F3',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
});

export default FindNearbyRestaurants; 