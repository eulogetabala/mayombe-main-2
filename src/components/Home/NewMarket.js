import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import ProductModal from '../ProductModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const NouveauxProduits = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const { addToCart } = useCart();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  // Images statiques alternées
  const staticImages = [
    require('../../../assets/images/2.jpg'),
    require('../../../assets/images/3.jpg'),
  ];

  useEffect(() => {
    fetchProducts();
    loadFavorites();
  }, []);

  // Ajouter l'effet pour l'autoslide
  useEffect(() => {
    if (products.length > 0) {
      const slideTimer = setInterval(() => {
        try {
          if (currentIndex < products.length - 1) {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({
                index: currentIndex + 1,
                animated: true
              });
            }
            setCurrentIndex(currentIndex + 1);
          } else {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({
                index: 0,
                animated: true
              });
            }
            setCurrentIndex(0);
          }
        } catch (error) {
          console.log('Erreur scrollToIndex NewMarket:', error);
          // En cas d'erreur, on peut essayer de scroll vers le début
          if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
          }
        }
      }, 3000); // Change de slide toutes les 3 secondes

      return () => clearInterval(slideTimer);
    }
  }, [currentIndex, products]);

  // Ajouter la gestion du scroll
  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (screenWidth * 0.45));
    setCurrentIndex(index);
  };

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favorites');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  };

  const toggleFavorite = async (product) => {
    try {
      let newFavorites = [...favorites];
      const index = newFavorites.findIndex(fav => fav.id === product.id);

      if (index >= 0) {
        newFavorites = newFavorites.filter(fav => fav.id !== product.id);
      } else {
        newFavorites.push(product);
      }

      setFavorites(newFavorites);
      await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
      console.log('Favoris sauvegardés:', newFavorites);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris:', error);
    }
  };

  const isFavorite = (productId) => {
    return favorites.some(fav => fav.id === productId);
  };

  // Fonction pour vérifier si un produit est récent (1-3 jours)
  const isRecentProduct = (createdAt) => {
    if (!createdAt) return false;
    
    const productDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - productDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Retourne true si le produit a entre 1 et 3 jours
    return diffDays >= 1 && diffDays <= 5;
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products-list`);
      const data = await response.json();
      console.log('Données reçues:', data);

      if (response.ok && Array.isArray(data)) {
        const mappedProducts = data.map((product, index) => {
          // Vérifier si l'image est valide
          const isValidImage = product.image_url && 
            typeof product.image_url === 'string' && 
            product.image_url.startsWith('products/') && 
            product.image_url !== 'image_url' && 
            product.image_url !== 'test.jpg';

          const imageUrl = isValidImage
            ? `https://www.mayombe-app.com/uploads_admin/${product.image_url}`
            : null;

          return {
            id: product.id.toString(),
            name: product.name || product.libelle || "Produit sans nom",
            description: product.desc || product.description || "Description non disponible",
            price: `${product.price || 0} FCFA`,
            image: isValidImage 
              ? { uri: imageUrl }
              : staticImages[index % staticImages.length],
            created_at: product.created_at,
          };
        });

        // Filtrer seulement les produits récents (1-3 jours)
        const recentProducts = mappedProducts.filter(product => 
          isRecentProduct(product.created_at)
        );

        console.log('Produits récents (1-3 jours):', recentProducts);
        setProducts(recentProducts);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError(t.home.newMarket.error);
    } finally {
      setLoading(false);
    }
  };

  const screenWidth = Dimensions.get('window').width;

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleAddToCart = async (product) => {
    const success = await addToCart(product);
    if (success) {
      setModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text>{t.home.newMarket.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t.home.newMarket.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryText}>{t.home.newMarket.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={[styles.card, { width: screenWidth * 0.45 }]}>
      <TouchableOpacity onPress={() => handleProductPress(item)}>
        <Image source={item.image} style={styles.image} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.favoriteButton}
        onPress={() => toggleFavorite(item)}
      >
        <Ionicons 
          name={isFavorite(item.id) ? "heart" : "heart-outline"} 
          size={24} 
          color={isFavorite(item.id) ? "#FF0000" : "#666"} 
        />
      </TouchableOpacity>

      <View style={styles.cardContent}>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{item.price}</Text>
        </View>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={() => handleProductPress(item)}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Nouveaux produits</Text>
        <Text style={styles.sectionSubtitle}>
          Découvrez les produits ajoutés ces derniers jours
        </Text>
      </View>

      <View>
        <FlatList
          ref={flatListRef}
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          onScroll={handleScroll}
          snapToInterval={screenWidth * 0.45 + 20} // Largeur de la carte + marges
          decelerationRate="fast"
          getItemLayout={(data, index) => ({
            length: screenWidth * 0.45 + 20,
            offset: (screenWidth * 0.45 + 20) * index,
            index,
          })}
        />

        {/* Indicateurs de pagination */}
        <View style={styles.paginationContainer}>
          {products.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive
              ]}
            />
          ))}
        </View>
      </View>

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
    backgroundColor: '#f8f8f8',
    paddingVertical: 20,
  },
  header: {
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#333',
    fontFamily: "Montserrat-Bold",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    fontFamily: "Montserrat-Regular",
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10, // Ajouter un padding en bas pour les indicateurs
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  cardContent: {
    padding: 10,
    alignItems: 'center',
  },
  priceBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 5,
    position: 'absolute',
    top: -20,
    right: 25,
    zIndex: 1,
    fontFamily: "Montserrat-Bold",
  },
  priceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: "Montserrat-Bold",
  },
  productName: {
   
    fontSize: 14,
    color: '#333',
    marginVertical: 5,
    fontFamily: "Montserrat-Bold",
  },
  productDescription: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    fontFamily: "Montserrat-Regular",
  },
  addToCartButton: {
    backgroundColor: '#FF9800',
    borderRadius: 50,
    padding: 10,
    marginTop: 10,
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
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 20,
    fontFamily: "Montserrat-Bold",
  },
  retryButton: {
    backgroundColor: '#FF9800',
    borderRadius: 50,
    padding: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: "Montserrat-Bold",
  },
  retryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: "Montserrat-Bold",
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
    zIndex: 1,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FF9800',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default NouveauxProduits;
