import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground, 
  Dimensions, 
  Alert, 
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddressModal from '../components/AddressModal';
import CountryPicker, { 
  CountryModalProvider,
  DEFAULT_THEME
} from "react-native-country-picker-modal";
import CustomHeader from '../components/common/CustomHeader';
import { getDistanceToRestaurant, formatDistance } from '../services/LocationService';
import geocodingService from '../services/geocodingService';

const { width, height } = Dimensions.get('window');
const scaleFont = (size) => Math.round(size * (width / 375));

const FormInput = ({ label, icon, placeholder, value, onChangeText, keyboardType = 'default' }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color="#FF9800" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

const CommanderLivreurContent = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { livreur, distance, fee } = route.params || {};
  
  // États du formulaire
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    packageNature: '',
    recipientName: '',
    recipientPhone: '',
    deliveryDate: new Date().toLocaleDateString(),
    deliveryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const [deliveryDistance, setDeliveryDistance] = useState(distance || 5);
  const [deliveryFee, setDeliveryFee] = useState(fee || 1000);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address Modals state
  const [activeAddressField, setActiveAddressField] = useState(null); // 'pickupAddress' or 'deliveryAddress'
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  // Calcul dynamique de la distance et des frais
  useEffect(() => {
    const updateDistanceAndFee = async () => {
      if (formData.pickupAddress && formData.deliveryAddress) {
        setIsLoadingLocation(true);
        try {
          console.log('🔄 [CommanderLivreur] Calcul de la distance entre:', formData.pickupAddress, 'et', formData.deliveryAddress);
          
          // 1. Géocoder les deux adresses
          const pickupCoords = await geocodingService.geocodeAddress(formData.pickupAddress);
          const deliveryCoords = await geocodingService.geocodeAddress(formData.deliveryAddress);

          if (pickupCoords && deliveryCoords) {
            console.log('📍 [CommanderLivreur] Coordonnées obtenues:', { pickupCoords, deliveryCoords });
            
            // 2. Tenter de calculer l'itinéraire pour avoir la distance réelle
            const route = await geocodingService.getRoute(pickupCoords, deliveryCoords);
            
            let distanceKm = 0;
            if (route && route.distanceValue) {
              distanceKm = route.distanceValue / 1000;
              console.log('🛣️ [CommanderLivreur] Distance par la route:', distanceKm);
            } else {
              // Fallback: Haversine distance
              distanceKm = geocodingService.calculateDistance(
                pickupCoords.latitude, pickupCoords.longitude,
                deliveryCoords.latitude, deliveryCoords.longitude
              );
              console.log('📏 [CommanderLivreur] Fallback Haversine distance:', distanceKm);
            }

            if (distanceKm > 0) {
              setDeliveryDistance(distanceKm);
              
              // 3. Calculer les nouveaux frais
              let newFee = 1000;
              if (distanceKm > 3 && distanceKm <= 7) newFee = 1500;
              else if (distanceKm > 7) newFee = 2000;
              
              setDeliveryFee(newFee);
              console.log(`✅ [CommanderLivreur] Résultat final: ${distanceKm.toFixed(2)}km -> ${newFee} FCFA`);
            }
          } else {
            console.log('⚠️ [CommanderLivreur] Géocodage échoué pour l\'une des adresses');
          }
        } catch (error) {
          console.error('❌ [CommanderLivreur] Erreur lors du calcul dynamique:', error);
        } finally {
          setIsLoadingLocation(false);
        }
      }
    };

    updateDistanceAndFee();
  }, [formData.pickupAddress, formData.deliveryAddress]);

  // Phone input state
  const [countryCode, setCountryCode] = useState("CG");
  const [callingCode, setCallingCode] = useState("242");

  const handleAddressSelect = (address) => {
    if (activeAddressField) {
      setFormData(prev => ({ ...prev, [activeAddressField]: address }));
    }
  };

  const openAddressModal = (field) => {
    setActiveAddressField(field);
    setAddressModalVisible(true);
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { pickupAddress, deliveryAddress, packageNature, recipientName, recipientPhone } = formData;
    if (!pickupAddress || !deliveryAddress || !packageNature || !recipientName || !recipientPhone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return false;
    }
    return true;
  };

  const handleFinalBooking = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erreur', 'Vous devez être connecté pour réserver');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/commander-livreur', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          livreur_id: livreur?.id,
          delivery_price: deliveryFee,
          pickup_address: formData.pickupAddress,
          delivery_address: formData.deliveryAddress,
          package_nature: formData.packageNature,
          recipient_name: formData.recipientName,
          recipient_phone: formData.recipientPhone,
          delivery_date: formData.deliveryDate,
          delivery_time: formData.deliveryTime,
        }),
      });

      const data = await response.json();
      console.log('📥 Réponse booking:', data);

      if (response.ok && (data.success || data.message?.includes('succès'))) {
        navigation.navigate('PaymentLivreur', {
          orderDetails: {
            orderId: data.order_id || data.id,
            orderType: 'livreur',
            subtotal: deliveryFee,
            deliveryFee: 0,
            total: deliveryFee,
            distance: deliveryDistance,
            description: `Réservation livreur - ${livreur?.name || 'Livreur'}`,
            livreur: livreur,
            deliveryDetails: formData,
            items: [
              {
                name: `Livraison: ${formData.packageNature}`,
                price: deliveryFee,
                quantity: 1
              }
            ]
          },
          onPaymentSuccess: () => {
            Alert.alert('Succès', 'Votre livraison a été enregistrée.');
            navigation.navigate('Home');
          }
        });
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de créer la commande');
      }
    } catch (error) {
      console.error('Error in handleFinalBooking:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la réservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <CustomHeader 
        title="Détails de livraison"
        backgroundColor="#FF9800"
      />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Informations de livraison</Text>
          <Text style={styles.headerSubtitle}>
            {livreur ? `Réservation avec ${livreur.name}` : 'Remplissez les détails pour commander votre livreur'}
          </Text>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Adresse de récupération</Text>
          <TouchableOpacity 
            style={styles.addressInputTrigger}
            onPress={() => openAddressModal('pickupAddress')}
          >
            <Ionicons name="location-outline" size={20} color="#FF9800" style={styles.inputIcon} />
            <Text style={[styles.addressTextOutput, !formData.pickupAddress && styles.placeholderText]} numberOfLines={1}>
              {formData.pickupAddress || "Ex: Marché de Poto-Poto"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Adresse de livraison</Text>
          <TouchableOpacity 
            style={styles.addressInputTrigger}
            onPress={() => openAddressModal('deliveryAddress')}
          >
            <Ionicons name="navigate-outline" size={20} color="#FF9800" style={styles.inputIcon} />
            <Text style={[styles.addressTextOutput, !formData.deliveryAddress && styles.placeholderText]} numberOfLines={1}>
              {formData.deliveryAddress || "Ex: Rue 12, Moungali"}
            </Text>
          </TouchableOpacity>
        </View>

        <FormInput 
          label="Nature du colis"
          icon="cube-outline"
          placeholder="Ex: Document, Vêtements, Nourriture..."
          value={formData.packageNature}
          onChangeText={(v) => handleInputChange('packageNature', v)}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <FormInput 
              label="Nom destinataire"
              icon="person-outline"
              placeholder="Jean Dupont"
              value={formData.recipientName}
              onChangeText={(v) => handleInputChange('recipientName', v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryPickerWrapper}>
                  <CountryPicker
                    containerButtonStyle={styles.countryButton}
                    countryCode={countryCode}
                    withFilter
                    withFlag
                    withCallingCode
                    withCallingCodeButton
                    onSelect={(country) => {
                      setCountryCode(country.cca2);
                      setCallingCode(country.callingCode[0]);
                    }}
                    theme={DEFAULT_THEME}
                  />
                </View>
                <TextInput
                  style={styles.phoneNumberInput}
                  placeholder="06 123 45 67"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={formData.recipientPhone}
                  onChangeText={(v) => handleInputChange('recipientPhone', v)}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <FormInput 
              label="Date"
              icon="calendar-outline"
              placeholder="JJ/MM/AAAA"
              value={formData.deliveryDate}
              onChangeText={(v) => handleInputChange('deliveryDate', v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput 
              label="Heure"
              icon="time-outline"
              placeholder="14:30"
              value={formData.deliveryTime}
              onChangeText={(v) => handleInputChange('deliveryTime', v)}
            />
          </View>
        </View>

        {/* Estimation des frais */}
        <View style={styles.pricingSummary}>
          <View style={styles.pricingHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#666" />
            <Text style={styles.pricingTitle}>Estimation des frais</Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Distance estimée</Text>
            <Text style={styles.priceValue}>
              {isLoadingLocation ? <ActivityIndicator size="small" color="#FF9800" /> : formatDistance(deliveryDistance)}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Frais de livraison</Text>
            <Text style={[styles.priceValue, { color: '#FF9800' }]}>{deliveryFee} FCFA</Text>
          </View>
        </View>

        {/* Bouton de confirmation déplacé ici pour être scrollable */}
        <TouchableOpacity 
          style={[styles.nextButton, isSubmitting && { opacity: 0.7 }, { marginTop: 30 }]}
          onPress={handleFinalBooking}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>Passer au paiement</Text>
              <Ionicons name="arrow-forward-circle" size={22} color="#fff" style={{ marginLeft: 10 }} />
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      <AddressModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSelectAddress={handleAddressSelect}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  headerInfo: {
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: scaleFont(22),
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat',
    color: '#666',
  },
  inputWrapper: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat-Bold',
    color: '#444',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    height: 55,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pricingSummary: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 10,
  },
  pricingTitle: {
    fontSize: scaleFont(16),
    fontFamily: 'Montserrat-Bold',
    color: '#444',
    marginLeft: 8,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat',
    color: '#666',
  },
  priceValue: {
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingBottom: Platform.OS === 'ios' ? 35 : 20, // Plus d'espace sur iOS
  },
  nextButton: {
    backgroundColor: '#FF9800',
    borderRadius: 15,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginBottom: 20, // Espace en bas pour le scroll
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: scaleFont(16),
    fontFamily: 'Montserrat-Bold',
  },
  addressInputTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    height: 55,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  addressTextOutput: {
    flex: 1,
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat',
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 55,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  countryPickerWrapper: {
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
    paddingHorizontal: 10,
  },
  countryButton: {
    height: '100%',
    justifyContent: 'center',
  },
  phoneNumberInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: scaleFont(14),
    fontFamily: 'Montserrat',
    color: '#333',
  },
});

const CommanderLivreurScreen = () => (
  <CountryModalProvider>
    <CommanderLivreurContent />
  </CountryModalProvider>
);

export default CommanderLivreurScreen;
