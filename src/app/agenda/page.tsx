"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus, Edit2, Calendar, Clock, User, AlertCircle, RefreshCw, AlertTriangle, X } from "lucide-react"
import { ProtectedRoute } from "../../components/ProtectedRoute" 
import { CitaForm } from "../../components/CitaForm" 
import { CitaModal } from "../../components/CitaModal"
import { api, handleApiError } from "@/lib/api"
import { toast } from "sonner"
import type { paciente } from "../../types/paciente"

interface cita {
  id: string
  id_paciente: string
  id_usuario: string
  tipo_cita: "consulta" | "control" | "valoracion" | "programacion_quirurgica"
  fecha: string
  hora: string
  duracion: number
  estado: "pendiente" | "confirmada" | "cancelada" | "completada"
  observaciones?: string
  paciente_nombre?: string
  paciente_apellido?: string
  doctor_nombre?: string
}

interface citaConflict {
  citaExistente: cita
  nuevacita: Omit<cita, "id">
  mensaje: string
}

const tiposDeVisita = {
  consulta: { label: "Consulta", duracion: 60 },
  control: { label: "Control", duracion: 30 },
  valoracion: { label: "Valoración", duracion: 45 },
  programacion_quirurgica: { label: "Programación Quirúrgica", duracion: 60 },
}

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

const formatTime = (timeString: string): string => {
  if (!timeString) return '09:00'
  
  if (/^\d{2}:\d{2}$/.test(timeString)) return timeString
  
  const match = timeString.match(/^(\d{2}:\d{2})/)
  return match ? match[1] : '09:00'
}

const cleanTimeFormat = (timeString: string): string => {
  if (!timeString) return '09:00'
  
  const match = timeString.match(/^(\d{2}):(\d{2})/)
  if (match) {
    const horas = match[1]
    const minutos = match[2]
    return `${horas}:${minutos}`
  }
  
  return '09:00'
}

const transformBackendcita = (backendcita: any): cita => {
  
  let fecha = ''
  let hora = ''
  
  if (backendcita.fecha_hora) {
    const fechaHoraStr = backendcita.fecha_hora.toString()
    
    if (fechaHoraStr.includes(' ')) {
      const [datePart, timePart] = fechaHoraStr.split(' ')
      fecha = datePart
      hora = timePart ? formatTime(timePart) : '09:00'
    } 
    else if (fechaHoraStr.includes('T')) {
      const dateObj = new Date(fechaHoraStr)
      fecha = formatDate(dateObj)
      hora = dateObj.toTimeString().slice(0, 5)
    }
    else if (backendcita.fecha_hora instanceof Date) {
      fecha = formatDate(backendcita.fecha_hora)
      hora = backendcita.fecha_hora.toTimeString().slice(0, 5)
    }
  } else if (backendcita.fecha && backendcita.hora) {
    fecha = backendcita.fecha
    hora = formatTime(backendcita.hora)
  }
  
  if (!fecha) {
    fecha = formatDate(new Date())
  }

  let estado: cita["estado"] = "pendiente"
  if (backendcita.estado_id) {
    switch(backendcita.estado_id) {
      case 1: estado = "cancelada"; break;
      case 2: estado = "confirmada"; break;
      case 3: estado = "completada"; break;
      case 4: estado = "pendiente"; break;
      default: estado = "pendiente";
    }
  } else if (backendcita.estado_nombre) {
    const estadoLower = backendcita.estado_nombre.toLowerCase()
    if (estadoLower.includes('confirm')) estado = "confirmada"
    else if (estadoLower.includes('complet')) estado = "completada"
    else if (estadoLower.includes('cancel')) estado = "cancelada"
    else if (estadoLower.includes('pendient')) estado = "pendiente"
  } else if (backendcita.estado) {
    const estadoLower = backendcita.estado.toLowerCase()
    if (estadoLower.includes('confirm')) estado = "confirmada"
    else if (estadoLower.includes('complet')) estado = "completada"
    else if (estadoLower.includes('cancel')) estado = "cancelada"
    else if (estadoLower.includes('pendient')) estado = "pendiente"
  }

  let tipo_cita: cita["tipo_cita"] = "consulta"
  if (backendcita.tipo) {
    const tipoLower = backendcita.tipo.toLowerCase()
    if (tipoLower.includes('control')) tipo_cita = "control"
    else if (tipoLower.includes('valora')) tipo_cita = "valoracion"
    else if (tipoLower.includes('program') || tipoLower.includes('quirur')) tipo_cita = "programacion_quirurgica"
    else if (tipoLower.includes('consulta')) tipo_cita = "consulta"
  }

  const cita: cita = {
    id: backendcita.id?.toString() || backendcita.cita_id?.toString() || Date.now().toString(),
    id_paciente: backendcita.paciente_id?.toString() || backendcita.id_paciente?.toString() || '',
    id_usuario: backendcita.usuario_id?.toString() || backendcita.id_usuario?.toString() || '1',
    tipo_cita: tipo_cita,
    fecha: fecha,
    hora: hora,
    duracion: backendcita.duracion || backendcita.duracion_minutos || 30,
    estado: estado,
    observaciones: backendcita.observaciones || backendcita.notas || '',
    paciente_nombre: backendcita.paciente_nombre || backendcita.nombres || backendcita.nombre || '',
    paciente_apellido: backendcita.paciente_apellido || backendcita.apellidos || backendcita.apellido || '',
    doctor_nombre: backendcita.doctor_nombre || backendcita.doctor || backendcita.usuario_nombre || 'Dr. No Especificado',
  }

  return cita
}

