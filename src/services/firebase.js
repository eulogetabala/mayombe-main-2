import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, set, push, enableNetwork, disableNetwork } from 'firebase/database';
import pushNotificationService from './pushNotifications';
import geofencingService from './geofencingService';
import { mapClientToFirebaseOrderId, getFirebaseOrderId } from './orderIdMappingService';

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
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    this.reconnectInterval = null;
    this.lastLocationUpdate = null;
    this.lastStatusUpdate = null;
  }

  // Vérifier la connexion Firebase
  async checkConnection() {
    try {
      // Vérification connexion Firebase
      
      const testRef = ref(database, '.info/connected');
      return new Promise((resolve) => {
        let unsubscribe = null;
        
        try {
          unsubscribe = onValue(testRef, (snapshot) => {
            const isConnected = snapshot.val() === true;
            this.isConnected = isConnected;

            
            if (unsubscribe && typeof unsubscribe === 'function') {
              unsubscribe();
            }
            resolve(isConnected);
          }, { onlyOnce: true });
          
          // Timeout après 15 secondes pour les connexions lentes
          setTimeout(() => {
                      // Timeout vérification Firebase (connexion lente)
            if (unsubscribe && typeof unsubscribe === 'function') {
              unsubscribe();
            }
            // Pour les connexions lentes, on considère Firebase comme "connecté" mais avec des limitations
            this.isConnected = true;
            resolve(true);
          }, 15000);
        } catch (error) {
          console.error('❌ Erreur dans checkConnection:', error);
          resolve(false);
        }
      });
    } catch (error) {
      console.error('❌ Erreur vérification connexion Firebase:', error);
      return false;
    }
  }

  // Écouter la position GPS du driver en temps réel (ULTRA-OPTIMISÉ)
  subscribeToDriverLocation(orderId, callback) {
    console.log('🔍 CLIENT: Écoute position driver pour OrderId:', orderId);
    console.log('🔍 CLIENT: Chemin Firebase:', `orders/${orderId}/driver/location`);
    
    // Vérifier si cette commande existe dans Firebase
    this.checkOrderExists(orderId);
    
    // Utiliser directement l'OrderId (compatible avec le driver)
    const locationRef = ref(database, `orders/${orderId}/driver/location`);
    const statusRef = ref(database, `orders/${orderId}/status`);
    
    // Variables pour optimiser les performances
    let lastLocationData = null;
    let lastStatusData = null;
    let locationUpdateCount = 0;
    let statusUpdateCount = 0;
    
    // Écouter les changements de statut - OPTIMISÉ
    this.statusSubscription = onValue(statusRef, (snapshot) => {
      const statusData = snapshot.val();
      if (statusData && JSON.stringify(statusData) !== JSON.stringify(lastStatusData)) {
        lastStatusData = statusData;
        statusUpdateCount++;
        
        callback({
          type: 'status',
          data: {
            status: statusData.status || statusData,
            timestamp: statusData.timestamp || Date.now()
          }
        });
      }
    }, (error) => {
      console.error('❌ Erreur abonnement statut:', error);
    });
    
    // Écouter les changements de position - ULTRA-OPTIMISÉ
    this.locationSubscription = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      console.log('🔍 CLIENT: Données position reçues:', data);
      
      if (data) {
        // Vérifier si c'est une nouvelle position (éviter les doublons)
        const currentTime = Date.now();
        const isNewPosition = !this.lastLocationUpdate || (currentTime - this.lastLocationUpdate) > 2000; // 2 secondes minimum
        
        if (isNewPosition) {
          this.lastLocationUpdate = currentTime;
          locationUpdateCount++;
          
          // Vérifier si les coordonnées ont vraiment changé
          const hasLocationChanged = !lastLocationData || 
            Math.abs(lastLocationData.latitude - data.latitude) > 0.0001 || // ~10 mètres
            Math.abs(lastLocationData.longitude - data.longitude) > 0.0001;
          
          if (hasLocationChanged) {
            lastLocationData = data;
            
            console.log('🔍 CLIENT: Envoi position au callback:', {
              latitude: parseFloat(data.latitude),
              longitude: parseFloat(data.longitude),
              accuracy: data.accuracy || 5,
              speed: data.speed || 0
            });
            
            callback({
              type: 'location',
              data: {
                latitude: parseFloat(data.latitude),
                longitude: parseFloat(data.longitude),
                accuracy: data.accuracy || 5,
                speed: data.speed || 0,
                heading: data.heading || 0,
                timestamp: data.timestamp || currentTime
              }
            });
          }
        }
      } else {
      }
    }, (error) => {
      console.error('❌ Erreur abonnement position:', error);
      callback({
        type: 'error',
        error: 'Erreur de connexion à la position du livreur'
      });
    });

    return () => {
      if (this.locationSubscription) {
        off(locationRef);
      }
      if (this.statusSubscription) {
        off(statusRef);
      }
      this.locationSubscription = null;
    };
  }

  // 🔔 Envoyer une notification de statut
  async sendStatusNotification(orderId, statusData) {
    try {
      const status = statusData.status;
      const distance = statusData.distance;
      const estimatedTime = statusData.estimatedTime;
      
      let additionalInfo = '';
      if (distance && estimatedTime) {
        additionalInfo = `Distance: ${Math.round(distance)}m, ETA: ${Math.round(estimatedTime)}min`;
      }
      
      await pushNotificationService.sendDeliveryStatusNotification(
        orderId,
        status,
        additionalInfo
      );
      
    } catch (error) {
      console.error('❌ Erreur envoi notification de statut:', error);
    }
  }

  // Écouter les messages FCM (notifications push) - désactivé pour React Native
  subscribeToMessages(callback) {
    
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
      return null;
    } catch (error) {
      console.error('❌ Erreur obtention token FCM:', error);
      return null;
    }
  }

  // Envoyer la position GPS du driver (ULTRA-OPTIMISÉ pour temps réel)
  async updateDriverLocation(orderId, locationData) {
    try {
      const locationRef = ref(database, `orders/${orderId}/driver/location`);
      
      // Validation et optimisation des données
      const data = {
        latitude: parseFloat(locationData.latitude),
        longitude: parseFloat(locationData.longitude),
        accuracy: Math.min(Math.max(locationData.accuracy || 5, 1), 50), // Entre 1 et 50 mètres
        speed: Math.max(locationData.speed || 0, 0), // Vitesse positive uniquement
        heading: locationData.heading || 0,
        timestamp: Date.now(),
        updatedAt: new Date().toISOString(),
        // Ajouter des métadonnées pour l'optimisation
        batteryLevel: locationData.batteryLevel || null,
        networkType: locationData.networkType || 'unknown'
      };
      
      // Utiliser set() pour une écriture atomique et rapide
      await set(locationRef, data);
      
      
      return data;
    } catch (error) {
      console.error('❌ Erreur envoi position driver:', error);
      throw error;
    }
  }

  // Mettre à jour le statut de la livraison (pour le simulateur)
  async updateDeliveryStatus(orderId, statusData) {
    try {
      const statusRef = ref(database, `orders/${orderId}/status`);
      const data = {
        ...statusData,
        timestamp: Date.now(),
        updatedAt: new Date().toISOString()
      };
      
      await set(statusRef, data);
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour statut:', error);
      return false;
    }
  }

  // Créer une nouvelle commande dans Firebase
  async createOrder(orderId, orderData) {
    try {
      
      const orderRef = ref(database, `orders/${orderId}`);
      const data = {
        ...orderData,
        createdAt: new Date().toISOString(),
        status: 'pending',
        clientOrderId: orderId // Garder une référence à l'OrderId client
      };
      
      
      await set(orderRef, data);
      return true;
    } catch (error) {
      console.error('❌ Erreur création commande Firebase:', error);
      return false;
    }
  }

  // S'abonner aux mises à jour de position du driver
  subscribeToDriverLocation(orderId, callback) {
    
    const locationRef = ref(database, `orders/${orderId}/driver/location`);
    const statusRef = ref(database, `orders/${orderId}/status`);
    
    // Écouter les changements de position
    const locationUnsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          type: 'location',
          data: data
        });
      }
    }, (error) => {
      console.error('❌ Erreur écoute position:', error);
    });
    
    // Écouter les changements de statut
    const statusUnsubscribe = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          type: 'status',
          data: data
        });
      }
    }, (error) => {
      console.error('❌ Erreur écoute statut:', error);
    });
    
    // Retourner la fonction de nettoyage
    return () => {
      locationUnsubscribe();
      statusUnsubscribe();
    };
  }

  // Démarrer le tracking complet pour une commande
  startTracking(orderId, callbacks) {
    
    
    const cleanupFunctions = [];

    // Abonnement position et statut
    if (callbacks.onLocationUpdate || callbacks.onStatusUpdate) {
      try {
        const locationCleanup = this.subscribeToDriverLocation(orderId, (update) => {
          if (update.type === 'location' && callbacks.onLocationUpdate) {
            callbacks.onLocationUpdate(update);
          } else if (update.type === 'status' && callbacks.onStatusUpdate) {
            callbacks.onStatusUpdate(update);
          }
        });
        if (locationCleanup && typeof locationCleanup === 'function') {
          cleanupFunctions.push(locationCleanup);
        }
      } catch (error) {
        console.warn('⚠️ Erreur abonnement position/statut:', error);
      }
    }

    // Abonnement statut (géré dans subscribeToDriverLocation)
    // Le statut est maintenant écouté automatiquement avec la position

    // Abonnement messages
    if (callbacks.onMessageReceived) {
      try {
        const messageCleanup = this.subscribeToMessages(callbacks.onMessageReceived);
        if (messageCleanup && typeof messageCleanup === 'function') {
          cleanupFunctions.push(messageCleanup);
        }
      } catch (error) {
        console.warn('⚠️ Erreur abonnement messages:', error);
      }
    }

    // 🔔 Initialiser les push notifications et geofencing
    this.initializeNotificationsAndGeofencing(orderId, callbacks);

    // Stocker les fonctions de nettoyage
    this.subscribers.set(orderId, cleanupFunctions);

    return () => {
      
      try {
        cleanupFunctions.forEach(cleanup => {
          if (cleanup && typeof cleanup === 'function') {
            try {
              cleanup();
            } catch (error) {
              console.warn('⚠️ Erreur nettoyage:', error);
            }
          }
        });
        this.subscribers.delete(orderId);
        
        // 🧹 Nettoyer le geofencing
        geofencingService.removeGeofence(orderId);
      } catch (error) {
        console.warn('⚠️ Erreur lors du nettoyage Firebase:', error);
      }
    };
  }

  // 🔔 Initialiser les notifications et le geofencing
  async initializeNotificationsAndGeofencing(orderId, callbacks) {
    try {

      // Initialiser les services
      await pushNotificationService.initialize();
      await geofencingService.initialize();

      // Si on a une destination, ajouter un geofence
      if (callbacks.destinationLocation) {
        geofencingService.addGeofence(orderId, callbacks.destinationLocation);
      }

    } catch (error) {
      console.error('❌ Erreur initialisation notifications/geofencing:', error);
    }
  }

  // Arrêter le tracking pour une commande
  stopTracking(orderId) {
    const cleanupFunctions = this.subscribers.get(orderId);
    if (cleanupFunctions) {
      cleanupFunctions.forEach(cleanup => cleanup());
      this.subscribers.delete(orderId);
    }
  }

  // Tentative de reconnexion
  async retryConnection() {
    if (this.connectionRetries >= this.maxRetries) {
      console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
      return false;
    }

    this.connectionRetries++;
    
    try {
      const isConnected = await this.checkConnection();
      if (isConnected) {
        this.connectionRetries = 0;
        return true;
      } else {
        // Réessayer après 2 secondes
        setTimeout(() => this.retryConnection(), 2000);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la reconnexion:', error);
      setTimeout(() => this.retryConnection(), 2000);
      return false;
    }
  }

  // Nettoyer tous les listeners
  cleanup() {
    
    // Nettoyer tous les abonnements
    this.subscribers.forEach((cleanupFunctions, orderId) => {
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


  // Récupérer les données d'une commande
  async getOrderData(orderId) {
    try {
      const orderRef = ref(database, `orders/${orderId}`);
      const orderSnapshot = await this.getSnapshot(orderRef);
      return orderSnapshot.val();
    } catch (error) {
      console.error('❌ Erreur récupération données commande:', error);
      return null;
    }
  }

  // Récupérer la position du driver
  async getDriverLocation(orderId) {
    try {
      const locationRef = ref(database, `orders/${orderId}/driver/location`);
      const locationSnapshot = await this.getSnapshot(locationRef);
      const locationData = locationSnapshot.val();
      
      if (locationData) {
        console.log('✅ Position driver trouvée:', locationData);
        return {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy || 5,
          speed: locationData.speed || 0,
          heading: locationData.heading || 0,
          timestamp: locationData.timestamp || Date.now()
        };
      } else {
        console.log('⚠️ Aucune position driver trouvée pour:', orderId);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur récupération position driver:', error);
      return null;
    }
  }

  // Récupérer le statut de livraison
  async getDeliveryStatus(orderId) {
    try {
      console.log('🔍 Récupération statut livraison pour:', orderId);
      const statusRef = ref(database, `orders/${orderId}/status`);
      const statusSnapshot = await this.getSnapshot(statusRef);
      const statusData = statusSnapshot.val();
      
      if (statusData) {
        console.log('✅ Statut livraison trouvé:', statusData);
        return {
          status: statusData.status || statusData,
          timestamp: statusData.timestamp || Date.now(),
          distance: statusData.distance || 0,
          estimatedTime: statusData.estimatedTime || 0
        };
      } else {
        console.log('⚠️ Aucun statut livraison trouvé pour:', orderId);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur récupération statut livraison:', error);
      return null;
    }
  }

  // Helper pour obtenir un snapshot
  getSnapshot(ref) {
    return new Promise((resolve, reject) => {
      let unsubscribe = null;
      
      try {
        unsubscribe = onValue(ref, (snapshot) => {
          if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
          }
          resolve(snapshot);
        }, (error) => {
          if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
          }
          reject(error);
        }, { onlyOnce: true });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Vérifier si une commande existe dans Firebase
  async checkOrderExists(orderId) {
    try {
      const orderRef = ref(database, `orders/${orderId}`);
      const snapshot = await this.getSnapshot(orderRef);
      const orderData = snapshot.val();
      
      if (orderData) {
        console.log('✅ CLIENT: Commande trouvée dans Firebase:', orderId);
        console.log('✅ CLIENT: Données commande:', {
          status: orderData.status,
          hasDriver: !!orderData.driver,
          hasDriverLocation: !!orderData.driver?.location
        });
      } else {
        console.log('❌ CLIENT: Commande NON trouvée dans Firebase:', orderId);
        console.log('❌ CLIENT: Le driver doit créer cette commande dans Firebase');
      }
    } catch (error) {
      console.error('❌ CLIENT: Erreur vérification commande:', error);
    }
  }
}

const firebaseService = new FirebaseTrackingService();

// Export nommé pour compatibilité
export const RealtimeTrackingService = firebaseService;

export default firebaseService;
