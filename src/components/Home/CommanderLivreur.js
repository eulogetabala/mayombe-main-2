import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import * as Animatable from 'react-native-animatable';

const CommanderLivreur = () => {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../assets/images/mayombe_11.jpg')}
        style={styles.banner}
        resizeMode="cover"
      >
        <Animatable.View 
          style={styles.content}
          animation="fadeIn" 
          delay={500}
          duration={1500}
        >
          <Text style={styles.bannerText}>Commandez un livreur maintenant</Text>
          <Text style={styles.bannerSubText}>La livraison est rapide et facile !</Text>
          <Animatable.View 
            animation="bounceIn"
            duration={1000}
          >
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Commander</Text>
            </TouchableOpacity>
          </Animatable.View>
        </Animatable.View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  bannerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
  },
  bannerSubText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  ctaButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Montserrat-Bold',
  },
});

export default CommanderLivreur;
