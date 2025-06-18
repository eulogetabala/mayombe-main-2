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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useOpenStreetMap from '../hooks/useOpenStreetMap';

const AddressModal = ({ visible, onClose, onSelectAddress }) => {
  const [searchText, setSearchText] = useState('');
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
      // Récupérer les lieux à proximité
      await fetchNearbyPlaces();
      
      // Si nous avons des prédictions, sélectionner la première (position actuelle)
      if (predictions.length > 0) {
        const currentLocationPlace = predictions[0];
        const placeDetails = await getPlaceDetails(currentLocationPlace.place_id);
        
        // Mettre à jour le champ de recherche
        setSearchText(placeDetails.address);
        
        // Sélectionner l'adresse et fermer le modal
        onSelectAddress(placeDetails.address);
        onClose();
      } else {
        Alert.alert('Information', 'Aucune adresse trouvée à votre position actuelle.');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la position actuelle:', error);
      Alert.alert('Erreur', 'Impossible de récupérer votre position actuelle.');
    }
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
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Sélectionnez votre adresse</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Recherchez une adresse..."
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={styles.locationButton}
            onPress={handleGetCurrentLocation}
          >
            <Ionicons name="locate" size={20} color="#FF6B00" />
            <Text style={styles.locationButtonText}>Prendre ma position</Text>
          </TouchableOpacity>

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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
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