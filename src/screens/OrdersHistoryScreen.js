import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView 
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
// Fonction de génération de référence de commande
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

const OrdersHistoryScreen = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const storedOrders = await AsyncStorage.getItem('orders');
      if (storedOrders) {
        const parsedOrders = JSON.parse(storedOrders);
        setOrders(parsedOrders.reverse()); // Plus récentes commandes d'abord
      }
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
    }
  };

  const getOrderStatus = (status) => {
    switch (status) {
      case 'pending':
        return { text: 'En cours', color: '#FFA500' };
      case 'completed':
        return { text: 'Terminée', color: '#51A905' };
      case 'cancelled':
        return { text: 'Annulée', color: '#FF0000' };
      default:
        return { text: 'En attente', color: '#666' };
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const renderOrderItem = ({ item }) => {
    const status = getOrderStatus(item.status);
    const orderReference = generateFullOrderReference(item.orderNumber || item.id, item.date);
    
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>{orderReference}</Text>
          <Text style={[styles.orderStatus, { color: status.color }]}>
            {status.text}
          </Text>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.dateText}>
            {formatDate(item.date)}
          </Text>
          <Text style={styles.itemsCount}>
            {item.items.length} {item.items.length > 1 ? 'articles' : 'article'}
          </Text>
        </View>

        <FlatList
          data={item.items}
          renderItem={({ item: orderItem }) => (
            <View style={styles.orderItemRow}>
              <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
              <Text style={styles.itemName}>{orderItem.name}</Text>
              <Text style={styles.itemPrice}>{orderItem.total} FCFA</Text>
            </View>
          )}
          keyExtractor={(orderItem, index) => `${item.orderNumber}-${index}`}
          scrollEnabled={false}
        />

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{item.totalAmount} FCFA</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Commandes</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#51A905" />
          <Text style={styles.emptyText}>Aucune commande effectuée</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.orderNumber}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  listContainer: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  orderStatus: {
    fontSize: 14,
    fontFamily: 'Montserrat-SemiBold',
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
  },
  itemsCount: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemQuantity: {
    width: 40,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat-Medium',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat-Regular',
  },
  itemPrice: {
    fontSize: 14,
    color: '#51A905',
    fontFamily: 'Montserrat-SemiBold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  totalAmount: {
    fontSize: 18,
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontFamily: 'Montserrat-Regular',
  },
});

export default OrdersHistoryScreen; 