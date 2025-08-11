import * as Location from 'expo-location';

// Coordonnées du restaurant principal (Brazzaville)
const RESTAURANT_COORDS = {
  latitude: -4.2634, // Brazzaville
  longitude: 15.2429
};

/**
 * Demande les permissions de localisation et obtient la position actuelle
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentLocation = async () => {
  try {
    // Demander les permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission de localisation refusée');
    }

    // Obtenir la position actuelle
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  } catch (error) {
    console.error('Erreur lors de l\'obtention de la localisation:', error);
    throw error;
  }
};

/**
 * Calcule la distance entre deux points géographiques (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Arrondir à 1 décimale
  return Math.round(distance * 10) / 10;
};

/**
 * Calcule la distance entre la position actuelle et le restaurant
 * @returns {Promise<number>} Distance en kilomètres
 */
export const getDistanceToRestaurant = async () => {
  try {
    const userLocation = await getCurrentLocation();
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      RESTAURANT_COORDS.latitude,
      RESTAURANT_COORDS.longitude
    );
    
    console.log('📍 Distance calculée:', distance, 'km');
    return distance;
  } catch (error) {
    console.error('Erreur lors du calcul de la distance:', error);
    throw error;
  }
};

/**
 * Obtient les coordonnées du restaurant
 * @returns {Object} Coordonnées du restaurant
 */
export const getRestaurantCoordinates = () => {
  return RESTAURANT_COORDS;
};

/**
 * Formate la distance pour l'affichage
 * @param {number} distance - Distance en km
 * @returns {string} Distance formatée
 */
export const formatDistance = (distance) => {
  if (!distance || isNaN(distance)) {
    return 'Distance non disponible';
  }
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else {
    return `${distance}km`;
  }
}; 