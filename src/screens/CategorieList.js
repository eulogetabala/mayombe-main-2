import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductModal from '../components/ProductModal';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const staticImages = {
    image1: require("../../assets/images/2.jpg"),
    image2: require("../../assets/images/3.jpg"),
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
      const response = await fetch(`${API_BASE_URL}/products-by-id-category?id_category=${categoryId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        const mappedProducts = data.map((product, index) => ({
          id: product.id,
          name: product.name || product.nom_produit || product.libelle || product.nom || "Nom non disponible",
          price: product.price ? `${product.price} FCFA` : "Prix non disponible",
          description: product.description || "Description non disponible",
          image: index % 2 === 0 ? staticImages.image1 : staticImages.image2,
          rawPrice: product.price || 0
        }));

        setProducts(mappedProducts);
        if (mappedProducts.length === 0) {
          setError(t.categories.noProducts);
        }
      } else {
        throw new Error("Format de données invalide");
      }
    } catch (error) {
      // console.error('Erreur lors du chargement des produits:', error);
      setError(t.categories.loadError);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (product) => {
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
      const price = parseInt(product.rawPrice);
      if (isNaN(price) || price <= 0) {
        showToast(t.categories.productNotAvailable, 'error');
        return;
      }

      const cartItems = await AsyncStorage.getItem('cartItems');
      let updatedCart = cartItems ? JSON.parse(cartItems) : [];

      const cartProduct = {
        id: product.id,
        name: product.name,
        price: price,
        image: product.image,
        quantity: 1,
        totalPrice: price
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
      showToast(t.categories.errorAddingToCart, 'error');
    }
  };

  const renderItem = ({ item, index }) => {
    if (index % 2 === 0) {
      const nextItem = products[index + 1];
      return (
        <View style={styles.row}>
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => handleProductPress(item)}
            >
              <Image
                source={item.image}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productPrice}>{item.price}</Text>
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
                <Image
                  source={nextItem.image}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {nextItem.name}
                  </Text>
                  <Text style={styles.productPrice}>{nextItem.price}</Text>
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
        <Text style={styles.errorText}>{t.categories.loadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryButtonText}>{t.home.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backText}>{t.common.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.categories[categoryName.toLowerCase()] || categoryName}
        </Text>
      </View>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginLeft: 16,
    flex: 1,
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
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
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
  retryButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

export default CategorieList;
