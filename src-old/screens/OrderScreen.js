import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const OrderScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const ordersData = await AsyncStorage.getItem('orders');
      if (ordersData) {
        const parsedOrders = JSON.parse(ordersData);
        setOrders(parsedOrders);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearOrders = () => {
    Alert.alert(
      'Effacer les commandes',
      'Êtes-vous sûr de vouloir effacer toutes les commandes ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('orders');
              setOrders([]);
              Alert.alert('Succès', 'Commandes effacées avec succès');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'effacer les commandes');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Chargement des commandes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Commandes</Text>
        {orders.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearOrders}>
            <Text style={styles.clearButtonText}>Effacer tout</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune commande trouvée</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.shopButtonText}>Faire des achats</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order, index) => (
            <View key={index} style={styles.orderCard}>
              <Text style={styles.orderTitle}>Commande #{index + 1}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.date || Date.now()).toLocaleDateString()}
              </Text>
              <Text style={styles.orderTotal}>
                Total: {order.total || 0} FCFA
              </Text>
              {order.items && (
                <Text style={styles.orderItems}>
                  {order.items.length} article(s)
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  clearButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    fontFamily: 'Montserrat-Regular',
  },
  shopButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    fontFamily: 'Montserrat-Bold',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Montserrat-Regular',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 5,
    fontFamily: 'Montserrat-Bold',
  },
  orderItems: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
  },
});

export default OrderScreen;
