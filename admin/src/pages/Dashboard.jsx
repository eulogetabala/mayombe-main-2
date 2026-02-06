import React, { useState, useEffect } from 'react'
import { 
  Store, 
  Tag, 
  TrendingUp, 
  Users,
  Loader2
} from 'lucide-react'
import firebaseService from '../services/firebaseService'
import restaurantService from '../services/restaurantService'

const Dashboard = () => {
  const [stats, setStats] = useState({
    restaurants: 0,
    promos: 0,
    commandes: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        
        // Récupérer les restaurants depuis l'API
        const restaurants = await restaurantService.getAll()
        const activeRestaurants = restaurants.filter(r => r.statut === 'actif' || r.statut === 'ouvert')
        
        // Récupérer les promos depuis Firebase
        const promos = await firebaseService.getPromos()
        const activePromos = promos.filter(p => p.active === true || p.statut === 'active')
        
        // Récupérer les commandes depuis Firebase
        const orders = await firebaseService.getOrders()

        setStats({
          restaurants: activeRestaurants.length,
          promos: activePromos.length,
          commandes: orders.length,
        })
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const statCards = [
    {
      title: 'Restaurants',
      value: stats.restaurants,
      icon: Store,
      color: 'bg-blue-500',
      change: '+2 ce mois',
    },
    {
      title: 'Promos Actives',
      value: stats.promos,
      icon: Tag,
      color: 'bg-green-500',
      change: '+3 cette semaine',
    },
    {
      title: 'Commandes',
      value: stats.commandes,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+8% aujourd\'hui',
    },
  ]

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="stat-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-xs text-green-600 font-medium">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-xl shadow-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/promos'}
              className="w-full btn-primary text-left flex items-center space-x-3"
            >
              <Tag size={20} />
              <span>Gérer les prix produits</span>
            </button>
            <button 
              onClick={() => window.location.href = '/restaurants'}
              className="w-full btn-secondary text-left flex items-center space-x-3"
            >
              <Store size={20} />
              <span>Gérer les restaurants</span>
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Activité Récente</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Nouveau restaurant ajouté</p>
                <p className="text-xs text-gray-500">Il y a 2 heures</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Promo créée</p>
                <p className="text-xs text-gray-500">Il y a 5 heures</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Restaurant ouvert</p>
                <p className="text-xs text-gray-500">Il y a 1 jour</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
