"use client"

import { Users, Calendar, RefreshCw } from "lucide-react"
import type { User } from "../context/AuthContext"
import type { Permission } from "../types/permissions"
import { api, transformBackendToFrontend } from "../lib/api"
import { useState, useEffect } from "react"

interface DashboardHomeProps {
  user: User
  hasPermission: (permission: Permission) => boolean
}

interface DashboardStats {
  totalPacientes: number
  citasHoy: number
}

export function DashboardHome({ user, hasPermission }: DashboardHomeProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalPacientes: 0,
    citasHoy: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [citasRecientes, setCitasRecientes] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      if (!refreshing) setLoading(true)
      setError(null)
      
      // Obtener total de pacientes usando la API existente
      const pacientesResponse = await api.getPacientes(10000)
      const totalPacientes = pacientesResponse.pacientes?.length || 0
      
      // Intentar obtener citas de hoy
      let citasHoy = 0
      let citasData: any[] = []
      
      try {
        // Obtener todas las citas
        const citasResponse = await api.getCitas(1000)
        
        // Verificar el formato de la respuesta
        console.log("📊 Respuesta de citas:", citasResponse)
        
        // Determinar si la respuesta es un array o tiene una propiedad
        if (Array.isArray(citasResponse)) {
          citasData = citasResponse
        } else if (citasResponse && typeof citasResponse === 'object') {
          // Si es objeto, buscar propiedades que puedan contener el array
          const possibleKeys = ['citas', 'data', 'items', 'appointments']
          for (const key of possibleKeys) {
            if (Array.isArray(citasResponse[key])) {
              citasData = citasResponse[key]
              break
            }
          }
        }
        
        console.log(`📊 Total de citas obtenidas: ${citasData.length}`)
        
        if (citasData.length > 0) {
          // Transformar citas al formato del frontend si es necesario
          const citasTransformadas = citasData.map((cita: any) => 
            transformBackendToFrontend.cita(cita)
          )
          
          // Filtrar citas de hoy
          const today = new Date()
          const todayStr = today.toISOString().split('T')[0]
          
          citasHoy = citasTransformadas.filter((cita: any) => {
            if (!cita.fecha) return false
            
            // Comparar solo la parte de la fecha (YYYY-MM-DD)
            const citaDateStr = cita.fecha
            return citaDateStr === todayStr
          }).length
          
          console.log(`📊 Citas de hoy: ${citasHoy}`)
          
          // Obtener citas recientes para mostrar
          const citasRecientesFiltradas = citasTransformadas
            .sort((a: any, b: any) => {
              const dateA = new Date(`${a.fecha}T${a.hora}`)
              const dateB = new Date(`${b.fecha}T${b.hora}`)
              return dateB.getTime() - dateA.getTime()
            })
            .slice(0, 3) // Tomar solo las 3 más recientes
        
          setCitasRecientes(citasRecientesFiltradas)
        }
      } catch (citasError) {
        console.warn('Error fetching citas de hoy:', citasError)
        citasHoy = 0
      }
      
      setStats({
        totalPacientes,
        citasHoy
      })
      
    } catch (err: any) {
      console.error('Error cargando estadísticas:', err)
      setError('Error al cargar las estadísticas del dashboard')
      
      setStats({
        totalPacientes: 0,
        citasHoy: 0
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardStats()
  }

  const statCards = [
    { 
      icon: Users, 
      label: "Total Pacientes", 
      value: stats.totalPacientes.toString(), 
      color: "bg-[#99d6e8]", 
      permission: "ver_pacientes" as Permission
    },
    { 
      icon: Calendar, 
      label: "Citas Hoy", 
      value: stats.citasHoy.toString(), 
      color: "bg-[#669933]", 
      permission: "ver_agenda" as Permission
    }
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Bienvenido, {user.nombre_completo}</h1>
          <p className="text-gray-600 mt-2">
            Panel de control - Rol: <span className="font-semibold capitalize">{user.rol}</span>
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">❌ Error: {error}</p>
          <button 
            onClick={fetchDashboardStats}
            className="mt-2 text-sm text-red-700 underline"
          >
            Intentar nuevamente
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a6b32] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      )}

      {/* Stats Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {statCards.map(
            (stat, idx) =>
              (!stat.permission || hasPermission(stat.permission)) && (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <stat.icon size={24} className="text-white" />
                    </div>
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      {/* Quick Access - Solo Citas Recientes */}
      {!loading && hasPermission("ver_agenda" as Permission) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Calendar className="mr-2 text-[#669933]" size={20} />
            Citas Recientes
          </h2>
          <div className="space-y-3">
            {citasRecientes.length > 0 ? (
              citasRecientes.map((cita, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {cita.paciente_nombre} {cita.paciente_apellido}
                    </p>
                    <p className="text-xs text-gray-600">
                      {cita.hora} - {cita.tipo_cita === "consulta" ? "Consulta" : 
                       cita.tipo_cita === "control" ? "Control" :
                       cita.tipo_cita === "valoracion" ? "Valoración" : "Programación Quirúrgica"}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    cita.estado === "confirmada" 
                      ? "text-[#1a6b32] bg-[#99d6e8]/30" 
                      : cita.estado === "pendiente"
                      ? "text-yellow-700 bg-yellow-100"
                      : cita.estado === "completada"
                      ? "text-blue-700 bg-blue-100"
                      : "text-red-700 bg-red-100"
                  }`}>
                    {cita.estado === "confirmada" ? "Confirmada" :
                     cita.estado === "pendiente" ? "Pendiente" :
                     cita.estado === "completada" ? "Completada" : "Cancelada"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No hay citas recientes</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}