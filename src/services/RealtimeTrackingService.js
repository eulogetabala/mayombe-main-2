import AsyncStorage from '@react-native-async-storage/async-storage';
import WebSocketService from './WebSocketService';
import OrderTrackingService from './OrderTrackingService';

class RealtimeTrackingService {
  constructor() {
    this.trackingData = new Map();
    this.updateCallbacks = new Map();
    this.isInitialized = false;
    this.currentOrderId = null;
  }

  // Initialiser le service
  async initialize() {
    try {
      console.log('📱 Initialisation du service de suivi temps réel client...');
      
      // Récupérer le token d'authentification
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Token d\'authentification non trouvé');
      }

      // Configurer les listeners WebSocket
      this.setupWebSocketListeners();
      
      this.isInitialized = true;
      console.log('✅ Service de suivi temps réel client initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation service suivi:', error);
      throw error;
    }
  }

  // Configurer les listeners WebSocket
  setupWebSocketListeners() {
    // Mise à jour de la position du livreur
    WebSocketService.subscribe('driver-location-update', (data) => {
      console.log('🚚 Position livreur reçue:', data);
      this.updateDriverLocation(data.orderId, data.location);
    });

    // Mise à jour du statut de la commande
    WebSocketService.subscribe('order-status-update', (data) => {
      console.log('📦 Statut commande reçu:', data);
      this.updateOrderStatus(data.orderId, data.status, data);
    });

    // Livraison terminée
    WebSocketService.subscribe('delivery-completed', (data) => {
      console.log('✅ Livraison terminée reçue:', data);
      this.handleDeliveryCompleted(data.orderId, data);
    });

    // Livreur attribué
    WebSocketService.subscribe('driver-assigned', (data) => {
      console.log('👤 Livreur attribué reçu:', data);
      this.handleDriverAssigned(data.orderId, data);
    });
  }

  // Démarrer le suivi d'une commande
  async startTracking(orderId, initialData = null) {
    try {
      console.log(`📱 Démarrage du suivi pour la commande ${orderId}`);
      
      // Connecter au WebSocket si pas déjà connecté
      const token = await AsyncStorage.getItem('userToken');
      if (!WebSocketService.isSocketConnected()) {
        WebSocketService.connect(token, orderId);
      } else {
        // S'abonner à cette commande spécifique
        WebSocketService.emit('subscribe-to-order', { orderId });
      }

      this.currentOrderId = orderId;

      // Créer ou charger les données de suivi
      let trackingData = await this.loadTrackingData(orderId);
      
      if (!trackingData) {
        trackingData = this.createInitialTrackingData(orderId, initialData);
        await this.saveTrackingData(orderId, trackingData);
      }

      this.trackingData.set(orderId, trackingData);
      
      console.log(`✅ Suivi démarré pour la commande ${orderId}`);
      return trackingData;
    } catch (error) {
      console.error('❌ Erreur démarrage suivi:', error);
      throw error;
    }
  }

  // Créer les données initiales de suivi
  createInitialTrackingData(orderId, initialData) {
    return {
      orderId,
      status: 'preparing',
      driver: initialData?.driver || {
        id: null,
        name: 'En attente...',
        phone: null,
        vehicle: null,
        rating: 0,
        photo: null
      },
      location: {
        current: null,
        destination: initialData?.destination || null,
        pickup: initialData?.pickup || null
      },
      estimatedTime: initialData?.estimatedTime || 0,
      distance: initialData?.distance || 0,
      lastUpdate: Date.now(),
      isRealtime: false
    };
  }

  // Mettre à jour la position du livreur
  updateDriverLocation(orderId, locationData) {
    const trackingData = this.trackingData.get(orderId);
    if (!trackingData) return;

    trackingData.location.current = {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      address: locationData.address || 'Position GPS'
    };
    trackingData.estimatedTime = locationData.estimatedTime || trackingData.estimatedTime;
    trackingData.distance = locationData.distance || trackingData.distance;
    trackingData.lastUpdate = Date.now();
    trackingData.isRealtime = true;

    // Sauvegarder
    this.saveTrackingData(orderId, trackingData);

    // Notifier les callbacks
    this.notifyCallbacks(orderId, trackingData);

    console.log(`📍 Position livreur mise à jour pour ${orderId}:`, locationData);
  }

  // Mettre à jour le statut de la commande
  updateOrderStatus(orderId, status, data = {}) {
    const trackingData = this.trackingData.get(orderId);
    if (!trackingData) return;

    trackingData.status = status;
    trackingData.lastUpdate = Date.now();

    // Mettre à jour les informations supplémentaires
    if (data.estimatedTime) trackingData.estimatedTime = data.estimatedTime;
    if (data.distance) trackingData.distance = data.distance;
    if (data.driver) trackingData.driver = { ...trackingData.driver, ...data.driver };

    // Sauvegarder
    this.saveTrackingData(orderId, trackingData);

    // Notifier les callbacks
    this.notifyCallbacks(orderId, trackingData);

    console.log(`📦 Statut commande mis à jour pour ${orderId}: ${status}`);
  }

  // Gérer l'attribution d'un livreur
  handleDriverAssigned(orderId, data) {
    const trackingData = this.trackingData.get(orderId);
    if (!trackingData) return;

    trackingData.driver = {
      id: data.driverId,
      name: data.driverName,
      phone: data.driverPhone,
      vehicle: data.vehicle,
      rating: data.rating || 0,
      photo: data.photo
    };
    trackingData.status = 'driver_assigned';
    trackingData.lastUpdate = Date.now();

    // Sauvegarder
    this.saveTrackingData(orderId, trackingData);

    // Notifier les callbacks
    this.notifyCallbacks(orderId, trackingData);

    console.log(`👤 Livreur attribué pour ${orderId}:`, data);
  }

  // Gérer la fin de livraison
  handleDeliveryCompleted(orderId, data) {
    const trackingData = this.trackingData.get(orderId);
    if (!trackingData) return;

    trackingData.status = 'delivered';
    trackingData.lastUpdate = Date.now();
    trackingData.completedAt = Date.now();

    // Sauvegarder
    this.saveTrackingData(orderId, trackingData);

    // Notifier les callbacks
    this.notifyCallbacks(orderId, trackingData);

    // Arrêter le suivi
    this.stopTracking(orderId);

    console.log(`✅ Livraison terminée pour ${orderId}`);
  }

  // S'abonner aux mises à jour d'une commande
  subscribeToUpdates(orderId, callback) {
    if (!this.updateCallbacks.has(orderId)) {
      this.updateCallbacks.set(orderId, []);
    }
    this.updateCallbacks.get(orderId).push(callback);

    // Envoyer les données actuelles immédiatement
    const currentData = this.trackingData.get(orderId);
    if (currentData) {
      callback(currentData);
    }
  }

  // Se désabonner des mises à jour
  unsubscribeFromUpdates(orderId, callback) {
    if (this.updateCallbacks.has(orderId)) {
      const callbacks = this.updateCallbacks.get(orderId);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notifier les callbacks
  notifyCallbacks(orderId, data) {
    if (this.updateCallbacks.has(orderId)) {
      this.updateCallbacks.get(orderId).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Erreur dans le callback pour ${orderId}:`, error);
        }
      });
    }
  }

  // Obtenir les données de suivi
  getTrackingData(orderId) {
    return this.trackingData.get(orderId) || null;
  }

  // Vérifier si c'est du temps réel
  isRealtime(orderId) {
    const trackingData = this.trackingData.get(orderId);
    return trackingData ? trackingData.isRealtime : false;
  }

  // Arrêter le suivi d'une commande
  stopTracking(orderId) {
    this.trackingData.delete(orderId);
    this.updateCallbacks.delete(orderId);
    
    // Se désabonner du WebSocket
    WebSocketService.emit('unsubscribe-from-order', { orderId });
    
    console.log(`🛑 Suivi arrêté pour la commande ${orderId}`);
  }

  // Sauvegarder les données localement
  async saveTrackingData(orderId, data) {
    try {
      await AsyncStorage.setItem(`tracking_${orderId}`, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Erreur sauvegarde données:', error);
    }
  }

  // Charger les données depuis le stockage local
  async loadTrackingData(orderId) {
    try {
      const data = await AsyncStorage.getItem(`tracking_${orderId}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
    }
    return null;
  }

  // Nettoyer les données d'une commande
  async cleanupTracking(orderId) {
    this.trackingData.delete(orderId);
    this.updateCallbacks.delete(orderId);
    await AsyncStorage.removeItem(`tracking_${orderId}`);
    console.log(`🧹 Données de suivi nettoyées pour ${orderId}`);
  }

  // Arrêter complètement le service
  async stop() {
    // Arrêter le suivi de toutes les commandes
    for (const [orderId] of this.trackingData) {
      this.stopTracking(orderId);
    }
    
    // Déconnecter le WebSocket
    WebSocketService.disconnect();
    
    this.isInitialized = false;
    this.currentOrderId = null;
    
    console.log('🛑 Service de suivi temps réel arrêté');
  }

  // Générer un lien de partage
  generateShareLink(orderId) {
    return `https://mayombe.com/track/${orderId}`;
  }

  // Obtenir les statistiques de la livraison
  getDeliveryStats(orderId) {
    const trackingData = this.trackingData.get(orderId);
    if (!trackingData) return null;

    const totalTime = trackingData.completedAt 
      ? (trackingData.completedAt - trackingData.lastUpdate) / 1000 / 60
      : (Date.now() - trackingData.lastUpdate) / 1000 / 60;

    return {
      totalTime,
      distance: trackingData.distance,
      isRealtime: trackingData.isRealtime,
      status: trackingData.status
    };
  }
}

export default new RealtimeTrackingService();
