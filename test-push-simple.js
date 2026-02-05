#!/usr/bin/env node

/**
 * Script simple pour tester les notifications push
 * Usage: node test-push-simple.js [TOKEN_FCM]
 */

const readline = require('readline');

// Créer l'interface readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour demander le token
function askToken() {
  return new Promise((resolve) => {
    rl.question('\n📱 Entrez le token FCM (ou appuyez sur Entrée pour utiliser Firebase Console): ', (answer) => {
      resolve(answer.trim());
    });
  });
}

// Fonction principale
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔔 TEST DES NOTIFICATIONS PUSH - MAYOMBE APP');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Méthodes de test disponibles:');
  console.log('   1. Firebase Console (Recommandé - Pas de script nécessaire)');
  console.log('   2. Script Node.js avec serviceAccount.json');
  console.log('   3. Depuis l\'application mobile directement');
  console.log('\n═══════════════════════════════════════════════════════');

  // Vérifier si un token est passé en argument
  const tokenFromArgs = process.argv[2];
  
  if (tokenFromArgs && tokenFromArgs.length > 50) {
    console.log('\n✅ Token détecté dans les arguments');
    console.log(`📱 Token: ${tokenFromArgs.substring(0, 30)}...`);
    console.log('\n💡 Pour envoyer la notification:');
    console.log('   Option 1: Utilisez Firebase Console (voir TEST_PUSH_NOTIFICATIONS.md)');
    console.log('   Option 2: Utilisez le script: node src/send-fcm-admin.js', tokenFromArgs);
    rl.close();
    return;
  }

  // Demander le token
  const token = await askToken();
  
  if (!token) {
    console.log('\n💡 Guide pour tester depuis Firebase Console:');
    console.log('   1. Allez sur: https://console.firebase.google.com/project/mayombe-ba11b');
    console.log('   2. Cloud Messaging > Envoyer votre premier message');
    console.log('   3. Créez une notification de test');
    console.log('   4. Ciblez un appareil > Token FCM unique');
    console.log('   5. Collez le token obtenu depuis l\'app mobile');
    console.log('   6. Envoyez le message');
    console.log('\n📖 Voir TEST_PUSH_NOTIFICATIONS.md pour plus de détails');
    rl.close();
    return;
  }

  if (token.length < 50) {
    console.log('\n❌ Token invalide (trop court)');
    console.log('💡 Le token FCM doit faire au moins 50 caractères');
    rl.close();
    return;
  }

  console.log('\n✅ Token valide détecté!');
  console.log(`📱 Token: ${token.substring(0, 30)}...`);
  console.log('\n💡 Pour envoyer la notification:');
  console.log('   Option 1: Firebase Console (Recommandé)');
  console.log('   Option 2: node src/send-fcm-admin.js', token);
  console.log('\n📖 Voir TEST_PUSH_NOTIFICATIONS.md pour les instructions complètes');
  
  rl.close();
}

// Exécuter
main().catch(console.error);
