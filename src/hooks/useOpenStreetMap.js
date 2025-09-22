import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

const useOpenStreetMap = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Fonction pour obtenir la position de l'utilisateur
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Permission de localisation refusée');
        return null;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setUserLocation(userLoc);
      return userLoc;
    } catch (error) {
      console.error('Erreur lors de la récupération de la position:', error);
      return null;
    }
  };

  // Fonction pour obtenir des suggestions basées sur la position
  const fetchNearbyPlaces = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Obtenir la position de l'utilisateur si elle n'est pas déjà disponible
      let location = userLocation;
      if (!location) {
        location = await getUserLocation();
        if (!location) {
          console.log('Impossible d\'obtenir la position de l\'utilisateur');
          setLoading(false);
          return;
        }
      }
      
      console.log('Récupération des lieux à proximité');
      
      // Utilisation de l'API Nominatim pour obtenir des lieux à proximité
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`;
      
      console.log('URL de requête pour les lieux à proximité:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'fr',
          'User-Agent': 'MayombeApp/1.0'
        }
      });
      
      console.log('Statut de la réponse pour les lieux à proximité:', response.status);
      
      const data = await response.json();
      console.log('Données reçues pour les lieux à proximité:', JSON.stringify(data, null, 2));
      
      if (data && data.address) {
        // Créer des suggestions basées sur l'adresse actuelle
        const addressParts = [];
        
        if (data.address.road) addressParts.push(data.address.road);
        if (data.address.house_number) addressParts.push(data.address.house_number);
        if (data.address.suburb) addressParts.push(data.address.suburb);
        if (data.address.neighbourhood) addressParts.push(data.address.neighbourhood);
        if (data.address.quarter) addressParts.push(data.address.quarter);
        if (data.address.city || data.address.town || data.address.village) {
          addressParts.push(data.address.city || data.address.town || data.address.village);
        }
        if (data.address.state) addressParts.push(data.address.state);
        if (data.address.country) addressParts.push(data.address.country);
        
        const mainText = addressParts.slice(0, 2).join(' ');
        const secondaryText = addressParts.slice(2).join(', ');
        
        // Créer plusieurs suggestions basées sur l'adresse actuelle
        const nearbyPlaces = [
          {
            place_id: 'current_location',
            structured_formatting: {
              main_text: mainText || 'Votre position actuelle',
              secondary_text: secondaryText || data.display_name
            },
            location: {
              lat: parseFloat(data.lat),
              lng: parseFloat(data.lon)
            }
          }
        ];
        
        // Ajouter des suggestions supplémentaires basées sur l'adresse actuelle
        if (data.address.road) {
          nearbyPlaces.push({
            place_id: 'current_street',
            structured_formatting: {
              main_text: data.address.road,
              secondary_text: `${data.address.neighbourhood || data.address.quarter || ''}, ${data.address.city || data.address.town || data.address.village || ''}, ${data.address.country || ''}`
            },
            location: {
              lat: parseFloat(data.lat),
              lng: parseFloat(data.lon)
            }
          });
        }
        
        if (data.address.neighbourhood) {
          nearbyPlaces.push({
            place_id: 'current_neighbourhood',
            structured_formatting: {
              main_text: data.address.neighbourhood,
              secondary_text: `${data.address.city || data.address.town || data.address.village || ''}, ${data.address.country || ''}`
            },
            location: {
              lat: parseFloat(data.lat),
              lng: parseFloat(data.lon)
            }
          });
        }
        
        if (data.address.quarter) {
          nearbyPlaces.push({
            place_id: 'current_quarter',
            structured_formatting: {
              main_text: data.address.quarter,
              secondary_text: `${data.address.city || data.address.town || data.address.village || ''}, ${data.address.country || ''}`
            },
            location: {
              lat: parseFloat(data.lat),
              lng: parseFloat(data.lon)
            }
          });
        }
        
        if (data.address.city || data.address.town || data.address.village) {
          const cityName = data.address.city || data.address.town || data.address.village;
          nearbyPlaces.push({
            place_id: 'current_city',
            structured_formatting: {
              main_text: cityName,
              secondary_text: `${data.address.state || ''}, ${data.address.country || ''}`
            },
            location: {
              lat: parseFloat(data.lat),
              lng: parseFloat(data.lon)
            }
          });
        }
        
        // Récupérer des lieux supplémentaires à proximité
        try {
          // Récupérer les lieux à proximité avec différents niveaux de détail
          const nearbyUrl = `https://nominatim.openstreetmap.org/search?format=json&lat=${location.latitude}&lon=${location.longitude}&radius=1000&limit=15&featuretype=street,neighbourhood,quarter,suburb`;
          const nearbyResponse = await fetch(nearbyUrl, {
            headers: {
              'Accept-Language': 'fr',
              'User-Agent': 'MayombeApp/1.0'
            }
          });
          
          const nearbyData = await nearbyResponse.json();
          
          if (nearbyData && nearbyData.length > 0) {
            // Ajouter les lieux à proximité aux suggestions
            const additionalPlaces = nearbyData.map((place, index) => ({
              place_id: `nearby_${index}`,
              structured_formatting: {
                main_text: place.display_name.split(',')[0],
                secondary_text: place.display_name.split(',').slice(1).join(',').trim()
              },
              location: {
                lat: parseFloat(place.lat),
                lng: parseFloat(place.lon)
              }
            }));
            
            nearbyPlaces.push(...additionalPlaces);
          }
        } catch (nearbyErr) {
          console.error('Erreur lors de la récupération des lieux à proximité supplémentaires:', nearbyErr);
        }
        
        setPredictions(nearbyPlaces);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des lieux à proximité:', err);
      setError('Impossible de récupérer les adresses à proximité');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictions = async (input) => {
    if (!input || input.length < 3) {
      // Si l'input est vide ou trop court, afficher les lieux à proximité
      if (predictions.length === 0) {
        await fetchNearbyPlaces();
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Recherche de prédictions pour:', input);
      
      // Utilisation de l'API Nominatim d'OpenStreetMap
      // Recherche mondiale sans restriction de pays
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        input
      )}&limit=15`;
      
      console.log('URL de requête:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'fr',
          'User-Agent': 'MayombeApp/1.0' // Important: Nominatim exige un User-Agent
        }
      });
      
      console.log('Statut de la réponse:', response.status);
      
      const data = await response.json();
      console.log('Données reçues:', JSON.stringify(data, null, 2));

      if (data && data.length > 0) {
        // Transformer les résultats pour correspondre au format attendu par le composant
        const formattedPredictions = data.map((place, index) => ({
          place_id: place.place_id || `place_${index}`,
          structured_formatting: {
            main_text: place.display_name.split(',')[0],
            secondary_text: place.display_name.split(',').slice(1).join(',').trim()
          },
          // Stocker les coordonnées pour une utilisation ultérieure
          location: {
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon)
          }
        }));
        
        setPredictions(formattedPredictions);
      } else {
        setPredictions([]);
      }
    } catch (err) {
      console.error('Erreur complète:', err);
      setError('Erreur lors de la récupération des suggestions');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceDetails = async (placeId) => {
    try {
      console.log('Récupération des détails pour placeId:', placeId);
      
      // Pour OpenStreetMap, nous n'avons pas besoin de faire une requête supplémentaire
      // car nous avons déjà les détails dans les prédictions
      // Nous pouvons simplement retourner les informations stockées
      
      // Trouver la prédiction correspondante
      const place = predictions.find(p => p.place_id === placeId);
      
      if (place) {
        return {
          address: `${place.structured_formatting.main_text}, ${place.structured_formatting.secondary_text}`,
          location: place.location
        };
      } else {
        throw new Error('Lieu non trouvé');
      }
    } catch (err) {
      console.error('Erreur complète pour les détails:', err);
      throw new Error('Erreur lors de la récupération des détails du lieu');
    }
  };

  return {
    predictions,
    loading,
    error,
    fetchPredictions,
    getPlaceDetails,
    fetchNearbyPlaces,
    userLocation
  };
};

export default useOpenStreetMap; 