"use client"

import { useState } from "react"
import { Plus, Edit2, Eye, ArrowLeft } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { HistoriaForm } from "../components/HistoriaForm"
import { HistoriaModal } from "../components/HistoriaModal"
import { mockPacientes } from "../data/mockData"

export interface HistoriaClinica {
  id: string
  id_paciente: string
  fecha_creacion: string
  motivo_consulta: string
  antecedentes_medicos: string
  antecedentes_quirurgicos: string
  antecedentes_alergicos: string
  antecedentes_farmacologicos: string
  exploracion_fisica: string
  diagnostico: string
  tratamiento: string
  recomendaciones: string
  medico_id: string
}

const mockHistorias: HistoriaClinica[] = [
  {
    id: "1",
    id_paciente: "1",
    fecha_creacion: "2024-11-20",
    motivo_consulta: "Desea mejorar forma de la nariz",
    antecedentes_medicos: "Paciente sin antecedentes médicos relevantes",
    antecedentes_quirurgicos: "Ninguno",
    antecedentes_alergicos: "Alergia a penicilina",
    antecedentes_farmacologicos: "No refiere",
    exploracion_fisica: "Paciente normoténso, bien hidratado, despierto y orientado",
    diagnostico: "Displasia nasal - Candidato a rinoplastia",
    tratamiento: "Programación de rinoplastia",
    recomendaciones: "Suspender antiinflamatorios 7 días antes",
    medico_id: "3",
  },
]

export function HistoriaClinicaPage() {
  const [historias, setHistorias] = useState<HistoriaClinica[]>(mockHistorias)
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>("")
  const [selectedHistoria, setSelectedHistoria] = useState<HistoriaClinica | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const paciente = mockPacientes.find((p) => p.id === selectedPacienteId)
  const pacienteHistorias = historias.filter((h) => h.id_paciente === selectedPacienteId)

  const handleSaveHistoria = (data: Omit<HistoriaClinica, "id" | "fecha_creacion">) => {
    if (editingId) {
      setHistorias(
        historias.map((h) => (h.id === editingId ? { ...data, id: editingId, fecha_creacion: h.fecha_creacion } : h)),
      )
      setEditingId(null)
    } else {
      const newHistoria: HistoriaClinica = {
        ...data,
        id: Date.now().toString(),
        fecha_creacion: new Date().toISOString().split("T")[0],
      }
      setHistorias([...historias, newHistoria])
    }
    setShowForm(false)
  }

  const handleEdit = (historia: HistoriaClinica) => {
    setEditingId(historia.id)
    setSelectedHistoria(historia)
    setShowForm(true)
  }

  if (!selectedPacienteId) {
    return (
      <ProtectedRoute permissions={["ver_historia_clinica"]}>
        <div className="p-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Historia Clínica</h1>
            <p className="text-gray-600 mt-2">Selecciona un paciente para ver su historia</p>
          </div>

          <div className="mt-8">
            <label className="block text-sm font-semibold text-gray-700 mb-4">Seleccionar Paciente</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockPacientes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPacienteId(p.id)}
                  className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-[#1a6b32] transition text-left"
                >
                  <p className="font-semibold text-gray-800">
                    {p.nombres} {p.apellidos}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {p.tipo_documento}: {p.documento}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{p.ciudad}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute permissions={["ver_historia_clinica"]}>
      <div className="p-8">
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => {
              setSelectedPacienteId("")
              setSelectedHistoria(null)
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Historia Clínica</h1>
            <p className="text-gray-600 mt-1">
              {paciente?.nombres} {paciente?.apellidos}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">{pacienteHistorias.length} registro(s) encontrado(s)</p>
          <ProtectedRoute permissions={["crear_historia_clinica"]}>
            <button
              onClick={() => {
                setEditingId(null)
                setSelectedHistoria(null)
                setShowForm(true)
              }}
              className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
            >
              <Plus size={20} />
              <span>Nueva Historia</span>
            </button>
          </ProtectedRoute>
        </div>

        {pacienteHistorias.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">No hay registros de historia clínica</p>
            <ProtectedRoute permissions={["crear_historia_clinica"]}>
              <button
                onClick={() => {
                  setEditingId(null)
                  setSelectedHistoria(null)
                  setShowForm(true)
                }}
                className="inline-flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
              >
                <Plus size={20} />
                <span>Crear Primer Registro</span>
              </button>
            </ProtectedRoute>
          </div>
        ) : (
          <div className="space-y-4">
            {pacienteHistorias.map((historia) => (
              <div
                key={historia.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Consulta del {historia.fecha_creacion}</h3>
                    <p className="text-sm text-gray-600 mt-1">Motivo: {historia.motivo_consulta}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedHistoria(historia)}
                      className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition"
                      title="Ver detalles"
                    >
                      <Eye size={18} />
                    </button>
                    <ProtectedRoute permissions={["editar_historia_clinica"]}>
                      <button
                        onClick={() => handleEdit(historia)}
                        className="p-2 text-[#669933] hover:bg-green-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                    </ProtectedRoute>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Diagnóstico</p>
                    <p className="text-gray-800 mt-1">{historia.diagnostico}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Tratamiento</p>
                    <p className="text-gray-800 mt-1">{historia.tratamiento}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        {showForm && (
          <HistoriaForm
            historia={selectedHistoria || undefined}
            pacienteId={selectedPacienteId}
            onSave={handleSaveHistoria}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
            }}
          />
        )}

        {selectedHistoria && !showForm && (
          <HistoriaModal
            historia={selectedHistoria}
            paciente={paciente}
            onClose={() => setSelectedHistoria(null)}
            onEdit={() => handleEdit(selectedHistoria)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
