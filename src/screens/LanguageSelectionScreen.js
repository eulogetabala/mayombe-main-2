import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LanguageSelectionScreen = ({ navigation }) => {
  const { changeLanguage, currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  useEffect(() => {
    checkInitialLanguage();
  }, []);

  const checkInitialLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('userLanguage');
      const firstLaunch = await AsyncStorage.getItem('firstLaunch');
      const token = await AsyncStorage.getItem('userToken');

      if (savedLanguage) {
        await changeLanguage(savedLanguage);
        if (token) {
          navigation.replace('MainApp');
        } else if (firstLaunch === 'false') {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding');
        }
      }
    } catch (error) {
      // console.error('Error checking initial language:', error);
    }
  };

  const handleLanguageSelect = async (language) => {
    try {
      await AsyncStorage.setItem('userLanguage', language);
      await changeLanguage(language);
      
      const token = await AsyncStorage.getItem('userToken');
      const firstLaunch = await AsyncStorage.getItem('firstLaunch');

      if (token) {
        navigation.replace('MainApp');
      } else if (firstLaunch === 'false') {
        navigation.replace('Login');
      } else {
        navigation.replace('Onboarding');
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de la langue:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo_mayombe.jpg')}
        style={styles.logo}
      />
      
      <Text style={styles.title}>{t.language.selectLanguage}</Text>
      <Text style={styles.subtitle}>{t.language.chooseLanguage}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => handleLanguageSelect('fr')}
        >
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>{t.language.french}</Text>
              <Text style={styles.buttonSubtext}>French</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => handleLanguageSelect('en')}
        >
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>{t.language.english}</Text>
              <Text style={styles.buttonSubtext}>Anglais</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 40,
    borderRadius: width * 0.2,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Montserrat',
    marginBottom: 40,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  languageButton: {
    width: '100%',
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Montserrat',
    marginTop: 4,
  },
});

export default LanguageSelectionScreen; 