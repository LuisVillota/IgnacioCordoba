"use client"

import type React from "react"

import { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { mockPacientes } from "../data/mockData"
import type { Cotizacion, CotizacionItem } from "../pages/CotizacionesPage"

interface CotizacionFormProps {
  cotizacion?: Cotizacion
  onSave: (data: Omit<Cotizacion, "id" | "fecha_creacion">) => void
  onClose: () => void
}

// Datos basados en el Excel proporcionado
const procedimientosBase = [
  { id: "1", nombre: "ABDOMINOPLASTIA + PEXIA SIN IMPLANTES", precio: 20000000 },
  { id: "2", nombre: "CORRECCION DE CICATRIZ 1", precio: 4000000 },
  { id: "3", nombre: "GLUTEOPLASTIA POR LIPOTRANSFERENCIA", precio: 3000000 },
  { id: "4", nombre: "LIPOESCULTURA 3 HORAS", precio: 12000000 },
]

const adicionalesBase = [
  { id: "a1", nombre: "SEGURO PARA COMPLICACIONES QUIRURGICAS", precio: 75200 },
  { id: "a2", nombre: "CAMARA HIPERBARICA (5 SESIONES)", precio: 700000 },
  { id: "a3", nombre: "MASAJES (10 SESIONES)", precio: 800000 },
]

const otrosAdicionalesBase = [
  { id: "oa1", nombre: "FAJA SUAVE", precio: 250000 },
  { id: "oa2", nombre: "FAJA RIGIDA", precio: 290000 },
  { id: "oa3", nombre: "BRASIER POST-QUIRURGICOS ALGODÓN", precio: 90000 },
  { id: "oa4", nombre: "TABLA ABDOMINAL", precio: 0 },
  { id: "oa5", nombre: "TABLA DERRIER", precio: 80000 },
  { id: "oa6", nombre: "MENTONERA", precio: 710000 },
]

// Servicios incluidos con checkbox
const serviciosIncluidos = [
  { id: "inc1", nombre: "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", requiere: false },
  { id: "inc2", nombre: "ANESTESIOLOGO", requiere: false },
  { id: "inc3", nombre: "CONTROLES CON MEDICO Y ENFERMERA", requiere: false },
  { id: "inc4", nombre: "VALORACION CON ANESTESIOLOGO", requiere: false },
  { id: "inc5", nombre: "HEMOGRAMA DE CONTROL", requiere: false },
  { id: "inc6", nombre: "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", requiere: false },
  { id: "inc7", nombre: "IMPLANTES", requiere: false },
]

export function CotizacionForm({ cotizacion, onSave, onClose }: CotizacionFormProps) {
  const [formData, setFormData] = useState({
    id_paciente: cotizacion?.id_paciente || "",
    estado: cotizacion?.estado || ("pendiente" as const),
    items: cotizacion?.items || [],
    serviciosIncluidos: cotizacion?.serviciosIncluidos || serviciosIncluidos,
    observaciones: cotizacion?.observaciones || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedProcedimiento, setSelectedProcedimiento] = useState<string>("")
  const [selectedAdicional, setSelectedAdicional] = useState<string>("")
  const [selectedOtroAdicional, setSelectedOtroAdicional] = useState<string>("")

  const calculateTotals = (items: CotizacionItem[]) => {
    const subtotalProcedimientos = items
      .filter(item => procedimientosBase.some(p => p.nombre === item.nombre))
      .reduce((sum, item) => sum + item.subtotal, 0)
    
    const subtotalAdicionales = items
      .filter(item => adicionalesBase.some(a => a.nombre === item.nombre))
      .reduce((sum, item) => sum + item.subtotal, 0)
    
    const subtotalOtrosAdicionales = items
      .filter(item => otrosAdicionalesBase.some(oa => oa.nombre === item.nombre))
      .reduce((sum, item) => sum + item.subtotal, 0)

    const total = items.reduce((sum, item) => sum + item.subtotal, 0)
    
    return {
      subtotalProcedimientos,
      subtotalAdicionales,
      subtotalOtrosAdicionales,
      total,
      total_con_impuesto: total, // Sin impuestos
    }
  }

  const handleToggleServicioIncluido = (servicioId: string) => {
    setFormData({
      ...formData,
      serviciosIncluidos: formData.serviciosIncluidos.map(servicio => 
        servicio.id === servicioId 
          ? { ...servicio, requiere: !servicio.requiere }
          : servicio
      )
    })
  }

  const handleAddItem = (tipo: "procedimiento" | "adicional" | "otroAdicional") => {
    let itemToAdd: any = null

    if (tipo === "procedimiento" && selectedProcedimiento) {
      itemToAdd = procedimientosBase.find((p) => p.id === selectedProcedimiento)
    } else if (tipo === "adicional" && selectedAdicional) {
      itemToAdd = adicionalesBase.find((a) => a.id === selectedAdicional)
    } else if (tipo === "otroAdicional" && selectedOtroAdicional) {
      itemToAdd = otrosAdicionalesBase.find((oa) => oa.id === selectedOtroAdicional)
    }

    if (!itemToAdd) {
      setErrors({ ...errors, [tipo]: `Selecciona un ${tipo}` })
      return
    }

    const newItem: CotizacionItem = {
      id: Date.now().toString(),
      nombre: itemToAdd.nombre,
      descripcion: "",
      cantidad: 1,
      precio_unitario: itemToAdd.precio,
      subtotal: itemToAdd.precio,
      tipo: tipo,
    }

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    })

    // Reset selection
    if (tipo === "procedimiento") setSelectedProcedimiento("")
    if (tipo === "adicional") setSelectedAdicional("")
    if (tipo === "otroAdicional") setSelectedOtroAdicional("")
  }

  const handleRemoveItem = (itemId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((i) => i.id !== itemId),
    })
  }

  const handleUpdateItem = (itemId: string, field: string, value: any) => {
    setFormData({
      ...formData,
      items: formData.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value }
          if (field === "cantidad" || field === "precio_unitario") {
            updated.subtotal = updated.cantidad * updated.precio_unitario
          }
          return updated
        }
        return item
      }),
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.id_paciente) newErrors.id_paciente = "Selecciona un paciente"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      const totals = calculateTotals(formData.items)
      const fecha_vencimiento = new Date()
      fecha_vencimiento.setDate(fecha_vencimiento.getDate() + 7) // Validez fija de 7 días

      onSave({
        ...formData,
        ...totals,
        fecha_vencimiento: fecha_vencimiento.toISOString().split("T")[0],
        validez_dias: 7, // Validez fija
      })
    }
  }

  const totals = calculateTotals(formData.items)

  // Filtrar items por tipo para mostrar en secciones separadas
  const itemsProcedimientos = formData.items.filter(item => 
    procedimientosBase.some(p => p.nombre === item.nombre)
  )
  const itemsAdicionales = formData.items.filter(item => 
    adicionalesBase.some(a => a.nombre === item.nombre)
  )
  const itemsOtrosAdicionales = formData.items.filter(item => 
    otrosAdicionalesBase.some(oa => oa.nombre === item.nombre)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">{cotizacion ? "Editar Cotización" : "Nueva Cotización"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Paciente */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Paciente</label>
            <select
              value={formData.id_paciente}
              onChange={(e) => setFormData({ ...formData, id_paciente: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                errors.id_paciente ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">-- Selecciona un paciente --</option>
              {mockPacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombres} {p.apellidos} ({p.documento})
                </option>
              ))}
            </select>
            {errors.id_paciente && <p className="text-xs text-red-600 mt-1">{errors.id_paciente}</p>}
          </div>

          {/* Sección INCLUYE - Tabla con checkboxes */}
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
                  {formData.serviciosIncluidos.map((servicio) => (
                    <tr key={servicio.id} className="border-b border-blue-100 hover:bg-blue-100/50">
                      <td className="py-2 px-3 text-blue-700">
                        {servicio.nombre}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={servicio.requiere}
                          onChange={() => handleToggleServicioIncluido(servicio.id)}
                          className="w-4 h-4 text-[#1a6b32] border-gray-300 rounded focus:ring-[#1a6b32]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* VALORES DE PROCEDIMIENTOS */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">VALORES DE PROCEDIMIENTOS</h3>
            
            {/* Add Procedimiento */}
            <div className="flex gap-2 mb-4">
              <select
                value={selectedProcedimiento}
                onChange={(e) => setSelectedProcedimiento(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
              >
                <option value="">-- Selecciona procedimiento --</option>
                {procedimientosBase.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (${p.precio.toLocaleString("es-CO")})
                  </option>
                ))}
              </select>
              <button  
                type="button"
                onClick={() => handleAddItem("procedimiento")}
                className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
              >
                <Plus size={18} />
                <span>Agregar</span>
              </button>
            </div>

            {/* Items Table - Procedimientos */}
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
                        onChange={(e) => handleUpdateItem(item.id, "cantidad", Number.parseInt(e.target.value) || 1)}
                        min="1"
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
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
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

          {/* ADICIONALES */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">ADICIONALES</h3>
            
            {/* Add Adicional */}
            <div className="flex gap-2 mb-4">
              <select
                value={selectedAdicional}
                onChange={(e) => setSelectedAdicional(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
              >
                <option value="">-- Selecciona adicional --</option>
                {adicionalesBase.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} (${a.precio.toLocaleString("es-CO")})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddItem("adicional")}
                className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
              >
                <Plus size={18} />
                <span>Agregar</span>
              </button>
            </div>

            {/* Items Table - Adicionales */}
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
                        onChange={(e) => handleUpdateItem(item.id, "cantidad", Number.parseInt(e.target.value) || 1)}
                        min="1"
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
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
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

          {/* OTROS ADICIONALES */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">OTROS ADICIONALES</h3>
            
            {/* Add Otro Adicional */}
            <div className="flex gap-2 mb-4">
              <select
                value={selectedOtroAdicional}
                onChange={(e) => setSelectedOtroAdicional(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
              >
                <option value="">-- Selecciona otro adicional --</option>
                {otrosAdicionalesBase.map((oa) => (
                  <option key={oa.id} value={oa.id}>
                    {oa.nombre} {oa.precio > 0 ? `($${oa.precio.toLocaleString("es-CO")})` : "(Incluido)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddItem("otroAdicional")}
                className="bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
              >
                <Plus size={18} />
                <span>Agregar</span>
              </button>
            </div>

            {/* Items Table - Otros Adicionales */}
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
                        onChange={(e) => handleUpdateItem(item.id, "cantidad", Number.parseInt(e.target.value) || 1)}
                        min="1"
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
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
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

          {/* Totals - Sin impuestos */}
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
              <span className="text-lg font-bold text-[#1a6b32]">
                ${totals.total.toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
            >
              <option value="pendiente">Pendiente</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
              <option value="facturada">Facturada</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-[#1a6b32] hover:bg-[#155529] text-white font-medium py-2 rounded-lg transition"
            >
              {cotizacion ? "Actualizar" : "Crear"} Cotización
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}