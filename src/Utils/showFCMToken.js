/**
 * Script utilitaire pour afficher le token FCM
 * Peut être appelé depuis n'importe où dans l'app
 */

import fcmService from '../services/fcmService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Afficher le token FCM de manière très visible
 * Essaie plusieurs méthodes pour récupérer le token
 */
export const showFCMToken = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 RECHERCHE DU TOKEN FCM...');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  let token = null;
  let source = '';

  // Méthode 1: Depuis le service FCM (mémoire)
  token = fcmService.getToken();
  if (token) {
    source = 'Service FCM (mémoire)';
  }

  // Méthode 2: Depuis AsyncStorage
  if (!token) {
    try {
      token = await AsyncStorage.getItem('fcmToken');
      if (token) {
        source = 'AsyncStorage';
      }
    } catch (error) {
      console.log('⚠️ Erreur lecture AsyncStorage:', error.message);
    }
  }

  // Méthode 3: Forcer l'obtention d'un nouveau token
  if (!token) {
    try {
      console.log('📡 Tentative de récupération d\'un nouveau token...');
      token = await fcmService.forceGetAndShowToken();
      if (token) {
        source = 'Nouveau token généré';
        // Si forceGetAndShowToken a déjà affiché le token, on peut retourner
        return token;
      }
    } catch (error) {
      console.log('⚠️ Erreur génération nouveau token:', error.message);
    }
  }

  // Afficher le résultat
  if (token) {
    console.log('');
    console.log('✅ TOKEN FCM TROUVÉ !');
    console.log('📦 Source:', source);
    console.log('📱 Plateforme:', Platform.OS);
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
    console.log('║  📏 Longueur: ' + token.length.toString().padEnd(66) + '║');
    console.log('║  ⏰ Timestamp: ' + new Date().toLocaleString().padEnd(64) + '║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('💡 Pour tester depuis Firebase Console:');
    console.log('   1. Allez dans Firebase Console > Cloud Messaging');
    console.log('   2. Créez une notification de test');
    console.log('   3. Collez le token ci-dessus');
    console.log('   4. Utilisez le format avec "notification" payload');
    console.log('');
    
    return token;
  } else {
    console.log('');
    console.log('❌ TOKEN FCM NON DISPONIBLE');
    console.log('');
    console.log('💡 Solutions:');
    console.log('   1. Assurez-vous que les permissions de notifications sont accordées');
    console.log('   2. Attendez que l\'utilisateur soit connecté (le token sera enregistré automatiquement)');
    console.log('   3. Ou enregistrez manuellement: await fcmService.registerToken(userId)');
    console.log('');
    
    return null;
  }
};

/**
 * Afficher le token FCM au démarrage de l'app
 * À appeler dans App.js ou dans un composant d'initialisation
 * Essaie plusieurs fois jusqu'à trouver le token
 */
export const showFCMTokenOnStartup = async () => {
  let attempts = 0;
  const maxAttempts = 10; // Essayer pendant 30 secondes (3s x 10)
  
  const tryShowToken = async () => {
    attempts++;
    
    try {
      // Méthode 1: Vérifier AsyncStorage
      let token = await AsyncStorage.getItem('fcmToken');
      
      // Méthode 2: Vérifier le service FCM
      if (!token) {
        token = fcmService.getToken();
      }
      
      // Méthode 3: Forcer l'obtention d'un nouveau token
      if (!token) {
        try {
          token = await fcmService.forceGetAndShowToken();
          // Si forceGetAndShowToken a déjà affiché le token, on peut arrêter
          if (token) {
            return true;
          }
        } catch (error) {
          // Ignorer les erreurs d'initialisation
        }
      }
      
      if (token) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🚀 TOKEN FCM TROUVÉ ET AFFICHÉ AUTOMATIQUEMENT');
        console.log('═══════════════════════════════════════════════════════');
        await showFCMToken();
        return true; // Token trouvé, arrêter les tentatives
      } else if (attempts < maxAttempts) {
        // Réessayer après 3 secondes
        setTimeout(tryShowToken, 3000);
      } else {
        // Après 10 tentatives, afficher un message
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('⚠️ TOKEN FCM NON DISPONIBLE APRÈS PLUSIEURS TENTATIVES');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('💡 Pour obtenir le token:');
        console.log('   1. Connectez-vous à l\'app');
        console.log('   2. Ou tapez dans la console: await showFCMToken()');
        console.log('   3. Ou attendez que l\'utilisateur se connecte');
        console.log('');
      }
    } catch (error) {
      if (attempts < maxAttempts) {
        setTimeout(tryShowToken, 3000);
      }
    }
  };
  
  // Commencer après 3 secondes
  setTimeout(tryShowToken, 3000);
};

// Exporter aussi pour utilisation globale
if (typeof global !== 'undefined') {
  global.showFCMToken = showFCMToken;
  global.showFCMTokenOnStartup = showFCMTokenOnStartup;
  global.forceGetFCMToken = async () => {
    const fcmService = require('../services/fcmService').default;
    return await fcmService.forceGetAndShowToken();
  };
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('💡 COMMANDES DISPONIBLES POUR LE TOKEN FCM:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   await showFCMToken()        - Afficher le token (si disponible)');
  console.log('   await forceGetFCMToken()    - Forcer l\'obtention et affichage du token');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}

export default showFCMToken;

