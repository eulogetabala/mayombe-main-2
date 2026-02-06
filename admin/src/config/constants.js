// Configuration de l'application
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://www.api-mayombe.mayombe-app.com/public/api'
export const UPLOADS_BASE_URL = import.meta.env.VITE_UPLOADS_BASE_URL || 'https://www.mayombe-app.com/uploads_admin'

// Statuts des restaurants
export const RESTAURANT_STATUS = {
  ACTIF: 'actif',
  FERME: 'fermé',
}

// Statuts des promos
export const PROMO_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
}
