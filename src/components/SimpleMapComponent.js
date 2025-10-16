import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const SimpleMapComponent = React.forwardRef(({ driverLocation, destinationLocation, pickupLocation, orderStatus = 'pending', onMessage }, ref) => {
  const [mapHtml, setMapHtml] = useState('');
  const webViewRef = useRef(null);

  // Debug: Vérifier les props reçues
  console.log('🔍 SimpleMapComponent - Props reçues:', {
    driverLocation,
    destinationLocation,
    pickupLocation,
    driverLocationType: typeof driverLocation,
    destinationLocationType: typeof destinationLocation,
    pickupLocationType: typeof pickupLocation
  });

  // Vérification des coordonnées
  if (destinationLocation) {
    console.log('📍 Destination coords:', {
      lat: destinationLocation.latitude,
      lng: destinationLocation.longitude,
      latValid: typeof destinationLocation.latitude === 'number' && !isNaN(destinationLocation.latitude),
      lngValid: typeof destinationLocation.longitude === 'number' && !isNaN(destinationLocation.longitude)
    });
  }
  
  if (pickupLocation) {
    console.log('🏪 Pickup coords:', {
      lat: pickupLocation.latitude,
      lng: pickupLocation.longitude,
      latValid: typeof pickupLocation.latitude === 'number' && !isNaN(pickupLocation.latitude),
      lngValid: typeof pickupLocation.longitude === 'number' && !isNaN(pickupLocation.longitude)
    });
  }

  // Validation stricte des coordonnées
  const isValidCoordinate = (coord) => {
    return coord && 
           typeof coord.latitude === 'number' && 
           typeof coord.longitude === 'number' &&
           !isNaN(coord.latitude) && 
           !isNaN(coord.longitude) &&
           coord.latitude >= -90 && coord.latitude <= 90 &&
           coord.longitude >= -180 && coord.longitude <= 180;
  };

  // Vérification immédiate pour éviter l'erreur
  if (!destinationLocation || !pickupLocation || 
      !isValidCoordinate(destinationLocation) || 
      !isValidCoordinate(pickupLocation)) {
    console.log('⚠️ Coordonnées invalides ou manquantes:', {
      destinationValid: isValidCoordinate(destinationLocation),
      pickupValid: isValidCoordinate(pickupLocation),
      destinationLocation,
      pickupLocation
    });
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
        </style>
      </head>
      <body>
        <div id="map"></div>

        <script>
          let map;

          function initMap() {
            console.log('🗺️ Simple Map - Initialisation');
            
            try {
              map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${centerLat}, lng: ${centerLng} },
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  },
                  {
                    featureType: 'transit',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  }
                ],
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true
              });

              // Marqueur destination (rouge)
              const destinationMarker = new google.maps.Marker({
                position: { lat: ${safeDestinationLocation.latitude}, lng: ${safeDestinationLocation.longitude} },
                map: map,
                title: 'Destination de livraison',
                icon: {
                  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                },
                animation: google.maps.Animation.DROP
              });

              // InfoWindow pour la destination
              const destinationInfoWindow = new google.maps.InfoWindow({
                content: '<div style="padding: 8px;"><strong>📍 Destination</strong><br/>Livraison prévue</div>'
              });
              destinationMarker.addListener('click', () => {
                destinationInfoWindow.open(map, destinationMarker);
              });

              // Marqueur restaurant (bleu)
              const restaurantMarker = new google.maps.Marker({
                position: { lat: ${safePickupLocation.latitude}, lng: ${safePickupLocation.longitude} },
                map: map,
                title: 'Restaurant',
                icon: {
                  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                },
                animation: google.maps.Animation.DROP
              });

              // InfoWindow pour le restaurant
              const restaurantInfoWindow = new google.maps.InfoWindow({
                content: '<div style="padding: 8px;"><strong>🏪 Restaurant</strong><br/>Point de départ</div>'
              });
              restaurantMarker.addListener('click', () => {
                restaurantInfoWindow.open(map, restaurantMarker);
              });

              // Marqueur driver (vert avec animation)
              let driverMarker = null;
              if (${safeDriverLocation ? 'true' : 'false'}) {
                driverMarker = new google.maps.Marker({
                  position: { lat: ${safeDriverLocation ? safeDriverLocation.latitude : centerLat}, lng: ${safeDriverLocation ? safeDriverLocation.longitude : centerLng} },
                  map: map,
                  title: 'Livreur',
                  icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    scaledSize: new google.maps.Size(35, 35)
                  },
                  animation: google.maps.Animation.BOUNCE
                });

                // InfoWindow pour le driver
                const driverInfoWindow = new google.maps.InfoWindow({
                  content: '<div style="padding: 8px;"><strong>🚗 Livreur</strong><br/>En route vers vous</div>'
                });
                driverMarker.addListener('click', () => {
                  driverInfoWindow.open(map, driverMarker);
                });
              }

              // Service de directions pour un vrai trajet
              const directionsService = new google.maps.DirectionsService();
              const directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: false,
                polylineOptions: {
                  strokeColor: '#FF9800',
                  strokeOpacity: 0.8,
                  strokeWeight: 4
                }
              });
              directionsRenderer.setMap(map);

              // Calculer le trajet optimal - LOGIQUE CORRECTE COMME WAZE
              // Si on a la position du driver, le trajet va du driver vers le client
              // Sinon, le trajet va du restaurant vers le client
              let origin, destination;
              
              if (${safeDriverLocation ? 'true' : 'false'}) {
                // Driver vers client (comme Waze)
                origin = { lat: ${safeDriverLocation ? safeDriverLocation.latitude : centerLat}, lng: ${safeDriverLocation ? safeDriverLocation.longitude : centerLng} };
                destination = { lat: ${safeDestinationLocation.latitude}, lng: ${safeDestinationLocation.longitude} };
                console.log('🗺️ Trajet: Driver vers Client (comme Waze)');
              } else {
                // Restaurant vers client (fallback)
                origin = { lat: ${safePickupLocation.latitude}, lng: ${safePickupLocation.longitude} };
                destination = { lat: ${safeDestinationLocation.latitude}, lng: ${safeDestinationLocation.longitude} };
                console.log('🗺️ Trajet: Restaurant vers Client (fallback)');
              }

              const request = {
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                avoidHighways: false,
                avoidTolls: false
              };

              directionsService.route(request, function(result, status) {
                if (status === 'OK') {
                  console.log('🗺️ Trajet calculé avec succès');
                  directionsRenderer.setDirections(result);
                  
                  // Ajuster la vue pour voir tout le trajet
                  const bounds = new google.maps.LatLngBounds();
                  result.routes[0].overview_path.forEach(point => {
                    bounds.extend(point);
                  });
                  map.fitBounds(bounds);
                } else {
                  console.log('⚠️ Erreur calcul trajet:', status);
                  // Fallback: ligne droite du driver vers client (ou restaurant vers client)
                  const fallbackOrigin = ${safeDriverLocation ? 'true' : 'false'} ? 
                    { lat: ${safeDriverLocation ? safeDriverLocation.latitude : centerLat}, lng: ${safeDriverLocation ? safeDriverLocation.longitude : centerLng} } :
                    { lat: ${safePickupLocation.latitude}, lng: ${safePickupLocation.longitude} };
                    
                  const fallbackLine = new google.maps.Polyline({
                    path: [
                      fallbackOrigin,
                      { lat: ${safeDestinationLocation.latitude}, lng: ${safeDestinationLocation.longitude} }
                    ],
                    geodesic: true,
                    strokeColor: '#FF9800',
                    strokeOpacity: 0.8,
                    strokeWeight: 4
                  });
                  fallbackLine.setMap(map);
                }
              });

              // Fonction pour mettre à jour la position du driver et recalculer le trajet
              window.updateDriverPosition = function(lat, lng) {
                if (driverMarker) {
                  const newPosition = new google.maps.LatLng(lat, lng);
                  driverMarker.setPosition(newPosition);
                  
                  // Recalculer le trajet du driver vers le client (comme Waze)
                  const newRequest = {
                    origin: { lat: lat, lng: lng },
                    destination: { lat: ${safeDestinationLocation.latitude}, lng: ${safeDestinationLocation.longitude} },
                    travelMode: google.maps.TravelMode.DRIVING,
                    avoidHighways: false,
                    avoidTolls: false
                  };
                  
                  directionsService.route(newRequest, function(result, status) {
                    if (status === 'OK') {
                      console.log('🗺️ Trajet recalculé: Driver vers Client');
                      directionsRenderer.setDirections(result);
                    } else {
                      console.log('⚠️ Erreur recalcul trajet:', status);
                    }
                  });
                }
              };

              
              // Notifier React Native que la carte est prête
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapReady',
                  message: 'Carte prête pour les mises à jour'
                }));
              }
              
            } catch (error) {
              console.error('❌ Erreur Simple Map:', error);
            }
          }

          function loadGoogleMapsAPI() {
            const script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap';
            script.async = true;
            script.defer = true;
            script.onerror = function() {
              console.error('❌ Erreur chargement API');
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
  }, [driverLocation, destinationLocation, pickupLocation]);

  const handleError = (error) => {
    console.error('❌ Erreur Simple WebView:', error);
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
        onError={handleError}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
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
});

SimpleMapComponent.displayName = 'SimpleMapComponent';

export default SimpleMapComponent;