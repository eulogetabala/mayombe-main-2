import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://www.api-mayombe.mayombe-app.com/public/api';

class OrderTrackingService {
  // Récupérer le token d'authentification
  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  // Récupérer le statut d'une commande
  async getOrderStatus(orderId) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Statut commande récupéré:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du statut:', error);
      throw error;
    }
  }

  // Récupérer l'historique de suivi
  async getTrackingHistory(orderId) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/tracking-history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Historique de suivi récupéré:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  // Mettre à jour le statut de la commande (pour le livreur)
  async updateOrderStatus(orderId, status, location = null) {
    try {
      const token = await this.getAuthToken();
      const payload = {
        status,
        timestamp: new Date().toISOString(),
        ...(location && { location })
      };

      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Statut commande mis à jour:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  // Mettre à jour la position du livreur
  async updateDriverLocation(driverId, latitude, longitude) {
    try {
      const token = await this.getAuthToken();
      const payload = {
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/drivers/${driverId}/location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🚚 Position livreur mise à jour:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la position:', error);
      throw error;
    }
  }

  // Noter le livreur
  async rateDriver(orderId, rating, comment = '') {
    try {
      const token = await this.getAuthToken();
      const payload = {
        rating,
        comment,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('⭐ Note livreur enregistrée:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la notation:', error);
      throw error;
    }
  }

  // Contacter le livreur
  async contactDriver(orderId) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/contact-driver`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📞 Informations contact livreur:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des contacts:', error);
      throw error;
    }
  }
}

export default new OrderTrackingService(); 