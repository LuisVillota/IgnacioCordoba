"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { cotizacionHelpers } from "../lib/api"
import type {
  Cotizacion,
  CotizacionItemBase,
  CotizacionServicioIncluido
} from "../types/cotizacion"

interface CotizacionFormProps {
  cotizacion?: Cotizacion
  onSave: (data: any) => void
  onClose: () => void
  onSuccess?: () => void
}

interface ProcedimientoCatalogo {
  id: number;
  nombre: string;
  precio: number;
}

interface AdicionalCatalogo {
  id: number;
  nombre: string;
  precio: number;
}

interface Paciente {
  id: number;
  nombre: string;
  apellido: string;
  numero_documento: string;
}

const serviciosIncluidosFijos = [
  { servicio_nombre: "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", requiere: false },
  { servicio_nombre: "ANESTESIOLOGO", requiere: false },
  { servicio_nombre: "CONTROLES CON MEDICO Y ENFERMERA", requiere: false },
  { servicio_nombre: "VALORACION CON ANESTESIOLOGO", requiere: false },
  { servicio_nombre: "HEMOGRAMA DE CONTROL", requiere: false },
  { servicio_nombre: "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", requiere: false },
  { servicio_nombre: "IMPLANTES", requiere: false },
]

export function CotizacionForm({ cotizacion, onSave, onClose, onSuccess }: CotizacionFormProps) {
  // DEBUG: Ver datos recibidos
  console.log("🏁 CotizacionForm inicializado:", {
    cotizacion_recibida: cotizacion,
    paciente_id_en_cotizacion: cotizacion?.paciente_id,
    es_edicion: !!cotizacion?.id
  });

  // Cambiar el estado por defecto a "pendiente" siempre
  const [formData, setFormData] = useState({
    paciente_id: cotizacion?.paciente_id?.toString() || "",
    usuario_id: "1",
    // Mantener el estado existente si es edición, sino usar "pendiente"
    estado: cotizacion?.estado || "pendiente",
    items: cotizacion?.items || [],
    // CORRECCIÓN: Usar solo servicios_incluidos, no serviciosIncluidos
    servicios_incluidos: cotizacion?.servicios_incluidos ?? serviciosIncluidosFijos,
    observaciones: cotizacion?.observaciones || "",
  })

  const [procedimientos, setProcedimientos] = useState<ProcedimientoCatalogo[]>([])
  const [adicionales, setAdicionales] = useState<AdicionalCatalogo[]>([])
  const [otrosAdicionales, setOtrosAdicionales] = useState<AdicionalCatalogo[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedProcedimiento, setSelectedProcedimiento] = useState<string>("")
  const [selectedAdicional, setSelectedAdicional] = useState<string>("")
  const [selectedOtroAdicional, setSelectedOtroAdicional] = useState<string>("")

  const isSubmittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Debug del estado
  useEffect(() => {
    console.log("📝 Estado actual en formData:", {
      estado: formData.estado,
      paciente_id: formData.paciente_id,
      tiene_items: formData.items.length,
      es_edicion: !!cotizacion?.id
    });
  }, [formData.estado, formData.paciente_id, formData.items, cotizacion?.id]);

  const calculateTotals = () => {
    let subtotalProcedimientos = 0;
    let subtotalAdicionales = 0;
    let subtotalOtrosAdicionales = 0;
    
    formData.items.forEach((item) => {
      const cantidad = Number(item.cantidad) || 1;
      const precioUnitario = Number(item.precio_unitario) || 0;
      const subtotal = cantidad * precioUnitario;
      
      if (item.tipo === "procedimiento") {
        subtotalProcedimientos += subtotal;
      } else if (item.tipo === "adicional") {
        subtotalAdicionales += subtotal;
      } else if (item.tipo === "otroAdicional") {
        subtotalOtrosAdicionales += subtotal;
      }
    });
    
    const total = subtotalProcedimientos + subtotalAdicionales + subtotalOtrosAdicionales;
    
    return {
      subtotalProcedimientos,
      subtotalAdicionales,
      subtotalOtrosAdicionales,
      total
    };
  }

  const totals = useMemo(() => calculateTotals(), [formData.items]);

  useEffect(() => {
    loadInitialData()
  }, [])

  // Mejorar la inicialización del paciente en modo edición
  useEffect(() => {
    console.log("🔍 Buscando paciente para edición:", {
      cotizacionId: cotizacion?.id,
      pacienteIdEnCotizacion: cotizacion?.paciente_id,
      pacientesCargados: pacientes.length
    });

    if (pacientes.length === 0) return;

    // Intentar encontrar el paciente
    let pacienteIdToSearch = null;
    
    if (cotizacion?.paciente_id) {
      pacienteIdToSearch = cotizacion.paciente_id.toString();
    }
    
    if (pacienteIdToSearch) {
      const paciente = pacientes.find(p => p.id.toString() === pacienteIdToSearch);
      
      if (paciente) {
        setPacienteSeleccionado(paciente);
        // IMPORTANTE: Actualizar el formData con el paciente_id correcto
        setFormData(prev => ({
          ...prev,
          paciente_id: pacienteIdToSearch
        }));
        console.log("✅ Paciente cargado para edición:", paciente);
      } else {
        console.warn("⚠️ Paciente no encontrado en la lista:", {
          pacienteIdBuscado: pacienteIdToSearch,
          pacientesDisponibles: pacientes.map(p => ({ id: p.id, nombre: p.nombre }))
        });
      }
    }
  }, [cotizacion, pacientes]);

  async function loadInitialData() {
    try {
      setLoading(true)
      
      const { api } = await import("../lib/api");
      
      const procRes = await api.getProcedimientos()
      setProcedimientos(procRes.procedimientos || [])
      
      const addRes = await api.getAdicionales()
      setAdicionales(addRes.adicionales || [])
      
      const oaRes = await api.getOtrosAdicionales()
      setOtrosAdicionales(oaRes.otros_adicionales || [])
      
      const pacRes = await api.getPacientes(100)
      setPacientes(pacRes.pacientes || [])
      
    } catch (error) {
      console.error("Error cargando datos:", error)
      alert("Error cargando datos del servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleServicioIncluido = (index: number) => {
    setFormData(prev => {
      const nuevosServicios = [...prev.servicios_incluidos]
      nuevosServicios[index] = {
        ...nuevosServicios[index],
        requiere: !nuevosServicios[index].requiere
      }
      
      return {
        ...prev,
        servicios_incluidos: nuevosServicios
      }
    })
  }

  const handleAddItem = (tipo: "procedimiento" | "adicional" | "otroAdicional") => {
    let itemToAdd: ProcedimientoCatalogo | AdicionalCatalogo | undefined

    if (tipo === "procedimiento" && selectedProcedimiento) {
      itemToAdd = procedimientos.find((p) => p.id.toString() === selectedProcedimiento)
    } else if (tipo === "adicional" && selectedAdicional) {
      itemToAdd = adicionales.find((a) => a.id.toString() === selectedAdicional)
    } else if (tipo === "otroAdicional" && selectedOtroAdicional) {
      itemToAdd = otrosAdicionales.find((oa) => oa.id.toString() === selectedOtroAdicional)
    }

    if (!itemToAdd) {
      setErrors(prev => ({ ...prev, [tipo]: `Selecciona un ${tipo}` }))
      return
    }

    const newItem: CotizacionItemBase = {
      id: Date.now().toString(),
      tipo: tipo === "otroAdicional" ? "otroAdicional" : tipo,
      item_id: itemToAdd.id,
      nombre: itemToAdd.nombre,
      descripcion: "",
      cantidad: 1,
      precio_unitario: itemToAdd.precio,
      subtotal: itemToAdd.precio,
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }))

    if (tipo === "procedimiento") {
      setSelectedProcedimiento("")
      setErrors(prev => ({ ...prev, procedimiento: "" }))
    }
    if (tipo === "adicional") {
      setSelectedAdicional("")
      setErrors(prev => ({ ...prev, adicional: "" }))
    }
    if (tipo === "otroAdicional") {
      setSelectedOtroAdicional("")
      setErrors(prev => ({ ...prev, otroAdicional: "" }))
    }
  }

  const handleRemoveItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }))
  }

  const handleUpdateItem = (itemId: string, field: string, value: any) => {
    setFormData(prev => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value }
          if (field === "cantidad" || field === "precio_unitario") {
            const cantidad = Number(updated.cantidad) || 1
            const precioUnitario = Number(updated.precio_unitario) || 0
            updated.subtotal = cantidad * precioUnitario
          }
          return updated
        }
        return item
      })
      
      return {
        ...prev,
        items: updatedItems
      }
    })
  }

  const handlePacienteChange = (pacienteId: string) => {
    setFormData(prev => ({ ...prev, paciente_id: pacienteId }));
    
    if (pacienteId) {
      const paciente = pacientes.find(p => p.id.toString() === pacienteId);
      setPacienteSeleccionado(paciente || null);
      // Limpiar error al seleccionar paciente
      if (errors.paciente_id) {
        setErrors(prev => ({ ...prev, paciente_id: "" }));
      }
    } else {
      setPacienteSeleccionado(null);
    }
  }

  const handleCambiarPaciente = () => {
    setFormData(prev => ({ ...prev, paciente_id: "" }));
    setPacienteSeleccionado(null);
    console.log("🔄 Paciente reseteado para selección nueva");
  };

  // CORRECCIÓN: Validación mejorada para edición
  const validateForm = () => {
    console.log("🔍 Validando formulario:", {
      formData_paciente_id: formData.paciente_id,
      pacienteSeleccionado: pacienteSeleccionado,
      es_edicion: !!cotizacion?.id
    });
    
    const newErrors: Record<string, string> = {};

    // Validar paciente (requerido siempre)
    if (!formData.paciente_id || formData.paciente_id === "") {
      newErrors.paciente_id = "Selecciona un paciente";
    }

    // Validar items
    if (formData.items.length === 0) {
      newErrors.items = "Debe agregar al menos un procedimiento o adicional";
    }

    setErrors(newErrors)
    console.log("✅ Resultado validación:", {
      errores: Object.keys(newErrors).length,
      errores_detalle: newErrors
    });
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting || isSubmittingRef.current) {
      return;
    }
    
    console.log("🔍 Validando formulario antes de enviar:", {
      formData_paciente_id: formData.paciente_id,
      cotizacion_id: cotizacion?.id,
      pacienteSeleccionado,
      es_edicion: !!cotizacion?.id
    });
    
    if (!validateForm()) {
      console.error("❌ Validación fallida. Errores:", errors);
      alert("Por favor, corrige los errores antes de enviar");
      return;
    }
    
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    
    try {
      const estadoMap: Record<string, number> = {
        'pendiente': 1,
        'aceptada': 2,
        'rechazada': 3,
        'facturada': 4
      };
      
      // Siempre usar "pendiente" para nuevas cotizaciones
      // Si es edición, mantener el estado existente
      const estadoSeleccionado = cotizacion?.estado || "pendiente";
      let estado_id = estadoMap[estadoSeleccionado];
      
      // Verificación adicional
      console.log("🔄 Estado en handleSubmit:", {
        estado_frontend: formData.estado,
        estado_seleccionado: estadoSeleccionado,
        estado_id_resultante: estado_id,
        es_valido: estado_id !== undefined
      });

      // Si por alguna razón estado_id es undefined, mostrar error
      if (estado_id === undefined) {
        console.error("❌ Estado no válido:", formData.estado);
        alert(`Error: Estado "${formData.estado}" no es válido. Usando "pendiente" por defecto.`);
        estado_id = 1;
      }

      const items = formData.items.map(item => ({
        tipo: item.tipo,
        item_id: item.item_id,
        nombre: item.nombre,
        descripcion: item.descripcion || "",
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal
      }));

      const servicios_incluidos = formData.servicios_incluidos.map(servicio => ({
        servicio_nombre: servicio.servicio_nombre,
        requiere: servicio.requiere || false
      }));

      let fecha_vencimiento = cotizacionHelpers.calcularFechaVencimiento(7);
      if (cotizacion?.fecha_vencimiento) {
        fecha_vencimiento = cotizacion.fecha_vencimiento;
      }

      // **CORRECCIÓN CRÍTICA: Asegurar que estado_id se incluya**
      const backendData = {
        paciente_id: parseInt(formData.paciente_id || "0"),
        usuario_id: parseInt(formData.usuario_id) || 1,
        estado_id: estado_id,  // Usar estado_id que siempre tendrá valor
        items: items,
        servicios_incluidos: servicios_incluidos,
        subtotal_procedimientos: totals.subtotalProcedimientos,
        subtotal_adicionales: totals.subtotalAdicionales,
        subtotal_otros_adicionales: totals.subtotalOtrosAdicionales,
        observaciones: formData.observaciones || "",
        fecha_vencimiento: fecha_vencimiento,
        validez_dias: 7
      };

      console.log("📤 Enviando al backend:", {
        ...backendData,
        estado_id_en_backend: backendData.estado_id,
        estado_seleccionado: formData.estado,
        es_creacion: !cotizacion?.id
      });

      const pacienteInfo = pacienteSeleccionado || pacientes.find(p => p.id.toString() === formData.paciente_id);

      // **CORRECCIÓN: Asegurar que el estado se pasa en formData también**
      const responseData = {
        ...formData,
        estado: formData.estado, // **IMPORTANTE: Esto debe estar presente**
        ...totals,
        id: cotizacion?.id || '',
        fecha_creacion: cotizacion?.fecha_creacion || new Date().toISOString().split('T')[0],
        fecha_vencimiento: fecha_vencimiento,
        validez_dias: 7,
        paciente_nombre: pacienteInfo ? `${pacienteInfo.nombre} ${pacienteInfo.apellido}` : '',
        paciente_apellido: pacienteInfo?.apellido || '',
        usuario_nombre: "Dr Hernan Ignacio Cordoba",
        paciente_documento: pacienteInfo?.numero_documento || '',
        
        _isEditing: !!cotizacion?.id,
        _cotizacionId: cotizacion?.id ? parseInt(cotizacion.id) : undefined,
        _backendData: backendData
      };

      // **VERIFICACIÓN FINAL**
      console.log("✅ Datos finales preparados:", {
        tiene_estado: !!responseData.estado,
        estado_valor: responseData.estado,
        backendData_tiene_estado_id: !!backendData.estado_id,
        backendData_estado_id: backendData.estado_id,
        backendData_estado_nombre: Object.keys(estadoMap).find(key => estadoMap[key] === backendData.estado_id)
      });

      onSave(responseData);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();

    } catch (error: any) {
      console.error('Error preparando datos:', error);
      alert(error.message || 'Error al preparar los datos de la cotización');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }
  
  const itemsProcedimientos = formData.items.filter(item => item.tipo === "procedimiento")
  const itemsAdicionales = formData.items.filter(item => item.tipo === "adicional")
  const itemsOtrosAdicionales = formData.items.filter(item => item.tipo === "otroAdicional")

  const mostrarInfoPaciente = pacienteSeleccionado || 
    (cotizacion?.paciente_id && pacientes.find(p => p.id.toString() === cotizacion.paciente_id.toString()));

  if (loading && !cotizacion) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{cotizacion ? "Editar Cotización" : "Nueva Cotización"}</h2>
            {mostrarInfoPaciente && (
              <p className="text-sm text-gray-600 mt-1">
                Paciente: <span className="font-semibold">{mostrarInfoPaciente.nombre} {mostrarInfoPaciente.apellido}</span>
                {mostrarInfoPaciente.numero_documento && (
                  <span className="ml-2">(Documento: {mostrarInfoPaciente.numero_documento})</span>
                )}
              </p>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            disabled={loading || isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Paciente *</label>
            
            {/* Siempre mostrar selector, pero en modo edición mostrar info adicional */}
            <div className="space-y-2">
              <select
                value={formData.paciente_id}
                onChange={(e) => handlePacienteChange(e.target.value)}
                disabled={loading || isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                  errors.paciente_id ? "border-red-500" : "border-gray-300"
                } ${(loading || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="">-- Selecciona un paciente --</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.apellido} ({p.numero_documento})
                  </option>
                ))}
              </select>
              
              {/* Mostrar info del paciente seleccionado o del paciente en edición */}
              {pacienteSeleccionado && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-blue-800">
                        {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
                      </p>
                      <p className="text-sm text-blue-600">
                        Documento: {pacienteSeleccionado.numero_documento}
                      </p>
                      {cotizacion?.id && (
                        <p className="text-xs text-blue-500 mt-1">
                          <span className="font-medium">Modo edición:</span> Puedes cambiar el paciente si es necesario
                        </p>
                      )}
                    </div>
                    {cotizacion?.id && (
                      <button
                        type="button"
                        onClick={handleCambiarPaciente}
                        className="text-sm text-red-600 hover:text-red-800"
                        title="Cambiar paciente"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {errors.paciente_id && <p className="text-xs text-red-600 mt-1">{errors.paciente_id}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor Responsable</label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <p className="text-gray-800">Dr Hernan Ignacio Cordoba</p>
              <input type="hidden" value="1" name="usuario_id" />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-3">INCLUYE</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-blue-200">
                    <th className="text-left py-2 px-3 font-semibold text-blue-800">Servicio</th>
                    <th className="text-center py-2 px-3 font-semibold text-blue-800 w-24">Requiere</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.servicios_incluidos.map((servicio, index) => (
                    <tr key={index} className="border-b border-blue-100 hover:bg-blue-100/50">
                      <td className="py-2 px-3 text-blue-700">
                        {servicio.servicio_nombre}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={servicio.requiere}
                          onChange={() => handleToggleServicioIncluido(index)}
                          disabled={loading || isSubmitting}
                          className="w-4 h-4 text-[#1a6b32] border-gray-300 rounded focus:ring-[#1a6b32]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-3">VALORES DE PROCEDIMIENTOS</h3>
            
            <div className="flex gap-2 mb-4">
              <select
                value={selectedProcedimiento}
                onChange={(e) => setSelectedProcedimiento(e.target.value)}
                disabled={loading || isSubmitting}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                  errors.procedimiento ? "border-red-500" : "border-gray-300"
                } ${(loading || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="">-- Selecciona procedimiento --</option>
                {procedimientos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (${cotizacionHelpers.formatCurrency(p.precio)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddItem("procedimiento")}
                disabled={loading || isSubmitting}
                className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                <span>Agregar</span>
              </button>
            </div>
            {errors.procedimiento && <p className="text-xs text-red-600 mb-2">{errors.procedimiento}</p>}

            {itemsProcedimientos.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                {itemsProcedimientos.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => handleUpdateItem(item.id!, "cantidad", Number.parseInt(e.target.value) || 1)}
                        min="1"
                        disabled={loading || isSubmitting}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                      <span className="text-gray-600 text-sm">×</span>
                      <span className="w-24 px-2 py-1 text-right text-sm">
                        ${item.precio_unitario.toLocaleString("es-CO")}
                      </span>
                      <span className="text-gray-800 font-semibold w-28 text-right">
                        ${item.subtotal.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id!)}
                      disabled={loading || isSubmitting}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="font-semibold">TOTAL PROCEDIMIENTOS:</span>
                  <span className="font-bold text-[#1a6b32]">
                    ${totals.subtotalProcedimientos.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-3">ADICIONALES</h3>
            
            <div className="flex gap-2 mb-4">
              <select
                value={selectedAdicional}
                onChange={(e) => setSelectedAdicional(e.target.value)}
                disabled={loading || isSubmitting}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                  errors.adicional ? "border-red-500" : "border-gray-300"
                } ${(loading || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="">-- Selecciona adicional --</option>
                {adicionales.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} (${cotizacionHelpers.formatCurrency(a.precio)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddItem("adicional")}
                disabled={loading || isSubmitting}
                className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                <span>Agregar</span>
              </button>
            </div>
            {errors.adicional && <p className="text-xs text-red-600 mb-2">{errors.adicional}</p>}

            {itemsAdicionales.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                {itemsAdicionales.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => handleUpdateItem(item.id!, "cantidad", Number.parseInt(e.target.value) || 1)}
                        min="1"
                        disabled={loading || isSubmitting}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                      <span className="text-gray-600 text-sm">×</span>
                      <span className="w-24 px-2 py-1 text-right text-sm">
                        ${item.precio_unitario.toLocaleString("es-CO")}
                      </span>
                      <span className="text-gray-800 font-semibold w-28 text-right">
                        ${item.subtotal.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id!)}
                      disabled={loading || isSubmitting}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="font-semibold">TOTAL ADICIONALES:</span>
                  <span className="font-bold text-[#1a6b32]">
                    ${totals.subtotalAdicionales.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-3">OTROS ADICIONALES</h3>
            
            <div className="flex gap-2 mb-4">
              <select
                value={selectedOtroAdicional}
                onChange={(e) => setSelectedOtroAdicional(e.target.value)}
                disabled={loading || isSubmitting}
                className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                  errors.otroAdicional ? "border-red-500" : "border-gray-300"
                } ${(loading || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="">-- Selecciona otro adicional --</option>
                {otrosAdicionales.map((oa) => (
                  <option key={oa.id} value={oa.id}>
                    {oa.nombre} {oa.precio > 0 ? `(${cotizacionHelpers.formatCurrency(oa.precio)})` : "(Incluido)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddItem("otroAdicional")}
                disabled={loading || isSubmitting}
                className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                <span>Agregar</span>
              </button>
            </div>
            {errors.otroAdicional && <p className="text-xs text-red-600 mb-2">{errors.otroAdicional}</p>}

            {itemsOtrosAdicionales.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                {itemsOtrosAdicionales.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => handleUpdateItem(item.id!, "cantidad", Number.parseInt(e.target.value) || 1)}
                        min="1"
                        disabled={loading || isSubmitting}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                      <span className="text-gray-600 text-sm">×</span>
                      <span className="w-24 px-2 py-1 text-right text-sm">
                        ${item.precio_unitario.toLocaleString("es-CO")}
                      </span>
                      <span className="text-gray-800 font-semibold w-28 text-right">
                        ${item.subtotal.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id!)}
                      disabled={loading || isSubmitting}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="font-semibold">TOTAL OTROS ADICIONALES:</span>
                  <span className="font-bold text-[#1a6b32]">
                    ${totals.subtotalOtrosAdicionales.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-[#1a6b32]/10 to-[#99d6e8]/10 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Subtotal Procedimientos:</span>
              <span className="font-semibold text-gray-800">
                ${totals.subtotalProcedimientos.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Subtotal Adicionales:</span>
              <span className="font-semibold text-gray-800">
                ${totals.subtotalAdicionales.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Subtotal Otros Adicionales:</span>
              <span className="font-semibold text-gray-800">
                ${totals.subtotalOtrosAdicionales.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-300 pt-2">
              <span className="text-lg font-bold text-[#1a6b32]">Total General:</span>
              <span className="text-lg font-bold text-[#1a6b32]">
                ${totals.total.toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          {/* Sección de observaciones */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              disabled={loading || isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] disabled:opacity-50"
              rows={3}
              placeholder="Notas adicionales sobre la cotización..."
            />
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="flex-1 bg-[#1a6b32] hover:bg-[#155529] text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Procesando..." : cotizacion ? "Actualizar Cotización" : "Crear Cotización"}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={loading || isSubmitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CotizacionForm