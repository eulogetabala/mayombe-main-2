import React, { useState } from 'react'
import { Bell, Send, Users, User, Loader2, CheckCircle, XCircle } from 'lucide-react'
import notificationService from '../services/notificationService'

const Notifications = () => {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    target: 'all', // 'all' ou 'user'
    userId: '',
    data: {}
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setResult(null)
    setError(null)

    try {
      let response
      
      if (formData.target === 'all') {
        response = await notificationService.sendToAll(
          formData.title,
          formData.body,
          formData.data
        )
      } else {
        if (!formData.userId) {
          throw new Error('L\'ID utilisateur est requis pour envoyer à un utilisateur spécifique')
        }
        response = await notificationService.sendToUser(
          formData.userId,
          formData.title,
          formData.body,
          formData.data
        )
      }

      setResult(response)
      // Réinitialiser le formulaire après succès
      setFormData({
        title: '',
        body: '',
        target: 'all',
        userId: '',
        data: {}
      })
    } catch (err) {
      console.error('Erreur:', err)
      setError(err.message || 'Une erreur est survenue lors de l\'envoi de la notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications Push</h1>
          <p className="text-gray-600 mt-2">
            Envoyez des notifications push à tous les utilisateurs ou à un utilisateur spécifique
          </p>
        </div>
        <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full">
          <Bell className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de cible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destinataire
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="target"
                  value="all"
                  checked={formData.target === 'all'}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Tous les utilisateurs</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="target"
                  value="user"
                  checked={formData.target === 'user'}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Utilisateur spécifique</span>
              </label>
            </div>
          </div>

          {/* ID utilisateur (si cible = user) */}
          {formData.target === 'user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Utilisateur
              </label>
              <input
                type="text"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                placeholder="Entrez l'ID de l'utilisateur"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required={formData.target === 'user'}
              />
            </div>
          )}

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Titre de la notification"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.title.length}/100 caractères
            </p>
          </div>

          {/* Corps du message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Contenu de la notification"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.body.length}/500 caractères
            </p>
          </div>

          {/* Bouton d'envoi */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="submit"
              disabled={sending || !formData.title || !formData.body}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Envoyer la notification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Résultat */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-green-800 font-semibold">Notification envoyée avec succès !</h3>
              <div className="mt-2 text-sm text-green-700">
                {formData.target === 'all' ? (
                  <>
                    <p>Envoyée à <strong>{result.total || result.sent || 'tous'} utilisateur(s)</strong></p>
                    {result.sent && <p>Succès: {result.sent}</p>}
                    {result.failed && <p>Échecs: {result.failed}</p>}
                  </>
                ) : (
                  <p>Message ID: {result.messageId}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold">Erreur lors de l'envoi</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Informations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-semibold mb-2">💡 Informations</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Les notifications sont envoyées via Firebase Cloud Messaging (FCM)</li>
          <li>Pour envoyer à tous les utilisateurs, tous les tokens FCM enregistrés seront utilisés</li>
          <li>Pour envoyer à un utilisateur spécifique, vous devez connaître son ID utilisateur</li>
          <li>Les notifications peuvent prendre quelques secondes pour être délivrées</li>
        </ul>
      </div>
    </div>
  )
}

export default Notifications
