// Service de tracking temps réel optimisé
import FirebaseTrackingService from './firebase';
import { mapClientToFirebaseOrderId, saveOrderIdMapping } from './orderIdMappingService';

class RealtimeTrackingService {
  constructor() {
    this.isTracking = false;
    this.currentOrderId = null;
    this.updateInterval = null;
    this.lastUpdate = null;
    this.updateFrequency = 5000; // 5 secondes par défaut
    this.firebaseService = FirebaseTrackingService;
    this.callbacks = null;
    this.cleanupFunction = null;
  }

  // Configurer la fréquence de mise à jour - OPTIMISÉE
  setUpdateFrequency(frequency) {
    this.updateFrequency = Math.max(2000, Math.min(10000, frequency)); // Entre 2s et 10s pour un suivi fluide
    console.log('⚙️ Fréquence de mise à jour configurée:', this.updateFrequency, 'ms');
  }

  // Démarrer le tracking temps réel
  startTracking(orderId, callbacks, options = {}) {
    
    this.currentOrderId = orderId;
    this.callbacks = callbacks;
    
    // Mapper l'OrderId client vers Firebase et sauvegarder
    const firebaseOrderId = mapClientToFirebaseOrderId(orderId);
    console.log('🔗 MAPPING - RealtimeTrackingService: Client', orderId, '→ Firebase', firebaseOrderId);
    saveOrderIdMapping();
    
    // Configurer la fréquence
    if (options.updateFrequency) {
      this.setUpdateFrequency(options.updateFrequency);
    }

    try {
      const firebaseCleanup = this.firebaseService.startTracking(orderId, {
        onLocationUpdate: (update) => {
          this.handleLocationUpdate(update);
        },
        onStatusUpdate: (update) => {
          this.handleStatusUpdate(update);
        },
        onMessageReceived: (message) => {
          if (callbacks.onMessageReceived) {
            callbacks.onMessageReceived(message);
          }
        }
      });
      
      // Vérifier que la fonction de nettoyage Firebase est valide
      if (firebaseCleanup && typeof firebaseCleanup === 'function') {
        this.cleanupFunction = firebaseCleanup;
      } else {
        console.warn('⚠️ Firebase cleanup non valide, utilisation du fallback');
        this.cleanupFunction = () => {
          console.log('🧹 Nettoyage fallback RealtimeTrackingService');
        };
      }
      
      this.isTracking = true;
      
      // Retourner la fonction de nettoyage
      return () => {
        this.stopTracking();
      };
      
    } catch (error) {
      console.error('❌ Erreur RealtimeTrackingService:', error);
      this.isTracking = false;
      
      // Retourner une fonction de nettoyage par défaut
      return () => {
        console.log('🧹 Nettoyage par défaut RealtimeTrackingService');
      };
    }
  }

  // Gérer les mises à jour de position - OPTIMISÉE
  handleLocationUpdate(update) {
    if (!this.callbacks || !this.callbacks.onLocationUpdate) return;
    
    // Éviter les mises à jour trop fréquentes
    const now = Date.now();
    if (this.lastUpdate && (now - this.lastUpdate) < this.updateFrequency) {
      console.log('⏱️ Mise à jour ignorée - trop fréquente');
      return;
    }
    
    this.lastUpdate = now;
    console.log('📍 Mise à jour position acceptée:', update);
    this.callbacks.onLocationUpdate(update);
  }

  // Gérer les mises à jour de statut
  handleStatusUpdate(update) {
    if (!this.callbacks || !this.callbacks.onStatusUpdate) return;
    
    this.callbacks.onStatusUpdate(update);
  }

  // Arrêter le tracking
  stopTracking() {
    
    this.isTracking = false;
    this.currentOrderId = null;
    this.lastUpdate = null;
    
    if (this.cleanupFunction && typeof this.cleanupFunction === 'function') {
      try {
        this.cleanupFunction();
      } catch (error) {
        // Erreur silencieuse
      }
    }
    
    this.cleanupFunction = null;
  }

  // Mettre à jour la position du driver (pour le simulateur)
  async updateDriverLocation(locationData) {
    if (!this.currentOrderId) {
      throw new Error('Aucune commande en cours de tracking');
    }

    try {
      return await this.firebaseService.updateDriverLocation(this.currentOrderId, locationData);
    } catch (error) {
      throw error;
    }
  }

  // Mettre à jour le statut de livraison
  async updateDeliveryStatus(statusData) {
    if (!this.currentOrderId) {
      throw new Error('Aucune commande en cours de tracking');
    }

    try {
      return await this.firebaseService.updateDeliveryStatus(this.currentOrderId, statusData);
    } catch (error) {
      throw error;
    }
  }

  // Créer une nouvelle commande
  async createOrder(orderData) {
    const orderId = orderData.id || `order_${Date.now()}`;
    
    try {
      return await this.firebaseService.createOrder(orderId, orderData);
    } catch (error) {
      throw error;
    }
  }

  // Récupérer les données d'une commande
  async getOrderData(firebaseOrderId) {
    try {
      return await this.firebaseService.getOrderData(firebaseOrderId);
    } catch (error) {
      console.error('❌ Erreur récupération données commande:', error);
      return null;
    }
  }

  // Obtenir le statut actuel
  getStatus() {
    return {
      isTracking: this.isTracking,
      currentOrderId: this.currentOrderId,
      updateFrequency: this.updateFrequency,
      lastUpdate: this.lastUpdate
    };
  }

  // Nettoyer toutes les ressources
  cleanup() {
    this.stopTracking();
    
    if (this.firebaseService.cleanup) {
      this.firebaseService.cleanup();
    }
  }
}

export default new RealtimeTrackingService();
