import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useFocusEffect } from '@react-navigation/native';
import { ProfileSkeleton } from '../components/Skeletons';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState({
    name: 'Utilisateur',
    phone: 'Non renseigné',
    email: 'email@example.com',
  });
  const [isLoading, setIsLoading] = useState(true);

  const { currentLanguage, changeLanguage } = useLanguage();
  const t = translations[currentLanguage];

  // Recharger les données à chaque fois qu'on revient sur cet écran
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Focus sur ProfileScreen - Rechargement des données...');
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        console.log('🔄 Rechargement des données utilisateur...');
        const response = await fetch(`${API_BASE_URL}/user`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('❌ Erreur API:', response.status);
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Données utilisateur reçues:', data);
        setUserData(data);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données utilisateur:', error);
      // Gérer l'erreur de manière appropriée
      setUserData({
        name: 'Erreur de chargement',
        phone: 'Non disponible',
        email: 'Non disponible',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    {
      icon: 'person-outline',
      title: t.profile.editProfile,
      onPress: () => navigation.navigate('EditProfile')
    },
    {
      icon: 'receipt-outline',
      title: t.profile.myOrders,
      onPress: () => navigation.navigate('OrdersHistory')
    },
    {
      icon: 'language',
      title: t.profile.language,
      onPress: () => navigation.navigate('LanguageSettings')
    }
  ];

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('selectedLanguage');
      navigation.reset({
        index: 0,
        routes: [{ name: 'LanguageSelection' }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Afficher le skeleton pendant le chargement
  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.customHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t.profile.title}</Text>
            <Text style={styles.headerSubtitle}>Gérez votre profil et vos commandes</Text>
          </View>
        </View>
        <ScrollView style={styles.scrollView}>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>{userData.name}</Text>
              <Text style={styles.userPhone}>{userData.phone}</Text>
              <Text style={styles.userEmail}>{userData.email}</Text>
            </View>
          </View>

          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon} size={24} color="#FF9800" />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>{t.profile.logout}</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Version 1.0.0</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
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
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Montserrat',
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
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 28,
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
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
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  logoutButton: {
    marginTop: 30,
    marginHorizontal: 20,
    backgroundColor: '#51A905',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 30,
    fontFamily: 'Montserrat',
  }
});

export default ProfileScreen;