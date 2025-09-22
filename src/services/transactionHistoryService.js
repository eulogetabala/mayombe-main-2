import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

// Fonction pour récupérer l'adresse depuis Firebase (comme dans OrderTrackingScreen)
const getFirebaseOrderAddress = async (orderId) => {
  try {
    // Importer les services nécessaires
    const { RealtimeTrackingService } = await import('./firebase');
    const { getFirebaseOrderId, loadOrderIdMapping } = await import('./orderIdMappingService');
    
    // Charger le mapping des IDs
    await loadOrderIdMapping();
    
    // Obtenir l'OrderId Firebase correspondant
    const firebaseOrderId = getFirebaseOrderId(orderId?.toString());
    
    console.log('🔍 DEBUG - Mapping OrderId:', {
      clientOrderId: orderId,
      firebaseOrderId: firebaseOrderId
    });
    
    if (firebaseOrderId) {
      // Récupérer les données de la commande depuis Firebase
      const orderData = await RealtimeTrackingService.getOrderData(firebaseOrderId);
      
      console.log('🔍 DEBUG - Données Firebase pour firebaseOrderId:', firebaseOrderId, orderData);
      
      if (orderData && orderData.delivery_address) {
        return {
          address: orderData.delivery_address.address || '',
          phone: orderData.customer?.phone || ''
        };
      }
    } else {
      console.log('⚠️ Aucun mapping Firebase trouvé pour orderId:', orderId);
    }
  } catch (error) {
    console.log('⚠️ Erreur récupération adresse Firebase:', error);
  }
  return { address: '', phone: '' };
};

