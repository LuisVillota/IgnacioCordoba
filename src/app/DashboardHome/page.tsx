"use client"

import { Users, Calendar, RefreshCw } from "lucide-react"
import { api } from "../../lib/api"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../../hooks/useAuth"

export default function DashboardHome() {
  // Obtener todas las propiedades del hook
  const { 
    user, 
    loading, // Ahora viene del AuthContext, renombrar si es necesario
    hasPermission,
    isAuthenticated
  } = useAuth()

  const [stats, setStats] = useState({
    totalpacientes: 0,
    citasHoy: 0
  })
  const [statsLoading, setStatsLoading] = useState(true) // Renombrado para evitar conflicto
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Si loading (auth loading), mostrar loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a6b32] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del usuario...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar mensaje
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-yellow-50 rounded-lg">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Sesión no válida</h2>
          <p className="text-yellow-600">Por favor, inicia sesión nuevamente.</p>
        </div>
      </div>
    )
  }

  // OPTIMIZACIÓN: useCallback para evitar recrear función
  const fetchQuickStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      setError(null)
      
      const startTime = Date.now()
      
      // UNA SOLA llamada API optimizada
      const response = await api.getQuickCounts()
      
      const endTime = Date.now()
      console.log(`✅ Stats cargados en ${endTime - startTime}ms`)
      
      if (response?.success) {
        setStats({
          totalpacientes: response.pacientes_total || 0,
          citasHoy: response.citas_hoy || 0
        })
      } else {
        setStats({ totalpacientes: 0, citasHoy: 0 })
      }
      
    } catch (err: any) {
      console.error("❌ Error cargando stats:", err)
      setError('Error al cargar estadísticas')
      setStats({ totalpacientes: 0, citasHoy: 0 })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Cargar datos UNA SOLA VEZ al montar
  useEffect(() => {
    fetchQuickStats()
  }, [fetchQuickStats])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchQuickStats().finally(() => {
      setRefreshing(false)
    })
  }, [fetchQuickStats])

  const getNombreUsuario = () => {
    if (!user?.nombre_completo) return 'Usuario'
    return user.nombre_completo.split(' ')[0]
  }

  const statCards = [
    { 
      icon: Users, 
      label: "Total Pacientes", 
      value: stats.totalpacientes.toString(), 
      color: "bg-[#99d6e8]", 
      permission: "ver_pacientes" as const
    },
    { 
      icon: Calendar, 
      label: "Citas Hoy", 
      value: stats.citasHoy.toString(), 
      color: "bg-[#669933]", 
      permission: "ver_agenda" as const
    }
  ]

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Bienvenido, {getNombreUsuario()}
          </h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
            Panel de control - Rol: <span className="font-semibold capitalize">{user?.rol || 'N/A'}</span>
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing || statsLoading}
          className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error: {error}</p>
          <button 
            onClick={handleRefresh}
            className="mt-2 text-sm text-red-700 underline"
          >
            Intentar nuevamente
          </button>
        </div>
      )}

      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {statCards.map((stat, idx) =>
            hasPermission(stat.permission) && (
              <div
                key={idx}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} p-2 md:p-3 rounded-lg`}>
                    <stat.icon size={20} className="text-white" />
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-bold text-gray-800 flex items-center">
            <Calendar className="mr-2 text-[#669933]" size={18} />
            Citas Recientes
          </h2>
        </div>
        
        <div className="text-center py-8">
          <Calendar className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-gray-500 text-sm">Citas recientes disponibles próximamente</p>
          <p className="text-xs text-gray-400 mt-2">
            Sistema optimizado para carga rápida
          </p>
        </div>
      </div>
    </div>
  )
}