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

    // Ne pas envoyer si le statut n'a pas vraiment changé
    if (newStatus.status === oldStatus.status) {
      return null;
    }

    try {
      // Récupérer les infos de la commande
      const orderSnapshot = await admin.database()
        .ref(`orders/${orderId}`)
        .once('value');

      const orderData = orderSnapshot.val();
      if (!orderData || !orderData.clientId) {
        return null;
      }

      const clientId = orderData.clientId;

      // Récupérer le token FCM du client
      const tokenSnapshot = await admin.database()
        .ref(`fcm_tokens/${clientId}`)
        .once('value');

      const tokenData = tokenSnapshot.val();
      if (!tokenData || !tokenData.token) {
        return null;
      }

      const token = tokenData.token;

      // Préparer le message selon le statut
      let title = 'Mise à jour de commande';
      let body = '';
      switch (newStatus.status) {
        case 'confirmed':
          title = '✅ Commande confirmée';
          body = 'Votre commande a été confirmée et est en préparation.';
          break;
        case 'preparing':
          title = '👨‍🍳 Commande en préparation';
          body = 'Votre commande est en cours de préparation.';
          break;
        case 'ready':
          title = '📦 Commande prête';
          body = 'Votre commande est prête pour la livraison.';
          break;
        case 'on_the_way':
          title = '🚚 Livraison en cours';
          body = 'Votre commande est en route vers vous.';
          break;
        case 'delivered':
          title = '✅ Commande livrée';
          body = 'Votre commande a été livrée. Bon appétit !';
          break;
        default:
          title = 'Mise à jour de commande';
          body = `Statut: ${newStatus.status}`;
      }

      const message = {
        notification: {
          title: title,
          body: body,
        },
        data: {
          type: 'order_update',
          orderId: orderId,
          status: newStatus.status,
        },
        token: token,
        android: {
          priority: 'high',
          notification: {
            channelId: 'delivery',
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
      return null;
    } catch (error) {
      return null;
    }
  });

/**
 * Fonction déclenchée automatiquement quand une promotion est créée
 * Envoie une notification à tous les utilisateurs
 */
exports.onPromotionCreated = functions.database
  .ref('promotions/{promotionId}')
  .onCreate(async (snapshot, context) => {
    const promotionData = snapshot.val();
    const promotionId = context.params.promotionId;

    if (!promotionData || !promotionData.active) {
      return null; // Ne pas envoyer si la promotion n'est pas active
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

/**
 * Fonction HTTP pour vérifier et envoyer les notifications programmées
 * Compatible avec le plan gratuit (Spark)
 * 
 * Cette fonction peut être appelée par :
 * - Un service externe de cron (cron-job.org, EasyCron, etc.)
 * - Une fonction déclenchée manuellement
 * 
 * URL d'appel : https://us-central1-mayombe-ba11b.cloudfunctions.net/checkScheduledNotifications
 * 
 * Pour automatiser, configurez un cron externe qui appelle cette URL toutes les minutes :
 * - https://cron-job.org (gratuit)
 * - https://www.easycron.com (gratuit avec limitations)
 */
exports.checkScheduledNotifications = functions.https.onRequest(async (req, res) => {
    try {
      console.log('🔍 Vérification des notifications programmées...');
      
      const now = new Date();
      const scheduledRef = admin.database().ref('scheduled_notifications');
      const snapshot = await scheduledRef.once('value');
      
      if (!snapshot.exists()) {
        console.log('Aucune notification programmée trouvée');
        return res.status(200).json({
          success: true,
          checked: 0,
          message: 'Aucune notification programmée trouvée'
        });
      }

      const scheduledNotifications = snapshot.val();
      const notificationsToSend = [];

      // Parcourir toutes les notifications programmées
      for (const [notificationId, notification] of Object.entries(scheduledNotifications)) {
        if (notification.status !== 'scheduled') {
          continue; // Ignorer les notifications déjà envoyées ou échouées
        }

        const scheduledDate = new Date(notification.scheduledDate);
        
        // Vérifier si la notification doit être envoyée maintenant (avec une marge de 1 minute)
        const timeDiff = scheduledDate.getTime() - now.getTime();
        const oneMinute = 60 * 1000;
        
        if (timeDiff >= 0 && timeDiff <= oneMinute) {
          notificationsToSend.push({ id: notificationId, ...notification });
        }
      }

      console.log(`📨 ${notificationsToSend.length} notification(s) à envoyer`);

      // Envoyer chaque notification
      for (const notification of notificationsToSend) {
        try {
          let result;
          
          if (notification.target === 'all') {
            // Envoyer à tous les utilisateurs
            const tokensSnapshot = await admin.database()
              .ref('fcm_tokens')
              .once('value');

            const tokensData = tokensSnapshot.val();
            
            if (!tokensData) {
              throw new Error('Aucun token FCM trouvé');
            }

            const tokens = Object.values(tokensData)
              .map(userData => userData.token)
              .filter(token => token && typeof token === 'string');

            if (tokens.length === 0) {
              throw new Error('Aucun token valide trouvé');
            }

            const message = {
              notification: {
                title: notification.title,
                body: notification.body,
              },
              data: notification.data || {},
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

            // Envoyer par batch de 500
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
            
            result = { success: true, sent: successCount, total: tokens.length };
          } else {
            // Envoyer à un utilisateur spécifique
            const tokenSnapshot = await admin.database()
              .ref(`fcm_tokens/${notification.userId}`)
              .once('value');

            const tokenData = tokenSnapshot.val();
            
            if (!tokenData || !tokenData.token) {
              throw new Error(`Token FCM non trouvé pour l'utilisateur ${notification.userId}`);
            }

            const message = {
              notification: {
                title: notification.title,
                body: notification.body,
              },
              data: notification.data || {},
              token: tokenData.token,
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

            const messageId = await admin.messaging().send(message);
            result = { success: true, messageId };
          }

          // Mettre à jour le statut de la notification
          const notificationRef = admin.database().ref(`scheduled_notifications/${notification.id}`);
          
          if (notification.repeat === 'once') {
            // Marquer comme envoyée et supprimer
            await notificationRef.update({
              status: 'sent',
              sentAt: new Date().toISOString(),
              result: result
            });
          } else if (notification.repeat === 'daily') {
            // Programmer pour demain à la même heure
            const nextDate = new Date(scheduledDate);
            nextDate.setDate(nextDate.getDate() + 1);
            
            await notificationRef.update({
              scheduledDate: nextDate.toISOString(),
              lastSentAt: new Date().toISOString(),
              lastResult: result
            });
          } else if (notification.repeat === 'weekly') {
            // Programmer pour la semaine prochaine à la même heure
            const nextDate = new Date(scheduledDate);
            nextDate.setDate(nextDate.getDate() + 7);
            
            await notificationRef.update({
              scheduledDate: nextDate.toISOString(),
              lastSentAt: new Date().toISOString(),
              lastResult: result
            });
          }

          console.log(`✅ Notification ${notification.id} envoyée avec succès`);
        } catch (error) {
          console.error(`❌ Erreur lors de l'envoi de la notification ${notification.id}:`, error);
          
          // Marquer comme échouée
          await admin.database()
            .ref(`scheduled_notifications/${notification.id}`)
            .update({
              status: 'failed',
              failedAt: new Date().toISOString(),
              error: error.message
            });
        }
      }

      // Retourner une réponse HTTP
      res.status(200).json({
        success: true,
        checked: notificationsToSend.length,
        message: `${notificationsToSend.length} notification(s) vérifiée(s)`
      });
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des notifications programmées:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

/**
 * Proxy pour l'API externe - Contourne les problèmes CORS
 * Cette fonction fait des requêtes serveur-à-serveur (pas de CORS)
 * 
 * URL: https://us-central1-mayombe-ba11b.cloudfunctions.net/apiProxy
 * 
 * Exemple d'utilisation:
 * GET /apiProxy/resto -> Récupère tous les restaurants
 * GET /apiProxy/resto/74 -> Récupère le restaurant 74
 */
exports.apiProxy = functions.https.onRequest(async (req, res) => {
  // Configurer CORS pour permettre les requêtes depuis le frontend
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const axios = require('axios');
    const API_BASE_URL = 'https://www.api-mayombe.mayombe-app.com/public/api';
    
    // Récupérer le chemin de la requête
    // Firebase Functions route les requêtes HTTP différemment
    // Quand on appelle https://...cloudfunctions.net/apiProxy/resto
    // req.path peut être '/resto' (sans /apiProxy) ou '/apiProxy/resto'
    // req.url contient toujours le chemin complet avec query params
    
    let apiPath = req.path || '/';
    
    // Log pour déboguer
    console.log('🔍 [DEBUG] Extraction chemin:', {
      reqPath: req.path,
      reqUrl: req.url,
      reqMethod: req.method
    });
    
    // Si le chemin commence par /apiProxy, le retirer
    if (apiPath.startsWith('/apiProxy')) {
      apiPath = apiPath.replace('/apiProxy', '') || '/';
    }
    
    // Si le chemin est vide ou juste '/', essayer depuis req.url
    if (!apiPath || apiPath === '/') {
      const urlPath = req.url || '';
      // Enlever les query params
      const cleanUrl = urlPath.split('?')[0];
      if (cleanUrl.startsWith('/apiProxy')) {
        apiPath = cleanUrl.replace('/apiProxy', '') || '/';
      } else if (cleanUrl && cleanUrl !== '/' && cleanUrl !== '/apiProxy') {
        // Si req.url contient directement le chemin (sans /apiProxy)
        apiPath = cleanUrl;
      }
    }
    
    // S'assurer que le chemin commence par /
    if (!apiPath.startsWith('/')) {
      apiPath = '/' + apiPath;
    }
    
    // Si c'est toujours juste '/', c'est une erreur
    if (apiPath === '/') {
      console.error('❌ Chemin vide détecté après extraction');
      return res.status(400).json({
        error: 'Chemin de requête manquant',
        debug: {
          reqPath: req.path,
          reqUrl: req.url
        }
      });
    }
    
    const fullUrl = `${API_BASE_URL}${apiPath}`;
    
    console.log(`🔄 Proxy: ${req.method} ${fullUrl}`, {
      originalPath: req.path,
      originalUrl: req.url,
      extractedPath: apiPath,
      query: req.query,
      headers: req.headers
    });

    // Préparer les options de la requête
    const requestOptions = {
      method: req.method,
      url: fullUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    // Ajouter le body si présent (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      requestOptions.data = req.body;
    }

    // Ajouter les query parameters
    if (Object.keys(req.query).length > 0) {
      requestOptions.params = req.query;
    }

    // Faire la requête vers l'API
    const response = await axios(requestOptions);

    // Retourner la réponse
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ Erreur proxy API:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null,
      stack: error.stack
    });
    
    if (error.response) {
      // L'API a répondu avec une erreur
      res.status(error.response.status).json({
        error: error.response.data || error.message
      });
    } else {
      // Erreur réseau ou autre
      res.status(500).json({
        error: error.message || 'Erreur lors de la requête vers l\'API',
        details: error.code || 'Unknown error'
      });
    }
  }
});
























