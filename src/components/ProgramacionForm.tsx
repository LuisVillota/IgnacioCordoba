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

const safeParseInt = (value: string | number): number => {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (cleaned === "") {
      throw new Error("String vacío");
    }
    
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) {
      throw new Error(`No se pudo convertir "${value}" a número`);
    }
    
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

  useEffect(() => {
    const cargarDatos = async () => {
      setLoadingData(true)
      setError(null)
      
      try {
        setPacientesLoading(true)
        const pacientesData = await api.getPacientes(1000, 0)
        
        if (pacientesData && pacientesData.pacientes && Array.isArray(pacientesData.pacientes)) {
          const pacientesFormateados = pacientesData.pacientes.map((pac: any) => ({
            id: pac.id?.toString() || "",
            nombre: pac.nombre || "",
            apellido: pac.apellido || "",
            numero_documento: pac.numero_documento || ""
          }))
          setPacientes(pacientesFormateados)
        } else {
          setPacientes([])
        }

        setProcedimientosLoading(true)
        const procedimientosData = await api.getProcedimientos()
        
        if (procedimientosData && procedimientosData.procedimientos && Array.isArray(procedimientosData.procedimientos)) {
          const procedimientosFormateados = procedimientosData.procedimientos.map((proc: any) => ({
            id: proc.id?.toString() || "",
            nombre: proc.nombre || "",
            precio: proc.precio || 0
          }))
          setProcedimientos(procedimientosFormateados)
        } else if (Array.isArray(procedimientosData)) {
          const procedimientosFormateados = procedimientosData.map((proc: any) => ({
            id: proc.id?.toString() || "",
            nombre: proc.nombre || "",
            precio: proc.precio || 0
          }))
          setProcedimientos(procedimientosFormateados)
        } else {
          setProcedimientos([])
        }

      } catch (err: any) {
        setError(handleApiError(err))
      } finally {
        setPacientesLoading(false)
        setProcedimientosLoading(false)
        setLoadingData(false)
      }
    }

    cargarDatos()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidating(true)
    setError(null)

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
      let procedimientoIdNum: number;
      try {
        procedimientoIdNum = safeParseInt(formData.procedimiento_id);
      } catch (parseError: any) {
        setError(`Error: ID de procedimiento no válido. ${parseError.message}`)
        setValidating(false)
        return
      }

      if (procedimientoIdNum <= 0) {
        setError("ID de procedimiento no válido. Debe ser mayor a 0.")
        setValidating(false)
        return
      }

      const procedimientoExiste = procedimientos.some(p => p.id === formData.procedimiento_id)
      if (!procedimientoExiste) {
        setError("El procedimiento seleccionado no es válido. Por favor selecciona uno de la lista.")
        setValidating(false)
        return
      }

      const datosParaBackend = {
        numero_documento: formData.numero_documento,
        fecha: formData.fecha,
        hora: formData.hora + ":00",
        duracion: formData.duracion,
        procedimiento_id: procedimientoIdNum,
        anestesiologo: formData.anestesiologo,
        estado: formData.estado as Programacion["estado"],
        observaciones: formData.observaciones
      }

      const datosParaParent = {
        ...datosParaBackend,
        procedimiento_id: procedimientoIdNum.toString()
      }

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
        
        try {
          const disponibilidad = await api.verificarDisponibilidad(
            formData.fecha,
            formData.hora + ":00",
            formData.duracion,
            excludeId,
            procedimientoIdNum
          )

          if (!disponibilidad.disponible) {
            setError(`Conflicto de horario: Ya existe un procedimiento programado para esa hora`)
            setValidating(false)
            return
          }
        } catch {
        }
      }

      onSave(datosParaParent)

    } catch (err: any) {
      const errorMessage = err.message || "Error desconocido"
      
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
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                Paciente seleccionado
              </p>
            )}
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedimiento
                {procedimientosLoading && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
              </label>
              <select
                value={formData.procedimiento_id}
                onChange={(e) => handleChange("procedimiento_id", e.target.value)}
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
            </div>
          </div>

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
        </form>
      </div>
    </div>
  )
}