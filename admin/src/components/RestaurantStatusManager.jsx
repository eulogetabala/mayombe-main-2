import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, get, set } from 'firebase/database';
import './RestaurantStatusManager.css';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

function RestaurantStatusManager() {
  const [restaurants, setRestaurants] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/resto`);
      const data = await response.json();

      if (Array.isArray(data)) {
        // Filtrer uniquement Brazzaville et Pointe-Noire
        const filteredData = data.filter(restaurant => {
          const cityName = restaurant.ville?.libelle || restaurant.ville?.name || "";
          return cityName.toLowerCase().includes("brazzaville") || 
                 cityName.toLowerCase().includes("pointe-noire") ||
                 cityName.toLowerCase().includes("pointe noire");
        });

        setRestaurants(filteredData);
        
        // Récupérer les statuts depuis Firebase
        const statusesMap = {};
        for (const restaurant of filteredData) {
          try {
            const statusRef = ref(rtdb, `restaurant_status/${restaurant.id}`);
            const snapshot = await get(statusRef);
            statusesMap[restaurant.id] = snapshot.exists() 
              ? snapshot.val() 
              : { isOpen: true };
          } catch (error) {
            statusesMap[restaurant.id] = { isOpen: true };
          }
        }
        setStatuses(statusesMap);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (restaurantId) => {
    try {
      const currentStatus = statuses[restaurantId] || { isOpen: true };
      const newStatus = !currentStatus.isOpen;
      
      const statusRef = ref(rtdb, `restaurant_status/${restaurantId}`);
      await set(statusRef, {
        isOpen: newStatus,
        updatedAt: new Date().toISOString(),
      });

      setStatuses({
        ...statuses,
        [restaurantId]: { isOpen: newStatus },
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const name = (restaurant.name || restaurant.libelle || '').toLowerCase();
    const address = (restaurant.adresse || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || address.includes(search);
  });

  return (
    <div className="restaurant-status-manager">
      <div className="manager-header">
        <h2>Gestion des Statuts Restaurants</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Rechercher un restaurant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="restaurants-list">
          {filteredRestaurants.length === 0 ? (
            <div className="empty-state">Aucun restaurant trouvé</div>
          ) : (
            filteredRestaurants.map((restaurant) => {
              const status = statuses[restaurant.id] || { isOpen: true };
              return (
                <div key={restaurant.id} className="restaurant-card">
                  <div className="restaurant-info">
                    <h3>{restaurant.name || restaurant.libelle}</h3>
                    <p className="restaurant-address">
                      {restaurant.adresse || 'Adresse non disponible'}
                    </p>
                    <p className="restaurant-city">
                      {restaurant.ville?.libelle || restaurant.ville?.name || 'Ville inconnue'}
                    </p>
                  </div>
                  <div className="restaurant-actions">
                    <div className={`status-toggle ${status.isOpen ? 'open' : 'closed'}`}>
                      <span className="status-label">
                        {status.isOpen ? 'Ouvert' : 'Fermé'}
                      </span>
                      <button
                        className={`toggle-btn ${status.isOpen ? 'active' : ''}`}
                        onClick={() => toggleStatus(restaurant.id)}
                      >
                        <span className="toggle-slider"></span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default RestaurantStatusManager;
