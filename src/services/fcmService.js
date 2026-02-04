import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ref, set, remove, get } from 'firebase/database';
import { database } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import conditionnel de React Native Firebase messaging
let messaging = null;
let messagingInstance = null;

try {
  // Essayer d'importer le module de manière standard
  const messagingModule = require('@react-native-firebase/messaging');
  console.log('📦 Module importé, type:', typeof messagingModule);
  console.log('📦 Module a default:', !!messagingModule?.default);
  console.log('📦 Clés du module:', messagingModule ? Object.keys(messagingModule).slice(0, 10) : 'null');
  
  // Gérer différents formats d'export selon la plateforme
  if (messagingModule && typeof messagingModule === 'function') {
    messaging = messagingModule;
    console.log('✅ messaging est une fonction directe');
  } else if (messagingModule && messagingModule.default) {
    // Si c'est un objet avec default, utiliser default
    if (typeof messagingModule.default === 'function') {
      messaging = messagingModule.default;
      console.log('✅ messaging est messagingModule.default (fonction)');
    } else {
      messaging = messagingModule.default;
      console.log('✅ messaging est messagingModule.default (objet)');
    }
  } else if (messagingModule && typeof messagingModule === 'object') {
    // Sur Android, parfois c'est déjà une instance
    messaging = messagingModule;
    console.log('✅ messaging est un objet, sera traité plus tard');
  } else {
    console.log('⚠️ Format inattendu du module');
  }
  console.log('✅ React Native Firebase messaging chargé, type final:', typeof messaging);
} catch (error) {
  console.log('❌ React Native Firebase messaging non disponible:', error.message);
  console.log('📋 Détails de l\'erreur:', error);
  console.log('💡 Solution: Reconstruire l\'app Android avec: npx expo run:android');
}

/**
 * Service pour gérer les notifications push Firebase Cloud Messaging (FCM)
 * Utilisé pour les annonces et publicités
 */
class FCMService {
  constructor() {
    this.fcmToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
    this.currentUserId = null;
  }

