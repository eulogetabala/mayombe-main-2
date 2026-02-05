import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import CachedImage from '../components/CachedImage';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductModal from '../components/ProductModal';
import CustomHeader from '../components/common/CustomHeader';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { applyMarkup, formatPriceWithMarkup } from '../Utils/priceUtils';
import ApiService from '../services/apiService';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const windowWidth = Dimensions.get('window').width;
const cardWidth = (windowWidth - 30) / 2;

const CategorieList = ({ route, navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const { categoryId, categoryName } = route.params;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' ou 'error'
  const [imageErrors, setImageErrors] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const staticImages = {
    image1: require("../../assets/images/place.png"),
    image2: require("../../assets/images/place.png"),
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Tentative de chargement via ApiService pour la catégorie:', categoryId);
      const data = await ApiService.get(`/products-by-id-category?id_category=${categoryId}`);

      if (data && Array.isArray(data)) {
        console.log('Nombre de produits reçus:', data.length);
        
        if (data.length > 0) {
          console.log('Exemple de produit:', data[0]);
        }

        const mappedProducts = data.map((product, index) => {
          // Construction de l'URL de l'image
          let imageUrl = null;
          let hasValidImage = false;
          if (product.image_url && typeof product.image_url === 'string' && product.image_url.startsWith('products/')) {
            imageUrl = `https://www.mayombe-app.com/uploads_admin/${product.image_url}`;
            hasValidImage = true;
          } else if (product.image && typeof product.image === 'string' && product.image.startsWith('products/')) {
            imageUrl = `https://www.mayombe-app.com/uploads_admin/${product.image}`;
            hasValidImage = true;
          } else if (product.cover && typeof product.cover === 'string' && product.cover.startsWith('products/')) {
            imageUrl = `https://www.mayombe-app.com/uploads_admin/${product.cover}`;
            hasValidImage = true;
          }

          console.log(`🔍 Produit ${product.name}:`, {
            image_url: product.image_url,
            image: product.image,
            cover: product.cover,
            imageUrl: imageUrl,
            hasValidImage: hasValidImage
          });

          return {
            ...product,
            id: product.id || index,
            imageUrl: imageUrl,
            hasValidImage: hasValidImage,
            productKey: `${product.id || index}-${Date.now()}`,
            quantity: 1,
            unitPrice: applyMarkup(parseFloat(product.price) || 0),
            total: applyMarkup(parseFloat(product.price) || 0),
            rawPrice: product.price, // Conserver le prix original
            type: 'product'
          };
        });

        setProducts(mappedProducts);
        console.log('Produits mappés avec succès:', mappedProducts.length);
      } else {
        console.log('Aucun produit trouvé ou données invalides');
        setProducts([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setError(error.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction de rafraîchissement
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProducts();
      console.log('🔄 Liste des catégories rafraîchie');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [categoryId]);

  const handleProductPress = (product) => {
    console.log('🔍 Produit sélectionné:', product);
    console.log('🔍 Image du produit (imageUrl):', product.imageUrl);
    console.log('🔍 Image du produit (image):', product.image);
    console.log('🔍 HasValidImage:', product.hasValidImage);
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToastVisible(false));
  };

  const handleAddToCart = async (product) => {
    try {
      const basePrice = parseInt(product.rawPrice);
      if (isNaN(basePrice) || basePrice <= 0) {
        showToast(t.categories.productNotAvailable, 'error');
        return;
      }

      // Appliquer la majoration de 7%
      const price = applyMarkup(basePrice);

      const cartItems = await AsyncStorage.getItem('cartItems');
      let updatedCart = cartItems ? JSON.parse(cartItems) : [];

      // Déterminer quelle image utiliser
      let productImage = staticImages.image1; // Image par défaut
      if (product.imageUrl && !imageErrors[product.id]) {
        productImage = { uri: product.imageUrl };
      }

      const cartProduct = {
        id: product.id,
        name: product.name,
        price: price,
        image: productImage,
        quantity: 1,
        totalPrice: price,
        unite: product.unite || ''
      };

      const existingItemIndex = updatedCart.findIndex(item => item.id === product.id);

      if (existingItemIndex !== -1) {
        updatedCart[existingItemIndex].quantity += 1;
        updatedCart[existingItemIndex].totalPrice = 
          updatedCart[existingItemIndex].quantity * price;
      } else {
        updatedCart.push(cartProduct);
      }

      await AsyncStorage.setItem('cartItems', JSON.stringify(updatedCart));
      showToast(t.categories.productAddedToCart);

    } catch (error) {
      console.error('Erreur lors de l\'ajout au panier:', error);
      showToast(t.categories.errorAddingToCart, 'error');
    }
  };

  const handleImageError = (productId) => {
    setImageErrors(prev => ({
      ...prev,
      [productId]: true
    }));
  };

  const renderItem = ({ item, index }) => {
    if (index % 2 === 0) {
      const nextItem = products[index + 1];
      const hasImageError = imageErrors[item.id];
      const hasNextImageError = nextItem ? imageErrors[nextItem.id] : false;

      return (
        <View style={styles.row}>
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => handleProductPress(item)}
            >
              {item.imageUrl && !hasImageError ? (
                <CachedImage
                  source={{ uri: item.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                  onError={() => handleImageError(item.id)}
                />
              ) : (
                <CachedImage
                  source={staticImages.image1}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productPrice}>
                  {formatPriceWithMarkup(item.rawPrice || item.price || 0)}
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleProductPress(item);
                  }}
                >
                  <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
          
          {nextItem && (
            <View style={styles.cardContainer}>
              <TouchableOpacity
                style={styles.productCard}
                onPress={() => handleProductPress(nextItem)}
              >
                {nextItem.imageUrl && !hasNextImageError ? (
                  <CachedImage
                    source={{ uri: nextItem.imageUrl }}
                    style={styles.productImage}
                    resizeMode="cover"
                    onError={() => handleImageError(nextItem.id)}
                  />
                ) : (
                  <CachedImage
                    source={staticImages.image2}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {nextItem.name}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatPriceWithMarkup(nextItem.rawPrice || nextItem.price || 0)}
                  </Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleProductPress(nextItem);
                    }}
                  >
                    <Ionicons name="add" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#51A905" />
        <Text style={styles.loadingText}>{t.categories.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Oups ! Une erreur s'est produite</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubtext}>
          Catégorie: {categoryName} (ID: {categoryId})
        </Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
            <Ionicons name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backToCategoriesButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#51A905" style={{ marginRight: 8 }} />
            <Text style={styles.backToCategoriesText}>Retour aux catégories</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={60} color="#FF9800" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyText}>Aucun produit disponible pour cette catégorie</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title={t.categories[categoryName.toLowerCase()] || categoryName}
        showBack={true}
        backgroundColor="#FF9800"
        textColor="#FFF"
      />
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#51A905']}
            tintColor="#51A905"
            title="Rafraîchir..."
            titleColor="#51A905"
          />
        }
      />
      {selectedProduct && (
        <ProductModal
          visible={modalVisible}
          product={selectedProduct}
          onClose={() => setModalVisible(false)}
          onAddToCart={handleAddToCart}
        />
      )}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            styles[`toast${toastType === 'success' ? 'Success' : 'Error'}`],
            { opacity: fadeAnim }
          ]}
        >
          <Ionicons
            name={toastType === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color="#FFF"
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  listContainer: {
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardContainer: {
    width: '48%',
  },
  productCard: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    padding: 12,
    position: 'relative',
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Montserrat-SemiBold',
    color: "#333",
    marginBottom: 8,
    height: 40,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: "#FF9800",
    marginBottom: 10,
  },
  addButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#51A905',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#F5F5F5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  errorTitle: {
    color: '#FF6B6B',
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    marginBottom: 10,
  },
  errorSubtext: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
    marginBottom: 20,
  },
  errorActions: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 150,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  backToCategoriesButton: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#51A905',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 150,
  },
  backToCategoriesText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastSuccess: {
    backgroundColor: '#51A905',
  },
  toastError: {
    backgroundColor: '#FF6B6B',
  },
  toastText: {
    color: '#FFF',
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#51A905',
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  emptyText: {
    color: '#FF9800',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    marginTop: 10,
  },
});

export default CategorieList;
