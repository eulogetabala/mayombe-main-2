import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Platform,
  FlatList,
  Image,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../../context/CartContext';
import Toast from 'react-native-toast-message';
import ProductModal from '../ProductModal';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

const HeaderSection = ({ navigation }) => {
  const { cartItems } = useCart();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [showLocationModal, setShowLocationModal] = useState(false);


  // Charger l'historique de recherche au montage
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique de recherche:', error);
    }
  };

  const saveSearchHistory = async (searchTerm) => {
    try {
      const newHistory = [searchTerm, ...searchHistory.filter(item => item !== searchTerm)].slice(0, 10);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'historique de recherche:', error);
    }
  };

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        // Vérifier si c'est la première fois
        const hasAskedPermission = await AsyncStorage.getItem('hasAskedLocationPermission');
        
        if (!hasAskedPermission) {
          // Si c'est la première fois, montrer le modal
          setShowLocationModal(true);
          return;
        }

        // Si ce n'est pas la première fois, vérifier le statut actuel
        const { status } = await Location.getForegroundPermissionsAsync();
        
        if (status === 'granted') {
          getCurrentLocation();
        } else {
          setLocation('Localisation non autorisée');
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        setLocation('Erreur de localisation');
        setLoading(false);
      }
    };

    initializeLocation();
  }, []);

  const handleLocationPermission = async (accept) => {
    try {
      // Marquer que nous avons déjà demandé la permission
      await AsyncStorage.setItem('hasAskedLocationPermission', 'true');

      if (!accept) {
        setShowLocationModal(false);
        setLocation('Localisation non autorisée');
        setLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        await getCurrentLocation();
      } else {
        setLocation('Permission refusée');
      }
    } catch (error) {
      console.error('Erreur de permission:', error);
      setLocation('Erreur de localisation');
    } finally {
      setShowLocationModal(false);
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const response = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (response[0]) {
        const { district, city } = response[0];
        setLocation(`${district || ''}, ${city || 'Ville inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
      setLocation('Localisation non disponible');
    } finally {
      setLoading(false);
    }
  };

  // Calculer le nombre total d'articles dans le panier
  const cartItemsCount = cartItems?.reduce((total, item) => {
    return total + (item?.quantity || 0);
  }, 0) || 0;

  const handleSearch = async (text) => {
    console.log("🔍 Recherche déclenchée avec:", text);
    setSearch(text);
    
    if (text.length === 0) {
      console.log("❌ Texte vide, masquage des modals");
      setSearchResults([]);
      setShowSearchModal(false);
      setShowSuggestions(false);
      return;
    }
    
    // Recherche immédiate dès qu'on tape quelque chose
    console.log("🔎 Recherche API pour:", text);
    setShowSuggestions(false);
    setSearching(true);
    
    try {
      const url = `${API_BASE_URL}/products-list?search=${encodeURIComponent(text)}`;
      console.log("🌐 URL de recherche:", url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log("📡 Réponse HTTP:", response.status, response.ok);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("📦 Données reçues:", data);
      console.log("📊 Type de données:", typeof data, "Est un tableau:", Array.isArray(data));

      if (!Array.isArray(data)) {
        throw new Error("Format de données incorrect, un tableau est attendu.");
      }

      // Filtrer et reformater les résultats
      const filteredResults = data
        .filter(item => {
          const itemName = item.name || item.libelle || "";
          const matches = typeof itemName === 'string' && itemName.toLowerCase().includes(text.toLowerCase());
          console.log("🔍 Item:", itemName, "Match:", matches);
          return matches;
        })
        .map(item => {
          // S'assurer que toutes les valeurs sont correctement formatées
          const cleanItem = {
            id: parseInt(item.id) || 0,
            name: String(item.name || item.libelle || "Produit sans nom").trim(),
            price: item.price ? `${String(item.price).trim()} FCFA` : "Prix non disponible",
            description: String(item.desc || item.description || "Aucune description").trim(),
            image: item.image_url ? { uri: `https://www.mayombe-app.com/uploads_admin/${String(item.image_url).trim()}` } : require("../../../assets/images/2.jpg"),
            category: String(item.category?.libelle || item.category || "Produit").trim(),
            rating: item.rating ? String(item.rating).trim() : null,
          };
          
          // Validation supplémentaire pour éviter les valeurs [object Object]
          Object.keys(cleanItem).forEach(key => {
            if (typeof cleanItem[key] === 'string' && cleanItem[key].includes('[object Object]')) {
              cleanItem[key] = "Donnée non disponible";
            }
          });
          
          return cleanItem;
        });

      console.log("✅ Résultats filtrés:", filteredResults.length, "produits");
      console.log("📋 Détails des résultats:", filteredResults);

      setSearchResults(filteredResults);
      setShowSearchModal(true);
    } catch (error) {
      console.error("❌ Erreur lors de la recherche :", error);
      setSearchResults([]);
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: "Impossible de récupérer les résultats",
        position: "bottom",
      });
    } finally {
      setSearching(false);
    }
  };
  

  const handleSearchItemPress = (item) => {
    setShowSearchModal(false);
    setSearch('');
    setSelectedProduct(item);
    setProductModalVisible(true);
    // Sauvegarder dans l'historique
    saveSearchHistory(item.name);
  };

  const handleSuggestionPress = (suggestion) => {
    setSearch(suggestion);
    setShowSuggestions(false);
    // Déclencher la recherche avec la suggestion
    handleSearch(suggestion);
  };

  const closeSearchModal = () => {
    console.log("🔴 Fermeture du modal de recherche");
    setShowSearchModal(false);
    setSearch('');
    setSearchResults([]);
  };



  const renderSearchResult = ({ item }) => {
    // S'assurer que toutes les valeurs sont des chaînes et nettoyer les données
    const safeName = String(item.name || "Produit sans nom").trim();
    const safePrice = String(item.price || "Prix non disponible").trim();
    const safeDescription = String(item.description || "Aucune description").trim();
    const safeCategory = String(item.category || "Produit").trim();
    const safeRating = item.rating ? String(item.rating).trim() : null;

    // Vérifier et corriger les valeurs [object Object]
    const cleanName = safeName.includes('[object Object]') ? "Produit sans nom" : safeName;
    const cleanPrice = safePrice.includes('[object Object]') ? "Prix non disponible" : safePrice;
    const cleanDescription = safeDescription.includes('[object Object]') ? "Aucune description" : safeDescription;
    const cleanCategory = safeCategory.includes('[object Object]') ? "Produit" : safeCategory;

    return (
      <TouchableOpacity
        style={styles.searchResultItem}
        onPress={() => handleSearchItemPress(item)}
      >
        <View style={styles.searchResultImageContainer}>
          <Image 
            source={item.image || require("../../../assets/images/2.jpg")} 
            style={styles.searchResultImage}
            onError={() => {
              // En cas d'erreur d'image, utiliser l'image par défaut
              item.image = require("../../../assets/images/2.jpg");
            }}
          />
        </View>
        <View style={styles.searchResultText}>
          <View style={styles.searchResultHeader}>
            <Text style={styles.searchResultTitle} numberOfLines={1}>
              {cleanName}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{cleanCategory}</Text>
            </View>
          </View>
          <Text style={styles.searchResultPrice}>{cleanPrice}</Text>
          <Text style={styles.searchResultDescription} numberOfLines={2}>
            {cleanDescription}
          </Text>
        </View>
        <View style={styles.searchResultActions}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* Modal de demande de permission de localisation */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Ionicons name="location-outline" size={50} color="#FF9800" style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Autoriser la localisation</Text>
              <Text style={styles.modalText}>
                Pour vous offrir une meilleure expérience et vous montrer les restaurants proches de vous, nous avons besoin d'accéder à votre position.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonDecline]}
                  onPress={() => handleLocationPermission(false)}
                >
                  <Text style={[styles.modalButtonText, styles.declineText]}>Plus tard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonAccept]}
                  onPress={() => handleLocationPermission(true)}
                >
                  <Text style={[styles.modalButtonText, styles.acceptText]}>Autoriser</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header avec dégradé */}
      <LinearGradient 
        colors={["#FF9800", "#F57C00"]} 
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.header}
      >
        <View style={styles.locationContainer}>
          <View style={styles.locationWrapper}>
            <View style={styles.locationIconBg}>
              <Ionicons name="location-sharp" size={18} color="#fff" />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Livrer à</Text>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" style={{ marginLeft: 8 }} />
              ) : (
                <Text style={styles.locationText} numberOfLines={1}>
                  {location || "Position non définie"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconContainer}
              onPress={() => navigation.navigate('SharedCart')}
            >
              <Ionicons name="share-outline" size={22} color="#FF9800" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconContainer}
              onPress={() => navigation.navigate('CartTab', { screen: 'CartMain' })}
            >
              {cartItemsCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                  <Text style={styles.badgeText}>{cartItemsCount}</Text>
                </View>
              )}
              <Ionicons name="cart-outline" size={22} color="#FF9800" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche intégrée dans le header */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#999" />
            <TextInput
              placeholder={t.home.search}
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={search}
              onChangeText={handleSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity 
                onPress={() => {
                  setSearch('');
                  closeSearchModal();
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color="#FF9800" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Modal de recherche et suggestions */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={closeSearchModal}
      >
        {console.log("🎭 Modal visible:", showSearchModal, "searching:", searching, "results:", searchResults.length)}
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Poignée pour indiquer qu'on peut glisser */}
            <View style={styles.modalHandle} />
            
            {/* Header du modal */}
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>
                Résultats de recherche
              </Text>
            </View>

            {searching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF9800" />
                <Text style={styles.loadingText}>Recherche en cours...</Text>
              </View>
            ) : (
              // Affichage des résultats de recherche
              (() => {
                console.log("🔍 Affichage résultats - Nombre de résultats:", searchResults.length);
                console.log("🔍 Résultats à afficher:", searchResults);
                return (
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={(item) => item.id.toString()}
                    ListEmptyComponent={
                      <View style={styles.emptyResultContainer}>
                        <Ionicons name="search-outline" size={50} color="#ccc" />
                        <Text style={styles.noResults}>Aucun résultat trouvé</Text>
                        <Text style={styles.noResultsSubtext}>
                          Essayez avec d'autres mots-clés
                        </Text>
                      </View>
                    }
                    contentContainerStyle={styles.searchResultsList}
                    showsVerticalScrollIndicator={false}
                  />
                );
              })()
            )}
            
            <TouchableOpacity 
              onPress={closeSearchModal}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal du produit */}
      <ProductModal
        visible={productModalVisible}
        product={selectedProduct}
        onClose={() => setProductModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
  },
  header: {
    padding: 15,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  locationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  locationWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationIconBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 12,
    marginRight: 10,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    color: "#fff",
    opacity: 0.9,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
  locationText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Montserrat-Bold",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#4CAF50',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#fff',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    fontFamily: "Montserrat",
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonAccept: {
    backgroundColor: '#FF9800',
  },
  modalButtonDecline: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
  },
  acceptText: {
    color: '#FFF',
  },
  declineText: {
    color: '#666',
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 15,
  },
  searchModalTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },

  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginTop: 10,
  },

  searchResultsList: {
    paddingHorizontal: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: '#333',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginVertical: 6,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  searchResultImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  searchResultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  searchResultText: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
  },

  searchResultActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 15,
    color: '#FF9800',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 4,
  },
  searchResultDescription: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  emptyResultContainer: {
    alignItems: 'center',
    padding: 30,
  },
  noResults: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginTop: 15,
  },
  noResultsSubtext: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#666',
    marginTop: 5,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FF9800',
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
  },
});

export default HeaderSection;
