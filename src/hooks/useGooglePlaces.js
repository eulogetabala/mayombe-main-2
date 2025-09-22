import { useState, useEffect } from 'react';
import { GOOGLE_MAPS_API_KEY } from '@env';

const useGooglePlaces = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPredictions = async (input) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Clé API Google Maps:', GOOGLE_MAPS_API_KEY);
      console.log('Recherche de prédictions pour:', input);
      
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&components=country:cd&key=${GOOGLE_MAPS_API_KEY}`;
      
      console.log('URL de requête:', url);
      
      const response = await fetch(url);
      console.log('Statut de la réponse:', response.status);
      console.log('En-têtes de la réponse:', JSON.stringify(response.headers, null, 2));
      
      const responseText = await response.text();
      console.log('Réponse brute:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError);
        throw new Error('Réponse non-JSON reçue du serveur');
      }

      console.log('Données parsées:', JSON.stringify(data, null, 2));

      if (data.status === 'OK') {
        setPredictions(data.predictions);
      } else {
        setError(`Erreur: ${data.status}`);
        setPredictions([]);
      }
    } catch (err) {
      console.error('Erreur complète:', err);
      setError('Erreur lors de la récupération des suggestions');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceDetails = async (placeId) => {
    try {
      console.log('Récupération des détails pour placeId:', placeId);
      
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`;
      
      console.log('URL de requête pour les détails:', url);
      
      const response = await fetch(url);
      console.log('Statut de la réponse pour les détails:', response.status);
      
      const responseText = await response.text();
      console.log('Réponse brute pour les détails:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erreur de parsing JSON pour les détails:', parseError);
        throw new Error('Réponse non-JSON reçue du serveur pour les détails');
      }

      console.log('Données parsées pour les détails:', JSON.stringify(data, null, 2));

      if (data.status === 'OK') {
        return {
          address: data.result.formatted_address,
          location: data.result.geometry.location,
        };
      } else {
        throw new Error(`Erreur: ${data.status}`);
      }
    } catch (err) {
      console.error('Erreur complète pour les détails:', err);
      throw new Error('Erreur lors de la récupération des détails du lieu');
    }
  };

  return {
    predictions,
    loading,
    error,
    fetchPredictions,
    getPlaceDetails,
  };
};

export default useGooglePlaces; 