const transformBackendpaciente = (backendpaciente: any): paciente => {
  return {
    id: backendpaciente.id?.toString() || '',
    nombres: backendpaciente.nombres || backendpaciente.nombre || '',
    apellidos: backendpaciente.apellidos || backendpaciente.apellido || '',
    tipo_documento: backendpaciente.tipo_documento || 'CC',
    documento: backendpaciente.documento || backendpaciente.numero_documento || '',
    fecha_nacimiento: backendpaciente.fecha_nacimiento || new Date().toISOString().split('T')[0],
    genero: backendpaciente.genero || 'no especificado',
    telefono: backendpaciente.telefono || '',
    email: backendpaciente.email || '',
    direccion: backendpaciente.direccion || '',
    ciudad: backendpaciente.ciudad || '',
    estado_paciente: backendpaciente.estado_paciente || 'activo',
    fecha_registro: backendpaciente.fecha_registro || new Date().toISOString().split('T')[0]
  }
}

// Función para crear paciente por defecto
const crearPacientePorDefecto = (id: string, nombres?: string, apellidos?: string): paciente => {
  const hoy = new Date().toISOString().split('T')[0]
  return {
    id: id,
    nombres: nombres || '',
    apellidos: apellidos || '',
    tipo_documento: 'CC',
    documento: '',
    fecha_nacimiento: hoy,
    genero: 'no especificado',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    estado_paciente: 'activo',
    fecha_registro: hoy
  }
}

const ordenarcitasPorFechaHoraAscendente = (citasArray: cita[]): cita[] => {
  
  const citasOrdenadas = citasArray.sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime()
    const fechaB = new Date(b.fecha).getTime()
    
    if (fechaA !== fechaB) {
      return fechaA - fechaB
    }
    
    const [horaA, minutoA] = a.hora.split(':').map(Number)
    const [horaB, minutoB] = b.hora.split(':').map(Number)
    
    const minutosA = horaA * 60 + (minutoA || 0)
    const minutosB = horaB * 60 + (minutoB || 0)
    
    return minutosA - minutosB
  })
  
  return citasOrdenadas
}

const getEstadoId = (estado: string): number => {
  switch(estado) {
    case 'pendiente': return 4;
    case 'confirmada': return 2;
    case 'completada': return 3;
    case 'cancelada': return 1;
    default: return 4;
  }
}

