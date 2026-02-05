import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import './PromosManager.css';

const API_BASE_URL = "https://www.api-mayombe.mayombe-app.com/public/api";

function PromosManager() {
  const [products, setProducts] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    promoPrice: '',
    discountPercentage: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchPromos();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products-list`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
    }
  };

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const promosRef = collection(db, 'promos');
      const snapshot = await getDocs(promosRef);
      const promosList = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        promosList.push({
          id: docSnap.id,
          productId: data.productId,
          ...data,
        });
      });

      // Enrichir avec les noms de produits depuis l'API
      const enrichedPromos = await Promise.all(
        promosList.map(async (promo) => {
          try {
            const product = products.find(p => p.id.toString() === promo.productId);
            if (product) {
              return {
                ...promo,
                productName: product.name || product.libelle || 'Produit inconnu',
              };
            }
            // Si pas trouvé dans le cache, chercher dans l'API
            const response = await fetch(`${API_BASE_URL}/products-list`);
            const apiProducts = await response.json();
            const apiProduct = Array.isArray(apiProducts) 
              ? apiProducts.find(p => p.id.toString() === promo.productId)
              : null;
            return {
              ...promo,
              productName: apiProduct?.name || apiProduct?.libelle || `Produit #${promo.productId}`,
            };
          } catch (error) {
            return {
              ...promo,
              productName: `Produit #${promo.productId}`,
            };
          }
        })
      );

      setPromos(enrichedPromos);
    } catch (error) {
      console.error('Erreur lors du chargement des promos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!selectedProduct || !formData.promoPrice || !formData.startDate || !formData.endDate) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const promoRef = doc(db, 'promos', selectedProduct.id.toString());
      await setDoc(promoRef, {
        productId: selectedProduct.id.toString(),
        promoPrice: parseFloat(formData.promoPrice),
        discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : null,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      alert('Promotion créée avec succès !');
      setShowModal(false);
      setFormData({ promoPrice: '', discountPercentage: '', startDate: '', endDate: '' });
      setSelectedProduct(null);
      fetchPromos();
    } catch (error) {
      console.error('Erreur lors de la création de la promo:', error);
      alert('Erreur lors de la création de la promotion');
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'promos', promoId));
      alert('Promotion supprimée avec succès !');
      fetchPromos();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="promos-manager">
      <div className="manager-header">
        <h2>Gestion des Promotions</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nouvelle Promotion
        </button>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="promos-table-container">
          <table className="promos-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Prix Promo</th>
                <th>Réduction %</th>
                <th>Date Début</th>
                <th>Date Fin</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    Aucune promotion active
                  </td>
                </tr>
              ) : (
                promos.map((promo) => (
                  <tr key={promo.id}>
                    <td>{promo.productName}</td>
                    <td>{promo.promoPrice ? `${promo.promoPrice} FCFA` : 'N/A'}</td>
                    <td>{promo.discountPercentage ? `${promo.discountPercentage}%` : 'N/A'}</td>
                    <td>{formatDate(promo.startDate)}</td>
                    <td>{formatDate(promo.endDate)}</td>
                    <td>
                      <span className={`status-badge ${promo.isActive ? 'active' : 'inactive'}`}>
                        {promo.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeletePromo(promo.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Créer une Promotion</h3>
            
            <div className="form-group">
              <label>Sélectionner un produit</label>
              <select
                className="form-control"
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const product = products.find(p => p.id.toString() === e.target.value);
                  setSelectedProduct(product);
                }}
              >
                <option value="">Choisir un produit...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name || product.libelle} - {product.price} FCFA
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Prix Promotionnel (FCFA)</label>
              <input
                type="number"
                className="form-control"
                value={formData.promoPrice}
                onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })}
                placeholder="Ex: 5000"
              />
            </div>

            <div className="form-group">
              <label>Pourcentage de Réduction (%)</label>
              <input
                type="number"
                className="form-control"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                placeholder="Ex: 20"
                max="100"
              />
            </div>

            <div className="form-group">
              <label>Date de Début</label>
              <input
                type="date"
                className="form-control"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Date de Fin</label>
              <input
                type="date"
                className="form-control"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleCreatePromo}>
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PromosManager;
