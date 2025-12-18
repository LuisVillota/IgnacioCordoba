"use client"

import { useState, useEffect } from "react"
import { X, Calendar, Clock, User, Loader2, AlertCircle } from "lucide-react"
import type { Programacion } from "../pages/ProgramacionQuirurgicaPage"
import { api, handleApiError } from "../lib/api"

interface ProgramacionFormProps {
  programacion?: Programacion
  onSave: (data: Omit<Programacion, "id">) => void
  onClose: () => void
  isLoading?: boolean
}

interface Paciente {
  id: string
  nombre: string
  apellido: string
  numero_documento: string
}

interface Procedimiento {
  id: string
  nombre: string
  precio: number
}

// Función para convertir seguro a número
const safeParseInt = (value: string | number): number => {
  if (typeof value === 'number') {
    console.log("🔢 Valor ya es número:", value);
    return value;
  }
  
  if (typeof value === 'string') {
    console.log("🔢 Convirtiendo string a número:", value);
    // Limpiar el string
    const cleaned = value.trim();
    if (cleaned === "") {
      throw new Error("String vacío");
    }
    
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) {
      throw new Error(`No se pudo convertir "${value}" a número`);
    }
    
    console.log("✅ Convertido exitosamente:", num);
    return num;
  }
  
  throw new Error(`Tipo no válido para conversión: ${typeof value}`);
};

