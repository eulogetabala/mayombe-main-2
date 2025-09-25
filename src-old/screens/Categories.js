import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import { withRefreshAndLoading } from '../components/common/withRefreshAndLoading';
import { useRefresh } from '../context/RefreshContext';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const CategoriesContent = ({ categories, navigation, t }) => {
  const windowWidth = Dimensions.get('window').width;
  const cardWidth = (windowWidth - 56) / 2;
  const [imageErrors, setImageErrors] = useState({});
  const [loadingImages, setLoadingImages] = useState({});

  const handleImageError = (categoryId) => {
    setImageErrors(prev => ({
      ...prev,
      [categoryId]: true
    }));
    setLoadingImages(prev => ({
      ...prev,
      [categoryId]: false
    }));
  };

  const handleImageLoad = (categoryId) => {
    setLoadingImages(prev => ({
      ...prev,
      [categoryId]: false
    }));
  };

  const handleImageLoadStart = (categoryId) => {
    setLoadingImages(prev => ({
      ...prev,
      [categoryId]: true
    }));
  };

  const renderGridCategory = (item, index) => {
    const hasImageError = imageErrors[item.id];
    const isLoading = loadingImages[item.id];
    const imageUrl = item.image_url ? `https://www.mayombe-app.com/uploads_admin/${item.image_url}` : null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.gridCard}
        onPress={() => {
          navigation.dispatch(
            CommonActions.navigate({
              name: 'CategorieList',
              params: {
                categoryId: item.id,
                categoryName: t.categories[item.libelle.toLowerCase()] || item.libelle,
              },
            })
          );
        }}
        activeOpacity={0.8}
      >
        {/* Carte circulaire avec effet de profondeur */}
        <View style={styles.circleCard}>
          {imageUrl && !hasImageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.circleImage}
              onError={() => handleImageError(item.id)}
              onLoad={() => handleImageLoad(item.id)}
              onLoadStart={() => handleImageLoadStart(item.id)}
              defaultSource={require('../../assets/images/place.png')}
            />
          ) : (
            <Image
              source={require('../../assets/images/place.png')}
              style={styles.circleImage}
            />
          )}
          
          {/* Overlay subtil */}
          <View style={styles.circleOverlay} />
          
          {/* Contenu centré - sans icône */}
          <View style={styles.circleContent}>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Debug: Afficher le nombre de catégories
  console.log('Categories:', categories?.length, categories);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header moderne avec gradient */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <View style={styles.backButtonContainer}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t.categories.title || 'Catégories'}</Text>
          <Text style={styles.headerSubtitle}>Découvrez nos spécialités</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="grid" size={24} color="#FFF" />
        </View>
      </View>
      
      {/* Disposition créative : Grille de cartes circulaires */}
      <View style={styles.gridContainer}>
        {categories && categories.length > 0 ? (
          categories.map((item, index) => renderGridCategory(item, index))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune catégorie trouvée ({categories?.length || 0})</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const Categories = ({ navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refresh = useRefresh();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (refresh?.refreshTimestamp) {
      fetchCategories();
    }
  }, [refresh?.refreshTimestamp]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const fetchCategories = async () => {
    try {
      console.log("Début du chargement des catégories...");
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = await response.json();
      console.log("Réponse de l'API catégories:", data);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      if (!Array.isArray(data)) {
        console.error("Format de données invalide:", data);
        throw new Error('Le format des données reçues est invalide');
      }

      const formattedCategories = data.map(category => ({
        id: category.id,
        libelle: category.libelle || t.categories.unnamed,
        image_url: category.image_url || category.image || category.cover,
      }));

      console.log(`${formattedCategories.length} catégories chargées avec succès`);
      console.log('Exemple de catégorie:', formattedCategories[0]);
      setCategories(formattedCategories);
    } catch (error) {
      console.error("Erreur lors du chargement des catégories:", error);
      setError(t.categories.loadError || 'Impossible de charger les catégories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CategoriesContent 
      categories={categories}
      navigation={navigation}
      t={t}
    />
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    backgroundColor: '#FF9800',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Montserrat',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingHorizontal: 20,
  },
  // Disposition créative : Cartes de tailles différentes
  largeCard: {
    height: 280,
    marginBottom: 20,
  },
  mediumCard: {
    height: 200,
    marginBottom: 16,
  },
  smallCard: {
    height: 160,
    marginBottom: 12,
  },
  categoryCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: '#fff',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1.2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
  },
  largeCardContent: {
    padding: 24,
    paddingBottom: 28,
  },
  mediumCardContent: {
    padding: 20,
    paddingBottom: 24,
  },
  smallCardContent: {
    padding: 16,
    paddingBottom: 20,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Styles adaptatifs pour les différentes tailles de cartes
  largeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  mediumIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  categoryName: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 3,
  },
  largeCategoryName: {
    fontSize: 24,
    marginBottom: 12,
  },
  mediumCategoryName: {
    fontSize: 20,
    marginBottom: 10,
  },
  smallCategoryName: {
    fontSize: 16,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  largeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  mediumBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  smallBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    color: '#DC3545',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
  },
  imageWrapper: {
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Disposition en grille circulaire
  gridContainer: {
    flex: 1,
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  circleCard: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  circleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  circleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,152,0,0.3)',
    borderRadius: 50,
  },
  circleContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  circleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
});

export default withRefreshAndLoading(Categories, {
  skeletonType: 'category',
  skeletonCount: 6,
  scrollEnabled: true
});
