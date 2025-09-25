import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getOrders,
  getOrderStats,
  deleteOrder,
} from '../services/orderHistoryService';
// Fonctions de génération de références de commande
const generateFullOrderReference = (orderId, dateString) => {
  try {
    if (dateString) {
      const date = new Date(dateString);
      const year = String(date.getFullYear()).slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      const second = String(date.getSeconds()).padStart(2, '0');
      return `CMD-${year}${month}${day}${hour}${minute}${second}`;
    }
    if (orderId) {
      const idStr = String(orderId);
      const lastDigits = idStr.slice(-12).padStart(12, '0');
      return `CMD-${lastDigits}`;
    }
    return `CMD-${Date.now().toString().slice(-12)}`;
  } catch (error) {
    return `CMD-${Date.now().toString().slice(-12)}`;
  }
};

const generateShortOrderReference = (orderId, dateString) => {
  try {
    if (dateString) {
      const date = new Date(dateString);
      const year = String(date.getFullYear()).slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `CMD-${year}${month}${day}`;
    }
    if (orderId) {
      const idStr = String(orderId);
      const lastDigits = idStr.slice(-6).padStart(6, '0');
      return `CMD-${lastDigits}`;
    }
    return `CMD-${Date.now().toString().slice(-6)}`;
  } catch (error) {
    return `CMD-${Date.now().toString().slice(-6)}`;
  }
};
import { OrderSkeleton } from '../components/Skeletons';

