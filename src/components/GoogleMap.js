import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';

const GoogleMap = ({
  driverLocation,
  destinationLocation,
  pickupLocation,
  showRoute = true,
  style
}) => {
  const [mapHtml, setMapHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);

  // Votre clé API Google Maps
  const GOOGLE_MAPS_API_KEY = 'AIzaSyC-sck9on1ZwrjlLb-axnV0Vw8yO5Ah48Q'; // Configuration temporaire

  // Générer le HTML de la carte Google Maps
  const generateMapHTML = () => {
    const centerLat = driverLocation?.latitude || -4.3217;
    const centerLng = driverLocation?.longitude || 15.3125;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Google Maps</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            width: 100%; 
            height: 100%; 
            background: #1a1a1a; 
            overflow: hidden; 
            position: absolute; 
            top: 0; 
            left: 0; 
            right: 0; 
            bottom: 0; 
          }
          
          #map { 
            width: 100% !important; 
            height: 100% !important; 
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="loading" id="loading">Chargement de Google Maps...</div>
        
        <script>
          let map, driverMarker, destMarker, pickupMarker, directionsService, directionsRenderer;
          
          function initMap() {
            try {
              // Initialiser la carte Google Maps
              map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${centerLat}, lng: ${centerLng} },
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true,
                zoomControl: false,
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: false,
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  }
                ]
              });
              
              // Service de directions
              directionsService = new google.maps.DirectionsService();
              directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#4CAF50',
                  strokeWeight: 4,
                  strokeOpacity: 0.8
                }
              });
              directionsRenderer.setMap(map);
              
              // Marqueur du livreur
              ${driverLocation ? `
                driverMarker = new google.maps.Marker({
                  position: { lat: ${driverLocation.latitude}, lng: ${driverLocation.longitude} },
                  map: map,
                  title: 'Livreur',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="%234CAF50" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="white"/></svg>'),
                    scaledSize: new google.maps.Size(24, 24),
                    anchor: new google.maps.Point(12, 12)
                  }
                });
              ` : ''}
              
              // Marqueur de destination
              ${destinationLocation ? `
                destMarker = new google.maps.Marker({
                  position: { lat: ${destinationLocation.latitude}, lng: ${destinationLocation.longitude} },
                  map: map,
                  title: 'Destination',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="8" fill="%23FF5722" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg>'),
                    scaledSize: new google.maps.Size(20, 20),
                    anchor: new google.maps.Point(10, 10)
                  }
                });
              ` : ''}
              
              // Marqueur de point de collecte
              ${pickupLocation ? `
                pickupMarker = new google.maps.Marker({
                  position: { lat: ${pickupLocation.latitude}, lng: ${pickupLocation.longitude} },
                  map: map,
                  title: 'Point de collecte',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="8" fill="%232196F3" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg>'),
                    scaledSize: new google.maps.Size(20, 20),
                    anchor: new google.maps.Point(10, 10)
                  }
                });
              ` : ''}
              
              // Itinéraire si demandé
              ${showRoute && driverLocation && destinationLocation ? `
                calculateRoute();
              ` : ''}
              
              // Ajuster la vue pour inclure tous les marqueurs
              const bounds = new google.maps.LatLngBounds();
              ${driverLocation ? `bounds.extend(new google.maps.LatLng(${driverLocation.latitude}, ${driverLocation.longitude}));` : ''}
              ${destinationLocation ? `bounds.extend(new google.maps.LatLng(${destinationLocation.latitude}, ${destinationLocation.longitude}));` : ''}
              ${pickupLocation ? `bounds.extend(new google.maps.LatLng(${pickupLocation.latitude}, ${pickupLocation.longitude}));` : ''}
              
              if (!bounds.isEmpty()) {
                map.fitBounds(bounds);
                map.setZoom(Math.min(map.getZoom(), 15));
              }
              
              // Cacher le loading
              document.getElementById('loading').style.display = 'none';
              
              // Notifier React Native
              window.ReactNativeWebView.postMessage('Map loaded successfully');
              
              console.log('Google Maps initialized successfully');
            } catch (error) {
              console.error('Error initializing Google Maps:', error);
              document.getElementById('loading').innerHTML = 'Erreur de chargement de Google Maps';
            }
          }
          
          function calculateRoute() {
            if (!driverLocation || !destinationLocation) return;
            
            const request = {
              origin: { lat: ${driverLocation?.latitude || centerLat}, lng: ${driverLocation?.longitude || centerLng} },
              destination: { lat: ${destinationLocation?.latitude || centerLat}, lng: ${destinationLocation?.longitude || centerLng} },
              travelMode: google.maps.TravelMode.DRIVING
            };
            
            directionsService.route(request, (result, status) => {
              if (status === 'OK') {
                directionsRenderer.setDirections(result);
              }
            });
          }
          
          // Fonction pour mettre à jour la position du livreur
          window.updateDriverLocation = function(lat, lng) {
            if (driverMarker) {
              const newPosition = new google.maps.LatLng(lat, lng);
              driverMarker.setPosition(newPosition);
              map.panTo(newPosition);
              
              if (showRoute && destMarker) {
                calculateRoute();
              }
            }
          };
          
          // Fonction pour mettre à jour l'itinéraire
          window.updateRoute = function(startLat, startLng, endLat, endLng) {
            const request = {
              origin: { lat: startLat, lng: startLng },
              destination: { lat: endLat, lng: endLng },
              travelMode: google.maps.TravelMode.DRIVING
            };
            
            directionsService.route(request, (result, status) => {
              if (status === 'OK') {
                directionsRenderer.setDirections(result);
              }
            });
          };
        </script>
        
        <script async defer
          src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap">
        </script>
      </body>
      </html>
    `;
  };

  // Générer le HTML de la carte quand les positions changent
  useEffect(() => {
    setMapHtml(generateMapHTML());
  }, [driverLocation, destinationLocation, pickupLocation]);

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>Chargement de la carte...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'Map loaded successfully') {
            setLoading(false);
          }
        }}
        onError={(syntheticEvent) => {
          console.error('Erreur WebView:', syntheticEvent.nativeEvent);
          setLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          console.error('Erreur HTTP WebView:', syntheticEvent.nativeEvent);
          setLoading(false);
        }}
        onLoadEnd={() => {
          setLoading(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1000,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 20,
    fontFamily: 'Montserrat',
  },
});

export default GoogleMap;
