"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Calendar, Clock, User, AlertCircle, RefreshCw, AlertTriangle, X } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { CitaForm } from "../components/CitaForm"
import { CitaModal } from "../components/CitaModal"
import { api, handleApiError, debugAPI } from "@/lib/api"
import { toast } from "sonner"

export interface Cita {
  id: string
  id_paciente: string
  id_usuario: string
  tipo_cita: "consulta" | "control" | "valoracion" | "programacion_quirurgica"
  fecha: string
  hora: string
  duracion: number
  estado: "pendiente" | "confirmada" | "cancelada" | "completada"
  observaciones: string
  paciente_nombre?: string
  paciente_apellido?: string
  doctor_nombre?: string
}

export interface Paciente {
  id: string
  nombres: string
  apellidos: string
  documento: string
  telefono?: string
  email?: string
}

interface CitaConflict {
  citaExistente: Cita
  nuevaCita: Omit<Cita, "id">
  mensaje: string
}

const tiposDeVisita = {
  consulta: { label: "Consulta", duracion: 60 },
  control: { label: "Control", duracion: 30 },
  valoracion: { label: "Valoración", duracion: 45 },
  programacion_quirurgica: { label: "Programación Quirúrgica", duracion: 60 },
}

// Función para formatear fecha a YYYY-MM-DD
const formatDate = (date: Date | string): string => {
  if (!date) return ''
  
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

// Función para formatear hora a HH:MM
const formatTime = (timeString: string): string => {
  if (!timeString) return '09:00'
  
  // Si ya está en formato HH:MM, retornar
  if (/^\d{2}:\d{2}$/.test(timeString)) return timeString
  
  // Si viene como '14:30:00' (con segundos), extraer solo HH:MM
  const match = timeString.match(/^(\d{2}:\d{2})/)
  return match ? match[1] : '09:00'
}

// Función para transformar cita del backend al frontend
const transformBackendCita = (backendCita: any): Cita => {
  console.log("🔧 Transformando cita del backend:", backendCita)
  
  let fecha = ''
  let hora = ''
  
  // Manejar diferentes formatos de fecha_hora
  if (backendCita.fecha_hora) {
    const fechaHoraStr = backendCita.fecha_hora.toString()
    console.log("📅 Fecha_hora original:", fechaHoraStr)
    
    // Si es string como '2024-01-15 14:30:00'
    if (fechaHoraStr.includes(' ')) {
      const [datePart, timePart] = fechaHoraStr.split(' ')
      fecha = datePart
      hora = timePart ? formatTime(timePart) : '09:00'
      console.log("📊 Separado fecha:", fecha, "hora:", hora)
    } 
    // Si es string como '2024-01-15T14:30:00.000Z'
    else if (fechaHoraStr.includes('T')) {
      const dateObj = new Date(fechaHoraStr)
      fecha = formatDate(dateObj)
      hora = dateObj.toTimeString().slice(0, 5)
      console.log("📊 ISO fecha:", fecha, "hora:", hora)
    }
    // Si es un objeto Date
    else if (backendCita.fecha_hora instanceof Date) {
      fecha = formatDate(backendCita.fecha_hora)
      hora = backendCita.fecha_hora.toTimeString().slice(0, 5)
      console.log("📊 Date objeto fecha:", fecha, "hora:", hora)
    }
  } else if (backendCita.fecha && backendCita.hora) {
    // Si vienen separados
    fecha = backendCita.fecha
    hora = formatTime(backendCita.hora)
    console.log("📊 Datos separados fecha:", fecha, "hora:", hora)
  }
  
  // Si no hay fecha, usar hoy
  if (!fecha) {
    fecha = formatDate(new Date())
    console.log("⚠️ No se encontró fecha, usando hoy:", fecha)
  }

  // Determinar estado
  let estado: Cita["estado"] = "pendiente"
  if (backendCita.estado_nombre) {
    const estadoLower = backendCita.estado_nombre.toLowerCase()
    if (estadoLower.includes('confirm')) estado = "confirmada"
    else if (estadoLower.includes('complet')) estado = "completada"
    else if (estadoLower.includes('cancel')) estado = "cancelada"
    else if (estadoLower.includes('pendient')) estado = "pendiente"
  } else if (backendCita.estado) {
    const estadoLower = backendCita.estado.toLowerCase()
    if (estadoLower.includes('confirm')) estado = "confirmada"
    else if (estadoLower.includes('complet')) estado = "completada"
    else if (estadoLower.includes('cancel')) estado = "cancelada"
    else if (estadoLower.includes('pendient')) estado = "pendiente"
  }

  // Determinar tipo de cita
  let tipo_cita: Cita["tipo_cita"] = "consulta"
  if (backendCita.tipo) {
    const tipoLower = backendCita.tipo.toLowerCase()
    if (tipoLower.includes('control')) tipo_cita = "control"
    else if (tipoLower.includes('valora')) tipo_cita = "valoracion"
    else if (tipoLower.includes('program') || tipoLower.includes('quirur')) tipo_cita = "programacion_quirurgica"
    else if (tipoLower.includes('consulta')) tipo_cita = "consulta"
  }

  const cita: Cita = {
    id: backendCita.id?.toString() || backendCita.cita_id?.toString() || Date.now().toString(),
    id_paciente: backendCita.paciente_id?.toString() || backendCita.id_paciente?.toString() || '',
    id_usuario: backendCita.usuario_id?.toString() || backendCita.id_usuario?.toString() || '1',
    tipo_cita: tipo_cita,
    fecha: fecha,
    hora: hora,
    duracion: backendCita.duracion || backendCita.duracion_minutos || 30,
    estado: estado,
    observaciones: backendCita.observaciones || backendCita.notas || '',
    paciente_nombre: backendCita.paciente_nombre || backendCita.nombres || backendCita.nombre || '',
    paciente_apellido: backendCita.paciente_apellido || backendCita.apellidos || backendCita.apellido || '',
    doctor_nombre: backendCita.doctor_nombre || backendCita.doctor || backendCita.usuario_nombre || 'Dr. No Especificado',
  }

  console.log("✅ Cita transformada:", cita)
  return cita
}

// Función para transformar paciente
const transformBackendPaciente = (backendPaciente: any): Paciente => {
  return {
    id: backendPaciente.id?.toString() || '',
    nombres: backendPaciente.nombres || backendPaciente.nombre || '',
    apellidos: backendPaciente.apellidos || backendPaciente.apellido || '',
    documento: backendPaciente.documento || backendPaciente.numero_documento || '',
    telefono: backendPaciente.telefono || '',
    email: backendPaciente.email || '',
  }
}

// Función para ordenar citas por fecha (ascendente) y hora (ascendente)
const ordenarCitasPorFechaHoraAscendente = (citasArray: Cita[]): Cita[] => {
  console.log("📊 Ordenando citas por fecha y hora ascendente")
  
  const citasOrdenadas = citasArray.sort((a, b) => {
    // Primero comparar por fecha (ascendente - más antigua primero)
    const fechaA = new Date(a.fecha).getTime()
    const fechaB = new Date(b.fecha).getTime()
    
    console.log(`📅 Comparando fechas: ${a.fecha} (${fechaA}) vs ${b.fecha} (${fechaB})`)
    
    if (fechaA !== fechaB) {
      const resultado = fechaA - fechaB // Ascendente: más antigua primero
      console.log(`📅 Resultado por fecha: ${resultado}`)
      return resultado
    }
    
    // Si es la misma fecha, ordenar por hora (ascendente - más temprana primero)
    const [horaA, minutoA] = a.hora.split(':').map(Number)
    const [horaB, minutoB] = b.hora.split(':').map(Number)
    
    const minutosA = horaA * 60 + (minutoA || 0)
    const minutosB = horaB * 60 + (minutoB || 0)
    
    console.log(`⏰ Comparando horas: ${a.hora} (${minutosA} min) vs ${b.hora} (${minutosB} min)`)
    
    const resultado = minutosA - minutosB // Ascendente: más temprana primero
    console.log(`⏰ Resultado por hora: ${resultado}`)
    return resultado
  })
  
  console.log("✅ Citas ordenadas:", citasOrdenadas.map(c => `${c.fecha} ${c.hora} - ${c.paciente_nombre}`))
  return citasOrdenadas
}

// Componente de modal para conflictos de horario
function ConflictoHorarioModal({ 
  conflicto, 
  onCancel, 
  onOverride 
}: { 
  conflicto: CitaConflict
  onCancel: () => void
  onOverride: () => void
}) {
  const pacienteExistente = conflicto.citaExistente.paciente_nombre + ' ' + conflicto.citaExistente.paciente_apellido
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-800">Conflicto de Horario</h3>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Ya existe una cita programada en el mismo horario. Por favor revisa los detalles:
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-amber-800 mb-2">Cita Existente:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Paciente:</span>
                  <span className="font-medium">{pacienteExistente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{conflicto.citaExistente.fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">
                    {conflicto.citaExistente.hora} - {agregarMinutos(conflicto.citaExistente.hora, conflicto.citaExistente.duracion)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{tiposDeVisita[conflicto.citaExistente.tipo_cita]?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-medium capitalize ${
                    conflicto.citaExistente.estado === 'confirmada' ? 'text-green-600' :
                    conflicto.citaExistente.estado === 'pendiente' ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>
                    {conflicto.citaExistente.estado}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Nueva Cita:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{conflicto.nuevaCita.fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">
                    {conflicto.nuevaCita.hora} - {agregarMinutos(conflicto.nuevaCita.hora, conflicto.nuevaCita.duracion)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{tiposDeVisita[conflicto.nuevaCita.tipo_cita]?.label}</span>
                </div>
              </div>
            </div>
            
            <p className="text-amber-700 font-medium mt-4 text-sm">
              {conflicto.mensaje}
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={onOverride}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
            >
              Crear de Todas Formas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgendaPage() {
  const [citas, setCitas] = useState<Cita[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todas")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [conflictoHorario, setConflictoHorario] = useState<CitaConflict | null>(null)
  const [pendienteGuardar, setPendienteGuardar] = useState<Omit<Cita, "id"> | null>(null)

  // Cargar citas y pacientes al iniciar
  useEffect(() => {
    loadData()
  }, [])

  const testBackendConnection = async () => {
    setTestingConnection(true)
    try {
      console.log("🔌 Probando conexión con el backend...")
      const result = await api.testConnection()
      console.log("Resultado del test:", result)
      
      if (result.success) {
        toast.success("✅ Backend conectado correctamente")
        return true
      } else {
        toast.warning(`⚠️ Backend no disponible: ${result.message}`)
        return false
      }
    } catch (error) {
      console.error("Error testing connection:", error)
      toast.error("❌ Error al probar conexión con el backend")
      return false
    } finally {
      setTestingConnection(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("📥 Cargando datos de la agenda...")
      
      // Primero probar la conexión
      const isBackendAvailable = await testBackendConnection()
      
      if (!isBackendAvailable) {
        console.log("⚠️ Backend no disponible, sin datos de ejemplo")
        setCitas([])
        setPacientes([])
        setUseMockData(false)
        toast.error("El backend no está disponible. No se pueden cargar los datos.")
        return
      }
      
      // Intentar cargar datos reales
      try {
        // Cargar citas
        console.log("📋 Cargando citas...")
        let citasResponse
        try {
          citasResponse = await api.getCitas(100, 0)
          console.log("📋 Respuesta de citas:", citasResponse)
        } catch (citaError: any) {
          console.error("❌ Error al obtener citas:", citaError)
          throw new Error(`No se pudieron cargar las citas: ${handleApiError(citaError)}`)
        }
        
        // Manejar diferentes estructuras de respuesta
        let citasArray: any[] = []
        
        if (Array.isArray(citasResponse)) {
          citasArray = citasResponse
        } else if (citasResponse?.citas && Array.isArray(citasResponse.citas)) {
          citasArray = citasResponse.citas
        } else if (citasResponse?.data && Array.isArray(citasResponse.data)) {
          citasArray = citasResponse.data
        } else if (citasResponse && typeof citasResponse === 'object') {
          // Intentar extraer citas de un objeto
          const possibleKeys = ['citas', 'appointments', 'items', 'results']
          for (const key of possibleKeys) {
            if (Array.isArray(citasResponse[key])) {
              citasArray = citasResponse[key]
              break
            }
          }
        }
        
        console.log(`📊 Encontradas ${citasArray.length} citas del backend`)
        
        if (citasArray.length > 0) {
          console.log("📝 Primeras 3 citas del backend:")
          citasArray.slice(0, 3).forEach((cita, i) => {
            console.log(`  ${i + 1}.`, cita)
          })
        }
        
        const transformedCitas = citasArray.map(transformBackendCita)
        const citasOrdenadas = ordenarCitasPorFechaHoraAscendente(transformedCitas)
        
        console.log("📅 Resumen de citas transformadas y ordenadas:")
        if (citasOrdenadas.length > 0) {
          citasOrdenadas.forEach((cita, i) => {
            console.log(`  ${i + 1}. ${cita.fecha} ${cita.hora} - ${cita.paciente_nombre} ${cita.paciente_apellido}`)
          })
        } else {
          console.log("  No hay citas para mostrar")
        }
        
        // Verificar que las citas tengan fechas válidas
        const validCitas = citasOrdenadas.filter(c => c.fecha && c.hora)
        console.log(`✅ ${validCitas.length} citas válidas (con fecha y hora)`)
        
        setCitas(validCitas)
        
        // Cargar pacientes
        console.log("👥 Cargando pacientes...")
        let pacientesResponse
        try {
          pacientesResponse = await api.getPacientes(100, 0)
          console.log("👥 Respuesta de pacientes:", pacientesResponse)
        } catch (pacienteError: any) {
          console.error("❌ Error al obtener pacientes:", pacienteError)
          throw new Error(`No se pudieron cargar los pacientes: ${handleApiError(pacienteError)}`)
        }
        
        let pacientesArray: any[] = []
        
        if (Array.isArray(pacientesResponse)) {
          pacientesArray = pacientesResponse
        } else if (pacientesResponse?.pacientes && Array.isArray(pacientesResponse.pacientes)) {
          pacientesArray = pacientesResponse.pacientes
        } else if (pacientesResponse?.data && Array.isArray(pacientesResponse.data)) {
          pacientesArray = pacientesResponse.data
        } else if (pacientesResponse && typeof pacientesResponse === 'object') {
          // Intentar extraer pacientes de un objeto
          const possibleKeys = ['pacientes', 'patients', 'items', 'results']
          for (const key of possibleKeys) {
            if (Array.isArray(pacientesResponse[key])) {
              pacientesArray = pacientesResponse[key]
              break
            }
          }
        }
        
        console.log(`👤 Encontrados ${pacientesArray.length} pacientes`)
        const transformedPacientes = pacientesArray.map(transformBackendPaciente)
        console.log("🏥 Pacientes transformados:", transformedPacientes)
        setPacientes(transformedPacientes)
        
        setUseMockData(false)
        
        if (validCitas.length === 0) {
          console.log("ℹ️ No hay citas en la base de datos")
          toast.info("No hay citas programadas. ¡Crea tu primera cita!")
        }
        if (transformedPacientes.length === 0) {
          console.log("⚠️ No hay pacientes en la base de datos")
          toast.warning("No hay pacientes registrados.")
        }
        
      } catch (apiError: any) {
        console.warn("⚠️ Error cargando datos reales", apiError)
        
        // No usar datos de ejemplo, solo mostrar error
        setCitas([])
        setPacientes([])
        setUseMockData(false)
        setError(`Error cargando datos: ${apiError.message}`)
        
        toast.error("Error cargando los datos. Por favor, verifica la conexión con el backend.")
      }
      
    } catch (error: any) {
      console.error("❌ Error crítico cargando datos:", error)
      const errorMsg = error.message || "Error desconocido al cargar datos"
      setError(errorMsg)
      toast.error("Error al cargar los datos: " + errorMsg)
      
      // Sin datos de ejemplo
      setCitas([])
      setPacientes([])
      setUseMockData(false)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const citasDelDia = (fecha: string) => {
    const fechaFormateada = formatDate(fecha)
    if (!fechaFormateada) return []
    
    const citasFiltradas = citas.filter((c) => {
      const citaFecha = formatDate(c.fecha)
      const coincide = citaFecha === fechaFormateada && 
                      (filterEstado === "todas" || c.estado === filterEstado)
      return coincide
    })
    
    console.log(`📊 Citas para ${fechaFormateada}: ${citasFiltradas.length} citas`)
    if (citasFiltradas.length > 0) {
      console.log("📝 Citas sin ordenar:", citasFiltradas.map(c => `${c.hora} - ${c.paciente_nombre}`))
    }
    
    // Ordenar por hora ASCENDENTE (de más temprana a más tardía)
    const citasOrdenadas = citasFiltradas.sort((a, b) => {
      // Convertir horas a minutos para comparación numérica
      const [horaA, minutoA] = a.hora.split(':').map(Number)
      const [horaB, minutoB] = b.hora.split(':').map(Number)
      
      const minutosA = horaA * 60 + (minutoA || 0)
      const minutosB = horaB * 60 + (minutoB || 0)
      
      const resultado = minutosA - minutosB // ASCENDENTE (temprano → tarde)
      console.log(`⏰ Ordenando: ${a.hora} (${minutosA}) vs ${b.hora} (${minutosB}) = ${resultado}`)
      return resultado
    })
    
    if (citasOrdenadas.length > 0) {
      console.log("✅ Citas ordenadas para", fechaFormateada, ":", citasOrdenadas.map(c => `${c.hora} - ${c.paciente_nombre}`))
    }
    
    return citasOrdenadas
  }

  // Función para verificar conflictos de horario
  const verificarConflictoHorario = (nuevaCita: Omit<Cita, "id">, idExcluir?: string): CitaConflict | null => {
    const nuevaFecha = formatDate(nuevaCita.fecha)
    const nuevaHoraInicio = nuevaCita.hora
    const nuevaHoraFin = agregarMinutos(nuevaCita.hora, nuevaCita.duracion)
    
    for (const cita of citas) {
      // Excluir la cita que se está editando
      if (idExcluir && cita.id === idExcluir) continue
      
      // Solo considerar citas no canceladas
      if (cita.estado === "cancelada") continue
      
      const citaFecha = formatDate(cita.fecha)
      if (citaFecha !== nuevaFecha) continue
      
      const citaHoraInicio = cita.hora
      const citaHoraFin = agregarMinutos(cita.hora, cita.duracion)
      
      // Verificar superposición
      if (!(nuevaHoraInicio >= citaHoraFin || nuevaHoraFin <= citaHoraInicio)) {
        const horasSuperpuestas = Math.min(
          minutosDesdeHora(nuevaHoraFin) - minutosDesdeHora(citaHoraInicio),
          minutosDesdeHora(citaHoraFin) - minutosDesdeHora(nuevaHoraInicio)
        )
        
        let mensaje = "Hay una superposición de horarios."
        if (nuevaHoraInicio === citaHoraInicio && nuevaHoraFin === citaHoraFin) {
          mensaje = "Ya existe una cita exactamente en el mismo horario."
        } else if (horasSuperpuestas >= 30) {
          mensaje = `Las citas se superponen por ${horasSuperpuestas} minutos.`
        }
        
        return {
          citaExistente: cita,
          nuevaCita: nuevaCita,
          mensaje: mensaje
        }
      }
    }
    
    return null
  }

  // Helper para convertir hora a minutos
  const minutosDesdeHora = (hora: string): number => {
    const [h, m] = hora.split(":").map(Number)
    return h * 60 + m
  }

  const handleSaveCita = async (data: Omit<Cita, "id">) => {
    try {
      console.log("💾 handleSaveCita llamado con datos:", data)
      
      // Validar datos requeridos
      if (!data.id_paciente || !data.fecha || !data.hora) {
        toast.error("Por favor completa todos los campos requeridos")
        return
      }
      
      // Verificar formato de fecha
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
        toast.error("Formato de fecha inválido. Use YYYY-MM-DD")
        return
      }
      
      // Verificar formato de hora
      if (!/^\d{2}:\d{2}/.test(data.hora)) {
        toast.error("Formato de hora inválido. Use HH:MM")
        return
      }
      
      // Verificar conflictos de horario
      const conflicto = verificarConflictoHorario(data, editingId || undefined)
      
      if (conflicto) {
        console.log("⚠️ Conflicto de horario detectado:", conflicto)
        setConflictoHorario(conflicto)
        setPendienteGuardar(data)
        return
      }
      
      // Si no hay conflicto, proceder con el guardado
      await guardarCitaSinConflicto(data)
      
    } catch (error: any) {
      console.error('❌ Error al procesar guardado de cita:', error)
      toast.error('Error al guardar la cita: ' + (error.message || "Error desconocido"))
    }
  }

  const guardarCitaSinConflicto = async (data: Omit<Cita, "id">) => {
    try {
      console.log("💾 guardarCitaSinConflicto:", data)
      
      // Usar API real (sin datos mockeados)
      try {
        // Preparar datos para API
        const citaData = {
          ...data,
          // Asegurar formato correcto para API
          fecha: data.fecha,
          hora: data.hora.includes(':') && data.hora.split(':').length === 2 
            ? data.hora + ":00" 
            : data.hora,
        };
        
        console.log("📤 Enviando a API:", citaData)
        
        if (editingId) {
          // Actualizar cita existente
          console.log("🔄 Actualizando cita ID:", editingId)
          const response = await api.updateCita(parseInt(editingId), citaData)
          console.log("✅ Respuesta de actualización:", response)
          
          // Recargar datos del backend para reflejar cambios
          await loadData()
          
          toast.success('Cita actualizada exitosamente')
          setEditingId(null)
        } else {
          // Crear nueva cita
          console.log("🆕 Creando nueva cita")
          const response = await api.createCita(citaData)
          console.log("✅ Respuesta de creación:", response)
          
          // Recargar datos del backend para reflejar cambios
          await loadData()
          
          toast.success('Cita creada exitosamente')
        }
        
        setShowForm(false)
        
      } catch (apiError: any) {
        console.error('❌ Error en API al guardar cita:', apiError)
        const errorMsg = handleApiError(apiError)
        toast.error(`Error: ${errorMsg}`)
        
        // Sin datos mockeados, solo mostrar error
        toast.error('No se pudo guardar la cita. Por favor, inténtalo de nuevo.')
      }
      
    } catch (error: any) {
      console.error('❌ Error general guardando cita:', error)
      toast.error('Error al guardar la cita: ' + (error.message || "Error desconocido"))
    }
  }

  const handleOverrideConflicto = async () => {
    if (!pendienteGuardar) return
    
    console.log("⚠️ Creando cita a pesar del conflicto")
    await guardarCitaSinConflicto(pendienteGuardar)
    
    // Limpiar estados
    setConflictoHorario(null)
    setPendienteGuardar(null)
    
    toast.warning("Cita creada a pesar del conflicto de horario")
  }

  const handleCancelConflicto = () => {
    console.log("❌ Cancelando creación por conflicto")
    setConflictoHorario(null)
    setPendienteGuardar(null)
    toast.info("Creación de cita cancelada por conflicto de horario")
  }

  const handleEdit = (cita: Cita) => {
    setEditingId(cita.id)
    setSelectedCita(cita)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta cita?")) {
      try {
        console.log("🗑️ Eliminando cita ID:", id)
        await api.deleteCita(parseInt(id))
        
        // Recargar datos del backend
        await loadData()
        
        toast.success('Cita eliminada exitosamente')
        
        // Si la cita seleccionada es la que se eliminó, limpiar
        if (selectedCita?.id === id) {
          setSelectedCita(null)
        }
      } catch (error: any) {
        console.error('❌ Error eliminando cita:', error)
        toast.error('Error eliminando cita: ' + handleApiError(error))
      }
    }
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthName = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" })

  // Buscar paciente por ID
  const getPacienteById = (id: string) => {
    return pacientes.find(p => p.id === id)
  }

  // Función para generar días del mes
  const renderCalendarDays = () => {
    const today = new Date()
    const todayStr = formatDate(today)
    
    console.log("📅 Generando calendario para el mes:", monthName)
    console.log("📅 Hoy es:", todayStr)
    
    return days.map((day) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateStr = formatDate(date)
      const daysCitas = citasDelDia(dateStr) // Ya está ordenada por hora ascendente
      const isToday = todayStr === dateStr
      
      if (daysCitas.length > 0) {
        console.log(`📊 Día ${day}: ${daysCitas.length} citas ordenadas:`, 
          daysCitas.map(c => `${c.hora} - ${c.paciente_nombre}`))
      }

      return (
        <div
          key={day}
          className={`aspect-square p-2 rounded-lg border cursor-pointer transition ${
            isToday
              ? "border-[#1a6b32] bg-[#99d6e8]/10"
              : "border-gray-200 hover:border-[#669933] hover:bg-gray-50"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-start">
              <p className={`text-sm font-semibold ${isToday ? "text-[#1a6b32]" : "text-gray-700"}`}>
                {day}
              </p>
              {daysCitas.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                  {daysCitas.length}
                </span>
              )}
            </div>
            {daysCitas.length > 0 && (
              <div className="flex-1 mt-1 text-xs space-y-1 overflow-y-auto">
                {daysCitas.slice(0, 3).map((cita) => {
                  const paciente = getPacienteById(cita.id_paciente) || {
                    nombres: cita.paciente_nombre || '',
                    apellidos: cita.paciente_apellido || ''
                  }
                  const tipoColor = {
                    consulta: "bg-blue-500",
                    control: "bg-green-500",
                    valoracion: "bg-purple-500",
                    programacion_quirurgica: "bg-red-500"
                  }[cita.tipo_cita] || "bg-gray-500"
                  
                  const estadoColor = {
                    confirmada: "bg-[#1a6b32]",
                    pendiente: "bg-[#669933]",
                    completada: "bg-blue-500",
                    cancelada: "bg-gray-400"
                  }[cita.estado] || "bg-gray-500"
                  
                  return (
                    <div
                      key={cita.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCita(cita)
                      }}
                      className={`p-1.5 rounded text-white text-xs cursor-pointer hover:opacity-90 transition ${estadoColor}`}
                      title={`${cita.hora} - ${paciente.nombres} ${paciente.apellidos} (${cita.estado}, ${tiposDeVisita[cita.tipo_cita]?.label || cita.tipo_cita})`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock size={10} className="mr-1" />
                          <span className="truncate font-medium">{cita.hora}</span>
                        </div>
                        <span className={`text-[10px] px-1 rounded ${tipoColor}`}>
                          {tiposDeVisita[cita.tipo_cita]?.label?.charAt(0) || cita.tipo_cita.charAt(0)}
                        </span>
                      </div>
                      <div className="truncate mt-0.5">
                        {paciente.nombres.split(' ')[0]} {paciente.apellidos.split(' ')[0].charAt(0)}.
                      </div>
                    </div>
                  )
                })}
                {daysCitas.length > 3 && (
                  <p className="text-gray-500 text-xs pl-1 font-medium">
                    +{daysCitas.length - 3} más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a6b32] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando agenda...</p>
          <p className="mt-2 text-sm text-gray-500">Verificando conexión con el backend...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute permissions={["ver_agenda"]}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Agenda y Citas</h1>
            <p className="text-gray-600 mt-2">Gestiona las citas de los pacientes</p>
            <div className="flex items-center space-x-4 mt-1 text-sm">
              <span className="text-gray-700">Citas: {citas.length}</span>
              <span className="text-gray-700">Pacientes: {pacientes.length}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              disabled={testingConnection}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={testingConnection ? "animate-spin" : ""} />
              <span>Recargar</span>
            </button>
            <ProtectedRoute permissions={["crear_cita"]}>
              <button
                onClick={() => {
                  setEditingId(null)
                  setSelectedCita(null)
                  setShowForm(true)
                }}
                disabled={pacientes.length === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  pacientes.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#1a6b32] hover:bg-[#155529] text-white"
                }`}
              >
                <Plus size={20} />
                <span>Nueva Cita</span>
              </button>
            </ProtectedRoute>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-800 font-medium">⚠️ Error cargando datos</p>
                <p className="text-amber-700 text-sm mt-1">{error}</p>
                <p className="text-amber-600 text-xs mt-2">
                  Asegúrate de que el backend esté corriendo en http://localhost:8000
                </p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={loadData}
                    disabled={testingConnection}
                    className={`px-3 py-1 rounded text-sm transition flex items-center ${
                      testingConnection 
                        ? "bg-amber-100 text-amber-700" 
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    <RefreshCw size={14} className={`mr-1 ${testingConnection ? "animate-spin" : ""}`} />
                    {testingConnection ? 'Probando...' : 'Reintentar conexión'}
                  </button>
                  <button
                    onClick={() => debugAPI.testAllEndpoints()}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition"
                  >
                    Debug API
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {pacientes.length === 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium">⚠️ Atención: No hay pacientes registrados</p>
            <p className="text-amber-700 text-sm mt-1">
              Para crear citas, primero necesitas registrar pacientes en la sección de Pacientes.
            </p>
          </div>
        )}

        {citas.length === 0 && pacientes.length > 0 && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <Calendar className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-800 mb-2">No hay citas programadas</h3>
            <p className="text-blue-700 mb-4">Crea tu primera cita haciendo clic en "Nueva Cita"</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#1a6b32] text-white rounded-lg hover:bg-[#155529] transition"
            >
              Crear Primera Cita
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 capitalize">{monthName}</h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1 text-gray-500" />
                    <span>Citas ordenadas por hora (más temprana primero)</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => changeMonth(-1)} 
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Mes anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setCurrentDate(new Date())} 
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
                  >
                    Hoy
                  </button>
                  <button 
                    onClick={() => changeMonth(1)} 
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Mes siguiente"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-2 rounded-lg border border-transparent" />
              ))}
              {renderCalendarDays()}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Filtrar por Estado</h3>
              <div className="space-y-2">
                {["todas", "pendiente", "confirmada", "completada", "cancelada"].map((estado) => (
                  <label key={estado} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="estado"
                      value={estado}
                      checked={filterEstado === estado}
                      onChange={(e) => setFilterEstado(e.target.value)}
                      className="w-4 h-4 text-[#1a6b32] focus:ring-[#1a6b32]"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {estado === "todas" ? "Todas las citas" : estado}
                    </span>
                    {estado !== "todas" && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {citas.filter(c => c.estado === estado).length}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Today's Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Citas de Hoy</h3>
                <span className="text-sm text-gray-500">{formatDate(new Date())}</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {citasDelDia(formatDate(new Date())).length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">No hay citas programadas para hoy</p>
                  </div>
                ) : (
                  citasDelDia(formatDate(new Date())).map((cita) => {
                    const paciente = getPacienteById(cita.id_paciente) || {
                      nombres: cita.paciente_nombre || '',
                      apellidos: cita.paciente_apellido || ''
                    }
                    return (
                      <div key={cita.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <Clock size={14} className="text-gray-500 mr-2" />
                              <p className="font-medium text-gray-800 text-sm">
                                {cita.hora} - {agregarMinutos(cita.hora, cita.duracion)}
                              </p>
                            </div>
                            <div className="flex items-center mb-2">
                              <User size={14} className="text-gray-500 mr-2" />
                              <p className="text-xs text-gray-600">
                                {paciente.nombres} {paciente.apellidos}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-semibold rounded capitalize ${
                                  cita.estado === "confirmada"
                                    ? "bg-[#99d6e8]/30 text-[#1a6b32]"
                                    : cita.estado === "pendiente"
                                      ? "bg-[#669933]/30 text-[#1a6b32]"
                                      : cita.estado === "completada"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {cita.estado}
                              </span>
                              <span className="text-xs text-gray-500">
                                {tiposDeVisita[cita.tipo_cita]?.label || cita.tipo_cita}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <button
                              onClick={() => handleEdit(cita)}
                              className="p-1 text-[#669933] hover:bg-green-50 rounded transition"
                              title="Editar cita"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(cita.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                              title="Eliminar cita"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Estadísticas Rápidas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">Citas Confirmadas</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {citas.filter(c => c.estado === 'confirmada').length}
                  </p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-sm text-amber-700">Citas Pendientes</p>
                  <p className="text-2xl font-bold text-amber-800">
                    {citas.filter(c => c.estado === 'pendiente').length}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">Citas Completadas</p>
                  <p className="text-2xl font-bold text-green-800">
                    {citas.filter(c => c.estado === 'completada').length}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">Total Pacientes</p>
                  <p className="text-2xl font-bold text-gray-800">{pacientes.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showForm && (
          <CitaForm
            cita={selectedCita || undefined}
            pacientes={pacientes}
            onSave={handleSaveCita}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
              setSelectedCita(null)
            }}
          />
        )}

        {selectedCita && !showForm && (
          <CitaModal
            cita={selectedCita}
            paciente={getPacienteById(selectedCita.id_paciente) || {
              nombres: selectedCita.paciente_nombre || '',
              apellidos: selectedCita.paciente_apellido || ''
            }}
            onClose={() => setSelectedCita(null)}
            onEdit={() => handleEdit(selectedCita)}
            onDelete={() => {
              handleDelete(selectedCita.id)
              setSelectedCita(null)
            }}
          />
        )}

        {/* Modal de conflicto de horario */}
        {conflictoHorario && (
          <ConflictoHorarioModal
            conflicto={conflictoHorario}
            onCancel={handleCancelConflicto}
            onOverride={handleOverrideConflicto}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}

function agregarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number)
  const totalMinutos = h * 60 + m + minutos
  const horas = Math.floor(totalMinutos / 60)
  const mins = totalMinutos % 60
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}