const OrdersHistory = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, activeFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Chargement de l\'historique des transactions...');
      
      const ordersData = await getOrders();
      const statsData = await getOrderStats();
      
      console.log('✅ Données chargées:', {
        ordersCount: ordersData.length,
        stats: statsData
      });
      
      setOrders(ordersData);
      setStats(statsData);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des commandes:', error);
      setError(error.message);
      
      let errorMessage = 'Impossible de charger l\'historique des commandes';
      
      if (error.message.includes('Token utilisateur non trouvé')) {
        errorMessage = 'Veuillez vous reconnecter pour voir vos commandes';
      } else if (error.message.includes('401')) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter';
      } else if (error.message.includes('404')) {
        errorMessage = 'Aucune commande trouvée';
      } else if (error.message.includes('500')) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard';
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const filterOrders = () => {
    let filtered = orders;

    if (activeFilter !== 'all') {
      filtered = filtered.filter(order => order.status === activeFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        // Recherche dans le nom du restaurant
        const restaurantName = order.restaurant?.name?.toLowerCase() || '';
        const restaurantTitle = order.restaurant?.title?.toLowerCase() || '';
        
        // Recherche dans l'ID de commande
        const orderId = order.id?.toString().toLowerCase() || '';
        const orderIdAlt = order.orderId?.toString().toLowerCase() || '';
        
        // Recherche dans les références générées
        const fullReference = generateFullOrderReference(order.orderId || order.id, order.date).toLowerCase();
        const shortReference = generateShortOrderReference(order.orderId || order.id, order.date).toLowerCase();
        
        // Recherche dans les noms des produits
        const productNames = order.items?.map(item => item.name?.toLowerCase() || '').join(' ') || '';
        
        // Recherche dans le montant total
        const totalAmount = order.total?.toString() || '';
        
        // Recherche dans la méthode de paiement
        const paymentMethod = order.payment_method?.toLowerCase() || '';
        
        return (
          restaurantName.includes(term) ||
          restaurantTitle.includes(term) ||
          orderId.includes(term) ||
          orderIdAlt.includes(term) ||
          fullReference.includes(term) ||
          shortReference.includes(term) ||
          productNames.includes(term) ||
          totalAmount.includes(term) ||
          paymentMethod.includes(term)
        );
      });
    }

    setFilteredOrders(filtered);
  };



  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderItem = ({ item }) => {
    // Générer les références professionnelles
    const fullReference = generateFullOrderReference(item.orderId || item.id, item.date);
    const shortReference = generateShortOrderReference(item.orderId || item.id, item.date);
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          console.log('🚀🚀🚀 NAVIGATION VERS ORDERDETAILS 🚀🚀🚀');
          console.log('🔍 Données envoyées:', item);
          navigation.navigate('OrderDetails', { order: item });
        }}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.restaurantName}>
              {item.items && item.items.length > 0 
                ? item.items[0].name 
                : shortReference
              }
            </Text>
            <Text style={styles.orderDate}>{formatDate(item.date)}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.orderId}>{fullReference}</Text>
        <Text style={styles.orderItems}>
          {item.itemsCount || item.items?.length || 0} article{(item.itemsCount || item.items?.length || 0) !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.orderTotal}>{item.total} FCFA</Text>
        {item.payment_method && (
          <Text style={styles.paymentMethod}>
            {item.payment_method === 'cash' ? 'Espèces' : 
             item.payment_method === 'mtn' ? 'MTN Money' :
             item.payment_method === 'airtel' ? 'Airtel Money' : 'Carte'}
          </Text>
        )}
        {item.items && item.items.length > 0 && (
          <Text style={styles.itemsPreview}>
            {item.items.slice(0, 2).map(product => product.name).join(', ')}
            {item.items.length > 2 && '...'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes Commandes</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchContainer}>
          <TouchableOpacity 
            style={styles.searchInputContainer}
            activeOpacity={1}
            onPress={() => {
              console.log('🔍 Container de recherche cliqué');
              // Le TextInput devrait automatiquement recevoir le focus
            }}
          >
            <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une commande..."
              value={searchTerm}
              onChangeText={(text) => {
                console.log('🔍 Texte saisi:', text);
                setSearchTerm(text);
              }}
              onFocus={() => {
                console.log('🔍 TextInput focusé');
              }}
              onBlur={() => {
                console.log('🔍 TextInput perdu le focus');
              }}
              placeholderTextColor="#999"
              editable={true}
              selectTextOnFocus={true}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => {
                console.log('🔍 Recherche soumise:', searchTerm);
              }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchTerm('')}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={[1, 2, 3, 4, 5]} // 5 skeletons
          renderItem={() => <OrderSkeleton />}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Commandes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.searchInputContainer}
          activeOpacity={1}
          onPress={() => {
            console.log('🔍 Container de recherche cliqué');
            // Le TextInput devrait automatiquement recevoir le focus
          }}
        >
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une commande..."
            value={searchTerm}
            onChangeText={(text) => {
              console.log('🔍 Texte saisi:', text);
              setSearchTerm(text);
            }}
            onFocus={() => {
              console.log('🔍 TextInput focusé');
            }}
            onBlur={() => {
              console.log('🔍 TextInput perdu le focus');
            }}
            placeholderTextColor="#999"
            editable={true}
            selectTextOnFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              console.log('🔍 Recherche soumise:', searchTerm);
            }}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchTerm('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="cloud-offline-outline" size={64} color="#ff6b6b" />
              <Text style={styles.errorTitle}>Erreur de connexion</Text>
              <Text style={styles.errorSubtitle}>
                {error.includes('Token') ? 'Veuillez vous reconnecter' : 'Impossible de charger vos commandes'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadOrders}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Aucune commande trouvée</Text>
              <Text style={styles.emptySubtitle}>
                Vous n'avez pas encore passé de commande
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FF9800',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Montserrat',
    color: '#333',
    padding: 0,
    minHeight: 24,
    textAlignVertical: 'center',
  },
  clearButton: {
    marginLeft: 10,
    padding: 4,
    borderRadius: 12,
  },
  ordersList: {
    padding: 20,
    paddingBottom: 100, // Espace pour éviter que les dernières commandes soient cachées
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
  },

  orderDetails: {
    gap: 4,
  },
  orderId: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  orderItems: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  orderTotal: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#51A905',
  },
  paymentMethod: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: '#999',
    fontStyle: 'italic',
  },
  itemsPreview: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#999',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#ff6b6b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

export default OrdersHistory;