// Fonction pour récupérer l'adresse depuis le stockage local (fallback)
const getLocalOrderAddress = async (orderId) => {
  try {
    // Vérifier toutes les clés possibles
    const keys = ['orders', '@mayombe_orders_history'];
    
    for (const key of keys) {
      const localOrders = await AsyncStorage.getItem(key);
      
      if (localOrders) {
        const orders = JSON.parse(localOrders);
        const localOrder = orders.find(order => 
          order.orderNumber === orderId?.toString() || 
          order.orderId === orderId?.toString() ||
          order.id === orderId?.toString()
        );
        
        if (localOrder) {
          // Essayer différentes structures d'adresse
          const address = localOrder.deliveryInfo?.address || 
                         localOrder.address || 
                         localOrder.delivery_address || '';
          const phone = localOrder.deliveryInfo?.phone || 
                       localOrder.phone || 
                       localOrder.delivery_phone || '';
          
          if (address || phone) {
            return { address, phone };
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Erreur récupération adresse locale:', error);
  }
  return { address: '', phone: '' };
};

// Récupérer l'historique des transactions depuis l'API
export const getTransactionHistory = async () => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    
    if (!userToken) {
      throw new Error('Token utilisateur non trouvé');
    }

    const response = await fetch(`${API_BASE_URL}/historique-transactions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    // Transformer les données de l'API en format compatible avec l'app
    const transformedData = await transformTransactionData(data);
    return transformedData;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'historique:', error);
    throw error;
  }
};

// Transformer les données de l'API en format compatible
const transformTransactionData = async (apiData) => {
  if (!apiData || !Array.isArray(apiData)) {
    return [];
  }

  // Trier par date (plus récent en premier) puis mapper
  const transformedData = await Promise.all(
    apiData
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(async (transaction) => {
    // Debug: Afficher les données brutes de la transaction
    console.log('🔍 DEBUG - Données brutes de la transaction:', {
      id: transaction.id,
      order_id: transaction.order_id,
      delivery_address: transaction.delivery_address,
      address: transaction.address,
      shipping_address: transaction.shipping_address,
      phone: transaction.phone,
      delivery_phone: transaction.delivery_phone,
      customer_phone: transaction.customer_phone,
      allKeys: Object.keys(transaction)
    });

    // Extraire les items depuis order_items
    const orderItems = transaction.order_items || [];
    const transformedItems = orderItems.map(item => ({
      id: item.id,
      name: item.product?.name || item.menu?.name || 'Produit inconnu',
      quantity: item.quantity || 1,
      price: parseFloat(item.price_at_order || item.product?.price || 0),
      total: parseFloat(item.price_at_order || item.product?.price || 0) * (item.quantity || 1),
      product_id: item.product_id,
      menu_id: item.menu_id,
      item_type: item.item_type || 'product',
      // Informations du produit
      product: item.product,
      menu: item.menu,
    }));

    // Calculer le nombre total d'articles
    const totalItems = transformedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

    // Récupérer l'adresse depuis Firebase (priorité) ou stockage local (fallback)
    const firebaseAddress = await getFirebaseOrderAddress(transaction.order_id || transaction.id);
    const localAddress = firebaseAddress.address ? firebaseAddress : await getLocalOrderAddress(transaction.order_id || transaction.id);

    return {
      id: transaction.id?.toString() || transaction.order_id?.toString() || Date.now().toString(),
      orderId: transaction.order_id || transaction.id,
      date: transaction.created_at || transaction.date || new Date().toISOString(),
      status: mapTransactionStatus(transaction.payment_status), // Utiliser payment_status au lieu de status
      items: transformedItems,
      itemsCount: totalItems,
      subtotal: parseFloat(transaction.amount || 0),
      deliveryFee: 0, // Pas de frais de livraison dans l'API
      total: parseFloat(transaction.amount || 0),
      distance: 0,
      payment_method: transaction.payment_method || 'cash',
      address: localAddress.address || transaction.delivery_address || transaction.address || transaction.shipping_address || '',
      phone: localAddress.phone || transaction.delivery_phone || transaction.phone || transaction.customer_phone || '',
      restaurant: null,
      // Informations supplémentaires de l'API
      payment_ref: transaction.payment_ref,
      payment_status: transaction.payment_status,
      operator: transaction.operator,
      transaction_id: transaction.id,
      customer_id: transaction.user_id,
      driver_id: null,
      estimated_delivery_time: null,
      actual_delivery_time: null,
             notes: '',
     };
   })
  );
  
  return transformedData;
 };

// Mapper les statuts de l'API vers les statuts de l'app
const mapTransactionStatus = (apiStatus) => {
  const statusMap = {
    'pending': 'en_cours',
    'processing': 'en_cours',
    'preparing': 'en_cours',
    'ready': 'en_cours',
    'out_for_delivery': 'en_cours',
    'paid': 'livré', // Si payé, considérer comme livré
    'delivered': 'livré',
    'completed': 'livré',
    'cancelled': 'annulé',
    'cancelled_by_customer': 'annulé',
    'cancelled_by_restaurant': 'annulé',
    'failed': 'annulé',
    'refunded': 'annulé',
  };

  return statusMap[apiStatus?.toLowerCase()] || 'en_cours';
};

// Récupérer les statistiques des transactions
export const getTransactionStats = async () => {
  try {
    const transactions = await getTransactionHistory();
    
    const stats = {
      total: transactions.length,
      en_cours: transactions.filter(t => t.status === 'en_cours').length,
      livré: transactions.filter(t => t.status === 'livré').length,
      annulé: transactions.filter(t => t.status === 'annulé').length,
      totalAmount: transactions.reduce((sum, t) => sum + (t.total || 0), 0),
    };
    
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

// Rechercher des transactions
export const searchTransactions = async (searchTerm) => {
  try {
    const transactions = await getTransactionHistory();
    const term = searchTerm.toLowerCase();
    
    return transactions.filter(transaction => 
      transaction.restaurant?.name?.toLowerCase().includes(term) ||
      transaction.restaurant?.title?.toLowerCase().includes(term) ||
      transaction.orderId?.toString().includes(term) ||
      transaction.id?.toString().includes(term)
    );
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    return [];
  }
};

// Récupérer une transaction par ID
export const getTransactionById = async (transactionId) => {
  try {
    const transactions = await getTransactionHistory();
    return transactions.find(t => t.id === transactionId || t.orderId === transactionId);
  } catch (error) {
    console.error('Erreur lors de la récupération de la transaction:', error);
    return null;
  }
};

// Filtrer les transactions par statut
export const getTransactionsByStatus = async (status) => {
  try {
    const transactions = await getTransactionHistory();
    return transactions.filter(t => t.status === status);
  } catch (error) {
    console.error('Erreur lors du filtrage des transactions:', error);
    return [];
  }
};
