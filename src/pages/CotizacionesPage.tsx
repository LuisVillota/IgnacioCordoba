"use client"

import { useState } from "react"
import { Plus, Edit2, Eye, Trash2, Download } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { CotizacionForm } from "../components/CotizacionForm"
import { CotizacionModal } from "../components/CotizacionModal"
import { mockPacientes } from "../data/mockData"
import { generarPDFCotizacion } from "../utils/cotizacionPdfGenerator"

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
}

// Servicios incluidos base
const serviciosIncluidosBase: ServicioIncluido[] = [
  { id: "inc1", nombre: "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", requiere: false },
  { id: "inc2", nombre: "ANESTESIOLOGO", requiere: false },
  { id: "inc3", nombre: "CONTROLES CON MEDICO Y ENFERMERA", requiere: false },
  { id: "inc4", nombre: "VALORACION CON ANESTESIOLOGO", requiere: false },
  { id: "inc5", nombre: "HEMOGRAMA DE CONTROL", requiere: false },
  { id: "inc6", nombre: "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", requiere: false },
  { id: "inc7", nombre: "IMPLANTES", requiere: false },
]

const mockCotizaciones: Cotizacion[] = [
  {
    id: "1",
    id_paciente: "1",
    fecha_creacion: "2024-11-20",
    estado: "aceptada",
    items: [
      {
        id: "1",
        nombre: "ABDOMINOPLASTIA + PEXIA SIN IMPLANTES",
        descripcion: "Procedimiento quirúrgico",
        cantidad: 1,
        precio_unitario: 20000000,
        subtotal: 20000000,
      },
      {
        id: "2",
        nombre: "SEGURO PARA COMPLICACIONES QUIRURGICAS",
        descripcion: "Seguro médico",
        cantidad: 1,
        precio_unitario: 75200,
        subtotal: 75200,
      },
    ],
    serviciosIncluidos: serviciosIncluidosBase.map(servicio => ({
      ...servicio,
      requiere: true
    })),
    total: 20075200,
    subtotalProcedimientos: 20000000,
    subtotalAdicionales: 75200,
    subtotalOtrosAdicionales: 0,
    observaciones: "Valido por 7 días. Se requiere depósito del 50% para programar.",
    validez_dias: 7,
    fecha_vencimiento: "2024-11-27",
  },
  {
    id: "2",
    id_paciente: "2",
    fecha_creacion: "2024-11-21",
    estado: "pendiente",
    items: [
      {
        id: "1",
        nombre: "LIPOESCULTURA 3 HORAS",
        descripcion: "Procedimiento de liposucción",
        cantidad: 1,
        precio_unitario: 12000000,
        subtotal: 12000000,
      },
      {
        id: "2",
        nombre: "CAMARA HIPERBARICA (5 SESIONES)",
        descripcion: "Terapia complementaria",
        cantidad: 1,
        precio_unitario: 700000,
        subtotal: 700000,
      },
      {
        id: "3",
        nombre: "FAJA RIGIDA",
        descripcion: "Post-operatorio",
        cantidad: 1,
        precio_unitario: 290000,
        subtotal: 290000,
      },
    ],
    serviciosIncluidos: serviciosIncluidosBase.map(servicio => ({
      ...servicio,
      requiere: true
    })),
    total: 12990000,
    subtotalProcedimientos: 12000000,
    subtotalAdicionales: 700000,
    subtotalOtrosAdicionales: 290000,
    observaciones: "Incluye todas las sesiones de cámara hiperbárica programadas.",
    validez_dias: 7,
    fecha_vencimiento: "2024-11-28",
  },
]

