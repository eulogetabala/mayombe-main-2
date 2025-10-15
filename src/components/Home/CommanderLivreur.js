import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Dimensions, Alert } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = Math.round(width * 0.35); // Hauteur augmentée
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
      <ImageBackground
        source={require('../../../assets/images/m-3.jpg')}
        style={styles.banner}
        resizeMode="cover"
        imageStyle={styles.bannerImage}
      >
        <View style={styles.overlay} />
        
        {/* Contenu principal */}
        <View style={styles.contentContainer}>
          <Animatable.View 
            animation="fadeInLeft"
            delay={200}
            duration={800}
            style={styles.textContainer}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="bicycle" size={scaleFont(24)} color="#FF9800" />
            </View>
            <Text style={styles.title}>Livraison Express</Text>
            <Text style={styles.subtitle}>Commandez et faites-vous livrer rapidement</Text>
          </Animatable.View>
        </View>

        {/* Bouton CTA */}
        <Animatable.View 
          style={styles.buttonContainer}
          animation="fadeInUp"
          delay={600}
          duration={900}
        >
          <TouchableOpacity 
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={handleCommander}
          >
            <Ionicons name="send" size={scaleFont(18)} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaButtonText}>Commander maintenant</Text>
            <Ionicons name="arrow-forward" size={scaleFont(16)} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </Animatable.View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    marginHorizontal: 15,
    marginVertical: 8, // Réduit l'espace vertical
  },
  banner: {
    width: width - 30,
    height: BANNER_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
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
