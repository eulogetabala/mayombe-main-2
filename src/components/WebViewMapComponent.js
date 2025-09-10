import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const WebViewMapComponent = React.forwardRef(({
  driverLocation,
  destinationLocation,
  pickupLocation,
  showRoute = true,
  style
}, ref) => {
  const [mapHtml, setMapHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);

  // Générer le HTML de la carte Google Maps
  const generateMapHTML = () => {
    const centerLat = destinationLocation?.latitude || -4.2634;
    const centerLng = destinationLocation?.longitude || 15.2429;
    const apiKey = 'AIzaSyBH1IRNXPqsDDfIJItSb3hUJ1Q6gkqAcsI';

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
          }
          #map { 
            width: 100% !important; 
            height: 100% !important; 
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
          let map;
          let driverMarker;
          let destinationMarker;
          let pickupMarker;

          function initMap() {
            console.log('🗺️ Initialisation de la carte Google Maps (version de base)');
            
            try {
              map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${centerLat}, lng: ${centerLng} },
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP
              });

              // Marqueur destination (client)
              if (${destinationLocation ? 'true' : 'false'}) {
                destinationMarker = new google.maps.Marker({
                  position: { lat: ${destinationLocation?.latitude || centerLat}, lng: ${destinationLocation?.longitude || centerLng} },
                  map: map,
                  title: 'Destination',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="12" fill="#FF5722" stroke="#fff" stroke-width="2"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">📍</text></svg>'),
                    scaledSize: new google.maps.Size(32, 32)
                  }
                });
                console.log('✅ Marqueur destination ajouté');
              }

              // Marqueur restaurant
              if (${pickupLocation ? 'true' : 'false'}) {
                pickupMarker = new google.maps.Marker({
                  position: { lat: ${pickupLocation?.latitude || centerLat}, lng: ${pickupLocation?.longitude || centerLng} },
                  map: map,
                  title: 'Restaurant',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="12" fill="#2196F3" stroke="#fff" stroke-width="2"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">🏪</text></svg>'),
                    scaledSize: new google.maps.Size(32, 32)
                  }
                });
                console.log('✅ Marqueur restaurant ajouté');
              }

              // Marqueur livreur
              if (${driverLocation ? 'true' : 'false'}) {
                driverMarker = new google.maps.Marker({
                  position: { lat: ${driverLocation?.latitude || centerLat}, lng: ${driverLocation?.longitude || centerLng} },
                  map: map,
                  title: 'Livreur',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="12" fill="#4CAF50" stroke="#fff" stroke-width="2"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">🚗</text></svg>'),
                    scaledSize: new google.maps.Size(32, 32)
                  }
                });
                console.log('✅ Marqueur livreur ajouté');
              }

              // Ligne droite simple entre restaurant et destination
              if (pickupMarker && destinationMarker) {
                drawStraightLine();
              }

              // Masquer le loading
              document.getElementById('loading').style.display = 'none';
              console.log('✅ Carte chargée avec succès');
              
              // Notifier React Native que la carte est prête
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapReady',
                  message: 'Carte prête pour les mises à jour'
                }));
              }
              
            } catch (error) {
              console.error('❌ Erreur initialisation carte:', error);
              document.getElementById('loading').innerHTML = 'Erreur de chargement de la carte';
            }
          }


          function drawStraightLine() {
            console.log('📏 Dessin d\'une ligne droite (fallback)');
            if (!pickupMarker || !destinationMarker) return;
            
            const line = new google.maps.Polyline({
              path: [pickupMarker.getPosition(), destinationMarker.getPosition()],
              geodesic: true,
              strokeColor: '#FF5722',
              strokeOpacity: 0.8,
              strokeWeight: 3
            });
            line.setMap(map);
          }

          function updateDriverPosition(lat, lng) {
            if (driverMarker) {
              const newPosition = new google.maps.LatLng(lat, lng);
              driverMarker.setPosition(newPosition);
              console.log('🚗 Position driver mise à jour:', lat, lng);
            }
          }

          // Fonction globale pour recevoir les mises à jour depuis React Native
          window.updateDriverLocation = function(locationData) {
            if (locationData && locationData.latitude && locationData.longitude) {
              updateDriverPosition(locationData.latitude, locationData.longitude);
            }
          };

          // Écouter les messages de React Native
          document.addEventListener('message', function(event) {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'updateDriverPosition') {
                updateDriverPosition(data.lat, data.lng);
              }
            } catch (error) {
              console.error('❌ Erreur parsing message:', error);
            }
          });

          function loadGoogleMapsAPI() {
            const script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap';
            script.async = true;
            script.defer = true;
            script.onerror = function() {
              console.error('❌ Erreur chargement Google Maps API');
              document.getElementById('loading').innerHTML = 'Erreur de chargement de Google Maps';
            };
            document.head.appendChild(script);
          }

          window.onload = function() {
            loadGoogleMapsAPI();
          };
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    const html = generateMapHTML();
    setMapHtml(html);
    setLoading(true);
  }, [driverLocation, destinationLocation, pickupLocation, showRoute]);

  const handleLoadEnd = () => {
    console.log('✅ WebView chargé');
    setLoading(false);
  };

  const handleError = (error) => {
    console.error('❌ Erreur WebView:', error);
    setLoading(false);
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 Message reçu de la WebView:', data);
      
      if (data.type === 'mapReady') {
        console.log('✅ Carte prête pour les mises à jour');
      }
    } catch (error) {
      console.error('❌ Erreur parsing message WebView:', error);
    }
  };

  React.useImperativeHandle(ref, () => ({
    updateDriverPosition: (lat, lng) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'updateDriverPosition',
          lat,
          lng
        }));
      }
    }
  }));

  return (
    <View style={[styles.container, style]}>
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
          <Text style={styles.loadingText}>Chargement de la carte...</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
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
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
});

WebViewMapComponent.displayName = 'WebViewMapComponent';

export default WebViewMapComponent;