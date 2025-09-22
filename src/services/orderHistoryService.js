import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTransactionHistory, getTransactionStats, searchTransactions, getTransactionById, getTransactionsByStatus } from './transactionHistoryService';

const ORDERS_STORAGE_KEY = '@mayombe_orders_history';

// Structure d'une commande basée sur les vraies données de l'app
export const createOrder = (orderDetails) => {
  return {
    id: orderDetails.orderId || Date.now().toString(),
    date: new Date().toISOString(),
    status: 'en_cours', // en_cours, livré, annulé
    // Données réelles de l'application
    items: orderDetails.items || [],
    subtotal: orderDetails.subtotal || 0,
    deliveryFee: orderDetails.deliveryFee || 0,
    total: orderDetails.total || 0,
    orderId: orderDetails.orderId,
    distance: orderDetails.distance,
    payment_method: orderDetails.paymentMethod || orderDetails.payment_method || 'cash',
    address: orderDetails.address || orderDetails.delivery_address || '',
    phone: orderDetails.phone || orderDetails.delivery_phone || '',
    // Informations du restaurant (si disponibles)
    restaurant: orderDetails.restaurant || null,
  };
};

// Sauvegarder une nouvelle commande
export const saveOrder = async (orderDetails) => {
  try {
    const newOrder = createOrder(orderDetails);
    
    // Récupérer les commandes existantes
    const existingOrders = await getOrders();
    
    // Ajouter la nouvelle commande au début
    const updatedOrders = [newOrder, ...existingOrders];
    
    // Sauvegarder dans AsyncStorage
    await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    
    return newOrder;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la commande:', error);
    throw error;
  }
};

// Récupérer toutes les commandes depuis l'API
export const getOrders = async () => {
  try {
    // Utiliser l'API pour récupérer l'historique des transactions
    const transactions = await getTransactionHistory();
    return transactions;
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    // Fallback vers AsyncStorage si l'API échoue
    try {
      const ordersJson = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
      return ordersJson ? JSON.parse(ordersJson) : [];
    } catch (fallbackError) {
      console.error('Erreur fallback AsyncStorage:', fallbackError);
      return [];
    }
  }
};

// Récupérer une commande par ID
export const getOrderById = async (orderId) => {
  try {
    const transaction = await getTransactionById(orderId);
    return transaction;
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    return null;
  }
};

// Mettre à jour le statut d'une commande
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const orders = await getOrders();
    const updatedOrders = orders.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus }
        : order
    );
    
    await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return false;
  }
};

// Supprimer une commande
export const deleteOrder = async (orderId) => {
  try {
    const orders = await getOrders();
    const updatedOrders = orders.filter(order => order.id !== orderId);
    
    await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande:', error);
    return false;
  }
};

// Supprimer toutes les commandes
export const clearAllOrders = async () => {
  try {
    await AsyncStorage.removeItem(ORDERS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de toutes les commandes:', error);
    return false;
  }
};

// Obtenir les statistiques des commandes
export const getOrderStats = async () => {
  try {
    const stats = await getTransactionStats();
    return stats;
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    return {
      total: 0,
      en_cours: 0,
      livré: 0,
      annulé: 0,
      totalAmount: 0,
    };
  }
};

// Filtrer les commandes par statut
export const getOrdersByStatus = async (status) => {
  try {
    const transactions = await getTransactionsByStatus(status);
    return transactions;
  } catch (error) {
    console.error('Erreur lors du filtrage des commandes:', error);
    return [];
  }
};

// Rechercher des commandes par nom de restaurant
export const searchOrders = async (searchTerm) => {
  try {
    const transactions = await searchTransactions(searchTerm);
    return transactions;
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    return [];
  }
};
