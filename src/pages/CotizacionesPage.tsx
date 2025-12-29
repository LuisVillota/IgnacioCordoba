"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Eye, Download, Loader2 } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { CotizacionForm } from "../components/CotizacionForm"
import { CotizacionModal } from "../components/CotizacionModal"
import { PagoModal } from "../components/PagoModal"
import { api, transformBackendToFrontend, handleApiError } from "../lib/api"

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
}

export interface Paciente {
  id: string
  nombres: string
  apellidos: string
  documento: string
  telefono?: string
  email?: string
}

type ModalType = 'none' | 'form' | 'view' | 'pago'

export function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [descargandoPDF, setDescargandoPDF] = useState<string | null>(null)
  
  const [activeModal, setActiveModal] = useState<ModalType>('none')
  const [selectedCotizacion, setSelectedCotizacion] = useState<Cotizacion | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPago, setSelectedPago] = useState<Cotizacion | null>(null)
  
  const [filterEstado, setFilterEstado] = useState<string>("todas")

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
      const errorMessage = handleApiError(err)
      setError(errorMessage)
      
      if (err.message.includes("404") || err.message.includes("No encontrado")) {
        setCotizaciones([])
      }
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
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
  }

  const filteredCotizaciones = filterEstado === "todas" 
    ? cotizaciones 
    : cotizaciones.filter((c) => c.estado === filterEstado)

  const handleSaveCotizacion = async (formData: any) => {
    try {
      setActiveModal('none')
      setSelectedCotizacion(null)
      setEditingId(null)
      
      if (!formData._backendData) {
        throw new Error("No se recibieron datos válidos del formulario")
      }
      
      let response;
      if (formData._isEditing && formData._originalId) {
        const cotizacionId = parseInt(formData._originalId)
        response = await api.updateCotizacion(cotizacionId, formData._backendData)
        alert("Cotización actualizada exitosamente")
      } else {
        response = await api.createCotizacion(formData._backendData)
        alert("Cotización creada exitosamente")
      }
      
      await refreshData()
      
    } catch (err: any) {
      const errorMessage = handleApiError(err)
      
      if (formData._isEditing) {
        setEditingId(formData._originalId)
        setSelectedCotizacion({
          id: formData._originalId,
          id_paciente: formData.paciente_id,
          fecha_creacion: formData.fecha_creacion,
          estado: formData.estado,
          items: formData.items || [],
          serviciosIncluidos: formData.servicios_incluidos || [],
          total: formData.total || 0,
          subtotalProcedimientos: formData.subtotalProcedimientos || 0,
          subtotalAdicionales: formData.subtotalAdicionales || 0,
          subtotalOtrosAdicionales: formData.subtotalOtrosAdicionales || 0,
          observaciones: formData.observaciones || "",
          validez_dias: formData.validez_dias || 7,
          fecha_vencimiento: formData.fecha_vencimiento || "",
          paciente_nombre: formData.paciente_nombre || "",
          paciente_apellido: formData.paciente_apellido || "",
          paciente_documento: formData.paciente_documento || "",
          usuario_nombre: formData.usuario_nombre || ""
        })
        setActiveModal('form')
      } else {
        alert(`Error al guardar la cotización: ${errorMessage}`)
      }
    }
  }

  const handleView = (cotizacion: Cotizacion) => {
    setSelectedCotizacion(cotizacion)
    setActiveModal('view')
  }

  const handleEdit = (cotizacion: Cotizacion) => {
    setSelectedCotizacion(cotizacion)
    setEditingId(cotizacion.id)
    setActiveModal('form')
  }

  const handleDescargarPDF = async (cotizacion: Cotizacion) => {
    try {
      let pacienteData: any = null
      
      if (cotizacion.paciente_nombre && cotizacion.paciente_apellido) {
        pacienteData = {
          id: cotizacion.id_paciente,
          nombres: cotizacion.paciente_nombre,
          apellidos: cotizacion.paciente_apellido,
          documento: cotizacion.paciente_documento || ''
        }
      } else {
        const paciente = pacientes.find((p) => p.id === cotizacion.id_paciente)
        if (!paciente) {
          try {
            const pacienteResponse = await api.getPaciente(parseInt(cotizacion.id_paciente))
            pacienteData = transformBackendToFrontend.paciente(pacienteResponse)
          } catch {
            alert("No se pudo obtener información del paciente para generar el PDF")
            return
          }
        } else {
          pacienteData = paciente
        }
      }

      if (!pacienteData) {
        alert("No se encontró información del paciente")
        return
      }

      setDescargandoPDF(cotizacion.id)
      
      try {
        await generarPDFCotizacion({
          cotizacion: {
            ...cotizacion,
            total: cotizacion.total
          },
          paciente: pacienteData,
          items: cotizacion.items,
          serviciosIncluidos: cotizacion.serviciosIncluidos
        })
      } catch (error) {
        alert("Error al descargar el PDF. Por favor, intente nuevamente.")
      } finally {
        setDescargandoPDF(null)
      }
      
    } catch (err: any) {
      alert("Error al preparar el PDF: " + handleApiError(err))
      setDescargandoPDF(null)
    }
  }

  const estadoColors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-800",
    aceptada: "bg-green-100 text-green-800",
    rechazada: "bg-red-100 text-red-800",
    facturada: "bg-blue-100 text-blue-800",
  }

  const generarPDFCotizacion = async (data: any) => {
    try {
      const blob = new Blob([`PDF Cotización ${data.cotizacion.id}`], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Cotización-${data.cotizacion.id}-${data.paciente.apellidos}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      throw error
    }
  }

  const openNewForm = () => {
    setEditingId(null)
    setSelectedCotizacion(null)
    setActiveModal('form')
  }

  const handleCloseAllModals = () => {
    setActiveModal('none')
    setSelectedCotizacion(null)
    setEditingId(null)
  }

  const handleTabChange = (newTab: string) => {
    setFilterEstado(newTab)
  }

  const handleEditFromModal = () => {
    if (selectedCotizacion) {
      setEditingId(selectedCotizacion.id)
      setActiveModal('form')
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
              title="Refrescar datos"
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
            <div className="mb-6 flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filtrar:</span>
              <div className="flex space-x-2">
                {["todas", "pendiente", "aceptada", "rechazada", "facturada"].map((estado) => (
                  <button
                    key={estado}
                    onClick={() => handleTabChange(estado)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      filterEstado === estado
                        ? "bg-[#1a6b32] text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:border-[#1a6b32]"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={refreshing}
                  >
                    {estado === "todas" ? "Todas" : estado.charAt(0).toUpperCase() + estado.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Paciente</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCotizaciones.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          {cotizaciones.length === 0 
                            ? "No hay cotizaciones registradas"
                            : `No hay cotizaciones en estado "${filterEstado === "todas" ? "ninguno" : filterEstado}"`}
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
                      filteredCotizaciones.map((cot) => {
                        return (
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
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[cot.estado]}`}
                              >
                                {cot.estado}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => handleDescargarPDF(cot)}
                                  disabled={descargandoPDF === cot.id || refreshing}
                                  className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                                  title="Descargar PDF"
                                >
                                  <Download size={18} />
                                </button>
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
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {!loading && !refreshing && filteredCotizaciones.length > 0 && (
              <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                <span>
                  Mostrando {filteredCotizaciones.length} de {cotizaciones.length} cotizaciones
                  {filterEstado !== "todas" && ` (filtradas por: ${filterEstado})`}
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

        {selectedPago && (
          <PagoModal
            cotizacion={selectedPago}
            paciente={pacientes.find((p) => p.id === selectedPago.id_paciente)}
            onClose={() => setSelectedPago(null)}
            onEdit={() => {}}
          />
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