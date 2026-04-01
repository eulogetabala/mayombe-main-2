/**
 * Firebase Cloud Functions — métier Firebase (RTDB) + envoi push via FCM.
 */

const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();

const BUNDLE_ID = 'com.thprojet.mayombeclient';

/**
 * Helper pour obtenir la configuration APNs optimale pour iOS
 */
const getApnsConfig = (title, body) => ({
  headers: {
    'apns-priority': '10',
    'apns-push-type': 'alert',
    'apns-topic': BUNDLE_ID,
  },
  payload: {
    aps: {
      sound: 'default',
      badge: 1,
      alert: {
        title: title,
        body: body,
      },
    },
  },
});

const MULTICAST_LIMIT = 500;
const SCHEDULED_LATE_WINDOW_MS = 5 * 60 * 1000;
const SCHEDULED_EARLY_WINDOW_MS = 60 * 1000;

/**
 * Parcourt l’arbre RTDB fcm_tokens (utilisateurs + unregistered/*) et retourne des tokens uniques.
 * @param {*} rootVal
 * @returns {string[]}
 */
function collectAllFcmTokensFromTree(rootVal) {
  const out = new Set();
  const walk = (node) => {
    if (node == null || typeof node !== 'object') return;
    if (typeof node.token === 'string' && node.token.length > 0) {
      out.add(node.token);
      return;
    }
    for (const k of Object.keys(node)) {
      walk(node[k]);
    }
  };
  walk(rootVal);
  return Array.from(out);
}

async function loadAllFcmTokens() {
  const snap = await admin.database().ref('fcm_tokens').once('value');
  if (!snap.exists()) return [];
  return collectAllFcmTokensFromTree(snap.val());
}

/**
 * Feuilles avec token + last_userId égal à userId (ex. fcm_tokens/unregistered/*, ou tout autre bucket).
 */
function collectTokensMatchingLastUserId(rootVal, userId) {
  const uid = String(userId);
  const out = new Set();
  const walk = (node) => {
    if (node == null || typeof node !== 'object') return;
    if (typeof node.token === 'string' && node.token.length > 0) {
      if (node.last_userId != null && String(node.last_userId) === uid) {
        out.add(node.token);
      }
      return;
    }
    for (const k of Object.keys(node)) {
      walk(node[k]);
    }
  };
  walk(rootVal);
  return Array.from(out);
}

/**
 * Tous les tokens associés à un utilisateur, sans rien omettre dans fcm_tokens :
 * - sous-arbre fcm_tokens/{userId} (toutes formes / anciennes entrées sans last_userId)
 * - partout ailleurs sous fcm_tokens (dont unregistered) si last_userId === userId
 */
async function loadFcmTokensForUser(userId) {
  if (!userId) return [];
  const uid = String(userId);
  const rootSnap = await admin.database().ref('fcm_tokens').once('value');
  if (!rootSnap.exists()) return [];
  const root = rootSnap.val();
  const out = new Set();

  const userNode = root[uid];
  if (userNode != null) {
    collectAllFcmTokensFromTree(userNode).forEach((t) => out.add(t));
  }

  collectTokensMatchingLastUserId(root, uid).forEach((t) => out.add(t));

  return Array.from(out);
}

function normalizeFcmData(data) {
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v == null ? '' : String(v)])
  );
}

/**
 * @param {string[]} tokens
 * @param {{ notification: object, data: object, apns: object }} base
 */
async function sendMulticastInBatches(tokens, base) {
  const { notification, data, apns } = base;
  const android = base.android != null ? base.android : { priority: 'high' };
  let successCount = 0;
  let failureCount = 0;
  for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
    const chunk = tokens.slice(i, i + MULTICAST_LIMIT);
    const res = await admin.messaging().sendEachForMulticast({
      notification,
      data,
      apns,
      android,
      tokens: chunk,
    });
    successCount += res.successCount;
    failureCount += res.failureCount;
  }
  return { successCount, failureCount };
}

