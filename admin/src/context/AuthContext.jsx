import React, { createContext, useContext, useState, useEffect } from 'react'
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { auth } from '../config/firebase'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return { success: true, user: userCredential.user }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      let errorMessage = 'Erreur de connexion'
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte trouvé avec cet email'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mot de passe incorrect'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email invalide'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard'
      }
      
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      return { success: true }
    } catch (error) {
      console.error('Erreur de déconnexion:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    currentUser,
    login,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
