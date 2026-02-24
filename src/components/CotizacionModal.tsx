"use client"

import { X, Calendar, Printer, Loader2 } from "lucide-react"
import { useState } from "react"
import type { Cotizacion } from "../types/cotizacion"

interface paciente {
  nombres: string
  apellidos: string
  documento?: string
  direccion?: string
  telefono?: string
}

interface CotizacionModalProps {
  cotizacion: Cotizacion
  paciente?: paciente
  onClose: () => void
  onEdit: () => void
}

// Lista de servicios incluidos predefinidos
const SERVICIOS_PREDEFINIDOS = [
  "CIRUJANO PLÁSTICO, AYUDANTE Y PERSONAL CLÍNICO",
  "ANESTESIOLOGO",
  "CONTROLES CON MÉDICO Y ENFERMERA",
  "VALORACIÓN CON ANESTESIÓLOGO",
  "HEMOGRAMA DE CONTROL",
  "UNA NOCHE DE HOSPITALIZACIÓN CON UN ACOMPAÑANTES",
  "IMPLANTES"
]

export function CotizacionModal({ cotizacion, paciente, onClose, onEdit }: CotizacionModalProps) {
  const [imprimiendo, setImprimiendo] = useState(false)

  console.log("Cotización recibida:", cotizacion)
  console.log("Items de cotización:", cotizacion.items)
  
  // Asegurarnos de que items existe y es un array
  const itemsArray = Array.isArray(cotizacion.items) ? cotizacion.items : []
  
  const itemsPorTipo = {
    procedimientos: itemsArray.filter(item => item.tipo === 'procedimiento'),
    adicionales: itemsArray.filter(item => item.tipo === 'adicional'),
    otrosAdicionales: itemsArray.filter(item => item.tipo === 'otroAdicional'),
  }

  console.log("Items por tipo:", itemsPorTipo)

  // Obtener los servicios incluidos de la cotización o usar los predefinidos
  const serviciosIncluidos = cotizacion.servicios_incluidos || SERVICIOS_PREDEFINIDOS.map(servicio => ({
    id: servicio,
    servicio_nombre: servicio,
    requiere: cotizacion.servicios_incluidos 
      ? cotizacion.servicios_incluidos.some(s => s.servicio_nombre === servicio && s.requiere)
      : false
  }))

  // Calcular subtotales directamente de los items con valores por defecto
  const calcularSubtotalProcedimientos = () => {
    const subtotal = itemsPorTipo.procedimientos.reduce((sum, item) => {
      const valor = item.subtotal || 0
      console.log("Item procedimiento:", item.nombre, "subtotal:", valor)
      return sum + Number(valor)
    }, 0)
    console.log("Subtotal procedimientos calculado:", subtotal)
    return subtotal
  }

  const calcularSubtotalAdicionales = () => {
    const subtotal = itemsPorTipo.adicionales.reduce((sum, item) => {
      const valor = item.subtotal || 0
      console.log("Item adicional:", item.nombre, "subtotal:", valor)
      return sum + Number(valor)
    }, 0)
    console.log("Subtotal adicionales calculado:", subtotal)
    return subtotal
  }

  const calcularSubtotalOtrosAdicionales = () => {
    const subtotal = itemsPorTipo.otrosAdicionales.reduce((sum, item) => {
      const valor = item.subtotal || 0
      console.log("Item otro adicional:", item.nombre, "subtotal:", valor)
      return sum + Number(valor)
    }, 0)
    console.log("Subtotal otros adicionales calculado:", subtotal)
    return subtotal
  }

  // Calcular total general
  const calcularTotalGeneral = () => {
    const total = calcularSubtotalProcedimientos() + calcularSubtotalAdicionales() + calcularSubtotalOtrosAdicionales()
    console.log("Total general calculado:", total)
    return total
  }

  const handleImprimir = () => {
    setImprimiendo(true)
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert("No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes.")
        return
      }

      // Construir la fecha actual
      const fechaActual = new Date().toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      
      // Calcular subtotales para el PDF
      const subtotalProcedimientos = calcularSubtotalProcedimientos()
      const subtotalAdicionales = calcularSubtotalAdicionales()
      const subtotalOtrosAdicionales = calcularSubtotalOtrosAdicionales()
      const totalGeneral = calcularTotalGeneral()

      console.log("Valores para PDF:", {
        subtotalProcedimientos,
        subtotalAdicionales,
        subtotalOtrosAdicionales,
        totalGeneral
      })

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cotización CZ-${cotizacion.id}</title>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
              
              * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
                font-family: 'Roboto', Arial, sans-serif; 
              }
              
              body { 
                margin: 20px 40px; 
                color: #333; 
                font-size: 12px; 
              }
              
              /* ENCABEZADO MEJOR ORGANIZADO */
              .header-container {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid #1a6b32;
                gap: 30px;
              }
              
              .logo-container {
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 160px;
                padding: 5px;
              }
              
              .logo {
                max-width: 140px;
                max-height: 80px;
                width: auto;
                height: auto;
                object-fit: contain;
              }
              
              .logo-placeholder {
                width: 140px;
                height: 80px;
                background: #1a6b32;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                padding: 10px;
                border-radius: 4px;
              }
              
              .info-paciente {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding-top: 8px;
              }
              
              .info-row {
                display: flex;
                align-items: center;
                min-height: 20px;
              }
              
              .info-label {
                font-weight: 600;
                color: #1a6b32;
                min-width: 85px;
                text-align: left;
                font-size: 11px;
              }
              
              .info-value {
                flex: 1;
                font-weight: 500;
                padding-left: 8px;
                border-left: 1px solid #e5e5e5;
                font-size: 11px;
              }
              
              /* Número de cotización */
              .cotizacion-number {
                text-align: center;
                margin: 15px 0 20px 0;
                padding: 8px;
                background: linear-gradient(135deg, #1a6b32 0%, #99d6e8 100%);
                color: white;
                border-radius: 6px;
                font-size: 14px;
                font-weight: bold;
              }
              
              /* Secciones */
              .section {
                margin-bottom: 18px;
                page-break-inside: avoid;
              }
              
              .section-title {
                background: #1a6b32;
                color: white;
                padding: 6px 10px;
                font-weight: bold;
                border-radius: 4px 4px 0 0;
                margin-bottom: 0;
                font-size: 12px;
              }
              
              .section-content {
                border: 1px solid #ddd;
                border-top: none;
                padding: 10px;
                border-radius: 0 0 4px 4px;
              }
              
              /* Servicios incluidos */
              .servicios-lista {
                display: grid;
                grid-template-columns: 1fr;
                gap: 4px;
              }
              
              .servicio-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 3px 0;
                border-bottom: 1px dotted #eee;
              }
              
              .servicio-text {
                flex: 1;
                font-size: 11px;
              }
              
              .servicio-check {
                font-size: 14px;
                margin-left: 8px;
                min-width: 18px;
                text-align: center;
                font-weight: bold;
              }
              
              .check-selected {
                color: #1a6b32;
              }
              
              .check-empty {
                color: #ccc;
              }
              
              /* Tablas */
              .table {
                width: 100%;
                border-collapse: collapse;
                margin: 8px 0;
              }
              
              .table th {
                background: #f5f5f5;
                text-align: left;
                padding: 6px 8px;
                border: 1px solid #ddd;
                font-weight: 600;
                font-size: 11px;
              }
              
              .table td {
                padding: 6px 8px;
                border: 1px solid #ddd;
                font-size: 11px;
              }
              
              .subtotal-row {
                background: #f9f9f9;
                font-weight: 600;
              }
              
              .subtotal-row td {
                padding-top: 8px;
                padding-bottom: 8px;
              }
              
              /* Totales */
              .totales-container {
                margin-top: 25px;
                border: 2px solid #1a6b32;
                border-radius: 6px;
                overflow: hidden;
              }
              
              .total-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 12px;
                border-bottom: 1px solid #e5e5e5;
              }
              
              .total-row:last-child {
                border-bottom: none;
              }
              
              .grand-total {
                background: #1a6b32;
                color: white;
                font-size: 14px;
                font-weight: bold;
                margin-top: 3px;
              }
              
              /* Observaciones */
              .observaciones-section {
                margin-top: 18px;
                padding: 12px;
                background: #f0f8ff;
                border-left: 4px solid #1a6b32;
                border-radius: 4px;
                font-size: 11px;
              }
              
              /* Pie de página */
              .footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 2px solid #1a6b32;
                text-align: center;
                font-size: 10px;
                color: #666;
                line-height: 1.5;
              }
              
              .footer-line {
                margin-bottom: 2px;
              }
              
              /* Utilitarios */
              .text-right {
                text-align: right;
              }
              
              .text-center {
                text-align: center;
              }
              
              .font-bold {
                font-weight: bold;
              }
              
              .mt-10 {
                margin-top: 10px;
              }
              
              .mb-5 {
                margin-bottom: 5px;
              }
              
              .mb-10 {
                margin-bottom: 10px;
              }
              
              .color-green {
                color: #1a6b32;
              }
              
              /* Estilos de impresión */
              @media print {
                body { 
                  margin: 10px 20px; 
                  font-size: 11px;
                }
                
                .no-print { 
                  display: none; 
                }
                
                .page-break {
                  page-break-before: always;
                }
                
                .cotizacion-number {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                .section-title {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                .grand-total {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <!-- ENCABEZADO MEJOR ORGANIZADO -->
            <div class="header-container">
              <div class="logo-container">
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQceqGrv0esgBkN1C8B_p7qsRJaV-zVHVk0sw&s" alt="Logo del consultorio" class="logo" onerror="this.onerror=null; this.style.display='none'; document.getElementById('logo-placeholder').style.display='flex';" />
                <div id="logo-placeholder" class="logo-placeholder" style="display: none;">
                  LOGO CONSULTORIO
                </div>
              </div>
              
              <div class="info-paciente">
                <div class="info-row">
                  <span class="info-label">Fecha:</span>
                  <span class="info-value">${fechaActual}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Nombre:</span>
                  <span class="info-value">${paciente?.nombres || ''} ${paciente?.apellidos || ''}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Cédula:</span>
                  <span class="info-value">${paciente?.documento || 'No especificado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Dirección:</span>
                  <span class="info-value">${paciente?.direccion || 'No especificada'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Teléfono:</span>
                  <span class="info-value">${paciente?.telefono || 'No especificado'}</span>
                </div>
              </div>
            </div>
            
            <!-- Número de cotización -->
            <div class="cotizacion-number">
              COTIZACIÓN N°: CZ-${cotizacion.id}
            </div>
            
            <!-- SERVICIOS INCLUIDOS -->
            <div class="section">
              <div class="section-title">SERVICIOS INCLUIDOS</div>
              <div class="section-content">
                <div class="servicios-lista">
                  ${serviciosIncluidos.map((servicio: any) => `
                    <div class="servicio-item">
                      <span class="servicio-text">${servicio.servicio_nombre || servicio}</span>
                      <span class="servicio-check ${servicio.requiere ? 'check-selected' : 'check-empty'}">
                        ${servicio.requiere ? '✓' : '○'}
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <!-- VALORES DE PROCEDIMIENTO -->
            <div class="section">
              <div class="section-title">VALORES DE PROCEDIMIENTO</div>
              <div class="section-content">
                ${itemsPorTipo.procedimientos.length > 0 ? `
                  <table class="table">
                    <thead>
                      <tr>
                        <th>DESCRIPCIÓN</th>
                        <th width="50">CANT.</th>
                        <th width="100">VALOR UNITARIO</th>
                        <th width="100">SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsPorTipo.procedimientos.map(item => {
                        const cantidad = item.cantidad || 1
                        const precioUnitario = item.precio_unitario || 0
                        const subtotalItem = item.subtotal || (cantidad * precioUnitario)
                        
                        return `
                          <tr>
                            <td>${item.nombre}</td>
                            <td class="text-center">${cantidad}</td>
                            <td class="text-right">$${Number(precioUnitario).toLocaleString('es-CO')}</td>
                            <td class="text-right">$${Number(subtotalItem).toLocaleString('es-CO')}</td>
                          </tr>
                        `
                      }).join('')}
                      <tr class="subtotal-row">
                        <td colspan="3" class="text-right font-bold">SUBTOTAL VALORES DE PROCEDIMIENTO:</td>
                        <td class="text-right font-bold color-green">$${Number(subtotalProcedimientos).toLocaleString('es-CO')}</td>
                      </tr>
                    </tbody>
                  </table>
                ` : `
                  <div class="text-center" style="padding: 15px; color: #666; font-style: italic;">
                    No hay procedimientos registrados
                  </div>
                `}
              </div>
            </div>
            
            <!-- ADICIONALES -->
            ${itemsPorTipo.adicionales.length > 0 ? `
              <div class="section">
                <div class="section-title">ADICIONALES</div>
                <div class="section-content">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>DESCRIPCIÓN</th>
                        <th width="50">CANT.</th>
                        <th width="100">VALOR UNITARIO</th>
                        <th width="100">SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsPorTipo.adicionales.map(item => {
                        const cantidad = item.cantidad || 1
                        const precioUnitario = item.precio_unitario || 0
                        const subtotalItem = item.subtotal || (cantidad * precioUnitario)
                        
                        return `
                          <tr>
                            <td>${item.nombre}</td>
                            <td class="text-center">${cantidad}</td>
                            <td class="text-right">$${Number(precioUnitario).toLocaleString('es-CO')}</td>
                            <td class="text-right">$${Number(subtotalItem).toLocaleString('es-CO')}</td>
                          </tr>
                        `
                      }).join('')}
                      <tr class="subtotal-row">
                        <td colspan="3" class="text-right font-bold">SUBTOTAL ADICIONALES:</td>
                        <td class="text-right font-bold color-green">$${Number(subtotalAdicionales).toLocaleString('es-CO')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}
            
            <!-- OTROS ADICIONALES -->
            ${itemsPorTipo.otrosAdicionales.length > 0 ? `
              <div class="section">
                <div class="section-title">OTROS ADICIONALES</div>
                <div class="section-content">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>DESCRIPCIÓN</th>
                        <th width="50">CANT.</th>
                        <th width="100">VALOR UNITARIO</th>
                        <th width="100">SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsPorTipo.otrosAdicionales.map(item => {
                        const cantidad = item.cantidad || 1
                        const precioUnitario = item.precio_unitario || 0
                        const subtotalItem = item.subtotal || (cantidad * precioUnitario)
                        
                        return `
                          <tr>
                            <td>${item.nombre}</td>
                            <td class="text-center">${cantidad}</td>
                            <td class="text-right">$${Number(precioUnitario).toLocaleString('es-CO')}</td>
                            <td class="text-right">$${Number(subtotalItem).toLocaleString('es-CO')}</td>
                          </tr>
                        `
                      }).join('')}
                      <tr class="subtotal-row">
                        <td colspan="3" class="text-right font-bold">SUBTOTAL OTROS ADICIONALES:</td>
                        <td class="text-right font-bold color-green">$${Number(subtotalOtrosAdicionales).toLocaleString('es-CO')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}
            
            <!-- RESUMEN DE TOTALES -->
            <div class="totales-container">
              <div class="total-row">
                <span>Subtotal Valores de Procedimiento:</span>
                <span class="font-bold color-green">$${Number(subtotalProcedimientos).toLocaleString('es-CO')}</span>
              </div>
              ${itemsPorTipo.adicionales.length > 0 ? `
                <div class="total-row">
                  <span>Subtotal Adicionales:</span>
                  <span class="font-bold color-green">$${Number(subtotalAdicionales).toLocaleString('es-CO')}</span>
                </div>
              ` : ''}
              ${itemsPorTipo.otrosAdicionales.length > 0 ? `
                <div class="total-row">
                  <span>Subtotal Otros Adicionales:</span>
                  <span class="font-bold color-green">$${Number(subtotalOtrosAdicionales).toLocaleString('es-CO')}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>TOTAL GENERAL:</span>
                <span>$${Number(totalGeneral).toLocaleString('es-CO')}</span>
              </div>
            </div>
            
            <!-- OBSERVACIONES -->
            ${cotizacion.observaciones ? `
              <div class="observaciones-section">
                <div class="mb-5 font-bold color-green">OBSERVACIONES:</div>
                <div style="white-space: pre-line; line-height: 1.4;">${cotizacion.observaciones}</div>
              </div>
            ` : ''}
            
            <!-- Pie de página -->
            <div class="footer">
              <div class="footer-line">Calle 5D # 38a - 35 Edificio vida Cons 814 - 815 Torre 2</div>
              <div class="footer-line">Tels 5518244 - 3176688522 - 3183100885</div>
              <div class="footer-line">hica-dministracion@hotmail.com</div>
            </div>
            
            <script>
              // Intentar cargar el logo
              setTimeout(function() {
                const logo = document.querySelector('.logo');
                const placeholder = document.getElementById('logo-placeholder');
                
                if (logo && logo.complete && logo.naturalHeight === 0) {
                  logo.style.display = 'none';
                  placeholder.style.display = 'flex';
                }
                
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 1000);
              }, 500);
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

  // Calcular subtotales para la vista previa
  const subtotalProcedimientos = calcularSubtotalProcedimientos()
  const subtotalAdicionales = calcularSubtotalAdicionales()
  const subtotalOtrosAdicionales = calcularSubtotalOtrosAdicionales()
  const totalCalculado = calcularTotalGeneral()

  console.log("Valores finales:", {
    subtotalProcedimientos,
    subtotalAdicionales,
    subtotalOtrosAdicionales,
    totalCalculado
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
          {/* Encabezado reorganizado para vista previa */}
          <div className="flex items-start gap-6 mb-4">
            <div className="flex-shrink-0">
              <div className="bg-[#1a6b32] rounded-lg p-3 w-32 h-24 flex items-center justify-center">
                <span className="text-white font-bold text-center text-sm">
                  LOGO<br />CONSULTORIO
                </span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Fecha</p>
                <p className="font-medium text-gray-800">{new Date().toLocaleDateString('es-CO')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Nombre</p>
                <p className="font-medium text-gray-800">{paciente?.nombres} {paciente?.apellidos}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Cédula</p>
                <p className="font-medium text-gray-800">{paciente?.documento || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Dirección</p>
                <p className="font-medium text-gray-800 text-sm">{paciente?.direccion || 'No especificada'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-600 uppercase">Teléfono</p>
                <p className="font-medium text-gray-800">{paciente?.telefono || 'No especificado'}</p>
              </div>
            </div>
          </div>

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
                ({serviciosIncluidos.filter((s: any) => s.requiere).length} de {serviciosIncluidos.length} seleccionados)
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
                      {servicio.servicio_nombre || servicio}
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
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Valores de Procedimiento</h3>
              <div className="space-y-3">
                {itemsPorTipo.procedimientos.map((item) => {
                  const cantidad = item.cantidad || 1
                  const precioUnitario = item.precio_unitario || 0
                  const subtotalItem = item.subtotal || (cantidad * precioUnitario)
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.nombre}</p>
                        {item.descripcion && (
                          <p className="text-xs text-gray-600 mt-1">{item.descripcion}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {cantidad} × $${Number(precioUnitario).toLocaleString("es-CO")}
                        </p>
                        <p className="font-semibold text-gray-800">$${Number(subtotalItem).toLocaleString("es-CO")}</p>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="font-semibold text-gray-700">Subtotal Procedimientos:</span>
                  <span className="font-bold text-[#1a6b32]">
                    $${Number(subtotalProcedimientos).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {itemsPorTipo.adicionales.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Adicionales</h3>
              <div className="space-y-3">
                {itemsPorTipo.adicionales.map((item) => {
                  const cantidad = item.cantidad || 1
                  const precioUnitario = item.precio_unitario || 0
                  const subtotalItem = item.subtotal || (cantidad * precioUnitario)
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.nombre}</p>
                        {item.descripcion && (
                          <p className="text-xs text-gray-600 mt-1">{item.descripcion}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {cantidad} × $${Number(precioUnitario).toLocaleString("es-CO")}
                        </p>
                        <p className="font-semibold text-gray-800">$${Number(subtotalItem).toLocaleString("es-CO")}</p>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="font-semibold text-gray-700">Subtotal Adicionales:</span>
                  <span className="font-bold text-[#1a6b32]">
                    $${Number(subtotalAdicionales).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {itemsPorTipo.otrosAdicionales.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Otros Adicionales</h3>
              <div className="space-y-3">
                {itemsPorTipo.otrosAdicionales.map((item) => {
                  const cantidad = item.cantidad || 1
                  const precioUnitario = item.precio_unitario || 0
                  const subtotalItem = item.subtotal || (cantidad * precioUnitario)
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.nombre}</p>
                        {item.descripcion && (
                          <p className="text-xs text-gray-600 mt-1">{item.descripcion}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {cantidad} × $${Number(precioUnitario).toLocaleString("es-CO")}
                        </p>
                        <p className="font-semibold text-gray-800">$${Number(subtotalItem).toLocaleString("es-CO")}</p>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="font-semibold text-gray-700">Subtotal Otros Adicionales:</span>
                  <span className="font-bold text-[#1a6b32]">
                    $${Number(subtotalOtrosAdicionales).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-[#1a6b32]/10 to-[#99d6e8]/10 rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Subtotal Procedimientos:</span>
              <span className="font-semibold text-gray-800">
                $${Number(subtotalProcedimientos).toLocaleString("es-CO")}
              </span>
            </div>
            {itemsPorTipo.adicionales.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Subtotal Adicionales:</span>
                <span className="font-semibold text-gray-800">
                  $${Number(subtotalAdicionales).toLocaleString("es-CO")}
                </span>
              </div>
            )}
            {itemsPorTipo.otrosAdicionales.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Subtotal Otros Adicionales:</span>
                <span className="font-semibold text-gray-800">
                  $${Number(subtotalOtrosAdicionales).toLocaleString("es-CO")}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 pt-3 mt-2">
              <span className="text-lg font-bold text-[#1a6b32]">Total a Pagar:</span>
              <span className="text-lg font-bold text-[#1a6b32]">
                $${Number(totalCalculado).toLocaleString("es-CO")}
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
            <span>{imprimiendo ? "Imprimiendo..." : "Imprimir PDF"}</span>
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