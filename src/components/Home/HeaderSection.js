import React, { useState, useEffect, useRef } from "react";
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
  Pressable,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../../context/CartContext';
import Toast from 'react-native-toast-message';
import ProductModal from '../ProductModal';
import RestaurantProductModal from '../RestaurantProductModal';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';
import { searchAllProducts, preloadSearchIndex } from '../../services/searchService';

const HeaderSection = ({ navigation }) => {
  const { cartItems, addToCart } = useCart();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Gérer la visibilité interne du modal produit
  useEffect(() => {
    if (productModalVisible && selectedProduct) {
      setInternalProductModalVisible(true);
    } else {
      setInternalProductModalVisible(false);
    }
  }, [productModalVisible, selectedProduct]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [internalProductModalVisible, setInternalProductModalVisible] = useState(false);
  // Produits sélectionnés dans les résultats de recherche (multi-choix)
  const [selectedSearchItems, setSelectedSearchItems] = useState({});
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [showLocationModal, setShowLocationModal] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    preloadSearchIndex();
  }, []);

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
      // Sur simulateur ou si ça échoue, on doit gérer l'erreur gracieusement
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Réduire la précision pour être plus permissif
      }).catch(err => {
        console.warn("⚠️ Impossible d'obtenir la position précise :", err);
        return null;
      });

      if (location) {
        const { latitude, longitude } = location.coords;

        // Géocodage inverse
        const response = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        }).catch(() => null);

        if (response && response[0]) {
          const { district, city } = response[0];
          setLocation(`${district || ''}, ${city || 'Ville inconnue'}`);
        } else {
          setLocation('Position détectée');
        }
      } else {
        // Fallback pour le simulateur ou erreur
        console.log("📍 Utilisation de la position par défaut (Brazzaville)");
        setLocation('Brazzaville, Congo');
      }
    } catch (error) {
      console.error('❌ Erreur générale géolocalisation:', error);
      // Fallback silencieux pour ne pas afficher l'écran rouge
      setLocation('Brazzaville, Congo');
    } finally {
      setLoading(false);
    }
  };

  // Calculer le nombre total d'articles dans le panier
  const cartItemsCount = cartItems?.reduce((total, item) => {
    return total + (item?.quantity || 0);
  }, 0) || 0;

  const handleSearchTextChange = (text) => {
    setSearch(text);

    if (text.length === 0) {
      setSearchResults([]);
      setSelectedSearchItems({});
      setShowSearchModal(false);
    }
  };

  const executeSearch = async (query) => {
    const text = query.trim();

    if (productModalVisible) {
      setProductModalVisible(false);
      setSelectedProduct(null);
      setInternalProductModalVisible(false);
    }

    if (!text) {
      setSearchResults([]);
      setShowSearchModal(false);
      return;
    }

    setSearching(true);
    setShowSearchModal(true);
    setSelectedSearchItems({});

    try {
      const results = await searchAllProducts(text);
      setSearchResults(results);
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
    // Toggle de sélection du produit (multi-choix) SANS fermer le modal
    const key = item.searchKey || `${item.productOrigin || 'item'}-${item.id}`;
    setSelectedSearchItems(prev => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = item;
      }
      return next;
    });
  };

  const openProductDetails = (item) => {
    // Ouvrir le détail du produit SANS fermer le modal de recherche
    setSelectedProduct(item);
    setProductModalVisible(true);
  };

  const selectedCount = Object.keys(selectedSearchItems).length;

  const addSelectedToCart = async () => {
    const items = Object.values(selectedSearchItems);
    if (items.length === 0) return;

    try {
      let addedCount = 0;
      for (const item of items) {
        const success = await addToCart(item);
        if (success) addedCount++;
      }

      setSelectedSearchItems({});

      if (addedCount > 0) {
        Toast.show({
          type: "success",
          text1: "Produits ajoutés",
          text2: `${addedCount} produit(s) ajouté(s) au panier !`,
          position: "bottom",
        });
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout au panier:", error);
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: "Impossible d'ajouter les produits au panier",
        position: "bottom",
      });
    }
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setSearching(false);
    setSearch('');
    setSearchResults([]);
    setSelectedSearchItems({});
  };

  const handleFilterButtonPress = () => {
    if (!search.trim()) {
      searchInputRef.current?.focus();
      return;
    }
    executeSearch(search);
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

    const searchKey = item.searchKey || `${item.productOrigin || 'item'}-${item.id}`;
    const isSelected = !!selectedSearchItems[searchKey];

    return (
      <TouchableOpacity
        style={[styles.searchResultItem, isSelected && styles.searchResultItemSelected]}
        onPress={() => {
          handleSearchItemPress(item);
        }}
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
          {isSelected && (
            <View style={styles.selectedCheckmark}>
              <Ionicons name="checkmark" size={14} color="#FFF" />
            </View>
          )}
        </View>
        <View style={styles.searchResultText}>
          <View style={styles.searchResultHeader}>
            <Text style={styles.searchResultTitle} numberOfLines={1}>
              {cleanName}
            </Text>
          </View>
          <Text style={styles.searchResultPrice}>{cleanPrice}</Text>
          <Text style={styles.searchResultDescription} numberOfLines={2}>
            {cleanDescription}
          </Text>
          <View style={styles.categoryBadgeContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{cleanCategory}</Text>
            </View>
            {item.productOrigin === 'restaurant' && item.restaurant_name ? (
              <View style={[styles.categoryBadge, styles.restaurantBadge]}>
                <Text style={styles.categoryText}>{item.restaurant_name}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.searchResultActions}>
          <TouchableOpacity 
            style={styles.searchResultDetailButton}
            onPress={(e) => {
              e.stopPropagation();
              openProductDetails(item);
            }}
          >
            <Ionicons name="eye-outline" size={16} color="#FF9800" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.searchResultAddButton}
            onPress={async (e) => {
              e.stopPropagation();
              
              try {
                // Ajouter le produit au panier SANS fermer le modal de recherche
                // afin de permettre un multi-choix de produits
                const success = await addToCart(item);
                if (success) {
                  Toast.show({
                    type: "success",
                    text1: "Produit ajouté",
                    text2: `${item.name} a été ajouté au panier !`,
                    position: "bottom",
                  });
                }
              } catch (error) {
                console.error("❌ Erreur lors de l'ajout au panier:", error);
                Toast.show({
                  type: "error",
                  text1: "Erreur",
                  text2: "Impossible d'ajouter le produit au panier",
                  position: "bottom",
                });
              }
            }}
          >
            <FontAwesome5 name="plus" size={16} color="#FFF" />
          </TouchableOpacity>
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
              onPress={() => navigation.navigate('CartTab', { screen: 'Cart' })}
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
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
              <TouchableOpacity
                onPress={() => executeSearch(search)}
                style={styles.searchIconButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="search-outline" size={20} color="#999" />
              </TouchableOpacity>
              <View style={styles.searchInputContainer}>
                <TextInput
                  ref={searchInputRef}
                  placeholder={t.home.search}
                  placeholderTextColor="#999"
                  style={styles.searchInput}
                  value={search}
                  onChangeText={handleSearchTextChange}
                  editable={true}
                  selectTextOnFocus={true}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={() => executeSearch(search)}
                />
              </View>
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
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleFilterButtonPress}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={22} color="#FF9800" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Modal de recherche */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={closeSearchModal}
      >
        <Pressable style={styles.modalContainer} onPress={closeSearchModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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
                return (
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResult}
                    keyExtractor={(item) => item.searchKey || `${item.productOrigin || 'item'}-${item.id}`}
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
            
            {selectedCount > 0 && (
              <TouchableOpacity 
                onPress={addSelectedToCart}
                style={styles.addSelectedButton}
              >
                <FontAwesome5 name="cart-plus" size={16} color="#FFF" />
                <Text style={styles.addSelectedButtonText}>
                  Ajouter {selectedCount} produit{selectedCount > 1 ? 's' : ''} au panier
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={closeSearchModal}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal du produit catalogue */}
      {selectedProduct?.type !== 'menu' ? (
        <ProductModal
          visible={internalProductModalVisible}
          product={selectedProduct}
          onClose={() => {
            setProductModalVisible(false);
            setSelectedProduct(null);
            setInternalProductModalVisible(false);
          }}
        />
      ) : (
        <RestaurantProductModal
          visible={internalProductModalVisible}
          product={selectedProduct}
          markupPercentage={selectedProduct?.markupPercentage}
          onClose={() => {
            setProductModalVisible(false);
            setSelectedProduct(null);
            setInternalProductModalVisible(false);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 0, // Supprimer le padding horizontal pour couvrir toute la largeur
    paddingVertical: 15,
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
    paddingHorizontal: 15, // Ajouter le padding horizontal pour maintenir l'espacement
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
    paddingHorizontal: 15,
  },
  searchBarWrapper: {
    flex: 1,
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
  searchIconButton: {
    padding: 2,
  },
  searchInputContainer: {
    flex: 1,
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontFamily: "Montserrat",
    minHeight: 20,
    paddingVertical: 0,
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
    flex: 1,
  },
  searchModalAddButton: {
    backgroundColor: '#FF6B35',
    padding: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
  searchResultItemSelected: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF8F0',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSelectedButton: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    elevation: 2,
  },
  addSelectedButtonText: {
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
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
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
  },

  searchResultActions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchResultDetailButton: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  searchResultAddButton: {
    backgroundColor: '#FF6B35',
    padding: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    marginBottom: 8,
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  restaurantBadge: {
    backgroundColor: '#4CAF50',
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
