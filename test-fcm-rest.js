const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');
const fs = require('fs');

async function sendTest() {
  const serviceAccountPath = '/Users/smartvision2/Desktop/2025_Projet/mayombe-main-2-main/mayombe-ba11b-firebase-adminsdk-fbsvc-7928168601.json';
  const token = 'dFKgYm2JPkxdlsrZr-49AS:APA91bEhsBwpHYujW8hmvOWWlNCPOf61eVnREfalf9Hmuyzhp3HTyBcDCfwoIXQQqQY4RfND1PouehRL_t6Q19TU89WLIs4hZQcLtI4nyqJ_thX4OjjcDnQ';
  
  console.log('🔐 Génération du jeton OAuth2...');
  const auth = new GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  
  const projectId = JSON.parse(fs.readFileSync(serviceAccountPath)).project_id;
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  
  const body = {
    message: {
      token: token,
      notification: {
        title: '🧪 Test REST v1',
        body: 'Test de diagnostic FCM raw'
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
          'apns-topic': 'com.thprojet.mayombeclient'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    }
  };

  console.log('🚀 Envoi de la requête à FCM REST v1...');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log('📊 Réponse HTTP:', response.status);
  console.log('📋 Contenu:', JSON.stringify(data, null, 2));
}

sendTest().catch(console.error);
