import React, { useState, useEffect } from 'react'
import { 
  Store, 
  Tag, 
  TrendingUp, 
  Users,
  Loader2,
  ShoppingCart,
  RefreshCw
} from 'lucide-react'
import firebaseService from '../services/firebaseService'
import restaurantService from '../services/restaurantService'

const Dashboard = () => {
  const [stats, setStats] = useState({
    restaurants: 0,
    promos: 0,
    commandes: 0,
    restaurantsChange: { value: 0, period: 'mois', label: '' },
    promosChange: { value: 0, period: 'semaine', label: '' },
    commandesChange: { value: 0, period: 'semaine', label: '' },
  })
  const [loading, setLoading] = useState(true)
  const [recentActivities, setRecentActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [ordersPeriod, setOrdersPeriod] = useState('semaine') // 'semaine' ou 'mois'

  // Fonction pour formater la date relative
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Date inconnue'
    
    const now = new Date()
    const date = new Date(timestamp)
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) {
      return 'À l\'instant'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `Il y a ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `Il y a ${hours} ${hours === 1 ? 'heure' : 'heures'}`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `Il y a ${days} ${days === 1 ? 'jour' : 'jours'}`
    } else {
      const weeks = Math.floor(diffInSeconds / 604800)
      return `Il y a ${weeks} ${weeks === 1 ? 'semaine' : 'semaines'}`
    }
  }

  // Fonction pour obtenir l'icône selon le type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'restaurant_opened':
      case 'restaurant_closed':
        return Store
      case 'promo_created':
      case 'product_promo_created':
        return Tag
      case 'order_created':
        return ShoppingCart
      default:
        return Store
    }
  }

  // Fonction pour obtenir la couleur selon le type
  const getActivityColor = (color) => {
    const colorMap = {
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500'
    }
    return colorMap[color] || 'bg-gray-500'
  }

  // Fonctions utilitaires pour les dates
  const getStartOfWeek = (date = new Date()) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lundi
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const getStartOfMonth = (date = new Date()) => {
    const d = new Date(date)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const getStartOfPreviousWeek = () => {
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    return getStartOfWeek(lastWeek)
  }

  const getStartOfPreviousMonth = () => {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    return getStartOfMonth(lastMonth)
  }

  const getEndOfPreviousWeek = () => {
    const start = getStartOfPreviousWeek()
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }

  const getEndOfPreviousMonth = () => {
    const start = getStartOfPreviousMonth()
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
    return end
  }

  const isDateInRange = (dateString, startDate, endDate) => {
    if (!dateString) return false
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return false
      return date >= startDate && date <= endDate
    } catch (error) {
      return false
    }
  }

  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0
    }
    return Math.round(((current - previous) / previous) * 100)
  }

  const formatChangeLabel = (value, period) => {
    const sign = value >= 0 ? '+' : ''
    const periodLabel = period === 'semaine' ? 'cette semaine' : 'ce mois'
    const previousPeriodLabel = period === 'semaine' ? 'semaine dernière' : 'mois dernier'
    
    if (value === 0) {
      return `Aucun changement ${periodLabel}`
    }
    
    if (Math.abs(value) < 1) {
      return `${sign}${value}% vs ${previousPeriodLabel}`
    }
    
    return `${sign}${value}% vs ${previousPeriodLabel}`
  }

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        
        const now = new Date()
        const startOfWeek = getStartOfWeek(now)
        const startOfMonth = getStartOfMonth(now)
        const startOfPreviousWeek = getStartOfPreviousWeek()
        const endOfPreviousWeek = getEndOfPreviousWeek()
        const startOfPreviousMonth = getStartOfPreviousMonth()
        const endOfPreviousMonth = getEndOfPreviousMonth()
        
        // Récupérer les restaurants depuis l'API
        const restaurants = await restaurantService.getAll()
        const activeRestaurants = restaurants.filter(r => r.statut === 'actif' || r.statut === 'ouvert')
        
        // Calculer les restaurants créés ce mois vs mois dernier
        // Note: On suppose que les restaurants ont un champ createdAt ou date
        const restaurantsThisMonth = restaurants.filter(r => {
          const createdDate = r.createdAt || r.created_at || r.date
          if (!createdDate) return false
          return isDateInRange(createdDate, startOfMonth, now)
        })
        
        const restaurantsLastMonth = restaurants.filter(r => {
          const createdDate = r.createdAt || r.created_at || r.date
          if (!createdDate) return false
          return isDateInRange(createdDate, startOfPreviousMonth, endOfPreviousMonth)
        })
        
        const restaurantsChange = calculatePercentageChange(
          restaurantsThisMonth.length,
          restaurantsLastMonth.length
        )
        
        // Récupérer les promos depuis Firebase
        const promos = await firebaseService.getPromos()
        const activePromos = promos.filter(p => p.active === true || p.statut === 'active')
        
        // Calculer les promos créées cette semaine vs semaine dernière
        const promosThisWeek = promos.filter(p => {
          const createdDate = p.createdAt || p.created_at || p.date
          if (!createdDate) return false
          return isDateInRange(createdDate, startOfWeek, now)
        })
        
        const promosLastWeek = promos.filter(p => {
          const createdDate = p.createdAt || p.created_at || p.date
          if (!createdDate) return false
          return isDateInRange(createdDate, startOfPreviousWeek, endOfPreviousWeek)
        })
        
        const promosChange = calculatePercentageChange(
          promosThisWeek.length,
          promosLastWeek.length
        )
        
        // Récupérer les commandes depuis Firebase
        const allOrders = await firebaseService.getOrders()
        
        // Filtrer selon la période sélectionnée (semaine ou mois)
        let ordersCurrentPeriod, ordersPreviousPeriod, periodLabel
        
        if (ordersPeriod === 'semaine') {
          // Filtrer les commandes de cette semaine
          ordersCurrentPeriod = allOrders.filter(order => {
            const orderDate = order.createdAt || order.created_at || order.date
            if (!orderDate) return false
            return isDateInRange(orderDate, startOfWeek, now)
          })
          
          // Filtrer les commandes de la semaine dernière
          ordersPreviousPeriod = allOrders.filter(order => {
            const orderDate = order.createdAt || order.created_at || order.date
            if (!orderDate) return false
            return isDateInRange(orderDate, startOfPreviousWeek, endOfPreviousWeek)
          })
          
          periodLabel = 'semaine'
        } else {
          // Filtrer les commandes de ce mois
          ordersCurrentPeriod = allOrders.filter(order => {
            const orderDate = order.createdAt || order.created_at || order.date
            if (!orderDate) return false
            return isDateInRange(orderDate, startOfMonth, now)
          })
          
          // Filtrer les commandes du mois dernier
          ordersPreviousPeriod = allOrders.filter(order => {
            const orderDate = order.createdAt || order.created_at || order.date
            if (!orderDate) return false
            return isDateInRange(orderDate, startOfPreviousMonth, endOfPreviousMonth)
          })
          
          periodLabel = 'mois'
        }
        
        const commandesChange = calculatePercentageChange(
          ordersCurrentPeriod.length,
          ordersPreviousPeriod.length
        )

        setStats({
          restaurants: activeRestaurants.length,
          promos: activePromos.length,
          commandes: ordersCurrentPeriod.length,
          restaurantsChange: {
            value: restaurantsChange,
            period: 'mois',
            label: formatChangeLabel(restaurantsChange, 'mois')
          },
          promosChange: {
            value: promosChange,
            period: 'semaine',
            label: formatChangeLabel(promosChange, 'semaine')
          },
          commandesChange: {
            value: commandesChange,
            period: periodLabel,
            label: formatChangeLabel(commandesChange, periodLabel)
          },
        })
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error)
      } finally {
        setLoading(false)
      }
    }

    const loadActivities = async () => {
      try {
        setActivitiesLoading(true)
        const activities = await firebaseService.getRecentActivities(5)
        setRecentActivities(activities)
      } catch (error) {
        console.error('Erreur lors du chargement des activités:', error)
      } finally {
        setActivitiesLoading(false)
      }
    }

    // Charger les données initiales
    loadStats()
    loadActivities()

    // Rafraîchir les activités toutes les 30 secondes
    const activitiesInterval = setInterval(() => {
      loadActivities()
    }, 30000)

    return () => {
      clearInterval(activitiesInterval)
    }
  }, [ordersPeriod])

  const statCards = [
    {
      title: 'Restaurants',
      value: stats.restaurants,
      icon: Store,
      color: 'bg-blue-500',
      change: stats.restaurantsChange.label || 'Chargement...',
      changeValue: stats.restaurantsChange.value,
    },
    {
      title: 'Promos Actives',
      value: stats.promos,
      icon: Tag,
      color: 'bg-green-500',
      change: stats.promosChange.label || 'Chargement...',
      changeValue: stats.promosChange.value,
    },
    {
      title: `Commandes (${ordersPeriod === 'semaine' ? 'cette semaine' : 'ce mois'})`,
      value: stats.commandes,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: stats.commandesChange.label || 'Chargement...',
      changeValue: stats.commandesChange.value,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Période commandes:</label>
          <select
            value={ordersPeriod}
            onChange={(e) => setOrdersPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="semaine">Semaine</option>
            <option value="mois">Mois</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          
          return (
            <div 
              key={index} 
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-primary-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-2 font-medium uppercase tracking-wide">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                  <p className={`text-xs font-semibold ${
                    stat.changeValue > 0 ? 'text-green-600' : 
                    stat.changeValue < 0 ? 'text-red-600' : 
                    'text-gray-500'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`${stat.color} p-5 rounded-2xl shadow-lg`}>
                  <Icon className="text-white" size={28} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/promos'}
              className="w-full bg-primary-500 text-white px-4 py-3 rounded-xl font-medium hover:bg-primary-600 transition-all duration-200 shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 flex items-center space-x-3 group"
            >
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Tag size={18} className="text-white" />
              </div>
              <span>Gérer les prix produits</span>
            </button>
            <button 
              onClick={() => window.location.href = '/restaurants'}
              className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-3 group border border-gray-200"
            >
              <div className="p-2 bg-white rounded-lg group-hover:bg-gray-50 transition-colors">
                <Store size={18} className="text-gray-700" />
              </div>
              <span>Gérer les restaurants</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Activité Récente</h2>
            <button
              onClick={async () => {
                setActivitiesLoading(true)
                const activities = await firebaseService.getRecentActivities(5)
                setRecentActivities(activities)
                setActivitiesLoading(false)
              }}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw size={18} className={activitiesLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-primary-500" size={20} />
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div 
                    key={index} 
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className={`w-3 h-3 ${getActivityColor(activity.color)} rounded-full shadow-sm group-hover:scale-125 transition-transform`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{activity.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary-50 transition-colors">
                      <Icon size={16} className="text-gray-500 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
