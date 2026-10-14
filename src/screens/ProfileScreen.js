import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, SafeAreaView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureTokenStorage from '../services/secureTokenStorage';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const PROFILE_CACHE_KEY = 'userProfileCache';

// Extrait le nom depuis la réponse de l'API en gérant plusieurs structures possibles
const extractName = (data) => {
  if (!data) return null;
  return data.name
    || data.user?.name
    || data.user?.full_name
    || data.data?.name
    || data.data?.user?.name
    || data.profile?.name
    || data.nom
    || null;
};

// Extrait le téléphone depuis la réponse de l'API
const extractPhone = (data) => {
  if (!data) return null;
  return data.phone
    || data.user?.phone
    || data.data?.phone
    || data.data?.user?.phone
    || data.profile?.phone
    || data.telephone
    || null;
};

// Extrait l'email depuis la réponse de l'API
const extractEmail = (data) => {
  if (!data) return null;
  return data.email
    || data.user?.email
    || data.data?.email
    || data.data?.user?.email
    || data.profile?.email
    || null;
};

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState({
    name: '',
    phone: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState(0);

  const { currentLanguage, changeLanguage } = useLanguage();
  const { logout } = useAuth();
  const t = translations[currentLanguage];

  // Charge le cache local du profil (affichage immédiat même hors ligne)
  const loadProfileCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name) {
          setUserData(prev => ({
            name: parsed.name || prev.name,
            phone: parsed.phone || prev.phone,
          }));
        }
      }
    } catch (error) {
      // Cache illisible : ignorer silencieusement
    }
    // Ne pas désactiver le loader ici : il s'arrête dans loadUserData,
    // une fois le fetch réseau terminé. La condition d'affichage
    // (loadingProfile && !userData.name) montre déjà le cache s'il existe.
  };

  // Sauvegarde le profil en cache local
  const saveProfileCache = (name, phone, email) => {
    try {
      AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
        name: name || '',
        phone: phone || '',
        email: email || '',
        savedAt: Date.now(),
      })).catch(() => {});
    } catch (error) {
      // Ignorer les erreurs de cache
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        loadProfileCache();
        const userToken = await secureTokenStorage.getToken();
        if (userToken) {
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
      const checkAuthAndLoad = async () => {
        try {
          loadProfileCache();
          const userToken = await secureTokenStorage.getToken();
          
          if (userToken) {
            loadUserData();
          } else {
            // Pas de token : garder le cache local si disponible
            const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed?.name) {
                setUserData({
                  name: parsed.name,
                  phone: parsed.phone || 'Non renseigné',
                });
                setLoadingProfile(false);
                return;
              }
            }
            setUserData({
              name: 'Non connecté',
              phone: 'Non disponible',
            });
            setLoadingProfile(false);
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
      const userToken = await secureTokenStorage.getToken();
      
      if (userToken) {
        setLoadingProfile(true);
        
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
        
        // Extraire les informations avec gestion robuste de la structure
        const name = extractName(data);
        const phone = extractPhone(data);
        const email = extractEmail(data);
        
        if (name) {
          setUserData({
            name,
            phone: phone || 'Non renseigné',
          });
          
          // Mettre à jour le cache local
          saveProfileCache(name, phone, email);
        } else {
          // La réponse ne contient pas le nom : garder le cache existant
          const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.name) {
              setUserData({
                name: parsed.name,
                phone: parsed.phone || 'Non renseigné',
              });
            }
          }
        }
        
        // Mettre à jour le timestamp du cache
        setLastLoadTime(Date.now());
      } else {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.name) {
            setUserData({
              name: parsed.name,
              phone: parsed.phone || 'Non renseigné',
            });
            return;
          }
        }
        setUserData({
          name: 'Non connecté',
          phone: 'Non disponible',
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données utilisateur:', error);
      
      // En cas d'erreur réseau, afficher les données du cache local si disponibles
      const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY).catch(() => null);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.name) {
            setUserData({
              name: parsed.name,
              phone: parsed.phone || 'Non renseigné',
            });
            return;
          }
        } catch (parseError) {
          // Cache illisible
        }
      }
      
      setUserData({
        name: 'Erreur de chargement',
        phone: 'Non disponible',
      });
    } finally {
      setLoadingProfile(false);
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
                      const userToken = await secureTokenStorage.getToken();
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
                        await secureTokenStorage.removeToken();
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
              {loadingProfile && !userData.name ? (
                <ActivityIndicator size="small" color="#FF9800" style={{ alignSelf: 'flex-start' }} />
              ) : (
                <Text style={styles.userName}>{userData.name || 'Utilisateur'}</Text>
              )}
              <Text style={styles.userPhone}>{userData.phone || 'Non renseigné'}</Text>
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