import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Dimensions, Alert } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = Math.round(width * 0.25);
const scaleFont = (size) => Math.round(size * (width / 375));

const CommanderLivreur = () => {
  const navigation = useNavigation();

  const handleCommander = () => {
    console.log('Bouton Commander cliqué');
    try {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'ListeLivreurs'
        })
      );
      console.log('Navigation effectuée');
    } catch (error) {
      console.error('Erreur de navigation:', error);
      Alert.alert('Erreur', 'Impossible de naviguer vers la liste des livreurs');
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.bannerContainer}>
        <ImageBackground
          source={require('../../../assets/images/m-3.jpg')}
          style={styles.banner}
          resizeMode="cover"
          imageStyle={styles.bannerImage}
        >
          <View style={styles.overlay} />
        </ImageBackground>
      </View>

      <Animatable.View 
        style={styles.buttonContainer}
        animation="fadeInUp"
        delay={300}
        duration={900}
      >
        <Animatable.View 
          animation="bounceIn"
          duration={900}
        >
          <TouchableOpacity 
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={handleCommander}
          >
            <Ionicons name="send" size={scaleFont(18)} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaButtonText}>Commander</Text>
          </TouchableOpacity>
        </Animatable.View>
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    marginHorizontal: 15,
    marginVertical: 10,
  },
  bannerContainer: {
    width: width - 30,
    height: BANNER_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 10,
   
    
    marginBottom: 15,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
  },
});

export default CommanderLivreur;
