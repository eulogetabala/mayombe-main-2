import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Promos from './pages/Promos'
import Restaurants from './pages/Restaurants'
import Notifications from './pages/Notifications'
import Login from './pages/Login'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Composant pour rediriger les utilisateurs connectés depuis /login
const LoginRoute = () => {
  const { currentUser } = useAuth()
  return currentUser ? <Navigate to="/" /> : <Login />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/promos" element={<Promos />} />
                    <Route path="/restaurants" element={<Restaurants />} />
                    <Route path="/notifications" element={<Notifications />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
