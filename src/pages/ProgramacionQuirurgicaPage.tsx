"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Eye, Trash2, Scissors, RefreshCw, AlertCircle } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { ProgramacionForm } from "../components/ProgramacionForm"
import { ProgramacionModal } from "../components/ProgramacionModal"
import { api, handleApiError } from "../lib/api"

// Interfaz para datos que van al BACKEND (con números)
export interface ProgramacionBackend {
  numero_documento: string
  fecha: string
  hora: string
  duracion: number
  procedimiento_id: number  // ¡NÚMERO!
  anestesiologo: string
  estado: "Programado" | "Aplazado" | "Confirmado" | "En Quirofano" | "Operado" | "Cancelado"
  observaciones: string
}

// Interfaz para datos en el FRONTEND (con strings para selects)
export interface Programacion {
  id: string
  numero_documento: string
  fecha: string
  hora: string
  duracion: number
  procedimiento_id: string  // String para compatibilidad con selects HTML
  anestesiologo: string
  estado: "Programado" | "Aplazado" | "Confirmado" | "En Quirofano" | "Operado" | "Cancelado"
  observaciones: string
  // Campos adicionales para mostrar
  paciente_nombre?: string
  paciente_apellido?: string
  procedimiento_nombre?: string
  procedimiento_precio?: number
}