/**
 * Notification programmée : fenêtre [scheduled - 1min, scheduled + 5min] par rapport à `now`.
 */
function isScheduledNotificationDue(scheduledDate, now) {
  const t = scheduledDate.getTime();
  const n = now.getTime();
  const delta = n - t;
  return delta >= -SCHEDULED_EARLY_WINDOW_MS && delta <= SCHEDULED_LATE_WINDOW_MS;
}

/**
 * Fonction pour envoyer une notification à un utilisateur spécifique
 */
exports.sendNotificationToUser = functions.https.onCall(async (data, context) => {
  const { userId, title, body, data: notificationData } = data;

  if (!userId || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'userId, title et body sont requis');
  }

  try {
    const tokens = await loadFcmTokensForUser(userId);
    if (tokens.length === 0) {
      console.log(`Aucun token FCM trouvé pour l'utilisateur ${userId}`);
      return { success: false, message: 'Aucun token FCM trouvé' };
    }

    const data = normalizeFcmData(notificationData);
    const { successCount, failureCount } = await sendMulticastInBatches(tokens, {
      notification: { title, body },
      data,
      apns: getApnsConfig(title, body),
    });
    return {
      success: true,
      successCount,
      failureCount,
      total: tokens.length,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', `Erreur lors de l'envoi: ${error.message}`);
  }
});

/**
 * Fonction pour envoyer une notification à tous les utilisateurs
 */
exports.sendNotificationToAll = functions.https.onCall(async (data, context) => {
  const { title, body, data: notificationData } = data;

  if (!title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'title et body sont requis');
  }

  try {
    const tokens = await loadAllFcmTokens();
    if (tokens.length === 0) return { success: false, message: 'Aucun token valide' };

    const data = normalizeFcmData(notificationData);
    const { successCount, failureCount } = await sendMulticastInBatches(tokens, {
      notification: { title, body },
      data,
      apns: getApnsConfig(title, body),
    });
    return {
      success: true,
      successCount,
      failureCount,
      total: tokens.length,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', `Erreur lors de l'envoi: ${error.message}`);
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

    if (newStatus.status === oldStatus.status) return null;

    try {
      const orderSnapshot = await admin.database().ref(`orders/${orderId}`).once('value');
      const orderData = orderSnapshot.val();
      if (!orderData || !orderData.clientId) return null;

      const clientId = String(orderData.clientId);
      const clientTokens = await loadFcmTokensForUser(clientId);
      if (clientTokens.length === 0) return null;

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

      await sendMulticastInBatches(clientTokens, {
        notification: { title, body },
        data: {
          type: 'order',
          orderId: String(orderId),
          status: String(newStatus.status),
        },
        apns: getApnsConfig(title, body),
      });
      return null;
    } catch (error) {
      console.error('[onOrderStatusChange] FCM Error', { orderId, message: error.message });
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

    if (!promotionData || !promotionData.active) return null;

    try {
      const tokens = await loadAllFcmTokens();
      if (tokens.length === 0) return null;

      const title = promotionData.title || 'Nouvelle promotion !';
      const body = promotionData.description || 'Découvrez notre nouvelle offre.';
      await sendMulticastInBatches(tokens, {
        notification: { title, body },
        data: {
          type: 'promotion',
          promotionId: String(promotionId),
        },
        apns: getApnsConfig(title, body),
      });
      return null;
    } catch (error) {
      console.error('[onPromotionCreated] FCM Error', error.message);
      return null;
    }
  });

/**
 * Cœur métier : parcourt scheduled_notifications et envoie les notifications dues.
 * @returns {{ processed: number, processedIds: string[] }}
 */
async function runScheduledNotificationsJob() {
  const now = new Date();
  const scheduledRef = admin.database().ref('scheduled_notifications');
  const snapshot = await scheduledRef.once('value');

  if (!snapshot.exists()) {
    return { processed: 0, processedIds: [] };
  }

  const scheduledNotifications = snapshot.val();
  let processed = 0;
  const processedIds = [];

  for (const [notificationId, notification] of Object.entries(scheduledNotifications)) {
    if (!notification || notification.status !== 'scheduled') continue;
    if (!notification.scheduledDate) continue;

    const scheduledDate = new Date(notification.scheduledDate);
    if (Number.isNaN(scheduledDate.getTime())) continue;
    if (!isScheduledNotificationDue(scheduledDate, now)) continue;

    const notifRef = admin.database().ref(`scheduled_notifications/${notificationId}`);
    const txn = await notifRef.transaction((current) => {
      if (!current || current.status !== 'scheduled') {
        return undefined;
      }
      return {
        ...current,
        status: 'processing',
        processingStartedAt: new Date().toISOString(),
      };
    });

    if (!txn.committed) continue;

    const n = { ...notification, id: notificationId };
    const repeat = n.repeat || 'once';
    const title = n.title || '';
    const body = n.body || '';
    const data = normalizeFcmData(n.data);
    const android = { priority: 'high' };

    try {
      if (n.target === 'all') {
        const tokens = await loadAllFcmTokens();
        if (tokens.length > 0) {
          await sendMulticastInBatches(tokens, {
            notification: { title, body },
            data,
            apns: getApnsConfig(title, body),
            android,
          });
        }
      } else if (n.userId) {
        const userTokens = await loadFcmTokensForUser(n.userId);
        if (userTokens.length > 0) {
          await sendMulticastInBatches(userTokens, {
            notification: { title, body },
            data,
            apns: getApnsConfig(title, body),
            android,
          });
        }
      }

      if (repeat === 'once') {
        await notifRef.update({
          status: 'sent',
          sentAt: new Date().toISOString(),
          processingStartedAt: null,
        });
      } else if (repeat === 'daily') {
        const nextDate = new Date(scheduledDate.getTime() + 86400000);
        await notifRef.update({
          status: 'scheduled',
          scheduledDate: nextDate.toISOString(),
          lastSentAt: new Date().toISOString(),
          processingStartedAt: null,
        });
      } else if (repeat === 'weekly') {
        const nextDate = new Date(scheduledDate.getTime() + 604800000);
        await notifRef.update({
          status: 'scheduled',
          scheduledDate: nextDate.toISOString(),
          lastSentAt: new Date().toISOString(),
          processingStartedAt: null,
        });
      } else {
        await notifRef.update({
          status: 'sent',
          sentAt: new Date().toISOString(),
          processingStartedAt: null,
        });
      }
      processed += 1;
      processedIds.push(notificationId);
      console.log('[checkScheduledNotifications] Envoyé', notificationId, { repeat, target: n.target });
    } catch (error) {
      console.error('[checkScheduledNotifications] Erreur', notificationId, error.message);
      await notifRef.update({
        status: 'failed',
        failedAt: new Date().toISOString(),
        error: error.message,
        processingStartedAt: null,
      });
    }
  }

  return { processed, processedIds };
}

/**
 * HTTP — pour cron externe (cron-job.org, etc.).
 * Optionnel : définir la variable d’environnement CRON_SECRET ; alors passer ?key=VOTRE_SECRET ou header x-cron-key.
 */
exports.checkScheduledNotifications = functions.https.onRequest(async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const key = req.query.key || req.headers['x-cron-key'];
      if (key !== cronSecret) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    const { processed, processedIds } = await runScheduledNotificationsJob();
    return res.status(200).json({
      success: true,
      checked: processed,
      processedIds,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Cloud Scheduler (Gen2) — toutes les minutes, fuseau UTC.
 * Nécessite le plan Blaze. Si vous l’utilisez, vous pouvez désactiver le cron HTTP externe pour éviter les appels doublons (la transaction évite quand même les doubles envois).
 */
exports.scheduledNotificationsCron = onSchedule(
  {
    schedule: '* * * * *',
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '256MiB',
  },
  async () => {
    const { processed, processedIds } = await runScheduledNotificationsJob();
    console.log('[scheduledNotificationsCron] tick', { processed, processedIds });
  }
);

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
























