import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import fcmService from '../services/fcmService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Composant pour gérer les notifications push FCM
 * Doit être placé dans AppNavigator pour avoir accès à la navigation
 */
const NotificationHandler = () => {
  const navigation = useNavigation();
  const { isAuthenticated, getCurrentUser } = useAuth();
  const appState = useRef(AppState.currentState);
  const notificationResponseSubscription = useRef(null);

  useEffect(() => {
    // Initialiser le service FCM
    const initializeFCM = async () => {
      try {
        // Vérifier d'abord l'état des permissions
        const permissionsStatus = await fcmService.checkPermissions();
        console.log('📋 État des permissions:', permissionsStatus);
        
        if (!permissionsStatus.granted) {
          console.log('⚠️ Permissions non accordées, demande des permissions...');
          const granted = await fcmService.requestPermissions();
          if (!granted) {
            console.log('❌ Permissions refusées par l\'utilisateur');
            return;
          }
        }
        
        await fcmService.initialize();
        console.log('✅ FCM Service initialisé dans NotificationHandler');
      } catch (error) {
        console.error('❌ Erreur initialisation FCM:', error);
      }
    };

    initializeFCM();

    // Écouter les clics sur les notifications
    notificationResponseSubscription.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification cliquée dans NotificationHandler');
      fcmService.handleNotificationResponse(response, navigation);
    });

    // Écouter les changements d'état de l'app
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App est revenue au premier plan');
        // Vérifier s'il y a des notifications en attente
      }
      appState.current = nextAppState;
    });

    return () => {
      if (notificationResponseSubscription.current) {
        Notifications.removeNotificationSubscription(notificationResponseSubscription.current);
      }
      subscription.remove();
    };
  }, [navigation]);

  // Enregistrer le token FCM après connexion
  useEffect(() => {
    const registerFCMToken = async () => {
      if (isAuthenticated) {
        try {
          console.log('🔐 Tentative d\'enregistrement du token FCM...');
          
          // Attendre un peu pour que le token soit bien sauvegardé dans AsyncStorage
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Récupérer l'ID utilisateur
          let userId = null;
          
          // D'abord, essayer d'extraire l'ID depuis le token utilisateur
          const userToken = await AsyncStorage.getItem('userToken');
          if (userToken && userToken.includes('|')) {
            // Le token est au format "userId|tokenString", extraire l'ID
            const tokenParts = userToken.split('|');
            if (tokenParts.length > 0 && tokenParts[0]) {
              userId = tokenParts[0];
              console.log('✅ ID utilisateur extrait depuis le token:', userId);
            }
          }
          
          // Si pas d'ID depuis le token, essayer l'API
          if (!userId) {
            try {
              // Attendre encore un peu pour que l'API soit prête
              await new Promise(resolve => setTimeout(resolve, 1000));
              const user = await getCurrentUser();
              if (user && user.id) {
                userId = user.id.toString();
                console.log('✅ ID utilisateur récupéré depuis API:', userId);
              } else {
                console.log('⚠️ getCurrentUser() n\'a pas retourné d\'ID');
              }
            } catch (apiError) {
              console.log('⚠️ Erreur API getCurrentUser, utilisation du fallback:', apiError.message);
            }
          }

          // Fallback : utiliser le token utilisateur comme identifiant
          if (!userId && userToken) {
            // Utiliser les 10 premiers caractères du token comme identifiant temporaire
            userId = `user_${userToken.substring(0, 10)}`;
            console.log('📝 Utilisation d\'un identifiant temporaire:', userId);
          }

          if (userId) {
            console.log('🔐 Enregistrement du token FCM pour:', userId);
            const token = await fcmService.registerToken(userId);
            
            // Afficher automatiquement le token après l'enregistrement
            // Le token est déjà affiché dans registerToken(), mais on le réaffiche pour être sûr
            if (token) {
              setTimeout(async () => {
                console.log('');
                console.log('═══════════════════════════════════════════════════════');
                console.log('📱 AFFICHAGE AUTOMATIQUE DU TOKEN FCM APRÈS CONNEXION');
                console.log('═══════════════════════════════════════════════════════');
                await fcmService.showToken();
                console.log('═══════════════════════════════════════════════════════');
                console.log('');
              }, 1000); // Attendre 1 seconde après l'enregistrement
            }
          } else {
            console.log('❌ Impossible d\'obtenir un identifiant utilisateur pour le token FCM');
            // Même sans userId, essayer d'afficher le token s'il existe
            setTimeout(async () => {
              const token = fcmService.getToken();
              if (token) {
                console.log('');
                console.log('═══════════════════════════════════════════════════════');
                console.log('📱 TOKEN FCM DISPONIBLE (sans userId)');
                console.log('═══════════════════════════════════════════════════════');
                await fcmService.showToken();
                console.log('═══════════════════════════════════════════════════════');
                console.log('');
              }
            }, 2000);
          }
        } catch (error) {
          console.error('❌ Erreur enregistrement token FCM:', error);
        }
      } else {
        // Si déconnecté, supprimer le token
        try {
          const storedUserId = await AsyncStorage.getItem('fcmUserId');
          if (storedUserId) {
            console.log('🗑️ Suppression du token FCM pour:', storedUserId);
            await fcmService.unregisterToken(storedUserId);
          }
        } catch (error) {
          console.error('❌ Erreur suppression token FCM:', error);
        }
      }
    };

    registerFCMToken();
  }, [isAuthenticated, getCurrentUser]);

  return null; // Ce composant ne rend rien
};

export default NotificationHandler;

