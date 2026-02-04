// Usage: node send-fcm-admin.js [serviceAccount.json] TOKEN_FCM
const admin = require('firebase-admin');
const path = require('path');

// Parser les arguments
const args = process.argv.slice(2);
let keyPath = null;
let token = null;

// Détecter le fichier JSON et le token
for (const arg of args) {
  if (arg.endsWith('.json')) {
    keyPath = arg;
  } else if (arg.length > 50 && !arg.includes('/') && !arg.includes('\\')) {
    // Probablement un token FCM (longue chaîne sans slashes)
    token = arg;
  }
}

// Chemin par défaut si non fourni
if (!keyPath) {
  keyPath = path.join(__dirname, '..', 'mayombe-ba11b-firebase-adminsdk-fbsvc-7928168601.json');
}

if (!token) {
  console.error('❌ Erreur: Token FCM requis');
  console.log('\nUsage:');
  console.log('  node send-fcm-admin.js [serviceAccount.json] TOKEN_FCM');
  console.log('\nExemples:');
  console.log('  node send-fcm-admin.js TOKEN_FCM');
  console.log('  node send-fcm-admin.js ./mayombe-ba11b-firebase-adminsdk-fbsvc-7928168601.json TOKEN_FCM');
  console.log('\n💡 Pour obtenir un token FCM:');
  console.log('   node get-fcm-token.js');
  process.exit(1);
}

console.log('🚀 Envoi de notification push FCM...');
console.log('═══════════════════════════════════════════════════════');
console.log(`📦 Service Account: ${keyPath}`);
console.log(`📱 Token: ${token.substring(0, 20)}...`);
console.log('═══════════════════════════════════════════════════════\n');

try {
  const serviceAccount = require(keyPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  // Message personnalisable via variables d'environnement ou arguments
  const title = process.env.NOTIFICATION_TITLE || '🔔 Test Push Notification';
  const body = process.env.NOTIFICATION_BODY || 'Notification de test en mode développement - Mayombe App';

  const message = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
    data: { 
      type: 'test', 
      source: 'admin_sdk',
      timestamp: Date.now().toString(),
      mode: 'development'
    },
    android: { priority: 'high' },
    apns: {
      headers: { 
        'apns-priority': '10',
        'apns-push-type': 'alert',
        'apns-topic': 'com.thprojet.mayombeclient'
      },
      payload: { aps: { sound: 'default', badge: 1 } }
    }
  };

  admin.messaging().send(message)
    .then((response) => {
      console.log('✅ Notification envoyée avec succès!');
      console.log(`📨 Message ID: ${response}`);
      console.log('\n💡 Vérifiez votre appareil pour voir la notification.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de l\'envoi:');
      console.error(JSON.stringify(error, null, 2));
      if (error.code) {
        console.error(`📋 Code d'erreur: ${error.code}`);
      }
      process.exit(2);
    });
} catch (error) {
  console.error('❌ Erreur:', error.message);
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('\n💡 Assurez-vous d\'avoir installé firebase-admin:');
    console.error('   npm install firebase-admin');
  } else if (error.code === 'ENOENT') {
    console.error(`\n💡 Fichier serviceAccount.json introuvable: ${keyPath}`);
    console.error('   Vérifiez que le fichier existe ou spécifiez le chemin complet.');
  }
  process.exit(1);
}
