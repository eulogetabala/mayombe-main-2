import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  // Connexion au WebSocket
  connect(userToken, orderId = null) {
    try {
      this.socket = io('wss://www.api-mayombe.mayombe-app.com', {
        auth: {
          token: userToken
        },
        transports: ['websocket', 'polling']
      });

      // Événements de connexion
      this.socket.on('connect', () => {
        console.log('🔗 WebSocket connecté');
        this.isConnected = true;
        
        // S'abonner aux mises à jour de commande si orderId fourni
        if (orderId) {
          this.socket.emit('subscribe-to-order', { orderId });
        }
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 WebSocket déconnecté');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion WebSocket:', error);
        this.isConnected = false;
      });

      // Événements de suivi de commande
      this.socket.on('order-status-update', (data) => {
        console.log('📦 Mise à jour statut commande:', data);
        this.notifyListeners('order-status-update', data);
      });

      this.socket.on('driver-location-update', (data) => {
        console.log('🚚 Mise à jour position livreur:', data);
        this.notifyListeners('driver-location-update', data);
      });

      this.socket.on('delivery-completed', (data) => {
        console.log('✅ Livraison terminée:', data);
        this.notifyListeners('delivery-completed', data);
      });

      this.socket.on('driver-assigned', (data) => {
        console.log('👤 Livreur attribué:', data);
        this.notifyListeners('driver-assigned', data);
      });

    } catch (error) {
      console.error('❌ Erreur lors de la connexion WebSocket:', error);
    }
  }

  // Déconnexion
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // S'abonner à un événement
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Se désabonner d'un événement
  unsubscribe(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notifier les listeners
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Erreur dans le callback ${event}:`, error);
        }
      });
    }
  }

  // Émettre un événement
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Vérifier la connexion
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

export default new WebSocketService(); 