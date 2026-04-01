import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, set } from 'firebase/database';
import { database } from './firebase';
import { Platform } from 'react-native';

/** Topic FCM pour cibler tous les iPhones (campagnes Console : envoyer vers ce topic). */
export const FCM_IOS_BROADCAST_TOPIC = 'mayombe_ios';

class FCMService {
  async subscribeIosBroadcastTopic() {
    if (Platform.OS !== 'ios') return;
    try {
      await messaging().subscribeToTopic(FCM_IOS_BROADCAST_TOPIC);
      console.log('✅ Abonné au topic FCM:', FCM_IOS_BROADCAST_TOPIC);
    } catch (e) {
      console.log('⚠️ subscribeToTopic iOS:', e?.message || e);
    }
  }

  async registerAppWithFCM() {
    if (Platform.OS === 'ios') {
      try {
        await messaging().registerDeviceForRemoteMessages();
        const autoInitEnabled = messaging().isDeviceRegisteredForRemoteMessages;
        if (!autoInitEnabled) {
          await messaging().registerDeviceForRemoteMessages();
        }
      } catch (e) {
        console.log('FCM Register iOS Error:', e);
      }
    }
  }

  async requestPermission() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Permissons Push Android/iOS accordées.');
        await this.getFCMToken();
      } else {
        console.log('⚠️ Permissons Push Android/iOS refusées.');
      }
      return enabled;
    } catch (error) {
      console.log('❌ requestPermission error:', error.message);
      return false;
    }
  }

  async getFCMToken() {
    try {
      await this.registerAppWithFCM();
      
      const token = await messaging().getToken();
      if (token) {
        console.log('✅ FCM Token obtenu:', token);
        await this.saveTokenToDatabase(token);
        await this.subscribeIosBroadcastTopic();

        // Écouter le rafraîchissement des tokens
        messaging().onTokenRefresh(async (newToken) => {
          console.log('✅ FCM Token rafraîchi:', newToken);
          await this.saveTokenToDatabase(newToken);
          await this.subscribeIosBroadcastTopic();
        });
        
        // Gérer les notifications au premier plan
        this.unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
          console.log('🔔 Notification reçue en premier plan:', remoteMessage);
          
          // Afficher une alerte locale 
          const { Alert } = require('react-native');
          Alert.alert(
            remoteMessage.notification?.title || 'Nouvelle notification',
            remoteMessage.notification?.body || '',
            [{ text: 'OK' }]
          );
        });

        return token;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de l’obtention du token FCM:', error.message);
      return null;
    }
  }

  async saveTokenToDatabase(token, providedUserId = null) {
    try {
      // 1. Déterminer l'ID utilisateur (paramètre > storage)
      let userId = providedUserId;
      if (!userId) {
        userId = await AsyncStorage.getItem('fcmUserId') || await AsyncStorage.getItem('userId');
      }
      
      // 2. Déterminer le chemin dans la base de données
      let dbPath = '';
      if (userId) {
        dbPath = `fcm_tokens/${userId}`;
      } else {
        // Enregistrement pour utilisateur non identifié (utile pour les notifications globales)
        // On utilise un hash court du token pour éviter les caractères interdits et limiter la longueur
        const tokenHash = token.substring(0, 16).replace(/[^a-zA-Z0-9]/g, '_');
        dbPath = `fcm_tokens/unregistered/${tokenHash}`;
      }

      // 3. Préparer les métadonnées
      const metadata = {
        token: token,
        device_type: Platform.OS,
        updated_at: new Date().toISOString(),
        js_bundle_debug: __DEV__,
        apns_environment_hint: __DEV__ ? 'likely_apns_sandbox' : 'likely_apns_production',
        app_version: require('../../package.json').version || '1.3.9',
        last_userId: userId || 'anonymous'
      };

      // 4. Sauvegarder
      await set(ref(database, dbPath), metadata);
      console.log(`✅ Token FCM enregistré sous ${dbPath} (${userId ? 'Identifié' : 'Anonyme'})`);
      
      // 5. Sauvegarder aussi en local
      await AsyncStorage.setItem('fcmToken', token);
      
    } catch (error) {
      console.error('❌ Echec sauvegarde token FCM:', error.message);
    }
  }

  async forceGetAndShowToken() {
    const token = await this.getFCMToken();
    return token;
  }
}

export default new FCMService();
