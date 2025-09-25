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
      console.log('Tentative de connexion API:', { phone, passwordLength: password.length });
      
      // Essayer différents formats de numéro de téléphone
      const phoneFormats = [
        phone, // +242065298498
        phone.replace('+', ''), // 242065298498
        phone.replace('+242', ''), // 065298498
        phone.replace('+242', '0'), // 0065298498
      ];
      
      for (let i = 0; i < phoneFormats.length; i++) {
        try {
          console.log(`Tentative format téléphone ${i + 1}:`, phoneFormats[i]);
          
          const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: phoneFormats[i], password }),
          });
          
          const data = await response.json();
          console.log(`Réponse API login (format ${i + 1}):`, { status: response.status, data });
          
          // Si succès, retourner le résultat
          if (response.status === 200) {
            console.log(`Format téléphone ${i + 1} fonctionne !`);
            return { status: response.status, data };
          }
        } catch (error) {
          console.log(`Format téléphone ${i + 1} échoué:`, error.message);
        }
      }
      
      // Test de diagnostic : vérifier si l'API de connexion fonctionne
      console.log('Test de diagnostic de l\'API de connexion...');
      
      // Test 1: Vérifier si l'endpoint existe
      try {
        const testResponse = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: 'test', password: 'test' }),
        });
        
        const testData = await testResponse.json();
        console.log('Test endpoint login:', { status: testResponse.status, data: testData });
      } catch (error) {
        console.log('Erreur test endpoint:', error.message);
      }
      
      // Si aucun format ne fonctionne, retourner le dernier résultat
      return { status: 401, data: { erreur: "Identifiants invalides" } };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  },

  // Récupération de mot de passe - Demande d'OTP
  forgotPassword: async (phone) => {
    try {
      console.log('Demande de récupération de mot de passe pour:', phone);
      
      const response = await fetch(`${API_BASE_URL}/mot-de-passe-oublie`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });
      
      const data = await response.json();
      console.log('Réponse API forgot password:', { status: response.status, data });
      
      return { status: response.status, data };
    } catch (error) {
      console.error('Erreur lors de la demande de récupération de mot de passe:', error);
      throw error;
    }
  },

  // Vérification OTP et modification du mot de passe
  resetPassword: async (otp, newPassword) => {
    try {
      console.log('Réinitialisation du mot de passe:', { 
        otp, 
        newPasswordLength: newPassword.length 
      });
      
      const response = await fetch(`${API_BASE_URL}/recup-de-password-oublie`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp, new_password: newPassword }),
      });
      
      const data = await response.json();
      console.log('Réponse API reset password:', { status: response.status, data });
      
      return { status: response.status, data };
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error);
      throw error;
    }
  },

  // Gestion des erreurs
  handleError: (error) => {
    console.error('API Error:', error);
    throw error;
  }
}; 