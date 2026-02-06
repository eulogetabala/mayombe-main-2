import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag, Calendar, Percent, Loader2 } from 'lucide-react'
import firebaseService from '../services/firebaseService'

const Promos = () => {
  const [promos, setPromos] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    reduction: '',
    date_debut: '',
    date_fin: '',
    statut: 'active',
    active: true,
  })

  useEffect(() => {
    // Charger les promos depuis Firebase
    const loadPromos = async () => {
      try {
        setLoading(true)
        const data = await firebaseService.getPromos()
        setPromos(data)
      } catch (error) {
        console.error('Erreur lors du chargement des promos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPromos()

    // S'abonner aux changements en temps réel
    const unsubscribe = firebaseService.subscribeToPromos((data) => {
      setPromos(data)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPromo) {
        // Mettre à jour la promo dans Firebase
        await firebaseService.updatePromo(editingPromo.id, {
          title: formData.titre,
          description: formData.description,
          discount: parseFloat(formData.reduction),
          startDate: formData.date_debut,
          endDate: formData.date_fin,
          active: formData.statut === 'active',
          statut: formData.statut,
        })
      } else {
        // Créer une nouvelle promo dans Firebase
        await firebaseService.createPromo({
          title: formData.titre,
          description: formData.description,
          discount: parseFloat(formData.reduction),
          startDate: formData.date_debut,
          endDate: formData.date_fin,
          active: formData.statut === 'active',
          statut: formData.statut,
        })
      }
      setShowModal(false)
      setEditingPromo(null)
      setFormData({
        titre: '',
        description: '',
        reduction: '',
        date_debut: '',
        date_fin: '',
        statut: 'active',
        active: true,
      })
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la promo:', error)
      alert('Erreur lors de la sauvegarde de la promo')
    }
  }

  const handleEdit = (promo) => {
    setEditingPromo(promo)
    setFormData({
      titre: promo.title || promo.titre || '',
      description: promo.description || '',
      reduction: (promo.discount || promo.reduction || 0).toString(),
      date_debut: promo.startDate || promo.date_debut || '',
      date_fin: promo.endDate || promo.date_fin || '',
      statut: promo.active === false ? 'inactive' : (promo.statut || 'active'),
      active: promo.active !== false,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette promo ?')) {
      try {
        await firebaseService.deletePromo(id)
        // La mise à jour se fera automatiquement via l'abonnement en temps réel
      } catch (error) {
        console.error('Erreur lors de la suppression de la promo:', error)
        alert('Erreur lors de la suppression de la promo')
      }
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Promos</h1>
          <p className="text-gray-600 mt-1">Créez et gérez vos promotions</p>
        </div>
        <button
          onClick={() => {
            setEditingPromo(null)
            setFormData({
              titre: '',
              description: '',
              reduction: '',
              date_debut: '',
              date_fin: '',
              statut: 'active',
              active: true,
            })
            setShowModal(true)
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Nouvelle Promo</span>
        </button>
      </div>

      {/* Promos List */}
      {promos.length === 0 ? (
        <div className="card text-center py-12">
          <Tag className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">Aucune promo trouvée</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promos.map((promo) => (
          <div key={promo.id} className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Tag className="text-primary-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{promo.title || promo.titre || 'Promo sans titre'}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    (promo.active !== false && promo.statut !== 'inactive') || promo.statut === 'active'
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {promo.active !== false && promo.statut !== 'inactive' ? 'active' : 'inactive'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{promo.description || 'Aucune description'}</p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Percent size={16} />
                <span>Réduction: {promo.discount || promo.reduction || 0}%</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>Du {promo.startDate || promo.date_debut ? new Date(promo.startDate || promo.date_debut).toLocaleDateString('fr-FR') : 'N/A'} au {promo.endDate || promo.date_fin ? new Date(promo.endDate || promo.date_fin).toLocaleDateString('fr-FR') : 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleEdit(promo)}
                className="flex-1 btn-secondary flex items-center justify-center space-x-2"
              >
                <Edit size={16} />
                <span>Modifier</span>
              </button>
              <button
                onClick={() => handleDelete(promo.id)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingPromo ? 'Modifier la Promo' : 'Nouvelle Promo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre
                </label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows="3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Réduction (%)
                </label>
                <input
                  type="number"
                  value={formData.reduction}
                  onChange={(e) => setFormData({ ...formData, reduction: e.target.value })}
                  className="input-field"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center space-x-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">
                  {editingPromo ? 'Modifier' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingPromo(null)
                  }}
                  className="flex-1 btn-secondary"
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

export default Promos