export function ProgramacionForm({ programacion, onSave, onClose, isLoading }: ProgramacionFormProps) {
  const [formData, setFormData] = useState({
    numero_documento: programacion?.numero_documento || "",
    fecha: programacion?.fecha || "",
    hora: programacion?.hora || "",
    duracion: programacion?.duracion || 60,
    procedimiento_id: programacion?.procedimiento_id || "",
    anestesiologo: programacion?.anestesiologo || "",
    estado: programacion?.estado || "Programado",
    observaciones: programacion?.observaciones || "",
  })

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [pacientesLoading, setPacientesLoading] = useState(true)
  const [procedimientosLoading, setProcedimientosLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  // Cargar pacientes y procedimientos
  useEffect(() => {
    const cargarDatos = async () => {
      setLoadingData(true)
      setError(null)
      
      try {
        // Cargar pacientes
        setPacientesLoading(true)
        const pacientesData = await api.getPacientes(1000, 0)
        console.log("👥 Pacientes recibidos:", pacientesData)
        
        if (pacientesData && pacientesData.pacientes && Array.isArray(pacientesData.pacientes)) {
          const pacientesFormateados = pacientesData.pacientes.map((pac: any) => ({
            id: pac.id?.toString() || "",
            nombre: pac.nombre || "",
            apellido: pac.apellido || "",
            numero_documento: pac.numero_documento || ""
          }))
          setPacientes(pacientesFormateados)
          console.log(`✅ ${pacientesFormateados.length} pacientes cargados`)
        } else {
          console.warn("⚠️ Formato inesperado de pacientes:", pacientesData)
          setPacientes([])
        }

        // Cargar procedimientos
        setProcedimientosLoading(true)
        const procedimientosData = await api.getProcedimientos()
        console.log("🏥 Procedimientos recibidos:", procedimientosData)
        
        if (procedimientosData && procedimientosData.procedimientos && Array.isArray(procedimientosData.procedimientos)) {
          const procedimientosFormateados = procedimientosData.procedimientos.map((proc: any) => ({
            id: proc.id?.toString() || "",
            nombre: proc.nombre || "",
            precio: proc.precio || 0
          }))
          setProcedimientos(procedimientosFormateados)
          console.log(`✅ ${procedimientosFormateados.length} procedimientos cargados`)
        } else if (Array.isArray(procedimientosData)) {
          // Si la respuesta es directamente un array
          const procedimientosFormateados = procedimientosData.map((proc: any) => ({
            id: proc.id?.toString() || "",
            nombre: proc.nombre || "",
            precio: proc.precio || 0
          }))
          setProcedimientos(procedimientosFormateados)
          console.log(`✅ ${procedimientosFormateados.length} procedimientos cargados (array directo)`)
        } else {
          console.warn("⚠️ Formato inesperado de procedimientos:", procedimientosData)
          setProcedimientos([])
        }

      } catch (err: any) {
        console.error("❌ Error cargando datos:", err)
        setError(handleApiError(err))
      } finally {
        setPacientesLoading(false)
        setProcedimientosLoading(false)
        setLoadingData(false)
      }
    }

    cargarDatos()
  }, [])

  // Agregar logging para depuración
  useEffect(() => {
    console.log("📊 Estado actual del formulario:", {
      procedimiento_id: formData.procedimiento_id,
      tipo_procedimiento_id: typeof formData.procedimiento_id,
      pacientes_count: pacientes.length,
      procedimientos_count: procedimientos.length,
      procedimiento_seleccionado: procedimientos.find(p => p.id === formData.procedimiento_id)
    })
  }, [formData.procedimiento_id, pacientes, procedimientos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidating(true)
    setError(null)

    console.log("🚀 Iniciando envío del formulario...")
    console.log("📋 Datos del formulario:", formData)

    // Validación básica
    if (!formData.numero_documento) {
      setError("Por favor selecciona un paciente")
      setValidating(false)
      return
    }

    if (!formData.procedimiento_id) {
      setError("Por favor selecciona un procedimiento")
      setValidating(false)
      return
    }

    if (!formData.fecha) {
      setError("Por favor selecciona una fecha")
      setValidating(false)
      return
    }

    if (!formData.hora) {
      setError("Por favor selecciona una hora")
      setValidating(false)
      return
    }

    if (!formData.anestesiologo.trim()) {
      setError("Por favor ingresa el nombre del anestesiólogo")
      setValidating(false)
      return
    }

    try {
      // **PASO CRÍTICO 1: CONVERTIR procedimiento_id a NÚMERO**
      let procedimientoIdNum: number;
      try {
        procedimientoIdNum = safeParseInt(formData.procedimiento_id);
        console.log("✅ Procedimiento_id convertido exitosamente:", {
          original: formData.procedimiento_id,
          convertido: procedimientoIdNum,
          tipo_original: typeof formData.procedimiento_id,
          tipo_convertido: typeof procedimientoIdNum
        });
      } catch (parseError: any) {
        console.error("❌ Error convirtiendo procedimiento_id:", parseError)
        setError(`Error: ID de procedimiento no válido. ${parseError.message}`)
        setValidating(false)
        return
      }

      // Validar que sea positivo
      if (procedimientoIdNum <= 0) {
        setError("ID de procedimiento no válido. Debe ser mayor a 0.")
        setValidating(false)
        return
      }

      // Verificar que el procedimiento exista en la lista cargada
      const procedimientoExiste = procedimientos.some(p => p.id === formData.procedimiento_id)
      if (!procedimientoExiste) {
        setError("El procedimiento seleccionado no es válido. Por favor selecciona uno de la lista.")
        setValidating(false)
        return
      }

      // **PASO CRÍTICO 2: Preparar datos para el backend**
      // IMPORTANTE: Debemos crear dos versiones:
      // 1. Para el backend (con procedimiento_id como número)
      // 2. Para el parent/UI (con procedimiento_id como string para compatibilidad)

      // **Versión para el backend** - CON NÚMERO
      const datosParaBackend = {
        numero_documento: formData.numero_documento,
        fecha: formData.fecha,
        hora: formData.hora + ":00", // Agregar segundos si no los tiene
        duracion: formData.duracion,
        procedimiento_id: procedimientoIdNum, // ✅ NÚMERO para el backend
        anestesiologo: formData.anestesiologo,
        estado: formData.estado as Programacion["estado"],
        observaciones: formData.observaciones
      }

      console.log("📤 Datos listos para backend (CON NÚMERO):", datosParaBackend)
      console.log("📤 Tipo de procedimiento_id en backend:", typeof datosParaBackend.procedimiento_id)

      // **Versión para el parent/UI** - CON STRING para compatibilidad
      const datosParaParent = {
        ...datosParaBackend,
        procedimiento_id: procedimientoIdNum.toString() // Convertir a string para el parent
      }

      console.log("📤 Datos para parent (CON STRING):", datosParaParent)

      // **PASO CRÍTICO 3: Verificar disponibilidad (opcional)**
      if (!programacion || 
          formData.fecha !== programacion.fecha || 
          formData.hora !== programacion.hora || 
          formData.duracion !== programacion.duracion) {
        
        let excludeId: number | undefined = undefined
        
        if (programacion?.id) {
          const parsedId = parseInt(programacion.id)
          if (!isNaN(parsedId)) {
            excludeId = parsedId
          }
        }
        
        console.log("🔍 Verificando disponibilidad...", {
          fecha: formData.fecha,
          hora: formData.hora + ":00",
          duracion: formData.duracion,
          excludeId,
          procedimiento_id: procedimientoIdNum  // Asegurar que usamos el número convertido
        })
        
        try {
          // **CORRECCIÓN: Agregar procedimiento_id al parámetro de disponibilidad**
          const disponibilidad = await api.verificarDisponibilidad(
            formData.fecha,
            formData.hora + ":00",
            formData.duracion,
            excludeId,
            procedimientoIdNum  // <-- ¡AGREGAR ESTE PARÁMETRO!
          )

          if (!disponibilidad.disponible) {
            setError(`Conflicto de horario: Ya existe un procedimiento programado para esa hora`)
            setValidating(false)
            return
          }
          console.log("✅ Horario disponible")
        } catch (disponibilidadError: any) {
          console.warn("⚠️ No se pudo verificar disponibilidad, continuando...", disponibilidadError)
          // Continuamos aunque falle la verificación de disponibilidad
        }
      }

      // **PASO FINAL: Enviar datos al parent**
      console.log("🚀 Enviando datos al parent...")
      // Enviamos los datos con procedimiento_id como string para mantener compatibilidad
      onSave(datosParaParent)

    } catch (err: any) {
      console.error("❌ Error en handleSubmit:", err)
      
      const errorMessage = err.message || "Error desconocido"
      console.log("📋 Error detallado:", {
        message: errorMessage,
        includes_procedimiento_id: errorMessage.includes("procedimiento_id"),
        includes_integer: errorMessage.includes("integer")
      })
      
      if (errorMessage.includes("procedimiento_id") || errorMessage.includes("integer")) {
        setError("Error de validación: El ID del procedimiento no es válido. Por favor selecciona un procedimiento de la lista.")
      } else if (errorMessage.includes("Validation error")) {
        setError("Error de validación: Por favor verifica todos los campos.")
      } else if (errorMessage.includes("Conflicto de horario")) {
        setError(errorMessage)
      } else {
        setError(handleApiError(err))
      }
      setValidating(false)
    }
  }

  const handleChange = (field: string, value: string | number) => {
    console.log(`🔄 Cambiando ${field}:`, {
      valor_anterior: formData[field as keyof typeof formData],
      valor_nuevo: value,
      tipo: typeof value
    })
    
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">
            {programacion ? "Editar Programación" : "Nueva Programación"}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-lg"
            disabled={isLoading || validating}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="text-red-700 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {loadingData && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#1a6b32]" />
              <span className="ml-2 text-gray-600">Cargando datos...</span>
            </div>
          )}

          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paciente
              {pacientesLoading && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
            </label>
            <select
              value={formData.numero_documento}
              onChange={(e) => handleChange("numero_documento", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
              required
              disabled={pacientesLoading || isLoading || validating}
            >
              <option value="">Seleccionar paciente</option>
              {pacientes.map((paciente) => (
                <option key={paciente.numero_documento} value={paciente.numero_documento}>
                  {paciente.nombre} {paciente.apellido} - {paciente.numero_documento}
                </option>
              ))}
            </select>
            {formData.numero_documento && (
              <p className="text-xs text-green-600 mt-1">
                ✅ Paciente seleccionado
              </p>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleChange("fecha", e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                  required
                  disabled={isLoading || validating}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => handleChange("hora", e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                  required
                  disabled={isLoading || validating}
                />
              </div>
            </div>
          </div>

          {/* Procedimiento y Duración */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedimiento
                {procedimientosLoading && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
              </label>
              <select
                value={formData.procedimiento_id}
                onChange={(e) => {
                  console.log("📋 Procedimiento seleccionado:", e.target.value)
                  handleChange("procedimiento_id", e.target.value)
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                required
                disabled={procedimientosLoading || isLoading || validating}
              >
                <option value="">Seleccionar procedimiento</option>
                {procedimientos.map((procedimiento) => (
                  <option key={procedimiento.id} value={procedimiento.id}>
                    {procedimiento.nombre} (${procedimiento.precio.toLocaleString("es-CO")})
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                {formData.procedimiento_id ? (
                  <>
                    <span className="text-green-600">✅ ID: {formData.procedimiento_id}</span>
                    <span className="text-gray-400 ml-2">
                      ({typeof formData.procedimiento_id} → se enviará como número al backend)
                    </span>
                  </>
                ) : (
                  <span className="text-yellow-600">⚠️ Selecciona un procedimiento</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duración (minutos)</label>
              <input
                type="number"
                value={formData.duracion}
                onChange={(e) => handleChange("duracion", parseInt(e.target.value) || 60)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                min="30"
                step="15"
                required
                disabled={isLoading || validating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Mínimo: 30 min, Múltiplos de 15 min
              </p>
            </div>
          </div>

          {/* Anestesiólogo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anestesiólogo</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={formData.anestesiologo}
                onChange={(e) => handleChange("anestesiologo", e.target.value)}
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                placeholder="Nombre del anestesiólogo"
                required
                disabled={isLoading || validating}
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => handleChange("estado", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
              required
              disabled={isLoading || validating}
            >
              <option value="Programado">Programado</option>
              <option value="Aplazado">Aplazado</option>
              <option value="Confirmado">Confirmado</option>
              <option value="En Quirofano">En Quirófano</option>
              <option value="Operado">Operado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleChange("observaciones", e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
              placeholder="Notas adicionales sobre la programación..."
              disabled={isLoading || validating}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading || pacientesLoading || procedimientosLoading || validating}
              className="flex-1 bg-[#1a6b32] hover:bg-[#155529] text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {(isLoading || validating) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {validating ? "Verificando..." : (programacion ? "Actualizando..." : "Creando...")}
                </>
              ) : (
                programacion ? "Actualizar" : "Crear"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || validating}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          {/* Debug info (solo en desarrollo) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
              <p className="font-medium text-gray-700">Debug info:</p>
              <p>procedimiento_id: {formData.procedimiento_id || "(vacío)"}</p>
              <p>Tipo: {typeof formData.procedimiento_id}</p>
              <p>Pacientes cargados: {pacientes.length}</p>
              <p>Procedimientos cargados: {procedimientos.length}</p>
              <p className="text-blue-600 mt-1">
                ⓘ Nota: El ID se enviará como número al backend
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}