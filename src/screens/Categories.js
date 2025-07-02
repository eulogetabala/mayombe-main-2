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

  const renderCategory = ({ item }) => {
    const hasImageError = imageErrors[item.id];
    const isLoading = loadingImages[item.id];
    const imageUrl = item.image_url ? `https://www.mayombe-app.com/uploads_admin/${item.image_url}` : null;

    return (
      <TouchableOpacity
        style={[styles.categoryCard, { width: cardWidth }]}
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
        <View style={styles.imageContainer}>
          {imageUrl && !hasImageError ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.categoryImage}
                onError={() => handleImageError(item.id)}
                onLoad={() => handleImageLoad(item.id)}
                onLoadStart={() => handleImageLoadStart(item.id)}
                defaultSource={require('../../assets/images/3.jpg')}
              />
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color="#51A905" />
                </View>
              )}
            </View>
          ) : (
            <Image
              source={require('../../assets/images/3.jpg')}
              style={styles.categoryImage}
            />
          )}
          <View style={styles.overlay} />
          <Text style={styles.categoryName}>{item.libelle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.categories.title || 'Catégories'}</Text>
      </View>
      
      <FlatList
        key={'grid'}
        data={categories}
        renderItem={renderCategory}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  listContainer: {
    padding: 16,
    paddingHorizontal: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    backgroundColor: '#fff',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1.1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    padding: 10,
  },
  categoryName: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
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
});

export default withRefreshAndLoading(Categories, {
  skeletonType: 'category',
  skeletonCount: 6,
  scrollEnabled: true
});
