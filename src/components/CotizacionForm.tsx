"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { X, Plus, Trash2, Search, ChevronDown, User } from "lucide-react"
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

interface paciente {
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
  const [formData, setFormData] = useState({
    paciente_id: cotizacion?.paciente_id?.toString() || "",
    usuario_id: "1",
    estado: cotizacion?.estado || "pendiente",
    items: cotizacion?.items || [],
    servicios_incluidos: cotizacion?.servicios_incluidos ?? serviciosIncluidosFijos,
    observaciones: cotizacion?.observaciones || "",
  })

  const [procedimientos, setProcedimientos] = useState<ProcedimientoCatalogo[]>([])
  const [adicionales, setAdicionales] = useState<AdicionalCatalogo[]>([])
  const [otrosAdicionales, setOtrosAdicionales] = useState<AdicionalCatalogo[]>([])
  const [pacientes, setpacientes] = useState<paciente[]>([])
  const [pacienteSeleccionado, setpacienteSeleccionado] = useState<paciente | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedProcedimiento, setSelectedProcedimiento] = useState<string>("")
  const [selectedAdicional, setSelectedAdicional] = useState<string>("")
  const [selectedOtroAdicional, setSelectedOtroAdicional] = useState<string>("")

  const [searchProcedimiento, setSearchProcedimiento] = useState("")
  const [showProcedimientoDropdown, setShowProcedimientoDropdown] = useState(false)
  const [searchAdicional, setSearchAdicional] = useState("")
  const [showAdicionalDropdown, setShowAdicionalDropdown] = useState(false)
  const [searchOtroAdicional, setSearchOtroAdicional] = useState("")
  const [showOtroAdicionalDropdown, setShowOtroAdicionalDropdown] = useState(false)

  // ── NUEVO: estado para el buscador de pacientes ──
  const [searchPaciente, setSearchPaciente] = useState("")
  const [showPacienteDropdown, setShowPacienteDropdown] = useState(false)
  const pacienteDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isSubmittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pacienteDropdownRef.current && !pacienteDropdownRef.current.contains(e.target as Node)) {
        setShowPacienteDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filtrar pacientes según búsqueda
  const pacientesFiltrados = useMemo(() => {
    if (!searchPaciente.trim()) return pacientes
    const term = searchPaciente.toLowerCase()
    return pacientes.filter(p =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(term) ||
      p.numero_documento?.toLowerCase().includes(term)
    )
  }, [pacientes, searchPaciente])

  const calculateTotals = () => {
    let subtotalProcedimientos = 0;
    let subtotalAdicionales = 0;
    let subtotalOtrosAdicionales = 0;

    formData.items.forEach((item) => {
      const cantidad = Number(item.cantidad) || 1;
      const precioUnitario = Number(item.precio_unitario) || 0;
      const subtotal = cantidad * precioUnitario;

      if (item.tipo === "procedimiento") subtotalProcedimientos += subtotal;
      else if (item.tipo === "adicional") subtotalAdicionales += subtotal;
      else if (item.tipo === "otroAdicional") subtotalOtrosAdicionales += subtotal;
    });

    return {
      subtotalProcedimientos,
      subtotalAdicionales,
      subtotalOtrosAdicionales,
      total: subtotalProcedimientos + subtotalAdicionales + subtotalOtrosAdicionales
    };
  }

  const totals = useMemo(() => calculateTotals(), [formData.items]);

  useEffect(() => { loadInitialData() }, [])

  // Pre-seleccionar paciente en modo edición
  useEffect(() => {
    if (pacientes.length === 0) return;
    const idToFind = cotizacion?.paciente_id?.toString()
    if (!idToFind) return;
    const found = pacientes.find(p => p.id.toString() === idToFind)
    if (found) {
      setpacienteSeleccionado(found)
      setFormData(prev => ({ ...prev, paciente_id: idToFind }))
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
      const pacRes = await api.getpacientes(100)
      setpacientes(pacRes.pacientes || [])
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
      nuevosServicios[index] = { ...nuevosServicios[index], requiere: !nuevosServicios[index].requiere }
      return { ...prev, servicios_incluidos: nuevosServicios }
    })
  }

  const handleAddItem = (tipo: "procedimiento" | "adicional" | "otroAdicional") => {
    let itemToAdd: ProcedimientoCatalogo | AdicionalCatalogo | undefined

    if (tipo === "procedimiento" && selectedProcedimiento)
      itemToAdd = procedimientos.find((p) => p.id.toString() === selectedProcedimiento)
    else if (tipo === "adicional" && selectedAdicional)
      itemToAdd = adicionales.find((a) => a.id.toString() === selectedAdicional)
    else if (tipo === "otroAdicional" && selectedOtroAdicional)
      itemToAdd = otrosAdicionales.find((oa) => oa.id.toString() === selectedOtroAdicional)

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

    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }))

    if (tipo === "procedimiento") { setSelectedProcedimiento(""); setSearchProcedimiento(""); setErrors(prev => ({ ...prev, procedimiento: "" })) }
    if (tipo === "adicional") { setSelectedAdicional(""); setSearchAdicional(""); setErrors(prev => ({ ...prev, adicional: "" })) }
    if (tipo === "otroAdicional") { setSelectedOtroAdicional(""); setSearchOtroAdicional(""); setErrors(prev => ({ ...prev, otroAdicional: "" })) }
  }

  const handleRemoveItem = (itemId: string) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((i) => i.id !== itemId) }))
  }

  const handleUpdateItem = (itemId: string, field: string, value: any) => {
    setFormData(prev => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value }
          if (field === "cantidad" || field === "precio_unitario") {
            updated.subtotal = (Number(updated.cantidad) || 1) * (Number(updated.precio_unitario) || 0)
          }
          return updated
        }
        return item
      })
      return { ...prev, items: updatedItems }
    })
  }

  // ── NUEVO: seleccionar paciente desde el dropdown ──
  const handleSeleccionarPaciente = (p: paciente) => {
    setpacienteSeleccionado(p)
    setFormData(prev => ({ ...prev, paciente_id: p.id.toString() }))
    setShowPacienteDropdown(false)
    setSearchPaciente("")
    if (errors.paciente_id) setErrors(prev => ({ ...prev, paciente_id: "" }))
  }

  const handleCambiarpaciente = () => {
    setpacienteSeleccionado(null)
    setFormData(prev => ({ ...prev, paciente_id: "" }))
    setSearchPaciente("")
    setTimeout(() => {
      setShowPacienteDropdown(true)
      searchInputRef.current?.focus()
    }, 50)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.paciente_id || formData.paciente_id === "")
      newErrors.paciente_id = "Selecciona un paciente";
    if (formData.items.length === 0)
      newErrors.items = "Debe agregar al menos un procedimiento o adicional";
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting || isSubmittingRef.current) return;
    if (!validateForm()) { alert("Por favor, corrige los errores antes de enviar"); return; }

    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
      const estadoMap: Record<string, number> = { pendiente: 1, aceptada: 2, rechazada: 3, facturada: 4 };
      const estadoSeleccionado = cotizacion?.estado || "pendiente";
      let estado_id = estadoMap[estadoSeleccionado] ?? 1;

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
      if (cotizacion?.fecha_vencimiento) fecha_vencimiento = cotizacion.fecha_vencimiento;

      const backendData = {
        paciente_id: parseInt(formData.paciente_id || "0"),
        usuario_id: parseInt(formData.usuario_id) || 1,
        estado_id,
        items,
        servicios_incluidos,
        subtotal_procedimientos: totals.subtotalProcedimientos,
        subtotal_adicionales: totals.subtotalAdicionales,
        subtotal_otros_adicionales: totals.subtotalOtrosAdicionales,
        observaciones: formData.observaciones || "",
        fecha_vencimiento,
        validez_dias: 7
      };

      const pacienteInfo = pacienteSeleccionado || pacientes.find(p => p.id.toString() === formData.paciente_id);

      const responseData = {
        ...formData,
        ...totals,
        id: cotizacion?.id || '',
        fecha_creacion: cotizacion?.fecha_creacion || new Date().toISOString().split('T')[0],
        fecha_vencimiento,
        validez_dias: 7,
        paciente_nombre: pacienteInfo ? `${pacienteInfo.nombre} ${pacienteInfo.apellido}` : '',
        paciente_apellido: pacienteInfo?.apellido || '',
        usuario_nombre: "Dr Hernan Ignacio Cordoba",
        paciente_documento: pacienteInfo?.numero_documento || '',
        _isEditing: !!cotizacion?.id,
        _cotizacionId: cotizacion?.id ? parseInt(cotizacion.id) : undefined,
        _backendData: backendData
      };

      onSave(responseData);
      if (onSuccess) onSuccess();
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

        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{cotizacion ? "Editar Cotización" : "Nueva Cotización"}</h2>
            {pacienteSeleccionado && (
              <p className="text-sm text-gray-600 mt-1">
                Paciente: <span className="font-semibold">{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}</span>
                {pacienteSeleccionado.numero_documento && <span className="ml-2">(Doc: {pacienteSeleccionado.numero_documento})</span>}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={loading || isSubmitting} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ─────────────────────────────────────────────
              SELECTOR DE PACIENTE CON BUSCADOR
          ───────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Paciente <span className="text-red-500">*</span>
            </label>

            {pacienteSeleccionado ? (
              /* Paciente ya elegido → tarjeta con opción de cambio */
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a6b32] flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900 text-sm">
                      {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
                    </p>
                    <p className="text-xs text-green-700">Doc: {pacienteSeleccionado.numero_documento}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCambiarpaciente}
                  className="text-xs text-[#1a6b32] hover:text-[#155228] font-medium border border-[#1a6b32] rounded px-2 py-1 hover:bg-green-50 transition"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              /* Sin paciente → campo de búsqueda + dropdown */
              <div ref={pacienteDropdownRef} className="relative">
                {/* Input de búsqueda */}
                <div
                  className={`flex items-center gap-2 w-full px-3 py-2.5 border rounded-lg cursor-text transition
                    ${errors.paciente_id ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus-within:border-[#1a6b32] focus-within:ring-1 focus-within:ring-[#1a6b32]/30"}`}
                  onClick={() => { setShowPacienteDropdown(true); searchInputRef.current?.focus() }}
                >
                  <Search size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={loading ? "Cargando pacientes..." : "Buscar por nombre o documento..."}
                    value={searchPaciente}
                    onChange={e => { setSearchPaciente(e.target.value); setShowPacienteDropdown(true) }}
                    onFocus={() => setShowPacienteDropdown(true)}
                    disabled={loading || isSubmitting}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 min-w-0"
                  />
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 flex-shrink-0 transition-transform ${showPacienteDropdown ? "rotate-180" : ""}`}
                  />
                </div>

                {/* Dropdown con lista */}
                {showPacienteDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* Contador */}
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {loading
                          ? "Cargando..."
                          : `${pacientesFiltrados.length} paciente${pacientesFiltrados.length !== 1 ? "s" : ""}${searchPaciente ? " encontrado" + (pacientesFiltrados.length !== 1 ? "s" : "") : ""}`
                        }
                      </span>
                      {searchPaciente && (
                        <button
                          type="button"
                          onClick={() => setSearchPaciente("")}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>

                    {/* Lista scrolleable */}
                    <div className="max-h-64 overflow-y-auto">
                      {loading ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1a6b32]" />
                          <span className="text-sm">Cargando pacientes...</span>
                        </div>
                      ) : pacientesFiltrados.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-500">
                            {searchPaciente ? `No se encontró "${searchPaciente}"` : "No hay pacientes registrados"}
                          </p>
                        </div>
                      ) : (
                        pacientesFiltrados.map((p, idx) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSeleccionarPaciente(p)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a6b32]/5 transition text-left border-b border-gray-50 last:border-0
                              ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#1a6b32]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[#1a6b32] font-semibold text-xs">
                                {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {p.nombre} {p.apellido}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                Doc: {p.numero_documento}
                              </p>
                            </div>
                            <span className="text-xs text-[#1a6b32] opacity-0 group-hover:opacity-100 font-medium flex-shrink-0">
                              Seleccionar
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {errors.paciente_id && (
                  <p className="text-xs text-red-600 mt-1">{errors.paciente_id}</p>
                )}
              </div>
            )}
          </div>

          {/* DOCTOR */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor Responsable</label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <p className="text-gray-800">Dr Hernan Ignacio Cordoba</p>
              <input type="hidden" value="1" name="usuario_id" />
            </div>
          </div>

          {/* SERVICIOS INCLUIDOS */}
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
                      <td className="py-2 px-3 text-blue-700">{servicio.servicio_nombre}</td>
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

          {/* PROCEDIMIENTOS */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">VALORES DE PROCEDIMIENTOS</h3>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar procedimiento..."
                  value={selectedProcedimiento
                    ? (procedimientos.find(p => p.id.toString() === selectedProcedimiento)?.nombre ?? searchProcedimiento)
                    : searchProcedimiento}
                  onChange={(e) => { setSearchProcedimiento(e.target.value); setSelectedProcedimiento(""); setShowProcedimientoDropdown(true) }}
                  onFocus={() => setShowProcedimientoDropdown(true)}
                  onBlur={() => setTimeout(() => setShowProcedimientoDropdown(false), 150)}
                  disabled={loading || isSubmitting}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${errors.procedimiento ? "border-red-500" : "border-gray-300"}`}
                />
                {showProcedimientoDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {procedimientos
                      .filter(p => !searchProcedimiento.trim() || p.nombre.toLowerCase().includes(searchProcedimiento.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedProcedimiento(p.id.toString()); setSearchProcedimiento(""); setShowProcedimientoDropdown(false) }}
                          className="w-full text-left px-3 py-2 hover:bg-[#1a6b32]/5 border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium text-gray-800">{p.nombre}</span>
                          <span className="text-gray-500 ml-2 text-sm">(${cotizacionHelpers.formatCurrency(p.precio)})</span>
                        </button>
                      ))}
                    {procedimientos.filter(p => !searchProcedimiento.trim() || p.nombre.toLowerCase().includes(searchProcedimiento.toLowerCase())).length === 0 && (
                      <p className="px-3 py-3 text-sm text-gray-500">No se encontraron procedimientos</p>
                    )}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => handleAddItem("procedimiento")} disabled={loading || isSubmitting} className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition disabled:opacity-50">
                <Plus size={18} /><span>Agregar</span>
              </button>
            </div>
            {errors.procedimiento && <p className="text-xs text-red-600 mb-2">{errors.procedimiento}</p>}

            {itemsProcedimientos.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                {itemsProcedimientos.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg flex items-center gap-3">
                    <div className="flex-1"><p className="font-medium text-gray-800">{item.nombre}</p></div>
                    <div className="flex items-center gap-2">
                      <input type="number" value={item.cantidad} onChange={(e) => handleUpdateItem(item.id!, "cantidad", parseInt(e.target.value) || 1)} min="1" disabled={loading || isSubmitting} className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm" />
                      <span className="text-gray-600 text-sm">×</span>
                      <span className="w-24 px-2 py-1 text-right text-sm">${item.precio_unitario.toLocaleString("es-CO")}</span>
                      <span className="text-gray-800 font-semibold w-28 text-right">${item.subtotal.toLocaleString("es-CO")}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(item.id!)} disabled={loading || isSubmitting} className="p-1 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={18} /></button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="font-semibold">TOTAL PROCEDIMIENTOS:</span>
                  <span className="font-bold text-[#1a6b32]">${totals.subtotalProcedimientos.toLocaleString("es-CO")}</span>
                </div>
              </div>
            )}
          </div>

          {/* ADICIONALES */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">ADICIONALES</h3>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar adicional..."
                  value={selectedAdicional
                    ? (adicionales.find(a => a.id.toString() === selectedAdicional)?.nombre ?? searchAdicional)
                    : searchAdicional}
                  onChange={(e) => { setSearchAdicional(e.target.value); setSelectedAdicional(""); setShowAdicionalDropdown(true) }}
                  onFocus={() => setShowAdicionalDropdown(true)}
                  onBlur={() => setTimeout(() => setShowAdicionalDropdown(false), 150)}
                  disabled={loading || isSubmitting}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${errors.adicional ? "border-red-500" : "border-gray-300"}`}
                />
                {showAdicionalDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {adicionales
                      .filter(a => !searchAdicional.trim() || a.nombre.toLowerCase().includes(searchAdicional.toLowerCase()))
                      .map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedAdicional(a.id.toString()); setSearchAdicional(""); setShowAdicionalDropdown(false) }}
                          className="w-full text-left px-3 py-2 hover:bg-[#1a6b32]/5 border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium text-gray-800">{a.nombre}</span>
                          <span className="text-gray-500 ml-2 text-sm">(${cotizacionHelpers.formatCurrency(a.precio)})</span>
                        </button>
                      ))}
                    {adicionales.filter(a => !searchAdicional.trim() || a.nombre.toLowerCase().includes(searchAdicional.toLowerCase())).length === 0 && (
                      <p className="px-3 py-3 text-sm text-gray-500">No se encontraron adicionales</p>
                    )}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => handleAddItem("adicional")} disabled={loading || isSubmitting} className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition disabled:opacity-50">
                <Plus size={18} /><span>Agregar</span>
              </button>
            </div>
            {errors.adicional && <p className="text-xs text-red-600 mb-2">{errors.adicional}</p>}

            {itemsAdicionales.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                {itemsAdicionales.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg flex items-center gap-3">
                    <div className="flex-1"><p className="font-medium text-gray-800">{item.nombre}</p></div>
                    <div className="flex items-center gap-2">
                      <input type="number" value={item.cantidad} onChange={(e) => handleUpdateItem(item.id!, "cantidad", parseInt(e.target.value) || 1)} min="1" disabled={loading || isSubmitting} className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm" />
                      <span className="text-gray-600 text-sm">×</span>
                      <span className="w-24 px-2 py-1 text-right text-sm">${item.precio_unitario.toLocaleString("es-CO")}</span>
                      <span className="text-gray-800 font-semibold w-28 text-right">${item.subtotal.toLocaleString("es-CO")}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(item.id!)} disabled={loading || isSubmitting} className="p-1 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={18} /></button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="font-semibold">TOTAL ADICIONALES:</span>
                  <span className="font-bold text-[#1a6b32]">${totals.subtotalAdicionales.toLocaleString("es-CO")}</span>
                </div>
              </div>
            )}
          </div>

          {/* OTROS ADICIONALES */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">OTROS ADICIONALES</h3>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar otro adicional..."
                  value={selectedOtroAdicional
                    ? (otrosAdicionales.find(oa => oa.id.toString() === selectedOtroAdicional)?.nombre ?? searchOtroAdicional)
                    : searchOtroAdicional}
                  onChange={(e) => { setSearchOtroAdicional(e.target.value); setSelectedOtroAdicional(""); setShowOtroAdicionalDropdown(true) }}
                  onFocus={() => setShowOtroAdicionalDropdown(true)}
                  onBlur={() => setTimeout(() => setShowOtroAdicionalDropdown(false), 150)}
                  disabled={loading || isSubmitting}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${errors.otroAdicional ? "border-red-500" : "border-gray-300"}`}
                />
                {showOtroAdicionalDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {otrosAdicionales
                      .filter(oa => !searchOtroAdicional.trim() || oa.nombre.toLowerCase().includes(searchOtroAdicional.toLowerCase()))
                      .map(oa => (
                        <button
                          key={oa.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedOtroAdicional(oa.id.toString()); setSearchOtroAdicional(""); setShowOtroAdicionalDropdown(false) }}
                          className="w-full text-left px-3 py-2 hover:bg-[#1a6b32]/5 border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium text-gray-800">{oa.nombre}</span>
                          <span className="text-gray-500 ml-2 text-sm">{oa.precio > 0 ? `($${cotizacionHelpers.formatCurrency(oa.precio)})` : "(Incluido)"}</span>
                        </button>
                      ))}
                    {otrosAdicionales.filter(oa => !searchOtroAdicional.trim() || oa.nombre.toLowerCase().includes(searchOtroAdicional.toLowerCase())).length === 0 && (
                      <p className="px-3 py-3 text-sm text-gray-500">No se encontraron otros adicionales</p>
                    )}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => handleAddItem("otroAdicional")} disabled={loading || isSubmitting} className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition disabled:opacity-50">
                <Plus size={18} /><span>Agregar</span>
              </button>
            </div>
            {errors.otroAdicional && <p className="text-xs text-red-600 mb-2">{errors.otroAdicional}</p>}

            {itemsOtrosAdicionales.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                {itemsOtrosAdicionales.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-lg flex items-center gap-3">
                    <div className="flex-1"><p className="font-medium text-gray-800">{item.nombre}</p></div>
                    <div className="flex items-center gap-2">
                      <input type="number" value={item.cantidad} onChange={(e) => handleUpdateItem(item.id!, "cantidad", parseInt(e.target.value) || 1)} min="1" disabled={loading || isSubmitting} className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm" />
                      <span className="text-gray-600 text-sm">×</span>
                      <span className="w-24 px-2 py-1 text-right text-sm">${item.precio_unitario.toLocaleString("es-CO")}</span>
                      <span className="text-gray-800 font-semibold w-28 text-right">${item.subtotal.toLocaleString("es-CO")}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(item.id!)} disabled={loading || isSubmitting} className="p-1 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={18} /></button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="font-semibold">TOTAL OTROS ADICIONALES:</span>
                  <span className="font-bold text-[#1a6b32]">${totals.subtotalOtrosAdicionales.toLocaleString("es-CO")}</span>
                </div>
              </div>
            )}
          </div>

          {/* TOTALES */}
          <div className="bg-gradient-to-r from-[#1a6b32]/10 to-[#99d6e8]/10 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Subtotal Procedimientos:</span>
              <span className="font-semibold text-gray-800">${totals.subtotalProcedimientos.toLocaleString("es-CO")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Subtotal Adicionales:</span>
              <span className="font-semibold text-gray-800">${totals.subtotalAdicionales.toLocaleString("es-CO")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Subtotal Otros Adicionales:</span>
              <span className="font-semibold text-gray-800">${totals.subtotalOtrosAdicionales.toLocaleString("es-CO")}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-300 pt-2">
              <span className="text-lg font-bold text-[#1a6b32]">Total General:</span>
              <span className="text-lg font-bold text-[#1a6b32]">${totals.total.toLocaleString("es-CO")}</span>
            </div>
          </div>

          {errors.items && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errors.items}</p>
          )}

          {/* OBSERVACIONES */}
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

          {/* BOTONES */}
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