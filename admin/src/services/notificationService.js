import { httpsCallable } from 'firebase/functions'
import { ref, push, get, remove, onValue, set } from 'firebase/database'
import { functions, database } from '../config/firebase'

/**
 * Service pour envoyer des notifications push depuis le backoffice
 */
class NotificationService {
  /**
   * Envoyer une notification à tous les utilisateurs
   */
  async sendToAll(title, body, data = {}) {
    try {
      const sendNotificationToAll = httpsCallable(functions, 'sendNotificationToAll')
      const result = await sendNotificationToAll({
        title,
        body,
        data
      })
      return result.data
    } catch (error) {
      console.error('Erreur lors de l\'envoi de notification:', error)
      throw error
    }
  }

  /**
   * Envoyer une notification à un utilisateur spécifique
   */
  async sendToUser(userId, title, body, data = {}) {
    try {
      const sendNotificationToUser = httpsCallable(functions, 'sendNotificationToUser')
      const result = await sendNotificationToUser({
        userId,
        title,
        body,
        data
      })
      return result.data
    } catch (error) {
      console.error('Erreur lors de l\'envoi de notification:', error)
      throw error
    }
  }

  /**
   * Programmer une notification
   */
  async scheduleNotification(notificationData) {
    try {
      const scheduledRef = ref(database, 'scheduled_notifications')
      const newNotificationRef = push(scheduledRef)
      
      const scheduledNotification = {
        ...notificationData,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        id: newNotificationRef.key
      }
      
      await set(newNotificationRef, scheduledNotification)
      return { success: true, id: newNotificationRef.key }
    } catch (error) {
      console.error('Erreur lors de la programmation:', error)
      throw error
    }
  }

  /**
   * Récupérer toutes les notifications programmées
   */
  async getScheduledNotifications() {
    try {
      const scheduledRef = ref(database, 'scheduled_notifications')
      const snapshot = await get(scheduledRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        return Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => {
          const dateA = new Date(a.scheduledDate || a.createdAt)
          const dateB = new Date(b.scheduledDate || b.createdAt)
          return dateA - dateB
        })
      }
      return []
    } catch (error) {
      console.error('Erreur lors de la récupération:', error)
      return []
    }
  }

  /**
   * Supprimer une notification programmée
   */
  async deleteScheduledNotification(notificationId) {
    try {
      const notificationRef = ref(database, `scheduled_notifications/${notificationId}`)
      await remove(notificationRef)
      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      throw error
    }
  }

  /**
   * Écouter les changements des notifications programmées
   */
  subscribeToScheduledNotifications(callback) {
    const scheduledRef = ref(database, 'scheduled_notifications')
    
    return onValue(scheduledRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const notifications = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => {
          const dateA = new Date(a.scheduledDate || a.createdAt)
          const dateB = new Date(b.scheduledDate || b.createdAt)
          return dateA - dateB
        })
        callback(notifications)
      } else {
        callback([])
      }
    })
  }
}

export default new NotificationService()
