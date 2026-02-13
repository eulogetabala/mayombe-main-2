import React, { useState, useEffect } from 'react'
import { Search, Edit, Trash2, Tag, Loader2, DollarSign, Store } from 'lucide-react'
import menuService from '../services/menuService'
import firebaseService from '../services/firebaseService'

const Promos = () => {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [productPromos, setProductPromos] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [promoPrice, setPromoPrice] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedRestaurant, products])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Charger tous les produits
      const allProducts = await menuService.getAllMenus()
      setProducts(allProducts)
      // Initialiser filteredProducts avec tous les produits
      setFilteredProducts(allProducts)
      
      // Charger tous les prix promotionnels
      const promos = await firebaseService.getAllProductPromos()
      const promosMap = {}
      promos.forEach(promo => {
        promosMap[promo.productId] = promo
      })
      setProductPromos(promosMap)
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    if (!products || products.length === 0) {
      setFilteredProducts([])
      return
    }
    
    let filtered = [...products]
    
    // Filtre par recherche
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(product => {
        const libelle = product.libelle?.toLowerCase() || ''
        const restaurantName = product.restaurant_name?.toLowerCase() || ''
        const description = product.description?.toLowerCase() || ''
        
        return libelle.includes(searchLower) || 
               restaurantName.includes(searchLower) ||
               description.includes(searchLower)
      })
    }
    
    // Filtre par restaurant
    if (selectedRestaurant !== 'all') {
      filtered = filtered.filter(product => {
        const productRestaurantId = product.restaurant_id
        const selectedId = parseInt(selectedRestaurant)
        return productRestaurantId === selectedId || 
               productRestaurantId?.toString() === selectedRestaurant
      })
    }
    
    setFilteredProducts(filtered)
  }

  const handleSetPromo = (product) => {
    setEditingProduct(product)
    const existingPromo = productPromos[product.id]
    setPromoPrice(existingPromo ? existingPromo.promoPrice.toString() : '')
    setShowModal(true)
  }

  const handleSavePromo = async () => {
    if (!editingProduct || !promoPrice) return
    
    try {
      await firebaseService.setProductPromoPrice(
        editingProduct.id,
        parseFloat(promoPrice)
      )
      
      // Recharger les données
      await loadData()
      setShowModal(false)
      setEditingProduct(null)
      setPromoPrice('')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du prix promo:', error)
      alert('Erreur lors de la sauvegarde du prix promotionnel')
    }
  }

  const handleRemovePromo = async (productId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce prix promotionnel ?')) {
      return
    }
    
    try {
      await firebaseService.removeProductPromoPrice(productId)
      await loadData()
    } catch (error) {
      console.error('Erreur lors de la suppression du prix promo:', error)
      alert('Erreur lors de la suppression du prix promotionnel')
    }
  }

  // Obtenir la liste unique des restaurants
  const restaurants = [...new Set(products.map(p => ({
    id: p.restaurant_id,
    name: p.restaurant_name
  })).filter(r => r.id && r.name))]
    .filter((r, index, self) => self.findIndex(t => t.id === r.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Prix</h1>
        <p className="text-gray-600 mt-1">Gérez les prix normaux et promotionnels de vos produits</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline mr-2" size={16} />
              Rechercher un produit
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom du produit ou restaurant..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Store className="inline mr-2" size={16} />
              Filtrer par restaurant
            </label>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="input-field"
            >
              <option value="all">Tous les restaurants</option>
              {restaurants.map(restaurant => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Normal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Promo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const promo = productPromos[product.id]
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.libelle}
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{product.libelle}</div>
                            <div className="text-sm text-gray-500">{product.description?.substring(0, 50)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {product.restaurant_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-semibold text-gray-900">
                          {parseInt(product.prix).toLocaleString()} FCFA
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {promo ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-green-600">
                              {parseInt(promo.promoPrice).toLocaleString()} FCFA
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Actif
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Aucune promo</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSetPromo(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={promo ? "Modifier la promo" : "Ajouter une promo"}
                          >
                            <Edit size={18} />
                          </button>
                          {promo && (
                            <button
                              onClick={() => handleRemovePromo(product.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer la promo"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {productPromos[editingProduct.id] ? 'Modifier' : 'Ajouter'} le Prix Promo
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Produit</p>
              <p className="font-semibold text-gray-900">{editingProduct.libelle}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Prix Normal</p>
              <p className="text-lg font-bold text-gray-900">
                {parseInt(editingProduct.prix).toLocaleString()} FCFA
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix Promotionnel (FCFA)
              </label>
              <input
                type="number"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                className="input-field"
                placeholder="Ex: 1200"
                min="0"
                max={editingProduct.prix}
                required
              />
              {promoPrice && parseInt(promoPrice) < parseInt(editingProduct.prix) && (
                <p className="mt-2 text-sm text-green-600">
                  Réduction: {(((parseInt(editingProduct.prix) - parseInt(promoPrice)) / parseInt(editingProduct.prix)) * 100).toFixed(0)}%
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSavePromo}
                className="flex-1 btn-primary"
                disabled={!promoPrice || parseInt(promoPrice) >= parseInt(editingProduct.prix)}
              >
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingProduct(null)
                  setPromoPrice('')
                }}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Promos
