import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

// Configuration Firebase temporaire (hardcodée pour éviter les problèmes de .env)
const firebaseConfig = {
  apiKey: "AIzaSyB6Foh29YS-VQLMhw-gO83L_OSVullVvI8",
  authDomain: "mayombe-ba11b.firebaseapp.com",
  databaseURL: "https://mayombe-ba11b-default-rtdb.firebaseio.com",
  projectId: "mayombe-ba11b",
  storageBucket: "mayombe-ba11b.firebasestorage.app",
  messagingSenderId: "784517096614",
  appId: "1:784517096614:android:41b02898b40426e23fc067"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

class FirebaseTrackingService {
  constructor() {
    this.locationSubscription = null;
    this.statusSubscription = null;
    this.messageSubscription = null;
    this.subscribers = new Map();
  }

  // Écouter la position GPS du driver en temps réel
  subscribeToDriverLocation(orderId, callback) {
    console.log('📍 Abonnement position driver pour:', orderId);
    
    const locationRef = ref(database, `orders/${orderId}/driver/location`);
    
    this.locationSubscription = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log('📍 Nouvelle position driver reçue:', data);
        callback({
          type: 'location',
          data: {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            speed: data.speed,
            heading: data.heading,
            timestamp: data.timestamp
          }
        });
      }
    });

    return () => {
      if (this.locationSubscription) {
        off(locationRef);
        this.locationSubscription = null;
      }
    };
  }

  // Écouter le statut de la livraison en temps réel
  subscribeToDeliveryStatus(orderId, callback) {
    console.log('📊 Abonnement statut livraison pour:', orderId);
    
    const statusRef = ref(database, `orders/${orderId}/status`);
    
    this.statusSubscription = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log('📊 Nouveau statut livraison reçu:', data);
        callback({
          type: 'status',
          data: {
            status: data.status,
            timestamp: data.timestamp,
            updatedAt: data.updatedAt,
            ...data
          }
        });
      }
    });

    return () => {
      if (this.statusSubscription) {
        off(statusRef);
        this.statusSubscription = null;
      }
    };
  }

  // Écouter les messages FCM (notifications push) - désactivé pour React Native
  subscribeToMessages(callback) {
    console.log('🔔 FCM désactivé pour React Native');
    
    this.messageSubscription = null;

    return () => {
      if (this.messageSubscription) {
        this.messageSubscription = null;
      }
    };
  }

  // Obtenir le token FCM pour les notifications - désactivé pour React Native
  async getFCMToken() {
    try {
      console.log('🔔 FCM désactivé pour React Native');
      return null;
    } catch (error) {
      console.error('❌ Erreur obtention token FCM:', error);
      return null;
    }
  }

  // Démarrer le tracking complet pour une commande
  startTracking(orderId, callbacks) {
    console.log('🚀 Démarrage tracking Firebase pour:', orderId);
    
    const cleanupFunctions = [];

    // Abonnement position
    if (callbacks.onLocationUpdate) {
      const locationCleanup = this.subscribeToDriverLocation(orderId, callbacks.onLocationUpdate);
      cleanupFunctions.push(locationCleanup);
    }

    // Abonnement statut
    if (callbacks.onStatusUpdate) {
      const statusCleanup = this.subscribeToDeliveryStatus(orderId, callbacks.onStatusUpdate);
      cleanupFunctions.push(statusCleanup);
    }

    // Abonnement messages
    if (callbacks.onMessageReceived) {
      const messageCleanup = this.subscribeToMessages(callbacks.onMessageReceived);
      cleanupFunctions.push(messageCleanup);
    }

    // Stocker les fonctions de nettoyage
    this.subscribers.set(orderId, cleanupFunctions);

    return () => {
      console.log('🛑 Arrêt tracking Firebase pour:', orderId);
      cleanupFunctions.forEach(cleanup => cleanup());
      this.subscribers.delete(orderId);
    };
  }

  // Arrêter le tracking pour une commande
  stopTracking(orderId) {
    const cleanupFunctions = this.subscribers.get(orderId);
    if (cleanupFunctions) {
      console.log('🛑 Arrêt tracking Firebase pour:', orderId);
      cleanupFunctions.forEach(cleanup => cleanup());
      this.subscribers.delete(orderId);
    }
  }

  // Nettoyer tous les listeners
  cleanup() {
    console.log('🧹 Nettoyage complet Firebase');
    
    // Nettoyer tous les abonnements
    this.subscribers.forEach((cleanupFunctions, orderId) => {
      console.log('🛑 Arrêt tracking pour:', orderId);
      cleanupFunctions.forEach(cleanup => cleanup());
    });
    this.subscribers.clear();

    // Nettoyer les subscriptions globales
    if (this.locationSubscription) {
      this.locationSubscription = null;
    }
    if (this.statusSubscription) {
      this.statusSubscription = null;
    }
    if (this.messageSubscription) {
      this.messageSubscription = null;
    }
  }
}

export default new FirebaseTrackingService();
