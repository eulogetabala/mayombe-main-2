import React, { useState, useEffect } from 'react'
import { Search, Edit, Trash2, Loader2, Store, RefreshCw, Layers } from 'lucide-react'
import menuService from '../services/menuService'
import firebaseService from '../services/firebaseService'

const Promos = () => {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [productPromos, setProductPromos] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  /** all | catalog | restaurant — catalogue simple vs menus restos */
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedRestaurant, setSelectedRestaurant] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [promoPrice, setPromoPrice] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedRestaurant, sourceFilter, products])

  const loadData = async () => {
    try {
      setLoading(true)

      const [allProducts, promos] = await Promise.all([
        menuService.getProductsForPromosAdmin(),
        firebaseService.getAllProductPromos(),
      ])
      setProducts(allProducts)
      setFilteredProducts(allProducts)
      const promosMap = {}
      promos.forEach((promo) => {
        if (promo.productId != null) {
          promosMap[String(promo.productId)] = promo
        }
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

    if (sourceFilter === 'catalog') {
      filtered = filtered.filter((p) => p.productOrigin === 'catalog')
    } else if (sourceFilter === 'restaurant') {
      filtered = filtered.filter((p) => p.productOrigin === 'restaurant')
    }

    // Filtre par recherche
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter((product) => {
        const libelle = product.libelle?.toLowerCase() || ''
        const restaurantName = product.restaurant_name?.toLowerCase() || ''
        const description = product.description?.toLowerCase() || ''
        const subMenu = product.sub_menu_name?.toLowerCase() || ''

        return (
          libelle.includes(searchLower) ||
          restaurantName.includes(searchLower) ||
          description.includes(searchLower) ||
          subMenu.includes(searchLower)
        )
      })
    }
    
    // Filtre par restaurant (ignoré sur « Catalogue seul » : pas de rattachement resto fiable)
    if (selectedRestaurant !== 'all' && sourceFilter !== 'catalog') {
      filtered = filtered.filter((product) => {
        const productRestaurantId = product.restaurant_id
        const selectedId = parseInt(selectedRestaurant, 10)
        return (
          productRestaurantId === selectedId ||
          productRestaurantId?.toString() === selectedRestaurant
        )
      })
    }
    
    setFilteredProducts(filtered)
  }

  const handleSetPromo = (product) => {
    setEditingProduct(product)
    const existingPromo = productPromos[String(product.id)]
    setPromoPrice(existingPromo ? existingPromo.promoPrice.toString() : '')
    setShowModal(true)
  }

  const handleSavePromo = async () => {
    if (!editingProduct || !promoPrice) return
    
    try {
      const price = parseFloat(promoPrice)
      await firebaseService.setProductPromoPrice(editingProduct.id, price)
      setProductPromos((prev) => ({
        ...prev,
        [String(editingProduct.id)]: {
          productId: editingProduct.id,
          promoPrice: price,
          active: true,
        },
      }))
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
      setProductPromos((prev) => {
        const next = { ...prev }
        delete next[String(productId)]
        return next
      })
    } catch (error) {
      console.error('Erreur lors de la suppression du prix promo:', error)
      alert('Erreur lors de la suppression du prix promotionnel')
    }
  }

  // Restaurants : uniquement les lignes « menus restaurant »
  const restaurants = [
    ...new Map(
      products
        .filter(
          (p) =>
            p.productOrigin === 'restaurant' &&
            p.restaurant_id != null &&
            p.restaurant_name &&
            p.restaurant_name !== '—'
        )
        .map((p) => [p.restaurant_id, { id: p.restaurant_id, name: p.restaurant_name }])
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Prix</h1>
            <p className="text-gray-600 mt-1">Gérez les prix normaux et promotionnels de vos produits</p>
            {loading && (
              <p className="text-sm text-primary-600 mt-2 flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Chargement (catalogue + menus restaurants + promos Firebase)…
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg border border-primary-200 hover:bg-primary-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`card ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Layers className="inline mr-2" size={16} />
              Origine
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value)
                if (e.target.value === 'catalog') {
                  setSelectedRestaurant('all')
                }
              }}
              className="input-field"
              disabled={loading}
            >
              <option value="all">Tout : catalogue + menus restaurants</option>
              <option value="catalog">Catalogue général uniquement</option>
              <option value="restaurant">Menus restaurants uniquement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline mr-2" size={16} />
              Rechercher un produit
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom, description, restaurant…"
              className="input-field"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Store className="inline mr-2" size={16} />
              Restaurant (menus)
            </label>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="input-field"
              disabled={loading || sourceFilter === 'catalog'}
              title={
                sourceFilter === 'catalog'
                  ? 'Filtre restaurant désactivé pour le catalogue général'
                  : undefined
              }
            >
              <option value="all">Tous les restaurants</option>
              {restaurants.map((restaurant) => (
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
                  Type
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
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500">
                    <Loader2 className="animate-spin inline mr-2 text-primary-500" size={24} />
                    Chargement de la liste produits…
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const promo = productPromos[String(product.id)]
                  return (
                    <tr
                      key={`${product.productOrigin}-${product.id}-${product.restaurant_id ?? 'cat'}-${product.sub_menu_id ?? ''}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
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
                            <div className="text-sm text-gray-500">
                              {(product.description || '').substring(0, 50)}
                              {(product.description || '').length > 50 ? '…' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {product.productOrigin === 'catalog' ? (
                          <span className="inline-block text-xs font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                            Catalogue
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-block text-xs font-medium bg-amber-50 text-amber-900 px-2 py-1 rounded-md">
                              Menu restaurant
                            </span>
                            {product.sub_menu_name && (
                              <div className="text-xs text-gray-500">{product.sub_menu_name}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {product.productOrigin === 'catalog'
                          ? product.restaurant_name && product.restaurant_name !== '—'
                            ? product.restaurant_name
                            : '—'
                          : product.restaurant_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-semibold text-gray-900">
                          {Math.round(Number(product.prix) || 0).toLocaleString()} FCFA
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {promo ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-green-600">
                              {Math.round(Number(promo.promoPrice) || 0).toLocaleString()} FCFA
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
              {productPromos[String(editingProduct.id)] ? 'Modifier' : 'Ajouter'} le Prix Promo
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Produit</p>
              <p className="font-semibold text-gray-900">{editingProduct.libelle}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Prix Normal</p>
              <p className="text-lg font-bold text-gray-900">
                {Math.round(Number(editingProduct.prix) || 0).toLocaleString()} FCFA
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
              {promoPrice &&
                parseFloat(promoPrice) < (Number(editingProduct.prix) || 0) && (
                <p className="mt-2 text-sm text-green-600">
                  Réduction:{' '}
                  {(
                    (((Number(editingProduct.prix) || 0) - parseFloat(promoPrice)) /
                      (Number(editingProduct.prix) || 1)) *
                    100
                  ).toFixed(0)}
                  %
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSavePromo}
                className="flex-1 btn-primary"
                disabled={
                  !promoPrice ||
                  parseFloat(promoPrice) >= (Number(editingProduct.prix) || 0)
                }
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
