import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageSettingsScreen = ({ navigation }) => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const t = translations[currentLanguage];
  
  const [isEnglish, setIsEnglish] = useState(currentLanguage === 'en');

  useEffect(() => {
    setIsEnglish(currentLanguage === 'en');
  }, [currentLanguage]);

  const handleLanguageToggle = async (value) => {
    try {
      const newLanguage = value ? 'en' : 'fr';
      console.log('🔄 Changement de langue:', newLanguage);
      
      // Sauvegarder la langue dans AsyncStorage
      await AsyncStorage.setItem('userLanguage', newLanguage);
      
      // Changer la langue dans le contexte
      await changeLanguage(newLanguage);
      
      // Mettre à jour l'état local
      setIsEnglish(value);
      
      console.log('✅ Langue changée avec succès:', newLanguage);
    } catch (error) {
      console.error('❌ Erreur lors du changement de langue:', error);
    }
  };

  const getLanguageInfo = (language) => {
    return {
      fr: {
        name: 'Français',
        nativeName: 'Français',
        flag: '🇫🇷',
        description: 'Langue française'
      },
      en: {
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        description: 'English language'
      }
    }[language];
  };

  const currentLangInfo = getLanguageInfo(currentLanguage);
  const otherLangInfo = getLanguageInfo(currentLanguage === 'fr' ? 'en' : 'fr');

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
          <Text style={styles.headerTitle}>{t.profile.language}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.language.currentLanguage}</Text>
            
            <View style={styles.languageCard}>
              <View style={styles.languageInfo}>
                <Text style={styles.languageFlag}>{currentLangInfo.flag}</Text>
                <View style={styles.languageDetails}>
                  <Text style={styles.languageName}>{currentLangInfo.name}</Text>
                  <Text style={styles.languageNative}>{currentLangInfo.nativeName}</Text>
                  <Text style={styles.languageDescription}>{currentLangInfo.description}</Text>
                </View>
              </View>
              <View style={styles.activeIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#51A905" />
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.language.changeLanguage}</Text>
            
            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>
                  {currentLanguage === 'fr' ? t.language.switchToEnglish : t.language.switchToFrench}
                </Text>
                <Text style={styles.switchDescription}>
                  {currentLanguage === 'fr' ? t.language.switchDescription : t.language.switchDescriptionFr}
                </Text>
              </View>
              <Switch
                value={isEnglish}
                onValueChange={handleLanguageToggle}
                trackColor={{ false: '#e0e0e0', true: '#51A905' }}
                thumbColor={isEnglish ? '#fff' : '#f4f3f4'}
                ios_backgroundColor="#e0e0e0"
                style={styles.switch}
              />
            </View>

            <View style={styles.languagePreview}>
              <Text style={styles.previewTitle}>{t.language.preview}</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewText}>
                  {isEnglish ? t.language.englishInterface : t.language.frenchInterface}
                </Text>
                <Text style={styles.previewSubtext}>
                  {isEnglish ? t.language.allTextEnglish : t.language.allTextFrench}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {t.language.languageChangeInfo}
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 15,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#51A905',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 15,
  },
  languageDetails: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  languageNative: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginTop: 2,
  },
  languageDescription: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: '#999',
    marginTop: 2,
  },
  activeIndicator: {
    marginLeft: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  switchDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginTop: 4,
  },
  switch: {
    marginLeft: 15,
  },
  languagePreview: {
    marginTop: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#51A905',
  },
  previewText: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  previewSubtext: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginTop: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#856404',
    marginLeft: 10,
    flex: 1,
  },
});

export default LanguageSettingsScreen; 