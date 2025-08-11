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
      console.log('🖼️ Récupération des bannières...');
      
      const response = await fetch(`${API_BASE_URL}/banniere`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 Réponse bannières brute:', data);
      console.log('📥 Type de données:', typeof data);
      console.log('📥 Est un tableau?', Array.isArray(data));

      if (response.ok && Array.isArray(data)) {
        console.log('📥 Nombre de bannières reçues:', data.length);
        console.log('📥 Première bannière:', data[0]);
        
        const mappedBanners = data.map((banner, index) => {
          console.log(`📥 Bannière ${index}:`, banner);
          
          const imageUri = banner.cover 
            ? `${BASE_URL}/${banner.cover}`
            : null;
          
          console.log(`📥 URL image ${index}:`, imageUri);
          
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
          
          console.log(`📥 Bannière ${index} mappée:`, bannerObj);
          return bannerObj;
        }).filter(banner => banner.active); // Filtrer seulement les bannières actives

        console.log('✅ Bannières finales:', mappedBanners);
        console.log('✅ Nombre de bannières actives:', mappedBanners.length);
        
        // Vérifier que les bannières ont des images différentes
        const uniqueImages = new Set(mappedBanners.map(b => b.image.uri));
        console.log('✅ Images uniques:', uniqueImages.size, 'sur', mappedBanners.length);
        
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

  // Restaurer la position au montage et charger les bannières
  useEffect(() => {
    const initScreen = async () => {
      await restoreScrollPosition();
      await fetchBanners();
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
        prevIndex === (banners.length - 1) ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: currentIndex,
        animated: true,
      });
    }
  }, [currentIndex]);

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
          {/* <NouveauxProduits /> */}
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
