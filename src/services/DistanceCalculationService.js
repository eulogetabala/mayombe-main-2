// Service de calcul de distance et temps estimé avancé
class DistanceCalculationService {
  constructor() {
    this.earthRadius = 6371; // Rayon de la Terre en km
    this.averageSpeed = {
      walking: 5, // km/h
      cycling: 15, // km/h
      motorbike: 25, // km/h
      car: 30, // km/h
      default: 20 // km/h
    };
    
    // Cache pour éviter les calculs répétés
    this.distanceCache = new Map();
    this.timeCache = new Map();
  }

  // Calcul de distance Haversine optimisé
  calculateDistance(lat1, lon1, lat2, lon2) {
    const key = `${lat1.toFixed(6)},${lon1.toFixed(6)},${lat2.toFixed(6)},${lon2.toFixed(6)}`;
    
    // Vérifier le cache
    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key);
    }

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.earthRadius * c;

    // Mettre en cache (limiter à 100 entrées)
    if (this.distanceCache.size < 100) {
      this.distanceCache.set(key, distance);
    }

    return distance;
  }

  // Calcul de temps estimé basé sur la vitesse réelle
  calculateEstimatedTime(distance, currentSpeed = null, vehicleType = 'default') {
    const key = `${distance.toFixed(3)},${currentSpeed},${vehicleType}`;
    
    // Vérifier le cache
    if (this.timeCache.has(key)) {
      return this.timeCache.get(key);
    }

    let speed = currentSpeed;
    
    // Si pas de vitesse actuelle, utiliser la vitesse moyenne selon le type de véhicule
    if (!speed || speed < 1) {
      speed = this.averageSpeed[vehicleType] || this.averageSpeed.default;
    }

    // Ajuster la vitesse selon les conditions
    speed = this.adjustSpeedForConditions(speed, distance);

    const timeInHours = distance / speed;
    const timeInMinutes = Math.ceil(timeInHours * 60);

    const result = {
      minutes: timeInMinutes,
      seconds: Math.ceil(timeInHours * 3600),
      speed: speed,
      distance: distance
    };

    // Mettre en cache (limiter à 50 entrées)
    if (this.timeCache.size < 50) {
      this.timeCache.set(key, result);
    }

    return result;
  }

  // Ajuster la vitesse selon les conditions (trafic, distance, etc.)
  adjustSpeedForConditions(baseSpeed, distance) {
    let adjustedSpeed = baseSpeed;

    // Réduire la vitesse pour les courtes distances (trafic urbain)
    if (distance < 0.5) { // Moins de 500m
      adjustedSpeed *= 0.6; // Réduction de 40%
    } else if (distance < 1) { // Moins de 1km
      adjustedSpeed *= 0.8; // Réduction de 20%
    }

    // Réduire la vitesse pour les très longues distances (fatigue)
    if (distance > 10) { // Plus de 10km
      adjustedSpeed *= 0.9; // Réduction de 10%
    }

    return Math.max(adjustedSpeed, 2); // Vitesse minimum de 2 km/h
  }

  // Calculer la vitesse moyenne basée sur l'historique des positions
  calculateAverageSpeed(positions) {
    if (positions.length < 2) return 0;

    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      const distance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );

      const time = (curr.timestamp - prev.timestamp) / 1000 / 3600; // en heures

      if (time > 0) {
        totalDistance += distance;
        totalTime += time;
      }
    }

    return totalTime > 0 ? totalDistance / totalTime : 0;
  }

  // Prédire la position future basée sur la vitesse et direction
  predictFuturePosition(currentLat, currentLon, speed, heading, timeMinutes) {
    const distance = (speed * timeMinutes) / 60; // distance en km
    
    const bearing = this.toRadians(heading);
    const lat1 = this.toRadians(currentLat);
    const lon1 = this.toRadians(currentLon);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance / this.earthRadius) +
      Math.cos(lat1) * Math.sin(distance / this.earthRadius) * Math.cos(bearing)
    );

    const lon2 = lon1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distance / this.earthRadius) * Math.cos(lat1),
      Math.cos(distance / this.earthRadius) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      latitude: this.toDegrees(lat2),
      longitude: this.toDegrees(lon2)
    };
  }

  // Déterminer le statut de livraison basé sur la distance et vitesse
  determineDeliveryStatus(distance, speed, lastStatus) {
    const distanceInMeters = distance * 1000;

    // Statuts basés sur la distance
    if (distanceInMeters < 10) {
      return 'Arrivé à destination';
    } else if (distanceInMeters < 50) {
      return 'Presque arrivé';
    } else if (distanceInMeters < 200) {
      return 'À proximité';
    } else if (distanceInMeters < 500) {
      return 'Dans le quartier';
    }

    // Statuts basés sur la vitesse
    if (speed < 2 && distanceInMeters > 100) {
      return 'En attente';
    } else if (speed > 30) {
      return 'En route rapide';
    } else if (speed > 15) {
      return 'En cours de livraison';
    } else {
      return 'En déplacement';
    }
  }

  // Formater la distance pour l'affichage
  formatDistance(distanceInMeters) {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)} m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }
  }

  // Formater le temps estimé pour l'affichage
  formatEstimatedTime(minutes) {
    if (minutes < 1) {
      return 'Moins d\'1 min';
    } else if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }
  }

  // Utilitaires
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  toDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  // Nettoyer le cache
  clearCache() {
    this.distanceCache.clear();
    this.timeCache.clear();
  }
}

export default new DistanceCalculationService();
