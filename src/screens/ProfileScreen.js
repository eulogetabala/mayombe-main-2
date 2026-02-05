import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import fcmService from '../services/fcmService';


const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState({
    name: 'Utilisateur',
    phone: 'Non renseigné',
  });
  const [lastLoadTime, setLastLoadTime] = useState(0);

  const { currentLanguage, changeLanguage } = useLanguage();
  const { logout } = useAuth();
  const t = translations[currentLanguage];

  // Charger les données au montage du composant
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (userToken) {
          console.log('🚀 Chargement initial des données utilisateur...');
          loadUserData();
        }
      } catch (error) {
        console.error('❌ Erreur chargement initial:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // Charger automatiquement les données utilisateur
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Focus sur ProfileScreen - Chargement automatique...');
      
      const checkAuthAndLoad = async () => {
        try {
          const userToken = await AsyncStorage.getItem('userToken');
          
          if (userToken) {
            console.log('✅ Token trouvé, chargement des données...');
            loadUserData();
          } else {
            console.log('❌ Aucun token trouvé, affichage non connecté');
            setUserData({
              name: 'Non connecté',
              phone: 'Non disponible',
            });
          }
        } catch (error) {
          console.error('❌ Erreur vérification auth:', error);
        }
      };
      
      checkAuthAndLoad();
    }, [])
  );

  const loadUserData = async () => {
    try {
      // Vérifier le token
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (userToken) {
        console.log('🔄 Chargement des données utilisateur...');
        
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
        
        // Utiliser les données reçues du serveur
        setUserData({
          name: data?.name || data?.user?.name || 'Utilisateur',
          phone: data?.phone || data?.user?.phone || 'Non renseigné',
        });
        
        console.log('📱 Données utilisateur mises à jour:', {
          name: data?.name || data?.user?.name,
          phone: data?.phone || data?.user?.phone
        });
        
        // Mettre à jour le timestamp du cache
        setLastLoadTime(Date.now());
      } else {
        console.log('❌ Aucun token utilisateur trouvé');
        setUserData({
          name: 'Non connecté',
          phone: 'Non disponible',
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données utilisateur:', error);
      
      // Gérer l'erreur de manière appropriée
      setUserData({
        name: 'Erreur de chargement',
        phone: 'Non disponible',
      });
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
      // Utiliser la fonction logout du contexte d'authentification
      await logout();
      await AsyncStorage.removeItem('selectedLanguage');
      navigation.reset({
        index: 0,
        routes: [{ name: 'LanguageSelection' }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Supprimer le compte",
      "Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            // Confirmation supplémentaire
            Alert.alert(
              "Confirmation finale",
              "Cette action supprimera définitivement votre compte et toutes vos données. Voulez-vous vraiment continuer ?",
              [
                {
                  text: "Non, annuler",
                  style: "cancel"
                },
                {
                  text: "Oui, supprimer",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const userToken = await AsyncStorage.getItem('userToken');
                      if (!userToken) {
                        Alert.alert('Erreur', 'Vous devez être connecté pour supprimer votre compte');
                        return;
                      }

                      console.log('🗑️ Suppression du compte utilisateur...');
                      
                      const response = await fetch(`${API_BASE_URL}/delete-account`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${userToken}`,
                          'Accept': 'application/json',
                          'Content-Type': 'application/json',
                        },
                      });

                      const data = await response.json();
                      console.log('📥 Réponse suppression compte:', data);

                      if (response.ok) {
                        // Supprimer toutes les données locales
                        await AsyncStorage.removeItem('userToken');
                        await AsyncStorage.removeItem('selectedLanguage');
                        await AsyncStorage.removeItem('isGuest');
                        
                        Alert.alert(
                          "Compte supprimé",
                          "Votre compte a été supprimé avec succès.",
                          [
                            {
                              text: "OK",
                              onPress: () => {
                                navigation.reset({
                                  index: 0,
                                  routes: [{ name: 'LanguageSelection' }],
                                });
                              }
                            }
                          ]
                        );
                      } else {
                        Alert.alert('Erreur', data.message || 'Erreur lors de la suppression du compte');
                      }
                    } catch (error) {
                      console.error('❌ Erreur lors de la suppression du compte:', error);
                      Alert.alert('Erreur', 'Impossible de supprimer le compte. Veuillez réessayer.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

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

          <TouchableOpacity 
            style={styles.deleteAccountButton} 
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteAccountText}>Supprimer le compte</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
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
  deleteAccountButton: {
    marginTop: 15,
    marginHorizontal: 20,
    backgroundColor: '#FF4444',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteAccountText: {
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