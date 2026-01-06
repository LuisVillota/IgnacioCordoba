"use client"

import { useState, useEffect } from "react"
import { 
  Plus, 
  Edit2, 
  Eye, 
  Trash2, 
  Scissors, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  Filter, 
  CheckCircle,
  Clock,
  User,
  X
} from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { ProgramacionForm } from "../components/ProgramacionForm"
import { ProgramacionModal } from "../components/ProgramacionModal"
import { api, handleApiError } from "../lib/api"

export interface ProgramacionBackend {
  numero_documento: string
  fecha: string
  hora: string
  duracion: number
  procedimiento_id: number
  anestesiologo: string
  estado: "Programado" | "Aplazado" | "Confirmado" | "En Quirofano" | "Operado" | "Cancelado"
  observaciones: string
}

export interface Programacion {
  id: string
  numero_documento: string
  fecha: string
  hora: string
  duracion: number
  procedimiento_id: string
  anestesiologo: string
  estado: "Programado" | "Aplazado" | "Confirmado" | "En Quirofano" | "Operado" | "Cancelado"
  observaciones: string
  paciente_nombre?: string
  paciente_apellido?: string
  procedimiento_nombre?: string
  procedimiento_precio?: number
}

export default function ProgramacionQuirurgicaPage() {
  const [programaciones, setProgramaciones] = useState<Programacion[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedProgramacion, setSelectedProgramacion] = useState<Programacion | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todas")
  const [filterFecha, setFilterFecha] = useState<"todas" | "hoy" | "semana" | "mes">("todas")
  const [filterDocumento, setFilterDocumento] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    programados: 0,
    confirmados: 0,
    enQuirofano: 0,
    operados: 0,
    cancelados: 0,
    aplazados: 0
  })

  // Función para formatear hora en formato 12 horas
  const formatHora = (hora: string): string => {
    if (!hora) return "00:00 AM";
    
    try {
      // Si es un formato PT14H (duración ISO 8601)
      if (hora.startsWith('PT')) {
        const horasMatch = hora.match(/PT(\d+)H/);
        const horas = horasMatch ? parseInt(horasMatch[1]) : 0;
        
        // Formato 12 horas con AM/PM
        const ampm = horas >= 12 ? 'PM' : 'AM';
        const horas12 = horas % 12 || 12;
        
        return `${horas12.toString().padStart(2, '0')}:00 ${ampm}`;
      }
      
      // Si ya es un formato HH:MM:SS o HH:MM
      if (hora.includes(':')) {
        const partes = hora.split(':');
        const horas = parseInt(partes[0]);
        const minutos = partes[1] ? parseInt(partes[1]) : 0;
        
        // Formato 12 horas con AM/PM
        const ampm = horas >= 12 ? 'PM' : 'AM';
        const horas12 = horas % 12 || 12;
        
        return `${horas12.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')} ${ampm}`;
      }
      
      // Si es solo un número
      const horasNum = parseInt(hora);
      if (!isNaN(horasNum)) {
        const ampm = horasNum >= 12 ? 'PM' : 'AM';
        const horas12 = horasNum % 12 || 12;
        return `${horas12.toString().padStart(2, '0')}:00 ${ampm}`;
      }
      
      return hora;
    } catch (error) {
      console.error("❌ Error formateando hora:", error, "hora original:", hora);
      return hora;
    }
  };

  // Función para formatear moneda
  const formatCurrency = (amount: number | undefined): string => {
    if (!amount) return "$0";
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    loadProgramaciones()
  }, [filterEstado, filterFecha, refreshKey])

  useEffect(() => {
    // Si hay filtro de documento, buscar programaciones específicas
    if (filterDocumento.trim() !== "") {
      buscarPorDocumento(filterDocumento)
    } else if (filterDocumento.trim() === "" && refreshKey > 0) {
      // Si se borró el filtro, recargar todas las programaciones
      loadProgramaciones()
    }
  }, [filterDocumento])

  const loadProgramaciones = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params: any = {
        limit: 100,
        offset: 0
      }
      
      if (filterEstado !== "todas") {
        const estadoMap: Record<string, string> = {
          "programado": "Programado",
          "confirmado": "Confirmado",
          "aplazado": "Aplazado",
          "en_quirofano": "En Quirofano",
          "operado": "Operado",
          "cancelado": "Cancelado"
        }
        
        if (estadoMap[filterEstado]) {
          params.estado = estadoMap[filterEstado]
        }
      }

      if (filterFecha !== "todas") {
        const hoy = new Date().toISOString().split('T')[0]
        
        if (filterFecha === "hoy") {
          params.fecha_inicio = hoy
          params.fecha_fin = hoy
        } else if (filterFecha === "semana") {
          const semanaPasada = new Date()
          semanaPasada.setDate(semanaPasada.getDate() - 7)
          params.fecha_inicio = semanaPasada.toISOString().split('T')[0]
          params.fecha_fin = hoy
        } else if (filterFecha === "mes") {
          const mesPasado = new Date()
          mesPasado.setMonth(mesPasado.getMonth() - 1)
          params.fecha_inicio = mesPasado.toISOString().split('T')[0]
          params.fecha_fin = hoy
        }
      }
      
      console.log("📥 Cargando programaciones con params:", params);
      
      const response = await api.getAgendaProcedimientos(
        params.limit,
        params.offset,
        undefined,
        params.estado,
        undefined,
        params.fecha_inicio,
        params.fecha_fin
      )
      
      console.log("📥 Respuesta de getAgendaProcedimientos:", response);
      
      if (response && response.procedimientos) {
        const programacionesFormateadas = response.procedimientos.map((proc: any) => {
          return {
            id: proc.id.toString(),
            numero_documento: proc.numero_documento || "",
            fecha: proc.fecha,
            hora: proc.hora || "09:00",
            duracion: proc.duracion || 60,
            procedimiento_id: proc.procedimiento_id?.toString() || "0",
            anestesiologo: proc.anestesiologo || "",
            estado: proc.estado as Programacion["estado"],
            observaciones: proc.observaciones || "",
            paciente_nombre: proc.paciente_nombre,
            paciente_apellido: proc.paciente_apellido,
            procedimiento_nombre: proc.procedimiento_nombre,
            procedimiento_precio: proc.procedimiento_precio
          }
        })
        
        console.log(`Programaciones formateadas: ${programacionesFormateadas.length} registros`);
        setProgramaciones(programacionesFormateadas)
        
        // Calcular estadísticas de la lista cargada
        calcularEstadisticas(programacionesFormateadas)
      } else {
        console.log("⚠️ No hay programaciones o respuesta vacía");
        setProgramaciones([])
        setStats({
          total: 0,
          programados: 0,
          confirmados: 0,
          enQuirofano: 0,
          operados: 0,
          cancelados: 0,
          aplazados: 0
        })
      }
    } catch (err: any) {
      console.error("❌ Error cargando programaciones:", err);
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const buscarPorDocumento = async (documento: string) => {
    if (documento.trim() === "") {
      loadProgramaciones()
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await api.getAgendaProcedimientos(
        100,
        0,
        undefined,
        undefined,
        documento
      )
      
      if (response && response.procedimientos) {
        const programacionesFormateadas = response.procedimientos.map((proc: any) => ({
          id: proc.id.toString(),
          numero_documento: proc.numero_documento || "",
          fecha: proc.fecha,
          hora: proc.hora || "09:00",
          duracion: proc.duracion || 60,
          procedimiento_id: proc.procedimiento_id?.toString() || "0",
          anestesiologo: proc.anestesiologo || "",
          estado: proc.estado as Programacion["estado"],
          observaciones: proc.observaciones || "",
          paciente_nombre: proc.paciente_nombre,
          paciente_apellido: proc.paciente_apellido,
          procedimiento_nombre: proc.procedimiento_nombre,
          procedimiento_precio: proc.procedimiento_precio
        }))
        
        setProgramaciones(programacionesFormateadas)
        calcularEstadisticas(programacionesFormateadas)
      } else {
        setProgramaciones([])
      }
    } catch (err: any) {
      console.error("❌ Error buscando por documento:", err);
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const calcularEstadisticas = (programacionesList: Programacion[]) => {
    const estadisticas = {
      total: programacionesList.length,
      programados: programacionesList.filter(p => p.estado === "Programado").length,
      confirmados: programacionesList.filter(p => p.estado === "Confirmado").length,
      enQuirofano: programacionesList.filter(p => p.estado === "En Quirofano").length,
      operados: programacionesList.filter(p => p.estado === "Operado").length,
      cancelados: programacionesList.filter(p => p.estado === "Cancelado").length,
      aplazados: programacionesList.filter(p => p.estado === "Aplazado").length
    }
    
    setStats(estadisticas)
    console.log("📊 Estadísticas calculadas:", estadisticas)
  }

  const handleEdit = (prog: Programacion) => {
    console.log("✏️ Editando programación:", {
      id: prog.id,
      procedimiento_id: prog.procedimiento_id,
      tipo: typeof prog.procedimiento_id
    });
    setSelectedProgramacion(prog)
    setEditingId(prog.id)
    setShowForm(true)
  }

  const filteredProgramaciones = programaciones.filter((p) => {
    // Aplicar filtro de estado
    const estadoMatch = filterEstado === "todas" || 
                       p.estado.toLowerCase().replace(" ", "_") === filterEstado
    
    // Aplicar filtro de documento si existe
    const documentoMatch = !filterDocumento || 
                          p.numero_documento.toLowerCase().includes(filterDocumento.toLowerCase()) ||
                          (p.paciente_nombre && p.paciente_nombre.toLowerCase().includes(filterDocumento.toLowerCase())) ||
                          (p.paciente_apellido && p.paciente_apellido.toLowerCase().includes(filterDocumento.toLowerCase()))
    
    return estadoMatch && documentoMatch
  })

  const handleSaveProgramacion = async (data: Omit<Programacion, "id">) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      console.log("📤 Iniciando guardado de programación:", {
        editingId,
        datosRecibidos: data,
        procedimiento_id: data.procedimiento_id,
        tipo_procedimiento_id: typeof data.procedimiento_id
      });
      
      const procedimientoIdStr = data.procedimiento_id.toString();

      // CORRECCIÓN: Validación simplificada y clara
      if (procedimientoIdStr === "0" || !procedimientoIdStr.trim()) {
        console.error("❌ procedimiento_id no seleccionado");
        setError("Por favor selecciona un procedimiento de la lista");
        setLoading(false);
        return;
      }

      // CORRECCIÓN: Conversión y validación simplificada
      const procedimientoIdNum = parseInt(procedimientoIdStr, 10);
      
      if (isNaN(procedimientoIdNum) || procedimientoIdNum <= 0) {
        console.error("❌ procedimiento_id no válido:", procedimientoIdStr);
        setError("El procedimiento seleccionado no existe. Por favor selecciona uno diferente de la lista.");
        setLoading(false);
        return;
      }

      console.log("procedimiento_id convertido correctamente a número:", procedimientoIdNum);

      let horaFormateada = data.hora;
      if (horaFormateada.includes(":") && horaFormateada.split(":").length === 2) {
        horaFormateada += ":00";
      }

      const datosParaBackend = {
        numero_documento: data.numero_documento,
        fecha: data.fecha,
        hora: horaFormateada,
        procedimiento_id: procedimientoIdNum,
        duracion: data.duracion,
        anestesiologo: data.anestesiologo,
        estado: data.estado,
        observaciones: data.observaciones
      }

      console.log("📤 Datos para enviar al backend:", {
        ...datosParaBackend,
        procedimiento_id_tipo: typeof datosParaBackend.procedimiento_id
      });

      let response;
      if (editingId) {
        const editingIdNum = parseInt(editingId);
        if (isNaN(editingIdNum)) {
          setError("ID de edición inválido");
          setLoading(false);
          return;
        }
        console.log(`🔄 Actualizando programación ID: ${editingIdNum}`);
        response = await api.updateAgendaProcedimiento(editingIdNum, datosParaBackend);
      } else {
        console.log(`🆕 Creando nueva programación`);
        response = await api.createAgendaProcedimiento(datosParaBackend);
      }
      
      console.log("📥 Respuesta del backend:", response);
      
      // 🔴 **CORRECCIÓN CRÍTICA: Manejar respuesta como objeto**
      if (response && response.error === true) {
        // Esto es un error del backend
        console.log("⚠️ Respuesta de error del backend:", response);
        
        // Manejar diferentes tipos de errores
        if (response.isConflictError) {
          // Conflicto de horario - mostramos en el formulario
          setError(`⚠️ ${response.message || "Conflicto de horario"}. Por favor selecciona otra hora.`);
        } else if (response.isValidationError) {
          // Error de validación (procedimiento_id no es número, etc.)
          setError(`❌ ${response.message || "Error de validación"}`);
        } else if (response.isNotFoundError) {
          // No encontrado
          setError(`❌ ${response.message || "Recurso no encontrado"}`);
        } else if (response.isNetworkError) {
          // Error de red
          setError("❌ Error de conexión. Verifica tu conexión a internet.");
        } else {
          // Otros errores
          setError(`❌ ${response.message || "Error desconocido"}`);
        }
        
        setLoading(false);
        return;
      }
      
      // 🔴 **SI ES ÉXITO**: response debería ser el objeto normal sin propiedad 'error'
      if (response && response.success !== false) {
        setSuccessMessage(editingId ? 
          "Programación actualizada correctamente" : 
          "Programación creada correctamente"
        );
        
        // Limpiar filtro de documento si existe
        if (filterDocumento) {
          setFilterDocumento("");
        }
        
        // Recargar datos después de un pequeño delay
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 500);
        
        setShowForm(false);
        setEditingId(null);
        setSelectedProgramacion(null);
        setLoading(false);
      } else {
        // Respuesta inesperada
        console.error("❌ Respuesta inesperada:", response);
        setError("❌ Respuesta inesperada del servidor");
        setLoading(false);
      }

    } catch (err: any) {
      // **CORRECCIÓN: Este catch solo debería ejecutarse para errores no manejados**
      console.error("❌ Error no manejado en handleSaveProgramacion:", err);
      
      // Manejar caso donde el error ya fue manejado por fetchAPI
      if (err && typeof err === 'object' && 'error' in err && err.error === true) {
        // Ya fue manejado
        setLoading(false);
        return;
      }
      
      const errorMsg = err.message || "Error desconocido";
      
      // Manejo de errores de red u otros
      if (errorMsg.includes("network") || errorMsg.includes("failed to fetch")) {
        setError("❌ Error de conexión. Verifica que el backend esté funcionando.");
      } else {
        setError(`❌ ${handleApiError(err)}`);
      }
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas cancelar esta programación?\n\nEsta acción cambiará el estado a 'Cancelado'.")) {
      setLoading(true);
      setError(null);
      
      try {
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
          setError("ID inválido");
          return;
        }
        
        console.log(`🗑️ Cancelando programación ID: ${idNum}`);
        
        // Primero obtenemos la programación actual
        const programacionActual = programaciones.find(p => p.id === id);
        if (!programacionActual) {
          setError("Programación no encontrada");
          return;
        }
        
        // Creamos datos para actualizar el estado a Cancelado
        const datosParaCancelar = {
          numero_documento: programacionActual.numero_documento,
          fecha: programacionActual.fecha,
          hora: programacionActual.hora,
          duracion: programacionActual.duracion,
          procedimiento_id: parseInt(programacionActual.procedimiento_id),
          anestesiologo: programacionActual.anestesiologo,
          estado: "Cancelado" as const,
          observaciones: programacionActual.observaciones || `Cancelado el ${new Date().toLocaleDateString()}`
        };
        
        // Actualizar el estado a Cancelado en lugar de eliminar
        await api.updateAgendaProcedimiento(idNum, datosParaCancelar);
        
        setSuccessMessage("Programación cancelada exitosamente");
        
        // Limpiar filtro de documento si existe
        if (filterDocumento) {
          setFilterDocumento("");
        }
        
        // Recargar datos
        setRefreshKey(prev => prev + 1);
      } catch (err: any) {
        console.error("❌ Error cancelando programación:", err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    }
  }

  const handleChangeEstado = async (id: string, nuevoEstado: Programacion["estado"]) => {
    setLoading(true);
    setError(null);
    
    try {
      const idNum = parseInt(id);
      if (isNaN(idNum)) {
        setError("ID inválido");
        return;
      }
      
      const programacionActual = programaciones.find(p => p.id === id);
      if (!programacionActual) {
        setError("Programación no encontrada");
        return;
      }
      
      const datosActualizar = {
        numero_documento: programacionActual.numero_documento,
        fecha: programacionActual.fecha,
        hora: programacionActual.hora,
        duracion: programacionActual.duracion,
        procedimiento_id: parseInt(programacionActual.procedimiento_id),
        anestesiologo: programacionActual.anestesiologo,
        estado: nuevoEstado,
        observaciones: programacionActual.observaciones || ""
      };
      
      await api.updateAgendaProcedimiento(idNum, datosActualizar);
      
      setSuccessMessage(`Estado cambiado a "${nuevoEstado}"`);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      console.error("❌ Error cambiando estado:", err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const estadoColors: Record<string, string> = {
    "Programado": "bg-blue-100 text-blue-800 border border-blue-200",
    "Confirmado": "bg-green-100 text-green-800 border border-green-200",
    "Aplazado": "bg-orange-100 text-orange-800 border border-orange-200",
    "En Quirofano": "bg-purple-100 text-purple-800 border border-purple-200",
    "Operado": "bg-indigo-100 text-indigo-800 border border-indigo-200",
    "Cancelado": "bg-red-100 text-red-800 border border-red-200",
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "Confirmado": return "✅";
      case "Operado": return "🏥";
      case "En Quirofano": return "⚕️";
      case "Cancelado": return "❌";
      case "Aplazado": return "⏸️";
      default: return "📅";
    }
  }

  const clearFilters = () => {
    setFilterEstado("todas");
    setFilterFecha("todas");
    setFilterDocumento("");
  }

  return (
    <ProtectedRoute permissions={["ver_programacion"]}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Programación Quirúrgica</h1>
            <p className="text-gray-600 mt-2">Gestiona las cirugías programadas</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              disabled={loading}
              className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              <span>Actualizar</span>
            </button>
            <ProtectedRoute permissions={["crear_programacion"]}>
              <button
                onClick={() => {
                  console.log("➕ Abriendo formulario para nueva programación");
                  setEditingId(null);
                  setSelectedProgramacion(null);
                  setShowForm(true);
                }}
                className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
              >
                <Plus size={20} />
                <span>Nueva Programación</span>
              </button>
            </ProtectedRoute>
          </div>
        </div>

        {/* Mensajes de éxito y error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Cerrar
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-green-700 font-medium">Éxito</p>
              <p className="text-green-600 text-sm mt-1">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700 text-sm"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="text-blue-600" size={20} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Programados</p>
                <p className="text-2xl font-bold text-blue-600">{stats.programados}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="text-blue-600">📅</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Confirmados</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmados}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <span className="text-green-600">✅</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">En Quirófano</p>
                <p className="text-2xl font-bold text-purple-600">{stats.enQuirofano}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <span className="text-purple-600">⚕️</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Operados</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.operados}</p>
              </div>
              <div className="bg-indigo-100 p-2 rounded-lg">
                <span className="text-indigo-600">🏥</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cancelados</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelados}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <span className="text-red-600">❌</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Aplazados</p>
                <p className="text-2xl font-bold text-orange-600">{stats.aplazados}</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-lg">
                <span className="text-orange-600">⏸️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center mb-4">
            <Filter size={18} className="text-gray-500 mr-2" />
            <h3 className="font-medium text-gray-700">Filtros</h3>
            {(filterEstado !== "todas" || filterFecha !== "todas" || filterDocumento) && (
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-[#1a6b32] hover:text-[#155529]"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por fecha</label>
              <div className="flex flex-wrap gap-2">
                {["todas", "hoy", "semana", "mes"].map((fecha) => (
                  <button
                    key={fecha}
                    onClick={() => setFilterFecha(fecha as "todas" | "hoy" | "semana" | "mes")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap flex items-center space-x-1 ${
                      filterFecha === fecha
                        ? "bg-[#1a6b32] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {fecha === "todas" ? "Todas las fechas" :
                     fecha === "hoy" ? "Hoy" :
                     fecha === "semana" ? "Última semana" : "Último mes"}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por estado</label>
              <div className="flex flex-wrap gap-2">
                {["todas", "Programado", "Confirmado", "Aplazado", "En Quirofano", "Operado", "Cancelado"].map((estado) => (
                  <button
                    key={estado}
                    onClick={() => setFilterEstado(estado.toLowerCase().replace(" ", "_"))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                      filterEstado === estado.toLowerCase().replace(" ", "_")
                        ? "bg-[#1a6b32] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {estado === "todas" ? "Todos" : estado}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por documento o nombre
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filterDocumento}
                  onChange={(e) => setFilterDocumento(e.target.value)}
                  placeholder="Documento, nombre o apellido..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent pr-10"
                />
                {filterDocumento && (
                  <button
                    onClick={() => setFilterDocumento("")}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mb-6 flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a6b32]"></div>
            <span className="ml-3 text-gray-600">Cargando programaciones...</span>
          </div>
        )}

        {/* Tabla de programaciones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">paciente</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Procedimiento</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fecha/Hora</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Duración</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Anestesiólogo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProgramaciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar className="text-gray-300 mb-3" size={48} />
                        <p className="text-gray-500 font-medium mb-1">
                          {loading ? "Cargando..." : "No hay programaciones"}
                        </p>
                        {!loading && (filterEstado !== "todas" || filterFecha !== "todas" || filterDocumento) && (
                          <p className="text-gray-400 text-sm">
                            Intenta cambiar los filtros o{" "}
                            <button
                              onClick={clearFilters}
                              className="text-[#1a6b32] hover:text-[#155529] underline"
                            >
                              limpiar los filtros
                            </button>
                          </p>
                        )}
                        {!loading && filteredProgramaciones.length === 0 && programaciones.length === 0 && (
                          <p className="text-gray-400 text-sm mt-2">
                            No hay programaciones registradas.{" "}
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setSelectedProgramacion(null);
                                setShowForm(true);
                              }}
                              className="text-[#1a6b32] hover:text-[#155529] font-medium"
                            >
                              Crea tu primera programación
                            </button>
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProgramaciones.map((prog) => (
                    <tr key={prog.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-800">
                            {prog.paciente_nombre} {prog.paciente_apellido}
                          </p>
                          <p className="text-xs text-gray-600">{prog.numero_documento}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-2">
                          <Scissors size={16} className="text-[#669933] mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-gray-800">{prog.procedimiento_nombre || "No especificado"}</span>
                            {prog.procedimiento_precio && (
                              <p className="text-xs text-gray-600 mt-1">
                                {formatCurrency(prog.procedimiento_precio)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{prog.fecha}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Clock size={14} className="text-gray-400" />
                          <span>{formatHora(prog.hora)}</span> {/* Usar formatHora aquí */}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {prog.duracion} min
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User size={14} className="text-gray-400 mr-1" />
                          {prog.anestesiologo || "No especificado"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColors[prog.estado]}`}>
                            {getEstadoIcon(prog.estado)} {prog.estado}
                          </span>
                          {prog.estado === "Programado" && (
                            <ProtectedRoute permissions={["editar_programacion"]}>
                              <button
                                onClick={() => handleChangeEstado(prog.id, "Confirmado")}
                                className="text-xs text-green-600 hover:text-green-800"
                                title="Confirmar"
                              >
                                
                              </button>
                            </ProtectedRoute>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setSelectedProgramacion(prog)}
                            className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition"
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                          <ProtectedRoute permissions={["editar_programacion"]}>
                            <button
                              onClick={() => handleEdit(prog)}
                              className="p-2 text-[#669933] hover:bg-green-50 rounded-lg transition"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                          </ProtectedRoute>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer de la tabla */}
          {filteredProgramaciones.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando <span className="font-medium">{filteredProgramaciones.length}</span> de{" "}
                  <span className="font-medium">{programaciones.length}</span> programaciones
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-600">
                    Filtrado por:{" "}
                    {filterEstado !== "todas" && (
                      <span className="font-medium mx-1">{filterEstado.replace("_", " ")}</span>
                    )}
                    {filterFecha !== "todas" && (
                      <span className="font-medium mx-1">
                        {filterFecha === "hoy" ? "hoy" : 
                         filterFecha === "semana" ? "última semana" : "último mes"}
                      </span>
                    )}
                    {filterDocumento && (
                      <span className="font-medium mx-1">"{filterDocumento}"</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formulario de programación */}
        {showForm && (
          <ProgramacionForm
            programacion={selectedProgramacion || undefined}
            onSave={handleSaveProgramacion}
            onClose={() => {
              console.log("❌ Cerrando formulario");
              setShowForm(false)
              setEditingId(null)
              setError(null)
              setSuccessMessage(null)
            }}
            isLoading={loading}
          />
        )}

        {/* Modal de detalles */}
        {selectedProgramacion && !showForm && (
          <ProgramacionModal
            programacion={selectedProgramacion}
            onClose={() => setSelectedProgramacion(null)}
            onEdit={() => handleEdit(selectedProgramacion)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}