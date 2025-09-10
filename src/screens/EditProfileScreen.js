import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const EditProfileScreen = ({ navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    id: null,
    name: '',
    phone: '',
  });
  
  // États pour gérer l'affichage des sections
  const [showNameSection, setShowNameSection] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  
  // États pour les formulaires
  const [nameForm, setNameForm] = useState({
    name: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        console.log('🔍 Chargement des données utilisateur...');
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
        setNameForm({
          name: data.name || '',
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données utilisateur:', error);
      Alert.alert('Erreur', 'Impossible de charger les données utilisateur');
    }
  };

  const handleUpdateName = async () => {
    if (!nameForm.name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom');
      return;
    }

    if (nameForm.name.trim() === userData.name) {
      Alert.alert('Information', 'Aucune modification détectée');
      return;
    }

    setLoading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      const success = await updateUserName(nameForm.name.trim(), userToken);
      if (success) {
        setShowNameSection(false);
        setUserData(prev => ({ ...prev, name: nameForm.name }));
      }
    } catch (error) {
      console.error('❌ Erreur détaillée:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe actuel');
      return;
    }

    if (!passwordForm.password) {
      Alert.alert('Erreur', 'Veuillez entrer le nouveau mot de passe');
      return;
    }

    if (!passwordForm.confirmPassword) {
      Alert.alert('Erreur', 'Veuillez confirmer le nouveau mot de passe');
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      const success = await changeUserPassword(passwordForm.currentPassword, passwordForm.password, userToken);
      if (success) {
        setShowPasswordSection(false);
        setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('❌ Erreur détaillée:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour le nom de l'utilisateur
  const updateUserName = async (newName, userToken) => {
    try {
      console.log('🔄 Mise à jour du nom...');
      
      const response = await fetch(`${API_BASE_URL}/update-user-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userData.id,
          phone: userData.phone,
          name: newName,
        }),
      });

      const data = await response.json();
      console.log('📥 Réponse de l\'API update-user-profile:', data);

      if (response.ok) {
        console.log('✅ Nom mis à jour avec succès');
        Alert.alert('Succès', 'Votre nom a été mis à jour avec succès');
        return true;
      } else {
        console.error('❌ Erreur lors de la mise à jour du nom:', data);
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join('\n');
          Alert.alert('Erreur', errorMessages);
        } else {
          Alert.alert('Erreur', data.message || 'Impossible de mettre à jour le nom');
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du nom:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour du nom');
      return false;
    }
  };

  // Fonction pour changer le mot de passe de l'utilisateur
  const changeUserPassword = async (currentPassword, newPassword, userToken) => {
    try {
      console.log('🔄 Changement du mot de passe...');
      
      const response = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      console.log('📥 Réponse de l\'API change-password:', data);

      if (response.ok) {
        console.log('✅ Mot de passe changé avec succès');
        Alert.alert('Succès', 'Votre mot de passe a été changé avec succès');
        return true;
      } else {
        console.error('❌ Erreur lors du changement de mot de passe:', data);
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join('\n');
          Alert.alert('Erreur', errorMessages);
        } else {
          Alert.alert('Erreur', data.message || 'Impossible de changer le mot de passe');
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors du changement de mot de passe:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du changement de mot de passe');
      return false;
    }
  };

  const toggleNameSection = () => {
    setShowNameSection(!showNameSection);
    setShowPasswordSection(false);
  };

  const togglePasswordSection = () => {
    setShowPasswordSection(!showPasswordSection);
    setShowNameSection(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.profile.editProfile}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            {/* Section Informations non modifiables */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Informations non modifiables</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Téléphone:</Text>
                <Text style={styles.infoValue}>{userData.phone || 'Non renseigné'}</Text>
              </View>
              <Text style={styles.infoNote}>
                Le numéro de téléphone ne peut pas être modifié car il sert d'identifiant unique pour votre compte.
              </Text>
            </View>

            <View style={styles.separator} />

            {/* Option 1: Modifier le nom */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={toggleNameSection}
            >
              <View style={styles.optionContent}>
                <Ionicons name="person-outline" size={24} color="#51A905" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Modifier le nom</Text>
                  <Text style={styles.optionSubtitle}>
                    Nom actuel: {userData.name || 'Non renseigné'}
                  </Text>
                </View>
                <Ionicons 
                  name={showNameSection ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#666" 
                />
              </View>
            </TouchableOpacity>

            {/* Section de modification du nom */}
            {showNameSection && (
              <View style={styles.sectionContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nouveau nom</Text>
                  <TextInput
                    style={styles.input}
                    value={nameForm.name}
                    onChangeText={(value) => setNameForm({ name: value })}
                    placeholder="Entrez votre nouveau nom"
                    placeholderTextColor="#999"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleUpdateName}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Mettre à jour le nom</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.separator} />

            {/* Option 2: Changer le mot de passe */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={togglePasswordSection}
            >
              <View style={styles.optionContent}>
                <Ionicons name="lock-closed-outline" size={24} color="#51A905" />
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Changer le mot de passe</Text>
                  <Text style={styles.optionSubtitle}>
                    Modifier votre mot de passe de connexion
                  </Text>
                </View>
                <Ionicons 
                  name={showPasswordSection ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#666" 
                />
              </View>
            </TouchableOpacity>

            {/* Section de changement de mot de passe */}
            {showPasswordSection && (
              <View style={styles.sectionContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mot de passe actuel</Text>
                  <TextInput
                    style={styles.input}
                    value={passwordForm.currentPassword}
                    onChangeText={(value) => setPasswordForm(prev => ({ ...prev, currentPassword: value }))}
                    placeholder="Entrez votre mot de passe actuel"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nouveau mot de passe</Text>
                  <TextInput
                    style={styles.input}
                    value={passwordForm.password}
                    onChangeText={(value) => setPasswordForm(prev => ({ ...prev, password: value }))}
                    placeholder="Entrez le nouveau mot de passe"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirmer le mot de passe</Text>
                  <TextInput
                    style={styles.input}
                    value={passwordForm.confirmPassword}
                    onChangeText={(value) => setPasswordForm(prev => ({ ...prev, confirmPassword: value }))}
                    placeholder="Confirmez le nouveau mot de passe"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Changer le mot de passe</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    color: '#666',
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  infoNote: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: '#999',
    marginTop: 5,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  optionButton: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
  },
  sectionContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Montserrat',
    color: '#333',
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#51A905',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

export default EditProfileScreen; 