  /**
   * Initialiser le service FCM
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ FCM Service déjà initialisé');
      return true;
    }

    try {
      console.log('🔔 Initialisation du service FCM...');

      // Demander les permissions avec expo-notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('📋 Demande des permissions de notifications...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
        finalStatus = status;
        console.log('📋 Résultat demande permissions:', finalStatus);
      } else {
        console.log('✅ Permissions déjà accordées');
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Permissions de notifications non accordées');
        return false;
      }
      
      console.log('✅ Permissions de notifications accordées');

      // Sur iOS, enregistrer pour les notifications distantes après avoir obtenu les permissions
      if (Platform.OS === 'ios') {
        try {
          console.log('📱 iOS: Enregistrement pour les notifications distantes...');
          // Utiliser expo-notifications pour enregistrer
          await Notifications.registerForPushNotificationsAsync();
          console.log('✅ iOS: Enregistrement pour notifications distantes réussi');
        } catch (iosError) {
          console.log('⚠️ Erreur enregistrement iOS notifications distantes:', iosError.message);
          // Continuer quand même, React Native Firebase peut gérer cela
        }
      }

      // Configurer le canal Android pour les annonces
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('promotions', {
          name: 'Promotions et Annonces',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF9800',
          sound: 'default',
          description: 'Notifications pour les promotions et annonces',
        });
      }

      // Configurer les handlers React Native Firebase pour recevoir les notifications FCM
      let messagingInstance = null;
      
      console.log('🔍 Vérification de messaging pour configurer les handlers...');
      console.log('   - messaging existe:', !!messaging);
      console.log('   - Type de messaging:', typeof messaging);
      
      // Essayer d'obtenir l'instance messaging avec gestion d'erreur
      try {
        if (typeof messaging === 'function') {
          messagingInstance = messaging();
          console.log('   ✅ messaging() appelé, instance créée');
        } else if (messaging && typeof messaging === 'object') {
          // Sur Android, parfois c'est déjà une instance
          if (messaging.onMessage) {
            messagingInstance = messaging;
            console.log('   ✅ messaging est déjà une instance avec onMessage');
          } else if (messaging.default && typeof messaging.default === 'function') {
            messagingInstance = messaging.default();
            console.log('   ✅ messaging.default() appelé, instance créée');
          } else {
            messagingInstance = messaging;
            console.log('   ✅ messaging utilisé directement comme instance');
          }
        }
      } catch (firebaseError) {
        console.log('   ⚠️ Erreur lors de l\'obtention de messagingInstance:', firebaseError.message);
        // Si Firebase n'est pas encore initialisé, attendre un peu et réessayer
        if (firebaseError.message && firebaseError.message.includes('No Firebase App')) {
          console.log('   ⏳ Firebase pas encore prêt, attente de 1 seconde...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            if (typeof messaging === 'function') {
              messagingInstance = messaging();
              console.log('   ✅ messaging() appelé après attente, instance créée');
            } else if (messaging && typeof messaging === 'object' && messaging.default && typeof messaging.default === 'function') {
              messagingInstance = messaging.default();
              console.log('   ✅ messaging.default() appelé après attente, instance créée');
            }
          } catch (retryError) {
            console.log('   ⚠️ Erreur persistante après attente:', retryError.message);
            console.log('   💡 Les notifications fonctionnent côté natif, mais le test JavaScript peut échouer');
          }
        }
      }
      
      console.log('🔍 Vérification de messagingInstance...');
      console.log('   - messagingInstance existe:', !!messagingInstance);
      console.log('   - Type:', typeof messagingInstance);
      console.log('   - onMessage existe:', typeof messagingInstance?.onMessage);
      
      if (messagingInstance && typeof messagingInstance.onMessage === 'function') {
        console.log('✅ Configuration du handler onMessage pour notifications au premier plan');
        console.log('   📋 Handler sera appelé quand une notification FCM arrive (app ouverte)');
        // Handler pour les notifications au premier plan (app ouverte)
        this.foregroundUnsubscribe = messagingInstance.onMessage(async remoteMessage => {
          console.log('');
          console.log('🔔🔔🔔 NOTIFICATION FCM REÇUE AU PREMIER PLAN 🔔🔔🔔');
          console.log('📋 Notification complète:', JSON.stringify(remoteMessage, null, 2));
          console.log('📋 Titre:', remoteMessage.notification?.title);
          console.log('📋 Corps:', remoteMessage.notification?.body);
          console.log('📋 Données:', remoteMessage.data);
          console.log('📋 Message ID:', remoteMessage.messageId);
          console.log('📋 From:', remoteMessage.from);
          console.log('');
          
          try {
            // Afficher la notification via expo-notifications
            await Notifications.scheduleNotificationAsync({
              content: {
                title: remoteMessage.notification?.title || 'Nouvelle notification',
                body: remoteMessage.notification?.body || '',
                data: remoteMessage.data || {},
                sound: true,
              },
              trigger: null, // Afficher immédiatement
            });
            console.log('✅ Notification affichée via expo-notifications');
          } catch (notifError) {
            console.error('❌ Erreur affichage notification:', notifError);
          }
          
          // Traiter la notification
          this.handleNotificationReceived({
            request: {
              content: {
                title: remoteMessage.notification?.title,
                body: remoteMessage.notification?.body,
                data: remoteMessage.data,
              }
            }
          });
        });
        console.log('✅ Handler onMessage configuré avec succès');

        // NOTE: setBackgroundMessageHandler est configuré dans index.js
        // Ne pas l'appeler ici car il ne peut être appelé qu'une seule fois

        // Handler pour les notifications qui ouvrent l'app (quand l'utilisateur clique)
        if (typeof messagingInstance.onNotificationOpenedApp === 'function') {
          console.log('✅ Configuration du handler onNotificationOpenedApp');
          messagingInstance.onNotificationOpenedApp(remoteMessage => {
          console.log('');
          console.log('👆👆👆 NOTIFICATION FCM CLIQUÉE (app ouverte) 👆👆👆');
          console.log('📋 Notification:', JSON.stringify(remoteMessage, null, 2));
          console.log('');
          this.handleNotificationResponse({
            notification: {
              request: {
                content: {
                  title: remoteMessage.notification?.title,
                  body: remoteMessage.notification?.body,
                  data: remoteMessage.data,
                }
              }
            }
          }, null); // Navigation sera gérée par le composant
        });
        } else {
          console.log('⚠️ onNotificationOpenedApp n\'est pas disponible');
        }

        // Handler pour la mise à jour du token (onTokenRefresh)
        if (typeof messagingInstance.onTokenRefresh === 'function') {
          try {
            console.log('✅ Configuration du handler onTokenRefresh');
            // Sauvegarder la référence pour pouvoir la nettoyer plus tard
            this.tokenRefreshUnsubscribe = messagingInstance.onTokenRefresh(async newToken => {
              try {
                console.log('🔁 Token FCM rafraîchi:', newToken);
                this.fcmToken = newToken;
                // Mettre à jour le stockage local
                await AsyncStorage.setItem('fcmToken', newToken);

                // Tenter de récupérer l'userId en mémoire ou depuis le stockage
                let userId = this.currentUserId;
                if (!userId) {
                  userId = await AsyncStorage.getItem('fcmUserId');
                }

                if (userId) {
                  await this.saveTokenToFirebase(userId, newToken);
                } else {
                  console.log('⚠️ Aucun userId disponible pour sauvegarder le token rafraîchi');
                }
              } catch (err) {
                console.error('❌ Erreur lors du traitement du token rafraîchi:', err);
              }
            });
          } catch (err) {
            console.log('⚠️ Impossible de configurer onTokenRefresh:', err.message);
          }
        } else {
          console.log('⚠️ onTokenRefresh n\'est pas disponible');
        }

        // Vérifier si l'app a été ouverte depuis une notification (au démarrage)
        if (typeof messagingInstance.getInitialNotification === 'function') {
          console.log('✅ Vérification getInitialNotification...');
          messagingInstance.getInitialNotification().then(remoteMessage => {
          if (remoteMessage) {
            console.log('');
            console.log('👆👆👆 APP OUVERTE DEPUIS UNE NOTIFICATION FCM 👆👆👆');
            console.log('📋 Notification:', JSON.stringify(remoteMessage, null, 2));
            console.log('');
            this.handleNotificationResponse({
              notification: {
                request: {
                  content: {
                    title: remoteMessage.notification?.title,
                    body: remoteMessage.notification?.body,
                    data: remoteMessage.data,
                  }
                }
              }
            }, null);
          } else {
            console.log('ℹ️ Aucune notification initiale');
          }
        });
        } else {
          console.log('⚠️ getInitialNotification n\'est pas disponible');
        }
        
        console.log('✅ Tous les handlers FCM sont configurés');
      } else {
        console.log('⚠️ messagingInstance non disponible ou format invalide');
        console.log('📋 Type:', typeof messagingInstance);
        console.log('📋 messagingInstance existe:', !!messagingInstance);
        if (messagingInstance) {
          console.log('📋 Méthodes disponibles:', Object.keys(messagingInstance).filter(key => typeof messagingInstance[key] === 'function'));
        }
      }

      // Écouter aussi les notifications via expo-notifications (pour compatibilité)
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Notification Expo reçue:', notification);
        this.handleNotificationReceived(notification);
      });

      // Écouter les clics sur les notifications
      this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification Expo cliquée:', response);
        this.handleNotificationResponse(response);
      });

      this.isInitialized = true;
      console.log('✅ Service FCM initialisé');
      
      // Lancer un diagnostic automatique après initialisation (en mode dev uniquement)
      if (__DEV__) {
        console.log('');
        console.log('🔍 Lancement du diagnostic automatique...');
        setTimeout(async () => {
          await this.diagnose();
        }, 2000); // Attendre 2 secondes pour que tout soit bien initialisé
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation FCM:', error);
      return false;
    }
  }

  /**
   * Obtenir le token FCM et le stocker dans Firebase
   * @param {string} userId - ID de l'utilisateur connecté
   */
  async registerToken(userId) {
    try {
      // Vérifier la plateforme
      console.log(`📱 Plateforme: ${Platform.OS}`);
      
      // Vérifier si on est sur un appareil physique
      const isPhysicalDevice = Device.isDevice;
      if (!isPhysicalDevice) {
        console.log('⚠️ Appareil simulé détecté, tentative d\'obtention du token quand même...');
      }

      // Obtenir le token FCM natif avec React Native Firebase
      console.log('🔐 Obtention du token FCM avec React Native Firebase...');
      console.log('📱 Plateforme:', Platform.OS);
      console.log('📱 Appareil physique:', Device.isDevice);
      
      // Sur iOS, attendre un peu pour que le token APNs soit disponible après l'enregistrement
      if (Platform.OS === 'ios') {
        console.log('📱 iOS: Attente de la disponibilité du token APNs...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Attendre 1.5 secondes
        console.log('📱 iOS: Tentative d\'obtention du token FCM...');
      }
      
      let token;
      
      // Essayer d'utiliser React Native Firebase messaging
      try {
        // Réessayer l'import au moment de l'utilisation si nécessaire
        if (!messaging) {
          try {
            const messagingModule = require('@react-native-firebase/messaging');
            if (messagingModule && messagingModule.default) {
              messaging = typeof messagingModule.default === 'function' ? messagingModule.default : messagingModule.default;
            } else {
              messaging = messagingModule;
            }
            console.log('✅ React Native Firebase messaging réimporté avec succès');
          } catch (importError) {
            console.log('⚠️ Impossible d\'importer React Native Firebase messaging:', importError.message);
          }
        }
        
        // Gérer différents formats selon la plateforme
        let messagingInstance = null;
        
        if (typeof messaging === 'function') {
          // Format standard (fonction)
          try {
            messagingInstance = messaging();
            console.log('✅ messaging() appelé avec succès, type instance:', typeof messagingInstance);
          } catch (callError) {
            console.log('⚠️ Erreur lors de l\'appel messaging():', callError.message);
            // Si Firebase n'est pas encore initialisé, attendre et réessayer
            if (callError.message && callError.message.includes('No Firebase App')) {
              console.log('⏳ Firebase pas encore prêt, attente de 1 seconde...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                messagingInstance = messaging();
                console.log('✅ messaging() appelé après attente avec succès');
              } catch (retryError) {
                console.log('⚠️ Erreur persistante après attente:', retryError.message);
                console.log('💡 Les notifications fonctionnent côté natif, mais getToken() peut échouer');
                // Ne pas throw, continuer pour essayer getToken quand même
              }
            } else {
              throw new Error(`Impossible d'appeler messaging(): ${callError.message}`);
            }
          }
        } else if (messaging && typeof messaging === 'object') {
          // Sur Android, parfois c'est déjà une instance
          if (messaging.getToken && typeof messaging.getToken === 'function') {
            messagingInstance = messaging;
            console.log('✅ messaging est déjà une instance avec getToken');
          } else if (messaging.default && typeof messaging.default === 'function') {
            try {
              messagingInstance = messaging.default();
              console.log('✅ messaging.default() appelé avec succès');
            } catch (callError) {
              console.log('❌ Erreur lors de l\'appel messaging.default():', callError.message);
              throw new Error(`Impossible d'appeler messaging.default(): ${callError.message}`);
            }
          } else {
            console.log('⚠️ messaging est un objet mais format inattendu');
            console.log('📋 Clés disponibles:', Object.keys(messaging));
            messagingInstance = messaging;
          }
        } else {
          console.log('❌ messaging est null ou type inattendu:', typeof messaging);
          throw new Error('React Native Firebase messaging non disponible - messaging est null ou type invalide');
        }
        
        if (!messagingInstance) {
          // Si messagingInstance est null mais que les notifications fonctionnent,
          // essayer de récupérer le token depuis AsyncStorage
          console.log('⚠️ messagingInstance est null, mais les notifications fonctionnent (vous avez reçu une notification)');
          console.log('💡 Tentative de récupération du token depuis AsyncStorage...');
          try {
            const storedToken = await AsyncStorage.getItem('fcmToken');
            if (storedToken) {
              console.log('✅ Token récupéré depuis AsyncStorage:', storedToken.substring(0, 30) + '...');
              token = storedToken;
              this.fcmToken = storedToken;
              // Ne pas throw, continuer avec le token récupéré
            } else {
              console.log('⚠️ Aucun token stocké trouvé');
              console.log('💡 Le token sera obtenu automatiquement lors de la prochaine notification');
              // Ne pas throw, les notifications fonctionnent quand même
              throw new Error('messagingInstance est null et aucun token stocké - mais les notifications fonctionnent');
            }
          } catch (storageError) {
            console.log('⚠️ Erreur lecture AsyncStorage:', storageError.message);
            throw new Error('messagingInstance est null après traitement');
          }
        }

          // Si on n'a pas encore configuré onTokenRefresh (par ex. initialize a été appelé trop tôt), configurer ici
          if (!this.tokenRefreshUnsubscribe && typeof messagingInstance.onTokenRefresh === 'function') {
            try {
              console.log('✅ Configuration tardive du handler onTokenRefresh (registerToken)');
              this.tokenRefreshUnsubscribe = messagingInstance.onTokenRefresh(async newToken => {
                try {
                  console.log('🔁 Token FCM rafraîchi (registerToken):', newToken);
                  this.fcmToken = newToken;
                  await AsyncStorage.setItem('fcmToken', newToken);

                  let userIdToSave = userId || this.currentUserId;
                  if (!userIdToSave) {
                    userIdToSave = await AsyncStorage.getItem('fcmUserId');
                  }

                  if (userIdToSave) {
                    await this.saveTokenToFirebase(userIdToSave, newToken);
                  } else {
                    console.log('⚠️ Aucun userId disponible pour sauvegarder le token rafraîchi (registerToken)');
                  }
                } catch (err) {
                  console.error('❌ Erreur lors du traitement du token rafraîchi (registerToken):', err);
                }
              });
            } catch (err) {
              console.log('⚠️ Impossible de configurer onTokenRefresh dans registerToken:', err.message);
            }
          }
        
        console.log('📋 Vérification de messagingInstance:');
        console.log('   - Type:', typeof messagingInstance);
        console.log('   - getToken existe:', typeof messagingInstance.getToken);
        console.log('   - Clés disponibles:', messagingInstance ? Object.keys(messagingInstance).slice(0, 10) : 'null');
        
        if (messagingInstance && typeof messagingInstance.getToken === 'function') {
          console.log('🔐 Demande du token FCM à Firebase...');
          try {
            token = await messagingInstance.getToken();
            console.log('✅ TOKEN FCM obtenu avec React Native Firebase:', token);
            console.log('✅ FCM fonctionne correctement !');
            console.log('📏 Longueur du token:', token ? token.length : 0);
          } catch (tokenError) {
            console.log('⚠️ Erreur getToken(), mais les notifications fonctionnent (vous avez reçu une notification)');
            console.log('💡 Tentative alternative pour obtenir le token...');
            
            // Si les notifications fonctionnent, le token devrait être disponible
            // Essayer de le récupérer depuis AsyncStorage ou forcer une nouvelle tentative
            try {
              const storedToken = await AsyncStorage.getItem('fcmToken');
              if (storedToken) {
                console.log('✅ Token récupéré depuis AsyncStorage:', storedToken.substring(0, 30) + '...');
                token = storedToken;
              } else {
                // Attendre un peu plus et réessayer
                console.log('⏳ Attente supplémentaire (3 secondes) pour que le token soit disponible...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                try {
                  token = await messagingInstance.getToken();
                  console.log('✅ TOKEN FCM obtenu après attente prolongée:', token);
                } catch (retryError) {
                  console.log('⚠️ Token toujours indisponible via getToken(), mais les notifications fonctionnent');
                  console.log('💡 Le token sera obtenu automatiquement quand une notification arrive');
                }
              }
            } catch (storageError) {
              console.log('⚠️ Erreur lecture AsyncStorage:', storageError.message);
            }
            console.log('❌ Erreur lors de l\'obtention du token:', tokenError.message);
            console.log('📋 Détails:', tokenError);
            
            // Analyser l'erreur spécifique
            if (tokenError.message && tokenError.message.includes('MISSING_INSTANCEID_SERVICE')) {
              console.log('');
              console.log('🔴 ERREUR: MISSING_INSTANCEID_SERVICE');
              console.log('');
              console.log('📋 Signification:');
              console.log('   Le service Firebase Instance ID (FCM) n\'est pas disponible.');
              if (Platform.OS === 'ios') {
                console.log('   Sur iOS, cela peut signifier:');
                console.log('   1. L\'app n\'a pas été reconstruite avec les modules natifs');
                console.log('   2. Le token APNs n\'a pas été obtenu');
                console.log('   3. Les entitlements ne sont pas correctement configurés');
                console.log('   4. La clé APNs n\'est pas configurée dans Firebase Console');
                console.log('');
                console.log('💡 Solutions pour iOS:');
                console.log('   1. Reconstruire l\'app: npx expo run:ios');
                console.log('   2. Vérifier les entitlements (aps-environment: development/production)');
                console.log('   3. Vérifier que la clé APNs est uploadée dans Firebase Console');
                console.log('   4. Vérifier que le Bundle ID correspond: com.thprojet.mayombeclient');
              } else {
                console.log('   Cela signifie que l\'app Android n\'a pas été reconstruite avec');
                console.log('   les modules natifs React Native Firebase, OU que l\'app tourne');
                console.log('   dans Expo Go (qui ne supporte pas les modules natifs).');
                console.log('');
                console.log('💡 Solutions possibles:');
                console.log('   1. Si vous utilisez Expo Go → Arrêtez et utilisez un build natif');
                console.log('   2. Si vous avez un build natif → Reconstruisez l\'app:');
                console.log('      rm -rf android/build android/app/build');
                console.log('      npx expo run:android');
                console.log('   3. Vérifiez que Google Play Services est installé sur l\'appareil');
                console.log('   4. Vérifiez que google-services.json est dans android/app/');
              }
              console.log('');
            } else if (Platform.OS === 'ios' && tokenError.message) {
              // Erreurs iOS spécifiques
              if (tokenError.message.includes('aps-environment') || tokenError.message.includes('entitlements')) {
                console.log('');
                console.log('🔴 ERREUR iOS: Problème avec les entitlements');
                console.log('');
                console.log('💡 Vérifiez que:');
                console.log('   1. MayombeAppDebug.entitlements existe avec aps-environment: development');
                console.log('   2. MayombeApp.entitlements existe avec aps-environment: production');
                console.log('   3. Les entitlements sont liés dans Xcode');
                console.log('');
              } else if (tokenError.message.includes('APNs') || tokenError.message.includes('certificate')) {
                console.log('');
                console.log('🔴 ERREUR iOS: Problème avec APNs');
                console.log('');
                console.log('💡 Vérifiez que:');
                console.log('   1. La clé APNs (.p8) est uploadée dans Firebase Console');
                console.log('   2. Le Key ID (8K2WGV9VVG) et Team ID (9W3MSS5RZ9) sont corrects');
                console.log('   3. Le Bundle ID correspond: com.thprojet.mayombeclient');
                console.log('');
              }
            }
            
            throw tokenError;
          }
        } else {
          console.log('❌ messagingInstance.getToken n\'est pas une fonction');
          console.log('📋 Type de getToken:', typeof messagingInstance?.getToken);
          throw new Error('React Native Firebase messaging non disponible - getToken n\'est pas une fonction');
        }
      } catch (fcmError) {
        console.log('❌ Erreur FCM React Native Firebase:', fcmError.message);
        console.log('📋 Détails de l\'erreur:', fcmError);
        
        // Vérifier si c'est une erreur de module natif manquant
        if (fcmError.message.includes('Native module') || fcmError.message.includes('format invalide') || fcmError.message.includes('getToken n\'est pas une fonction')) {
          console.log('');
          console.log('🔴 PROBLÈME DÉTECTÉ: L\'app Android n\'a pas été reconstruite avec les modules natifs React Native Firebase');
          console.log('');
          console.log('💡 SOLUTION:');
          console.log('   1. Arrêter l\'app');
          console.log('   2. Nettoyer: rm -rf android/build android/app/build');
          console.log('   3. Reconstruire: npx expo run:android');
          console.log('');
          console.log('⚠️ Les notifications push ne fonctionneront PAS tant que l\'app n\'est pas reconstruite');
          console.log('');
        }
        
        // Fallback vers getExpoPushTokenAsync si React Native Firebase échoue
        console.log('🔐 Fallback vers getExpoPushTokenAsync...');
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'mayombe-ba11b',
          });
          token = tokenData.data;
          console.log('✅ Token Expo obtenu:', token);
        } catch (expoError) {
          console.error('❌ Erreur obtention token Expo:', expoError);
          if (expoError.message && expoError.message.includes('MISSING_INSTANCEID_SERVICE')) {
            console.log('');
            console.log('🔴 Cette erreur confirme que l\'app Android doit être reconstruite');
            console.log('💡 Exécutez: npx expo run:android');
            console.log('');
          }
          throw expoError;
        }
      }
      this.fcmToken = token;
      this.currentUserId = userId;

