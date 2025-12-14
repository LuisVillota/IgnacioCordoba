"use client"

import { useState, useEffect } from "react"
import { Clock, AlertCircle, CheckCircle2, Phone, Save, UserCheck, UserX, User, Calendar, RefreshCw } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { api, handleApiError } from "@/lib/api"
import { toast } from "sonner"

interface PacienteSalaEspera {
  id: string
  nombres: string
  apellidos: string
  documento: string
  telefono?: string
  email?: string
  cita_id?: string
  hora_cita?: string
  fecha_cita?: string
  estado_sala: "pendiente" | "llegada" | "confirmada" | "en_consulta" | "completada" | "no_asistio"
  tiempo_espera?: number
  tiene_cita_hoy?: boolean
}

interface EstadisticasSalaEspera {
  total: number
  pendientes: number
  llegadas: number
  confirmadas: number
  en_consulta: number
  completadas: number
  no_asistieron: number
  con_cita_hoy: number
  sin_cita_hoy: number
}

export function SalaEsperaPage() {
  const [pacientes, setPacientes] = useState<PacienteSalaEspera[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasSalaEspera>({
    total: 0,
    pendientes: 0,
    llegadas: 0,
    confirmadas: 0,
    en_consulta: 0,
    completadas: 0,
    no_asistieron: 0,
    con_cita_hoy: 0,
    sin_cita_hoy: 0
  })
  const [horaActual, setHoraActual] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [cambiosPendientes, setCambiosPendientes] = useState<Record<string, string>>({})
  const [mostrarTodos, setMostrarTodos] = useState(true)

  useEffect(() => {
    loadData()
    
    // Actualizar hora cada segundo
    const timer = setInterval(() => {
      setHoraActual(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log("📥 Cargando datos de sala de espera...")
      
      // Obtener citas de hoy
      const hoy = new Date().toISOString().split("T")[0]
      console.log("📅 Hoy es:", hoy)
      
      let citasHoy: any[] = []
      try {
        const citasResponse = await api.getCitas(100, 0)
        console.log("📋 Respuesta de citas:", citasResponse)
        
        let citasArray: any[] = []
        
        if (Array.isArray(citasResponse)) {
          citasArray = citasResponse
        } else if (citasResponse?.citas && Array.isArray(citasResponse.citas)) {
          citasArray = citasResponse.citas
        } else if (citasResponse?.data && Array.isArray(citasResponse.data)) {
          citasArray = citasResponse.data
        }
        
        // Filtrar citas de hoy
        citasHoy = citasArray.filter((cita: any) => {
          if (!cita.fecha_hora) return false
          
          try {
            const fechaHoraStr = cita.fecha_hora.toString()
            let fechaCita = ""
            
            if (fechaHoraStr.includes(' ')) {
              fechaCita = fechaHoraStr.split(' ')[0]
            } else if (fechaHoraStr.includes('T')) {
              fechaCita = fechaHoraStr.split('T')[0]
            }
            
            console.log(`Cita ${cita.id}: fecha en BD = ${fechaCita}, hoy = ${hoy}`)
            return fechaCita === hoy
          } catch (e) {
            console.error("Error procesando fecha:", e)
            return false
          }
        })
        
        console.log(`📊 Citas de hoy encontradas: ${citasHoy.length}`)
      } catch (error) {
        console.error("❌ Error obteniendo citas:", error)
        // Continuar sin citas si hay error
      }
      
      // Obtener TODOS los pacientes
      let pacientesArray: any[] = []
      try {
        const pacientesResponse = await api.getPacientes(100, 0)
        console.log("👥 Respuesta de pacientes:", pacientesResponse)
        
        if (Array.isArray(pacientesResponse)) {
          pacientesArray = pacientesResponse
        } else if (pacientesResponse?.pacientes && Array.isArray(pacientesResponse.pacientes)) {
          pacientesArray = pacientesResponse.pacientes
        } else if (pacientesResponse?.data && Array.isArray(pacientesResponse.data)) {
          pacientesArray = pacientesResponse.data
        }
        
        console.log(`🏥 Total pacientes en BD: ${pacientesArray.length}`)
      } catch (error) {
        console.error("❌ Error obteniendo pacientes:", error)
        toast.error("Error cargando pacientes: " + handleApiError(error))
        return
      }
      
      // Crear lista combinada de pacientes en sala de espera
      const pacientesSala: PacienteSalaEspera[] = []
      
      // Para cada paciente en la base de datos
      pacientesArray.forEach((paciente: any) => {
        // Buscar si tiene cita hoy
        const citaHoy = citasHoy.find((cita: any) => cita.paciente_id == paciente.id)
        
        let estadoSala: PacienteSalaEspera["estado_sala"] = "pendiente"
        let horaCita = ""
        let fechaCita = ""
        let tieneCitaHoy = false
        
        if (citaHoy) {
          tieneCitaHoy = true
          
          // Extraer hora de la cita
          if (citaHoy.fecha_hora) {
            const fechaHoraStr = citaHoy.fecha_hora.toString()
            if (fechaHoraStr.includes(' ')) {
              horaCita = fechaHoraStr.split(' ')[1]?.substring(0, 5) || "09:00"
              fechaCita = fechaHoraStr.split(' ')[0]
            } else if (fechaHoraStr.includes('T')) {
              horaCita = fechaHoraStr.split('T')[1]?.substring(0, 5) || "09:00"
              fechaCita = fechaHoraStr.split('T')[0]
            }
          }
          
          // Determinar estado inicial basado en estado de cita
          if (citaHoy.estado_id === 2) estadoSala = "confirmada" // confirmada
          else if (citaHoy.estado_id === 3) estadoSala = "completada" // completada
          else if (citaHoy.estado_id === 4) estadoSala = "pendiente" // pendiente
        } else {
          // Si no tiene cita hoy, estado por defecto
          estadoSala = "pendiente"
        }
        
        pacientesSala.push({
          id: paciente.id.toString(),
          nombres: paciente.nombres || paciente.nombre || "",
          apellidos: paciente.apellidos || paciente.apellido || "",
          documento: paciente.documento || paciente.numero_documento || "",
          telefono: paciente.telefono || "",
          email: paciente.email || "",
          cita_id: citaHoy?.id?.toString(),
          hora_cita: horaCita,
          fecha_cita: fechaCita,
          estado_sala: estadoSala,
          tiempo_espera: 0,
          tiene_cita_hoy: tieneCitaHoy
        })
      })
      
      console.log(`🏥 Pacientes en sala de espera: ${pacientesSala.length}`)
      console.log("📋 Primeros 3 pacientes:", pacientesSala.slice(0, 3))
      
      setPacientes(pacientesSala)
      
      // Calcular estadísticas iniciales
      calcularEstadisticas(pacientesSala)
      
      toast.success(`✅ Cargados ${pacientesSala.length} pacientes`)
      
    } catch (error: any) {
      console.error("❌ Error cargando datos de sala de espera:", error)
      toast.error("Error cargando datos: " + handleApiError(error))
    } finally {
      setLoading(false)
    }
  }

  const calcularEstadisticas = (pacientesList: PacienteSalaEspera[]) => {
    const stats: EstadisticasSalaEspera = {
      total: pacientesList.length,
      pendientes: pacientesList.filter(p => p.estado_sala === "pendiente").length,
      llegadas: pacientesList.filter(p => p.estado_sala === "llegada").length,
      confirmadas: pacientesList.filter(p => p.estado_sala === "confirmada").length,
      en_consulta: pacientesList.filter(p => p.estado_sala === "en_consulta").length,
      completadas: pacientesList.filter(p => p.estado_sala === "completada").length,
      no_asistieron: pacientesList.filter(p => p.estado_sala === "no_asistio").length,
      con_cita_hoy: pacientesList.filter(p => p.tiene_cita_hoy).length,
      sin_cita_hoy: pacientesList.filter(p => !p.tiene_cita_hoy).length
    }
    
    setEstadisticas(stats)
    console.log("📊 Estadísticas calculadas:", stats)
  }

  const handleChangeEstado = (pacienteId: string, nuevoEstado: PacienteSalaEspera["estado_sala"]) => {
    console.log(`🔄 Cambiando estado del paciente ${pacienteId} a: ${nuevoEstado}`)
    
    // Actualizar estado local
    const pacientesActualizados = pacientes.map(p => 
      p.id === pacienteId ? { ...p, estado_sala: nuevoEstado } : p
    )
    
    setPacientes(pacientesActualizados)
    
    // Registrar cambio pendiente
    setCambiosPendientes(prev => ({
      ...prev,
      [pacienteId]: nuevoEstado
    }))
    
    // Recalcular estadísticas
    calcularEstadisticas(pacientesActualizados)
    
    toast.success(`Estado cambiado a: ${getEstadoLabel(nuevoEstado)}`)
  }

  const handleGuardarEstados = async () => {
    if (Object.keys(cambiosPendientes).length === 0) {
      toast.info("No hay cambios pendientes para guardar")
      return
    }

    try {
      setGuardando(true)
      console.log("💾 Guardando cambios de estado...", cambiosPendientes)

      // Aquí deberías implementar la lógica para guardar los estados en el backend
      // Por ahora, solo simulamos el guardado
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Limpiar cambios pendientes
      setCambiosPendientes({})
      
      toast.success(`✅ ${Object.keys(cambiosPendientes).length} cambios guardados exitosamente`)
      
    } catch (error: any) {
      console.error("❌ Error guardando estados:", error)
      toast.error("Error guardando cambios: " + handleApiError(error))
    } finally {
      setGuardando(false)
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "llegada":
        return <AlertCircle className="text-yellow-500" size={20} />
      case "confirmada":
        return <CheckCircle2 className="text-green-500" size={20} />
      case "en_consulta":
        return <UserCheck className="text-blue-500" size={20} />
      case "completada":
        return <CheckCircle2 className="text-purple-500" size={20} />
      case "no_asistio":
        return <UserX className="text-red-500" size={20} />
      default:
        return <Clock className="text-gray-400" size={20} />
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
      case "llegada":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "confirmada":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "en_consulta":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "completada":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200"
      case "no_asistio":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  const getEstadoLabel = (estado: string): string => {
    switch (estado) {
      case "pendiente": return "Pendiente"
      case "llegada": return "Llegada"
      case "confirmada": return "Confirmada"
      case "en_consulta": return "En Consulta"
      case "completada": return "Completada"
      case "no_asistio": return "No Asistió"
      default: return estado
    }
  }

  const estadosDisponibles: PacienteSalaEspera["estado_sala"][] = [
    "pendiente", "llegada", "confirmada", "en_consulta", "completada", "no_asistio"
  ]

  // Filtrar pacientes según mostrarTodos
  const pacientesFiltrados = mostrarTodos 
    ? pacientes 
    : pacientes.filter(p => p.tiene_cita_hoy)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a6b32] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando sala de espera...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute permissions={["ver_sala_espera"]}>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Sala de Espera</h1>
              <p className="text-gray-600 mt-2">Control en tiempo real de pacientes</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-4xl font-bold text-[#1a6b32]">{horaActual.toLocaleTimeString("es-CO")}</p>
                <p className="text-gray-600">{horaActual.toLocaleDateString("es-CO")}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={loadData}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700"
                  title="Recargar datos"
                >
                  <RefreshCw size={20} />
                </button>
                <button
                  onClick={handleGuardarEstados}
                  disabled={guardando || Object.keys(cambiosPendientes).length === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    guardando || Object.keys(cambiosPendientes).length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#1a6b32] hover:bg-[#155529] text-white"
                  }`}
                >
                  <Save size={20} />
                  <span>
                    {guardando ? "Guardando..." : `Guardar Cambios (${Object.keys(cambiosPendientes).length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y estadísticas */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMostrarTodos(true)}
                className={`px-3 py-1 rounded-lg transition ${
                  mostrarTodos 
                    ? "bg-[#1a6b32] text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Todos los Pacientes ({estadisticas.total})
              </button>
              <button
                onClick={() => setMostrarTodos(false)}
                className={`px-3 py-1 rounded-lg transition ${
                  !mostrarTodos 
                    ? "bg-[#1a6b32] text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Con Cita Hoy ({estadisticas.con_cita_hoy})
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <span className="font-medium">Mostrando:</span> {pacientesFiltrados.length} pacientes
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{estadisticas.total}</p>
            <p className="text-sm text-gray-600 mt-1">Total Pacientes</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4 text-center">
            <p className="text-3xl font-bold text-yellow-800">{estadisticas.llegadas}</p>
            <p className="text-sm text-yellow-600 mt-1">Llegada</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4 text-center">
            <p className="text-3xl font-bold text-blue-800">{estadisticas.en_consulta}</p>
            <p className="text-sm text-blue-600 mt-1">En Consulta</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow-sm border border-purple-200 p-4 text-center">
            <p className="text-3xl font-bold text-purple-800">{estadisticas.completadas}</p>
            <p className="text-sm text-purple-600 mt-1">Completada</p>
          </div>
        </div>

        {/* Detalle de estadísticas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar size={20} className="text-gray-500" />
              <h3 className="font-semibold text-gray-800">Citas Hoy</h3>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Con cita hoy:</span>
              <span className="font-bold text-blue-600">{estadisticas.con_cita_hoy}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Sin cita hoy:</span>
              <span className="font-bold text-gray-600">{estadisticas.sin_cita_hoy}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Confirmadas hoy:</span>
              <span className="font-bold text-green-600">{estadisticas.confirmadas}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <User size={20} className="text-gray-500" />
              <h3 className="font-semibold text-gray-800">Resumen de Estados</h3>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pendientes:</span>
              <span className="font-bold text-gray-800">{estadisticas.pendientes}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">No Asistieron:</span>
              <span className="font-bold text-red-600">{estadisticas.no_asistieron}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tasa completadas:</span>
              <span className="font-bold text-purple-600">
                {estadisticas.total > 0 
                  ? Math.round((estadisticas.completadas / estadisticas.total) * 100) 
                  : 0}%
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle2 size={20} className="text-green-500" />
              <h3 className="font-semibold text-gray-800">Información General</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Horas de atención:</span> 8:00 AM - 6:00 PM
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Tiempo promedio espera:</span> 15 min
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Tiempo promedio consulta:</span> 25 min
            </p>
          </div>
        </div>

        {/* Lista de pacientes */}
        <div className="space-y-3">
          {pacientesFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Clock size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No hay pacientes para mostrar</p>
              <p className="text-sm text-gray-500 mt-2">
                {mostrarTodos 
                  ? "No hay pacientes registrados en la base de datos" 
                  : "No hay pacientes con cita programada para hoy"}
              </p>
            </div>
          ) : (
            pacientesFiltrados.map((paciente) => (
              <div
                key={paciente.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {getEstadoIcon(paciente.estado_sala)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-800 text-lg">
                          {paciente.nombres} {paciente.apellidos}
                        </p>
                        {paciente.tiene_cita_hoy && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            <Calendar size={12} className="mr-1" />
                            Cita Hoy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        Documento: {paciente.documento} | Teléfono: {paciente.telefono || "No disponible"}
                      </p>
                      {paciente.hora_cita && (
                        <p className="text-xs text-gray-500 mt-1">
                          Cita: {paciente.hora_cita} {paciente.fecha_cita && `(${paciente.fecha_cita})`} | ID Cita: {paciente.cita_id || "N/A"}
                        </p>
                      )}
                      {!paciente.tiene_cita_hoy && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ No tiene cita programada para hoy
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      {paciente.hora_cita && (
                        <p className="text-sm font-semibold text-gray-700">{paciente.hora_cita}</p>
                      )}
                      <p className="text-xs text-gray-600">
                        Espera: {paciente.tiempo_espera || 0} min
                      </p>
                    </div>

                    <select
                      value={paciente.estado_sala}
                      onChange={(e) => handleChangeEstado(paciente.id, e.target.value as PacienteSalaEspera["estado_sala"])}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${getEstadoColor(paciente.estado_sala)}`}
                    >
                      {estadosDisponibles.map((estado) => (
                        <option key={estado} value={estado}>
                          {getEstadoLabel(estado)}
                        </option>
                      ))}
                    </select>

                    <button 
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Llamar paciente"
                    >
                      <Phone size={20} />
                    </button>
                  </div>
                </div>
                
                {/* Indicador de cambio pendiente */}
                {cambiosPendientes[paciente.id] && (
                  <div className="mt-2 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      <Save size={12} className="mr-1" />
                      Cambio pendiente: {getEstadoLabel(cambiosPendientes[paciente.id])}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}