export function ProgramacionQuirurgicaPage() {
  const [programaciones, setProgramaciones] = useState<Programacion[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedProgramacion, setSelectedProgramacion] = useState<Programacion | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todas")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Cargar programaciones del backend
  useEffect(() => {
    loadProgramaciones()
  }, [filterEstado, refreshKey])

  const loadProgramaciones = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params: any = {
        limit: 100,
        offset: 0
      }
      
      if (filterEstado !== "todas") {
        // Convertir estado del frontend al formato del backend
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
      
      const response = await api.getAgendaProcedimientos(
        params.limit,
        params.offset,
        undefined, // fecha
        params.estado,
        undefined, // numero_documento
        undefined, // fecha_inicio
        undefined  // fecha_fin
      )
      
      console.log("📥 Programaciones recibidas:", response)
      
      if (response && response.procedimientos) {
        const programacionesFormateadas = response.procedimientos.map((proc: any) => ({
          id: proc.id.toString(),
          numero_documento: proc.numero_documento || "",
          fecha: proc.fecha,
          hora: proc.hora.substring(0, 5), // Tomar solo HH:MM
          duracion: proc.duracion || 60,
          // ⚠️ CORRECCIÓN IMPORTANTE: Mantener como STRING para los selects
          procedimiento_id: proc.procedimiento_id?.toString() || "0", 
          anestesiologo: proc.anestesiologo || "",
          estado: proc.estado as Programacion["estado"],
          observaciones: proc.observaciones || "",
          paciente_nombre: proc.paciente_nombre,
          paciente_apellido: proc.paciente_apellido,
          procedimiento_nombre: proc.procedimiento_nombre,
          procedimiento_precio: proc.procedimiento_precio
        }))
        
        console.log("📊 Programaciones formateadas:", programacionesFormateadas)
        setProgramaciones(programacionesFormateadas)
      } else {
        setProgramaciones([])
      }
    } catch (err: any) {
      console.error("Error cargando programaciones:", err)
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  // Función para editar programación
  const handleEdit = (prog: Programacion) => {
    console.log("✏️ Editando programación:", {
      id: prog.id,
      procedimiento_id: prog.procedimiento_id,
      tipo_procedimiento_id: typeof prog.procedimiento_id
    })
    
    setSelectedProgramacion(prog)
    setEditingId(prog.id)
    setShowForm(true)
  }

  const filteredProgramaciones = programaciones.filter((p) => 
    filterEstado === "todas" || p.estado.toLowerCase().replace(" ", "_") === filterEstado
  )

  const handleSaveProgramacion = async (data: Omit<Programacion, "id">) => {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      // ⚠️ CORRECCIÓN CRÍTICA: Asegurar parseo correcto
      const procedimientoIdStr = data.procedimiento_id;
      console.log("🔍 Validando procedimiento_id:", {
        valor_recibido: procedimientoIdStr,
        tipo: typeof procedimientoIdStr
      });

      // Verificar que no esté vacío
      if (!procedimientoIdStr || procedimientoIdStr.trim() === "") {
        setError("Por favor selecciona un procedimiento válido");
        setLoading(false);
        return;
      }

      // Convertir a número
      const procedimientoIdNum = parseInt(procedimientoIdStr, 10);
      
      // Validar la conversión
      if (isNaN(procedimientoIdNum)) {
        console.error("❌ Error: No se pudo convertir a número:", procedimientoIdStr);
        setError("ID de procedimiento inválido. El valor no es un número.");
        setLoading(false);
        return;
      }

      if (procedimientoIdNum <= 0) {
        setError("ID de procedimiento inválido. El ID debe ser mayor a 0.");
        setLoading(false);
        return;
      }

      // Preparar datos para backend
      const datosParaBackend = {
        numero_documento: data.numero_documento,
        fecha: data.fecha,
        hora: data.hora.includes(":") && data.hora.split(":").length === 2 ? 
              data.hora + ":00" : // Agregar segundos si no los tiene
              data.hora, // Ya tiene segundos
        procedimiento_id: procedimientoIdNum, // ¡Asegurar que es número!
        duracion: data.duracion,
        anestesiologo: data.anestesiologo,
        estado: data.estado,
        observaciones: data.observaciones
      }

      console.log("📤 Enviando datos al backend:", datosParaBackend);
      console.log("📤 Tipo de procedimiento_id:", typeof datosParaBackend.procedimiento_id);

      let response;
      if (editingId) {
        // Validar que editingId también sea número
        const editingIdNum = parseInt(editingId);
        if (isNaN(editingIdNum)) {
          setError("ID de edición inválido");
          setLoading(false);
          return;
        }
        console.log(`🔄 Actualizando programación ID: ${editingIdNum}`);
        response = await api.updateAgendaProcedimiento(editingIdNum, datosParaBackend);
      } else {
        console.log("➕ Creando nueva programación");
        response = await api.createAgendaProcedimiento(datosParaBackend);
      }

      console.log("✅ Respuesta del backend:", response);
      
      // Si llegamos aquí, fue exitoso
      setSuccessMessage(editingId ? "Actualizado correctamente" : "Creado correctamente");
      
      // Recargar y cerrar
      setRefreshKey(prev => prev + 1);
      setShowForm(false);
      setEditingId(null);
      setSelectedProgramacion(null);

    } catch (err: any) {
      console.error("❌ Error guardando programación:", err);
      
      // Manejar errores específicos
      const errorMsg = err.message || "";
      console.log("📋 Error detallado:", errorMsg);
      
      if (errorMsg.includes("procedimiento_id") || 
          errorMsg.includes("valid integer") || 
          errorMsg.includes("unable to parse") ||
          errorMsg.includes("Input should be a valid integer")) {
        setError("Error de validación: ID de procedimiento no válido. Asegúrate de seleccionar un procedimiento de la lista.");
      } else if (errorMsg.includes("Conflicto de horario")) {
        setError(err.message);
      } else if (errorMsg.includes("procedimiento no encontrado")) {
        setError("El procedimiento seleccionado no existe en la base de datos. Por favor selecciona otro.");
      } else if (errorMsg.includes("paciente con documento")) {
        setError("El paciente seleccionado no existe en la base de datos.");
      } else {
        setError(handleApiError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas cancelar esta programación?")) {
      setLoading(true);
      setError(null);
      
      try {
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
          setError("ID inválido");
          return;
        }
        
        await api.deleteAgendaProcedimiento(idNum);
        setSuccessMessage("Programación cancelada exitosamente");
        setRefreshKey(prev => prev + 1);
      } catch (err: any) {
        console.error("Error eliminando programación:", err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    }
  }

  const estadoColors: Record<string, string> = {
    "Programado": "bg-blue-100 text-blue-800",
    "Confirmado": "bg-green-100 text-green-800",
    "Aplazado": "bg-orange-100 text-orange-800",
    "En Quirofano": "bg-purple-100 text-purple-800",
    "Operado": "bg-indigo-100 text-indigo-800",
    "Cancelado": "bg-red-100 text-red-800",
  }

  return (
    <ProtectedRoute permissions={["ver_programacion"]}>
      <div className="p-8">
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

        {/* Mensajes de éxito/error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-green-700 font-medium">Éxito</p>
              <p className="text-green-600 text-sm mt-1">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtrar:</span>
          <div className="flex space-x-2 overflow-x-auto">
            {["todas", "Programado", "Confirmado", "Aplazado", "En Quirofano", "Operado", "Cancelado"].map((estado) => (
              <button
                key={estado}
                onClick={() => setFilterEstado(estado.toLowerCase().replace(" ", "_"))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  filterEstado === estado.toLowerCase().replace(" ", "_")
                    ? "bg-[#1a6b32] text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:border-[#1a6b32]"
                }`}
              >
                {estado === "todas" ? "Todas" : estado}
              </button>
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="mb-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a6b32]"></div>
            <span className="ml-2 text-gray-600">Cargando programaciones...</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Paciente</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Procedimiento</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha/Hora</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Duración</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Anestesiólogo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProgramaciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {loading ? "Cargando..." : "No hay programaciones"}
                    </td>
                  </tr>
                ) : (
                  filteredProgramaciones.map((prog) => (
                    <tr key={prog.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">
                        <p className="font-medium text-gray-800">
                          {prog.paciente_nombre} {prog.paciente_apellido}
                        </p>
                        <p className="text-xs text-gray-600">{prog.numero_documento}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Scissors size={16} className="text-[#669933]" />
                          <span className="font-medium text-gray-800">{prog.procedimiento_nombre}</span>
                        </div>
                        {prog.procedimiento_precio && (
                          <p className="text-xs text-gray-600">
                            ${prog.procedimiento_precio.toLocaleString("es-CO")}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">ID: {prog.procedimiento_id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {prog.fecha} {prog.hora}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {prog.duracion} min
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{prog.anestesiologo}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColors[prog.estado]}`}
                        >
                          {prog.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
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
                          <ProtectedRoute permissions={["cancelar_programacion"]}>
                            <button
                              onClick={() => handleDelete(prog.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Cancelar"
                            >
                              <Trash2 size={18} />
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
        </div>

        {/* Modals */}
        {showForm && (
          <ProgramacionForm
            programacion={selectedProgramacion || undefined}
            onSave={handleSaveProgramacion}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
              setError(null)
              setSuccessMessage(null)
            }}
            isLoading={loading}
          />
        )}

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