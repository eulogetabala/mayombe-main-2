import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

const CartSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <Skeleton width={100} height={18} borderRadius={4} />
        <Skeleton width={24} height={24} borderRadius={12} />
      </View>

      {/* Cart Items */}
      <View style={styles.content}>
        <View style={styles.section}>
          <Skeleton width={120} height={20} borderRadius={4} style={styles.sectionTitle} />
          <View style={styles.itemsContainer}>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.cartItem}>
                <Skeleton width={80} height={80} borderRadius={8} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Skeleton width={150} height={16} borderRadius={4} style={styles.itemName} />
                  <Skeleton width={100} height={12} borderRadius={4} style={styles.itemDescription} />
                  <Skeleton width={80} height={16} borderRadius={4} style={styles.itemPrice} />
                </View>
                <View style={styles.itemActions}>
                  <Skeleton width={32} height={32} borderRadius={16} style={styles.quantityButton} />
                  <Skeleton width={40} height={20} borderRadius={4} style={styles.quantity} />
                  <Skeleton width={32} height={32} borderRadius={16} style={styles.quantityButton} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <Skeleton width={100} height={20} borderRadius={4} style={styles.sectionTitle} />
          <View style={styles.summaryItems}>
            <View style={styles.summaryRow}>
              <Skeleton width={80} height={14} borderRadius={4} />
              <Skeleton width={80} height={14} borderRadius={4} />
            </View>
            <View style={styles.summaryRow}>
              <Skeleton width={100} height={14} borderRadius={4} />
              <Skeleton width={80} height={14} borderRadius={4} />
            </View>
            <View style={styles.summaryRow}>
              <Skeleton width={60} height={16} borderRadius={4} />
              <Skeleton width={100} height={18} borderRadius={4} />
            </View>
          </View>
        </View>

        {/* Checkout Button */}
        <View style={styles.checkoutSection}>
          <Skeleton width="100%" height={50} borderRadius={25} style={styles.checkoutButton} />
        </View>
      </View>
    </View>
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
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    flex: 1,
    padding: 20,
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
    marginBottom: 15,
  },
  itemsContainer: {
    gap: 15,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemImage: {
    marginRight: 12,
    marginBottom: 0,
  },
  itemInfo: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    marginBottom: 0,
  },
  itemDescription: {
    marginBottom: 0,
  },
  itemPrice: {
    marginBottom: 0,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    marginBottom: 0,
  },
  quantity: {
    marginBottom: 0,
  },
  summarySection: {
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
  summaryItems: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkoutSection: {
    marginTop: 'auto',
  },
  checkoutButton: {
    marginBottom: 0,
  },
});

export default CartSkeleton;
