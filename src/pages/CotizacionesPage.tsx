"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Eye, Loader2 } from "lucide-react" // ⬅️ Eliminar Download de las importaciones
import { ProtectedRoute } from "../components/ProtectedRoute"
import { CotizacionForm } from "../components/CotizacionForm"
import { CotizacionModal } from "../components/CotizacionModal"
import { api, transformBackendToFrontend } from "../lib/api"

export interface ServicioIncluido {
  id: string
  nombre: string
  requiere: boolean
}

export interface CotizacionItem {
  id: string
  nombre: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  tipo?: string
  item_id?: number
}

export interface Cotizacion {
  id: string
  id_paciente: string
  fecha_creacion: string
  estado: "pendiente" | "aceptada" | "rechazada" | "facturada"
  items: CotizacionItem[]
  serviciosIncluidos: ServicioIncluido[]
  total: number
  subtotalProcedimientos: number
  subtotalAdicionales: number
  subtotalOtrosAdicionales: number
  observaciones: string
  validez_dias: number
  fecha_vencimiento: string
  paciente_nombre?: string
  paciente_apellido?: string
  paciente_documento?: string
  usuario_nombre?: string
  paciente_id?: string
}

export interface Paciente {
  id: string
  nombres: string
  apellidos: string
  documento: string
  telefono?: string
  email?: string
}

type ModalType = 'none' | 'form' | 'view'

