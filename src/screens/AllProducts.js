import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '../components/CachedImage';
import { Ionicons } from "@expo/vector-icons";
import ProductModal from '../components/ProductModal';
import CustomHeader from '../components/common/CustomHeader';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoritesContext';
import { translations } from '../translations';


const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const AllProducts = ({ navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const { isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleAddToCart = (product) => {
    console.log('Produit ajouté au panier:', product);
  };

  const handleToggleFavorite = (product) => {
    toggleFavorite(product);
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

  const fetchProducts = async () => {
    try {
      console.log("Début du chargement des produits...");
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
      console.log("Données brutes reçues:", data);

      if (!Array.isArray(data)) {
        console.error("Format de données invalide:", data);
        throw new Error(t.products.invalidData);
      }

      const mappedProducts = data.map(product => {
        const isValidImage = product.image_url && 
          typeof product.image_url === 'string' && 
          product.image_url.startsWith('products/') && 
          product.image_url !== 'image_url' && 
          product.image_url !== 'test.jpg';

        const imageUrl = isValidImage
          ? `https://www.mayombe-app.com/uploads_admin/${product.image_url}`
          : null;

        console.log('[DEBUG IMAGE PRODUIT]', {
          name: product.name,
          image_url: product.image_url,
          isValidImage,
          imageUrl
        });

        return {
          id: product.id,
          name: product.name || product.libelle || "",
          price: product.price || "",
          description: product.description || "",
          imageUrl: imageUrl,
          hasValidImage: isValidImage,
          image: isValidImage 
            ? { uri: imageUrl }
            : require('../../assets/images/3.jpg'),
          rating: product.rating || 4.5,
          numberOfRatings: product.reviews_count || Math.floor(Math.random() * 50) + 10,
          inStock: product.status === 1,
          isNew: product.is_new || false,
          discount: product.discount || null,
          oldPrice: product.old_price || null
        };
      });

      console.log(`${mappedProducts.length} produits chargés avec leurs images`);
      setProducts(mappedProducts);
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error);
      setError(t.products.loadError);
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleProductPress(item)}
    >
      <CachedImage 
        source={item.hasValidImage ? { uri: item.imageUrl } : require('../../assets/images/place.png')}
        style={styles.productImage}
        defaultSource={require('../../assets/images/place.png')}
      />
      {item.discount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            -{item.discount}%
          </Text>
        </View>
      )}
      {item.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newText}>{t.products.new}</Text>
        </View>
      )}
      
      {/* Bouton favoris */}
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => handleToggleFavorite(item)}
      >
        <Ionicons
          name={isFavorite(item.id) ? "heart" : "heart-outline"}
          size={20}
          color={isFavorite(item.id) ? "#4CAF50" : "#FFF"}
        />
      </TouchableOpacity>

      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>{`${item.price} ${t.products.currency}`}</Text>
          {item.oldPrice && (
            <Text style={styles.oldPrice}>{`${item.oldPrice} ${t.products.currency}`}</Text>
          )}
        </View>

        {item.ingredients && item.ingredients.length > 0 && (
          <Text style={styles.ingredients} numberOfLines={1}>
            {item.ingredients.join(', ')}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.addButton,
          !item.inStock && styles.addButtonDisabled
        ]}
        onPress={() => handleProductPress(item)}
        disabled={!item.inStock}
      >
        <Ionicons name="add" size={20} color="#FFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>{t.products.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryButtonText}>{t.home.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader
        title={t.products.allProducts}
        showBack={true}
        backgroundColor="#FF9800"
        textColor="#FFF"
      />
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.productGrid}
        removeClippedSubviews={true}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={11}
        ListFooterComponent={<View style={{ height: Platform.OS === 'android' ? 80 : 30 }} />}
      />
      <ProductModal
        visible={modalVisible}
        product={selectedProduct}
        onClose={() => setModalVisible(false)}
        onAddToCart={handleAddToCart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  productGrid: {
    padding: 10,
    paddingBottom: Platform.OS === 'android' ? 70 : 20,
  },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxWidth: '48%',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold',
  },
  productPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 16,
    zIndex: 1,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  addButton: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: '#FF9800',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#FF9800',
  },
  favoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFF',
  },
  ingredients: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oldPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    fontFamily: 'Montserrat-Regular',
  },

  newBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 16,
    zIndex: 1,
  },
  newText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});

export default AllProducts; 