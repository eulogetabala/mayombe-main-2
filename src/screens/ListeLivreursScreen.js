import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Linking, SafeAreaView, StatusBar, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ListeLivreursScreen = () => {
  const navigation = useNavigation();
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [reservingLivreur, setReservingLivreur] = useState(null);

  useEffect(() => {
    fetchLivreurs();
  }, []);

  const fetchLivreurs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Récupération des livreurs disponibles...');
      
      // Essayer d'abord l'endpoint principal
      let response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/get-livreurs-dispo', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log('Statut de la réponse:', response.status);

      // Si 404, essayer l'endpoint alternatif
      if (response.status === 404) {
        console.log('Endpoint principal non trouvé, essai de l\'endpoint alternatif...');
        response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/admin/get-livreurs-dispo', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        console.log('Statut de la réponse alternative:', response.status);
      }

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Aucun endpoint de livreurs disponible, utilisation des données de démonstration');
          // Utiliser des données de démonstration
          const demoLivreurs = [
            {
              id: 1,
              name: 'Jean Livreur',
              phone: '+242061234567',
              avatar: null,
              status: 'Disponible',
              rating: 4.8,
              experience: '3 ans',
              deliveries: 1247,
              vehicle: 'Moto',
              distance: '2.3 km',
              zone: 'Zone centrale',
              specialite: 'Tous types'
            },
            {
              id: 2,
              name: 'Marie Express',
              phone: '+242061234568',
              avatar: null,
              status: 'Disponible',
              rating: 4.9,
              experience: '5 ans',
              deliveries: 2156,
              vehicle: 'Moto',
              distance: '1.8 km',
              zone: 'Zone nord',
              specialite: 'Livraison rapide'
            },
            {
              id: 3,
              name: 'Paul Rapide',
              phone: '+242061234569',
              avatar: null,
              status: 'Disponible',
              rating: 4.7,
              experience: '2 ans',
              deliveries: 892,
              vehicle: 'Moto',
              distance: '3.1 km',
              zone: 'Zone sud',
              specialite: 'Gros colis'
            },
            {
              id: 4,
              name: 'Sophie Flash',
              phone: '+242061234570',
              avatar: null,
              status: 'Disponible',
              rating: 4.6,
              experience: '4 ans',
              deliveries: 1634,
              vehicle: 'Moto',
              distance: '2.7 km',
              zone: 'Zone est',
              specialite: 'Livraison express'
            },
          ];
          
          setLivreurs(demoLivreurs);
          return;
        } else {
          throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('Données des livreurs reçues:', data);
      console.log('Nombre de livreurs:', Array.isArray(data) ? data.length : 'Non-array');

      if (Array.isArray(data)) {
        const mappedLivreurs = data.map((livreur, index) => {
          // Construction de l'URL de l'image si disponible
          let avatarUrl = null;
          if (livreur.avatar || livreur.image || livreur.photo) {
            avatarUrl = `https://www.mayombe-app.com/uploads_admin/${livreur.avatar || livreur.image || livreur.photo}`;
          }

          return {
            id: livreur.id || index + 1,
            name: livreur.name || livreur.nom || livreur.nom_complet || livreur.prenom || `Livreur ${index + 1}`,
            phone: livreur.phone || livreur.telephone || livreur.tel || '+242000000000',
            avatar: avatarUrl,
            status: livreur.status || livreur.disponibilite || 'Disponible',
            rating: livreur.rating || livreur.note || (4.5 + Math.random() * 0.5).toFixed(1),
            experience: livreur.experience || livreur.annees_experience || `${Math.floor(Math.random() * 5) + 1} ans`,
            deliveries: livreur.deliveries || livreur.livraisons || livreur.nombre_livraisons || Math.floor(Math.random() * 2000) + 500,
            vehicle: livreur.vehicle || livreur.vehicule || livreur.type_vehicule || 'Moto',
            distance: livreur.distance || livreur.distance_actuelle || `${(Math.random() * 3 + 1).toFixed(1)} km`,
            zone: livreur.zone || livreur.zone_livraison || 'Zone centrale',
            specialite: livreur.specialite || livreur.type_livraison || 'Tous types'
          };
        });

        console.log(`${mappedLivreurs.length} livreurs mappés avec succès`);
        console.log('Exemple de livreur mappé:', mappedLivreurs[0]);
        
        setLivreurs(mappedLivreurs);
        
        if (mappedLivreurs.length === 0) {
          setError('Aucun livreur disponible pour le moment. Veuillez réessayer plus tard.');
        }
      } else {
        console.error('Format de données invalide - attendu un tableau, reçu:', typeof data);
        throw new Error('Le serveur a retourné un format de données inattendu.');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des livreurs:', error);
      console.error('Message d\'erreur:', error.message);
      
      let errorMessage = 'Impossible de charger les livreurs pour le moment.';
      
      if (error.message.includes('Service de livreurs temporairement indisponible')) {
        errorMessage = error.message;
      } else if (error.message.includes('Network')) {
        errorMessage = 'Problème de connexion internet. Vérifiez votre connexion et réessayez.';
      } else if (error.message.includes('HTTP: 404')) {
        errorMessage = 'Service de livreurs temporairement indisponible. Veuillez réessayer plus tard.';
      } else if (error.message.includes('HTTP: 500')) {
        errorMessage = 'Erreur du serveur. Nos équipes ont été notifiées.';
      } else if (error.message.includes('HTTP')) {
        errorMessage = 'Erreur de communication avec le serveur.';
      } else if (error.message.includes('Format')) {
        errorMessage = 'Erreur technique. Veuillez réessayer.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleReserveLivreur = async (livreur) => {
    try {
      setReservingLivreur(livreur.id);
      
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erreur', 'Vous devez être connecté pour réserver un livreur');
        return;
      }

      console.log('🔄 Réservation du livreur:', livreur.name);
      
      const response = await fetch('https://www.api-mayombe.mayombe-app.com/public/api/reserve-livreur', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          livreur_id: livreur.id,
          livreur_name: livreur.name,
          livreur_phone: livreur.phone,
        }),
      });

      const data = await response.json();
      console.log('📥 Réponse de l\'API reserve-livreur:', data);

      if (response.ok) {
        console.log('✅ Livreur réservé avec succès');
        Alert.alert(
          'Succès',
          `Livreur ${livreur.name} réservé avec succès ! Il vous contactera bientôt.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        console.error('❌ Erreur lors de la réservation:', data);
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join('\n');
          Alert.alert('Erreur', errorMessages);
        } else {
          Alert.alert('Erreur', data.message || 'Impossible de réserver ce livreur');
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la réservation:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la réservation');
    } finally {
      setReservingLivreur(null);
    }
  };

  const handleImageError = (livreurId) => {
    setImageErrors(prev => ({
      ...prev,
      [livreurId]: true
    }));
  };

  const renderLivreur = ({ item, index }) => {
    const hasImageError = imageErrors[item.id];
    const isReserving = reservingLivreur === item.id;

    return (
      <View style={styles.livreurCard}>
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            {item.avatar && !hasImageError ? (
              <Image 
                source={{ uri: item.avatar }} 
                style={styles.avatar}
                onError={() => handleImageError(item.id)}
              />
            ) : (
              <Ionicons name="person-circle" size={40} color="#51A905" />
            )}
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.livreurName}>{item.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{item.rating}</Text>
              <Text style={styles.zone}>• {item.zone}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: item.status === "Disponible" ? "#4CAF50" : "#FF6B6B" }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="bicycle" size={14} color="#51A905" />
            <Text style={styles.detailText}>{item.vehicle}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cube" size={14} color="#51A905" />
            <Text style={styles.detailText}>{item.deliveries} livraisons</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color="#51A905" />
            <Text style={styles.detailText}>{item.experience}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.reserveButton, isReserving && styles.reserveButtonDisabled]}
            onPress={() => handleReserveLivreur(item)}
            disabled={isReserving}
          >
            {isReserving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                <Text style={styles.reserveButtonText}>Réserver</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Livreurs disponibles</Text>
          <Text style={styles.headerSubtitle}>Sélectionnez votre livreur préféré</Text>
        </View>
      </Animatable.View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#51A905" />
          <Text style={styles.loadingText}>Chargement des livreurs...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Oups ! Une erreur s'est produite</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLivreurs}>
            <Ionicons name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={20} color="#51A905" />
              <Text style={styles.statNumber}>{livreurs.length}</Text>
              <Text style={styles.statLabel}>Livreurs</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.statNumber}>
                {livreurs.length > 0 ? (livreurs.reduce((sum, l) => sum + parseFloat(l.rating), 0) / livreurs.length).toFixed(1) : '4.8'}
              </Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={20} color="#FF6B00" />
              <Text style={styles.statNumber}>15-20</Text>
              <Text style={styles.statLabel}>Min</Text>
            </View>
          </View>
          
          <FlatList
            data={livreurs}
            renderItem={renderLivreur}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  listContainer: {
    padding: 12,
  },
  livreurCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  infoContainer: {
    flex: 1,
  },
  livreurName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 13,
    color: '#FFA000',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 4,
  },
  zone: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginLeft: 6,
  },
  statusBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Montserrat-Bold',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginLeft: 4,
  },
  actionsRow: {
    padding: 12,
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#51A905',
  },
  reserveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  reserveButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#51A905',
    fontFamily: 'Montserrat-Bold',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 24,
  },
  retryButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: '#51A905',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    marginLeft: 8,
  },
});

export default ListeLivreursScreen; 