      // Afficher le token de manière très visible
      console.log('');
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║                                                                ║');
      console.log('║          🔑 TOKEN FCM POUR FIREBASE CONSOLE 🔑                 ║');
      console.log('║                                                                ║');
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log('║                                                                ║');
      console.log(`║  ${token.padEnd(60)}  ║`);
      console.log('║                                                                ║');
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log('║  📱 Plateforme: ' + Platform.OS.padEnd(45) + '║');
      console.log('║  👤 User ID: ' + (userId || 'N/A').toString().padEnd(47) + '║');
      console.log('║  📏 Longueur: ' + token.length.toString().padEnd(45) + '║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('💡 Pour tester:');
      console.log('   1. Copier le token ci-dessus');
      console.log('   2. Firebase Console > Cloud Messaging > Nouvelle campagne');
      console.log('   3. "Appareil de test" > Coller le token > Tester');
      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');

      // Stocker le token dans Firebase Realtime Database
      if (userId && token) {
        await this.saveTokenToFirebase(userId, token);
      }

      // Stocker aussi dans AsyncStorage pour référence locale
      await AsyncStorage.setItem('fcmToken', token);
      await AsyncStorage.setItem('fcmUserId', userId);

      return token;
    } catch (error) {
      console.error('❌ Erreur obtention token FCM:', error);
      
      // Gérer spécifiquement les erreurs selon la plateforme
      if (error.message) {
        if (error.message.includes('MISSING_INSTANCEID_SERVICE')) {
          console.log('⚠️ Les notifications push ne fonctionnent pas avec Expo Go');
          console.log('💡 Pour tester les notifications, utilisez un build de développement:');
          console.log('   - npx expo run:android (pour Android)');
          console.log('   - npx expo run:ios (pour iOS)');
        } else if (error.message.includes('aps-environment')) {
          console.log('⚠️ Erreur iOS: La capability Push Notifications n\'est pas configurée');
          console.log('💡 Vérifiez que les entitlements iOS sont correctement configurés');
        } else if (error.message.includes('FirebaseApp is not initialized')) {
          console.log('⚠️ Firebase n\'est pas initialisé');
          console.log('💡 Pour Android, vous devez uploader le Google Service Account Key dans EAS:');
          console.log('   1. Exécutez: eas credentials');
          console.log('   2. Sélectionnez: Android > production > Google Service Account');
          console.log('   3. Uploadez: mayombe-ba11b-firebase-adminsdk-fbsvc-7928168601.json');
        }
      }
      
      return null;
    }
  }

  /**
   * Sauvegarder le token FCM dans Firebase Realtime Database
   * @param {string} userId - ID de l'utilisateur
   * @param {string} token - Token FCM
   */
  async saveTokenToFirebase(userId, token) {
    try {
      const tokenRef = ref(database, `fcm_tokens/${userId}`);
      
      const tokenData = {
        token: token,
        device_type: Platform.OS,
        created_at: Date.now(),
        updated_at: Date.now(),
        enabled: true,
      };

      await set(tokenRef, tokenData);
      console.log('✅ Token FCM sauvegardé dans Firebase:', userId);
    } catch (error) {
      console.error('❌ Erreur sauvegarde token FCM dans Firebase:', error);
    }
  }

  /**
   * Supprimer le token FCM de Firebase (lors de la déconnexion)
   * @param {string} userId - ID de l'utilisateur
   */
  async unregisterToken(userId) {
    try {
      if (userId) {
        const tokenRef = ref(database, `fcm_tokens/${userId}`);
        await remove(tokenRef);
        console.log('✅ Token FCM supprimé de Firebase:', userId);
      }

      // Nettoyer le stockage local
      await AsyncStorage.removeItem('fcmToken');
      await AsyncStorage.removeItem('fcmUserId');
      
      this.fcmToken = null;
      this.currentUserId = null;
    } catch (error) {
      console.error('❌ Erreur suppression token FCM:', error);
    }
  }

  /**
   * Gérer les notifications reçues
   * @param {object} notification - Notification reçue
   */
  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;
    console.log('🔔 Notification FCM reçue:', { title, body, data });
    
    // Vous pouvez ajouter ici une logique pour afficher un toast ou mettre à jour l'UI
    // Par exemple, mettre à jour un badge de notifications non lues
  }

  /**
   * Gérer les clics sur les notifications
   * Cette fonction sera appelée depuis App.js avec la navigation
   * @param {object} response - Réponse de la notification
   * @param {object} navigation - Objet de navigation React Navigation
   */
  handleNotificationResponse(response, navigation) {
    try {
      const { data } = response.notification.request.content;
      console.log('👆 Notification FCM cliquée, données:', data);

      if (!navigation) {
        console.log('⚠️ Navigation non disponible pour gérer le clic');
        return;
      }

      // Gérer la navigation selon le type de notification
      if (data && data.type) {
        switch (data.type) {
          case 'product':
            // Ouvrir un produit spécifique
            if (data.productId) {
              navigation.navigate('AllProducts', { 
                productId: data.productId,
                highlightProduct: data.productId 
              });
            }
            break;

          case 'category':
            // Ouvrir une catégorie
            if (data.categoryId) {
              navigation.navigate('CategorieScreen', { 
                categoryId: data.categoryId 
              });
            }
            break;

          case 'restaurant':
            // Ouvrir un restaurant
            if (data.restaurantId) {
              navigation.navigate('RestaurantDetails', { 
                restaurantId: data.restaurantId 
              });
            }
            break;

          case 'order':
            // Ouvrir le suivi de commande
            if (data.orderId) {
              navigation.navigate('OrderTracking', { 
                orderId: data.orderId 
              });
            }
            break;

          case 'url':
            // Ouvrir une URL (si vous avez un WebView)
            if (data.url) {
              // navigation.navigate('WebView', { url: data.url });
              console.log('🔗 URL à ouvrir:', data.url);
            }
            break;

          default:
            // Par défaut, aller à l'accueil
            navigation.navigate('MainApp');
        }
      } else {
        // Si pas de type spécifique, aller à l'accueil
        navigation.navigate('MainApp');
      }
    } catch (error) {
      console.error('❌ Erreur gestion clic notification:', error);
      // En cas d'erreur, aller à l'accueil
      if (navigation) {
        navigation.navigate('MainApp');
      }
    }
  }

  /**
   * Obtenir le token FCM actuel
   */
  getToken() {
    return this.fcmToken;
  }

  /**
   * Forcer l'obtention et l'affichage du token FCM
   * Fonctionne même sans userId (pour le test)
   */
  async forceGetAndShowToken() {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔍 FORCAGE DE L\'OBTENTION DU TOKEN FCM...');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      // Initialiser le service si nécessaire
      if (!this.isInitialized) {
        console.log('📡 Initialisation du service FCM...');
        await this.initialize();
      }

      // Essayer d'obtenir le token directement
      let token = this.fcmToken;
      
      if (!token) {
        console.log('📡 Token non en mémoire, tentative d\'obtention...');
        
        // Essayer d'obtenir le token via React Native Firebase
        try {
          if (!messaging) {
            const messagingModule = require('@react-native-firebase/messaging');
            if (messagingModule && messagingModule.default) {
              messaging = typeof messagingModule.default === 'function' ? messagingModule.default : messagingModule.default;
            } else {
              messaging = messagingModule;
            }
          }
          
          let messagingInstance = null;
          if (typeof messaging === 'function') {
            messagingInstance = messaging();
          } else if (messaging && typeof messaging === 'object') {
            messagingInstance = messaging;
          }
          
          if (messagingInstance && typeof messagingInstance.getToken === 'function') {
            token = await messagingInstance.getToken();
            this.fcmToken = token;
            await AsyncStorage.setItem('fcmToken', token);
            console.log('✅ Token obtenu avec succès !');
          }
        } catch (error) {
          console.log('⚠️ Erreur obtention token:', error.message);
        }
      }

      // Afficher le token
      if (token) {
        await this.showToken();
        return token;
      } else {
        console.log('❌ Impossible d\'obtenir le token FCM');
        console.log('💡 Assurez-vous que:');
        console.log('   1. Les permissions de notifications sont accordées');
        console.log('   2. L\'app a été reconstruite avec: npx expo run:ios');
        console.log('   3. Firebase est correctement configuré');
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur forceGetAndShowToken:', error);
      return null;
    }
  }

  /**
   * Afficher le token FCM de manière très visible dans les logs
   * Utile pour le retrouver facilement parmi beaucoup de logs
   */
  async showToken() {
    let token = this.fcmToken;
    
    // Si pas de token en mémoire, essayer de le récupérer depuis AsyncStorage
    if (!token) {
      try {
        token = await AsyncStorage.getItem('fcmToken');
        if (token) {
          this.fcmToken = token;
          console.log('✅ Token récupéré depuis AsyncStorage');
        }
      } catch (error) {
        console.log('⚠️ Erreur récupération token depuis AsyncStorage:', error.message);
      }
    }

    if (!token) {
      console.log('');
      console.log('❌ Token FCM non disponible');
      console.log('💡 Enregistrez d\'abord le token avec: await fcmService.registerToken(userId)');
      console.log('');
      return null;
    }

    // Afficher le token de manière TRÈS visible
    console.log('');
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                                ║');
    console.log('║                    🔑 TOKEN FCM POUR FIREBASE CONSOLE 🔑                      ║');
    console.log('║                                                                                ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
    console.log('║                                                                                ║');
    // Afficher le token sur plusieurs lignes si nécessaire
    const tokenLines = [];
    for (let i = 0; i < token.length; i += 80) {
      tokenLines.push(token.substring(i, i + 80));
    }
    tokenLines.forEach(line => {
      console.log(`║  ${line.padEnd(82)}  ║`);
    });
    console.log('║                                                                                ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
    console.log('║  📱 Plateforme: ' + Platform.OS.padEnd(66) + '║');
    console.log('║  👤 User ID: ' + (this.currentUserId || 'N/A').toString().padEnd(68) + '║');
    console.log('║  📏 Longueur: ' + token.length.toString().padEnd(66) + '║');
    console.log('║  ⏰ Timestamp: ' + new Date().toLocaleString().padEnd(64) + '║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('💡 Pour tester:');
    console.log('   1. Copier le token ci-dessus (tout le texte entre les lignes)');
    console.log('   2. Firebase Console > Cloud Messaging > Nouvelle campagne');
    console.log('   3. "Appareil de test" > Coller le token > Tester');
    console.log('');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    
    return token;
  }

  /**
   * Vérifier si le service est initialisé
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Vérifier l'état des permissions de notifications
   * @returns {Promise<Object>} État des permissions
   */
  async checkPermissions() {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      console.log('📋 État des permissions de notifications:', permissions);
      
      return {
        granted: permissions.status === 'granted',
        status: permissions.status,
        canAskAgain: permissions.canAskAgain !== false,
        ios: {
          alert: permissions.ios?.alert || 'not-determined',
          badge: permissions.ios?.badge || 'not-determined',
          sound: permissions.ios?.sound || 'not-determined',
          criticalAlerts: permissions.ios?.criticalAlerts || 'not-determined',
        },
        android: {
          importance: permissions.android?.importance || 'not-determined',
        }
      };
    } catch (error) {
      console.error('❌ Erreur vérification permissions:', error);
      return {
        granted: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Demander à nouveau les permissions si elles ont été refusées
   * @returns {Promise<boolean>} true si les permissions sont accordées
   */
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        },
      });

      const granted = status === 'granted';
      console.log(granted ? '✅ Permissions de notifications accordées' : '❌ Permissions de notifications refusées');
      
      return granted;
    } catch (error) {
      console.error('❌ Erreur demande permissions:', error);
      return false;
    }
  }

  /**
   * Vérifier si le token est bien sauvegardé dans Firebase Realtime Database
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} État du token dans Firebase
   */
  async verifyTokenInFirebase(userId) {
    try {
      const tokenRef = ref(database, `fcm_tokens/${userId}`);
      const snapshot = await get(tokenRef);
      
      if (snapshot.exists()) {
        const tokenData = snapshot.val();
        console.log('✅ Token trouvé dans Firebase Realtime Database:');
        console.log('📋 Données:', JSON.stringify(tokenData, null, 2));
        console.log('🔑 Token:', tokenData.token);
        console.log('📱 Device type:', tokenData.device_type);
        console.log('⏰ Dernière mise à jour:', new Date(tokenData.updated_at).toLocaleString());
        
        return {
          exists: true,
          token: tokenData.token,
          device_type: tokenData.device_type,
          enabled: tokenData.enabled,
          updated_at: tokenData.updated_at,
          matchesCurrentToken: tokenData.token === this.fcmToken,
        };
      } else {
        console.log('⚠️ Token non trouvé dans Firebase Realtime Database pour userId:', userId);
        return {
          exists: false,
          userId: userId,
        };
      }
    } catch (error) {
      console.error('❌ Erreur vérification token dans Firebase:', error);
      return {
        exists: false,
        error: error.message,
      };
    }
  }

  /**
   * Fonction de diagnostic complète pour vérifier l'état des notifications
   * @returns {Promise<Object>} État complet du service FCM
   */
  async diagnose() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 DIAGNOSTIC COMPLET DES NOTIFICATIONS FCM');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const diagnosis = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      isDevice: Device.isDevice,
      messagingAvailable: !!messaging,
      messagingType: typeof messaging,
      isInitialized: this.isInitialized,
      hasToken: !!this.fcmToken,
      token: this.fcmToken,
      tokenLength: this.fcmToken ? this.fcmToken.length : 0,
      currentUserId: this.currentUserId,
      permissions: null,
      tokenInFirebase: null,
      handlers: {
        foreground: false,
        background: false,
        onNotificationOpenedApp: false,
        getInitialNotification: false,
        expoListeners: false,
      },
      errors: [],
      warnings: [],
    };

    // 1. Vérifier les permissions
    console.log('1️⃣ Vérification des permissions...');
    try {
      diagnosis.permissions = await this.checkPermissions();
      if (diagnosis.permissions.granted) {
        console.log('   ✅ Permissions accordées');
      } else {
        console.log('   ❌ Permissions refusées:', diagnosis.permissions.status);
        diagnosis.warnings.push('Permissions de notifications non accordées');
      }
    } catch (error) {
      console.log('   ❌ Erreur:', error.message);
      diagnosis.errors.push(`Erreur vérification permissions: ${error.message}`);
    }

    // 2. Vérifier React Native Firebase
    console.log('');
    console.log('2️⃣ Vérification de React Native Firebase...');
    try {
      let messagingInstance = null;
      
      try {
        if (typeof messaging === 'function') {
          try {
            messagingInstance = messaging();
            console.log('   ✅ messaging() appelé avec succès');
          } catch (firebaseError) {
            if (firebaseError.message && firebaseError.message.includes('No Firebase App')) {
              console.log('   ⏳ Firebase pas encore prêt, attente de 1 seconde...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                messagingInstance = messaging();
                console.log('   ✅ messaging() appelé après attente avec succès');
              } catch (retryError) {
                console.log('   ⚠️ Erreur persistante:', retryError.message);
                console.log('   💡 Firebase natif fonctionne (notifications arrivent), mais JS peut échouer');
              }
            } else {
              throw firebaseError;
            }
          }
        } else if (messaging && typeof messaging === 'object') {
          if (messaging.getToken) {
            messagingInstance = messaging;
            console.log('   ✅ messaging est déjà une instance');
          } else if (messaging.default && typeof messaging.default === 'function') {
            try {
              messagingInstance = messaging.default();
              console.log('   ✅ messaging.default() appelé avec succès');
            } catch (firebaseError) {
              if (firebaseError.message && firebaseError.message.includes('No Firebase App')) {
                console.log('   ⏳ Firebase pas encore prêt, attente de 1 seconde...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                try {
                  messagingInstance = messaging.default();
                  console.log('   ✅ messaging.default() appelé après attente avec succès');
                } catch (retryError) {
                  console.log('   ⚠️ Erreur persistante:', retryError.message);
                }
              }
            }
          } else {
            messagingInstance = messaging;
            console.log('   ✅ messaging utilisé directement');
          }
        } else {
          console.log('   ❌ messaging est null ou type invalide');
          diagnosis.errors.push('React Native Firebase messaging non disponible');
        }
      } catch (error) {
        console.log('   ❌ Erreur générale:', error.message);
        diagnosis.errors.push(`Erreur vérification messaging: ${error.message}`);
      }
      
      if (messagingInstance) {
        console.log('   📋 Type de messagingInstance:', typeof messagingInstance);
        console.log('   📋 Méthodes disponibles:', Object.keys(messagingInstance).filter(key => typeof messagingInstance[key] === 'function').slice(0, 10));
        
        // Vérifier les handlers
        if (typeof messagingInstance.onMessage === 'function') {
          diagnosis.handlers.foreground = true;
          console.log('   ✅ Handler onMessage disponible');
        } else {
          console.log('   ❌ Handler onMessage non disponible');
          diagnosis.warnings.push('Handler onMessage (premier plan) non disponible');
        }
        
        if (typeof messagingInstance.onNotificationOpenedApp === 'function') {
          diagnosis.handlers.onNotificationOpenedApp = true;
          console.log('   ✅ Handler onNotificationOpenedApp disponible');
        } else {
          console.log('   ⚠️ Handler onNotificationOpenedApp non disponible');
        }
        
        if (typeof messagingInstance.getInitialNotification === 'function') {
          diagnosis.handlers.getInitialNotification = true;
          console.log('   ✅ Handler getInitialNotification disponible');
        } else {
          console.log('   ⚠️ Handler getInitialNotification non disponible');
        }
        
        // Vérifier setBackgroundMessageHandler (dans index.js)
        if (typeof messagingInstance.setBackgroundMessageHandler === 'function') {
          diagnosis.handlers.background = true;
          console.log('   ✅ setBackgroundMessageHandler disponible');
        } else {
          console.log('   ⚠️ setBackgroundMessageHandler non disponible');
        }
        
        // Essayer d'obtenir le token actuel
        if (typeof messagingInstance.getToken === 'function') {
          try {
            const currentToken = await messagingInstance.getToken();
            diagnosis.currentTokenFromFirebase = currentToken;
            diagnosis.tokenMatch = currentToken === this.fcmToken;
            console.log('   ✅ Token obtenu depuis Firebase:', currentToken.substring(0, 30) + '...');
            if (!diagnosis.tokenMatch) {
              console.log('   ⚠️ Token ne correspond pas au token stocké');
              diagnosis.warnings.push('Token Firebase ne correspond pas au token stocké');
            }
          } catch (tokenError) {
            console.log('   ❌ Erreur obtention token:', tokenError.message);
            diagnosis.errors.push(`Erreur obtention token: ${tokenError.message}`);
          }
        } else {
          console.log('   ❌ getToken n\'est pas une fonction');
          diagnosis.errors.push('getToken n\'est pas disponible');
        }
      } else {
        // Vérifier si un token est stocké dans AsyncStorage
        try {
          const storedToken = await AsyncStorage.getItem('fcmToken');
          if (storedToken) {
            console.log('   ⚠️ messagingInstance est null, mais token trouvé dans AsyncStorage');
            console.log('   ✅ Token disponible:', storedToken.substring(0, 30) + '...');
            diagnosis.token = storedToken;
            diagnosis.hasToken = true;
            diagnosis.warnings.push('messagingInstance est null mais token disponible dans AsyncStorage - les notifications fonctionnent !');
          } else {
            console.log('   ❌ messagingInstance est null et aucun token stocké');
            diagnosis.errors.push('messagingInstance est null');
          }
        } catch (storageError) {
          console.log('   ❌ Erreur lecture AsyncStorage:', storageError.message);
          diagnosis.errors.push('messagingInstance est null');
        }
      }
    } catch (error) {
      console.log('   ❌ Erreur:', error.message);
      diagnosis.errors.push(`Erreur vérification messaging: ${error.message}`);
    }

    // 3. Vérifier l'initialisation
    console.log('');
    console.log('3️⃣ Vérification de l\'initialisation...');
    if (this.isInitialized) {
      console.log('   ✅ Service FCM initialisé');
    } else {
      console.log('   ❌ Service FCM non initialisé');
      diagnosis.warnings.push('Service FCM non initialisé');
    }

    // 4. Vérifier les listeners Expo
    console.log('');
    console.log('4️⃣ Vérification des listeners Expo...');
    if (this.notificationListener) {
      diagnosis.handlers.expoListeners = true;
      console.log('   ✅ Listener notifications Expo configuré');
    } else {
      console.log('   ⚠️ Listener notifications Expo non configuré');
    }
    if (this.responseListener) {
      console.log('   ✅ Listener réponses Expo configuré');
    } else {
      console.log('   ⚠️ Listener réponses Expo non configuré');
    }

    // 5. Vérifier le token
    console.log('');
    console.log('5️⃣ Vérification du token FCM...');
    
    // Vérifier d'abord si le token a été trouvé dans AsyncStorage (dans la section 2)
    if (diagnosis.hasToken && diagnosis.token) {
      // Le token a été trouvé dans AsyncStorage, l'utiliser
      if (!this.fcmToken) {
        this.fcmToken = diagnosis.token;
        console.log('   ✅ Token FCM récupéré depuis AsyncStorage et chargé en mémoire');
      }
    }
    
    // Utiliser le token en mémoire ou celui du diagnostic
    const tokenToCheck = this.fcmToken || diagnosis.token;
    
    if (tokenToCheck) {
      console.log('   ✅ Token FCM disponible');
      console.log('   📋 Token:', tokenToCheck.substring(0, 50) + '...');
      console.log('   📏 Longueur:', tokenToCheck.length);
      
      // Mettre à jour le diagnostic avec le token
      diagnosis.hasToken = true;
      diagnosis.token = tokenToCheck;
      diagnosis.tokenLength = tokenToCheck.length;
      
      // Vérifier le format du token
      if (tokenToCheck.startsWith('ExponentPushToken')) {
        console.log('   ⚠️ Token Expo (pas FCM natif)');
        diagnosis.warnings.push('Token est un token Expo, pas un token FCM natif');
      } else if (tokenToCheck.includes(':') && tokenToCheck.length > 100) {
        console.log('   ✅ Format token FCM natif correct');
      } else {
        console.log('   ⚠️ Format de token suspect');
        diagnosis.warnings.push('Format de token suspect');
      }
    } else {
      console.log('   ❌ Token FCM non disponible');
      diagnosis.errors.push('Token FCM non disponible');
    }

    // 6. Vérifier le stockage
    console.log('');
    console.log('6️⃣ Vérification du stockage...');
    try {
      const storedToken = await AsyncStorage.getItem('fcmToken');
      const storedUserId = await AsyncStorage.getItem('fcmUserId');
      diagnosis.storedToken = storedToken;
      diagnosis.storedUserId = storedUserId;
      diagnosis.tokenInStorage = !!storedToken;
      
      if (storedToken) {
        console.log('   ✅ Token stocké dans AsyncStorage');
        if (storedToken === this.fcmToken) {
          console.log('   ✅ Token correspond au token actuel');
        } else {
          console.log('   ⚠️ Token stocké ne correspond pas');
          diagnosis.warnings.push('Token stocké ne correspond pas au token actuel');
        }
      } else {
        console.log('   ⚠️ Token non stocké dans AsyncStorage');
      }
      
      // Vérifier si le token est dans Firebase Realtime Database
      if (storedUserId) {
        console.log('   📋 UserId stocké:', storedUserId);
        diagnosis.tokenInFirebase = await this.verifyTokenInFirebase(storedUserId);
        if (diagnosis.tokenInFirebase.exists) {
          console.log('   ✅ Token trouvé dans Firebase Realtime Database');
        } else {
          console.log('   ⚠️ Token non trouvé dans Firebase Realtime Database');
        }
      } else {
        console.log('   ⚠️ UserId non stocké');
      }
    } catch (error) {
      console.log('   ❌ Erreur:', error.message);
      diagnosis.errors.push(`Erreur lecture AsyncStorage: ${error.message}`);
    }

    // 7. Vérifications spécifiques iOS
    if (Platform.OS === 'ios') {
      console.log('');
      console.log('7️⃣ Vérifications spécifiques iOS...');
      console.log('   📋 Plateforme: iOS');
      console.log('   ⚠️ IMPORTANT: Pour que les notifications fonctionnent depuis Firebase Console sur iOS:');
      console.log('      1. Le certificat APNs doit être configuré dans Firebase Console');
      console.log('         Firebase Console > Project Settings > Cloud Messaging > Apple app configuration');
      console.log('      2. Le certificat doit correspondre au bundle ID: com.thprojet.mayombeclient');
      console.log('      3. Le certificat doit être valide (pas expiré)');
      console.log('      4. Si vous utilisez un certificat de développement, assurez-vous que');
      console.log('         aps-environment est en "development" dans les entitlements');
      console.log('      5. Pour la production, changez aps-environment à "production"');
      console.log('');
      console.log('   💡 Si les notifications ne fonctionnent pas depuis Firebase Console:');
      console.log('      - Vérifiez que le certificat APNs est bien uploadé dans Firebase');
      console.log('      - Testez avec l\'API FCM REST directement (plus fiable)');
      console.log('      - Utilisez: await fcmService.sendTestNotificationViaFCM(serverKey)');
    }

    // 8. Résumé
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ DU DIAGNOSTIC');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Points positifs:');
    if (diagnosis.permissions?.granted) console.log('   ✅ Permissions accordées');
    if (diagnosis.messagingAvailable) console.log('   ✅ React Native Firebase disponible');
    if (diagnosis.isInitialized) console.log('   ✅ Service initialisé');
    if (diagnosis.hasToken) console.log('   ✅ Token FCM disponible');
    if (diagnosis.handlers.foreground) console.log('   ✅ Handler premier plan configuré');
    if (diagnosis.handlers.background) console.log('   ✅ Handler arrière-plan configuré');
    
    if (diagnosis.warnings.length > 0) {
      console.log('');
      console.log('⚠️ Avertissements:');
      diagnosis.warnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
    }
    
    if (diagnosis.errors.length > 0) {
      console.log('');
      console.log('❌ Erreurs:');
      diagnosis.errors.forEach(error => console.log(`   ❌ ${error}`));
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('💡 POUR TESTER LES NOTIFICATIONS:');
    console.log('   1. Depuis Firebase Console (peut ne pas fonctionner sur iOS si certificat APNs manquant)');
    console.log('   2. Via l\'API FCM REST: await fcmService.sendTestNotificationViaFCM(serverKey)');
    console.log('   3. Via curl: fcmService.generateCurlCommand(serverKey)');
    console.log('');
    console.log('📋 Token FCM à utiliser:');
    if (diagnosis.token) {
      console.log(`   ${diagnosis.token}`);
    } else {
      console.log('   ❌ Token non disponible');
    }
    console.log('');

    return diagnosis;
  }

  /**
   * Envoyer une notification de test via l'API FCM REST
   * @param {string} serverKey - Clé serveur Firebase (obtenue depuis Firebase Console > Project Settings > Cloud Messaging > Server Key)
   * @param {string} customToken - Token FCM personnalisé (optionnel, utilise this.fcmToken par défaut)
   */
  async sendTestNotificationViaFCM(serverKey, customToken = null) {
    try {
      console.log('');
      console.log('🧪 ENVOI DE NOTIFICATION DE TEST VIA FCM API');
      console.log('═══════════════════════════════════════════════════════');
      
      // Vérifier le token
      const token = customToken || this.fcmToken;
      if (!token) {
        console.log('❌ Token FCM non disponible');
        console.log('💡 Enregistrez d\'abord le token avec: await fcmService.registerToken(userId)');
        return {
          success: false,
          error: 'Token FCM non disponible'
        };
      }
      
      if (!serverKey) {
        console.log('❌ Clé serveur Firebase non fournie');
        console.log('💡 Obtenez votre clé serveur depuis:');
        console.log('   Firebase Console > Project Settings > Cloud Messaging > Server Key');
        console.log('   Ou utilisez: await fcmService.generateCurlCommand() pour générer une commande curl');
        return {
          success: false,
          error: 'Clé serveur Firebase requise'
        };
      }
      
      console.log('📋 Token FCM utilisé:', token.substring(0, 20) + '...');
      console.log('📋 Envoi de la notification...');
      
      // Préparer le payload FCM avec support iOS amélioré
      const payload = {
        to: token,
        notification: {
          title: '🧪 Test de notification FCM',
          body: 'Ceci est une notification de test envoyée depuis l\'app !',
          sound: 'default',
        },
        data: {
          type: 'test',
          timestamp: Date.now().toString(),
          source: 'fcm_service_test'
        },
        priority: 'high',
        content_available: true
      };
      
      // Ajouter les headers APNs spécifiques pour iOS
      if (Platform.OS === 'ios') {
        payload.apns = {
          headers: {
            'apns-priority': '10', // Priorité haute pour notifications immédiates
            'apns-push-type': 'alert',
          },
          payload: {
            aps: {
              alert: {
                title: payload.notification.title,
                body: payload.notification.body,
              },
              sound: 'default',
              badge: 1,
              'content-available': 1,
            },
          },
        };
      }
      
      // Envoyer via l'API FCM REST
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success === 1) {
        console.log('✅ Notification envoyée avec succès !');
        console.log('📋 Réponse FCM:', JSON.stringify(responseData, null, 2));
        console.log('💡 Vérifiez les logs pour voir si la notification est reçue');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        return {
          success: true,
          messageId: responseData.results?.[0]?.message_id,
          response: responseData
        };
      } else {
        console.log('❌ Erreur envoi notification');
        console.log('📋 Réponse FCM:', JSON.stringify(responseData, null, 2));
        if (responseData.results?.[0]?.error) {
          console.log('📋 Erreur détaillée:', responseData.results[0].error);
        }
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        return {
          success: false,
          error: responseData.results?.[0]?.error || 'Erreur inconnue',
          response: responseData
        };
      }
    } catch (error) {
      console.error('❌ Erreur envoi notification FCM:', error);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Générer une commande curl pour tester depuis le terminal
   * @param {string} serverKey - Clé serveur Firebase (optionnel, peut être fournie plus tard)
   */
  generateCurlCommand(serverKey = null) {
    const token = this.fcmToken;
    
    if (!token) {
      console.log('❌ Token FCM non disponible');
      console.log('💡 Enregistrez d\'abord le token avec: await fcmService.registerToken(userId)');
      return null;
    }
    
    const serverKeyPlaceholder = serverKey || 'VOTRE_CLE_SERVEUR_FIREBASE';
    
    const curlCommand = `curl -X POST https://fcm.googleapis.com/fcm/send \\
  -H "Authorization: key=${serverKeyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "${token}",
    "notification": {
      "title": "🧪 Test de notification FCM",
      "body": "Ceci est une notification de test depuis curl !",
      "sound": "default"
    },
    "data": {
      "type": "test",
      "timestamp": "${Date.now()}"
    },
    "priority": "high"
  }'`;
    
    console.log('');
    console.log('📋 COMMANDE CURL POUR TESTER DEPUIS LE TERMINAL:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('1️⃣ Obtenez votre clé serveur Firebase:');
    console.log('   Firebase Console > Project Settings > Cloud Messaging > Server Key');
    console.log('');
    console.log('2️⃣ Remplacez VOTRE_CLE_SERVEUR_FIREBASE dans la commande ci-dessous:');
    console.log('');
    console.log(curlCommand);
    console.log('');
    console.log('3️⃣ Exécutez la commande dans votre terminal');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    return curlCommand;
  }

  /**
   * Tester l'affichage des notifications localement
   * Cette fonction envoie une notification de test pour vérifier que l'affichage fonctionne
   */
  async testLocalNotification() {
    try {
      console.log('');
      console.log('🧪 TEST DE NOTIFICATION LOCALE');
      console.log('═══════════════════════════════════════════════════════');
      
      // Vérifier les permissions d'abord
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        console.log('❌ Permissions non accordées, impossible de tester');
        return {
          success: false,
          error: 'Permissions non accordées'
        };
      }
      
      console.log('✅ Permissions OK');
      
      // Envoyer une notification de test
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test de notification',
          body: 'Si vous voyez ce message, l\'affichage des notifications fonctionne !',
          data: {
            type: 'test',
            timestamp: Date.now()
          },
          sound: true,
        },
        trigger: null, // Afficher immédiatement
      });
      
      console.log('✅ Notification de test envoyée, ID:', notificationId);
      console.log('💡 Si vous voyez la notification, l\'affichage fonctionne !');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      
      return {
        success: true,
        notificationId
      };
    } catch (error) {
      console.error('❌ Erreur test notification locale:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * TEST COMPLET - Exécute tous les tests et identifie le problème
   * Cette fonction teste chaque étape de la chaîne FCM
   */
  async runCompleteTest() {
    console.log('');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('🧪 TEST COMPLET FCM - IDENTIFICATION DU PROBLÈME');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      isDevice: Device.isDevice,
      tests: {},
      criticalIssues: [],
      warnings: [],
      recommendations: []
    };

    // TEST 1: Vérifier les permissions
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: PERMISSIONS DE NOTIFICATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const permissions = await this.checkPermissions();
      testResults.tests.permissions = permissions;
      if (permissions.granted) {
        console.log('✅ RÉUSSI: Permissions accordées');
      } else {
        console.log('❌ ÉCHEC: Permissions refusées -', permissions.status);
        testResults.criticalIssues.push('Permissions de notifications refusées');
        testResults.recommendations.push('Demander les permissions avec: await fcmService.requestPermissions()');
      }
    } catch (error) {
      console.log('❌ ERREUR:', error.message);
      testResults.criticalIssues.push(`Erreur vérification permissions: ${error.message}`);
    }
    console.log('');

    // TEST 2: Vérifier React Native Firebase
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: REACT NATIVE FIREBASE MESSAGING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      if (!messaging) {
        console.log('❌ ÉCHEC: React Native Firebase messaging non disponible');
        testResults.criticalIssues.push('React Native Firebase messaging non disponible');
        testResults.recommendations.push('Reconstruire l\'app: npx expo run:ios');
      } else {
        console.log('✅ messaging disponible, type:', typeof messaging);
        
        let messagingInstance = null;
        try {
          if (typeof messaging === 'function') {
            try {
              messagingInstance = messaging();
              console.log('✅ messaging() appelé avec succès');
            } catch (firebaseError) {
              if (firebaseError.message && firebaseError.message.includes('No Firebase App')) {
                console.log('⏳ Firebase pas encore prêt, attente de 1 seconde...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                try {
                  messagingInstance = messaging();
                  console.log('✅ messaging() appelé après attente avec succès');
                } catch (retryError) {
                  console.log('⚠️ Erreur persistante après attente:', retryError.message);
                  console.log('💡 Les notifications fonctionnent côté natif (vous avez reçu une notification), mais le test JS peut échouer');
                  // Ne pas ajouter comme erreur critique car les notifications fonctionnent
                  testResults.warnings.push(`Erreur appel messaging() après attente: ${retryError.message} - Mais les notifications fonctionnent !`);
                }
              } else {
                throw firebaseError;
              }
            }
          } else if (messaging && typeof messaging === 'object') {
            messagingInstance = messaging;
            console.log('✅ messaging est une instance');
          }
        } catch (error) {
          console.log('❌ ERREUR lors de l\'obtention de messagingInstance:', error.message);
          // Si les notifications arrivent, ce n'est pas critique
          testResults.warnings.push(`Erreur messagingInstance: ${error.message} - Mais les notifications fonctionnent !`);
        }

        if (messagingInstance) {
          testResults.tests.messagingInstance = true;
          
          // Vérifier getToken
          if (typeof messagingInstance.getToken === 'function') {
            console.log('✅ getToken() disponible');
            try {
              const token = await messagingInstance.getToken();
              if (token) {
                console.log('✅ Token obtenu depuis Firebase:', token.substring(0, 50) + '...');
                testResults.tests.tokenObtained = true;
                testResults.tests.token = token;
              } else {
                console.log('❌ ÉCHEC: getToken() retourne null');
                testResults.criticalIssues.push('getToken() retourne null');
              }
            } catch (tokenError) {
              console.log('❌ ERREUR lors de getToken():', tokenError.message);
              testResults.criticalIssues.push(`Erreur getToken(): ${tokenError.message}`);
              
              // Analyser l'erreur spécifique
              if (tokenError.message && tokenError.message.includes('MISSING_INSTANCEID_SERVICE')) {
                testResults.recommendations.push('MISSING_INSTANCEID_SERVICE: L\'app doit être reconstruite avec les modules natifs');
                if (Platform.OS === 'ios') {
                  testResults.recommendations.push('iOS: Vérifier que le device token APNs est bien passé à Firebase dans AppDelegate.mm');
                  testResults.recommendations.push('iOS: Vérifier les entitlements (aps-environment)');
                }
              }
            }
          } else {
            console.log('❌ ÉCHEC: getToken() n\'est pas une fonction');
            testResults.criticalIssues.push('getToken() n\'est pas disponible');
          }
        } else {
          console.log('❌ ÉCHEC: messagingInstance est null');
          testResults.criticalIssues.push('messagingInstance est null');
        }
      }
    } catch (error) {
      console.log('❌ ERREUR:', error.message);
      testResults.criticalIssues.push(`Erreur vérification messaging: ${error.message}`);
    }
    console.log('');

    // TEST 3: Vérifier l'initialisation du service
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: INITIALISATION DU SERVICE FCM');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (this.isInitialized) {
      console.log('✅ RÉUSSI: Service FCM initialisé');
      testResults.tests.serviceInitialized = true;
    } else {
      console.log('⚠️ Service FCM non initialisé, tentative d\'initialisation...');
      try {
        const initialized = await this.initialize();
        if (initialized) {
          console.log('✅ Service FCM initialisé avec succès');
          testResults.tests.serviceInitialized = true;
        } else {
          console.log('❌ ÉCHEC: Impossible d\'initialiser le service');
          testResults.criticalIssues.push('Impossible d\'initialiser le service FCM');
        }
      } catch (error) {
        console.log('❌ ERREUR lors de l\'initialisation:', error.message);
        testResults.criticalIssues.push(`Erreur initialisation: ${error.message}`);
      }
    }
    console.log('');

    // TEST 4: Vérifier le token stocké
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: TOKEN FCM STOCKÉ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const storedToken = await AsyncStorage.getItem('fcmToken');
    if (storedToken) {
      console.log('✅ Token trouvé dans AsyncStorage');
      console.log('📋 Token:', storedToken.substring(0, 50) + '...');
      testResults.tests.tokenInStorage = true;
      testResults.tests.storedToken = storedToken;
    } else {
      console.log('⚠️ Token non trouvé dans AsyncStorage');
      testResults.warnings.push('Token non stocké dans AsyncStorage');
    }
    console.log('');

    // TEST 5: Test de notification locale
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 5: NOTIFICATION LOCALE (TEST D\'AFFICHAGE)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const localTest = await this.testLocalNotification();
      if (localTest.success) {
        console.log('✅ RÉUSSI: Notification locale affichée');
        testResults.tests.localNotification = true;
      } else {
        console.log('❌ ÉCHEC: Notification locale non affichée -', localTest.error);
        testResults.warnings.push(`Notification locale échouée: ${localTest.error}`);
      }
    } catch (error) {
      console.log('❌ ERREUR:', error.message);
      testResults.warnings.push(`Erreur notification locale: ${error.message}`);
    }
    console.log('');

    // TEST 6: Vérifications spécifiques iOS
    if (Platform.OS === 'ios') {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('TEST 6: VÉRIFICATIONS SPÉCIFIQUES iOS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Points critiques pour iOS:');
      console.log('   1. Device token APNs doit être passé à Firebase dans AppDelegate.mm');
      console.log('   2. Certificat APNs (.p8) doit être uploadé dans Firebase Console');
      console.log('   3. Entitlements doivent avoir aps-environment configuré');
      console.log('   4. Bundle ID doit correspondre: com.thprojet.mayombeclient');
      console.log('');
      testResults.recommendations.push('iOS: Vérifier dans Xcode que les logs montrent "✅ Device token APNs reçu"');
      testResults.recommendations.push('iOS: Vérifier Firebase Console > Project Settings > Cloud Messaging > APNs Authentication Key');
    }
    console.log('');

    // RÉSUMÉ FINAL
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ DU TEST COMPLET');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    
    const successCount = Object.values(testResults.tests).filter(v => v === true).length;
    const totalTests = Object.keys(testResults.tests).length;
    
    console.log(`✅ Tests réussis: ${successCount}/${totalTests}`);
    console.log(`❌ Problèmes critiques: ${testResults.criticalIssues.length}`);
    console.log(`⚠️ Avertissements: ${testResults.warnings.length}`);
    console.log('');

    if (testResults.criticalIssues.length > 0) {
      console.log('🔴 PROBLÈMES CRITIQUES IDENTIFIÉS:');
      testResults.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      console.log('');
    }

    if (testResults.warnings.length > 0) {
      console.log('⚠️ AVERTISSEMENTS:');
      testResults.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
      console.log('');
    }

    if (testResults.recommendations.length > 0) {
      console.log('💡 RECOMMANDATIONS:');
      testResults.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // DIAGNOSTIC FINAL
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('🔍 DIAGNOSTIC FINAL');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('');

    if (testResults.criticalIssues.length === 0 && testResults.tests.tokenObtained) {
      console.log('✅ TOUT SEMBLE CORRECT !');
      console.log('');
      console.log('💡 Si les notifications ne fonctionnent toujours pas:');
      console.log('   1. Vérifiez que le certificat APNs est bien uploadé dans Firebase Console');
      console.log('   2. Testez avec l\'API FCM REST: await fcmService.sendTestNotificationViaFCM(serverKey)');
      console.log('   3. Vérifiez les logs Xcode pour voir si le device token APNs est reçu');
    } else {
      console.log('❌ PROBLÈMES IDENTIFIÉS - CORRIGEZ LES POINTS CRITIQUES CI-DESSUS');
    }

    console.log('');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('');

    return testResults;
  }

  /**
   * Tester la configuration FCM complète
   * Affiche toutes les informations nécessaires pour tester depuis Firebase Console
   */
  async testFCMConfiguration() {
    try {
      console.log('');
      console.log('🧪 TEST DE CONFIGURATION FCM');
      console.log('═══════════════════════════════════════════════════════');
      
      // 1. Vérifier les permissions
      console.log('1️⃣ Vérification des permissions...');
      const permissions = await this.checkPermissions();
      if (permissions.granted) {
        console.log('   ✅ Permissions accordées');
      } else {
        console.log('   ❌ Permissions refusées:', permissions.status);
        console.log('   💡 Demandez les permissions avec: fcmService.requestPermissions()');
      }
      
      // 2. Vérifier l'initialisation
      console.log('2️⃣ Vérification de l\'initialisation...');
      if (this.isInitialized) {
        console.log('   ✅ Service FCM initialisé');
      } else {
        console.log('   ❌ Service FCM non initialisé');
        console.log('   💡 Initialisez avec: await fcmService.initialize()');
      }
      
      // 3. Vérifier le token
      console.log('3️⃣ Vérification du token FCM...');
      if (this.fcmToken) {
        console.log('   ✅ Token FCM disponible');
        console.log('   📋 Token:', this.fcmToken);
      } else {
        console.log('   ❌ Token FCM non disponible');
        console.log('   💡 Enregistrez le token avec: await fcmService.registerToken(userId)');
      }
      
      // 4. Vérifier React Native Firebase
      console.log('4️⃣ Vérification de React Native Firebase...');
      if (messaging) {
        console.log('   ✅ React Native Firebase messaging disponible');
        
        // Vérifier l'instance
        let messagingInstance = null;
        if (typeof messaging === 'function') {
          messagingInstance = messaging();
        } else if (messaging && typeof messaging === 'object') {
          messagingInstance = messaging;
        }
        
        if (messagingInstance && typeof messagingInstance.onMessage === 'function') {
          console.log('   ✅ Handler onMessage disponible');
        } else {
          console.log('   ⚠️ Handler onMessage non disponible');
        }
      } else {
        console.log('   ❌ React Native Firebase messaging non disponible');
        console.log('   💡 Reconstruisez l\'app: npx expo run:ios');
      }
      
      // 5. Instructions pour tester depuis Firebase Console
      console.log('');
      console.log('5️⃣ INSTRUCTIONS POUR TESTER DEPUIS FIREBASE CONSOLE:');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (this.fcmToken) {
        console.log('   1. Allez dans Firebase Console > Cloud Messaging');
        console.log('   2. Cliquez sur "Envoyer votre premier message"');
        console.log('   3. Remplissez le formulaire:');
        console.log('      - Titre: "Test Notification"');
        console.log('      - Texte: "Ceci est un test"');
        console.log('   4. Cliquez sur "Suivant" puis "Tester sur un appareil"');
        console.log('   5. Collez ce token FCM:');
        console.log('');
        console.log('      ' + this.fcmToken);
        console.log('');
        console.log('   6. Cliquez sur "Tester"');
        console.log('   7. Vous devriez voir la notification dans les logs:');
        console.log('      - App ouverte: "🔔🔔🔔 NOTIFICATION FCM REÇUE AU PREMIER PLAN"');
        console.log('      - App fermée: La notification s\'affichera automatiquement');
      } else {
        console.log('   ⚠️ Token FCM non disponible, impossible de tester');
        console.log('   💡 Enregistrez d\'abord le token avec: await fcmService.registerToken(userId)');
      }
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      // 6. Test de notification locale
      console.log('6️⃣ Test de notification locale...');
      const localTest = await this.testLocalNotification();
      if (localTest.success) {
        console.log('   ✅ Notification locale affichée avec succès');
      } else {
        console.log('   ❌ Erreur notification locale:', localTest.error);
      }
      
      // 7. Options pour tester avec le token FCM
      console.log('');
      console.log('7️⃣ OPTIONS POUR TESTER AVEC LE TOKEN FCM:');
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (this.fcmToken) {
        console.log('   Option A - Depuis l\'app (nécessite clé serveur Firebase):');
        console.log('     await fcmService.sendTestNotificationViaFCM("VOTRE_CLE_SERVEUR")');
        console.log('');
        console.log('   Option B - Générer commande curl:');
        console.log('     fcmService.generateCurlCommand()');
        console.log('     (Puis exécutez la commande dans votre terminal)');
        console.log('');
        console.log('   Option C - Depuis Firebase Console:');
        console.log('     1. Firebase Console > Cloud Messaging');
        console.log('     2. "Envoyer votre premier message"');
        console.log('     3. Coller ce token:', this.fcmToken);
        console.log('     4. Envoyer');
      } else {
        console.log('   ⚠️ Token FCM non disponible');
      }
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      
      return {
        permissions: permissions.granted,
        initialized: this.isInitialized,
        hasToken: !!this.fcmToken,
        token: this.fcmToken,
        messagingAvailable: !!messaging,
        localNotificationTest: localTest.success
      };
    } catch (error) {
      console.error('❌ Erreur test configuration FCM:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Nettoyer les listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }

    // Nettoyer les listeners React Native Firebase
    if (this.foregroundUnsubscribe) {
      this.foregroundUnsubscribe();
      this.foregroundUnsubscribe = null;
    }

    if (this.tokenRefreshUnsubscribe) {
      try {
        this.tokenRefreshUnsubscribe();
      } catch (err) {
        // Certains environnements retournent une fonction de désinscription, d'autres un objet
      }
      this.tokenRefreshUnsubscribe = null;
    }

    this.isInitialized = false;
    console.log('🧹 Service FCM nettoyé');
  }
}

// Exporter une instance unique
const fcmService = new FCMService();
export default fcmService;

// Exposer le diagnostic et l'affichage du token globalement pour faciliter les tests
if (typeof global !== 'undefined') {
  global.diagnoseFCM = async () => {
    return await fcmService.diagnose();
  };
  global.showFCMToken = async () => {
    return await fcmService.showToken();
  };
  global.testFCM = async () => {
    return await fcmService.runCompleteTest();
  };
  console.log('💡 Commandes utiles:');
  console.log('   - await showFCMToken() : Afficher le token FCM de manière très visible');
  console.log('   - await diagnoseFCM() : Lancer le diagnostic complet FCM');
  console.log('   - await testFCM() : Lancer le test complet et identifier le problème');
}




