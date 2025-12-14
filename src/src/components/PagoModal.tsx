"use client"

import { X, Calendar } from "lucide-react"
import type { Cotizacion } from "../pages/CotizacionesPage"
import type { Paciente } from "../pages/PacientesPage"
import { generarPDFCotizacion } from "../utils/cotizacionPdfGenerator"
import { ConfirmarPagoModal } from "./ConfirmarPagoModal"
import { useState } from "react"

interface PagoModalProps {
  cotizacion: Cotizacion
  paciente?: Paciente
  onClose: () => void
  onEdit: () => void
  onPay: () => void
}

export function PagoModal({ cotizacion, paciente, onClose }: PagoModalProps) {
  const [descargando, setDescargando] = useState(false)
  const [showConfirmarPago, setShowConfirmarPago] = useState(false)

  const estadoColors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-800",
    aceptada: "bg-green-100 text-green-800",
    rechazada: "bg-red-100 text-red-800",
    facturada: "bg-blue-100 text-blue-800",
  }

  const handleDescargarPDF = async () => {
    if (!paciente) {
      alert("No se encontró información del paciente")
      return
    }

    setDescargando(true)
    try {
      const subtotalProcedimientos = cotizacion.items
        .filter(item => item.nombre.includes('ABDOMINOPLASTIA') || item.nombre.includes('LIPOESCULTURA') || item.nombre.includes('GLUTEOPLASTIA') || item.nombre.includes('CORRECCION'))
        .reduce((sum, item) => sum + item.subtotal, 0)
      
      const subtotalAdicionales = cotizacion.items
        .filter(item => !item.nombre.includes('ABDOMINOPLASTIA') && !item.nombre.includes('LIPOESCULTURA') && !item.nombre.includes('GLUTEOPLASTIA') && !item.nombre.includes('CORRECCION'))
        .reduce((sum, item) => sum + item.subtotal, 0)

      await generarPDFCotizacion({
        cotizacion: {
          ...cotizacion,
          subtotalProcedimientos,
          subtotalAdicionales,
          subtotalOtrosAdicionales: 0,
          total: cotizacion.total
        },
        paciente,
        items: cotizacion.items,
        serviciosIncluidos: cotizacion.serviciosIncluidos || []
      })
    } catch (error) {
      console.error("Error descargando PDF:", error)
      alert("Error al descargar el PDF. Por favor, intente nuevamente.")
    } finally {
      setDescargando(false)
    }
  }

  return (
    <>
      {/* MODAL PRINCIPAL */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Pago CZ-{cotizacion.id}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {paciente?.nombres} {paciente?.apellidos}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3"> 
                <Calendar className="text-[#99d6e8]" size={20} />
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Fecha</p>
                  <p className="font-medium text-gray-800">{cotizacion.fecha_creacion}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Estado</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[cotizacion.estado]}`}
                >
                  {cotizacion.estado}
                </span>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Ítems</h3>
              <div className="space-y-2">
                {cotizacion.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                      <p className="text-xs text-gray-600">{item.descripcion}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {item.cantidad} × ${item.precio_unitario.toLocaleString("es-CO")}
                      </p>
                      <p className="font-semibold text-gray-800">${item.subtotal.toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gradient-to-r from-[#1a6b32]/10 to-[#99d6e8]/10 rounded-lg p-4">
              <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-2">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold text-gray-800">${cotizacion.total.toLocaleString("es-CO")}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-bold text-[#1a6b32]">Total a Pagar:</span>
                <span className="text-lg font-bold text-[#1a6b32]">
                  ${cotizacion.total.toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            {/* Observaciones */}
            {cotizacion.observaciones && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Observaciones</p>
                <p className="text-sm text-gray-800">{cotizacion.observaciones}</p>
              </div>
            )}

            {/* Validez */}
            <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              Válido hasta: <span className="font-semibold text-gray-800">{cotizacion.fecha_vencimiento}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => setShowConfirmarPago(true)}
              className="flex-1 bg-[#669933] hover:bg-[#5a8a2a] text-white font-medium py-2 rounded-lg transition"
            >
              Pagar
            </button>

            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {showConfirmarPago && (
        <ConfirmarPagoModal
          cotizacion={cotizacion}
          paciente={paciente}
          onClose={() => setShowConfirmarPago(false)}
        />
      )}
    </>
  )
}
