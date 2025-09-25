import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Dimensions, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import ProductModal from '../components/ProductModal';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;

const FavoritesScreen = ({ navigation }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('products'); // 'products' ou 'restaurants'
  const { 
    productFavorites, 
    restaurantFavorites, 
    removeProductFromFavorites, 
    removeRestaurantFromFavorites 
  } = useFavorites();
  const { addToCart } = useCart();

  const handleRemoveProductFavorite = async (productId) => {
    await removeProductFromFavorites(productId);
  };

  const handleRemoveRestaurantFavorite = async (restaurantId) => {
    await removeRestaurantFromFavorites(restaurantId);
  };

  const handleAddToCart = async (product) => {
    const success = await addToCart(product);
    if (success) {
      // Montrer une notification de succès
    }
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        setSelectedProduct(item);
        setModalVisible(true);
      }}
    >
      <Image source={item.image} style={styles.image} />
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => handleRemoveProductFavorite(item.id)}
          >
            <Ionicons name="heart" size={20} color="#FF0000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>{item.price}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => handleAddToCart(item)}
          >
            <Ionicons name="add-circle" size={24} color="#51A905" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRestaurantItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        // Navigation vers les détails du restaurant
        navigation.navigate('RestaurantDetails', { restaurant: item });
      }}
    >
      <Image source={item.image} style={styles.image} />
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => handleRemoveRestaurantFavorite(item.id)}
          >
            <Ionicons name="heart" size={20} color="#FF0000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.address || 'Adresse non disponible'}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>
            {item.deliveryTime || '20-30'} min
          </Text>
          <View style={styles.restaurantInfo}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.restaurantLocation}>
              {item.ville || 'Ville'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header moderne avec gradient */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <View style={styles.backButtonContainer}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Mes Favoris</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'products' 
                ? `${productFavorites.length} ${productFavorites.length > 1 ? 'produits' : 'produit'} en favori`
                : `${restaurantFavorites.length} ${restaurantFavorites.length > 1 ? 'restaurants' : 'restaurant'} en favori`
              }
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="heart" size={24} color="#FFF" />
          </View>
        </View>
        
        {/* Tabulation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons 
              name="fast-food-outline" 
              size={20} 
              color={activeTab === 'products' ? '#FF9800' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
              Produits ({productFavorites.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'restaurants' && styles.activeTab]}
            onPress={() => setActiveTab('restaurants')}
          >
            <Ionicons 
              name="restaurant-outline" 
              size={20} 
              color={activeTab === 'restaurants' ? '#FF9800' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'restaurants' && styles.activeTabText]}>
              Restaurants ({restaurantFavorites.length})
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Contenu selon l'onglet actif */}
        {activeTab === 'products' ? (
          productFavorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="fast-food-outline" size={64} color="#51A905" />
              <Text style={styles.emptyText}>Aucun produit en favori</Text>
            </View>
          ) : (
            <FlatList
              data={productFavorites}
              renderItem={renderProductItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          restaurantFavorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#51A905" />
              <Text style={styles.emptyText}>Aucun restaurant en favori</Text>
            </View>
          ) : (
            <FlatList
              data={restaurantFavorites}
              renderItem={renderRestaurantItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
        
        <ProductModal
          visible={modalVisible}
          product={selectedProduct}
          onClose={() => setModalVisible(false)}
          onAddToCart={handleAddToCart}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? (isSmallScreen ? 45 : 50) : (isSmallScreen ? 25 : 30),
    backgroundColor: '#FF9800',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minHeight: isSmallScreen ? 90 : 100,
  },
  backButton: {
    padding: 8,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    color: '#FFF',
    marginBottom: 2,
    marginTop: 18,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#FFF',
    opacity: 0.9,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: isSmallScreen ? 12 : 15,
    paddingTop: isSmallScreen ? 20 : 25,
    paddingBottom: isSmallScreen ? 25 : 30,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: isSmallScreen ? 12 : 16,
    marginHorizontal: 2,
    padding: isSmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: isSmallScreen ? 80 : 90,
    height: isSmallScreen ? 80 : 90,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: isSmallScreen ? 12 : 16,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    color: '#333',
    fontFamily: "Montserrat-Bold",
    flex: 1,
    marginRight: 10,
  },
  favoriteButton: {
    padding: 4,
  },
  productDescription: {
    fontSize: 13,
    color: '#666',
    fontFamily: "Montserrat",
    marginVertical: 4,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 16,
    color: '#51A905',
    fontFamily: "Montserrat-Bold",
  },
  addButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
    paddingBottom: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontFamily: "Montserrat",
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFF5E6',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontFamily: 'Montserrat',
  },
  activeTabText: {
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  restaurantLocation: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Montserrat',
  },
});

export default FavoritesScreen;