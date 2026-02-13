/**
 * Utilitaires pour la résolution et la gestion des URLs d'images
 */

const UPLOADS_BASE_URL = "https://www.mayombe-app.com/uploads_admin";

// Image par défaut
const DEFAULT_IMAGE = require('../../assets/images/2.jpg');

/**
 * Résout une URL d'image avec priorité Firebase > API > Image par défaut
 * @param {string|null|undefined} firebaseUrl - URL depuis Firebase (priorité 1)
 * @param {string|null|undefined} apiPath - Chemin depuis l'API (priorité 2)
 * @param {object} defaultImage - Image par défaut locale (priorité 3)
 * @returns {object} - Objet { uri: string } ou require() pour image locale
 */
export const resolveImageUrl = (firebaseUrl, apiPath, defaultImage = DEFAULT_IMAGE) => {
  // Priorité 1: Firebase URL (si disponible et valide)
  if (firebaseUrl && typeof firebaseUrl === 'string') {
    if (firebaseUrl.startsWith('http://') || firebaseUrl.startsWith('https://')) {
      return { uri: firebaseUrl };
    }
    // Si c'est un chemin relatif Firebase Storage, construire l'URL complète
    if (firebaseUrl.startsWith('gs://')) {
      // Firebase Storage path - on retourne tel quel, React Native gérera
      return { uri: firebaseUrl };
    }
  }

  // Priorité 2: API Path (si disponible)
  if (apiPath && typeof apiPath === 'string') {
    if (apiPath.startsWith('http://') || apiPath.startsWith('https://')) {
      return { uri: apiPath };
    }
    // Construire l'URL complète depuis le chemin API
    return { uri: `${UPLOADS_BASE_URL}/${apiPath}` };
  }

  // Priorité 3: Image par défaut locale
  return defaultImage;
};

/**
 * Résout uniquement une URL Firebase (pour les cas où on a seulement Firebase)
 * @param {string|null|undefined} firebaseUrl - URL depuis Firebase
 * @param {object} defaultImage - Image par défaut locale
 * @returns {object} - Objet { uri: string } ou require() pour image locale
 */
export const resolveFirebaseImageUrl = (firebaseUrl, defaultImage = DEFAULT_IMAGE) => {
  return resolveImageUrl(firebaseUrl, null, defaultImage);
};

/**
 * Résout uniquement un chemin API (pour les cas où on a seulement l'API)
 * @param {string|null|undefined} apiPath - Chemin depuis l'API
 * @param {object} defaultImage - Image par défaut locale
 * @returns {object} - Objet { uri: string } ou require() pour image locale
 */
export const resolveApiImageUrl = (apiPath, defaultImage = DEFAULT_IMAGE) => {
  return resolveImageUrl(null, apiPath, defaultImage);
};
