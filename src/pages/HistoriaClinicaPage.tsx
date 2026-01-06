"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Edit2, Eye, ArrowLeft, Upload } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { HistoriaForm } from "../components/HistoriaForm"
import { HistoriaModal } from "../components/HistoriaModal"
import { api, transformBackendToFrontend, handleApiError } from "../lib/api"

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
  fotos: string
}

export interface pacienteFrontend {
  id: string
  nombres: string
  apellidos: string
  tipo_documento: string
  documento: string
  fecha_nacimiento: string
  genero: string
  telefono: string
  email: string
  direccion: string
  ciudad: string
  estado_paciente: string
  fecha_registro: string
}

export default function HistoriaClinicaPage() {
  const [historias, setHistorias] = useState<HistoriaClinica[]>([])
  const [pacientes, setpacientes] = useState<pacienteFrontend[]>([])
  const [selectedpacienteId, setSelectedpacienteId] = useState<string>("")
  const [selectedHistoria, setSelectedHistoria] = useState<HistoriaClinica | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState({ pacientes: false, historias: false, saving: false })
  const [error, setError] = useState<string | null>(null)
  
  const isSavingRef = useRef(false)

  useEffect(() => {
    loadpacientes()
  }, [])

  useEffect(() => {
    if (selectedpacienteId) {
      loadHistorias(parseInt(selectedpacienteId))
    }
  }, [selectedpacienteId])

  const loadpacientes = async () => {
    try {
      setLoading(prev => ({ ...prev, pacientes: true }))
      setError(null)
      
      const response = await api.getpacientes(100, 0)
      
      const pacientesTransformados = response.pacientes?.map((paciente: any) => 
        transformBackendToFrontend.paciente(paciente)
      ) || []
      
      setpacientes(pacientesTransformados)
    } catch (error) {
      const errorMessage = handleApiError(error)
      setError(`Error cargando pacientes: ${errorMessage}`)
    } finally {
      setLoading(prev => ({ ...prev, pacientes: false }))
    }
  }

  const loadHistorias = async (pacienteId: number) => {
    try {
      setLoading(prev => ({ ...prev, historias: true }))
      setError(null)
      
      const response = await api.getHistoriasBypaciente(pacienteId)
      
      let historiasTransformadas: HistoriaClinica[] = []
      
      if (Array.isArray(response)) {
        historiasTransformadas = response.map((historia: any) => 
          transformBackendToFrontend.historiaClinica(historia)
        )
      } else if (response && typeof response === 'object') {
        const historiasArray = response.historias || response.data || [];
        if (Array.isArray(historiasArray)) {
          historiasTransformadas = historiasArray.map((historia: any) => 
            transformBackendToFrontend.historiaClinica(historia)
          )
        }
      }
      
      setHistorias(historiasTransformadas)
      
    } catch (error) {
      const errorMessage = handleApiError(error)
      
      if (errorMessage.includes("404")) {
        setError("El endpoint de historias clínicas no está configurado en el backend")
        setHistorias([])
      } else {
        setError(`Error cargando historias: ${errorMessage}`)
        setHistorias([])
      }
    } finally {
      setLoading(prev => ({ ...prev, historias: false }))
    }
  }

  const handleSaveHistoria = async (data: Omit<HistoriaClinica, "id" | "fecha_creacion">) => {
    if (isSavingRef.current) {
      return
    }
    
    try {
      isSavingRef.current = true
      setLoading(prev => ({ ...prev, saving: true }))
      setError(null)
      
      await loadHistorias(parseInt(selectedpacienteId))
      
      setEditingId(null)
      setShowForm(false)
      
    } catch (error) {
      const errorMessage = handleApiError(error)
      setError(`Error: ${errorMessage}`)
    } finally {
      setLoading(prev => ({ ...prev, saving: false }))
      isSavingRef.current = false
    }
  }

  const handleEdit = (historia: HistoriaClinica) => {
    setEditingId(historia.id)
    setSelectedHistoria(historia)
    setShowForm(true)
  }

  const paciente = pacientes.find((p) => p.id === selectedpacienteId)
  const pacienteHistorias = historias.filter((h) => h.id_paciente === selectedpacienteId)

  if (!selectedpacienteId) {
    return (
      <ProtectedRoute permissions={["ver_historia_clinica"]}>
        <div className="p-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Historia Clínica</h1>
            <p className="text-gray-600 mt-2">Selecciona un paciente para ver su historia</p>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">Error</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <button 
                onClick={() => { setError(null); loadpacientes() }}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
                type="button"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading.pacientes ? (
            <div className="mt-8 text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1a6b32]"></div>
              <p className="text-gray-600 mt-4">Cargando pacientes...</p>
            </div>
          ) : (
            <div className="mt-8">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Seleccionar paciente ({pacientes.length} pacientes)
              </label>
              {pacientes.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <p className="text-gray-600 mb-4">No hay pacientes registrados</p>
                  <p className="text-sm text-gray-500">Agrega pacientes desde el módulo de pacientes</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pacientes.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedpacienteId(p.id)}
                      className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-[#1a6b32] transition text-left"
                      type="button"
                    >
                      <p className="font-semibold text-gray-800">
                        {p.nombres} {p.apellidos}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {p.tipo_documento}: {p.documento}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">{p.ciudad}</p>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          {p.estado_paciente}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
              setSelectedpacienteId("")
              setSelectedHistoria(null)
              setHistorias([])
              setError(null)
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={loading.historias || loading.saving}
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Historia Clínica</h1>
            <p className="text-gray-600 mt-1">
              {paciente?.nombres} {paciente?.apellidos}
            </p>
            <p className="text-sm text-gray-500">
              {paciente?.tipo_documento}: {paciente?.documento}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">Información</p>
            <p className="text-yellow-700 text-sm mt-1">{error}</p>
            <div className="mt-3 flex space-x-3">
              <button 
                onClick={() => { 
                  setError(null); 
                  loadHistorias(parseInt(selectedpacienteId)) 
                }}
                className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded"
                type="button"
              >
                Reintentar
              </button>
              <button 
                onClick={() => setError(null)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
                type="button"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-600">{pacienteHistorias.length} registro(s) encontrado(s)</p>
            {loading.historias && (
              <div className="flex items-center mt-1">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#1a6b32] mr-2"></div>
                <span className="text-sm text-gray-500">Cargando historias...</span>
              </div>
            )}
            {loading.saving && (
              <div className="flex items-center mt-1">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#1a6b32] mr-2"></div>
                <span className="text-sm text-gray-500">Guardando cambios...</span>
              </div>
            )}
          </div>
          <ProtectedRoute permissions={["crear_historia_clinica"]}>
            <button
              onClick={() => {
                setEditingId(null)
                setSelectedHistoria(null)
                setShowForm(true)
              }}
              disabled={loading.historias || loading.saving}
              className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <Plus size={20} />
              <span>Nueva Historia</span>
            </button>
          </ProtectedRoute>
        </div>

        {loading.historias ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1a6b32]"></div>
            <p className="text-gray-600 mt-4">Cargando historias clínicas...</p>
          </div>
        ) : pacienteHistorias.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">No hay registros de historia clínica</p>
            <ProtectedRoute permissions={["crear_historia_clinica"]}>
              <button
                onClick={() => {
                  setEditingId(null)
                  setSelectedHistoria(null)
                  setShowForm(true)
                }}
                disabled={loading.saving}
                className="inline-flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                type="button"
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
                      disabled={loading.saving}
                      type="button"
                    >
                      <Eye size={18} />
                    </button>
                    <ProtectedRoute permissions={["editar_historia_clinica"]}>
                      <button
                        onClick={() => handleEdit(historia)}
                        className="p-2 text-[#669933] hover:bg-green-50 rounded-lg transition"
                        title="Editar"
                        disabled={loading.saving}
                        type="button"
                      >
                        <Edit2 size={18} />
                      </button>
                    </ProtectedRoute>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Diagnóstico</p>
                    <p className="text-gray-800 mt-1 line-clamp-2">{historia.diagnostico}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Tratamiento</p>
                    <p className="text-gray-800 mt-1 line-clamp-2">{historia.tratamiento}</p>
                  </div>
                </div>
                
                {historia.fotos && (
                  <div className="mt-4 flex items-center">
                    <Upload size={14} className="text-gray-500 mr-1" />
                    <span className="text-xs text-gray-500">{historia.fotos.split(',').filter(f => f.trim()).length} foto(s)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <HistoriaForm
            historia={selectedHistoria || undefined}
            pacienteId={selectedpacienteId}
            onSave={handleSaveHistoria}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
              setSelectedHistoria(null)
            }}
            loading={loading.saving}
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