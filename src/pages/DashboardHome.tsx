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
      
      const pacientesResponse = await api.getPacientes(10000)
      const totalPacientes = pacientesResponse.pacientes?.length || 0
      
      let citasHoy = 0
      let citasData: any[] = []
      
      try {
        const citasResponse = await api.getCitas(1000)
        
        if (Array.isArray(citasResponse)) {
          citasData = citasResponse
        } else if (citasResponse && typeof citasResponse === 'object') {
          const possibleKeys = ['citas', 'data', 'items', 'appointments']
          for (const key of possibleKeys) {
            if (Array.isArray(citasResponse[key])) {
              citasData = citasResponse[key]
              break
            }
          }
        }
        
        if (citasData.length > 0) {
          const citasTransformadas = citasData.map((cita: any) => 
            transformBackendToFrontend.cita(cita)
          )
          
          const today = new Date()
          const todayStr = today.toISOString().split('T')[0]
          
          citasHoy = citasTransformadas.filter((cita: any) => {
            if (!cita.fecha) return false
            
            const citaDateStr = cita.fecha
            return citaDateStr === todayStr
          }).length
          
          const citasRecientesFiltradas = citasTransformadas
            .sort((a: any, b: any) => {
              const dateA = new Date(`${a.fecha}T${a.hora}`)
              const dateB = new Date(`${b.fecha}T${b.hora}`)
              return dateB.getTime() - dateA.getTime()
            })
            .slice(0, 3)
        
          setCitasRecientes(citasRecientesFiltradas)
        }
      } catch (citasError) {
        citasHoy = 0
      }
      
      setStats({
        totalPacientes,
        citasHoy
      })
      
    } catch (err: any) {
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Bienvenido, {user.nombre_completo.split(' ')[0]}</h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
            Panel de control - Rol: <span className="font-semibold capitalize">{user.rol}</span>
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700 disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error: {error}</p>
          <button 
            onClick={fetchDashboardStats}
            className="mt-2 text-sm text-red-700 underline"
          >
            Intentar nuevamente
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 md:py-12">
          <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-[#1a6b32] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {statCards.map(
            (stat, idx) =>
              (!stat.permission || hasPermission(stat.permission)) && (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                      <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-2 md:p-3 rounded-lg`}>
                      <stat.icon size={20} className="text-white" />
                    </div>
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      {!loading && hasPermission("ver_agenda" as Permission) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Calendar className="mr-2 text-[#669933]" size={18} />
            Citas Recientes
          </h2>
          <div className="space-y-3">
            {citasRecientes.length > 0 ? (
              citasRecientes.map((cita, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition gap-2"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {cita.paciente_nombre} {cita.paciente_apellido}
                    </p>
                    <p className="text-xs text-gray-600">
                      {cita.hora} - {cita.tipo_cita === "consulta" ? "Consulta" : 
                       cita.tipo_cita === "control" ? "Control" :
                       cita.tipo_cita === "valoracion" ? "Valoración" : "Programación Quirúrgica"}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full w-fit ${
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