function ConflictoHorarioModal({ 
  conflicto, 
  onCancel, 
  onOverride 
}: { 
  conflicto: citaConflict
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
              <h4 className="font-semibold text-blue-800 mb-2">Nueva cita:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{conflicto.nuevacita.fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">
                    {conflicto.nuevacita.hora} - {agregarMinutos(conflicto.nuevacita.hora, conflicto.nuevacita.duracion)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{tiposDeVisita[conflicto.nuevacita.tipo_cita]?.label}</span>
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

export default function AgendaPage() {
  const [citas, setcitas] = useState<cita[]>([])
  const [pacientes, setpacientes] = useState<paciente[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [selectedcita, setSelectedcita] = useState<cita | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todas")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [conflictoHorario, setConflictoHorario] = useState<citaConflict | null>(null)
  const [pendienteGuardar, setPendienteGuardar] = useState<Omit<cita, "id"> | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const testBackendConnection = async () => {
    setTestingConnection(true)
    try {
      const result = await api.testConnection()
      
      if (result.success) {
        toast.success("✅ Backend conectado correctamente")
        return true
      } else {
        toast.warning(`⚠️ Backend no disponible: ${result.message}`)
        return false
      }
    } catch (error) {
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
      
      const isBackendAvailable = await testBackendConnection()
      
      if (!isBackendAvailable) {
        setcitas([])
        setpacientes([])
        setUseMockData(false)
        toast.error("El backend no está disponible. No se pueden cargar los datos.")
        return
      }
      
      try {
        let citasResponse
        try {
          citasResponse = await api.getcitas(100, 0)
        } catch (citaError: any) {
          throw new Error(`No se pudieron cargar las citas: ${handleApiError(citaError)}`)
        }
        
        let citasArray: any[] = []
        
        if (Array.isArray(citasResponse)) {
          citasArray = citasResponse
        } else if (citasResponse?.citas && Array.isArray(citasResponse.citas)) {
          citasArray = citasResponse.citas
        } else if (citasResponse?.data && Array.isArray(citasResponse.data)) {
          citasArray = citasResponse.data
        } else if (citasResponse && typeof citasResponse === 'object') {
          const possibleKeys = ['citas', 'appointments', 'items', 'results']
          for (const key of possibleKeys) {
            if (Array.isArray(citasResponse[key])) {
              citasArray = citasResponse[key]
              break
            }
          }
        }
        
        const transformedcitas = citasArray.map(transformBackendcita)
        const citasOrdenadas = ordenarcitasPorFechaHoraAscendente(transformedcitas)
        
        const validcitas = citasOrdenadas.filter(c => c.fecha && c.hora)
        
        setcitas(validcitas)
        
        let pacientesResponse
        try {
          pacientesResponse = await api.getpacientes(100, 0)
        } catch (pacienteError: any) {
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
          const possibleKeys = ['pacientes', 'patients', 'items', 'results']
          for (const key of possibleKeys) {
            if (Array.isArray(pacientesResponse[key])) {
              pacientesArray = pacientesResponse[key]
              break
            }
          }
        }
        
        const transformedpacientes = pacientesArray.map(transformBackendpaciente)
        setpacientes(transformedpacientes)
        
        setUseMockData(false)
        
        if (validcitas.length === 0) {
          toast.info("No hay citas programadas. ¡Crea tu primera cita!")
        }
        if (transformedpacientes.length === 0) {
          toast.warning("No hay pacientes registrados.")
        }
        
      } catch (apiError: any) {
        setcitas([])
        setpacientes([])
        setUseMockData(false)
        setError(`Error cargando datos: ${apiError.message}`)
        
        toast.error("Error cargando los datos. Por favor, verifica la conexión con el backend.")
      }
      
    } catch (error: any) {
      const errorMsg = error.message || "Error desconocido al cargar datos"
      setError(errorMsg)
      toast.error("Error al cargar los datos: " + errorMsg)
      
      setcitas([])
      setpacientes([])
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
    
    const citasOrdenadas = citasFiltradas.sort((a, b) => {
      const [horaA, minutoA] = a.hora.split(':').map(Number)
      const [horaB, minutoB] = b.hora.split(':').map(Number)
      
      const minutosA = horaA * 60 + (minutoA || 0)
      const minutosB = horaB * 60 + (minutoB || 0)
      
      return minutosA - minutosB
    })
    
    return citasOrdenadas
  }

  const verificarConflictoHorario = (nuevaCita: Omit<cita, "id">, idExcluir?: string): citaConflict | null => {
    const nuevaInicio = minutosDesdeHora(nuevaCita.hora)
    const nuevaFin = nuevaInicio + nuevaCita.duracion

    for (const cita of citas) {
      if (idExcluir && cita.id === idExcluir) continue
      if (cita.estado === "cancelada") continue
      if (formatDate(cita.fecha) !== formatDate(nuevaCita.fecha)) continue

      const citaInicio = minutosDesdeHora(cita.hora)
      const citaFin = citaInicio + cita.duracion

      if (Math.max(nuevaInicio, citaInicio) < Math.min(nuevaFin, citaFin)) {
        const mensaje = nuevaInicio === citaInicio && nuevaFin === citaFin
          ? "Ya existe una cita exactamente en el mismo horario."
          : `Las citas se superponen por ${Math.min(nuevaFin, citaFin) - Math.max(nuevaInicio, citaInicio)} minutos.`
        return { citaExistente: cita, nuevacita: nuevaCita, mensaje }
      }
    }

    return null
  }

  const minutosDesdeHora = (hora: string): number => {
    const [h, m] = hora.split(":").map(Number)
    return h * 60 + m
  }

  const handleSaveCita = async (data: Omit<cita, "id">) => {
    // Forzar que observaciones siempre sea string
    data.observaciones = data.observaciones || ""

    try {
      if (!data.id_paciente || !data.fecha || !data.hora || !data.id_usuario) {
        toast.error("Por favor completa todos los campos requeridos")
        return
      }

      const usuarioId = parseInt(data.id_usuario);
      if (isNaN(usuarioId)) {
        data.id_usuario = "1";
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
        toast.error("Formato de fecha inválido. Use YYYY-MM-DD")
        return
      }

      if (!/^\d{2}:\d{2}/.test(data.hora)) {
        toast.error("Formato de hora inválido. Use HH:MM")
        return
      }

      const conflicto = verificarConflictoHorario(data, editingId || undefined)

      if (conflicto) {
        setConflictoHorario(conflicto)
        setPendienteGuardar(data)
        return
      }

      await guardarcitaSinConflicto(data)

    } catch (error: any) {
      toast.error('Error al guardar la cita: ' + (error.message || "Error desconocido"))
    }
  }

  const guardarcitaSinConflicto = async (data: Omit<cita, "id">) => {
    try {
      const horaFormateada = cleanTimeFormat(data.hora)
      
      const citaData = {
        paciente_id: parseInt(data.id_paciente),
        usuario_id: parseInt(data.id_usuario) || 1,
        fecha_hora: `${data.fecha}T${horaFormateada}:00`,
        tipo: data.tipo_cita === "programacion_quirurgica" ? "program_quir" : data.tipo_cita,
        duracion_minutos: data.duracion,
        estado_id: getEstadoId(data.estado),
        notas: data.observaciones || ''
      };
      
      if (editingId) {
        await api.updatecita(parseInt(editingId), citaData)
        await loadData()
        
        toast.success('Cita actualizada exitosamente')
        setEditingId(null)
      } else {
        await api.createcita(citaData)
        await loadData()
        
        toast.success('Cita creada exitosamente')
      }
      
      setShowForm(false)
      
    } catch (apiError: any) {
      const errorMsg = handleApiError(apiError)
      toast.error(`Error: ${errorMsg}`)
      toast.error('No se pudo guardar la cita. Por favor, inténtalo de nuevo.')
    }
  }

  const handleOverrideConflicto = async () => {
    if (!pendienteGuardar) return
    
    await guardarcitaSinConflicto(pendienteGuardar)
    
    setConflictoHorario(null)
    setPendienteGuardar(null)
    
    toast.warning("Cita creada a pesar del conflicto de horario")
  }

  const handleCancelConflicto = () => {
    setConflictoHorario(null)
    setPendienteGuardar(null)
    toast.info("Creación de cita cancelada por conflicto de horario")
  }

  const handleEdit = (cita: cita) => {
    setEditingId(cita.id)
    setSelectedcita(cita)
    setShowForm(true)
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthName = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" })

  const getpacienteById = (id: string) => {
    return pacientes.find(p => p.id === id)
  }

  const renderCalendarDays = () => {
    const today = new Date()
    const todayStr = formatDate(today)
    
    return days.map((day) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateStr = formatDate(date)
      const dayscitas = citasDelDia(dateStr)
      const isToday = todayStr === dateStr

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
              {dayscitas.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                  {dayscitas.length}
                </span>
              )}
            </div>
            {dayscitas.length > 0 && (
              <div className="flex-1 mt-1 text-xs space-y-1 overflow-y-auto">
                {dayscitas.slice(0, 3).map((cita) => {
                  const paciente = getpacienteById(cita.id_paciente) || {
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
                        setSelectedcita(cita)
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
                {dayscitas.length > 3 && (
                  <p className="text-gray-500 text-xs pl-1 font-medium">
                    +{dayscitas.length - 3} más
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
            <h1 className="text-3xl font-bold text-gray-800">Agenda y citas</h1>
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
                  setSelectedcita(null)
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
                <span>Nueva cita</span>
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
                </div>
              </div>
            </div>
          </div>
        )}

        {pacientes.length === 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium">⚠️ Atención: No hay pacientes registrados</p>
            <p className="text-amber-700 text-sm mt-1">
              Para crear citas, primero necesitas registrar pacientes en la sección de pacientes.
            </p>
          </div>
        )}

        {citas.length === 0 && pacientes.length > 0 && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <Calendar className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-800 mb-2">No hay citas programadas</h3>
            <p className="text-blue-700 mb-4">Crea tu primera cita haciendo clic en "Nueva cita"</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#1a6b32] text-white rounded-lg hover:bg-[#155529] transition"
            >
              Crear Primera Cita
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2 text-sm">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-2 rounded-lg border border-transparent" />
              ))}
              {renderCalendarDays()}
            </div>
          </div>

          <div className="space-y-6">
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
                    const paciente = getpacienteById(cita.id_paciente) || {
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
                        className={`p-3 rounded-lg flex justify-between items-center text-white ${estadoColor} cursor-pointer hover:opacity-90 transition`}
                        onClick={() => handleEdit(cita)}
                        title={`${cita.hora} - ${paciente.nombres} ${paciente.apellidos} (${cita.estado}, ${tiposDeVisita[cita.tipo_cita]?.label})`}
                      >
                        <div>
                          <p className="font-medium">{paciente.nombres.split(' ')[0]} {paciente.apellidos.split(' ')[0].charAt(0)}.</p>
                          <p className="text-xs">{cita.hora} - {tiposDeVisita[cita.tipo_cita]?.label}</p>
                        </div>
                        <span className={`px-2 py-1 text-[10px] rounded ${tipoColor}`}>
                          {tiposDeVisita[cita.tipo_cita]?.label?.charAt(0)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

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
                  <p className="text-sm text-gray-700">Total pacientes</p>
                  <p className="text-2xl font-bold text-gray-800">{pacientes.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <CitaForm
            cita={selectedcita || undefined}
            pacientes={pacientes}
            onSave={handleSaveCita}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
              setSelectedcita(null)
            }}
          />
        )}

        {selectedcita && !showForm && (
          <CitaModal
            cita={selectedcita}
            paciente={getpacienteById(selectedcita.id_paciente) || 
              crearPacientePorDefecto(
                selectedcita.id_paciente,
                selectedcita.paciente_nombre,
                selectedcita.paciente_apellido
              )
            }
            onClose={() => setSelectedcita(null)}
            onEdit={() => handleEdit(selectedcita)}
            onDelete={() => {
              console.log('Eliminar cita:', selectedcita.id);
            }}
          />
        )}

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