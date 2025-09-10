import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

const OrderDetailsSkeleton = () => {
  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <Skeleton width={150} height={18} borderRadius={4} />
        <Skeleton width={24} height={24} borderRadius={12} />
      </View>

      <View style={styles.content}>
        {/* Restaurant Section */}
        <View style={styles.section}>
          <Skeleton width={100} height={18} borderRadius={4} style={styles.sectionTitle} />
          <View style={styles.restaurantInfo}>
            <Skeleton width={200} height={16} borderRadius={4} style={styles.restaurantName} />
            <Skeleton width={180} height={14} borderRadius={4} style={styles.restaurantAddress} />
          </View>
        </View>

        {/* Order Info Section */}
        <View style={styles.section}>
          <Skeleton width={180} height={18} borderRadius={4} style={styles.sectionTitle} />
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Skeleton width={120} height={14} borderRadius={4} />
              <Skeleton width={80} height={14} borderRadius={4} />
            </View>
            <View style={styles.infoRow}>
              <Skeleton width={60} height={14} borderRadius={4} />
              <Skeleton width={120} height={14} borderRadius={4} />
            </View>
            <View style={styles.infoRow}>
              <Skeleton width={140} height={14} borderRadius={4} />
              <Skeleton width={60} height={14} borderRadius={4} />
            </View>
            <View style={styles.infoRow}>
              <Skeleton width={150} height={14} borderRadius={4} />
              <Skeleton width={100} height={14} borderRadius={4} />
            </View>
          </View>
        </View>

        {/* Items Section */}
        <View style={styles.section}>
          <Skeleton width={140} height={18} borderRadius={4} style={styles.sectionTitle} />
          <View style={styles.itemsContainer}>
            <View style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Skeleton width={150} height={16} borderRadius={4} />
                <Skeleton width={40} height={14} borderRadius={4} />
                <Skeleton width={100} height={12} borderRadius={4} />
              </View>
              <Skeleton width={80} height={16} borderRadius={4} />
            </View>
            <View style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Skeleton width={120} height={16} borderRadius={4} />
                <Skeleton width={40} height={14} borderRadius={4} />
                <Skeleton width={100} height={12} borderRadius={4} />
              </View>
              <Skeleton width={70} height={16} borderRadius={4} />
            </View>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Skeleton width={80} height={18} borderRadius={4} style={styles.sectionTitle} />
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Skeleton width={80} height={14} borderRadius={4} />
              <Skeleton width={100} height={14} borderRadius={4} />
            </View>
            <View style={styles.summaryRow}>
              <Skeleton width={120} height={14} borderRadius={4} />
              <Skeleton width={80} height={14} borderRadius={4} />
            </View>
            <View style={styles.summaryRow}>
              <Skeleton width={60} height={16} borderRadius={4} />
              <Skeleton width={100} height={18} borderRadius={4} />
            </View>
          </View>
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
    marginBottom: 12,
  },
  restaurantInfo: {
    gap: 8,
  },
  restaurantName: {
    marginBottom: 4,
  },
  restaurantAddress: {
    marginBottom: 0,
  },
  orderInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsContainer: {
    gap: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  summary: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default OrderDetailsSkeleton;
