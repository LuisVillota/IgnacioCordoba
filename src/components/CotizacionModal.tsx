"use client"

import { X, Calendar, Printer, Loader2 } from "lucide-react"
import { useState } from "react"
import type { Cotizacion } from "../types/cotizacion"

interface paciente {
  nombres: string
  apellidos: string
  documento?: string
}

interface CotizacionModalProps {
  cotizacion: Cotizacion
  paciente?: paciente
  onClose: () => void
  onEdit: () => void
}

export function CotizacionModal({ cotizacion, paciente, onClose, onEdit }: CotizacionModalProps) {
  const [imprimiendo, setImprimiendo] = useState(false)

  const itemsPorTipo = {
    procedimientos: cotizacion.items.filter(item => item.tipo === 'procedimiento'),
    adicionales: cotizacion.items.filter(item => item.tipo === 'adicional'),
    otrosAdicionales: cotizacion.items.filter(item => item.tipo === 'otroAdicional'),
  }

  // CORRECCIÓN: Usar solo servicios_incluidos, no serviciosIncluidos
  const serviciosIncluidos = cotizacion.servicios_incluidos ?? []

  // Helper para obtener los subtotales en el formato correcto
  const getSubtotalProcedimientos = () => cotizacion.subtotal_procedimientos || 0
  const getSubtotalAdicionales = () => cotizacion.subtotal_adicionales || 0
  const getSubtotalOtrosAdicionales = () => cotizacion.subtotal_otros_adicionales || 0

  const handleImprimir = () => {
    setImprimiendo(true)
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert("No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes.")
        return
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Cotización CZ-${cotizacion.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a6b32; padding-bottom: 20px; }
              .title { color: #1a6b32; font-size: 24px; font-weight: bold; }
              .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
              .section { margin-bottom: 20px; }
              .section-title { background: #f3f4f6; padding: 8px 12px; font-weight: bold; border-left: 4px solid #1a6b32; margin-bottom: 10px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
              .info-item { margin-bottom: 8px; }
              .info-label { font-weight: bold; color: #555; font-size: 13px; }
              .info-value { color: #222; }
              .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              .table th { background: #f8f9fa; text-align: left; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: bold; }
              .table td { padding: 10px; border-bottom: 1px solid #dee2e6; }
              .total-section { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .grand-total { font-size: 18px; font-weight: bold; color: #1a6b32; border-top: 1px solid #cbd5e1; padding-top: 10px; }
              .observaciones { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .validez { text-align: center; font-style: italic; color: #666; margin-top: 20px; }
              .servicios-incluidos { margin-top: 20px; }
              .servicio-item { display: flex; align-items: center; margin-bottom: 5px; }
              .servicio-check { color: #10b981; margin-right: 8px; font-size: 14px; }
              .servicio-text { font-size: 13px; }
              @media print {
                body { margin: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">COTIZACIÓN MÉDICA</div>
              <div class="subtitle">Consultorio Dr. Ignacio Córdoba</div>
            </div>

            <div class="info-grid">
              <div>
                <div class="info-item">
                  <div class="info-label">N° COTIZACIÓN</div>
                  <div class="info-value">CZ-${cotizacion.id}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">FECHA DE EMISIÓN</div>
                  <div class="info-value">${cotizacion.fecha_creacion}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">VÁLIDO HASTA</div>
                  <div class="info-value">${cotizacion.fecha_vencimiento}</div>
                </div>
              </div>
              <div>
                <div class="info-item">
                  <div class="info-label">paciente</div>
                  <div class="info-value">${paciente?.nombres} ${paciente?.apellidos}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">DOCUMENTO</div>
                  <div class="info-value">${paciente?.documento || 'No especificado'}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">SERVICIOS INCLUIDOS</div>
              <div class="servicios-incluidos">
                ${serviciosIncluidos.map((servicio: any) => `
                  <div class="servicio-item">
                    <span class="servicio-check">${servicio.requiere ? '✓' : '○'}</span>
                    <span class="servicio-text">${servicio.servicio_nombre || 'Servicio'}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="section">
              <div class="section-title">PROCEDIMIENTOS</div>
              ${itemsPorTipo.procedimientos.length > 0 ? `
                <table class="table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cant.</th>
                      <th>Valor Unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsPorTipo.procedimientos.map(item => `
                      <tr>
                        <td>${item.nombre}</td>
                        <td>${item.cantidad}</td>
                        <td>$${item.precio_unitario.toLocaleString('es-CO')}</td>
                        <td>$${item.subtotal.toLocaleString('es-CO')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p style="color: #666; font-style: italic; padding: 10px;">No hay procedimientos</p>'}
            </div>

            ${itemsPorTipo.adicionales.length > 0 ? `
              <div class="section">
                <div class="section-title">ADICIONALES</div>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cant.</th>
                      <th>Valor Unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsPorTipo.adicionales.map(item => `
                      <tr>
                        <td>${item.nombre}</td>
                        <td>${item.cantidad}</td>
                        <td>$${item.precio_unitario.toLocaleString('es-CO')}</td>
                        <td>$${item.subtotal.toLocaleString('es-CO')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${itemsPorTipo.otrosAdicionales.length > 0 ? `
              <div class="section">
                <div class="section-title">OTROS ADICIONALES</div>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cant.</th>
                      <th>Valor Unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsPorTipo.otrosAdicionales.map(item => `
                      <tr>
                        <td>${item.nombre}</td>
                        <td>${item.cantidad}</td>
                        <td>$${item.precio_unitario.toLocaleString('es-CO')}</td>
                        <td>$${item.subtotal.toLocaleString('es-CO')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <div class="total-section">
              <div class="total-row">
                <span>Subtotal Procedimientos:</span>
                <span>$${(getSubtotalProcedimientos()).toLocaleString('es-CO')}</span>
              </div>
              ${itemsPorTipo.adicionales.length > 0 ? `
                <div class="total-row">
                  <span>Subtotal Adicionales:</span>
                  <span>$${(getSubtotalAdicionales()).toLocaleString('es-CO')}</span>
                </div>
              ` : ''}
              ${itemsPorTipo.otrosAdicionales.length > 0 ? `
                <div class="total-row">
                  <span>Subtotal Otros Adicionales:</span>
                  <span>$${(getSubtotalOtrosAdicionales()).toLocaleString('es-CO')}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>TOTAL GENERAL:</span>
                <span>$${cotizacion.total.toLocaleString('es-CO')}</span>
              </div>
            </div>

            ${cotizacion.observaciones ? `
              <div class="observaciones">
                <strong>Observaciones:</strong>
                <p style="margin-top: 5px;">${cotizacion.observaciones}</p>
              </div>
            ` : ''}

            <div class="validez">
              <p>Esta cotización es válida hasta el ${cotizacion.fecha_vencimiento} (${cotizacion.validez_dias} días)</p>
            </div>

            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }
            </script>
          </body>
        </html>
      `)

      printWindow.document.close()
    } catch (error) {
      console.error("Error imprimiendo:", error)
      alert("Error al imprimir. Por favor, intente nuevamente.")
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Cotización CZ-{cotizacion.id}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {paciente?.nombres} {paciente?.apellidos}
              {paciente?.documento && ` (${paciente.documento})`}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="text-[#1a6b32]" size={20} />
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Fecha Emisión</p>
                <p className="font-medium text-gray-800">{cotizacion.fecha_creacion}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="text-[#f59e0b]" size={20} />
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Válido Hasta</p>
                <p className="font-medium text-gray-800">{cotizacion.fecha_vencimiento}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Días de Validez</p>
              <p className="font-medium text-gray-800">{cotizacion.validez_dias} días</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span>Servicios Incluidos</span>
              <span className="text-sm font-normal text-gray-500">
                (${serviciosIncluidos.filter((s: any) => s.requiere).length} de ${serviciosIncluidos.length} seleccionados)
              </span>
            </h3>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              {serviciosIncluidos.length > 0 ? (
                serviciosIncluidos.map((servicio: any, index: number) => (
                  <div key={servicio.id || index} className="flex items-center">
                    <div className={`w-5 h-5 flex items-center justify-center rounded-full mr-3 ${servicio.requiere ? 'bg-[#1a6b32] text-white' : 'bg-gray-200'}`}>
                      {servicio.requiere ? '✓' : '○'}
                    </div>
                    <span className={`text-sm ${servicio.requiere ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                      {servicio.servicio_nombre || 'Servicio'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 italic">No hay servicios incluidos registrados</p>
                </div>
              )}
            </div>
          </div>

          {itemsPorTipo.procedimientos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Procedimientos</h3>
              <div className="space-y-3">
                {itemsPorTipo.procedimientos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                      {item.descripcion && (
                        <p className="text-xs text-gray-600 mt-1">{item.descripcion}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {item.cantidad} × ${item.precio_unitario.toLocaleString("es-CO")}
                      </p>
                      <p className="font-semibold text-gray-800">${item.subtotal.toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="font-semibold text-gray-700">Total Procedimientos:</span>
                  <span className="font-bold text-[#1a6b32]">
                    ${(getSubtotalProcedimientos()).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {itemsPorTipo.adicionales.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Adicionales</h3>
              <div className="space-y-3">
                {itemsPorTipo.adicionales.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                      {item.descripcion && (
                        <p className="text-xs text-gray-600 mt-1">{item.descripcion}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {item.cantidad} × ${item.precio_unitario.toLocaleString("es-CO")}
                      </p>
                      <p className="font-semibold text-gray-800">${item.subtotal.toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="font-semibold text-gray-700">Total Adicionales:</span>
                  <span className="font-bold text-[#1a6b32]">
                    ${(getSubtotalAdicionales()).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {itemsPorTipo.otrosAdicionales.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Otros Adicionales</h3>
              <div className="space-y-3">
                {itemsPorTipo.otrosAdicionales.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.nombre}</p>
                      {item.descripcion && (
                        <p className="text-xs text-gray-600 mt-1">{item.descripcion}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {item.cantidad} × ${item.precio_unitario.toLocaleString("es-CO")}
                      </p>
                      <p className="font-semibold text-gray-800">${item.subtotal.toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="font-semibold text-gray-700">Total Otros Adicionales:</span>
                  <span className="font-bold text-[#1a6b32]">
                    ${(getSubtotalOtrosAdicionales()).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-[#1a6b32]/10 to-[#99d6e8]/10 rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Subtotal Procedimientos:</span>
              <span className="font-semibold text-gray-800">
                ${(getSubtotalProcedimientos()).toLocaleString("es-CO")}
              </span>
            </div>
            {itemsPorTipo.adicionales.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Subtotal Adicionales:</span>
                <span className="font-semibold text-gray-800">
                  ${(getSubtotalAdicionales()).toLocaleString("es-CO")}
                </span>
              </div>
            )}
            {itemsPorTipo.otrosAdicionales.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Subtotal Otros Adicionales:</span>
                <span className="font-semibold text-gray-800">
                  ${(getSubtotalOtrosAdicionales()).toLocaleString("es-CO")}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 pt-3 mt-2">
              <span className="text-lg font-bold text-[#1a6b32]">Total a Pagar:</span>
              <span className="text-lg font-bold text-[#1a6b32]">
                ${cotizacion.total.toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          {cotizacion.observaciones && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Observaciones</p>
              <p className="text-sm text-gray-800 whitespace-pre-line">{cotizacion.observaciones}</p>
            </div>
          )}

          <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
            <p className="font-medium">Esta cotización es válida por <span className="font-semibold text-gray-800">{cotizacion.validez_dias} días</span></p>
            <p className="mt-1">Vence el: <span className="font-semibold text-gray-800">{cotizacion.fecha_vencimiento}</span></p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleImprimir}
            disabled={imprimiendo}
            className="flex items-center space-x-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {imprimiendo ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Printer size={18} />
            )}
            <span>{imprimiendo ? "Imprimiendo..." : "Imprimir"}</span>
          </button>
          
          <button
            onClick={onEdit}
            className="flex-1 bg-[#669933] hover:bg-[#5a8a2a] text-white font-medium py-2 rounded-lg transition"
          >
            Editar
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
  )
}

export default CotizacionModal