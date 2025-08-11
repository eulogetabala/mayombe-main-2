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
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];
  const [showLocationModal, setShowLocationModal] = useState(false);

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
    setSearch(text);
    
    if (text.length > 2) {
      setSearching(true);
      try {
        const response = await fetch(`${API_BASE_URL}/products-list?search=${encodeURIComponent(text)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
  
        const data = await response.json();
  
        if (!Array.isArray(data)) {
          throw new Error("Format de données incorrect, un tableau est attendu.");
        }
  
        // Filtrer et reformater les résultats
        const filteredResults = data
          .filter(item => (item.libelle || item.name || "").toLowerCase().includes(text.toLowerCase()))
          .map(item => ({
            id: item.id,
            name: item.libelle || item.name,
            price: item.price ? `${item.price} FCFA` : "Prix non disponible",
            description: item.desc || "Aucune description",
            image: item.image_url ? { uri: item.image_url } : require("../../../assets/images/2.jpg"),
          }));
  
        setSearchResults(filteredResults);
        setShowSearchModal(true);
      } catch (error) {
        console.error("Erreur lors de la recherche :", error);
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
    } else {
      setSearchResults([]);
      setShowSearchModal(false);
    }
  };
  

  const handleSearchItemPress = (item) => {
    setShowSearchModal(false);
    setSearch('');
    setSelectedProduct(item);
    setProductModalVisible(true);
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleSearchItemPress(item)}
    >
      <View style={styles.searchResultImageContainer}>
        <Image source={item.image} style={styles.searchResultImage} />
      </View>
      <View style={styles.searchResultText}>
        <Text style={styles.searchResultTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.searchResultPrice}>{item.price}</Text>
        <Text style={styles.searchResultDescription} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

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
                  setShowSearchModal(false);
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

      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#FF9800" />
            ) : (
              <>
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
                <TouchableOpacity onPress={() => setShowSearchModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
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
  searchResultsList: {
    paddingHorizontal: 15,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    marginVertical: 5,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchResultImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  searchResultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  searchResultText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
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
