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
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BaseScreen } from '../components/common/BaseScreen';
import { RestaurantSkeletonLoader } from '../components/common/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';
import { HomeSkeleton } from '../components/Skeletons';
import ApiService from '../services/apiService';

import HeaderSection from "../components/Home/HeaderSection";
import CategorieSection from "../components/Home/CategorieSection";
import ProductSection from "../components/Home/ProductSection";
import TrouverRestaurant from "../components/Home/TrouverRestaurant";
import FindNearbyRestaurants from '../components/Home/FindNearbyRestaurants';
import CommanderLivreur from '../components/Home/CommanderLivreur';
import { Ionicons } from '@expo/vector-icons';
import SharedCartScreen from './SharedCartScreen';
const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";
const BASE_URL = "https://www.mayombe-app.com/uploads_admin";

// Images statiques de fallback
const fallbackImages = [
  require("../../assets/images/m-1.jpg"),
  require("../../assets/images/m-2.jpg"),
  require("../../assets/images/m-3.jpg"),
];

const HomeScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);

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

  // Fonction de rafraîchissement
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Rafraîchir les bannières
      await fetchBanners();
      
      // Ici vous pouvez ajouter d'autres appels API pour rafraîchir les données
      // Par exemple : await fetchRestaurants(), await fetchCategories(), etc.
      
      console.log('🔄 Page d\'accueil rafraîchie');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Fonction pour récupérer les bannières
  const fetchBanners = async () => {
    try {
      setBannersLoading(true);
      const data = await ApiService.get('/banniere');

      if (data && Array.isArray(data)) {
        const mappedBanners = data.map((banner, index) => {
          const imageUri = banner.cover 
            ? `${BASE_URL}/${banner.cover}`
            : null;
          
          const bannerObj = {
            id: banner.id || index,
            title: banner.title || banner.titre || 'Bannière',
            description: banner.description || banner.description || '',
            image: imageUri ? { uri: imageUri } : fallbackImages[0],
            link: banner.link || banner.url || null,
            active: banner.active !== false, // Par défaut actif si non spécifié
            title: '', // Pas de titre
            description: '', // Pas de description
          };
          
          return bannerObj;
        }).filter(banner => banner.active); // Filtrer seulement les bannières actives
        
        setBanners(mappedBanners);
      } else {
        console.log('⚠️ Aucune bannière trouvée, utilisation des images par défaut');
        setBanners(fallbackImages.map((image, index) => ({
          id: index,
          title: `Bannière ${index + 1}`,
          description: '',
          image: image,
          link: null,
          active: true,
        })));
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des bannières:', error);
      // Utiliser les images de fallback en cas d'erreur
      setBanners(fallbackImages.map((image, index) => ({
        id: index,
        title: `Bannière ${index + 1}`,
        description: '',
        image: image,
        link: null,
        active: true,
      })));
    } finally {
      setBannersLoading(false);
    }
  };

  // Afficher l’accueil tout de suite ; bannières en arrière-plan (évite d’attendre le réseau pour tout le skeleton)
  useEffect(() => {
    const initScreen = async () => {
      try {
        await restoreScrollPosition();
      } catch (e) {
        /* noop */
      }
      setIsLoading(false);
      fetchBanners();
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
        prevIndex === (banners.length - 1) ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    if (flatListRef.current && banners.length > 0 && currentIndex >= 0 && currentIndex < banners.length) {
      try {
        flatListRef.current.scrollToIndex({
          index: currentIndex,
          animated: true,
        });
      } catch (error) {
        console.log('Erreur scrollToIndex:', error);
        // En cas d'erreur, on peut essayer de scroll vers le début
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
      }
    }
  }, [currentIndex, banners.length]);

  const renderCarousel = () => {
    return (
      <View style={styles.carouselContainer}>
        {bannersLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement des bannières...</Text>
          </View>
        ) : (
        <FlatList
          ref={flatListRef}
          data={banners}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => {
                if (item.link) {
                  console.log('🔗 Ouverture du lien:', item.link);
                  // Ici vous pouvez ajouter la logique pour ouvrir le lien
                  // Par exemple : Linking.openURL(item.link);
                }
              }}
              activeOpacity={item.link ? 0.8 : 1}
            >
              <Image 
                source={item.image} 
                style={styles.image}
                resizeMode="cover"
                onError={(error) => {
                  console.log('❌ Erreur image:', item.title, error.nativeEvent);
                  // En cas d'erreur, utiliser l'image de fallback
                  item.image = fallbackImages[0];
                }}
                defaultSource={fallbackImages[0]}
              />

            </TouchableOpacity>
          )}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(
              event.nativeEvent.contentOffset.x / Dimensions.get("window").width
            );
            setCurrentIndex(newIndex);
          }}
        />
      )}
    </View>
    );
  };

  // Afficher le skeleton pendant le chargement initial
  if (isLoading) {
    return <HomeSkeleton />;
  }

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#51A905']}
            tintColor="#51A905"
            title="Rafraîchir..."
            titleColor="#51A905"
          />
        }
      >
        <Animatable.View animation="fadeInUp" duration={400}>
          <HeaderSection navigation={navigation} />
        </Animatable.View>

        <Animatable.View animation="fadeIn" duration={400} delay={0}>
          {renderCarousel()}
        </Animatable.View>

        {/* 1. Restaurants de la ville */}
        <Animatable.View animation="fadeInUp" duration={500} delay={0}>
          <TrouverRestaurant navigation={navigation} />
        </Animatable.View>

        {/* 2. Restaurants à proximité */}
        <Animatable.View animation="fadeInUp" duration={500} delay={0}>
          <FindNearbyRestaurants />
        </Animatable.View>

        {/* 3. Produits populaires */}
        <Animatable.View animation="fadeInRight" duration={500} delay={0}>
          <ProductSection />
        </Animatable.View>

        {/* 4. Catégories */}
        <Animatable.View animation="fadeIn" duration={400} delay={0}>
          <CategorieSection navigation={navigation} />
        </Animatable.View>

        {/* Livraison express */}
        <Animatable.View animation="fadeInUp" duration={500} delay={0}>
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
    height: (Dimensions.get("window").width * 270) / 1080,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
  },

  bottomSpacer: {
    height: 60,
  },
});

export default HomeScreen;
