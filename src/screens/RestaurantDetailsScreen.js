import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RestaurantProductModal from '../components/RestaurantProductModal';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const BASE_IMAGE_URL = "https://www.mayombe-app.com";

const RestaurantDetails = ({ route, navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
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
  const [imageErrors, setImageErrors] = useState(new Set());

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

  // Fonction pour récupérer les dates valides dynamiquement
  const fetchValidDates = async () => {
    try {
      const dateRanges = [
        { debut: '2025-06-01', fin: '2026-06-25' },
        { debut: '2025/06/01', fin: '2026/06/25' },
        { debut: '2025-07-05', fin: '2025-10-05' },
        { debut: '2025/07/05', fin: '2025/10/05' },
        { debut: '2025-06-25', fin: '2025-10-25' },
        { debut: '2025/06/25', fin: '2025/10/25' },
        { debut: '2025-01-01', fin: '2025-12-31' },
        { debut: '2025/01/01', fin: '2025/12/31' }
      ];

      if (subMenus.length > 0) {
        console.log(`🔍 Test des ${subMenus.length} sous-menus pour le restaurant ${restaurant.id}`);
        
        for (const subMenu of subMenus) {
          console.log(`📋 Test du sous-menu: ${subMenu.libelle} (ID: ${subMenu.id})`);
          
          for (const dateRange of dateRanges) {
            const url = `${API_BASE_URL}/get-menu-by-resto?debut=${dateRange.debut}&fin=${dateRange.fin}&sub_menu_id=${subMenu.id}&resto_id=${restaurant.id}`;
            
            try {
              const response = await fetch(url, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                }
              });

              if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                  console.log(`✅ Période valide trouvée pour ${subMenu.libelle}:`, dateRange, `(${data.length} menus)`);
                  setValidDates(dateRange);
                  return;
                }
              }
            } catch (error) {
              console.log(`❌ Erreur avec ${subMenu.libelle} et la période:`, dateRange, error.message);
              continue;
            }
          }
        }
      }

      console.log('⚠️ Aucune période valide trouvée, utilisation de la période par défaut');
      setValidDates({
        debut: '2025-06-01',
        fin: '2026-06-25'
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des dates valides:', error);
      setValidDates({
        debut: '2025-06-01',
        fin: '2026-06-25'
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

      if (!selectedSubMenu) {
        setProducts([]);
        return;
      }

      // Essayer plusieurs périodes pour ce sous-menu spécifique
      const dateRanges = [
        { debut: '2025-06-01', fin: '2026-06-25' },
        { debut: '2025/06/01', fin: '2026/06/25' },
        { debut: '2025-07-05', fin: '2025-10-05' },
        { debut: '2025/07/05', fin: '2025/10/05' },
        { debut: '2025-06-25', fin: '2025-10-25' },
        { debut: '2025/06/25', fin: '2025/10/25' },
        { debut: '2025-01-01', fin: '2025-12-31' },
        { debut: '2025/01/01', fin: '2025/12/31' }
      ];

      let data = null;
      let workingDateRange = null;

      // Tester chaque période pour ce sous-menu
      for (const dateRange of dateRanges) {
        const url = `${API_BASE_URL}/get-menu-by-resto?debut=${dateRange.debut}&fin=${dateRange.fin}&sub_menu_id=${selectedSubMenu.id}&resto_id=${restaurant.id}`;
        console.log(`🔍 Test URL pour ${selectedSubMenu.libelle}:`, url);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          });

          if (response.ok) {
            const responseData = await response.json();
            if (Array.isArray(responseData) && responseData.length > 0) {
              console.log(`✅ Données trouvées pour ${selectedSubMenu.libelle} avec la période:`, dateRange, `(${responseData.length} menus)`);
              data = responseData;
              workingDateRange = dateRange;
              break;
            }
          }
        } catch (error) {
          console.log(`❌ Erreur avec la période:`, dateRange, error.message);
          continue;
        }
      }

      if (data && data.length > 0) {
        const processedMenus = data.map(menu => {
          const coverPath = menu.cover || '';
          console.log('🔍 Chemin original de l\'image:', coverPath);

          // Construire l'URL de l'image de manière simple et cohérente
          let imageUrl = null;
          if (coverPath) {
            imageUrl = `https://www.mayombe-app.com/uploads_admin/${coverPath}`;
            console.log('🔗 URL HTTPS construite:', imageUrl);
          }
          
          console.log('📸 URL finale de l\'image:', imageUrl);

          return {
            ...menu,
            name: menu.libelle || menu.name || "Sans nom",
            description: menu.description || "Aucune description",
            price: menu.prix || menu.price || "0",
            image: imageUrl ? { uri: imageUrl } : require('../../assets/images/2.jpg'),
            category: selectedSubMenu.libelle,
            sub_menu_id: selectedSubMenu.id,
            restaurant_id: restaurant.id,
            complements: (menu.complements || []).map(complement => ({
              ...complement,
              name: complement.libelle || complement.name || "Sans nom",
              price: complement.prix || complement.price || "0",
              image: complement.cover 
                ? { uri: `https://www.mayombe-app.com/uploads_admin/${complement.cover}` }
                : null
            }))
          };
        });

        setProducts(processedMenus);
        setMenus(processedMenus);
        console.log('Menus traités et affichés:', processedMenus.length);
        setError(null);
      } else {
        console.warn(`Aucun menu trouvé pour ${selectedSubMenu.libelle}`);
        const demoProducts = [
          {
            id: 1,
            name: "Poulet Braisé",
            description: "Poulet braisé avec accompagnement",
            price: "5000",
            image: require('../../assets/images/2.jpg'),
            category: selectedSubMenu.libelle,
            sub_menu_id: selectedSubMenu.id,
            restaurant_id: restaurant.id,
            status: "actif"
          },
          {
            id: 2,
            name: "Poisson Braisé",
            description: "Poisson frais braisé avec légumes",
            price: "6000",
            image: require('../../assets/images/2.jpg'),
            category: selectedSubMenu.libelle,
            sub_menu_id: selectedSubMenu.id,
            restaurant_id: restaurant.id,
            status: "actif"
          },
          {
            id: 3,
            name: "Riz au Poulet",
            description: "Riz parfumé avec poulet et légumes",
            price: "4500",
            image: require('../../assets/images/2.jpg'),
            category: selectedSubMenu.libelle,
            sub_menu_id: selectedSubMenu.id,
            restaurant_id: restaurant.id,
            status: "actif"
          }
        ];
        setProducts(demoProducts);
        setError(`Aucun menu disponible pour ${selectedSubMenu.libelle} - Affichage des plats populaires`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des menus:', error);
      
      const demoProducts = [
        {
          id: 1,
          name: "Poulet Braisé",
          description: "Poulet braisé avec accompagnement",
          price: "5000",
          image: require('../../assets/images/2.jpg'),
          category: selectedSubMenu?.libelle || "Repas",
          sub_menu_id: selectedSubMenu?.id || 4,
          restaurant_id: restaurant.id,
          status: "actif"
        },
        {
          id: 2,
          name: "Poisson Braisé",
          description: "Poisson frais braisé avec légumes",
            price: "6000",
            image: require('../../assets/images/2.jpg'),
            category: selectedSubMenu?.libelle || "Repas",
            sub_menu_id: selectedSubMenu?.id || 4,
            restaurant_id: restaurant.id,
            status: "actif"
          },
          {
            id: 3,
            name: "Riz au Poulet",
            description: "Riz parfumé avec poulet et légumes",
            price: "4500",
            image: require('../../assets/images/2.jpg'),
            category: selectedSubMenu?.libelle || "Repas",
            sub_menu_id: selectedSubMenu?.id || 4,
            restaurant_id: restaurant.id,
            status: "actif"
          }
        ];
        setProducts(demoProducts);
        setError('Menus temporairement indisponibles - Affichage des plats populaires');
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

  const handleImageError = (itemId) => {
    setImageErrors(prev => new Set(prev).add(itemId));
    console.log('❌ Erreur image pour item ID:', itemId);
  };

  // Fonction pour tester si une URL d'image est accessible
  const testImageUrl = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.log('❌ URL image inaccessible:', url, error.message);
      return false;
    }
  };

  // Fonction pour précharger une image
  const preloadImage = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.log('❌ Image non accessible:', imageUrl, error.message);
      return false;
    }
  };

  // Fonction pour construire l'URL d'image optimale
  const buildImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') {
      console.warn('⚠️ Chemin d\'image invalide:', imagePath);
      return null;
    }
    
    // Nettoyer le chemin de l'image
    const cleanPath = imagePath.trim();
    if (!cleanPath) {
      console.warn('⚠️ Chemin d\'image vide');
      return null;
    }
    
    // Construire l'URL complète
    const fullUrl = `https://www.mayombe-app.com/uploads_admin/${cleanPath}`;
    console.log('🔍 URL image construite:', fullUrl);
    
    return fullUrl;
  };

  const renderProductCard = ({ item }) => {
    // Déterminer la source de l'image avec fallback
    const imageSource = imageErrors.has(item.id) 
      ? require('../../assets/images/2.jpg')
      : item.image;

    console.log('🎨 Rendu image pour:', item.name, 'Source:', imageSource);

    return (
      <TouchableOpacity 
        style={styles.productCard} 
        activeOpacity={0.7}
        onPress={() => handleProductPress(item)}
      >
        <Image 
          source={imageSource} 
          style={styles.productImage}
          onError={(error) => {
            console.log('❌ Erreur image pour:', item.name, 'URL:', item.image?.uri, 'Erreur:', error.nativeEvent);
            handleImageError(item.id);
          }}
          onLoad={() => {
            console.log('✅ Image chargée avec succès pour:', item.name, 'URL:', item.image?.uri);
          }}
          resizeMode="cover"
          defaultSource={require('../../assets/images/2.jpg')}
        />
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
  };

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
            <Text style={styles.retryText}>{t.restaurants.retry}</Text>
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
        ListHeaderComponent={
          error ? (
            <View style={styles.infoContainer}>
              <View style={styles.infoMessage}>
                <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
                <Text style={styles.infoText}>{error}</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.comingSoonContainer}>
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text style={styles.comingSoonText}>
              {t.restaurants.emptyState.noMenuAvailable}
            </Text>
            <Text style={styles.comingSoonSubtext}>
              {t.restaurants.emptyState.menusConfiguring}
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
    marginTop: 12,
  },
  comingSoonSubtext: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
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
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#FF9800',
  },
});

export default RestaurantDetails; 