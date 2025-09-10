import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import useOpenStreetMap from '../hooks/useOpenStreetMap';
import { LinearGradient } from 'expo-linear-gradient';

const AddressModal = ({ visible, onClose, onSelectAddress }) => {
  const [searchText, setSearchText] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { predictions, loading, error, fetchPredictions, getPlaceDetails, fetchNearbyPlaces } = useOpenStreetMap();

  // Charger les suggestions dès l'ouverture du modal
  useEffect(() => {
    if (visible) {
      fetchNearbyPlaces();
    }
  }, [visible]);

  useEffect(() => {
    if (searchText.length >= 3) {
      // Ajouter un délai pour éviter trop de requêtes
      const timer = setTimeout(() => {
        fetchPredictions(searchText);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [searchText]);

  const handleSelectAddress = async (placeId) => {
    try {
      const placeDetails = await getPlaceDetails(placeId);
      onSelectAddress(placeDetails.address);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'adresse:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les détails de l\'adresse sélectionnée.');
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      // Demander les permissions de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Nous avons besoin de votre permission pour accéder à votre position GPS.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      // Obtenir la position GPS actuelle
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 60000
      });

      console.log('📍 Position GPS obtenue:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      // Utiliser Google Maps Geocoding API pour convertir les coordonnées en adresse
      const apiKey = 'AIzaSyBH1IRNXPqsDDfIJItSb3hUJ1Q6gkqAcsI';
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coords.latitude},${location.coords.longitude}&key=${apiKey}&language=fr`;

      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        
        console.log('📍 Adresse obtenue:', address);
        
        // Mettre à jour le champ de recherche
        setSearchText(address);
        
        // Sélectionner l'adresse et fermer le modal
        onSelectAddress(address);
        onClose();
        
        Alert.alert('Succès', `Position GPS récupérée : ${address}`);
      } else {
        throw new Error('Impossible de convertir les coordonnées GPS en adresse');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la position GPS:', error);
      Alert.alert(
        'Erreur de localisation',
        'Impossible de récupérer votre position GPS. Vérifiez que le GPS est activé et que vous avez accordé les permissions.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Réessayer', onPress: handleGetCurrentLocation }
        ]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleManualAddressSubmit = () => {
    if (manualAddress.trim()) {
      onSelectAddress(manualAddress.trim());
      onClose();
    } else {
      Alert.alert('Erreur', 'Veuillez entrer une adresse valide.');
    }
  };

  const handleToggleMode = () => {
    setIsManualMode(!isManualMode);
    setSearchText('');
    setManualAddress('');
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectAddress(item.place_id)}
    >
      <Ionicons name="location-outline" size={20} color="#666" style={styles.icon} />
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.mainText}>{item.structured_formatting.main_text}</Text>
        <Text style={styles.secondaryText}>{item.structured_formatting.secondaryText}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#FF9800" />
        <LinearGradient
          colors={['#FF9800', '#FF6B00']}
          style={styles.modalHeader}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Sélectionnez votre adresse</Text>
            </View>
            <TouchableOpacity onPress={handleGetCurrentLocation} style={styles.locationButton}>
              <Ionicons name="locate" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

          <View style={styles.searchContainer}>
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity 
                style={[styles.modeButton, !isManualMode && styles.activeModeButton]}
                onPress={() => setIsManualMode(false)}
              >
                <Ionicons name="search" size={16} color={!isManualMode ? "#fff" : "#666"} />
                <Text style={[styles.modeButtonText, !isManualMode && styles.activeModeButtonText]}>
                  Rechercher
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeButton, isManualMode && styles.activeModeButton]}
                onPress={() => setIsManualMode(true)}
              >
                <Ionicons name="create" size={16} color={isManualMode ? "#fff" : "#666"} />
                <Text style={[styles.modeButtonText, isManualMode && styles.activeModeButtonText]}>
                  Saisir manuellement
                </Text>
              </TouchableOpacity>
            </View>

            {!isManualMode && (
              <TouchableOpacity 
                style={[styles.currentLocationButton, isGettingLocation && styles.currentLocationButtonLoading]}
                onPress={handleGetCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color="#FF6B00" />
                ) : (
                  <Ionicons name="locate" size={20} color="#FF6B00" />
                )}
                <Text style={styles.currentLocationText}>
                  {isGettingLocation ? 'Récupération de votre position...' : 'Utiliser ma position GPS'}
                </Text>
              </TouchableOpacity>
            )}

            {!isManualMode ? (
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher une adresse..."
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor="#999"
                  autoFocus
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.manualInputContainer}>
                <Ionicons name="create" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.manualInput}
                  placeholder="Entrez votre adresse complète..."
                  value={manualAddress}
                  onChangeText={setManualAddress}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  autoFocus
                />
              </View>
            )}
          </View>



          {!isManualMode ? (
            <>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF6B00" />
                  <Text style={styles.loadingText}>Recherche en cours...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={40} color="#FF3B30" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : predictions.length > 0 ? (
                <FlatList
                  data={predictions}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.place_id}
                  style={styles.suggestionsList}
                  keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={
                    searchText.length < 3 ? (
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Suggestions basées sur votre position</Text>
                      </View>
                    ) : null
                  }
                />
              ) : searchText.length >= 3 ? (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search" size={40} color="#999" />
                  <Text style={styles.noResultsText}>Aucun résultat trouvé</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.manualSubmitContainer}>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleManualAddressSubmit}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Valider cette adresse</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  locationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeModeButton: {
    backgroundColor: '#FF6B00',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeModeButtonText: {
    color: '#fff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  manualInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  apiInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF5EB',
    borderBottomWidth: 1,
    borderBottomColor: '#FFD6B3',
  },
  apiInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF6B00',
    fontStyle: 'italic',
  },
  manualSubmitContainer: {
    padding: 20,
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5EB',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFD6B3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  currentLocationText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#FF6B00',
  },
  currentLocationButtonLoading: {
    backgroundColor: '#FFF0E6',
    opacity: 0.8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5EB',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD6B3',
  },
  locationButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#FF6B00',
  },
  suggestionsList: {
    flex: 1,
  },
  sectionHeader: {
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  icon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  secondaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});

export default AddressModal; 