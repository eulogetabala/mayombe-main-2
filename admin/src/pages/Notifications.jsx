import React, { useState, useEffect } from 'react'
import {
  Bell,
  Send,
  Users,
  User,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Trash2,
} from 'lucide-react'
import notificationService from '../services/notificationService'

const CRON_CHECK_URL =
  'https://us-central1-mayombe-ba11b.cloudfunctions.net/checkScheduledNotifications'

function combineLocalDateTimeToIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const parts = timeStr.split(':')
  const hh = Number(parts[0])
  const mm = Number(parts[1] ?? 0)
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0)
  return dt.toISOString()
}

/** Prochaine occurrence de l’heure locale (aujourd’hui ou demain si l’heure est déjà passée). */
function nextDailyOccurrenceIsoFromLocalTime(timeStr) {
  if (!timeStr) return null
  const parts = timeStr.split(':')
  const hh = Number(parts[0])
  const mm = Number(parts[1] ?? 0)
  const now = new Date()
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0)
  const TOLERANCE_MS = 60 * 1000
  if (d.getTime() < now.getTime() - TOLERANCE_MS) {
    d = new Date(d.getTime() + 86400000)
  }
  return d.toISOString()
}

function formatPreviewLocal(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return ''
  }
}

const Notifications = () => {
  const [mode, setMode] = useState('immediate')

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    target: 'all',
    userId: '',
    data: {},
  })

  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    body: '',
    target: 'all',
    userId: '',
    scheduleDate: '',
    scheduleTime: '',
    repeat: 'once',
    /** 'calendar' = date + heure + répétition ; 'every_day' = même heure tous les jours (sans choisir le jour) */
    schedulePattern: 'calendar',
  })

  const [sending, setSending] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [result, setResult] = useState(null)
  const [lastSuccess, setLastSuccess] = useState(null)
  const [scheduleResult, setScheduleResult] = useState(null)
  const [error, setError] = useState(null)
  const [scheduleError, setScheduleError] = useState(null)
  const [scheduledList, setScheduledList] = useState([])
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const unsub = notificationService.subscribeToScheduledNotifications(setScheduledList)
    return () => unsub()
  }, [])

  useEffect(() => {
    if (mode === 'immediate') {
      setScheduleResult(null)
      setScheduleError(null)
    } else {
      setResult(null)
      setError(null)
      setLastSuccess(null)
    }
  }, [mode])

  const handleSubmitImmediate = async (e) => {
    e.preventDefault()
    setSending(true)
    setResult(null)
    setLastSuccess(null)
    setError(null)

    const target = formData.target

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
          throw new Error("L'ID utilisateur est requis pour envoyer à un utilisateur spécifique")
        }
        response = await notificationService.sendToUser(
          formData.userId,
          formData.title,
          formData.body,
          formData.data
        )
      }

      setResult(response)
      setLastSuccess({ target, response })
      setFormData({
        title: '',
        body: '',
        target: 'all',
        userId: '',
        data: {},
      })
    } catch (err) {
      console.error('Erreur:', err)
      setError(err.message || "Une erreur est survenue lors de l'envoi de la notification")
    } finally {
      setSending(false)
    }
  }

  const handleSubmitSchedule = async (e) => {
    e.preventDefault()
    setScheduling(true)
    setScheduleResult(null)
    setScheduleError(null)

    try {
      let iso
      let repeat

      if (scheduleForm.schedulePattern === 'every_day') {
        iso = nextDailyOccurrenceIsoFromLocalTime(scheduleForm.scheduleTime)
        if (!iso) {
          throw new Error("Veuillez choisir l'heure d'envoi quotidien.")
        }
        repeat = 'daily'
      } else {
        iso = combineLocalDateTimeToIso(scheduleForm.scheduleDate, scheduleForm.scheduleTime)
        if (!iso) {
          throw new Error('Veuillez choisir une date et une heure.')
        }
        const when = new Date(iso)
        if (when.getTime() < Date.now() - 60 * 1000) {
          throw new Error("La date et l'heure doivent être dans le futur (tolérance 1 min).")
        }
        repeat = scheduleForm.repeat
      }

      if (scheduleForm.target === 'user' && !scheduleForm.userId.trim()) {
        throw new Error("L'ID utilisateur est requis.")
      }

      const payload = {
        title: scheduleForm.title.trim(),
        body: scheduleForm.body.trim(),
        target: scheduleForm.target,
        scheduledDate: iso,
        repeat,
        data: { type: 'scheduled_campaign' },
      }
      if (scheduleForm.target === 'user') {
        payload.userId = scheduleForm.userId.trim()
      }

      await notificationService.scheduleNotification(payload)
      setScheduleResult({ id: 'ok' })
      setScheduleForm({
        title: '',
        body: '',
        target: 'all',
        userId: '',
        scheduleDate: '',
        scheduleTime: '',
        repeat: 'once',
        schedulePattern: 'calendar',
      })
    } catch (err) {
      console.error('Erreur programmation:', err)
      setScheduleError(err.message || 'Impossible de programmer la notification.')
    } finally {
      setScheduling(false)
    }
  }

  const handleDeleteScheduled = async (id) => {
    if (!id || !window.confirm('Supprimer cette notification programmée ?')) return
    setDeletingId(id)
    try {
      await notificationService.deleteScheduledNotification(id)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Suppression impossible.')
    } finally {
      setDeletingId(null)
    }
  }

  const upcomingScheduled = scheduledList.filter((n) => n.status === 'scheduled')

  const formatScheduledWhen = (n) => {
    try {
      const d = new Date(n.scheduledDate || n.createdAt)
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return n.scheduledDate || '—'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications Push</h1>
          <p className="text-gray-600 mt-2">
            Envoi immédiat ou programmé (FCM, tokens enregistrés en base)
          </p>
        </div>
        <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full">
          <Bell className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setMode('immediate')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            mode === 'immediate'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Envoi immédiat
        </button>
        <button
          type="button"
          onClick={() => setMode('schedule')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            mode === 'schedule'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Programmer
        </button>
      </div>

      {mode === 'immediate' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmitImmediate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destinataire</label>
              <div className="flex flex-wrap gap-4">
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

            {formData.target === 'user' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Utilisateur
                </label>
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="ID utilisateur"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required={formData.target === 'user'}
                />
              </div>
            )}

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
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 caractères</p>
            </div>

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
              <p className="text-xs text-gray-500 mt-1">{formData.body.length}/500 caractères</p>
            </div>

            <div className="flex justify-end">
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
      )}

      {mode === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-semibold mb-1">Heure affichée</p>
            <p>
              La date et l’heure ci-dessous sont celles du{' '}
              <strong>navigateur de cet ordinateur</strong> (heure locale). Les notifications
              programmées ne partent que si un cron appelle l’URL ci-dessous{' '}
              <strong>au moins une fois par minute</strong> :{' '}
              <code className="text-xs break-all bg-amber-100 px-1 rounded">{CRON_CHECK_URL}</code>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmitSchedule} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destinataire</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="starget"
                      value="all"
                      checked={scheduleForm.target === 'all'}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, target: e.target.value })
                      }
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <Users className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Tous les utilisateurs</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="starget"
                      value="user"
                      checked={scheduleForm.target === 'user'}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, target: e.target.value })
                      }
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Utilisateur spécifique</span>
                  </label>
                </div>
              </div>

              {scheduleForm.target === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID Utilisateur
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.userId}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, userId: e.target.value })
                    }
                    placeholder="ID utilisateur"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required={scheduleForm.target === 'user'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={scheduleForm.body}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, body: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de planification
                </label>
                <div className="flex flex-col gap-3">
                  <label
                    className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 ${
                      scheduleForm.schedulePattern === 'calendar'
                        ? 'border-primary-500 bg-primary-50/50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="schedulePattern"
                      checked={scheduleForm.schedulePattern === 'calendar'}
                      onChange={() =>
                        setScheduleForm({ ...scheduleForm, schedulePattern: 'calendar' })
                      }
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <span>
                      <span className="font-medium text-gray-900">Date et heure précises</span>
                      <span className="block text-sm text-gray-600">
                        Choisir un jour dans le calendrier, l’heure, puis une répétition (une fois,
                        quotidien ou hebdomadaire).
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 ${
                      scheduleForm.schedulePattern === 'every_day'
                        ? 'border-primary-500 bg-primary-50/50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="schedulePattern"
                      checked={scheduleForm.schedulePattern === 'every_day'}
                      onChange={() =>
                        setScheduleForm({ ...scheduleForm, schedulePattern: 'every_day' })
                      }
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <span>
                      <span className="font-medium text-gray-900">
                        Chaque jour à la même heure
                      </span>
                      <span className="block text-sm text-gray-600">
                        Pas de date à choisir : premier envoi au prochain passage de cette heure
                        (aujourd’hui ou demain), puis <strong>tous les jours</strong> à la même heure.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {scheduleForm.schedulePattern === 'calendar' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Jour
                    </label>
                    <input
                      type="date"
                      value={scheduleForm.scheduleDate}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, scheduleDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required={scheduleForm.schedulePattern === 'calendar'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Heure
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.scheduleTime}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, scheduleTime: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
              )}

              {scheduleForm.schedulePattern === 'every_day' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Heure d’envoi (chaque jour)
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.scheduleTime}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, scheduleTime: e.target.value })
                    }
                    className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required={scheduleForm.schedulePattern === 'every_day'}
                  />
                  {scheduleForm.scheduleTime && (
                    <p className="text-sm text-gray-600 mt-2">
                      Premier envoi prévu (heure locale du navigateur) :{' '}
                      <strong>
                        {formatPreviewLocal(
                          nextDailyOccurrenceIsoFromLocalTime(scheduleForm.scheduleTime)
                        )}
                      </strong>
                      , puis chaque jour à la même heure.
                    </p>
                  )}
                </div>
              )}

              {scheduleForm.schedulePattern === 'calendar' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Répétition</label>
                  <select
                    value={scheduleForm.repeat}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, repeat: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="once">Une fois</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    scheduling ||
                    !scheduleForm.title.trim() ||
                    !scheduleForm.body.trim() ||
                    !scheduleForm.scheduleTime ||
                    (scheduleForm.schedulePattern === 'calendar' && !scheduleForm.scheduleDate)
                  }
                  className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {scheduling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      <span>Programmer l’envoi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notifications programmées ({upcomingScheduled.length})
            </h2>
            {upcomingScheduled.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucune notification en attente.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingScheduled.map((n) => (
                  <li
                    key={n.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{n.title}</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatScheduledWhen(n)} ·{' '}
                        {n.target === 'all' ? 'Tous' : `User ${n.userId || '—'}`} ·{' '}
                        {n.repeat === 'daily'
                          ? 'Quotidien'
                          : n.repeat === 'weekly'
                            ? 'Hebdomadaire'
                            : 'Une fois'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteScheduled(n.id)}
                      disabled={deletingId === n.id}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === n.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {result && lastSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-green-800 font-semibold">Notification envoyée avec succès !</h3>
              <div className="mt-2 text-sm text-green-700">
                {lastSuccess.response?.successCount != null ||
                lastSuccess.response?.total != null ? (
                  <p>
                    Succès FCM :{' '}
                    <strong>{lastSuccess.response?.successCount ?? '—'}</strong>
                    {lastSuccess.response?.failureCount != null && (
                      <> · Échecs : {lastSuccess.response.failureCount}</>
                    )}
                    {lastSuccess.response?.total != null && (
                      <> · Total tokens : {lastSuccess.response.total}</>
                    )}
                  </p>
                ) : (
                  <p>
                    {lastSuccess.response?.success
                      ? 'Message envoyé.'
                      : lastSuccess.response?.message || 'Réponse reçue.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {scheduleResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle className="w-6 h-6 text-green-600 inline mr-2" />
          <span className="text-green-800 font-medium">
            Notification enregistrée. Elle sera envoyée à l’heure prévue si le cron est actif.
          </span>
        </div>
      )}

      {scheduleError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <XCircle className="w-6 h-6 text-red-600 inline mr-2" />
          <span className="text-red-800">{scheduleError}</span>
        </div>
      )}

      {mode === 'immediate' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-semibold mb-2">Informations</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Envoi via Firebase Cloud Messaging (FCM)</li>
            <li>
              « Tous les utilisateurs » utilise les tokens enregistrés sous{' '}
              <code className="text-xs">fcm_tokens</code> (y compris anonymes)
            </li>
            <li>
              Pour les envois <strong>programmés</strong>, configurez un cron (ex. cron-job.org) sur{' '}
              <code className="text-xs break-all">{CRON_CHECK_URL}</code> — toutes les minutes.
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default Notifications
