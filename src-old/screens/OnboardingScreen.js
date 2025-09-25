import React, { useEffect } from 'react';
import { Text, StyleSheet, View, Image, Dimensions, Platform } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

const OnboardingScreen = ({ navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      navigation.replace('MainApp');
    }
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('firstLaunch', 'false');
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        navigation.replace('MainApp');
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'onboarding:', error);
      navigation.replace('Login');
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('firstLaunch', 'false');
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        navigation.replace('MainApp');
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Erreur lors du skip de l\'onboarding:', error);
      navigation.replace('Login');
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du statut onboarding:', error);
    }
  };

  return (
    <Onboarding
      onSkip={handleSkip}
      onDone={handleFinish}
      nextLabel={t.onboarding.buttons.next}
      skipLabel={t.onboarding.buttons.skip}
      doneLabel={t.onboarding.buttons.done}
      titleStyles={styles.title}
      subTitleStyles={styles.subtitle}
      bottomBarHighlight={false}
      bottomBarHeight={isAndroid ? height * 0.1 : 60}
      controlStatusBar={false}
      containerStyles={{
        paddingBottom: isAndroid ? height * 0.05 : 20,
        flex: 1,
      }}
      showSkip={true}
      showNext={true}
      pageIndexCallback={(index) => console.log(`Page ${index} visible`)}
      pages={[
        {
          backgroundColor: '#FF9800',
          image: (
            <View style={[styles.imageWrapper, { marginBottom: height * 0.05 }]}>
              <Image
                source={require('../../assets/images/logo_mayombe.jpg')}
                style={styles.image}
              />
            </View>
          ),
          title: t.onboarding.slide1.title,
          subtitle: t.onboarding.slide1.subtitle,
        },
        {
          backgroundColor: '#4CAF50',
          image: (
            <View style={[styles.imageWrapper, { marginBottom: height * 0.05 }]}>
              <Image
                source={require('../../assets/images/logo_mayombe.jpg')}
                style={styles.image}
              />
            </View>
          ),
          title: t.onboarding.slide2.title,
          subtitle: t.onboarding.slide2.subtitle,
        },
        {
          backgroundColor: '#8BC34A',
          image: (
            <View style={[styles.imageWrapper, { marginBottom: height * 0.05 }]}>
              <Image
                source={require('../../assets/images/logo_mayombe.jpg')}
                style={styles.image}
              />
            </View>
          ),
          title: t.onboarding.slide3.title,
          subtitle: t.onboarding.slide3.subtitle,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: width * 0.05,
    fontFamily: 'Montserrat',
    marginBottom: height * 0.02,
  },
  subtitle: {
    fontSize: width * 0.04,
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: width * 0.05,
    marginTop: height * 0.02,
    fontFamily: 'Montserrat',
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: '#fff',
    padding: width * 0.05,
    marginTop: height * 0.05,
  },
  image: {
    width: width * 0.3,
    height: width * 0.3,
    resizeMode: 'cover',
  },
});

export default OnboardingScreen;
