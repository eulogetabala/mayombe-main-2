import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import RestaurantProductModal from '../components/RestaurantProductModal';
import * as Location from 'expo-location';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const RestaurantDetails = ({ route, navigation }) => {
  const { restaurant: initialRestaurant, subMenus: initialSubMenus, initialMenus } = route.params;
  const [restaurant, setRestaurant] = useState(initialRestaurant || {});
  const [activeCategory, setActiveCategory] = useState('repas');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { addToCart } = useCart();
  const [subMenus, setSubMenus] = useState(initialSubMenus || []);
  const [selectedSubMenu, setSelectedSubMenu] = useState(initialSubMenus?.[0] || null);
  const [menus, setMenus] = useState(initialMenus || []);
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [validDates, setValidDates] = useState({ debut: null, fin: null });

  useEffect(() => {
    if (restaurant?.id) {
      fetchSubMenus();
    }
  }, [restaurant]);

  useEffect(() => {
    if (selectedSubMenu) {
      fetchMenusByResto();
    }
  }, [selectedSubMenu]);

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
  }, []);

  useEffect(() => {
    const logDebug = () => {
      console.log('[DEBUG DISTANCE] altitude:', restaurant.altitude, 'longitude:', restaurant.longitude, 'userLocation:', userLocation);
    };
    logDebug();
    if (
      userLocation &&
      restaurant &&
      restaurant.altitude &&
      restaurant.longitude &&
      !isNaN(parseFloat(restaurant.altitude)) &&
      !isNaN(parseFloat(restaurant.longitude))
    ) {
      const lat = parseFloat(restaurant.altitude);
      const lon = parseFloat(restaurant.longitude);
      // Vérifier que les coordonnées sont plausibles
      const plausible = lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
      console.log('[DEBUG DISTANCE] lat:', lat, 'lon:', lon, 'plausible:', plausible);
      if (plausible) {
        const dist = calculateDistance(
          parseFloat(userLocation.latitude),
          parseFloat(userLocation.longitude),
          lat,
          lon
        );
        setDistance(dist);
      } else {
        setDistance(null);
      }
    } else {
      setDistance(null);
    }
  }, [userLocation, restaurant]);

  // Nouvelle récupération des détails du restaurant
  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!initialRestaurant?.id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/resto`);
        const data = await response.json();
        if (Array.isArray(data)) {
          const found = data.find(r => r.id === initialRestaurant.id);
          if (found) {
            setRestaurant({ ...found, ...initialRestaurant }); // merge pour garder image custom si besoin
          }
        }
      } catch (e) {
        // fallback : garder l'initial
        setRestaurant(initialRestaurant);
      }
    };
    fetchRestaurantDetails();
  }, [initialRestaurant]);

  // Masquer le header natif
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const fetchSubMenus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/submenu-list`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('Sous-menus reçus:', data);

      if (Array.isArray(data) && data.length > 0) {
        setSubMenus(data);
        setSelectedSubMenu(data[0]); // Sélectionner le premier sous-menu par défaut
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sous-menus:', error);
      setError('Impossible de charger les sous-menus');
    }
  };

  // Fonction pour récupérer les dates valides
  const fetchValidDates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/valid-dates`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dates valides reçues:', data);
      
      if (data && data.debut && data.fin) {
        setValidDates({
          debut: data.debut,
          fin: data.fin
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des dates:', error);
      // En cas d'erreur, utiliser des dates par défaut
      setValidDates({
        debut: '2025/06/17',
        fin: '2025/08/31'
      });
    }
  };

  useEffect(() => {
    fetchValidDates();
  }, []);

  const fetchMenusByResto = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `${API_BASE_URL}/get-menu-by-resto?debut=${validDates.debut}&fin=${validDates.fin}&sub_menu_id=${selectedSubMenu.id}&resto_id=${restaurant.id}`;
      console.log('Appel API Menu URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Type de contenu non-JSON reçu:', contentType);
        throw new Error('La réponse du serveur n\'est pas au format JSON');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Réponse d\'erreur du serveur:', errorText);
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('Menus reçus:', data);

      if (Array.isArray(data)) {
        const mappedProducts = data.map(menu => {
          console.log('Menu reçu:', menu);
          const imageUrl = menu.cover && typeof menu.cover === 'string'
            ? `https://www.mayombe-app.com/uploads_admin/${menu.cover}`
            : null;
          console.log('URL image menu:', imageUrl);
          return {
            id: menu.id,
            name: menu.name || menu.libelle || "Sans nom",
            description: menu.description || "Aucune description",
            price: menu.prix || menu.price || "0",
            image: imageUrl
              ? { uri: imageUrl }
              : require('../../assets/images/2.jpg'),
            category: menu.category || menu.categorie,
            sub_menu_id: menu.sub_menu_id,
            restaurant_id: menu.restaurant_id,
            status: menu.status,
            created_at: menu.created_at,
            updated_at: menu.updated_at
          };
        });

        console.log('Produits mappés:', mappedProducts);
        setProducts(mappedProducts);
      } else {
        console.warn('Les données reçues ne sont pas un tableau:', data);
        setProducts([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des menus:', error);
      setError('Impossible de charger les menus');
      Alert.alert(
        'Erreur',
        'Impossible de charger les menus du restaurant. Veuillez réessayer plus tard.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Fonction de calcul de distance (Haversine)
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

  // Calcul de la durée estimée de livraison selon la distance
  const getEstimatedDeliveryTime = () => {
    if (!distance) return '...';
    // Exemple : 5 min de base + 2 min par km
    const base = 5;
    const perKm = 2;
    const estimated = Math.round(base + perKm * parseFloat(distance));
    return `${estimated} min`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Image source={restaurant.image} style={styles.coverImage} />
      <View style={styles.headerOverlay} />
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerName}>{restaurant.name}</Text>
       
      </View>
    </View>
  );

  const renderInfo = () => (
    <View style={styles.infoContainer}>
      <View style={styles.ratingRow}>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.rating}>{restaurant.rating}</Text>
          <Text style={styles.reviews}>({restaurant.reviews} avis)</Text>
        </View>
        <View style={styles.deliveryInfo}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.deliveryTime}>{getEstimatedDeliveryTime()}</Text>
        </View>
      </View>
      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.address}>{restaurant.adresse || 'Adresse non disponible'}</Text>
      </View>
      <View style={styles.addressContainer}>
        <Ionicons name="call-outline" size={16} color="#666" />
        <Text style={styles.address}>{restaurant.phone || 'Téléphone non disponible'}</Text>
      </View>
      {distance && (
        <View style={styles.addressContainer}>
          <Ionicons name="walk-outline" size={16} color="#666" />
          <Text style={styles.address}>Distance : {distance} km</Text>
        </View>
      )}
    </View>
  );

  const renderSubMenuTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.subMenuTabsContainer}
    >
      {subMenus.map((subMenu) => (
        <TouchableOpacity
          key={subMenu.id}
          style={[
            styles.subMenuTab,
            selectedSubMenu?.id === subMenu.id && styles.activeSubMenuTab
          ]}
          onPress={() => setSelectedSubMenu(subMenu)}
        >
          <Text
            style={[
              styles.subMenuTabText,
              selectedSubMenu?.id === subMenu.id && styles.activeSubMenuTabText
            ]}
          >
            {subMenu.name || subMenu.libelle}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const handleAddToCart = async (product) => {
    try {
      console.log('Produit à ajouter avec compléments:', product);
      console.log('ID du produit:', product.id);
      console.log('Type de l\'ID:', typeof product.id);
      
      // S'assurer que le prix est un nombre
      const basePrice = typeof product.price === 'string' 
        ? parseFloat(product.price.replace(/[^\d.-]/g, ''))
        : product.price || 0;

      // Calculer le prix total des compléments
      const complementsTotal = product.selectedComplements?.reduce((sum, complement) => 
        sum + (parseFloat(complement.price) || 0), 0) || 0;
        
      const productToAdd = {
        id: product.id,
        name: product.name,
        basePrice: basePrice,
        price: basePrice,
        image: product.image,
        quantity: product.quantity || 1,
        complements: product.selectedComplements || [],
        restaurant: restaurant.name,
        totalPrice: (basePrice + complementsTotal) * (product.quantity || 1),
        productKey: `${product.id}-${product.selectedComplements?.map(c => c.id).join('-') || ''}`,
        isMenu: true,
        menu_id: product.id,
        product_id: null, // S'assurer que product_id est null pour les menus
        type: 'menu' // Ajouter un type explicite
      };

      console.log('Produit formaté pour le panier:', productToAdd);
      
      const success = await addToCart(productToAdd);
      if (success) {
        setModalVisible(false);
        Alert.alert('Succès', 'Menu ajouté au panier !');
      } else {
        throw new Error('Impossible d\'ajouter le menu au panier');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter le menu au panier');
    }
  };

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const renderProductCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      activeOpacity={0.7}
      onPress={() => handleProductPress(item)}
    >
      <Image source={item.image} style={styles.productImage} />
      <View style={styles.productContent}>
        <View>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            {item.price} FCFA
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={(e) => {
              e.stopPropagation();
              handleProductPress(item);
            }}
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF9800" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchMenusByResto}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.productsContainer}
        ListEmptyComponent={
          <View style={styles.comingSoonContainer}>
            <Text style={styles.comingSoonText}>
              Aucun menu disponible
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {renderHeader()}
        {renderInfo()}
        {renderSubMenuTabs()}
        {renderContent()}
      </ScrollView>
      <RestaurantProductModal
        visible={modalVisible}
        product={selectedProduct}
        onClose={() => setModalVisible(false)}
        onAddToCart={handleAddToCart}
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
    height: 220,
    position: 'relative',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  headerName: {
    fontSize: 28,
    fontFamily: 'Montserrat-Bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerCuisine: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    color: '#FFF',
    opacity: 0.9,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
  },
  reviews: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryTime: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  address: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  categoryTabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  activeCategoryTab: {
    backgroundColor: '#FFF9E6',
  },
  categoryTabText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  activeCategoryTabText: {
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    flexDirection: 'row',
    height: 110,
  },
  productImage: {
    width: 110,
    height: '100%',
    resizeMode: 'cover',
  },
  productContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  productDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginVertical: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#FF9800',
  },
  addButton: {
    backgroundColor: '#FF9800',
    padding: 8,
    borderRadius: 20,
  },
  productsContainer: {
    padding: 16,
  },
  centerContent: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    fontFamily: 'Montserrat',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
  comingSoonContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  comingSoonText: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    color: '#666',
    textAlign: 'center',
  },
  subMenuTabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subMenuTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeSubMenuTab: {
    backgroundColor: '#FFF9E6',
  },
  subMenuTabText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  activeSubMenuTabText: {
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
});

export default RestaurantDetails; 