import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { useLanguage } from '../../context/LanguageContext';
import { useRatings } from '../../context/RatingsContext';
import { translations } from '../../translations';
import { TrouverRestaurantSkeleton } from '../Skeletons';
import restaurantStatusService from '../../services/restaurantStatusService';
import InteractiveRating from '../InteractiveRating';
import StatusBadge from '../StatusBadge';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const BASE_URL = "https://www.api-mayombe.mayombe-app.com/public";

const TrouverRestaurant = ({ navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [restaurants, setRestaurants] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getBatchRatings } = useRatings();

  // Image statique pour les restaurants
  const staticImage = require("../../../assets/images/2.jpg");

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      fetchRestaurantsByCity(selectedCity);
    }
  }, [selectedCity]);

  // Recharger les restaurants quand on revient sur l'écran d'accueil
  useFocusEffect(
    React.useCallback(() => {
      if (selectedCity) {
        fetchRestaurantsByCity(selectedCity);
      }
    }, [selectedCity])
  );

  const fetchCities = async () => {
    try {
     
      const response = await fetch(`${API_BASE_URL}/villes`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        // Filtrer uniquement Brazzaville et Pointe-Noire
        const filteredCities = data.filter(city => {
          const cityName = city.libelle || city.name || "";
          return cityName.toLowerCase().includes("brazzaville") || 
                 cityName.toLowerCase().includes("pointe-noire") ||
                 cityName.toLowerCase().includes("pointe noire");
        });
        setCities(filteredCities);
        // Sélectionner la première ville par défaut
        if (filteredCities.length > 0) {
          setSelectedCity(filteredCities[0].libelle || filteredCities[0].name);
        }
      } else {
        throw new Error('Format de données invalide pour les villes');
      }
    } catch (error) {
      console.error('Erreur chargement villes:', error);
      setError('Impossible de charger les villes');
    }
  };

  const fetchRestaurantsByCity = async (selectedCity) => {
    try {
      setError(null); // Réinitialiser l'erreur au début
      const cityData = cities.find(c => c.libelle === selectedCity || c.name === selectedCity);
      if (!cityData) return;

      const response = await fetch(`${API_BASE_URL}/resto-by-id-ville?id_ville=${cityData.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        // Filtrer uniquement Brazzaville et Pointe-Noire
        const filteredData = data.filter(restaurant => {
          const cityName = restaurant.ville?.libelle || restaurant.ville?.name || cityData.libelle || cityData.name || "";
          return cityName.toLowerCase().includes("brazzaville") || 
                 cityName.toLowerCase().includes("pointe-noire") ||
                 cityName.toLowerCase().includes("pointe noire");
        });

        // Trier les restaurants du plus récent au plus ancien (par id décroissant)
        const sortedData = filteredData.sort((a, b) => b.id - a.id);
        const mappedRestaurants = sortedData.map(restaurant => ({
          id: restaurant.id,
          name: restaurant.name || "Nom non disponible",
          address: restaurant.adresse || "Adresse non disponible",
          phone: restaurant.phone || "Téléphone non disponible",
          image: restaurant.cover && typeof restaurant.cover === 'string'
            ? { uri: `https://www.mayombe-app.com/uploads_admin/${restaurant.cover}` }
            : require("../../../assets/images/2.jpg"),
        }));

        // Récupérer les ratings et statuts depuis Firebase
        const restaurantIds = mappedRestaurants.map(r => r.id.toString());
        let ratingsMap = {};
        let statusesMap = {};
        
        try {
          if (getBatchRatings && typeof getBatchRatings === 'function') {
            ratingsMap = await getBatchRatings(restaurantIds, 'restaurant');
          }
          statusesMap = await restaurantStatusService.getBatchRestaurantStatuses(restaurantIds);
        } catch (error) {
          console.error('❌ Erreur lors de la récupération des ratings ou statuts:', error);
        }

        // Enrichir les restaurants avec ratings et statuts
        const enrichedRestaurants = mappedRestaurants.map(restaurant => {
          const restaurantIdStr = restaurant.id.toString();
          const rating = ratingsMap[restaurantIdStr] || { averageRating: 0, totalRatings: 0 };
          const status = statusesMap[restaurantIdStr] || { isOpen: true };
          
          return {
            ...restaurant,
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

        setRestaurants(prevRestaurants => ({
          ...prevRestaurants,
          [selectedCity]: sortedRestaurants
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des restaurants:', error);
      setError('Impossible de charger les restaurants pour cette ville');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuByResto = async (restoId, subMenuId) => {
    try {
      const today = new Date();
      const jour = today.toISOString().split('T')[0];

      const url = `${API_BASE_URL}/get-menu-by-resto?jour=${jour}&sub_menu_id=${subMenuId}&restau_id=${restoId}`;
      console.log('URL de la requête:', url);
      console.log('Restaurant ID:', restoId);
      console.log('Sub Menu ID:', subMenuId);
      console.log('Date:', jour);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = await response.json();
      console.log('Réponse brute de l\'API:', data);

      if (response.ok) {
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

  const renderRestaurantCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={async () => {
        // Changement du sub_menu_id de 1 à 4
        const menuData = await fetchMenuByResto(item.id, 4);
        navigation.navigate('RestaurantDetails', { 
          restaurant: item,
          menuData
        });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Image source={item.image} style={styles.image} />
        <View style={styles.overlay} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.mainInfo}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.statusContainer}>
            <StatusBadge isOpen={item.isOpen} size="small" />
          </View>
        </View>
        <View style={styles.ratingContainer}>
          <InteractiveRating 
            itemId={item.id}
            type="restaurant"
            rating={item.averageRating || 0} 
            totalRatings={item.totalRatings || 0}
            size={12}
            onRatingSubmitted={() => {
              fetchRestaurantsByCity(selectedCity);
            }}
          />
        </View>

        <View style={styles.locationInfo}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        </View>


      </View>
    </TouchableOpacity>
  );

  const handleCitySelect = (city) => {
    // On récupère les données de la ville sélectionnée
    const selectedCityData = cities.find(c => c.libelle === city || c.name === city);
    if (selectedCityData) {
      navigation.navigate('AllRestaurants', { 
        city: selectedCityData.id,
        cityName: city 
      });
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCities}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t.home.findRestaurant.title}
        </Text>
        <Text style={styles.subtitle}>
          {t.home.findRestaurant.subtitle}
        </Text>
      </View>

      <FlatList
        ListHeaderComponent={() => (
          <>
            <FlatList
              horizontal
              data={cities}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabContainer}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.cityTab,
                    selectedCity === (item.libelle || item.name) && styles.selectedTab,
                  ]}
                  onPress={() => setSelectedCity(item.libelle || item.name)}
                >
                  <Ionicons 
                    name="location-sharp" 
                    size={16} 
                    color={selectedCity === (item.libelle || item.name) ? "#FFF" : "#FF9800"} 
                  />
                  <Text style={[
                    styles.cityTabText, 
                    selectedCity === (item.libelle || item.name) && styles.selectedTabText
                  ]}>
                    {item.libelle || item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}
        data={(restaurants[selectedCity] || []).slice(0, 4)}
        renderItem={renderRestaurantCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={() => (
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => handleCitySelect(selectedCity)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {t.home.findRestaurant.buttonText} {selectedCity}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => loading ? (
          <TrouverRestaurantSkeleton />
        ) : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    
    color: '#333',
    marginBottom: 6,
    fontFamily: 'Montserrat-Bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  tabContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8,
  },
  cityTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    gap: 4,
  },
  selectedTab: {
    backgroundColor: '#51A905',
  },
  cityTabText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  selectedTabText: {
    color: '#FFF',
  },
  listContainer: {
    padding: 15,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    position: 'relative',
    height: 130,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  cardContent: {
    padding: 12,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    flex: 1,
    marginRight: 8,
  },
  statusContainer: {
    marginVertical: 4,
  },
  ratingContainer: {
    marginVertical: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  address: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    flex: 1,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    margin: 15,
    padding: 14,
    borderRadius: 10,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
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
  retryButtonText: {
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
});

export default TrouverRestaurant;
