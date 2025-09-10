import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [productFavorites, setProductFavorites] = useState([]);
  const [restaurantFavorites, setRestaurantFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les favoris depuis AsyncStorage au démarrage
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const storedProductFavorites = await AsyncStorage.getItem('productFavorites');
      const storedRestaurantFavorites = await AsyncStorage.getItem('restaurantFavorites');
      
      if (storedProductFavorites) {
        setProductFavorites(JSON.parse(storedProductFavorites));
      }
      if (storedRestaurantFavorites) {
        setRestaurantFavorites(JSON.parse(storedRestaurantFavorites));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProductFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem('productFavorites', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris produits:', error);
    }
  };

  const saveRestaurantFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem('restaurantFavorites', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris restaurants:', error);
    }
  };

  const addProductToFavorites = async (product) => {
    try {
      const isAlreadyFavorite = productFavorites.some(fav => fav.id === product.id);
      
      if (!isAlreadyFavorite) {
        const newFavorites = [...productFavorites, product];
        setProductFavorites(newFavorites);
        await saveProductFavorites(newFavorites);
        console.log('Produit ajouté aux favoris:', product.name);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du produit aux favoris:', error);
      return false;
    }
  };

  const addRestaurantToFavorites = async (restaurant) => {
    try {
      const isAlreadyFavorite = restaurantFavorites.some(fav => fav.id === restaurant.id);
      
      if (!isAlreadyFavorite) {
        const newFavorites = [...restaurantFavorites, restaurant];
        setRestaurantFavorites(newFavorites);
        await saveRestaurantFavorites(newFavorites);
        console.log('Restaurant ajouté aux favoris:', restaurant.name);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du restaurant aux favoris:', error);
      return false;
    }
  };

  const removeProductFromFavorites = async (productId) => {
    try {
      const newFavorites = productFavorites.filter(fav => fav.id !== productId);
      setProductFavorites(newFavorites);
      await saveProductFavorites(newFavorites);
      console.log('Produit retiré des favoris:', productId);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du produit des favoris:', error);
      return false;
    }
  };

  const removeRestaurantFromFavorites = async (restaurantId) => {
    try {
      const newFavorites = restaurantFavorites.filter(fav => fav.id !== restaurantId);
      setRestaurantFavorites(newFavorites);
      await saveRestaurantFavorites(newFavorites);
      console.log('Restaurant retiré des favoris:', restaurantId);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du restaurant des favoris:', error);
      return false;
    }
  };

  const toggleProductFavorite = async (product) => {
    const isFavorite = productFavorites.some(fav => fav.id === product.id);
    
    if (isFavorite) {
      return await removeProductFromFavorites(product.id);
    } else {
      return await addProductToFavorites(product);
    }
  };

  const toggleRestaurantFavorite = async (restaurant) => {
    const isFavorite = restaurantFavorites.some(fav => fav.id === restaurant.id);
    
    if (isFavorite) {
      return await removeRestaurantFromFavorites(restaurant.id);
    } else {
      return await addRestaurantToFavorites(restaurant);
    }
  };

  const isProductFavorite = (productId) => {
    return productFavorites.some(fav => fav.id === productId);
  };

  const isRestaurantFavorite = (restaurantId) => {
    return restaurantFavorites.some(fav => fav.id === restaurantId);
  };

  const clearAllFavorites = async () => {
    try {
      setProductFavorites([]);
      setRestaurantFavorites([]);
      await AsyncStorage.removeItem('productFavorites');
      await AsyncStorage.removeItem('restaurantFavorites');
      console.log('Tous les favoris ont été supprimés');
    } catch (error) {
      console.error('Erreur lors de la suppression de tous les favoris:', error);
    }
  };

  const value = {
    // État
    productFavorites,
    restaurantFavorites,
    loading,
    
    // Fonctions pour produits
    addProductToFavorites,
    removeProductFromFavorites,
    toggleProductFavorite,
    isProductFavorite,
    
    // Fonctions pour restaurants
    addRestaurantToFavorites,
    removeRestaurantFromFavorites,
    toggleRestaurantFavorite,
    isRestaurantFavorite,
    
    // Fonctions générales
    clearAllFavorites,
    
    // Compteurs
    productFavoritesCount: productFavorites.length,
    restaurantFavoritesCount: restaurantFavorites.length,
    totalFavoritesCount: productFavorites.length + restaurantFavorites.length,
    
    // Compatibilité avec l'ancien système (pour transition)
    favorites: productFavorites,
    addToFavorites: addProductToFavorites,
    removeFromFavorites: removeProductFromFavorites,
    toggleFavorite: toggleProductFavorite,
    isFavorite: isProductFavorite,
    favoritesCount: productFavorites.length,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesContext;
