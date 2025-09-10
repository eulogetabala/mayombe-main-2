import * as Location from 'expo-location';
import pushNotificationService from './pushNotifications';

class GeofencingService {
  constructor() {
    this.activeGeofences = new Map(); // orderId -> geofenceData
    this.locationSubscription = null;
    this.isMonitoring = false;
    this.lastNotificationDistance = new Map(); // orderId -> lastDistance
  }

  // Initialiser le service
  async initialize() {
    try {
      console.log('🎯 Initialisation du service de geofencing...');

      // Demander les permissions de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('❌ Permission de localisation refusée pour le geofencing');
        return false;
      }

      // Demander les permissions de notifications
      await pushNotificationService.initialize();

      console.log('✅ Service de geofencing initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation geofencing:', error);
      return false;
    }
  }

  // Ajouter un geofence pour une commande
  addGeofence(orderId, destinationLocation, notificationDistances = [1000, 500, 200, 100]) {
    try {
      console.log('🎯 Ajout geofence pour:', orderId, destinationLocation);

      const geofenceData = {
        orderId,
        destination: destinationLocation,
        notificationDistances: notificationDistances.sort((a, b) => b - a), // Tri décroissant
        isActive: true,
        createdAt: Date.now()
      };

      this.activeGeofences.set(orderId, geofenceData);
      this.lastNotificationDistance.set(orderId, null);

      // Démarrer le monitoring si pas déjà actif
      if (!this.isMonitoring) {
        this.startLocationMonitoring();
      }

      console.log('✅ Geofence ajouté pour:', orderId);
    } catch (error) {
      console.error('❌ Erreur ajout geofence:', error);
    }
  }

  // Supprimer un geofence
  removeGeofence(orderId) {
    try {
      console.log('🎯 Suppression geofence pour:', orderId);

      this.activeGeofences.delete(orderId);
      this.lastNotificationDistance.delete(orderId);

      // Arrêter le monitoring si plus de geofences actifs
      if (this.activeGeofences.size === 0) {
        this.stopLocationMonitoring();
      }

      console.log('✅ Geofence supprimé pour:', orderId);
    } catch (error) {
      console.error('❌ Erreur suppression geofence:', error);
    }
  }

  // Démarrer le monitoring de localisation
  async startLocationMonitoring() {
    if (this.isMonitoring) return;

    try {
      console.log('📍 Démarrage monitoring de localisation pour geofencing...');

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Vérifier toutes les 5 secondes
          distanceInterval: 10, // Ou tous les 10 mètres
        },
        (location) => {
          this.checkGeofences(location.coords);
        }
      );

      this.isMonitoring = true;
      console.log('✅ Monitoring de localisation démarré');
    } catch (error) {
      console.error('❌ Erreur démarrage monitoring:', error);
    }
  }

  // Arrêter le monitoring de localisation
  stopLocationMonitoring() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      this.isMonitoring = false;
      console.log('🛑 Monitoring de localisation arrêté');
    }
  }

  // Vérifier tous les geofences actifs
  async checkGeofences(currentLocation) {
    try {
      for (const [orderId, geofenceData] of this.activeGeofences.entries()) {
        if (!geofenceData.isActive) continue;

        const distance = this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          geofenceData.destination.latitude,
          geofenceData.destination.longitude
        );

        // Vérifier si on doit envoyer une notification
        await this.checkProximityNotification(orderId, distance, geofenceData);
      }
    } catch (error) {
      console.error('❌ Erreur vérification geofences:', error);
    }
  }

  // Vérifier et envoyer les notifications de proximité
  async checkProximityNotification(orderId, distance, geofenceData) {
    try {
      const lastDistance = this.lastNotificationDistance.get(orderId);
      
      // Trouver la distance de notification la plus proche
      const closestNotificationDistance = geofenceData.notificationDistances.find(
        notificationDistance => distance <= notificationDistance
      );

      // Envoyer une notification si on s'approche d'une nouvelle distance
      if (closestNotificationDistance && 
          (!lastDistance || closestNotificationDistance < lastDistance)) {
        
        this.lastNotificationDistance.set(orderId, closestNotificationDistance);
        
        // Calculer le temps estimé d'arrivée (vitesse moyenne de 20 km/h)
        const estimatedTime = Math.max(1, Math.round(distance / 333)); // 333 m/min = 20 km/h
        
        // Envoyer la notification
        await pushNotificationService.sendProximityNotification(
          orderId,
          distance,
          estimatedTime
        );

        console.log('🎯 Notification de proximité envoyée:', {
          orderId,
          distance: Math.round(distance),
          estimatedTime
        });
      }
    } catch (error) {
      console.error('❌ Erreur notification de proximité:', error);
    }
  }

  // Calculer la distance entre deux points (formule de Haversine)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  // Obtenir les geofences actifs
  getActiveGeofences() {
    return Array.from(this.activeGeofences.values());
  }

  // Vérifier si un geofence est actif
  isGeofenceActive(orderId) {
    return this.activeGeofences.has(orderId);
  }

  // Nettoyer tous les geofences
  cleanup() {
    console.log('🧹 Nettoyage du service de geofencing...');
    
    this.stopLocationMonitoring();
    this.activeGeofences.clear();
    this.lastNotificationDistance.clear();
    
    console.log('✅ Service de geofencing nettoyé');
  }
}

const geofencingService = new GeofencingService();
export default geofencingService;
