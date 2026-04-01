/**
 * Debug FCM push token au démarrage (logs).
 */

import fcmService from '../services/fcmService';

export const logFCMDebugOnStartup = async () => {
  if (!__DEV__) return;
  try {
    const token = await fcmService.forceGetAndShowToken();
    if (token) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔔 FIREBASE FCM TOKEN (debug):');
      console.log(token);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
    }
  } catch (e) {
    console.log('⚠️ FCM debug error:', e.message);
  }
};

export const showFCMToken = logFCMDebugOnStartup;

export const forceGetFCMToken = async () => {
  return await fcmService.forceGetAndShowToken();
};

export default showFCMToken;
