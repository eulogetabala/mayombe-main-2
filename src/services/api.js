const API_BASE_URL = 'https://www.api-mayombe.mayombe-app.com/public/api';

export const api = {
  // Produits par catégorie
  getProductsByCategory: async (categoryId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products-by-id-category?id_category=${categoryId}`);
      return response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des produits par catégorie:', error);
      throw error;
    }
  },

  // Produits par restaurant
  getProductsByRestaurant: async (restaurantId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products-by-id-resto?id_resto=${restaurantId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      return response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des produits par restaurant:', error);
      throw error;
    }
  },

  // Restaurants par ville
  getRestaurantsByCity: async (cityId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/resto-by-id-ville?id_ville=${cityId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      return response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des restaurants par ville:', error);
      throw error;
    }
  },

  // Liste des villes
  getCities: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/villes`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      return response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des villes:', error);
      throw error;
    }
  },

  // Liste des restaurants
  getRestaurants: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resto`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      return response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des restaurants:', error);
      throw error;
    }
  },

  // Gestion des erreurs
  handleError: (error) => {
    console.error('API Error:', error);
    throw error;
  }
}; 