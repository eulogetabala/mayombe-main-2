/**
 * Utilitaires pour la résolution et la gestion des URLs d'images
 */

const UPLOADS_BASE_URL = "https://www.mayombe-app.com/uploads_admin";

// Image par défaut
const DEFAULT_IMAGE = require('../../assets/images/2.jpg');

/**
 * Convertit un chemin gs:// de Firebase Storage en URL HTTPS téléchargeable
 * @param {string} gsUri - Chemin au format gs://bucket/object/path
 * @returns {string} - URL https://firebasestorage.googleapis.com/...
 */
export const gsToHttpUrl = (gsUri) => {
  const match = gsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) return gsUri;
  const [, bucket, objectPath] = match;
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
};

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
    // Si c'est un chemin Firebase Storage (gs://), construire l'URL HTTPS téléchargeable
    if (firebaseUrl.startsWith('gs://')) {
      return { uri: gsToHttpUrl(firebaseUrl) };
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

/**
 * Préchauffe les images distantes via FastImage pour un affichage immédiat.
 * À appeler dès que les URLs sont résolues (avant même le rendu).
 * @param {Array<object|string>} sources - Liste de sources (objet { uri } ou string URL)
 * @returns {Promise<void>}
 */
export const prefetchImages = (sources) => {
  if (!sources || sources.length === 0) return Promise.resolve();

  try {
    // Import dynamique : le module peut être exporté en ES6 (`.default`) ou CommonJS direct
    const FastImageModule = require('react-native-fast-image');
    const FastImage = FastImageModule && (FastImageModule.default || FastImageModule);

    if (!FastImage || typeof FastImage.prefetch !== 'function') {
      return Promise.resolve();
    }

    const urls = sources
      .map((source) => {
        if (!source) return null;
        let uri = typeof source === 'string' ? source : source.uri;
        if (!uri) return null;
        if (uri.startsWith('gs://')) uri = gsToHttpUrl(uri);
        if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
        return null;
      })
      .filter(Boolean);

    if (urls.length === 0) return Promise.resolve();
    return Promise.resolve(FastImage.prefetch(urls)).catch(() => {});
  } catch (e) {
    return Promise.resolve();
  }
};
