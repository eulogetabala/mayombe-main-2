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

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const BASE_URL = "https://www.api-mayombe.mayombe-app.com";

const RestaurantDetails = ({ route, navigation }) => {
  const { restaurant } = route.params;
  const [subMenus, setSubMenus] = useState([]);
  const [menuData, setMenuData] = useState({});
  const [selectedSubMenu, setSelectedSubMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { addToCart } = useCart();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

  const validateImageUrl = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const constructImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${BASE_URL}/public/storage/${imagePath}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. D'abord, récupérer la liste des sous-menus
      const subMenuListUrl = `${API_BASE_URL}/submenu-list`;
      console.log("URL submenu-list:", subMenuListUrl);
      
      const subMenuResponse = await fetch(subMenuListUrl);
      const subMenuData = await subMenuResponse.json();
      console.log("Données submenu-list reçues:", subMenuData);
      
      if (Array.isArray(subMenuData)) {
        setSubMenus(subMenuData);
        
        // 2. Si nous avons des sous-menus, récupérer les détails du menu
        if (subMenuData.length > 0) {
          setSelectedSubMenu(subMenuData[0].id);
          
          // Appel au deuxième endpoint pour chaque sous-menu
          const menuDetailsUrl = `${API_BASE_URL}/get-menu-by-resto?resto_id=${restaurant.id}&sub_menu_id=${subMenuData[0].id}`;
          console.log("URL menu details:", menuDetailsUrl);
          
          const menuResponse = await fetch(menuDetailsUrl);
          const menuDetails = await menuResponse.json();
          console.log("Détails du menu reçus:", menuDetails);
          
          setMenuData(prevData => ({
            ...prevData,
            [subMenuData[0].id]: menuDetails
          }));
        }
      } else {
        throw new Error('Format de données submenu-list incorrect');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurant.id]);

  const handleSubMenuSelect = async (subMenuId) => {
    try {
      setSelectedSubMenu(subMenuId);
      
      if (!menuData[subMenuId]) {
        const menuDetailsUrl = `${API_BASE_URL}/get-menu-by-resto?resto_id=${restaurant.id}&sub_menu_id=${subMenuId}`;
        const response = await fetch(menuDetailsUrl);
        const menuDetails = await response.json();
        
        setMenuData(prevData => ({
          ...prevData,
          [subMenuId]: menuDetails
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du menu:', error);
    }
  };

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
            selectedSubMenu === subMenu.id && styles.activeSubMenuTab
          ]}
          onPress={() => handleSubMenuSelect(subMenu.id)}
        >
          <Text
            style={[
              styles.subMenuTabText,
              selectedSubMenu === subMenu.id && styles.activeSubMenuTabText
            ]}
          >
            {subMenu.libelle}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderProducts = () => {
    if (!selectedSubMenu || !menuData[selectedSubMenu]) return null;

    const products = menuData[selectedSubMenu];
    return (
      <View style={styles.productsContainer}>
        {products.map(product => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => {
              setSelectedProduct(product);
              setModalVisible(true);
            }}
          >
            <Image
              source={
                product.cover
                  ? {
                      uri: `${BASE_URL}/public/storage/${product.cover}`,
                      headers: {
                        'Accept': 'image/*',
                        'Cache-Control': 'no-cache'
                      }
                    }
                  : require('../../assets/images/2.jpg')
              }
              style={styles.productImage}
              defaultSource={require('../../assets/images/2.jpg')}
            />
            <View style={styles.productContent}>
              <View>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.libelle}
                </Text>
                <Text style={styles.productDescription} numberOfLines={2}>
                  {product.description || "Aucune description"}
                </Text>
              </View>
              <View style={styles.productFooter}>
                <Text style={styles.productPrice}>
                  {product.prix} FCFA
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedProduct(product);
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Image 
        source={
          restaurant.cover 
            ? { 
                uri: constructImageUrl(restaurant.cover),
                headers: {
                  'Accept': 'image/*',
                  'Cache-Control': 'no-cache'
                }
              }
            : require('../../assets/images/2.jpg')
        } 
        style={styles.coverImage}
        defaultSource={require('../../assets/images/2.jpg')}
        onError={(e) => {
          console.log("Erreur de chargement de l'image du restaurant:", e.nativeEvent.error);
          console.log("URL de l'image du restaurant:", constructImageUrl(restaurant.cover));
        }}
      />
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
          <Text style={styles.deliveryTime}>{restaurant.deliveryTime} min</Text>
        </View>
      </View>
      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.address}>{restaurant.address}</Text>
      </View>
      <View style={styles.contactContainer}>
        <Ionicons name="call-outline" size={16} color="#666" />
        <Text style={styles.contactText}>{restaurant.phone}</Text>
      </View>
      {restaurant.website && (
        <View style={styles.websiteContainer}>
          <Ionicons name="globe-outline" size={16} color="#666" />
          <Text style={styles.websiteText}>{restaurant.website}</Text>
        </View>
      )}
    </View>
  );

  const handleAddToCart = (product) => {
    try {
      console.log('Produit à ajouter avec compléments:', product);
      
      const basePrice = typeof product.price === 'string' 
        ? parseFloat(product.price.replace(/[^\d.-]/g, ''))
        : product.price || 0;

      const complementsTotal = product.complements?.reduce((sum, complement) => 
        sum + (parseFloat(complement.price) || 0), 0) || 0;
        
      const productToAdd = {
        id: product.id,
        name: product.name,
        basePrice: basePrice,
        price: basePrice,
        image: product.image,
        quantity: product.quantity || 1,
        complements: product.complements || [],
        restaurant: restaurant.name,
        totalPrice: (basePrice * (product.quantity || 1)) + complementsTotal,
      };

      console.log('Produit formaté pour le panier:', productToAdd);
      
      addToCart(productToAdd);
      setModalVisible(false);
      Alert.alert('Succès', 'Produit ajouté au panier !');
    } catch (error) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit au panier');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {renderHeader()}
        {renderInfo()}
        {renderSubMenuTabs()}
        {renderProducts()}
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
    backgroundColor: '#f5f5f5',
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
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  contactText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  websiteText: {
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
    backgroundColor: '#f5f5f5',
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
  complementsInfo: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: '#51A905',
    marginTop: 4,
  },
  loader: {
    marginTop: 20,
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
});

export default RestaurantDetails; 