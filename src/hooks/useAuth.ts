"use client"

import { useContext, useEffect, useState } from "react"
import { AuthContext } from "../context/AuthContext"
import { Permission } from "../types/permissions"

export function useAuth() {
  const context = useContext(AuthContext)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!context) {
      setError("useAuth debe ser usado dentro de AuthProvider")
    }
  }, [context])

  if (!context) {
    return {
      error: "useAuth debe ser usado dentro de AuthProvider",
      user: null,
      backendUser: null,
      token: null,
      logout: () => {},
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      login: async () => false,
      loading: true,
      isAuthenticated: false
    }
  }

  // Extraer todas las propiedades del contexto
  const {
    user,
    backendUser,
    token,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    login,
    loading,
    isAuthenticated
  } = context

  return {
    user,
    backendUser,
    token,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    login,
    loading,
    isAuthenticated,
    error
  }
}