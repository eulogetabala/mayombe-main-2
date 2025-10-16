import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteOrder } from '../services/orderHistoryService';

const OrderDetails = ({ navigation, route }) => {
  // Vérification sécurisée des paramètres
  if (!route?.params?.order) {
    console.error('❌ OrderDetails: Paramètres manquants');
    Alert.alert('Erreur', 'Impossible de charger les détails de la commande');
    navigation.goBack();
    return null;
  }

  const { order } = route.params;
  const [isLoading, setIsLoading] = useState(false);

  // Formatage de la date
  const formattedDate = useMemo(() => {
    try {
      if (!order?.date) return 'Date non disponible';
      const date = new Date(order.date);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return 'Date non disponible';
    }
  }, [order?.date]);

  // Calcul du statut
  const orderStatus = useMemo(() => {
    try {
      // Vérifier delivery_status en priorité, puis status, puis payment_status
      const status = (order?.delivery_status || order?.status || order?.payment_status || '').toLowerCase();
      return {
        isInProgress: status.includes('en_cours') || status.includes('preparing'),
        isCompleted: status.includes('delivered') || status.includes('completed') || status.includes('livré'),
        isPending: status.includes('pending') || status.includes('en_attente')
      };
    } catch (error) {
      console.error('Erreur calcul statut:', error);
      return { isInProgress: false, isCompleted: false, isPending: false };
    }
  }, [order?.status, order?.delivery_status, order?.payment_status]);

  // Couleur du statut
  const statusColor = useMemo(() => {
    try {
      // Vérifier delivery_status en priorité, puis status, puis payment_status
      const status = (order?.delivery_status || order?.status || order?.payment_status || '').toLowerCase();
      if (status.includes('delivered') || status.includes('completed') || status.includes('livré')) {
        return '#4CAF50';
      } else if (status.includes('en_cours') || status.includes('preparing')) {
        return '#FF9800';
      } else if (status.includes('pending') || status.includes('en_attente')) {
        return '#2196F3';
      }
      return '#9E9E9E';
    } catch (error) {
      console.error('Erreur calcul couleur:', error);
      return '#9E9E9E';
    }
  }, [order?.status, order?.delivery_status, order?.payment_status]);

  // Texte du statut
  const statusText = useMemo(() => {
    try {
      // Vérifier delivery_status en priorité, puis status, puis payment_status
      const status = (order?.delivery_status || order?.status || order?.payment_status || '').toLowerCase();
      if (status.includes('delivered') || status.includes('completed') || status.includes('livré')) {
        return 'Livré';
      } else if (status.includes('en_cours') || status.includes('preparing')) {
        return 'En cours';
      } else if (status.includes('pending') || status.includes('en_attente')) {
        return 'En attente';
      }
      return 'Statut inconnu';
    } catch (error) {
      console.error('Erreur calcul texte statut:', error);
      return 'Statut inconnu';
    }
  }, [order?.status, order?.delivery_status, order?.payment_status]);

  // Informations du produit/restaurant
  const productInfo = useMemo(() => {
    try {
      const hasRestaurant = order?.restaurant?.name || order?.restaurant?.title;
      return {
        title: hasRestaurant ? 'Restaurant' : 'Produit',
        name: String(hasRestaurant || (order?.items && order.items.length > 0 ? order.items[0]?.name : 'Produit') || 'Produit'),
        address: order?.restaurant?.address ? String(order.restaurant.address) : null
      };
    } catch (error) {
      console.error('Erreur calcul productInfo:', error);
      return {
        title: 'Produit',
        name: 'Produit',
        address: null
      };
    }
  }, [order?.restaurant, order?.items]);

  // Fonction pour supprimer la commande
  const handleDeleteOrder = async () => {
    Alert.alert(
      'Supprimer la commande',
      'Êtes-vous sûr de vouloir supprimer cette commande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteOrder(order.id);
              Alert.alert('Succès', 'Commande supprimée avec succès');
              navigation.goBack();
            } catch (error) {
              console.error('Erreur suppression commande:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la commande');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Fonction pour rendre un article
  const renderOrderItem = (item, index) => {
    // Protection contre les items null/undefined
    if (!item) {
      return null;
    }
    
    return (
      <View key={index} style={styles.orderItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{String(item?.name || 'Article')}</Text>
          <Text style={styles.itemQuantity}>x{String(item?.quantity || 1)}</Text>
          <Text style={styles.itemUnitPrice}>
            {`${String(item?.unitPrice || item?.price || 0)} FCFA l'unité`}
          </Text>
        </View>
        <Text style={styles.itemPrice}>
          {`${String(item?.total || ((item?.price || 0) * (item?.quantity || 1)))} FCFA`}
        </Text>
      </View>
    );
  };

  // Protection supplémentaire
  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détails de la commande</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Commande non trouvée</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Vérification supplémentaire des données critiques
  const safeOrder = {
    ...order,
    items: Array.isArray(order.items) ? order.items.filter(item => item != null) : [],
    restaurant: order.restaurant || {},
    status: String(order.status || 'unknown'),
    total: Number(order.total) || 0,
    subtotal: Number(order.subtotal) || 0,
    deliveryFee: Number(order.deliveryFee) || 0,
    orderId: String(order.orderId || order.id || 'N/A'),
    payment_method: String(order.payment_method || 'unknown'),
    distance: Number(order.distance) || 0,
    payment_ref: String(order.payment_ref || ''),
    date: order.date || new Date().toISOString()
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la commande</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteOrder}
          disabled={isLoading}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Restaurant/Produit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {String(productInfo.title || 'Information')}
          </Text>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>
              {String(productInfo.name || 'Non spécifié')}
            </Text>
            {productInfo.address && (
              <Text style={styles.restaurantAddress}>
                {String(productInfo.address)}
              </Text>
            )}
          </View>
        </View>

        {/* Section Informations de la commande */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de la commande</Text>
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Numéro de commande:</Text>
              <Text style={styles.infoValue}>
                # {safeOrder.orderId}
              </Text>
            </View>
            {safeOrder.payment_ref && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Référence de paiement:</Text>
                <Text style={styles.infoValue}>{safeOrder.payment_ref}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{String(formattedDate || 'Date non disponible')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Méthode de paiement:</Text>
              <Text style={styles.infoValue}>
                {safeOrder.payment_method === 'cash' ? 'Espèces' :
                 safeOrder.payment_method === 'mtn' ? 'MTN Money' :
                 safeOrder.payment_method === 'mambopay' ? 'MamboPay' :
                 safeOrder.payment_method === 'airtel' ? 'Airtel Money' : 
                 safeOrder.payment_method === 'unknown' ? 'Non spécifié' : safeOrder.payment_method}
              </Text>
            </View>
            {safeOrder.distance > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Distance:</Text>
                <Text style={styles.infoValue}>
                  {`${safeOrder.distance} km`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section Articles commandés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles commandés</Text>
          <View style={styles.itemsContainer}>
            {safeOrder.items.map((item, index) => renderOrderItem(item, index))}
          </View>
        </View>

        {/* Section Statut de la commande */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut de la commande</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{String(statusText || 'Statut inconnu')}</Text>
            </View>
            {orderStatus?.isInProgress && (
              <Text style={styles.statusInfo}>
                Votre commande est en cours de préparation et sera bientôt en route
              </Text>
            )}
            {orderStatus?.isCompleted && (
              <Text style={styles.statusInfo}>
                Votre commande a été livrée avec succès
              </Text>
            )}
            
            
            {/* Bouton de suivi pour les commandes en cours */}
            {(orderStatus?.isInProgress || orderStatus?.isPending) && (
              <TouchableOpacity 
                style={styles.trackingButton}
                onPress={() => {
                  console.log('🚀 Navigation vers OrderTracking avec:', safeOrder);
                  navigation.navigate('OrderTracking', { 
                    order: safeOrder,
                    orderId: safeOrder.orderId,
                    restaurant: safeOrder.restaurant
                  });
                }}
              >
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.trackingButtonText}>Suivre la commande</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section Résumé */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé</Text>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total:</Text>
              <Text style={styles.summaryValue}>
                {`${safeOrder.subtotal} FCFA`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Frais de livraison:</Text>
              <Text style={styles.summaryValue}>
                {`${safeOrder.deliveryFee} FCFA`}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                {`${safeOrder.total} FCFA`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  restaurantInfo: {
    // gap: 8, // Non supporté dans toutes les versions
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
  },
  orderInfo: {
    // gap: 12, // Non supporté dans toutes les versions
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  itemsContainer: {
    // gap: 16, // Non supporté dans toutes les versions
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 16,
  },
  itemInfo: {
    flex: 1,
    // gap: 4, // Non supporté dans toutes les versions
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemUnitPrice: {
    fontSize: 12,
    color: '#999',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  statusContainer: {
    alignItems: 'center',
    // gap: 12, // Non supporté dans toutes les versions
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  trackingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  summary: {
    // gap: 12, // Non supporté dans toutes les versions
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
});

export default OrderDetails;