export function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ⬇️ ELIMINAR ESTA VARIABLE DE ESTADO ⬇️
  // const [descargandoPDF, setDescargandoPDF] = useState<string | null>(null)
  
  const [activeModal, setActiveModal] = useState<ModalType>('none')
  const [selectedCotizacion, setSelectedCotizacion] = useState<Cotizacion | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  useEffect(() => {
    fetchData()
    fetchPacientes()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getCotizaciones()
      
      if (response && response.cotizaciones) {
        const cotizacionesTransformadas = response.cotizaciones.map(transformBackendToFrontend.cotizacion)
        setCotizaciones(cotizacionesTransformadas)
      } else {
        setCotizaciones([])
      }
    } catch (err: any) {
      setError(err.message || "Error cargando cotizaciones")
      setCotizaciones([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchPacientes = async () => {
    try {
      const response = await api.getPacientes()
      
      if (response && response.pacientes) {
        const pacientesTransformados = response.pacientes.map(transformBackendToFrontend.paciente)
        setPacientes(pacientesTransformados)
      }
    } catch (err: any) {
      console.error("Error cargando pacientes:", err)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
  }

  const filteredCotizaciones = cotizaciones; // Mostrar todas las cotizaciones

  const handleSaveCotizacion = async (formData: any) => {
    try {
      if (!formData._backendData) {
        throw new Error("No se recibieron datos válidos del formulario");
      }

      let backendData = { ...formData._backendData };
      
      console.log("🔍 Datos completos recibidos:", {
        formData_estado: formData.estado,
        formData_estado_id: formData.estado_id,
        backendData_estado_id: backendData.estado_id,
        formData_completo: formData
      });
      
      // Si backendData no tiene estado_id pero formData tiene estado
      if (!backendData.estado_id && formData.estado) {
        const estadoMap: Record<string, number> = {
          'pendiente': 1,
          'aceptada': 2,
          'rechazada': 3,
          'facturada': 4
        };
        
        const nuevoEstadoId = estadoMap[formData.estado];
        if (nuevoEstadoId) {
          backendData.estado_id = nuevoEstadoId;
          console.log("🔄 Estado_id asignado desde formData:", nuevoEstadoId);
        }
      }
      
      console.log("💾 Guardando cotización con:", {
        estado_id: backendData.estado_id,
        estado_nombre: formData.estado,
        esEdicion: formData._isEditing
      });
      
      let response;
      
      if (formData._isEditing && formData._cotizacionId) {
        const cotizacionId = parseInt(formData._cotizacionId);
        
        console.log("🔄 Actualizando cotización ID:", cotizacionId);
        console.log("📤 Datos de actualización:", backendData);
        
        response = await api.updateCotizacion(cotizacionId, backendData);
        alert("✅ Cotización actualizada exitosamente");
      } else {
        delete backendData.id;
        console.log("🆕 Creando nueva cotización");
        console.log("📤 Datos de creación:", backendData);
        
        response = await api.createCotizacion(backendData);
        alert("✅ Cotización creada exitosamente");
      }
      
      await refreshData();
      handleCloseAllModals();
      
    } catch (err: any) {
      console.error("❌ Error guardando cotización:", err);
      alert(`Error: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleView = (cotizacion: Cotizacion) => {
    setSelectedCotizacion(cotizacion);
    setActiveModal('view');
  }

  const handleEdit = (cotizacion: Cotizacion) => {
    const cotizacionParaEditar = {
      ...cotizacion,
      paciente_id: cotizacion.id_paciente
    };
    
    setSelectedCotizacion(cotizacionParaEditar);
    setEditingId(cotizacion.id);
    setActiveModal('form');
  }

  // ⬇️ ELIMINAR LA FUNCIÓN handleDescargarPDF COMPLETA ⬇️
  /*
  const handleDescargarPDF = async (cotizacion: Cotizacion) => {
    try {
      setDescargandoPDF(cotizacion.id);
      
      let pacienteData: any = null;
      
      if (cotizacion.paciente_nombre && cotizacion.paciente_apellido) {
        pacienteData = {
          id: cotizacion.id_paciente,
          nombres: cotizacion.paciente_nombre,
          apellidos: cotizacion.paciente_apellido,
          documento: cotizacion.paciente_documento || ''
        };
      } else {
        const paciente = pacientes.find((p) => p.id === cotizacion.id_paciente);
        if (paciente) {
          pacienteData = paciente;
        } else {
          try {
            const pacienteResponse = await api.getPaciente(parseInt(cotizacion.id_paciente));
            pacienteData = transformBackendToFrontend.paciente(pacienteResponse);
          } catch {
            alert("No se pudo obtener información del paciente para generar el PDF");
            return;
          }
        }
      }

      if (!pacienteData) {
        alert("No se encontró información del paciente");
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("No se pudo abrir la ventana de impresión. Por favor, permite las ventanas emergentes.");
        return;
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
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
              .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              .table th { background: #f8f9fa; text-align: left; padding: 10px; border-bottom: 2px solid #dee2e6; font-weight: bold; }
              .table td { padding: 10px; border-bottom: 1px solid #dee2e6; }
              .total-section { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; }
              @media print {
                body { margin: 20px; }
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
                <p><strong>N° COTIZACIÓN:</strong> CZ-${cotizacion.id}</p>
                <p><strong>FECHA EMISIÓN:</strong> ${cotizacion.fecha_creacion}</p>
                <p><strong>VÁLIDO HASTA:</strong> ${cotizacion.fecha_vencimiento}</p>
              </div>
              <div>
                <p><strong>PACIENTE:</strong> ${pacienteData.nombres} ${pacienteData.apellidos}</p>
                <p><strong>DOCUMENTO:</strong> ${pacienteData.documento || 'No especificado'}</p>
                <p><strong>ESTADO:</strong> ${cotizacion.estado.toUpperCase()}</p>
              </div>
            </div>
            
            <h3>PROCEDIMIENTOS</h3>
            ${cotizacion.items.filter(item => item.tipo === 'procedimiento').length > 0 ? `
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
                  ${cotizacion.items.filter(item => item.tipo === 'procedimiento').map(item => `
                    <tr>
                      <td>${item.nombre}</td>
                      <td>${item.cantidad}</td>
                      <td>$${item.precio_unitario.toLocaleString('es-CO')}</td>
                      <td>$${item.subtotal.toLocaleString('es-CO')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>No hay procedimientos</p>'}
            
            <div class="total-section">
              <p><strong>TOTAL:</strong> $${cotizacion.total.toLocaleString('es-CO')}</p>
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
      `);

      printWindow.document.close();
      
    } catch (err: any) {
      console.error("Error descargando PDF:", err);
      alert("Error al generar el PDF: " + err.message);
    } finally {
      setDescargandoPDF(null);
    }
  }
  */

  const openNewForm = () => {
    setEditingId(null);
    setSelectedCotizacion(null);
    setActiveModal('form');
  }

  const handleCloseAllModals = () => {
    setActiveModal('none');
    setSelectedCotizacion(null);
    setEditingId(null);
  }

  const handleEditFromModal = () => {
    if (selectedCotizacion) {
      handleEdit(selectedCotizacion);
    }
  }

  return (
    <ProtectedRoute permissions={["ver_cotizaciones"]}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Cotizaciones</h1>
            <p className="text-gray-600 mt-2">Gestiona cotizaciones y presupuestos de pacientes</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={refreshData}
              disabled={loading || refreshing}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Loader2 size={18} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refrescando..." : "Refrescar"}
            </button>
            
            <ProtectedRoute permissions={["crear_cotizacion"]}>
              <button
                onClick={openNewForm}
                disabled={loading || refreshing}
                className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                <span>Nueva Cotización</span>
              </button>
            </ProtectedRoute>
          </div>
        </div>

        {(loading || refreshing) && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#1a6b32]" />
            <span className="ml-2 text-gray-600">
              {loading ? "Cargando cotizaciones..." : "Refrescando datos..."}
            </span>
          </div>
        )}

        {error && !loading && !refreshing && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-700 font-medium">Error al cargar cotizaciones</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={refreshData}
                  className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                  disabled={refreshing}
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !refreshing && !error && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Paciente</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCotizaciones.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          {cotizaciones.length === 0 
                            ? "No hay cotizaciones registradas"
                            : "No hay cotizaciones"}
                          <button
                            onClick={refreshData}
                            className="mt-2 block mx-auto text-sm text-[#1a6b32] hover:underline disabled:opacity-50"
                            disabled={refreshing}
                          >
                            Refrescar
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredCotizaciones.map((cot) => (
                        <tr key={cot.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-gray-600">CZ-{cot.id}</td>
                          <td className="px-6 py-4 text-sm">
                            <p className="font-medium text-gray-800">
                              {cot.paciente_nombre || 'N/A'} {cot.paciente_apellido || ''}
                            </p>
                            <p className="text-xs text-gray-600">{cot.paciente_documento || 'Sin documento'}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{cot.fecha_creacion}</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <p className="font-semibold text-gray-800">
                              ${cot.total.toLocaleString("es-CO")}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center justify-center space-x-2">
                              {/* ⬇️ ELIMINAR EL BOTÓN DE DESCARGAR ⬇️ */}
                              {/*
                              <button
                                onClick={() => handleDescargarPDF(cot)}
                                disabled={descargandoPDF === cot.id || refreshing}
                                className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                                title="Descargar PDF"
                              >
                                <Download size={18} />
                              </button>
                              */}
                              <button
                                onClick={() => handleView(cot)}
                                disabled={refreshing}
                                className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                                title="Ver detalles"
                              >
                                <Eye size={18} />
                              </button>
                              <ProtectedRoute permissions={["editar_cotizacion"]}>
                                <button
                                  onClick={() => handleEdit(cot)}
                                  disabled={refreshing}
                                  className="p-2 text-[#669933] hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                                  title="Editar"
                                >
                                  <Edit2 size={18} />
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

            {!loading && !refreshing && filteredCotizaciones.length > 0 && (
              <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                <span>
                  Mostrando {filteredCotizaciones.length} de {cotizaciones.length} cotizaciones
                </span>
                <button
                  onClick={refreshData}
                  disabled={refreshing}
                  className="flex items-center gap-1 text-[#1a6b32] hover:underline disabled:opacity-50"
                >
                  <Loader2 size={14} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Refrescando..." : "Refrescar datos"}
                </button>
              </div>
            )}
          </>
        )}

        {activeModal === 'form' && (
          <CotizacionForm
            cotizacion={selectedCotizacion || undefined}
            onSave={handleSaveCotizacion}
            onClose={handleCloseAllModals}
          />
        )}

        {activeModal === 'view' && selectedCotizacion && (
          <CotizacionModal
            cotizacion={selectedCotizacion}
            paciente={pacientes.find((p) => p.id === selectedCotizacion.id_paciente)}
            onClose={handleCloseAllModals}
            onEdit={handleEditFromModal}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}