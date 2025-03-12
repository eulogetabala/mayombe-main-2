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
import { translations } from '../../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

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
  const t = translations[currentLanguage];
  const [imageErrorTimestamps, setImageErrorTimestamps] = useState({});

  useEffect(() => {
    if (refresh?.refreshTimestamp) {
      fetchProducts();
    }
  }, [refresh?.refreshTimestamp]);

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
      const response = await fetch(`${API_BASE_URL}/products-list`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        const mappedProducts = data.map((product) => {
          const hasValidImage = product.image_url && 
            product.image_url.startsWith('products/');

          const imageUrl = hasValidImage
            ? `https://www.api-mayombe.mayombe-app.com/public/storage/${product.image_url}`
            : null;

          console.log("URL construite pour", product.name, ":", imageUrl);

          return {
            id: product.id,
            name: product.name || product.libelle || t.products.noName,
            price: product.price ? `${product.price} ${t.products.currency}` : t.products.priceNotAvailable,
            description: product.desc || t.products.noDescription,
            ingredients: product.ingredients?.map(ing => normalizeAndTranslateIngredient(ing)) || [],
            imageUrl: imageUrl,
            hasValidImage: hasValidImage,
            discount: product.discount || null,
            oldPrice: product.old_price,
            isNew: product.is_new,
            inStock: product.in_stock,
            rating: product.rating,
            numberOfRatings: product.number_of_ratings,
          };
        });

        console.log("\n=== Résumé ===");
        console.log("Nombre de produits mappés:", mappedProducts.length);
        console.log("Produits avec images valides:", 
          mappedProducts.filter(p => p.hasValidImage).length);

        setProducts(mappedProducts);
      } else {
        throw new Error(t.products.invalidData);
      }
    } catch (error) {
      console.error("\n=== ERREUR ===");
      console.error("Type d'erreur:", error.name);
      console.error("Message d'erreur:", error.message);
      console.error("Stack trace:", error.stack);
      setError(t.products.loadError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text>{t.products.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryText}>{t.products.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {products.map((product) => {
            const imageUri = product.imageUrl + (product.id in imageErrorTimestamps ? `?t=${imageErrorTimestamps[product.id]}` : '');

            return (
              <TouchableOpacity
                key={product.id}
                style={styles.card}
                onPress={() => handleProductPress(product)}
              >
                {product.hasValidImage ? (
                  <Image 
                    source={{ uri: imageUri }}
                    style={styles.productImage}
                    defaultSource={require('../../../assets/images/3.jpg')}
                    onError={(e) => {
                      // console.log(`Erreur de chargement pour ${product.name}:`, e.nativeEvent.error);
                      setImageErrorTimestamps(prev => ({
                        ...prev,
                        [product.id]: new Date().getTime()
                      }));
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <Image 
                    source={require('../../../assets/images/3.jpg')}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                )}
                {product.discount && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {t.products.discountPercent.replace('{percent}', product.discount)}
                    </Text>
                  </View>
                )}
                {product.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newText}>{t.products.new}</Text>
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.productPrice}>
                      {`${product.price} ${t.products.currency}`}
                    </Text>
                    {product.oldPrice && (
                      <Text style={styles.oldPrice}>
                        {`${product.oldPrice} ${t.products.currency}`}
                      </Text>
                    )}
                  </View>
                  {product.rating && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {product.rating} ({product.numberOfRatings})
                      </Text>
                    </View>
                  )}
                  {product.ingredients && product.ingredients.length > 0 && (
                    <Text style={styles.ingredients} numberOfLines={1}>
                      {product.ingredients.join(', ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    !product.inStock && styles.addButtonDisabled
                  ]}
                  onPress={() => handleProductPress(product)}
                  disabled={!product.inStock}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
    marginTop: 30,
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
  },
  productName: { 
    fontSize: 16,
    fontWeight: "bold",
    color: '#333',
    marginBottom: 6,
    fontFamily: "Montserrat-Bold",
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productPrice: { 
    fontSize: 16,
    color: '#51A905',
    fontWeight: 'bold',
    fontFamily: "Montserrat-Bold",
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
    right: 8,
    bottom: 8,
    backgroundColor: '#51A905',
    width: 36,
    height: 36,
    borderRadius: 18,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    fontFamily: "Montserrat-Regular",
  },
});

export default ProductSection;
