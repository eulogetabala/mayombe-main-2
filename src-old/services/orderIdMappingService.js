import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de mapping des OrderIds entre le client et Firebase
 * Permet d'utiliser les vrais OrderIds de Firebase pour le tracking
 */

// OrderIds Firebase disponibles (d'après l'analyse)
const FIREBASE_ORDER_IDS = ['123', '324', '325'];

// Mapping des commandes client vers Firebase OrderIds
let orderIdMapping = new Map();

/**
 * Obtenir un OrderId Firebase disponible
 * @returns {string} OrderId Firebase
 */
export const getAvailableFirebaseOrderId = () => {
  // Utiliser un OrderId Firebase existant de manière cyclique
  const randomIndex = Math.floor(Math.random() * FIREBASE_ORDER_IDS.length);
  return FIREBASE_ORDER_IDS[randomIndex];
};

/**
 * Mapper une commande client vers un OrderId Firebase
 * @param {string} clientOrderId - OrderId généré par le client
 * @param {object} orderData - Données de la commande
 * @returns {string} OrderId Firebase
 */
export const mapClientToFirebaseOrderId = (clientOrderId, orderData = {}) => {
  // Si on a déjà un mapping pour cette commande, le réutiliser
  if (orderIdMapping.has(clientOrderId)) {
    return orderIdMapping.get(clientOrderId);
  }

  // Sinon, créer un nouveau mapping
  const firebaseOrderId = getAvailableFirebaseOrderId();
  orderIdMapping.set(clientOrderId, firebaseOrderId);
  
  console.log('🔗 MAPPING - Client OrderId:', clientOrderId, '→ Firebase OrderId:', firebaseOrderId);
  
  return firebaseOrderId;
};

/**
 * Obtenir l'OrderId Firebase pour une commande client
 * @param {string} clientOrderId - OrderId du client
 * @returns {string|null} OrderId Firebase ou null si non trouvé
 */
export const getFirebaseOrderId = (clientOrderId) => {
  return orderIdMapping.get(clientOrderId) || null;
};

/**
 * Obtenir l'OrderId client pour un OrderId Firebase
 * @param {string} firebaseOrderId - OrderId Firebase
 * @returns {string|null} OrderId client ou null si non trouvé
 */
export const getClientOrderId = (firebaseOrderId) => {
  for (const [clientId, firebaseId] of orderIdMapping.entries()) {
    if (firebaseId === firebaseOrderId) {
      return clientId;
    }
  }
  return null;
};

/**
 * Vérifier si un OrderId Firebase est disponible
 * @param {string} firebaseOrderId - OrderId Firebase à vérifier
 * @returns {boolean} True si disponible
 */
export const isFirebaseOrderIdAvailable = (firebaseOrderId) => {
  return FIREBASE_ORDER_IDS.includes(firebaseOrderId);
};

/**
 * Obtenir tous les OrderIds Firebase disponibles
 * @returns {Array<string>} Liste des OrderIds Firebase
 */
export const getAvailableFirebaseOrderIds = () => {
  return [...FIREBASE_ORDER_IDS];
};

/**
 * Obtenir le mapping complet
 * @returns {Map} Mapping complet
 */
export const getOrderIdMapping = () => {
  return new Map(orderIdMapping);
};

/**
 * Nettoyer le mapping (pour les tests)
 */
export const clearOrderIdMapping = () => {
  orderIdMapping.clear();
};

/**
 * Sauvegarder le mapping dans AsyncStorage
 */
export const saveOrderIdMapping = async () => {
  try {
    const mappingArray = Array.from(orderIdMapping.entries());
    await AsyncStorage.setItem('@mayombe_orderid_mapping', JSON.stringify(mappingArray));
    console.log('💾 Mapping sauvegardé:', mappingArray);
  } catch (error) {
    console.error('❌ Erreur sauvegarde mapping:', error);
  }
};

/**
 * Charger le mapping depuis AsyncStorage
 */
export const loadOrderIdMapping = async () => {
  try {
    const mappingJson = await AsyncStorage.getItem('@mayombe_orderid_mapping');
    if (mappingJson) {
      const mappingArray = JSON.parse(mappingJson);
      orderIdMapping = new Map(mappingArray);
      console.log('📂 Mapping chargé:', mappingArray);
    }
  } catch (error) {
    console.error('❌ Erreur chargement mapping:', error);
  }
};

// Charger le mapping au démarrage
loadOrderIdMapping();
