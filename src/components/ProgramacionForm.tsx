"use client"

import { useState, useEffect } from "react"
import { X, Calendar, Clock, User, Loader2, AlertCircle, Scissors, AlertTriangle } from "lucide-react"
import type { Programacion } from "../pages/ProgramacionQuirurgicaPage"
import { api, handleApiError } from "../lib/api"

interface ProgramacionFormProps {
  programacion?: Programacion
  onSave: (data: Omit<Programacion, "id">) => void
  onClose: () => void
  isLoading?: boolean
}

interface paciente {
  id: string
  nombre: string
  apellido: string
  numero_documento: string
}

interface Procedimiento {
  id: number
  nombre: string
  precio: number
}

const formatHora = (hora: string): string => {
  console.log("🕐 Formateando hora:", hora);
  
  if (!hora) return "00:00 AM";
  
  try {
    if (hora.startsWith('PT')) {
      const horasMatch = hora.match(/PT(\d+)H/);
      const horas = horasMatch ? parseInt(horasMatch[1]) : 0;
      
      const ampm = horas >= 12 ? 'PM' : 'AM';
      const horas12 = horas % 12 || 12;
      
      return `${horas12.toString().padStart(2, '0')}:00 ${ampm}`;
    }
    
    if (hora.includes(':')) {
      const partes = hora.split(':');
      const horas = parseInt(partes[0]);
      const minutos = partes[1] ? parseInt(partes[1].split(':')[0]) : 0;
      
      const ampm = horas >= 12 ? 'PM' : 'AM';
      const horas12 = horas % 12 || 12;
      
      return `${horas12.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')} ${ampm}`;
    }
    
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

const formatConflictTime = (hora: any): string => {
  if (!hora) return "00:00";
  
  console.log("🕐 Formateando hora de conflicto:", hora, "tipo:", typeof hora);
  
  try {
    if (typeof hora === 'string') {
      if (hora.includes(':')) {
        const partes = hora.split(':');
        const horas = partes[0] || '00';
        const minutos = partes[1] || '00';
        return `${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`;
      }
      return hora;
    }
    
    if (hora && typeof hora === 'object') {
      if ('hours' in hora && 'minutes' in hora) {
        const hours = hora.hours || 0;
        const minutes = hora.minutes || 0;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      
      if ('hour' in hora && 'minute' in hora) {
        const hours = hora.hour || 0;
        const minutes = hora.minute || 0;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      
      if (hora instanceof Date || (hora.getHours && hora.getMinutes)) {
        const hours = hora.getHours();
        const minutes = hora.getMinutes();
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
    
    if (typeof hora === 'number') {
      const date = new Date(hora);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    return String(hora);
  } catch (error) {
    console.error("❌ Error formateando hora de conflicto:", error);
    return "00:00";
  }
};

export function ProgramacionForm({ programacion, onSave, onClose, isLoading }: ProgramacionFormProps) {
  const [formData, setFormData] = useState({
    numero_documento: programacion?.numero_documento || "",
    fecha: programacion?.fecha || "",
    hora: programacion?.hora || "09:00",
    duracion: programacion?.duracion || 60,
    procedimiento_id: programacion?.procedimiento_id
      ? Number(programacion.procedimiento_id)
      : 0,
    anestesiologo: programacion?.anestesiologo || "",
    estado: programacion?.estado || "Programado",
    observaciones: programacion?.observaciones || "",
  })

  const [pacientes, setpacientes] = useState<paciente[]>([])
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [pacientesLoading, setpacientesLoading] = useState(true)
  const [procedimientosLoading, setProcedimientosLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [procedimientoSeleccionado, setProcedimientoSeleccionado] = useState<Procedimiento | null>(null)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictInfo, setConflictInfo] = useState<{
    id: string
    fecha: string
    hora: string
    duracion: number
    estado: string
    paciente_nombre?: string
    paciente_apellido?: string
    procedimiento_nombre?: string
  } | null>(null)
  const [conflictValidationError, setConflictValidationError] = useState<string | null>(null)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      setLoadingData(true)
      setError(null)
      
      try {
        console.log("📥 Cargando datos para formulario...");
        
        setpacientesLoading(true)
        console.log("📥 Cargando pacientes...");
        const pacientesData = await api.getpacientes(1000, 0)
        
        console.log("📥 Respuesta de pacientes:", pacientesData);
        
        if (pacientesData && pacientesData.pacientes && Array.isArray(pacientesData.pacientes)) {
          const pacientesFormateados = pacientesData.pacientes.map((pac: any) => ({
            id: pac.id?.toString() || "",
            nombre: pac.nombre || "",
            apellido: pac.apellido || "",
            numero_documento: pac.numero_documento || ""
          }))
          console.log(`✅ ${pacientesFormateados.length} pacientes cargados`);
          setpacientes(pacientesFormateados)
        } else {
          console.warn("⚠️ No se pudieron cargar pacientes, respuesta inesperada");
          setpacientes([])
        }

        setProcedimientosLoading(true)
        console.log("📥 Cargando procedimientos...");
        const procedimientosData = await api.getProcedimientos()
        
        console.log("📥 Respuesta de procedimientos:", procedimientosData);
        
        if (procedimientosData && procedimientosData.procedimientos && Array.isArray(procedimientosData.procedimientos)) {
          const procedimientosFormateados = procedimientosData.procedimientos.map((proc: any) => {
            const procedimiento = {
              id: Number(proc.id),
              nombre: proc.nombre || "",
              precio: proc.precio || 0
            };
            console.log(`📋 Procedimiento cargado: ${procedimiento.nombre} (ID: ${procedimiento.id})`);
            return procedimiento;
          })
          console.log(`✅ ${procedimientosFormateados.length} procedimientos cargados`);
          setProcedimientos(procedimientosFormateados)
          
          if (programacion?.procedimiento_id) {
            const procedimientoId = Number(programacion.procedimiento_id);
            const proc = procedimientosFormateados.find((p: Procedimiento) => p.id === procedimientoId);
            if (proc) {
              console.log(`🔍 Procedimiento encontrado para edición: ${proc.nombre} (ID: ${proc.id})`);
              setProcedimientoSeleccionado(proc);
            }
          }
        } else if (Array.isArray(procedimientosData)) {
          console.log("⚠️ Formato alternativo de procedimientos (array directo)");
          const procedimientosFormateados = procedimientosData.map((proc: any) => ({
            id: Number(proc.id),
            nombre: proc.nombre || "",
            precio: proc.precio || 0
          }))
          console.log(`✅ ${procedimientosFormateados.length} procedimientos cargados`);
          setProcedimientos(procedimientosFormateados)
        } else {
          console.warn("⚠️ No se pudieron cargar procedimientos, respuesta inesperada");
          setProcedimientos([])
        }

      } catch (err: any) {
        console.error("❌ Error cargando datos:", err);
        setError(handleApiError(err))
      } finally {
        setpacientesLoading(false)
        setProcedimientosLoading(false)
        setLoadingData(false)
        console.log("✅ Carga de datos completada");
      }
    }

    cargarDatos()
  }, [programacion])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidating(true)
    setError(null)
    setConflictValidationError(null)
      
    if (!formData.numero_documento) {
      setError("Por favor selecciona un paciente")
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

    if (procedimientos.length === 0) {
      setError("Los procedimientos aún se están cargando");
      setValidating(false);
      return;
    }

    const procedimientoIdNum = Number(formData.procedimiento_id) || 0;
    
    if (!Number.isInteger(procedimientoIdNum) || procedimientoIdNum <= 0) {
      console.error("❌ procedimiento_id inválido:", formData.procedimiento_id);
      setError("Debes seleccionar un procedimiento válido");
      setValidating(false);
      return;
    }

    try {
      const procedimientoExiste = procedimientos.some(
        p => p.id === procedimientoIdNum
      );

      if (!procedimientoExiste) {
        console.error("❌ Procedimiento no encontrado en la lista:", procedimientoIdNum);
        console.log("📋 Procedimientos disponibles:", procedimientos.map(p => ({id: p.id, nombre: p.nombre})));
        setError("El procedimiento seleccionado no es válido. Por favor selecciona uno de la lista.")
        setValidating(false)
        return
      }

      console.log("✅ Procedimiento validado en la lista");

      console.log("🕐 Hora del formulario:", {
        hora_original: formData.hora,
        formato: formData.hora.includes(":") ? formData.hora.split(":").length + " partes" : "formato desconocido",
        ejemplo_correcto: "09:00:00"
      });

      let horaFormateada = formData.hora
      if (horaFormateada.includes(":") && horaFormateada.split(":").length === 2) {
        horaFormateada += ":00"
        console.log("🕐 Hora formateada (con segundos):", horaFormateada);
      }

      console.log("📤 Preparando datos para enviar al padre...");
      
      if (!programacion || 
          formData.fecha !== programacion.fecha || 
          formData.hora !== programacion.hora || 
          formData.duracion !== programacion.duracion) {
        
        let excludeId: number | undefined = undefined
        
        if (programacion?.id) {
          excludeId = parseInt(programacion.id)
        }
        
        try {
          console.log("🔍 Verificando disponibilidad...");
          console.log("📋 Parámetros para disponibilidad:", {
            fecha: formData.fecha,
            hora: horaFormateada,
            duracion: formData.duracion,
            excludeId,
            procedimiento_id: procedimientoIdNum
          });
          
          setIsCheckingAvailability(true);

          const disponibilidad = await api.verificarDisponibilidad(
            formData.fecha,
            horaFormateada,
            formData.duracion,
            excludeId,
            procedimientoIdNum
          )

          console.log("📊 Resultado disponibilidad COMPLETO:", disponibilidad);
          
          if (disponibilidad && disponibilidad.error === true) {
            console.error("❌ Error en verificación de disponibilidad:", disponibilidad.message);
            setError(`Error verificando disponibilidad: ${disponibilidad.message}`);
            setIsCheckingAvailability(false);
            setValidating(false);
            return;
          }
          
          if (!disponibilidad.disponible) {
            console.warn("⚠️ Horario no disponible:", disponibilidad);
            
            let mensajeConflicto = "Conflicto de horario: ";
            
            if (disponibilidad.conflictos && disponibilidad.conflictos.length > 0) {
              const conflicto = disponibilidad.conflictos[0];
              mensajeConflicto += `Ya existe un procedimiento programado para esa hora (ID: ${conflicto.id}).`;
              
              const horaConflictFormateada = formatConflictTime(conflicto.hora);
              
              setConflictInfo({
                id: conflicto.id.toString(),
                fecha: conflicto.fecha,
                hora: horaConflictFormateada,
                duracion: conflicto.duracion || 60,
                estado: conflicto.estado || "Programado",
                paciente_nombre: conflicto.paciente_nombre,
                paciente_apellido: conflicto.paciente_apellido,
                procedimiento_nombre: conflicto.procedimiento_nombre
              });
              setShowConflictModal(true);
            } else {
              mensajeConflicto += disponibilidad.mensaje || "El horario no está disponible.";
              setError(mensajeConflicto);
              
              if (disponibilidad.debug_info) {
                console.log("🔍 Debug info del backend:", disponibilidad.debug_info);
              }
            }
            
            setIsCheckingAvailability(false);
            setValidating(false);
            return;
          }
          console.log("✅ Horario disponible confirmado por backend");
        } catch (dispoError: any) {
          console.error("❌ Error en catch de disponibilidad:", dispoError);
          setConflictValidationError("No se pudo verificar la disponibilidad del horario. Por favor, asegúrate de que no haya conflictos.");
        } finally {
          setIsCheckingAvailability(false);
        }
      } else {
        console.log("✅ No se requiere verificación de disponibilidad (sin cambios en fecha/hora)");
      }

      console.log("✅ Todos los datos validados, enviando al padre...");
      const datosParaParent: Omit<Programacion, "id"> = {
        numero_documento: formData.numero_documento,
        fecha: formData.fecha,
        hora: formData.hora,
        duracion: formData.duracion,
        procedimiento_id: procedimientoIdNum.toString(),
        anestesiologo: formData.anestesiologo,
        estado: formData.estado as Programacion["estado"],
        observaciones: formData.observaciones
      }

      console.log("📤 Datos para el padre:", datosParaParent);
      onSave(datosParaParent)

    } catch (err: any) {
      const errorMessage = err.message || "Error desconocido"
      console.error("❌ Error en handleSubmit:", {
        message: errorMessage,
        error: err
      });
      
      if (errorMessage.includes("procedimiento_id") || 
          errorMessage.includes("integer") || 
          errorMessage.includes("unable to parse")) {
        setError("Error de validación: El ID del procedimiento no es válido. Asegúrate de seleccionar un procedimiento de la lista.")
      } else if (errorMessage.includes("Validation error")) {
        setError("Error de validación: Por favor verifica todos los campos.")
      } else if (errorMessage.includes("Conflicto de horario")) {
        setConflictValidationError(errorMessage);
        setError("Conflicto de horario: Ya existe un procedimiento programado para esa hora. Por favor selecciona otra hora.");
      } else if (errorMessage.includes("procedimiento no encontrado")) {
        setError("El procedimiento seleccionado no existe en la base de datos.")
      } else if (errorMessage.includes("paciente con documento")) {
        setError("El paciente seleccionado no existe en la base de datos.")
      } else {
        setError(handleApiError(err))
      }
      setValidating(false)
    }
  }

  const handleContinueWithConflict = () => {
    setShowConflictModal(false);
    setConflictInfo(null);
    setValidating(true);
    
    const procedimientoIdNum = Number(formData.procedimiento_id) || 0;

    if (!Number.isInteger(procedimientoIdNum) || procedimientoIdNum <= 0) {
      setError("Procedimiento inválido");
      setValidating(false);
      return;
    }

    const datosParaParent: Omit<Programacion, "id"> = {
      numero_documento: formData.numero_documento,
      fecha: formData.fecha,
      hora: formData.hora,
      duracion: formData.duracion,
      procedimiento_id: procedimientoIdNum.toString(),
      anestesiologo: formData.anestesiologo,
      estado: formData.estado as Programacion["estado"],
      observaciones: formData.observaciones
    }

    onSave(datosParaParent);
  }

  const handleChange = (field: string, value: string | number) => {
    console.log(`🔄 Cambiando campo ${field}:`, {
      valor: value,
      tipo: typeof value
    });
    
    setFormData(prev => ({
      ...prev,
      [field]: field === "procedimiento_id"
        ? Number(value)
        : value
    }))

    if (field === "procedimiento_id") {
      const proc = procedimientos.find(p => p.id === Number(value));
      setProcedimientoSeleccionado(proc || null);
      console.log(`🔍 Procedimiento seleccionado actualizado:`, proc);
    }
  }

  const getFechaMinima = () => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  const formatCurrency = (amount: number | undefined): string => {
    if (!amount) return "$0";
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

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
            disabled={isLoading || validating || isCheckingAvailability}
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

          {conflictValidationError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="text-yellow-700 font-medium">Advertencia de conflicto</p>
                  <p className="text-yellow-600 text-sm mt-1">
                    {conflictValidationError}
                  </p>
                  <button
                    onClick={() => setConflictValidationError(null)}
                    className="text-yellow-700 text-sm mt-2 underline hover:text-yellow-800"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingData && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#1a6b32]" />
              <span className="ml-2 text-gray-600">Cargando datos del formulario...</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              paciente
              {pacientesLoading && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
            </label>
            <select
              value={formData.numero_documento}
              onChange={(e) => handleChange("numero_documento", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
              required
              disabled={pacientesLoading || isLoading || validating || isCheckingAvailability}
            >
              <option value="">Seleccionar paciente</option>
              {pacientes.map((paciente) => (
                <option key={paciente.numero_documento} value={paciente.numero_documento}>
                  {paciente.nombre} {paciente.apellido} - {paciente.numero_documento}
                </option>
              ))}
            </select>
            {pacientes.length === 0 && !pacientesLoading && (
              <p className="text-xs text-red-500 mt-1">No hay pacientes disponibles</p>
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
                  min={getFechaMinima()}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                  required
                  disabled={isLoading || validating || isCheckingAvailability}
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
                  disabled={isLoading || validating || isCheckingAvailability}
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
                onChange={(e) =>
                  handleChange("procedimiento_id", Number(e.target.value))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                required
                disabled={
                  procedimientosLoading ||
                  isLoading ||
                  validating ||
                  isCheckingAvailability
                }
              >
                <option value={0}>Seleccionar procedimiento</option>

                {procedimientos.map((procedimiento) => (
                  <option key={procedimiento.id} value={procedimiento.id}>
                    {procedimiento.nombre} ({formatCurrency(procedimiento.precio)})
                  </option>
                ))}
              </select>
              {procedimientoSeleccionado && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-700">
                    <Scissors className="inline mr-1" size={14} />
                    <strong>Procedimiento seleccionado:</strong> {procedimientoSeleccionado.nombre}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ID: {procedimientoSeleccionado.id} | Precio: {formatCurrency(procedimientoSeleccionado.precio)}
                  </p>
                </div>
              )}
              {procedimientos.length === 0 && !procedimientosLoading && (
                <p className="text-xs text-red-500 mt-1">No hay procedimientos disponibles</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duración (minutos)</label>
              <input
                type="number"
                value={formData.duracion}
                onChange={(e) => handleChange("duracion", parseInt(e.target.value) || 60)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                min="30"
                max="480"
                step="15"
                required
                disabled={isLoading || validating || isCheckingAvailability}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo: 30 min, Máximo: 8 horas (480 min)</p>
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
                placeholder="Nombre completo del anestesiólogo"
                required
                disabled={isLoading || validating || isCheckingAvailability}
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
              disabled={isLoading || validating || isCheckingAvailability}
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
              disabled={isLoading || validating || isCheckingAvailability}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Resumen de la programación</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">paciente:</span>
                <p className="font-medium">
                  {formData.numero_documento ? 
                    pacientes.find(p => p.numero_documento === formData.numero_documento)?.nombre + " " + 
                    pacientes.find(p => p.numero_documento === formData.numero_documento)?.apellido
                    : "No seleccionado"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Fecha/Hora:</span>
                <p className="font-medium">{formData.fecha || "No especificada"} {formData.hora ? formatHora(formData.hora) : ""}</p>
              </div>
              <div>
                <span className="text-gray-500">Procedimiento:</span>
                <p className="font-medium">
                  {procedimientoSeleccionado?.nombre || "No seleccionado"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Duración:</span>
                <p className="font-medium">{formData.duracion} minutos</p>
              </div>
              <div>
                <span className="text-gray-500">Estado:</span>
                <p className="font-medium">{formData.estado}</p>
              </div>
              <div>
                <span className="text-gray-500">Anestesiólogo:</span>
                <p className="font-medium">{formData.anestesiologo || "No especificado"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading || pacientesLoading || procedimientosLoading || validating || isCheckingAvailability}
              className="flex-1 bg-[#1a6b32] hover:bg-[#155529] text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {(isLoading || validating || isCheckingAvailability) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isCheckingAvailability ? "Verificando disponibilidad..." : 
                   validating ? "Verificando..." : 
                   (programacion ? "Actualizando..." : "Creando...")}
                </>
              ) : (
                programacion ? "Actualizar" : "Crear"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || validating || isCheckingAvailability}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>

        {showConflictModal && conflictInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fadeIn">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="text-yellow-500 mr-3 flex-shrink-0" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Conflicto de Horario</h3>
                    <p className="text-sm text-gray-600 mt-1">Ya existe un procedimiento programado</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    La fecha y hora seleccionada ya está ocupada por otro procedimiento.
                    Se recomienda seleccionar un horario diferente.
                  </p>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">Detalles del conflicto:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID del conflicto:</span>
                        <span className="font-medium">#{conflictInfo.id}</span>
                      </div>
                      {conflictInfo.paciente_nombre && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">paciente:</span>
                          <span className="font-medium">{conflictInfo.paciente_nombre} {conflictInfo.paciente_apellido}</span>
                        </div>
                      )}
                      {conflictInfo.procedimiento_nombre && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Procedimiento:</span>
                          <span className="font-medium">{conflictInfo.procedimiento_nombre}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium">{conflictInfo.fecha}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hora:</span>
                        <span className="font-medium">{formatHora(conflictInfo.hora)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duración:</span>
                        <span className="font-medium">{conflictInfo.duracion} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <span className="font-medium">{conflictInfo.estado}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>Recomendación:</strong> Para evitar solapamientos, selecciona una hora diferente 
                      o contacta al administrador si este es un caso especial.
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowConflictModal(false);
                      setConflictInfo(null);
                      setValidating(false);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition"
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-center">
                      <Calendar className="mr-2" size={16} />
                      Cambiar Horario
                    </div>
                  </button>
                  <button
                    onClick={handleContinueWithConflict}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 rounded-lg transition"
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-center">
                      <AlertTriangle className="mr-2" size={16} />
                      Continuar de Todas Formas
                    </div>
                  </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    <strong>Nota:</strong> Continuar de todas formas puede causar conflictos operativos. 
                    Solo usar en casos excepcionales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}