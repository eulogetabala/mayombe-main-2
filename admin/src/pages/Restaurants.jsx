import React, { useState, useEffect } from 'react'
import { 
  Store, 
  Edit, 
  Power, 
  PowerOff, 
  Upload, 
  X,
  Image as ImageIcon,
  Camera,
  Loader2
} from 'lucide-react'
import restaurantService from '../services/restaurantService'
import firebaseService from '../services/firebaseService'

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    adresse: '',
    phone: '',
    statut: 'actif',
    cover: null,
    logo: null,
    coverPreview: null,
    logoPreview: null,
  })

  useEffect(() => {
    // Charger les restaurants depuis l'API externe
    const loadRestaurants = async () => {
      try {
        setLoading(true)
        const data = await restaurantService.getAll()
        setRestaurants(data)
      } catch (error) {
        console.error('Erreur lors du chargement des restaurants:', error)
        alert('Erreur lors du chargement des restaurants')
      } finally {
        setLoading(false)
      }
    }

    loadRestaurants()
  }, [])

  const handleToggleStatus = async (restaurant) => {
    try {
      const newStatus = restaurant.statut === 'actif' || restaurant.statut === 'ouvert' ? 'fermé' : 'actif'
      const isOpen = newStatus === 'actif' || newStatus === 'ouvert'
      
      console.log(`Changement de statut du restaurant ${restaurant.id} vers "${newStatus}" (isOpen: ${isOpen})`)
      
      // Mettre à jour dans l'API REST
      await restaurantService.updateStatus(restaurant.id, newStatus)
      
      // Mettre à jour dans Firebase via le service
      await firebaseService.updateRestaurantStatus(restaurant.id, newStatus)
      
      console.log(`✅ Statut mis à jour dans Firebase pour ${restaurant.id}`)
      
      // Mettre à jour localement pour un feedback immédiat
      setRestaurants(restaurants.map(r => 
        r.id === restaurant.id ? { ...r, statut: newStatus } : r
      ))
      
      alert(`Restaurant ${newStatus === 'actif' ? 'ouvert' : 'fermé'} avec succès!`)
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error)
      alert(`Erreur: ${error.message || 'Impossible de changer le statut du restaurant'}`)
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        cover: file,
        coverPreview: URL.createObjectURL(file),
      })
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        logo: file,
        logoPreview: URL.createObjectURL(file),
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)

    try {
      if (editingRestaurant) {
        console.log('📤 Tentative de mise à jour...')
        
        let result = null
        let apiError = null
        let firebaseCoverUrl = null
        let firebaseLogoUrl = null

        // 1. Upload vers Firebase Storage en parallèle (Si de nouveaux fichiers sont sélectionnés)
        try {
          const uploadPromises = []
          if (formData.cover instanceof File) {
            console.log('☁️ Upload cover vers Firebase Storage...')
            uploadPromises.push(
              firebaseService.uploadImage(formData.cover, `restaurants/${editingRestaurant.id}/cover_${Date.now()}`)
                .then(url => { firebaseCoverUrl = url })
            )
          }
          if (formData.logo instanceof File) {
            console.log('☁️ Upload logo vers Firebase Storage...')
            uploadPromises.push(
              firebaseService.uploadImage(formData.logo, `restaurants/${editingRestaurant.id}/logo_${Date.now()}`)
                .then(url => { firebaseLogoUrl = url })
            )
          }
          await Promise.all(uploadPromises)
        } catch (storageErr) {
          console.error('❌ Erreur Firebase Storage:', storageErr)
          // On continue, peut-être que l'API fonctionnera ou on utilisera les anciennes images
        }

        // 2. Tentative de mise à jour via l'API (Multipart si possible, sinon JSON)
        try {
          const updateData = new FormData()
          updateData.append('name', formData.name)
          updateData.append('libelle', formData.name)
          updateData.append('adresse', formData.adresse)
          updateData.append('phone', formData.phone)
          updateData.append('statut', formData.statut)
          
          if (formData.cover) updateData.append('cover', formData.cover)
          if (formData.logo) updateData.append('logo', formData.logo)

          console.log('📡 Envoi Multipart à l\'API...')
          result = await restaurantService.update(editingRestaurant.id, updateData)
          console.log('✅ API Multipart réussie')
        } catch (err) {
          console.warn('⚠️ Échec Multipart API. Tentative JSON uniquement...', err)
          apiError = err
          try {
            result = await restaurantService.update(editingRestaurant.id, {
              name: formData.name,
              libelle: formData.name,
              adresse: formData.adresse,
              phone: formData.phone,
              statut: formData.statut
            })
            console.log('✅ API JSON réussie')
          } catch (jsonErr) {
            console.error('❌ Échec total API:', jsonErr)
          }
        }

        // 3. Synchronisation Firebase (Database temps réel)
        try {
          console.log('📡 Synchronisation Database Firebase...')
          
          // La source de vérité pour les images est maintenant : 
          // URL Firebase > Réponse API > Image existante
          const coverToSync = firebaseCoverUrl || result?.cover || result?.data?.cover || editingRestaurant.cover_original
          const logoToSync = firebaseLogoUrl || result?.logo || result?.data?.logo || editingRestaurant.logo_original

          await firebaseService.syncRestaurantImages(editingRestaurant.id, coverToSync, logoToSync)
          await firebaseService.updateRestaurantStatus(editingRestaurant.id, formData.statut)
          
          console.log('✅ Synchronisation Firebase terminée')
        } catch (firebaseError) {
          console.error('❌ Erreur synchronisation Firebase:', firebaseError)
        }

        const updatedRestaurants = await restaurantService.getAll()
        setRestaurants(updatedRestaurants)
      }

      setShowModal(false)
      setEditingRestaurant(null)
      setFormData({
        name: '',
        adresse: '',
        phone: '',
        statut: 'actif',
        cover: null,
        logo: null,
        coverPreview: null,
        logoPreview: null,
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
      alert(`Erreur: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (restaurant) => {
    // Stocker les chemins originaux pour le fallback
    setEditingRestaurant({
      ...restaurant,
      cover_original: restaurant.cover || restaurant.cover_url,
      logo_original: restaurant.logo || restaurant.logo_url
    })
    
    setFormData({
      name: restaurant.name || restaurant.libelle || '',
      adresse: restaurant.adresse || restaurant.address || '',
      phone: restaurant.phone || restaurant.telephone || '',
      statut: restaurant.statut || 'actif',
      cover: null,
      logo: null,
      coverPreview: restaurant.cover || restaurant.cover_url || null,
      logoPreview: restaurant.logo || restaurant.logo_url || null,
    })
    setShowModal(true)
  }

  const removeCover = () => {
    setFormData({
      ...formData,
      cover: null,
      coverPreview: null,
    })
  }

  const removeLogo = () => {
    setFormData({
      ...formData,
      logo: null,
      logoPreview: null,
    })
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Restaurants</h1>
        <p className="text-gray-600 mt-1">Gérez vos restaurants, horaires et images</p>
      </div>

      {/* Restaurants List */}
      {restaurants.length === 0 ? (
        <div className="card text-center py-12">
          <Store className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">Aucun restaurant trouvé</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {restaurants.map((restaurant) => (
          <div key={restaurant.id} className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            {/* Cover Image */}
            <div className="relative h-48 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 shadow-inner">
              <img 
                src={restaurant.cover || restaurant.cover_url || '/src/assets/images/mayombe_1.jpg'} 
                alt={restaurant.name || restaurant.libelle}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  // Si l'image ne charge pas, utiliser une image par défaut
                  if (!e.target.src.includes('mayombe_1.jpg')) {
                    e.target.src = '/src/assets/images/mayombe_1.jpg'
                  }
                }}
              />
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  restaurant.statut === 'actif' || restaurant.statut === 'ouvert' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {restaurant.statut === 'actif' || restaurant.statut === 'ouvert' ? 'Ouvert' : 'Fermé'}
                </span>
              </div>
            </div>

            {/* Logo */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center">
                <img 
                  src={restaurant.logo || restaurant.logo_url || '/src/assets/images/logo_mayombe.jpg'} 
                  alt={`${restaurant.name || restaurant.libelle} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Si le logo ne charge pas, utiliser le logo par défaut
                    if (!e.target.src.includes('logo_mayombe.jpg')) {
                      e.target.src = '/src/assets/images/logo_mayombe.jpg'
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{restaurant.name || restaurant.libelle || 'Restaurant sans nom'}</h3>
                <p className="text-sm text-gray-600">{restaurant.adresse || restaurant.address || 'Adresse non disponible'}</p>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Store size={16} />
                <span>{restaurant.adresse || restaurant.address || 'Adresse non disponible'}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>📞</span>
                <span>{restaurant.phone || restaurant.telephone || 'Téléphone non disponible'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleToggleStatus(restaurant)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                  restaurant.statut === 'actif' || restaurant.statut === 'ouvert'
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {restaurant.statut === 'actif' || restaurant.statut === 'ouvert' ? (
                  <>
                    <PowerOff size={16} />
                    <span>Fermer</span>
                  </>
                ) : (
                  <>
                    <Power size={16} />
                    <span>Ouvrir</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleEdit(restaurant)}
                className="flex-1 btn-primary flex items-center justify-center space-x-2"
              >
                <Edit size={16} />
                <span>Modifier</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Modifier le Restaurant
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations de base */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Informations</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du restaurant
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                    className="input-field"
                  >
                    <option value="actif">Ouvert</option>
                    <option value="fermé">Fermé</option>
                  </select>
                </div>
              </div>

              {/* Photo de couverture */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Photo de couverture</h3>
                {formData.coverPreview ? (
                  <div className="relative">
                    <img 
                      src={formData.coverPreview} 
                      alt="Cover preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeCover}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleCoverChange}
                    />
                  </label>
                )}
                {!formData.coverPreview && (
                  <input
                    type="file"
                    className="input-field"
                    accept="image/*"
                    onChange={handleCoverChange}
                  />
                )}
              </div>

              {/* Logo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Logo du restaurant</h3>
                {formData.logoPreview ? (
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img 
                        src={formData.logoPreview} 
                        alt="Logo preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Logo actuel</p>
                      <button
                        type="button"
                        onClick={() => document.getElementById('logo-input').click()}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        Changer le logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Camera className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Cliquez pour uploader</span> le logo
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG (MAX. 2MB)</p>
                    </div>
                    <input
                      id="logo-input"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                  </label>
                )}
                {!formData.logoPreview && (
                  <input
                    type="file"
                    className="input-field"
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <button 
                  type="submit" 
                  className="flex-1 btn-primary"
                  disabled={uploading}
                >
                  {uploading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingRestaurant(null)
                    setFormData({
                      name: '',
                      adresse: '',
                      phone: '',
                      statut: 'actif',
                      cover: null,
                      logo: null,
                      coverPreview: null,
                      logoPreview: null,
                    })
                  }}
                  className="flex-1 btn-secondary"
                  disabled={uploading}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Restaurants
