import * as Location from 'expo-location';

class GeocodingService {
  constructor() {
    this.isInitialized = false;
    this.apiKey = 'AIzaSyBH1IRNXPqsDDfIJItSb3hUJ1Q6gkqAcsI'; // Google Maps API Key
  }

  async initialize() {
    try {
      console.log('🗺️ Initialisation du service de géocodage...');
      
      // Demander la permission de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ Permission de localisation refusée pour le géocodage');
        return false;
      }

      this.isInitialized = true;
      console.log('✅ Service de géocodage initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation géocodage:', error);
      return false;
    }
  }

  // Géocoder une adresse en coordonnées GPS
  async geocodeAddress(address) {
    try {
      console.log('📍 Géocodage de l\'adresse:', address);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Utiliser l'API de géocodage de Google Maps
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const coordinates = {
          latitude: location.lat,
          longitude: location.lng,
          address: data.results[0].formatted_address
        };

        console.log('✅ Adresse géocodée:', coordinates);
        return coordinates;
      } else {
        console.log('⚠️ Aucun résultat pour l\'adresse:', address);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur géocodage:', error);
      return null;
    }
  }

  // Géocoder plusieurs adresses
  async geocodeAddresses(addresses) {
    const results = {};
    
    for (const [key, address] of Object.entries(addresses)) {
      console.log(`📍 Géocodage ${key}:`, address);
      results[key] = await this.geocodeAddress(address);
    }

    return results;
  }

  // Obtenir l'adresse à partir de coordonnées (géocodage inverse)
  async reverseGeocode(latitude, longitude) {
    try {
      console.log('📍 Géocodage inverse pour:', { latitude, longitude });
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        console.log('✅ Coordonnées géocodées:', address);
        return address;
      } else {
        console.log('⚠️ Aucun résultat pour les coordonnées:', { latitude, longitude });
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur géocodage inverse:', error);
      return null;
    }
  }

  // Obtenir la position actuelle de l'utilisateur
  async getCurrentLocation() {
    try {
      console.log('📍 Récupération de la position actuelle...');
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 60000
      });

      const coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      };

      console.log('✅ Position actuelle récupérée:', coordinates);
      return coordinates;
    } catch (error) {
      console.error('❌ Erreur récupération position:', error);
      return null;
    }
  }

  // Calculer la distance entre deux points (formule de Haversine)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Calculer le temps estimé de trajet
  calculateEstimatedTime(distance, mode = 'driving') {
    // Vitesses moyennes en km/h
    const speeds = {
      driving: 30, // Ville
      walking: 5,
      bicycling: 15
    };

    const speed = speeds[mode] || speeds.driving;
    const timeInHours = distance / speed;
    const timeInMinutes = Math.round(timeInHours * 60);

    return Math.max(1, timeInMinutes); // Minimum 1 minute
  }

  // Obtenir l'itinéraire entre deux points
  async getRoute(origin, destination, mode = 'driving') {
    try {
      console.log('🗺️ Calcul de l\'itinéraire:', { origin, destination, mode });
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${mode}&key=${this.apiKey}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        const routeInfo = {
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value, // en mètres
          durationValue: leg.duration.value, // en secondes
          polyline: route.overview_polyline.points,
          steps: leg.steps
        };

        console.log('✅ Itinéraire calculé:', routeInfo);
        return routeInfo;
      } else {
        console.log('⚠️ Impossible de calculer l\'itinéraire');
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur calcul itinéraire:', error);
      return null;
    }
  }

  // Valider si des coordonnées sont valides
  isValidCoordinates(latitude, longitude) {
    return (
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }

  // Formater les coordonnées pour l'affichage
  formatCoordinates(latitude, longitude, precision = 4) {
    return {
      lat: parseFloat(latitude).toFixed(precision),
      lng: parseFloat(longitude).toFixed(precision)
    };
  }
}

// Instance singleton
const geocodingService = new GeocodingService();

export default geocodingService;
