import axios from 'axios'

// Utiliser le proxy Firebase pour contourner CORS uniquement en production
// En développement local, utiliser l'API directement (pas de problème CORS)
const isDevelopment = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0' ||
  window.location.hostname.includes('localhost') ||
  import.meta.env.DEV === true
)
const USE_PROXY = !isDevelopment // Activer le proxy uniquement en production
const API_BASE_URL = 'https://www.api-mayombe.mayombe-app.com/public/api'
const PROXY_URL = 'https://us-central1-mayombe-ba11b.cloudfunctions.net/apiProxy'

if (typeof window !== 'undefined') {
  console.log(`🔧 [API Config] Mode: ${isDevelopment ? 'DEVELOPPEMENT' : 'PRODUCTION'}, Proxy: ${USE_PROXY ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`)
  console.log(`🔧 [API Config] Hostname: ${window.location.hostname}, URL: ${window.location.href}`)
}

const api = axios.create({
  baseURL: USE_PROXY ? PROXY_URL : API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Intercepteur pour ajouter le token d'authentification et logger les requêtes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log(`🚀 [API Request] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '')
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur pour logger les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API Response] ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    if (error.response) {
      console.error(`❌ [API Error] ${error.response.status} ${error.config?.url || error.config?.baseURL}`, error.response.data)
    } else if (error.request) {
      console.error(`❌ [API Error] Network - Aucune réponse du serveur`, {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        message: error.message
      })
      // Si c'est une erreur réseau avec le proxy, donner plus d'infos
      if (USE_PROXY && error.config?.baseURL?.includes('cloudfunctions.net')) {
        console.error('💡 Erreur avec le proxy Firebase. Vérifiez:')
        console.error('   1. Que la fonction apiProxy est déployée: firebase functions:list')
        console.error('   2. Que l\'URL du proxy est correcte:', PROXY_URL)
        console.error('   3. Les logs de la fonction: firebase functions:log --only apiProxy')
        console.error('   4. Code erreur:', error.code, 'Message:', error.message)
      }
    } else {
      console.error(`❌ [API Error] Unknown`, error.message, error)
    }
    return Promise.reject(error)
  }
)

// Services pour les restaurants
export const restaurantService = {
  getAll: () => {
    const url = USE_PROXY ? '/resto' : '/resto';
    console.log(`📡 [RestaurantService] getAll() - URL: ${url}, Proxy: ${USE_PROXY}`);
    return api.get(url);
  },
  getById: (id) => api.get(`/resto/${id}`),
  update: (id, data) => api.put(`/resto/${id}`, data),
  updateStatus: (id, status) => api.patch(`/resto/${id}/status`, { statut: status }),
  uploadCover: (id, file) => {
    const formData = new FormData()
    formData.append('cover', file)
    return api.post(`/resto/${id}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadLogo: (id, file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post(`/resto/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Services pour les promos
export const promoService = {
  getAll: () => api.get('/promos'),
  getById: (id) => api.get(`/promos/${id}`),
  create: (data) => api.post('/promos', data),
  update: (id, data) => api.put(`/promos/${id}`, data),
  delete: (id) => api.delete(`/promos/${id}`),
}

export default api
