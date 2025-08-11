import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const OpenStreetMap = ({
  driverLocation,
  destinationLocation,
  pickupLocation,
  showRoute = true,
  style
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapHtml, setMapHtml] = useState('');
  const webViewRef = useRef(null);

  // Générer le HTML de la carte OpenStreetMap
  const generateMapHTML = () => {
    const centerLat = driverLocation?.latitude || currentLocation?.latitude || -4.3217;
    const centerLng = driverLocation?.longitude || currentLocation?.longitude || 15.3125;
    
    const markers = [];
    
    // Marqueur du livreur
    if (driverLocation) {
      markers.push(`
        L.marker([${driverLocation.latitude}, ${driverLocation.longitude}], {
          icon: L.divIcon({
            className: 'driver-marker',
            html: '<div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map).bindPopup('Livreur');
      `);
    }
    
    // Marqueur de destination
    if (destinationLocation) {
      markers.push(`
        L.marker([${destinationLocation.latitude}, ${destinationLocation.longitude}], {
          icon: L.divIcon({
            className: 'destination-marker',
            html: '<div style="background: #FF5722; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(map).bindPopup('Destination');
      `);
    }
    
    // Marqueur de point de collecte
    if (pickupLocation) {
      markers.push(`
        L.marker([${pickupLocation.latitude}, ${pickupLocation.longitude}], {
          icon: L.divIcon({
            className: 'pickup-marker',
            html: '<div style="background: #2196F3; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(map).bindPopup('Point de collecte');
      `);
    }
    
    // Itinéraire si demandé
    let routePolyline = '';
    if (showRoute && driverLocation && destinationLocation) {
      routePolyline = `
        // Itinéraire direct (ligne droite pour l'instant)
        const route = L.polyline([
          [${driverLocation.latitude}, ${driverLocation.longitude}],
          [${destinationLocation.latitude}, ${destinationLocation.longitude}]
        ], {
          color: '#4CAF50',
          weight: 4,
          opacity: 0.8
        }).addTo(map);
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mayombe Map</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif;
          }
          #map { 
            width: 100%; 
            height: 100vh; 
          }
          .driver-marker {
            background: transparent !important;
            border: none !important;
          }
          .destination-marker {
            background: transparent !important;
            border: none !important;
          }
          .pickup-marker {
            background: transparent !important;
            border: none !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialiser la carte
          const map = L.map('map').setView([${centerLat}, ${centerLng}], 15);
          
          // Ajouter la couche OpenStreetMap
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);
          
          // Ajouter les marqueurs
          ${markers.join('\n')}
          
          // Ajouter l'itinéraire
          ${routePolyline}
          
          // Ajuster la vue pour inclure tous les marqueurs
          const markers = [];
          ${driverLocation ? `markers.push([${driverLocation.latitude}, ${driverLocation.longitude}]);` : ''}
          ${destinationLocation ? `markers.push([${destinationLocation.latitude}, ${destinationLocation.longitude}]);` : ''}
          ${pickupLocation ? `markers.push([${pickupLocation.latitude}, ${pickupLocation.longitude}]);` : ''}
          
          if (markers.length > 0) {
            const group = L.featureGroup(markers.map(m => L.marker(m)));
            map.fitBounds(group.getBounds().pad(0.1));
          }
          
          // Fonction pour mettre à jour la position du livreur
          window.updateDriverLocation = function(lat, lng) {
            // Supprimer l'ancien marqueur du livreur
            map.eachLayer((layer) => {
              if (layer._icon && layer._icon.className && layer._icon.className.includes('driver-marker')) {
                map.removeLayer(layer);
              }
            });
            
            // Ajouter le nouveau marqueur
            L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'driver-marker',
                html: '<div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })
            }).addTo(map).bindPopup('Livreur');
          };
          
          // Fonction pour mettre à jour l'itinéraire
          window.updateRoute = function(startLat, startLng, endLat, endLng) {
            // Supprimer l'ancien itinéraire
            map.eachLayer((layer) => {
              if (layer instanceof L.Polyline) {
                map.removeLayer(layer);
              }
            });
            
            // Ajouter le nouvel itinéraire
            L.polyline([
              [startLat, startLng],
              [endLat, endLng]
            ], {
              color: '#4CAF50',
              weight: 4,
              opacity: 0.8
            }).addTo(map);
          };
        </script>
      </body>
      </html>
    `;
  };

  // Obtenir la position actuelle
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        // Pour l'app client, on peut utiliser une position par défaut
        // ou demander la permission si nécessaire
        setCurrentLocation({
          latitude: -4.3217,
          longitude: 15.3125,
        });
      } catch (error) {
        console.error('Erreur localisation:', error);
      }
    };

    getCurrentLocation();
  }, []);

  // Générer le HTML de la carte quand les positions changent
  useEffect(() => {
    setMapHtml(generateMapHTML());
  }, [driverLocation, destinationLocation, pickupLocation, currentLocation]);

  // Mettre à jour la position du livreur via WebView
  const updateDriverPosition = (lat, lng) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.updateDriverLocation(${lat}, ${lng});
        true;
      `);
    }
  };

  // Mettre à jour l'itinéraire via WebView
  const updateRoute = (startLat, startLng, endLat, endLng) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.updateRoute(${startLat}, ${startLng}, ${endLat}, ${endLng});
        true;
      `);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error: ', nativeEvent);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  webview: {
    flex: 1,
  },
});

export default OpenStreetMap;
