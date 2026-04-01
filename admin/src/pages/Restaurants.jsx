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
    // Charger les restaurants depuis l'API externe et fusionner avec les images Firebase
    const loadRestaurants = async () => {
      try {
        setLoading(true)
        
        const [apiRestaurants, firebaseImages] = await Promise.all([
          restaurantService.getAll(),
          firebaseService.getAllRestaurantImages(),
        ])
        console.log('📡 Restaurants chargés depuis l\'API:', apiRestaurants.length)
        console.log('📡 [DEBUG] Premier restaurant:', apiRestaurants[0])
        console.log('🖼️ Images chargées depuis Firebase:', Object.keys(firebaseImages).length, 'restaurants')
        
        // 3. Fusionner les données : priorité aux images Firebase
        const mergedRestaurants = apiRestaurants.map(restaurant => {
          const firebaseImage = firebaseImages[restaurant.id] || firebaseImages[restaurant.id.toString()]
          
          if (firebaseImage) {
            // Si on a des images Firebase, les utiliser en priorité
            return {
              ...restaurant,
              cover: firebaseImage.cover || restaurant.cover || restaurant.cover_url,
              cover_url: firebaseImage.cover || restaurant.cover || restaurant.cover_url,
              logo: firebaseImage.logo || restaurant.logo || restaurant.logo_url,
              logo_url: firebaseImage.logo || restaurant.logo || restaurant.logo_url,
              // Garder les originaux pour les mises à jour
              cover_original: firebaseImage.cover || restaurant.cover_original,
              logo_original: firebaseImage.logo || restaurant.logo_original
            }
          }
          
          // Sinon, utiliser les images de l'API
          return restaurant
        })
        
        console.log('✅ Restaurants fusionnés avec images Firebase')
        setRestaurants(mergedRestaurants)
      } catch (error) {
        console.error('❌ Erreur lors du chargement des restaurants:', error)
        console.error('Détails:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        })
        
        // Message d'erreur plus détaillé
        let errorMessage = 'Erreur lors du chargement des restaurants\n\n'
        if (error.response) {
          errorMessage += `Status: ${error.response.status}\n`
          errorMessage += `URL: ${error.config?.url}\n`
          if (error.response.data) {
            errorMessage += `Détails: ${JSON.stringify(error.response.data)}\n`
          }
        } else if (error.request) {
          errorMessage += `Erreur réseau: Impossible de contacter le serveur\n`
          errorMessage += `Vérifiez que la fonction proxy est déployée\n`
        } else {
          errorMessage += `Erreur: ${error.message}\n`
        }
        
        alert(errorMessage)
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
      
      // Note: L'API ne supporte pas la mise à jour du statut (404)
      // On met à jour uniquement Firebase qui est la source de vérité pour le statut
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
    
    // Protection contre les doubles soumissions
    if (uploading) return
    
    setUploading(true)

    // Créer un timeout de sécurité pour débloquer l'interface quoi qu'il arrive
    const safetyTimeout = setTimeout(() => {
        if (uploading) {
            console.error("⚠️ Timeout de sécurité déclenché - Forçage de la fin de l'upload")
            setUploading(false)
            alert("L'opération prend trop de temps. Veuillez vérifier votre connexion.")
        }
    }, 30000) // 30 secondes max

    try {
      if (editingRestaurant) {
        console.log('📤 Tentative de mise à jour...')
        
        let result = null
        let firebaseCoverUrl = null
        let firebaseLogoUrl = null

        // 1. Upload vers Firebase Storage avec Timeout
        try {
          const uploadPromises = []
          
          // Fonction helper pour ajouter un timeout à une promesse
          const withTimeout = (promise, ms = 15000) => {
              return Promise.race([
                  promise,
                  new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout upload image")), ms))
              ])
          }

          if (formData.cover instanceof File) {
            console.log('☁️ Upload cover vers Firebase Storage...', {
                name: formData.cover.name,
                type: formData.cover.type,
                size: formData.cover.size
            })
            uploadPromises.push(
              withTimeout(firebaseService.uploadImage(formData.cover, `restaurants/${editingRestaurant.id}/cover_${Date.now()}`))
                .then(url => { firebaseCoverUrl = url })
            )
          }
          if (formData.logo instanceof File) {
            console.log('☁️ Upload logo vers Firebase Storage...')
            uploadPromises.push(
              withTimeout(firebaseService.uploadImage(formData.logo, `restaurants/${editingRestaurant.id}/logo_${Date.now()}`))
                .then(url => { firebaseLogoUrl = url })
            )
          }
          
          if (uploadPromises.length > 0) {
              await Promise.all(uploadPromises)
          }
        } catch (storageErr) {
          console.error('❌ Erreur Firebase Storage critique:', storageErr)
          
          // Message d'erreur plus détaillé
          let errorMessage = `L'upload des images a échoué.\n\n`
          errorMessage += `Erreur: ${storageErr.message}\n\n`
          
          // Conseils selon le type d'erreur
          if (storageErr.message.includes('plan Blaze') || storageErr.message.includes('forfait supérieur') || storageErr.message.includes('billing')) {
            errorMessage += `💡 ACTION REQUISE: Passer au plan Blaze\n\n`
            errorMessage += `1. Allez sur https://console.firebase.google.com/\n`
            errorMessage += `2. Sélectionnez votre projet mayombe-ba11b\n`
            errorMessage += `3. Cliquez sur "Paramètres du projet" (icône ⚙️)\n`
            errorMessage += `4. Allez dans "Utilisation et facturation"\n`
            errorMessage += `5. Cliquez sur "Passer au plan Blaze"\n`
            errorMessage += `6. Ajoutez une carte de crédit (requis mais gratuit dans les limites)\n\n`
            errorMessage += `📊 Quotas gratuits Blaze:\n`
            errorMessage += `   - 5 GB de stockage gratuit\n`
            errorMessage += `   - 1 GB/jour de téléchargement gratuit\n`
            errorMessage += `   - 0€ si vous restez dans ces limites\n\n`
          } else if (storageErr.message.includes('Permission') || storageErr.message.includes('unauthorized')) {
            errorMessage += `💡 Solution: Vérifiez les règles Firebase Storage.\n`
            errorMessage += `   Firebase Console > Storage > Rules > allow read, write: if true;\n\n`
          } else if (storageErr.message.includes('Timeout')) {
            errorMessage += `💡 Solution: Vérifiez votre connexion internet et réessayez.\n\n`
          } else {
            errorMessage += `💡 Vérifiez:\n`
            errorMessage += `   - Que Firebase Storage est activé (Storage > Get Started)\n`
            errorMessage += `   - Que vous êtes sur le plan Blaze (nécessaire pour Storage)\n`
            errorMessage += `   - Les règles de sécurité (Storage > Rules)\n`
            errorMessage += `   - Votre connexion internet\n\n`
          }
          
          errorMessage += `Les autres modifications (nom, adresse, etc.) seront enregistrées.`
          
          alert(errorMessage)
        }

        // 2. Mise à jour via l'API (OPTIONNEL)
        try {
          const updateVariables = {
            name: formData.name,
            libelle: formData.name,
            adresse: formData.adresse,
            phone: formData.phone,
            statut: formData.statut,
            cover: firebaseCoverUrl || editingRestaurant.cover_original,
            logo: firebaseLogoUrl || editingRestaurant.logo_original
          }

          console.log('📡 Tentative de mise à jour via l\'API (optionnel)...')
          
          const updateData = new FormData()
          Object.keys(updateVariables).forEach(key => {
            if (updateVariables[key] !== undefined && updateVariables[key] !== null) {
              updateData.append(key, updateVariables[key])
            }
          })

          // Timeout court pour l'API
          const apiPromise = restaurantService.update(editingRestaurant.id, updateData)
          // On n'attend pas indéfiniment l'API
          result = await Promise.race([
              apiPromise,
              new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 5000))
          ])
          
          if (result && result.timeout) {
              console.warn("⚠️ API timeout - continuation avec Firebase")
          } else {
              console.log('✅ Synchronisation API terminée ou échouée non-bloquante')
          }
          
        } catch (apiErr) {
          console.warn('⚠️ Erreur API ignorée:', apiErr)
        }

        // 3. Synchronisation Firebase (Database temps réel)
        try {
          console.log('📡 Synchronisation Database Firebase...')
          
          const coverToSync = firebaseCoverUrl || editingRestaurant.cover_original
          const logoToSync = firebaseLogoUrl || editingRestaurant.logo_original

          await firebaseService.syncRestaurantImages(editingRestaurant.id, coverToSync, logoToSync)
          await firebaseService.updateRestaurantStatus(editingRestaurant.id, formData.statut)
          
          // Mise à jour locale avec timestamp pour forcer le re-render
          const updateTimestamp = Date.now()
          setRestaurants(prev => prev.map(r => {
             if (r.id === editingRestaurant.id) {
               return {
                 ...r,
                 name: formData.name,
                 libelle: formData.name,
                 adresse: formData.adresse,
                 phone: formData.phone,
                 statut: formData.statut,
                 cover: coverToSync,
                 cover_url: coverToSync,
                 logo: logoToSync,
                 logo_url: logoToSync,
                 _lastUpdate: updateTimestamp // Timestamp pour forcer le re-render
               }
             }
             return r
          }))

        } catch (firebaseError) {
          console.error('❌ Erreur synchronisation Firebase:', firebaseError)
          throw new Error(`Erreur synchro Firebase: ${firebaseError.message}`)
        }
      }

      // SUCCÈS - Fermeture propre
      clearTimeout(safetyTimeout)
      setUploading(false) // IMPORTANT: Reset avant de fermer
      setShowModal(false)
      setEditingRestaurant(null)
      
      // Reset form
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
      
      // Feedback utilisateur
      setTimeout(() => alert('✅ Modifications enregistrées !'), 100)

      // Rechargement avec fusion des images Firebase
      try {
        // restaurantService.getAll() retourne déjà un tableau normalisé
        const apiRestaurants = await restaurantService.getAll()
        const firebaseImages = await firebaseService.getAllRestaurantImages()
        
        const mergedRestaurants = apiRestaurants.map(restaurant => {
          const firebaseImage = firebaseImages[restaurant.id] || firebaseImages[restaurant.id.toString()]
          
          if (firebaseImage) {
            return {
              ...restaurant,
              cover: firebaseImage.cover || restaurant.cover || restaurant.cover_url,
              cover_url: firebaseImage.cover || restaurant.cover || restaurant.cover_url,
              logo: firebaseImage.logo || restaurant.logo || restaurant.logo_url,
              logo_url: firebaseImage.logo || restaurant.logo || restaurant.logo_url,
              cover_original: firebaseImage.cover || restaurant.cover_original,
              logo_original: firebaseImage.logo || restaurant.logo_original,
              _lastUpdate: Date.now() // Force le re-render
            }
          }
          return restaurant
        })
        
        setRestaurants(mergedRestaurants)
        console.log('✅ Restaurants rechargés avec nouvelles images Firebase')
      } catch (err) {
        console.error("Erreur rechargement:", err)
        // Fallback simple si la fusion échoue
        restaurantService.getAll().then(setRestaurants).catch(e => console.log("Reload fallback error", e))
      }

    } catch (error) {
      clearTimeout(safetyTimeout)
      setUploading(false)
      console.error('Erreur finale handleSubmit:', error)
      alert(`Erreur: ${error.message}`)
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
                src={(() => {
                  const imageUrl = restaurant.cover || restaurant.cover_url || '/src/assets/images/mayombe_1.jpg'
                  // Ajouter un paramètre de cache-busting si c'est une URL Firebase
                  if (imageUrl.includes('firebasestorage.googleapis.com')) {
                    const timestamp = restaurant._lastUpdate || Date.now()
                    return `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${timestamp}`
                  }
                  return imageUrl
                })()}
                alt={restaurant.name || restaurant.libelle}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                key={`cover-${restaurant.id}-${restaurant.cover || restaurant.cover_url || ''}-${restaurant._lastUpdate || ''}`}
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
                  src={(() => {
                    const imageUrl = restaurant.logo || restaurant.logo_url || '/src/assets/images/logo_mayombe.jpg'
                    // Ajouter un paramètre de cache-busting si c'est une URL Firebase
                    if (imageUrl.includes('firebasestorage.googleapis.com')) {
                      const timestamp = restaurant._lastUpdate || Date.now()
                      return `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${timestamp}`
                    }
                    return imageUrl
                  })()}
                  alt={`${restaurant.name || restaurant.libelle} logo`}
                  className="w-full h-full object-cover"
                  key={`logo-${restaurant.id}-${restaurant.logo || restaurant.logo_url || ''}-${restaurant._lastUpdate || ''}`}
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
                  <div className="space-y-2">
                    <input
                      type="file"
                      className="input-field"
                      accept="image/*"
                      onChange={handleCoverChange}
                    />
                    <div className="text-center text-sm text-gray-500">- OU -</div>
                    <input
                      type="text"
                      placeholder="Coller une URL d'image (https://...)"
                      className="input-field"
                      value={typeof formData.cover === 'string' ? formData.cover : ''}
                      onChange={(e) => {
                          setFormData({
                              ...formData,
                              cover: e.target.value,
                              coverPreview: e.target.value
                          })
                      }}
                    />
                  </div>
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
                  <div className="space-y-2">
                    <input
                      type="file"
                      className="input-field"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                    <div className="text-center text-sm text-gray-500">- OU -</div>
                    <input
                      type="text"
                      placeholder="Coller une URL de logo (https://...)"
                      className="input-field"
                      value={typeof formData.logo === 'string' ? formData.logo : ''}
                      onChange={(e) => {
                          setFormData({
                              ...formData,
                              logo: e.target.value,
                              logoPreview: e.target.value
                          })
                      }}
                    />
                  </div>
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
                    setUploading(false) // IMPORTANT: Reset forcé
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
                  className={`flex-1 btn-secondary ${uploading ? 'opacity-50 cursor-not-allowed hover:bg-gray-100' : ''}`}
                  // On ne désactive JAMAIS le bouton annuler pour éviter que l'utilisateur soit bloqué
                  disabled={false} 
                >
                  {uploading ? 'Fermer (force)' : 'Annuler'}
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
