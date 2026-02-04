import { registerRootComponent } from 'expo';

import App from './App';

// Configuration du handler pour les notifications en arrière-plan
// Cette fonction doit être appelée AVANT registerRootComponent
// Note: Firebase sera initialisé dans AppDelegate.mm, mais peut ne pas être prêt immédiatement
// Les notifications en arrière-plan fonctionneront grâce à la configuration native même si ce handler échoue
try {
  const messaging = require('@react-native-firebase/messaging');
  const messagingInstance = messaging.default || messaging;
  
  if (typeof messagingInstance === 'function') {
    try {
      const messagingApp = messagingInstance();
      if (messagingApp && typeof messagingApp.setBackgroundMessageHandler === 'function') {
        messagingApp.setBackgroundMessageHandler(async remoteMessage => {
          // Les notifications en arrière-plan sont automatiquement affichées par le système
        });
      }
    } catch (firebaseError) {
      // Firebase n'est pas encore initialisé, mais ce n'est pas critique
      // Les notifications fonctionneront quand même grâce à la config native
    }
  } else if (messagingInstance && typeof messagingInstance.setBackgroundMessageHandler === 'function') {
    try {
      messagingInstance.setBackgroundMessageHandler(async remoteMessage => {
        // Handler pour notifications en arrière-plan
      });
    } catch (firebaseError) {
      // Firebase n'est pas encore initialisé
    }
  }
} catch (error) {
  // Le module n'est pas disponible, ce n'est pas critique pour le démarrage
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
