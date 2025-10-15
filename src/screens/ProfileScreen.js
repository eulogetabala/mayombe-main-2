import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useFocusEffect } from '@react-navigation/native';
import { ProfileSkeleton } from '../components/Skeletons';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState({
    name: 'Utilisateur',
    phone: 'Non renseigné',
    email: 'email@example.com',
  });
  const [isLoading, setIsLoading] = useState(true);

  const { currentLanguage, changeLanguage } = useLanguage();
  const { logout } = useAuth();
  const t = translations[currentLanguage];

  // Recharger les données à chaque fois qu'on revient sur cet écran
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Focus sur ProfileScreen - Rechargement des données...');
      
      // Vérifier d'abord le contexte d'authentification
      const checkAuthAndLoad = async () => {
        try {
          const userToken = await AsyncStorage.getItem('userToken');
          console.log('🔍 Vérification auth au focus:', { 
            hasToken: !!userToken,
            isAuthenticated: !!userToken
          });
          
          if (userToken) {
            loadUserData();
          } else {
            console.log('❌ Aucun token trouvé au focus, affichage non connecté');
            setUserData({
              name: 'Non connecté',
              phone: 'Non disponible',
              email: 'Non disponible',
            });
            setIsLoading(false); // Arrêter le chargement
          }
        } catch (error) {
          console.error('❌ Erreur vérification auth:', error);
          setIsLoading(false); // Arrêter le chargement en cas d'erreur
        }
      };
      
      checkAuthAndLoad();
    }, [])
  );

  const loadUserData = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      
      // Vérifier le token avec plus de détails
      const userToken = await AsyncStorage.getItem('userToken');
      console.log('🔍 Vérification du token:', { 
        hasToken: !!userToken, 
        tokenLength: userToken?.length,
        tokenPreview: userToken ? userToken.substring(0, 20) + '...' : 'null'
      });
      
      if (userToken) {
        console.log(`🔄 Rechargement des données utilisateur... (tentative ${retryCount + 1})`);
        
        // Attendre un peu plus longtemps pour les nouvelles activations
        if (retryCount === 0) {
          console.log('⏳ Attente initiale de 3 secondes pour la synchronisation...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
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
        
        // Vérifier si les données sont complètes
        if (data && data.name && data.phone && data.name !== 'Utilisateur') {
          console.log('✅ Données complètes trouvées:', data);
          setUserData(data);
        } else if (retryCount < 5) {
          // Augmenter le nombre de tentatives et les délais
          const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s, 8s, 10s
          console.log(`⚠️ Données incomplètes (${data?.name || 'vide'}), nouvelle tentative dans ${delay/1000} secondes...`);
          setTimeout(() => {
            loadUserData(retryCount + 1);
          }, delay);
          return;
        } else {
          // Après 5 tentatives, utiliser les données partielles ou par défaut
          console.log('⚠️ Après 5 tentatives, utilisation des données par défaut');
          setUserData({
            name: data?.name || 'Utilisateur non enregistré',
            phone: data?.phone || 'Non renseigné',
            email: data?.email || 'email@example.com',
          });
        }
      } else {
        console.log('❌ Aucun token utilisateur trouvé');
        setUserData({
          name: 'Non connecté',
          phone: 'Non disponible',
          email: 'Non disponible',
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données utilisateur:', error);
      
      // Si c'est une erreur de réseau ou serveur, réessayer
      if (retryCount < 3) {
        const delay = (retryCount + 1) * 3000; // 3s, 6s, 9s
        console.log(`⚠️ Erreur réseau, nouvelle tentative dans ${delay/1000} secondes...`);
        setTimeout(() => {
          loadUserData(retryCount + 1);
        }, delay);
        return;
      }
      
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
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              console.log('🔄 Rechargement manuel des données utilisateur...');
              loadUserData();
            }}
          >
            <Ionicons name="refresh" size={24} color="#FF9800" />
          </TouchableOpacity>
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
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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