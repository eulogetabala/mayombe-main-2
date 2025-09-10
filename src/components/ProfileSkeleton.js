import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

const ProfileSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          <Skeleton width={120} height={24} borderRadius={4} />
          <Skeleton width={200} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Skeleton width={70} height={70} borderRadius={35} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Skeleton width={150} height={20} borderRadius={4} style={styles.userName} />
          <Skeleton width={120} height={14} borderRadius={4} style={styles.userPhone} />
          <Skeleton width={140} height={14} borderRadius={4} style={styles.userEmail} />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Skeleton width={24} height={24} borderRadius={12} />
              <Skeleton width={120} height={16} borderRadius={4} style={styles.menuItemText} />
            </View>
            <Skeleton width={24} height={24} borderRadius={12} />
          </View>
        ))}
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <Skeleton width="100%" height={50} borderRadius={15} style={styles.logoutButton} />
      </View>

      {/* Version */}
      <View style={styles.versionSection}>
        <Skeleton width={80} height={12} borderRadius={4} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  customHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    backgroundColor: '#FF9800',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    gap: 4,
  },
  profileSection: {
    padding: 20,
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    marginRight: 15,
    marginBottom: 0,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    marginBottom: 0,
  },
  userPhone: {
    marginBottom: 0,
  },
  userEmail: {
    marginBottom: 0,
  },
  menuSection: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 15,
    marginBottom: 0,
  },
  logoutSection: {
    marginTop: 30,
    marginHorizontal: 20,
  },
  logoutButton: {
    marginBottom: 0,
  },
  versionSection: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default ProfileSkeleton;
