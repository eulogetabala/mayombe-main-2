// Service de localisation pour calculer les distances
import * as Location from 'expo-location';

// Calculer la distance entre deux points (formule de Haversine)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Formater la distance pour l'affichage
export const formatDistance = (distance) => {
  if (!distance) return '';
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

// Obtenir la distance vers un restaurant
export const getDistanceToRestaurant = (userLocation, restaurantLocation) => {
  if (!userLocation || !restaurantLocation) return null;
  return calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    restaurantLocation.latitude,
    restaurantLocation.longitude
  );
};

// Obtenir la position actuelle de l'utilisateur
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission de localisation refusée');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Erreur lors de l\'obtention de la position:', error);
    throw error;
  }
};

// Calculer le temps de trajet estimé (en minutes)
export const calculateEstimatedTime = (distance, mode = 'driving') => {
  const speeds = {
    driving: 30, // 30 km/h en ville
    walking: 5,  // 5 km/h
    cycling: 15  // 15 km/h
  };
  
  const speed = speeds[mode] || speeds.driving;
  const timeInHours = distance / speed;
  return Math.max(1, Math.round(timeInHours * 60)); // En minutes, minimum 1 min
};

// Vérifier si une position est proche d'une autre (dans un rayon donné)
export const isNearby = (pos1, pos2, radiusKm = 0.1) => {
  const distance = calculateDistance(
    pos1.latitude,
    pos1.longitude,
    pos2.latitude,
    pos2.longitude
  );
  return distance <= radiusKm;
};

// Obtenir l'adresse à partir des coordonnées
export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (results.length > 0) {
      const address = results[0];
      return `${address.street || ''} ${address.name || ''}, ${address.city || ''}`.trim();
    }
    
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  } catch (error) {
    console.error('Erreur lors de la géocodification inverse:', error);
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
};
