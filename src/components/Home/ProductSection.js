import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductModal from '../ProductModal';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../../context/CartContext';
import { useRefresh } from '../../context/RefreshContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { translations } from '../../translations';
import { withRefreshAndLoading } from '../common/withRefreshAndLoading';
import { applyMarkup, formatPriceWithMarkup } from '../../Utils/priceUtils';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const STORAGE_URL = "https://www.api-mayombe.mayombe-app.com/storage";

const ProductSectionContent = ({ 
  products, 
  handleProductPress, 
  handleAddToCart,
  handleToggleFavorite,
  checkIsFavorite,
  navigation,
  t
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.products.popular}</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AllProducts')}
          style={styles.viewAllContainer}
        >
          <Text style={styles.viewAllText}>{t.home.seeAll}</Text>
          <Ionicons name="chevron-forward" size={15} color="#EB9A07" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleProductPress(item)}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={item.hasValidImage ? { uri: item.imageUrl } : require('../../../assets/images/2.jpg')}
                style={styles.productImage}
              />
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => handleToggleFavorite(item)}
              >
                <Ionicons 
                  name={checkIsFavorite(item.id) ? "heart" : "heart-outline"} 
                  size={20} 
                  color={checkIsFavorite(item.id) ? "#4CAF50" : "#FFF"} 
                />
              </TouchableOpacity>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.productPrice}>{item.price}</Text>
                <Text style={styles.uniteText}>{item.unite}</Text>
              </View>
              {item.discount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{item.discount}%</Text>
                </View>
              )}
              {item.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newText}>{t.products.new}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.addButton, !item.inStock && styles.addButtonDisabled]}
                onPress={() => handleAddToCart(item)}
                disabled={!item.inStock}
              >
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const ProductSection = ({ listMode = "vertical" }) => {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { addToCart } = useCart();
  const refresh = useRefresh();
  const { currentLanguage } = useLanguage();
  const { toggleFavorite, isFavorite, favorites } = useFavorites();
  const t = translations[currentLanguage];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (refresh?.refreshTimestamp) {
      fetchProducts();
    }
  }, [refresh?.refreshTimestamp]);

  // Forcer le re-render quand les favoris changent
  useEffect(() => {
    // Le composant se re-render automatiquement quand favorites change
  }, [favorites]);

  const handleImageLoad = (productId) => {
    setProducts(currentProducts =>
      currentProducts.map(product =>
        product.id === productId
          ? { ...product, isLoading: false }
          : product
      )
    );
  };

  const handleImageError = (productId) => {
    setProducts(currentProducts => 
      currentProducts.map(product => 
        product.id === productId
          ? {
              ...product,
              hasValidImage: false,
              isLoading: false,
              imageUrl: null // Réinitialiser l'URL en cas d'erreur
            }
          : product
      )
    );
  };

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleAddToCart = async (product) => {
    const success = await addToCart(product);
    if (success) {
      // Montrer une notification de succès
    }
  };

  const handleToggleFavorite = async (product) => {
    await toggleFavorite(product);
  };

  const checkIsFavorite = (productId) => {
    if (!isFavorite || !favorites) return false;
    return isFavorite(productId);
  };

  const normalizeAndTranslateIngredient = (ingredientName) => {
    const normalized = ingredientName?.toLowerCase()
      .replace(/[éèêë]/g, 'e')
      .replace(/[àâä]/g, 'a')
      .replace(/[ïî]/g, 'i')
      .replace(/[ôö]/g, 'o')
      .replace(/[ûüù]/g, 'u')
      .replace(/[^a-z]/g, '');
    return t.ingredients[normalized] || ingredientName;
  };

  const validateImageUrl = (url) => {
    if (!url) {
      return false;
    }
    
    // Vérifie si l'URL commence par 'products/' ou est une URL complète
    const isValidPath = url.startsWith('products/');
    const isValidUrl = url.startsWith('http://') || url.startsWith('https://');
    
    if (!isValidPath && !isValidUrl) {
      return false;
    }
    
    return true;
  };

  const constructImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    try {
      // Si c'est déjà une URL complète
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      // Si c'est un chemin relatif
      if (imageUrl.startsWith('products/')) {
        // Enlever 'products/' du début si présent
        const cleanPath = imageUrl.replace(/^products\//, '');
        const url = `${STORAGE_URL}/products/${cleanPath}`;
        return url;
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products-list`, {
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

      if (!Array.isArray(data)) {
        console.error("Format de données invalide:", data);
        throw new Error(t.products.invalidData);
      }

      const mappedProducts = data.map(product => {
        const isValidImage = product.image_url && typeof product.image_url === 'string' && product.image_url.startsWith('products/') && product.image_url !== 'image_url' && product.image_url !== 'test.jpg';
        const imageUrl = isValidImage
          ? `https://www.mayombe-app.com/uploads_admin/${product.image_url}`
          : null;
        const defaultImage = require('../../../assets/images/2.jpg');
        const basePrice = product.price || 0;
        const priceWithMarkup = basePrice ? formatPriceWithMarkup(basePrice) : t.products.priceNotAvailable;
        
        return {
          id: product.id,
          name: product.name || product.libelle || t.products.noName,
          price: priceWithMarkup,
          rawPrice: basePrice, // Conserver le prix original
          unite: product.unite || "",
          description: product.desc || t.products.noDescription,
          ingredients: product.ingredients?.map(ing => normalizeAndTranslateIngredient(ing)) || [],
          imageUrl: imageUrl,
          hasValidImage: isValidImage,
          image: isValidImage 
            ? { uri: imageUrl }
            : defaultImage,
          discount: product.discount || null,
          oldPrice: product.old_price,
          isNew: product.is_new,
          inStock: product.status === 1,
          rating: product.rating,
          numberOfRatings: product.number_of_ratings,
        };
      });

      setProducts(mappedProducts);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error);
      setError(t.products.loadError);
      setLoading(false);
    }
  };

  return (
    <>
      <ProductSectionContent
        products={products}
        handleProductPress={handleProductPress}
        handleAddToCart={handleAddToCart}
        handleToggleFavorite={handleToggleFavorite}
        checkIsFavorite={checkIsFavorite}
        navigation={navigation}
        t={t}
      />
      <ProductModal
        visible={modalVisible}
        product={selectedProduct}
        onClose={() => setModalVisible(false)}
        onAddToCart={handleAddToCart}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { 
    marginTop: 10,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    color: "#333",
   fontFamily: "Montserrat-Bold",
  },
  card: {
    width: 200,
    backgroundColor: '#fff',
    marginHorizontal: 8,
    borderRadius: 16,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  productImage: { 
    width: '100%', 
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 8,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginTop: -20,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingRight: 44,
  },
  productName: { 
    fontSize: 14,
    fontWeight: "bold",
    color: '#333',
    marginBottom: 4,
    fontFamily: "Montserrat-Bold",
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  productPrice: { 
    fontSize: 14,
    color: '#51A905',
    fontWeight: 'bold',
    fontFamily: "Montserrat-Bold",
  },
  uniteText: {
    fontSize: 12,
    color: '#666',
    fontFamily: "Montserrat-Regular",
    marginLeft: 2,
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FF4B4B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 25,
    zIndex: 1,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
  },
  newBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#51A905",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 25,
    zIndex: 1,
  },
  newText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
  },
  addButton: {
    position: 'absolute',
    right: -18,
    bottom: 2,
    backgroundColor: '#51A905',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#51A905',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: "Montserrat",
  },
  retryButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#FFF',
    fontFamily: "Montserrat",
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 12,
    color: "#EB9A07",
    fontFamily: "Montserrat-Bold",
    marginRight: 4,
  },
  ingredients: {
    fontSize: 11,
    color: '#888',
    marginTop: 6,
    fontFamily: "Montserrat-Regular",
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  oldPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    fontFamily: "Montserrat-Regular",
    marginLeft: 8,
  },

  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default withRefreshAndLoading(ProductSection, {
  skeletonType: 'product',
  skeletonCount: 3,
  scrollEnabled: false
});
