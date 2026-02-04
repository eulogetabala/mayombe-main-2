import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator,
  Image,
  ScrollView,
  Platform
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { CategorieSkeleton } from '../Skeletons';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const { width } = Dimensions.get('window');

const CategorieSection = () => {
  const navigation = useNavigation();
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage || 'fr'] || translations.fr;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        const mappedCategories = data.map(category => ({
          id: category.id,
          name: category.libelle || '',
          icon: normalizeAndTranslate(category.libelle),
          image_url: category.image_url || category.image || category.cover,
        }));

        setCategories(mappedCategories);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      setError(t.categories.loadError);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category) => {
    if (category && category.id) {
      navigation.navigate('CategorieList', {
        categoryId: category.id,
        categoryName: category.name || ''
      });
    }
  };

  const normalizeAndTranslate = (categoryName) => {
    if (!categoryName) return '';
    
    return categoryName.toLowerCase()
      .replace(/[éèêë]/g, 'e')
      .replace(/[àâä]/g, 'a')
      .replace(/[^a-z]/g, '');
  };

  const getIconName = (category) => {
    if (!category || !category.name) return "apps";

    const iconMap = {
      legumes: "food-apple",
      fruits: "fruit-cherries",
      viandes: "food-steak",
      poissons: "fish",
      epicerie: "food-variant",
      boissons: "bottle-wine",
      boulangerie: "bread-slice",
      surgeles: "snowflake",
      alimentation: "food",
      cereale: "grain",
      cereales: "grain",
      alimentations: "food",
    };

    const normalizedName = normalizeAndTranslate(category.name);
    return iconMap[normalizedName] || "apps";
  };

  const handleImageError = (categoryId) => {
    setImageErrors(prev => ({
      ...prev,
      [categoryId]: true
    }));
  };

  const renderCategory = (category) => {
    const hasImageError = imageErrors[category.id];
    const imageUrl = category.image_url ? `https://www.mayombe-app.com/uploads_admin/${category.image_url}` : null;

    return (
      <TouchableOpacity
        key={category.id}
        style={styles.category}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.7}
      >
        <Animatable.View 
          animation="fadeIn" 
          duration={500} 
          delay={category.id * 100}
          style={styles.iconWrapper}
        >
          <View style={styles.iconBackground}>
            {imageUrl && !hasImageError ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.categoryImage}
                onError={() => handleImageError(category.id)}
              />
            ) : (
              <MaterialCommunityIcons
                name={getIconName(category)}
                size={24}
                color="#51A905"
              />
            )}
          </View>
          <Text 
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.categoryText}
          >
            {category.name || ''}
          </Text>
        </Animatable.View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <CategorieSkeleton />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t.home.retry}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
          <Text style={styles.retryText}>{t.home.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.headerContainer}
        onPress={() => navigation.navigate("Categories")}
      >
        <Text style={styles.title}>{t.categories.title}</Text>
        <View style={styles.viewAllContainer}>
          <Text style={styles.viewAllText}>{t.home.seeAll}</Text>
          <Ionicons name="chevron-forward" size={15} color="#EB9A07" />
        </View>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map(renderCategory)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 25,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  title: {
    fontSize: 18,
    color: "#333",
    fontFamily: "Montserrat-Bold",
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 12,
    color: "#EB9A07",
    fontFamily: "Montserrat-Bold",
    marginRight: 4,
  },
  categoriesContainer: {
    paddingLeft: 15,
    paddingRight: 15,
  },
  category: {
    marginRight: 20,
    alignItems: 'center',
    width: width * 0.22,
    height: width * 0.28,
    justifyContent: 'flex-start',
    paddingVertical: 5,
  },
  iconWrapper: {
    alignItems: 'center',
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
  },
  iconBackground: {
    width: width * 0.15,
    height: width * 0.15,
    borderRadius: width * 0.075,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#51A905',
    elevation: 0,
    shadowColor: 'transparent',
  },
  categoryText: {
    color: '#333',
    fontSize: 13,
    fontFamily: 'Montserrat-Medium',
    textAlign: 'center',
    marginTop: 4,
    width: '100%',
    height: 20,
    lineHeight: 20,
    paddingHorizontal: 2,
  },
  loadingContainer: {
    height: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: "Montserrat-Regular",
  },
  retryButton: {
    backgroundColor: '#EB9A07',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#51A905',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryText: {
    color: '#FFF',
    fontFamily: "Montserrat-Bold",
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.075,
    resizeMode: 'cover',
  },
});

export default CategorieSection;
