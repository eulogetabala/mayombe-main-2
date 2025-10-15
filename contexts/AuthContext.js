import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClients';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log("🔐 Vérification du statut d'authentification...");
        const token = await AsyncStorage.getItem('userToken');
        const guestStatus = await AsyncStorage.getItem('isGuest');
        
        console.log("🔑 Token trouvé:", !!token);
        console.log("👤 Statut invité:", !!guestStatus);
        
        setIsAuthenticated(!!token);
        setIsGuest(!!guestStatus);
      } catch (error) {
        console.error('❌ Erreur de vérification du token:', error);
      } finally {
        console.log("✅ AuthContext prêt");
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (token) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.removeItem('isGuest'); // Supprimer le statut invité
      setIsAuthenticated(true);
      setIsGuest(false);
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('isGuest');
      setIsAuthenticated(false);
      setIsGuest(false);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const register = async (name, phone, password) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/register', { name, phone, password });
      console.log(response.data);
      return response.data; // Si OTP est nécessaire, renvoyer les détails
    } catch (error) {
      console.error('Registration Error:', error.response?.data || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const response = await apiClient.get('/user');
      return response.data;
    } catch (error) {
      console.error('Get User Error:', error.response?.data || error.message);
      return null;
    }
  };

  const updateAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const guestStatus = await AsyncStorage.getItem('isGuest');
      setIsAuthenticated(!!token);
      setIsGuest(!!guestStatus);
    } catch (error) {
      console.error('Erreur de mise à jour du statut d\'authentification:', error);
    }
  };

  const setGuestMode = async () => {
    try {
      await AsyncStorage.setItem('isGuest', 'true');
      await AsyncStorage.removeItem('userToken');
      setIsGuest(true);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Erreur lors de l\'activation du mode invité:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isGuest, isLoading, register, login, logout, getCurrentUser, updateAuthStatus, setGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};
