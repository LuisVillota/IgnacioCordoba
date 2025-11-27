"use client"

import { useState, useEffect } from "react"
import { AuthContext } from "./context/AuthContext"
import { LoginPage } from "./pages/LoginPage"
import { DashboardLayout } from "./layouts/DashboardLayout"
import { mockUsers } from "./data/mockData"
import { hasPermission } from "./types/permissions"
import type { User, AuthContextType } from "./context/AuthContext"
import type { Permission } from "./types/permissions"

function App() {
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
    const user = mockUsers.find((u) => u.email === email && u.password === password)
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
      return true
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1a6b32] border-t-[#99d6e8] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />
  }

  const authValue: AuthContextType = {
    user: currentUser,
    logout,
    hasPermission: checkPermission,
    login,
  }

  return (
    <AuthContext.Provider value={authValue}>
      <DashboardLayout />
    </AuthContext.Provider>
  )
}

export default App
