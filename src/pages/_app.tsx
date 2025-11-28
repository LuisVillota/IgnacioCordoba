// src/pages/_app.tsx
import '../globals.css'
import { useState, useEffect } from "react"
import { AuthContext } from "../context/AuthContext"
import { mockUsers } from "../data/mockData"
import { hasPermission } from "../types/permissions"
import type { User, AuthContextType } from "../context/AuthContext"
import type { Permission } from "../types/permissions"
import type { AppProps } from 'next/app'

// Componente de carga
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1a6b32] border-t-[#99d6e8] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  )
}

// Hook personalizado para la autenticación
function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar sesión al iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser))
        setIsAuthenticated(true)
      } catch (e) {
        localStorage.removeItem("currentUser")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    console.log('🔐 [App] Intentando login con:', { email, password })
    
    const user = mockUsers.find((u) => u.email === email && u.password === password)
    console.log('📋 [App] Usuario encontrado:', user)
    
    if (user) {
      const userData: User = {
        id: user.id,
        nombre_completo: user.nombre_completo,
        email: user.email,
        rol: user.rol as User["rol"],
        estado: user.estado as User["estado"],
      }
      setCurrentUser(userData)
      setIsAuthenticated(true)
      localStorage.setItem("currentUser", JSON.stringify(userData))
      console.log('✅ [App] Login exitoso')
      return true
    }
    
    console.log('❌ [App] Login fallido')
    return false
  }

  const logout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("currentUser")
  }

  const checkPermission = (permission: Permission): boolean => {
    if (!currentUser) return false
    return hasPermission(currentUser.rol, permission)
  }

  return {
    isAuthenticated,
    currentUser,
    isLoading,
    login,
    logout,
    checkPermission
  }
}

export default function App({ Component, pageProps }: AppProps) {
  const [isClient, setIsClient] = useState(false)
  const auth = useAuth()

  // Evitar hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Mostrar loading hasta que esté listo en el cliente
  if (!isClient || auth.isLoading) {
    return <LoadingScreen />
  }

  const authValue: AuthContextType = {
    user: auth.currentUser,
    logout: auth.logout,
    hasPermission: auth.checkPermission,
    login: auth.login,
  }

  return (
    <AuthContext.Provider value={authValue}>
      <Component {...pageProps} />
    </AuthContext.Provider>
  )
}