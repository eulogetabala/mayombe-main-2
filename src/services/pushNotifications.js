import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  // Initialiser le service
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initialisation du service de push notifications...');

      // Demander les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Permissions de notifications non accordées');
        return false;
      }

      // Obtenir le token Expo Push
      if (Device.isDevice) {
        this.expoPushToken = await Notifications.getExpoPushTokenAsync({
          projectId: 'mayombe-ba11b',
        });
        console.log('📱 Token Expo Push obtenu:', this.expoPushToken.data);
      }

      // Configurer les notifications pour Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('delivery', {
          name: 'Livraison',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('geofencing', {
          name: 'Proximité',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF9800',
          sound: 'default',
        });
      }

      // Écouter les notifications reçues
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notification reçue:', notification);
        this.handleNotificationReceived(notification);
      });

      // Écouter les clics sur les notifications
      this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification cliquée:', response);
        this.handleNotificationResponse(response);
      });

      this.isInitialized = true;
      console.log('✅ Service de push notifications initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation push notifications:', error);
      return false;
    }
  }

  // Gérer les notifications reçues
  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;
    console.log('🔔 Notification reçue:', { title, body, data });
  }

  // Gérer les clics sur les notifications
  handleNotificationResponse(response) {
    const { title, body, data } = response.notification.request.content;
    console.log('👆 Notification cliquée:', { title, body, data });
  }

  // Envoyer une notification de proximité (geofencing)
  async sendProximityNotification(orderId, distance, estimatedTime) {
    try {
      const title = '🎯 Votre livreur approche !';
      const body = `Il est à ${Math.round(distance)}m de chez vous. Arrivée estimée dans ${Math.round(estimatedTime)} min.`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'geofencing',
            orderId,
            distance,
            estimatedTime,
          },
          sound: 'default',
        },
        trigger: null,
      });
      
      console.log('🎯 Notification de proximité envoyée:', { distance, estimatedTime });
    } catch (error) {
      console.error('❌ Erreur notification de proximité:', error);
    }
  }

  // Envoyer une notification de statut de livraison
  async sendDeliveryStatusNotification(orderId, status, additionalInfo = '') {
    try {
      let title, body;
      
      switch (status) {
        case 'en_route':
          title = '🚚 Votre commande est en route !';
          body = 'Votre livreur a pris la route vers vous.';
          break;
        case 'arrived':
          title = '📍 Votre livreur est arrivé !';
          body = 'Votre livreur est arrivé à destination.';
          break;
        case 'delivered':
          title = '✅ Livraison terminée !';
          body = 'Votre commande a été livrée avec succès.';
          break;
        default:
          title = '📦 Mise à jour de votre commande';
          body = `Statut: ${status}`;
      }
      
      if (additionalInfo) {
        body += ` ${additionalInfo}`;
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'delivery_status',
            orderId,
            status,
          },
          sound: 'default',
        },
        trigger: null,
      });
      
      console.log('📦 Notification de statut envoyée:', { status, orderId });
    } catch (error) {
      console.error('❌ Erreur notification de statut:', error);
    }
  }

  // Obtenir le token Expo Push
  getExpoPushToken() {
    return this.expoPushToken?.data;
  }

  // Nettoyer les listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
    
    this.isInitialized = false;
    console.log('🧹 Service de push notifications nettoyé');
  }
}

const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
