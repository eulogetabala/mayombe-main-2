import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  LayoutDashboard, 
  Tag, 
  Store, 
  Bell,
  Menu,
  X,
  LogOut
} from 'lucide-react'
import logo from '../assets/images/logo_mayombe.jpg'

// Fallback si l'image n'est pas trouvée
const logoPath = logo || '/src/assets/images/logo_mayombe.jpg'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const location = useLocation()
  const { logout, currentUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      const result = await logout()
      if (result.success) {
        navigate('/login')
      }
    }
  }

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/promos', icon: Tag, label: 'Promos' },
    { path: '/restaurants', icon: Store, label: 'Restaurants' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-primary-500 border-r border-primary-600 w-64 lg:translate-x-0 shadow-2xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-primary-600 bg-primary-600">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-lg ring-2 ring-white/30">
                <img 
                  src={logoPath} 
                  alt="Mayombe Logo" 
                  className="w-full h-full rounded-lg object-cover"
                  onError={(e) => {
                    e.target.src = '/src/assets/images/LOGO_MAYOMBE_Mono.png'
                  }}
                />
              </div>
              <span className="text-xl font-bold text-white drop-shadow-md">Mayombe</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-white text-primary-600 shadow-xl shadow-white/30 font-semibold transform scale-[1.02]'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={20} className={active ? 'text-primary-600' : 'text-white/80'} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User info and Logout */}
          <div className="p-4 border-t border-primary-600 bg-primary-600 space-y-2">
            <div className="px-4 py-3 rounded-lg bg-white/10 border border-white/20">
              <p className="text-xs text-white/70 mb-1">Connecté en tant que</p>
              <p className="text-sm font-medium text-white truncate drop-shadow-sm">{currentUser?.email || 'Admin'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-white/90 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/20 transition-all duration-200"
            >
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-4 ml-auto">
              <div className="text-sm font-medium text-primary-600">
                Admin Dashboard
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
