#!/usr/bin/env node

/**
 * Script pour récupérer le token FCM depuis Firebase Realtime Database
 * 
 * Usage:
 *   node get-fcm-token.js
 *   node get-fcm-token.js --userId USER_ID
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Récupérer les arguments
const args = process.argv.slice(2);
let serviceAccountPath = './mayombe-ba11b-firebase-adminsdk-fbsvc-7928168601.json';
let userId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--serviceAccount' && args[i + 1]) {
    serviceAccountPath = args[i + 1];
    i++;
  } else if (args[i] === '--userId' && args[i + 1]) {
    userId = args[i + 1];
    i++;
  }
}

// Initialiser Firebase Admin
try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://mayombe-ba11b-default-rtdb.firebaseio.com',
  });
} catch (error) {
  console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error.message);
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('\n💡 Assurez-vous que le fichier serviceAccount.json existe:');
    console.error(`   ${serviceAccountPath}`);
  }
  process.exit(1);
}

const db = admin.database();

async function getAllTokens() {
  try {
    console.log('🔍 Recherche de tous les tokens FCM dans Firebase...\n');
    
    const tokensRef = db.ref('fcm_tokens');
    const snapshot = await tokensRef.once('value');
    
    if (!snapshot.exists()) {
      console.log('❌ Aucun token FCM trouvé dans Firebase Realtime Database.');
      console.log('\n💡 Pour obtenir un token:');
      console.log('   1. Lancez l\'application sur un appareil physique');
      console.log('   2. Connectez-vous avec un compte utilisateur');
      console.log('   3. Le token sera affiché dans les logs de l\'application');
      console.log('   4. Ou vérifiez les logs avec: npx react-native log-android (Android)');
      console.log('      ou: xcrun simctl spawn booted log stream --predicate \'processImagePath endswith "MayombeApp"\' (iOS)');
      return;
    }
    
    const tokens = snapshot.val();
    const userIds = Object.keys(tokens);
    
    console.log(`✅ ${userIds.length} token(s) FCM trouvé(s):\n`);
    console.log('═══════════════════════════════════════════════════════');
    
    userIds.forEach((uid, index) => {
      const tokenData = tokens[uid];
      console.log(`\n📱 Token #${index + 1}:`);
      console.log(`   User ID: ${uid}`);
      console.log(`   Token: ${tokenData.token}`);
      console.log(`   Device: ${tokenData.device_type || 'N/A'}`);
      console.log(`   Updated: ${tokenData.updated_at ? new Date(tokenData.updated_at).toLocaleString() : 'N/A'}`);
      console.log(`   Enabled: ${tokenData.enabled !== false ? 'Oui' : 'Non'}`);
      console.log('   ───────────────────────────────────────────────────');
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('\n💡 Pour tester une notification, utilisez:');
    console.log(`   node src/send-fcm-admin.js ${serviceAccountPath} TOKEN_FCM`);
    console.log('\n   Ou avec le script amélioré:');
    console.log(`   node test-push-notification.js TOKEN_FCM --serviceAccount ${serviceAccountPath}`);
    
    // Si un seul token, l'afficher de manière plus visible
    if (userIds.length === 1) {
      const singleToken = tokens[userIds[0]].token;
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📋 TOKEN FCM (copiez-le):');
      console.log('═══════════════════════════════════════════════════════');
      console.log(singleToken);
      console.log('═══════════════════════════════════════════════════════');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des tokens:', error.message);
    process.exit(1);
  }
}

async function getTokenByUserId(userId) {
  try {
    console.log(`🔍 Recherche du token FCM pour l'utilisateur: ${userId}\n`);
    
    const tokenRef = db.ref(`fcm_tokens/${userId}`);
    const snapshot = await tokenRef.once('value');
    
    if (!snapshot.exists()) {
      console.log(`❌ Aucun token FCM trouvé pour l'utilisateur: ${userId}`);
      console.log('\n💡 Essayez sans --userId pour voir tous les tokens disponibles.');
      return;
    }
    
    const tokenData = snapshot.val();
    
    console.log('✅ Token FCM trouvé:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`User ID: ${userId}`);
    console.log(`Token: ${tokenData.token}`);
    console.log(`Device: ${tokenData.device_type || 'N/A'}`);
    console.log(`Updated: ${tokenData.updated_at ? new Date(tokenData.updated_at).toLocaleString() : 'N/A'}`);
    console.log(`Enabled: ${tokenData.enabled !== false ? 'Oui' : 'Non'}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 TOKEN FCM (copiez-le):');
    console.log('═══════════════════════════════════════════════════════');
    console.log(tokenData.token);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n💡 Pour tester une notification:');
    console.log(`   node src/send-fcm-admin.js ${serviceAccountPath} ${tokenData.token}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du token:', error.message);
    process.exit(1);
  }
}

// Fonction principale
async function main() {
  console.log('🚀 Récupération du token FCM depuis Firebase\n');
  
  if (userId) {
    await getTokenByUserId(userId);
  } else {
    await getAllTokens();
  }
  
  // Fermer la connexion
  await admin.app().delete();
}

main();


