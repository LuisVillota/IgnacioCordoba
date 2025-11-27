"use client"

import { useState } from "react"
import { Plus, Edit2, Eye, Trash2, Scissors } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { ProgramacionForm } from "../components/ProgramacionForm"
import { ProgramacionModal } from "../components/ProgramacionModal"
import { mockPacientes } from "../data/mockData"

export interface Programacion {
  id: string
  id_paciente: string
  fecha: string
  hora: string
  duracion: number
  tipo_procedimiento: string
  quirofano: string
  anestesiologo: string
  estado: "programado" | "confirmado" | "aplazado" | "en_quirofano" | "operado" | "cancelado"
  observaciones: string
}

const mockProgramaciones: Programacion[] = [
  {
    id: "1",
    id_paciente: "1",
    fecha: "2024-11-28",
    hora: "09:00",
    duracion: 120,
    tipo_procedimiento: "Rinoplastia",
    quirofano: "Quirófano 1",
    anestesiologo: "Dr. Carlos López",
    estado: "confirmado",
    observaciones: "Paciente sin alergias, presión arterial normal",
  },
]

export function ProgramacionQuirurgicaPage() {
  const [programaciones, setProgramaciones] = useState<Programacion[]>(mockProgramaciones)
  const [showForm, setShowForm] = useState(false)
  const [selectedProgramacion, setSelectedProgramacion] = useState<Programacion | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todas")

  const filteredProgramaciones = programaciones.filter((p) => filterEstado === "todas" || p.estado === filterEstado)

  const handleSaveProgramacion = (data: Omit<Programacion, "id">) => {
    if (editingId) {
      setProgramaciones(programaciones.map((p) => (p.id === editingId ? { ...data, id: editingId } : p)))
      setEditingId(null)
    } else {
      const newProgramacion: Programacion = {
        ...data,
        id: Date.now().toString(),
      }
      setProgramaciones([...programaciones, newProgramacion])
    }
    setShowForm(false)
  }

  const handleEdit = (prog: Programacion) => {
    setEditingId(prog.id)
    setSelectedProgramacion(prog)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas cancelar esta programación?")) {
      setProgramaciones(programaciones.filter((p) => p.id !== id))
    }
  }

  const estadoColors: Record<string, string> = {
    programado: "bg-blue-100 text-blue-800",
    confirmado: "bg-green-100 text-green-800",
    aplazado: "bg-orange-100 text-orange-800",
    en_quirofano: "bg-purple-100 text-purple-800",
    operado: "bg-indigo-100 text-indigo-800",
    cancelado: "bg-red-100 text-red-800",
  }

  return (
    <ProtectedRoute permissions={["ver_programacion"]}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Programación Quirúrgica</h1>
            <p className="text-gray-600 mt-2">Gestiona las cirugías programadas</p>
          </div>
          <ProtectedRoute permissions={["crear_programacion"]}>
            <button
              onClick={() => {
                setEditingId(null)
                setSelectedProgramacion(null)
                setShowForm(true)
              }}
              className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
            >
              <Plus size={20} />
              <span>Nueva Programación</span>
            </button>
          </ProtectedRoute>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtrar:</span>
          <div className="flex space-x-2 overflow-x-auto">
            {["todas", "programado", "confirmado", "aplazado", "en_quirofano", "operado", "cancelado"].map((estado) => (
              <button
                key={estado}
                onClick={() => setFilterEstado(estado)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  filterEstado === estado
                    ? "bg-[#1a6b32] text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:border-[#1a6b32]"
                }`}
              >
                {estado === "todas"
                  ? "Todas"
                  : estado.replace("_", " ").charAt(0).toUpperCase() + estado.slice(1).replace("_", " ")}
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Paciente</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Procedimiento</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fecha/Hora</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Quirófano</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Anestesiólogo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProgramaciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No hay programaciones
                    </td>
                  </tr>
                ) : (
                  filteredProgramaciones.map((prog) => {
                    const paciente = mockPacientes.find((p) => p.id === prog.id_paciente)
                    return (
                      <tr key={prog.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-gray-800">{paciente?.nombres}</p>
                          <p className="text-xs text-gray-600">{paciente?.documento}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Scissors size={16} className="text-[#669933]" />
                            <span className="font-medium text-gray-800">{prog.tipo_procedimiento}</span>
                          </div>
                          <p className="text-xs text-gray-600">{prog.duracion} min</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {prog.fecha} {prog.hora}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{prog.quirofano}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{prog.anestesiologo}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${estadoColors[prog.estado]}`}
                          >
                            {prog.estado.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => setSelectedProgramacion(prog)}
                              className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition"
                              title="Ver detalles"
                            >
                              <Eye size={18} />
                            </button>
                            <ProtectedRoute permissions={["editar_programacion"]}>
                              <button
                                onClick={() => handleEdit(prog)}
                                className="p-2 text-[#669933] hover:bg-green-50 rounded-lg transition"
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                            </ProtectedRoute>
                            <button
                              onClick={() => handleDelete(prog.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Cancelar"
                            >
                              <Trash2 size={18} />
                            </button>
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
          <ProgramacionForm
            programacion={selectedProgramacion || undefined}
            onSave={handleSaveProgramacion}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
            }}
          />
        )}

        {selectedProgramacion && !showForm && (
          <ProgramacionModal
            programacion={selectedProgramacion}
            paciente={mockPacientes.find((p) => p.id === selectedProgramacion.id_paciente)}
            onClose={() => setSelectedProgramacion(null)}
            onEdit={() => handleEdit(selectedProgramacion)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
