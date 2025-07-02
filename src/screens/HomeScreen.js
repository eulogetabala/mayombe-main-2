import React, { useRef, useState, useEffect, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  RefreshControl,
  Text,
  Button,
  SafeAreaView,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { useNavigation } from '@react-navigation/native';
import { BaseScreen } from '../components/common/BaseScreen';
import { RestaurantSkeletonLoader } from '../components/common/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';

import RestaurantsSection from "../components/Home/RestaurantsSection";
import HeaderSection from "../components/Home/HeaderSection";
import CategorieSection from "../components/Home/CategorieSection";
import ProductSection from "../components/Home/ProductSection";
import NouveauxProduits from "../components/Home/NewMarket";
import TrouverRestaurant from "../components/Home/TrouverRestaurant";
import FindNearbyRestaurants from '../components/Home/FindNearbyRestaurants';
import CommanderLivreur from '../components/Home/CommanderLivreur';
const images = [
  require("../../assets/images/m-1.jpg"),
  require("../../assets/images/m-2.jpg"),
  require("../../assets/images/m-3.jpg"),
];

const HomeScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef(null);
  const flatListRef = useRef(null);
  const { isAuthenticated, login, logout } = useAuth();

  // Sauvegarder la position du scroll
  const saveScrollPosition = async (position) => {
    try {
      await AsyncStorage.setItem('homeScrollPosition', position.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la position:', error);
    }
  };

  // Restaurer la position du scroll
  const restoreScrollPosition = async () => {
    try {
      const position = await AsyncStorage.getItem('homeScrollPosition');
      if (position) {
        setScrollPosition(parseFloat(position));
      }
    } catch (error) {
      console.error('Erreur lors de la restauration de la position:', error);
    }
  };

  // Gérer le scroll
  const handleScroll = (event) => {
    const position = event.nativeEvent.contentOffset.y;
    saveScrollPosition(position);
  };

  // Restaurer la position au montage
  useEffect(() => {
    const initScreen = async () => {
      await restoreScrollPosition();
      setIsLoading(false);
    };
    initScreen();
  }, []);

  // Appliquer la position restaurée
  useEffect(() => {
    if (!isLoading && scrollPosition > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: scrollPosition, animated: false });
    }
  }, [isLoading, scrollPosition]);

  // Set up automatic sliding
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: currentIndex,
        animated: true,
      });
    }
  }, [currentIndex]);

  const renderCarousel = () => (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.imageContainer}>
            <Image source={item} style={styles.image} />
          </View>
        )}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(
            event.nativeEvent.contentOffset.x / Dimensions.get("window").width
          );
          setCurrentIndex(newIndex);
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <HeaderSection navigation={navigation} />
        </Animatable.View>

        <Animatable.View animation="fadeIn" duration={1000} delay={200}>
          {renderCarousel()}
        </Animatable.View>

        <Animatable.View animation="fadeIn" duration={1000} delay={200}>
          <CategorieSection navigation={navigation} />
        </Animatable.View>

        <Animatable.View animation="fadeInRight" duration={800} delay={600}>
          <ProductSection />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={800}>
          <RestaurantsSection />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={800}>
          <NouveauxProduits />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={800}>
          <TrouverRestaurant navigation={navigation} />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={800}>
          <FindNearbyRestaurants />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={800}>
          <CommanderLivreur />
        </Animatable.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  carouselContainer: {
    height: (Dimensions.get("window").width * 270) / 1080,
    marginTop: 7,
  },
  imageContainer: {
    width: Dimensions.get("window").width,
    height: '100%',
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: 'cover',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 60,
  }
});

export default HomeScreen;
