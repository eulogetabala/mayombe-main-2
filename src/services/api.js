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

  // Connexion utilisateur
  login: async (phone, password) => {
    try {
      // Essayer le format correct du CountryPicker et quelques variantes de base
      const phoneFormats = [
        phone, // +242067101515 (format correct du CountryPicker)
        phone.replace('+', ''), // 242067101515 (sans le +)
        phone.replace('+242', ''), // 067101515 (format local)
      ];
      
      for (let i = 0; i < phoneFormats.length; i++) {
        try {
          const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: phoneFormats[i], password }),
          });
          
          const data = await response.json();
          
          // Si succès, retourner le résultat
          if (response.status === 200) {
            return { status: response.status, data };
          }
        } catch (error) {
          // Essayer le format suivant
        }
      }
      
      // Si aucun format ne fonctionne, retourner le dernier résultat
      return { status: 401, data: { erreur: "Identifiants invalides" } };
    } catch (error) {
      throw error;
    }
  },

  // Récupération de mot de passe - Demande d'OTP
  forgotPassword: async (phone, email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/mot-de-passe-oublie`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, email }),
      });
      
      const data = await response.json();
      
      return { status: response.status, data };
    } catch (error) {
      console.error('Erreur lors de la demande de récupération de mot de passe:', error);
      throw error;
    }
  },

  // Vérification OTP et modification du mot de passe
  resetPassword: async (otp, newPassword) => {
    try {
      const requestBody = { otp, new_password: newPassword };
      
      const response = await fetch(`${API_BASE_URL}/recup-de-password-oublie`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      return { status: response.status, data };
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error);
      throw error;
    }
  },

  // Gestion des erreurs
  handleError: (error) => {
    console.error('API Error:', error);
    throw error;
  }
}; 