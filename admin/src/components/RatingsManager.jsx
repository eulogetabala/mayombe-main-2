import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './RatingsManager.css';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

function RatingsManager() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'products', 'restaurants'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRatings();
  }, [filter]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      
      // Récupérer les métadonnées de ratings
      const metadataRef = collection(db, 'products_metadata');
      const restaurantsMetadataRef = collection(db, 'restaurants_metadata');
      
      const [productsSnapshot, restaurantsSnapshot] = await Promise.all([
        getDocs(metadataRef),
        getDocs(restaurantsMetadataRef),
      ]);

      const ratingsList = [];

      // Traiter les produits
      if (filter === 'all' || filter === 'products') {
        productsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          ratingsList.push({
            id: docSnap.id,
            type: 'product',
            itemId: data.itemId || docSnap.id,
            averageRating: data.averageRating || 0,
            totalRatings: data.totalRatings || 0,
          });
        });
      }

      // Traiter les restaurants
      if (filter === 'all' || filter === 'restaurants') {
        restaurantsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          ratingsList.push({
            id: docSnap.id,
            type: 'restaurant',
            itemId: data.itemId || docSnap.id,
            averageRating: data.averageRating || 0,
            totalRatings: data.totalRatings || 0,
          });
        });
      }

      // Enrichir avec les noms depuis l'API
      const enrichedRatings = await Promise.all(
        ratingsList.map(async (rating) => {
          try {
            if (rating.type === 'product') {
              const response = await fetch(`${API_BASE_URL}/products-list`);
              const products = await response.json();
              const product = Array.isArray(products) 
                ? products.find(p => p.id.toString() === rating.itemId)
                : null;
              return {
                ...rating,
                name: product?.name || product?.libelle || `Produit #${rating.itemId}`,
              };
            } else {
              const response = await fetch(`${API_BASE_URL}/resto`);
              const restaurants = await response.json();
              const restaurant = Array.isArray(restaurants)
                ? restaurants.find(r => r.id.toString() === rating.itemId)
                : null;
              return {
                ...rating,
                name: restaurant?.name || restaurant?.libelle || `Restaurant #${rating.itemId}`,
              };
            }
          } catch (error) {
            return {
              ...rating,
              name: `${rating.type === 'product' ? 'Produit' : 'Restaurant'} #${rating.itemId}`,
            };
          }
        })
      );

      // Trier par note moyenne décroissante
      enrichedRatings.sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.totalRatings - a.totalRatings;
      });

      setRatings(enrichedRatings);
    } catch (error) {
      console.error('Erreur lors du chargement des ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="stars">
        {[...Array(fullStars)].map((_, i) => (
          <span key={i} className="star full">★</span>
        ))}
        {hasHalfStar && <span className="star half">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={i} className="star empty">☆</span>
        ))}
      </div>
    );
  };

  const filteredRatings = ratings.filter(rating => {
    const name = (rating.name || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search);
  });

  return (
    <div className="ratings-manager">
      <div className="manager-header">
        <h2>Gestion des Annotations</h2>
        <div className="header-controls">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tous
            </button>
            <button
              className={`filter-btn ${filter === 'products' ? 'active' : ''}`}
              onClick={() => setFilter('products')}
            >
              Produits
            </button>
            <button
              className={`filter-btn ${filter === 'restaurants' ? 'active' : ''}`}
              onClick={() => setFilter('restaurants')}
            >
              Restaurants
            </button>
          </div>
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="ratings-grid">
          {filteredRatings.length === 0 ? (
            <div className="empty-state">Aucune annotation trouvée</div>
          ) : (
            filteredRatings.map((rating) => (
              <div key={`${rating.type}-${rating.itemId}`} className="rating-card">
                <div className="rating-header">
                  <span className={`type-badge ${rating.type}`}>
                    {rating.type === 'product' ? '🍔 Produit' : '🍽️ Restaurant'}
                  </span>
                  <span className="rating-value">
                    {rating.averageRating > 0 ? rating.averageRating.toFixed(1) : '0.0'}
                  </span>
                </div>
                <h3 className="rating-name">{rating.name}</h3>
                <div className="rating-stars">
                  {renderStars(rating.averageRating)}
                </div>
                <div className="rating-stats">
                  <span className="stat-item">
                    {rating.totalRatings} {rating.totalRatings > 1 ? 'notes' : 'note'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default RatingsManager;
