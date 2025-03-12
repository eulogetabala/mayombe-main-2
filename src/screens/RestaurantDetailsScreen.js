import React, { useState, useEffect } from 'react';
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

const RestaurantDetails = ({ route, navigation }) => {
  const { restaurant, subMenus: initialSubMenus, initialMenus } = route.params;
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

  const fetchMenusByResto = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      const url = `${API_BASE_URL}/get-menu-by-resto?jour=${formattedDate}&sub_menu_id=${selectedSubMenu.id}`;
      console.log('Appel API Menu URL:', url);

      const response = await fetch(url, {
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
      console.log('Menus reçus:', data);

      if (Array.isArray(data)) {
        const mappedProducts = data.map(menu => ({
          id: menu.id,
          name: menu.name || menu.libelle || "Sans nom",
          description: menu.description || "Aucune description",
          price: menu.prix || menu.price || "0",
          image: menu.image_url ? { uri: menu.image_url } : require('../../assets/images/2.jpg'),
          category: menu.category || menu.categorie,
          sub_menu_id: menu.sub_menu_id,
          restaurant_id: menu.restaurant_id,
          status: menu.status,
          created_at: menu.created_at,
          updated_at: menu.updated_at
        }));

        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des menus:', error);
      setError('Impossible de charger les menus');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.deliveryTime}>{restaurant.deliveryTime} min</Text>
        </View>
      </View>
      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.address}>{restaurant.address}</Text>
      </View>
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

  const handleAddToCart = (product) => {
    try {
      console.log('Produit à ajouter avec compléments:', product);
      
      // S'assurer que le prix est un nombre
      const basePrice = typeof product.price === 'string' 
        ? parseFloat(product.price.replace(/[^\d.-]/g, ''))
        : product.price || 0;

      const complementsTotal = product.complements?.reduce((sum, complement) => 
        sum + (complement.price || 0), 0) || 0;
        
      const productToAdd = {
        id: product.id,
        name: product.name,
        basePrice: basePrice,
        price: basePrice, // Stocker le prix comme un nombre
        image: product.image,
        quantity: product.quantity || 1,
        complements: product.complements || [],
        restaurant: restaurant.name,
        totalPrice: basePrice * (product.quantity || 1) + complementsTotal,
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