export function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(mockCotizaciones)
  const [showForm, setShowForm] = useState(false)
  const [selectedCotizacion, setSelectedCotizacion] = useState<Cotizacion | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todas")
  const [descargandoPDF, setDescargandoPDF] = useState<string | null>(null)

  const filteredCotizaciones = cotizaciones.filter((c) => filterEstado === "todas" || c.estado === filterEstado)

  const handleSaveCotizacion = (data: Omit<Cotizacion, "id" | "fecha_creacion">) => {
    if (editingId) {
      setCotizaciones(
        cotizaciones.map((c) =>
          c.id === editingId ? { ...data, id: editingId, fecha_creacion: c.fecha_creacion } : c,
        ),
      )
      setEditingId(null)
    } else {
      const newCotizacion: Cotizacion = {
        ...data,
        id: Date.now().toString(),
        fecha_creacion: new Date().toISOString().split("T")[0],
      }
      setCotizaciones([...cotizaciones, newCotizacion])
    }
    setShowForm(false)
  }

  const handleEdit = (cotizacion: Cotizacion) => {
    setEditingId(cotizacion.id)
    setSelectedCotizacion(cotizacion)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta cotización?")) {
      setCotizaciones(cotizaciones.filter((c) => c.id !== id))
    }
  }

  const handleDescargarPDF = async (cotizacion: Cotizacion) => {
    const paciente = mockPacientes.find((p) => p.id === cotizacion.id_paciente)
    if (!paciente) {
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
        paciente,
        items: cotizacion.items,
        serviciosIncluidos: cotizacion.serviciosIncluidos
      })
    } catch (error) {
      console.error("Error descargando PDF:", error)
      alert("Error al descargar el PDF. Por favor, intente nuevamente.")
    } finally {
      setDescargandoPDF(null)
    }
  }

  const estadoColors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-800",
    aceptada: "bg-green-100 text-green-800",
    rechazada: "bg-red-100 text-red-800",
    facturada: "bg-blue-100 text-blue-800",
  }

  return (
    <ProtectedRoute permissions={["ver_cotizaciones"]}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Cotizaciones</h1>
            <p className="text-gray-600 mt-2">Gestiona cotizaciones y presupuestos de pacientes</p>
          </div>
          <ProtectedRoute permissions={["crear_cotizacion"]}>
            <button
              onClick={() => {
                setEditingId(null)
                setSelectedCotizacion(null)
                setShowForm(true)
              }}
              className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
            >
              <Plus size={20} />
              <span>Nueva Cotización</span>
            </button>
          </ProtectedRoute>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtrar:</span>
          <div className="flex space-x-2">
            {["todas", "pendiente", "aceptada", "rechazada", "facturada"].map((estado) => (
              <button
                key={estado}
                onClick={() => setFilterEstado(estado)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterEstado === estado
                    ? "bg-[#1a6b32] text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:border-[#1a6b32]"
                }`}
              >
                {estado === "todas" ? "Todas" : estado.charAt(0).toUpperCase() + estado.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
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
                      No se encontraron cotizaciones
                    </td>
                  </tr>
                ) : (
                  filteredCotizaciones.map((cot) => {
                    const paciente = mockPacientes.find((p) => p.id === cot.id_paciente)
                    return (
                      <tr key={cot.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-medium text-gray-600">CZ-{cot.id}</td>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-gray-800">{paciente?.nombres} {paciente?.apellidos}</p>
                          <p className="text-xs text-gray-600">{paciente?.documento}</p>
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
                              disabled={descargandoPDF === cot.id}
                              className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                              title="Descargar PDF"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => setSelectedCotizacion(cot)}
                              className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition"
                              title="Ver detalles"
                            >
                              <Eye size={18} />
                            </button>
                            <ProtectedRoute permissions={["editar_cotizacion"]}>
                              <button
                                onClick={() => handleEdit(cot)}
                                className="p-2 text-[#669933] hover:bg-green-50 rounded-lg transition"
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                            </ProtectedRoute>
                            <ProtectedRoute permissions={["editar_cotizacion"]}>
                              <button
                                onClick={() => handleDelete(cot.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
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

        {/* Modals */}
        {showForm && (
          <CotizacionForm
            cotizacion={selectedCotizacion || undefined}
            onSave={handleSaveCotizacion}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
            }}
          />
        )}

        {selectedCotizacion && !showForm && (
          <CotizacionModal
            cotizacion={selectedCotizacion}
            paciente={mockPacientes.find((p) => p.id === selectedCotizacion.id_paciente)}
            onClose={() => setSelectedCotizacion(null)}
            onEdit={() => handleEdit(selectedCotizacion)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}