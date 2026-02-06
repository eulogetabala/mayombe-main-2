import axios from 'axios'

const API_BASE_URL = 'https://www.api-mayombe.mayombe-app.com/public/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Intercepteur pour ajouter le token d'authentification si nécessaire
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Services pour les restaurants
export const restaurantService = {
  getAll: () => api.get('/resto'),
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
