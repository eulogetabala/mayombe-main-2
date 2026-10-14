import firebaseService from './firebaseService'

/**
 * Hébergement des images du dashboard.
 *
 * Contexte : Firebase Storage est indisponible (compte de facturation en
 * suspens) et l'API Laravel n'accepte pas d'upload. Cloudinary est donc
 * utilisé en priorité : il fonctionne sans clé secrète grâce à un
 * "upload preset" non signé, et sert les images via son CDN.
 *
 * Repli : Firebase Storage, si le plan Blaze est rétabli un jour.
 */

// Ces valeurs viennent du fichier admin/.env (lues au moment du build par Vite).
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET)

const CLOUDINARY_MAX_DIMENSION = 1600
const CLOUDINARY_QUALITY = 0.85

/**
 * Redimensionne et compresse l'image côté navigateur avant l'envoi.
 * Utile sur les connexions lentes : une photo de 5 Mo devient ~300 Ko.
 * En cas de problème, on renvoie le fichier d'origine (aucun échec bloquant).
 */
const optimizeImage = (file, maxDimension = CLOUDINARY_MAX_DIMENSION) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return resolve(file)
    }

    // Les GIF animés perdraient leur animation : on les laisse intacts.
    if (file.type === 'image/gif') {
      return resolve(file)
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
        const width = Math.round(image.width * scale)
        const height = Math.round(image.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas non disponible')

        context.drawImage(image, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)
            if (!blob) return resolve(file)
            // On ne garde le résultat que s'il allège réellement le fichier.
            resolve(blob.size < file.size ? blob : file)
          },
          'image/jpeg',
          CLOUDINARY_QUALITY
        )
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
      }
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    image.src = objectUrl
  })
}

class ImageHostService {
  /**
   * Upload une image et renvoie son URL publique.
   *
   * @param {File|Blob} file      Image à envoyer
   * @param {Object} options
   * @param {string} options.folder       Dossier Cloudinary
   * @param {string} options.firebasePath Chemin de repli Firebase Storage
   */
  async upload(file, { folder = 'mayombe/restaurants', firebasePath } = {}) {
    if (!file) {
      throw new Error('Aucun fichier fourni')
    }

    const optimized = await optimizeImage(file)

    if (isCloudinaryConfigured) {
      try {
        return await this.uploadToCloudinary(optimized, folder)
      } catch (error) {
        console.warn('⚠️ Cloudinary a échoué, tentative sur Firebase Storage:', error.message)
      }
    } else {
      console.warn('⚠️ Cloudinary non configuré (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)')
    }

    if (!firebasePath) {
      throw new Error(
        "Cloudinary n'est pas configuré et aucun repli Firebase n'est disponible. " +
        "Renseignez VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET, " +
        "ou collez directement une URL d'image."
      )
    }

    return firebaseService.uploadImage(optimized, firebasePath)
  }

  async uploadToCloudinary(file, folder) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    if (folder) formData.append('folder', folder)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    )

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Cloudinary ${response.status}: ${detail.slice(0, 200)}`)
    }

    const data = await response.json()
    if (!data.secure_url) {
      throw new Error('Réponse Cloudinary sans secure_url')
    }

    return this.buildDeliveryUrl(data.secure_url)
  }

  /**
   * Demande à Cloudinary de servir l'image en WebP/AVIF compressé.
   * Les transformations sont insérées après /upload/ dans l'URL.
   */
  buildDeliveryUrl(secureUrl) {
    if (typeof secureUrl !== 'string' || !secureUrl.includes('/upload/')) {
      return secureUrl
    }
    return secureUrl.replace('/upload/', '/upload/f_auto,q_auto/')
  }
}

export default new ImageHostService()
