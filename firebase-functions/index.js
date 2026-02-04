/**
 * Firebase Cloud Functions pour envoyer des notifications FCM
 * 
 * Installation:
 * 1. npm install -g firebase-tools
 * 2. firebase login
 * 3. firebase init functions
 * 4. cd functions && npm install
 * 5. firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Fonction pour envoyer une notification à un utilisateur spécifique
 * Déclenchement: Appel HTTP ou depuis Firebase Console
 */
exports.sendNotificationToUser = functions.https.onCall(async (data, context) => {
  const { userId, title, body, data: notificationData } = data;

  if (!userId || !title || !body) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId, title et body sont requis'
    );
  }

  try {
    // Récupérer le token FCM depuis Realtime Database
    const tokenSnapshot = await admin.database()
      .ref(`fcm_tokens/${userId}`)
      .once('value');

    const tokenData = tokenSnapshot.val();
    
    if (!tokenData || !tokenData.token) {
      throw new functions.https.HttpsError(
        'not-found',
        `Token FCM non trouvé pour l'utilisateur ${userId}`
      );
    }

    const token = tokenData.token;

    // Préparer le message
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: notificationData || {},
      token: token,
      android: {
        priority: 'high',
        notification: {
          channelId: 'promotions',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Envoyer la notification
    const response = await admin.messaging().send(message);
    
    
    return {
      success: true,
      messageId: response,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      `Erreur lors de l'envoi: ${error.message}`
    );
  }
});

/**
 * Fonction pour envoyer une notification à tous les utilisateurs
 * Déclenchement: Appel HTTP ou depuis Firebase Console
 */
exports.sendNotificationToAll = functions.https.onCall(async (data, context) => {
  const { title, body, data: notificationData } = data;

  if (!title || !body) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'title et body sont requis'
    );
  }

  try {
    // Récupérer tous les tokens depuis Realtime Database
    const tokensSnapshot = await admin.database()
      .ref('fcm_tokens')
      .once('value');

    const tokensData = tokensSnapshot.val();
    
    if (!tokensData) {
      throw new functions.https.HttpsError(
        'not-found',
        'Aucun token FCM trouvé'
      );
    }

    // Extraire tous les tokens
    const tokens = Object.values(tokensData)
      .map(userData => userData.token)
      .filter(token => token && typeof token === 'string');

    if (tokens.length === 0) {
      throw new functions.https.HttpsError(
        'not-found',
        'Aucun token valide trouvé'
      );
    }

    // Préparer le message multicast
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: notificationData || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'promotions',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Envoyer à tous les tokens (par batch de 500)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      batches.push(
        admin.messaging().sendEachForMulticast({
          ...message,
          tokens: batch,
        })
      );
    }

    const results = await Promise.all(batches);
    
    const successCount = results.reduce((sum, result) => sum + result.successCount, 0);
    const failureCount = results.reduce((sum, result) => sum + result.failureCount, 0);


    return {
      success: true,
      sent: successCount,
      failed: failureCount,
      total: tokens.length,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      `Erreur lors de l'envoi: ${error.message}`
    );
  }
});

/**
 * Fonction déclenchée automatiquement quand une commande change de statut
 * Envoie une notification au client
 */
exports.onOrderStatusChange = functions.database
  .ref('orders/{orderId}/status')
  .onUpdate(async (change, context) => {
    const orderId = context.params.orderId;
    const newStatus = change.after.val();
    const oldStatus = change.before.val();

    // Ne pas envoyer si le statut n'a pas vraiment changé if (newStatus.status === oldStatus.status) { return null; } try { // Récupérer les infos de la commande const orderSnapshot = await admin.database() .ref(`orders/${orderId}`) .once('value'); const orderData = orderSnapshot.val(); if (!orderData || !orderData.clientId) { return null; } const clientId = orderData.clientId; // Récupérer le token FCM du client const tokenSnapshot = await admin.database() .ref(`fcm_tokens/${clientId}`) .once('value'); const tokenData = tokenSnapshot.val(); if (!tokenData || !tokenData.token) { return null; } const token = tokenData.token; // Préparer le message selon le statut let title = 'Mise à jour de commande'; let body = ''; switch (newStatus.status) { case 'confirmed': title = '✅ Commande confirmée'; body = 'Votre commande a été confirmée et est en préparation.'; break; case 'preparing': title = '👨‍🍳 Commande en préparation'; body = 'Votre commande est en cours de préparation.'; break; case 'ready': title = '📦 Commande prête'; body = 'Votre commande est prête pour la livraison.'; break; case 'on_the_way': title = '🚚 Livraison en cours'; body = 'Votre commande est en route vers vous.'; break; case 'delivered': title = '✅ Commande livrée'; body = 'Votre commande a été livrée. Bon appétit !'; break; default: title = 'Mise à jour de commande'; body = `Statut: ${newStatus.status}`; } const message = { notification: { title: title, body: body, }, data: { type: 'order_update', orderId: orderId, status: newStatus.status, }, token: token, android: { priority: 'high', notification: { channelId: 'delivery', sound: 'default', }, }, apns: { payload: { aps: { sound: 'default', badge: 1, }, }, }, }; // Envoyer la notification const response = await admin.messaging().send(message); return null; } catch (error) { return null; } }); /** * Fonction déclenchée automatiquement quand une promotion est créée * Envoie une notification à tous les utilisateurs */
exports.onPromotionCreated = functions.database .ref('promotions/{promotionId}') .onCreate(async (snapshot, context) => { const promotionData = snapshot.val(); const promotionId = context.params.promotionId; if (!promotionData || !promotionData.active) { return null; // Ne pas envoyer si la promotion n'est pas active
    }

    try {
      // Récupérer tous les tokens
      const tokensSnapshot = await admin.database()
        .ref('fcm_tokens')
        .once('value');

      const tokensData = tokensSnapshot.val();
      
      if (!tokensData) {
        return null;
      }

      // Extraire tous les tokens
      const tokens = Object.values(tokensData)
        .map(userData => userData.token)
        .filter(token => token && typeof token === 'string');

      if (tokens.length === 0) {
        return null;
      }

      // Préparer le message
      const message = {
        notification: {
          title: promotionData.title || 'Nouvelle promotion !',
          body: promotionData.description || 'Découvrez notre nouvelle offre.',
        },
        data: {
          type: 'promotion',
          promotionId: promotionId,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'promotions',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      // Envoyer à tous (par batch de 500)
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        batches.push(
          admin.messaging().sendEachForMulticast({
            ...message,
            tokens: batch,
          })
        );
      }

      const results = await Promise.all(batches);
      
      const successCount = results.reduce((sum, result) => sum + result.successCount, 0);
      
      
      return null;
    } catch (error) {
      return null;
    }
  });

































