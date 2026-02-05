import React, { createContext, useContext, useState, useCallback } from 'react';
import ratingsService from '../services/ratingsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';

const RatingsContext = createContext();

export const useRatings = () => {
  const context = useContext(RatingsContext);
  if (!context) {
    throw new Error('useRatings must be used within a RatingsProvider');
  }
  return context;
};

export const RatingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [cache, setCache] = useState({});

  /**
   * Soumettre une notation
   */
  const submitRating = useCallback(async (itemId, type, rating, comment = '') => {
    try {
      let userId;
      
      if (user && user.id) {
        userId = `user_${user.id}`;
      } else {
        // Générer un guestId
        let guestId = await AsyncStorage.getItem('guestId');
        if (!guestId) {
          guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem('guestId', guestId);
        }
        userId = guestId;
      }
      
      await ratingsService.submitRating(itemId, type, rating, userId, comment);
      
      // Invalider le cache pour cet item
      const cacheKey = `${itemId}_${type}`;
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[cacheKey];
        return newCache;
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de la soumission de la notation:', error);
      throw error;
    }
  }, [user]);

  /**
   * Récupérer la note moyenne
   */
  const getAverageRating = useCallback(async (itemId, type) => {
    const cacheKey = `${itemId}_${type}`;
    
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }
    
    try {
      const result = await ratingsService.getAverageRating(itemId, type);
      setCache(prev => ({
        ...prev,
        [cacheKey]: result,
      }));
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la note moyenne:', error);
      return { averageRating: 0, totalRatings: 0 };
    }
  }, [cache]);

  /**
   * Récupérer les notes pour plusieurs items (batch)
   */
  const getBatchRatings = useCallback(async (itemIds, type) => {
    try {
      return await ratingsService.getBatchRatings(itemIds, type);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération batch des notes:', error);
      return {};
    }
  }, []);

  /**
   * Récupérer toutes les notations d'un item
   */
  const getRatings = useCallback(async (itemId, type) => {
    try {
      return await ratingsService.getRatings(itemId, type);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des notations:', error);
      return [];
    }
  }, []);

  /**
   * Nettoyer le cache
   */
  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  const value = {
    submitRating,
    getAverageRating,
    getBatchRatings,
    getRatings,
    clearCache,
  };

  return (
    <RatingsContext.Provider value={value}>
      {children}
    </RatingsContext.Provider>
  );
};

RatingsProvider.displayName = 'RatingsProvider';

export default RatingsContext;
