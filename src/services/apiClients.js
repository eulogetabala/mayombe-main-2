import axios from 'axios';
import secureTokenStorage from './secureTokenStorage';

const apiClient = axios.create({
  baseURL: 'https://www.api-mayombe.mayombe-app.com/public/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injecter automatiquement le token d'authentification sur chaque requête.
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await secureTokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du token:', error);
  }
  return config;
});

export default apiClient;
