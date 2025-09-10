import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

const OrderSkeleton = () => {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Skeleton width={200} height={20} borderRadius={4} style={styles.titleSkeleton} />
          <Skeleton width={150} height={16} borderRadius={4} style={styles.dateSkeleton} />
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Skeleton width={120} height={14} borderRadius={4} style={styles.idSkeleton} />
        <Skeleton width={100} height={14} borderRadius={4} style={styles.itemsSkeleton} />
        <Skeleton width={80} height={16} borderRadius={4} style={styles.totalSkeleton} />
        <Skeleton width={60} height={12} borderRadius={4} style={styles.paymentSkeleton} />
        <Skeleton width={180} height={13} borderRadius={4} style={styles.previewSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  titleSkeleton: {
    marginBottom: 4,
  },
  dateSkeleton: {
    marginBottom: 0,
  },
  orderDetails: {
    gap: 4,
  },
  idSkeleton: {
    marginBottom: 2,
  },
  itemsSkeleton: {
    marginBottom: 2,
  },
  totalSkeleton: {
    marginBottom: 2,
  },
  paymentSkeleton: {
    marginBottom: 2,
  },
  previewSkeleton: {
    marginTop: 4,
  },
});

export default OrderSkeleton;
