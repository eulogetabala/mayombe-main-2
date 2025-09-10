import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const SimpleMapComponent = React.forwardRef(({ driverLocation, destinationLocation, pickupLocation, onMessage }, ref) => {
  const [mapHtml, setMapHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const webViewRef = React.useRef(null);

  // Debug: Vérifier les props reçues
  console.log('🔍 SimpleMapComponent - Props reçues:', {
    driverLocation,
    destinationLocation,
    pickupLocation,
    driverLocationType: typeof driverLocation,
    destinationLocationType: typeof destinationLocation,
    pickupLocationType: typeof pickupLocation
  });

  // Vérification immédiate pour éviter l'erreur
  if (!destinationLocation || !pickupLocation) {
    console.log('⚠️ Données manquantes - retour composant de chargement');
    return (
      <View style={styles.container}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    // Vérification de sécurité - s'assurer qu'on a au moins une position valide
    if (!destinationLocation && !pickupLocation && !driverLocation) {
      console.log('⚠️ Aucune position valide - utilisation des coordonnées par défaut');
    }

    // Vérification finale - s'assurer que destinationLocation n'est pas null
    const safeDestinationLocation = destinationLocation && 
      typeof destinationLocation.latitude === 'number' && 
      typeof destinationLocation.longitude === 'number' 
      ? destinationLocation 
      : { latitude: -4.2634, longitude: 15.2429 };

    const safePickupLocation = pickupLocation && 
      typeof pickupLocation.latitude === 'number' && 
      typeof pickupLocation.longitude === 'number' 
      ? pickupLocation 
      : { latitude: -4.2634, longitude: 15.2429 };

    const safeDriverLocation = driverLocation && 
      typeof driverLocation.latitude === 'number' && 
      typeof driverLocation.longitude === 'number' 
      ? driverLocation 
      : null;
    
    const centerLat = safeDestinationLocation.latitude;
    const centerLng = safeDestinationLocation.longitude;
    const apiKey = 'AIzaSyBH1IRNXPqsDDfIJItSb3hUJ1Q6gkqAcsI';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Simple Map</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; background: #1a1a1a; }
          #map { width: 100% !important; height: 100% !important; }
          .loading { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 1000; background: rgba(0, 0, 0, 0.8); color: white; 
            padding: 20px; border-radius: 10px; font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="loading" id="loading">Chargement carte simple...</div>

        <script>
          let map;

          function initMap() {
            console.log('🗺️ Simple Map - Initialisation');
            
            try {
              map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${centerLat}, lng: ${centerLng} },
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP
              });

              // Marqueur destination
              new google.maps.Marker({
                position: { lat: ${safeDestinationLocation.latitude}, lng: ${safeDestinationLocation.longitude} },
                map: map,
                title: 'Destination',
                icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
              });

              // Marqueur restaurant
              new google.maps.Marker({
                position: { lat: ${safePickupLocation.latitude}, lng: ${safePickupLocation.longitude} },
                map: map,
                title: 'Restaurant',
                icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
              });

              // Marqueur driver
              let driverMarker = null;
              if (${safeDriverLocation ? 'true' : 'false'}) {
                driverMarker = new google.maps.Marker({
                  position: { lat: ${safeDriverLocation ? safeDriverLocation.latitude : centerLat}, lng: ${safeDriverLocation ? safeDriverLocation.longitude : centerLng} },
                  map: map,
                  title: 'Driver',
                  icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                });
              }

              // Ligne droite entre restaurant et destination
              const line = new google.maps.Polyline({
                path: [
                  { lat: ${safePickupLocation.latitude}, lng: ${safePickupLocation.longitude} },
                  { lat: ${safeDestinationLocation.latitude}, lng: ${safeDestinationLocation.longitude} }
                ],
                geodesic: true,
                strokeColor: '#FF5722',
                strokeOpacity: 0.8,
                strokeWeight: 3
              });
              line.setMap(map);

              // Fonction pour mettre à jour la position du driver
              window.updateDriverPosition = function(lat, lng) {
                if (driverMarker) {
                  const newPosition = new google.maps.LatLng(lat, lng);
                  driverMarker.setPosition(newPosition);
                }
              };

              document.getElementById('loading').style.display = 'none';
              
              // Notifier React Native que la carte est prête
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapReady',
                  message: 'Carte prête pour les mises à jour'
                }));
              }
              
            } catch (error) {
              console.error('❌ Erreur Simple Map:', error);
              document.getElementById('loading').innerHTML = 'Erreur: ' + error.message;
            }
          }

          function loadGoogleMapsAPI() {
            const script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap';
            script.async = true;
            script.defer = true;
            script.onerror = function() {
              console.error('❌ Erreur chargement API');
              document.getElementById('loading').innerHTML = 'Erreur chargement Google Maps';
            };
            document.head.appendChild(script);
          }


          // Écouter les messages de React Native
          document.addEventListener('message', function(event) {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'updateDriverPosition') {
                window.updateDriverPosition(data.lat, data.lng);
              }
            } catch (error) {
              console.error('❌ Erreur parsing message:', error);
            }
          });

          window.onload = function() {
            loadGoogleMapsAPI();
          };
        </script>
      </body>
      </html>
    `;

    setMapHtml(html);
    setLoading(true);
  }, [driverLocation, destinationLocation, pickupLocation]);

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (error) => {
    console.error('❌ Erreur Simple WebView:', error);
    setLoading(false);
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (onMessage) {
        onMessage(event);
      }
    } catch (error) {
      console.error('❌ Erreur parsing message Simple Map:', error);
    }
  };

  // Fonction pour mettre à jour la position du driver depuis React Native
  const updateDriverPosition = (lat, lng) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateDriverPosition',
        lat,
        lng
      }));
    }
  };

  // Exposer la fonction via useImperativeHandle
  React.useImperativeHandle(ref, () => ({
    updateDriverPosition
  }));


  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.webview}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Chargement carte simple...</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 10,
  },
});

export default SimpleMapComponent;
