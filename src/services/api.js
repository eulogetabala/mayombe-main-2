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
      
      // Essayer le format correct du CountryPicker et quelques variantes de base
      const phoneFormats = [
        phone, // +242067101515 (format correct du CountryPicker)
        phone.replace('+', ''), // 242067101515 (sans le +)
        phone.replace('+242', ''), // 067101515 (format local)
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
      console.log('🔑 Réinitialisation du mot de passe:', { 
        otp, 
        otpType: typeof otp,
        otpLength: otp ? otp.length : 0,
        newPassword, 
        newPasswordLength: newPassword.length 
      });
      
      const requestBody = { otp, new_password: newPassword };
      console.log('📤 Corps de la requête:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/recup-de-password-oublie`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      console.log('📥 Réponse API reset password:', { 
        status: response.status, 
        statusText: response.statusText,
        data 
      });
      
      return { status: response.status, data };
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error);
      throw error;
    }
  },

  // Test de diagnostic pour la connexion après réinitialisation
  testLoginAfterReset: async (phone, password) => {
    try {
      console.log('🔍 Test de diagnostic - Connexion après réinitialisation');
      console.log('📱 Téléphone (format correct):', phone);
      console.log('🔑 Mot de passe:', password);
      
      // Tester seulement le format correct (+242) et quelques variantes de base
      const phoneFormats = [
        phone, // +242067101515 (format correct du CountryPicker)
        phone.replace('+', ''), // 242067101515 (sans le +)
        phone.replace('+242', ''), // 067101515 (format local)
      ];
      
      const results = [];
      
      for (let i = 0; i < phoneFormats.length; i++) {
        try {
          console.log(`🧪 Test format téléphone ${i + 1}:`, phoneFormats[i]);
          
          const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              phone: phoneFormats[i], 
              password: password 
            }),
          });
          
          const data = await response.json();
          console.log(`📥 Réponse format ${i + 1}:`, { 
            status: response.status, 
            data 
          });
          
          results.push({
            format: phoneFormats[i],
            status: response.status,
            data: data
          });
          
          // Si succès, arrêter les tests
          if (response.status === 200) {
            console.log(`✅ Format ${i + 1} fonctionne !`);
            break;
          }
        } catch (error) {
          console.log(`❌ Erreur format ${i + 1}:`, error.message);
          results.push({
            format: phoneFormats[i],
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('❌ Erreur test diagnostic:', error);
      throw error;
    }
  },

  // Test de timing - vérifier si le problème vient du délai
  testTimingIssue: async (phone, password) => {
    try {
      console.log('⏰ Test de timing - Vérification du délai de synchronisation');
      
      // Attendre 2 secondes puis tester
      console.log('⏳ Attente de 2 secondes...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone, 
          password: password 
        }),
      });
      
      const data = await response.json();
      console.log('📥 Réponse après délai:', { 
        status: response.status, 
        data 
      });
      
      return { status: response.status, data };
    } catch (error) {
      console.error('❌ Erreur test timing:', error);
      throw error;
    }
  },

  // Test de vérification du mot de passe - comparer avec l'ancien mot de passe
  testPasswordComparison: async (phone, newPassword, oldPassword) => {
    try {
      console.log('🔍 Test de comparaison des mots de passe');
      console.log('📱 Téléphone:', phone);
      console.log('🔑 Nouveau mot de passe:', newPassword);
      console.log('🔑 Ancien mot de passe:', oldPassword);
      
      // Test avec l'ancien mot de passe
      console.log('🧪 Test avec l\'ancien mot de passe...');
      const oldResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone, 
          password: oldPassword 
        }),
      });
      
      const oldData = await oldResponse.json();
      console.log('📥 Réponse ancien mot de passe:', { 
        status: oldResponse.status, 
        data: oldData 
      });
      
      // Test avec le nouveau mot de passe
      console.log('🧪 Test avec le nouveau mot de passe...');
      const newResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone, 
          password: newPassword 
        }),
      });
      
      const newData = await newResponse.json();
      console.log('📥 Réponse nouveau mot de passe:', { 
        status: newResponse.status, 
        data: newData 
      });
      
      return { 
        oldPassword: { status: oldResponse.status, data: oldData },
        newPassword: { status: newResponse.status, data: newData }
      };
    } catch (error) {
      console.error('❌ Erreur test comparaison:', error);
      throw error;
    }
  },

  // Test de format du mot de passe - vérifier l'encodage et les caractères spéciaux
  testPasswordFormat: async (phone, password) => {
    try {
      console.log('🔍 Test de format du mot de passe');
      console.log('📱 Téléphone:', phone);
      console.log('🔑 Mot de passe original:', password);
      console.log('🔑 Longueur:', password.length);
      console.log('🔑 Encodé URL:', encodeURIComponent(password));
      console.log('🔑 Encodé Base64:', btoa(password));
      
      // Test avec le mot de passe original
      const originalResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone, 
          password: password 
        }),
      });
      
      const originalData = await originalResponse.json();
      console.log('📥 Réponse mot de passe original:', { 
        status: originalResponse.status, 
        data: originalData 
      });
      
      // Test avec le mot de passe encodé URL
      const encodedResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone, 
          password: encodeURIComponent(password)
        }),
      });
      
      const encodedData = await encodedResponse.json();
      console.log('📥 Réponse mot de passe encodé:', { 
        status: encodedResponse.status, 
        data: encodedData 
      });
      
      return { 
        original: { status: originalResponse.status, data: originalData },
        encoded: { status: encodedResponse.status, data: encodedData }
      };
    } catch (error) {
      console.error('❌ Erreur test format:', error);
      throw error;
    }
  },

  // Test de vérification de la réinitialisation - vérifier si l'API fonctionne vraiment
  testResetVerification: async (phone, otp, newPassword) => {
    try {
      console.log('🔍 Test de vérification de la réinitialisation');
      console.log('📱 Téléphone:', phone);
      console.log('🔑 OTP:', otp);
      console.log('🔑 Nouveau mot de passe:', newPassword);
      
      // Test 1: Réinitialisation
      console.log('🧪 Test de réinitialisation...');
      const resetResponse = await fetch(`${API_BASE_URL}/recup-de-password-oublie`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          otp: otp, 
          new_password: newPassword 
        }),
      });
      
      const resetData = await resetResponse.json();
      console.log('📥 Réponse réinitialisation:', { 
        status: resetResponse.status, 
        data: resetData 
      });
      
      // Test 2: Connexion immédiate après réinitialisation
      console.log('🧪 Test de connexion immédiate...');
      const loginResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone, 
          password: newPassword 
        }),
      });
      
      const loginData = await loginResponse.json();
      console.log('📥 Réponse connexion immédiate:', { 
        status: loginResponse.status, 
        data: loginData 
      });
      
      // Test 3: Connexion après délai
      console.log('⏳ Attente de 3 secondes...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('🧪 Test de connexion après délai...');
      const delayedLoginResponse = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone, 
          password: newPassword 
        }),
      });
      
      const delayedLoginData = await delayedLoginResponse.json();
      console.log('📥 Réponse connexion après délai:', { 
        status: delayedLoginResponse.status, 
        data: delayedLoginData 
      });
      
      return { 
        reset: { status: resetResponse.status, data: resetData },
        immediateLogin: { status: loginResponse.status, data: loginData },
        delayedLogin: { status: delayedLoginResponse.status, data: delayedLoginData }
      };
    } catch (error) {
      console.error('❌ Erreur test vérification:', error);
      throw error;
    }
  },

  // Gestion des erreurs
  handleError: (error) => {
    console.error('API Error:', error);
    throw error;
  }
}; 