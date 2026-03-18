"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Edit2, Eye, ArrowLeft, Upload, Search, X, Trash2, Loader2, Camera } from "lucide-react"
import { ProtectedRoute } from "../../../components/ProtectedRoute"
import { HistoriaForm } from "../../../components/HistoriaForm"
import { HistoriaModal } from "../../../components/HistoriaModal"
import { api, transformBackendToFrontend, handleApiError } from "../../../lib/api"
import type { HistoriaClinica } from "../../../types/historia-clinica"
import type { paciente } from "../../../types/paciente"

export default function HistoriaClinicaPage() {
  const searchParams = useSearchParams()
  const pacienteIdFromQuery = searchParams.get("pacienteId")
  const [historias, setHistorias] = useState<HistoriaClinica[]>([])
  const [pacientes, setpacientes] = useState<paciente[]>([])
  const [filteredPacientes, setFilteredPacientes] = useState<paciente[]>([])
  const [selectedpacienteId, setSelectedpacienteId] = useState<string>(pacienteIdFromQuery || "")
  const [selectedHistoria, setSelectedHistoria] = useState<HistoriaClinica | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState({ pacientes: false, historias: false, saving: false })
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [deletingHcId, setDeletingHcId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 100

  const isSavingRef = useRef(false)

  useEffect(() => {
    loadpacientes()
  }, [])

  useEffect(() => {
    if (selectedpacienteId) {
      loadHistorias(parseInt(selectedpacienteId))
    }
  }, [selectedpacienteId])

  // Efecto para filtrar pacientes cuando cambia el término de búsqueda
  useEffect(() => {
    const sortAZ = (arr: paciente[]) => [...arr].sort((a, b) =>
      `${a.nombres} ${a.apellidos}`.toLowerCase().localeCompare(`${b.nombres} ${b.apellidos}`.toLowerCase())
    )
    if (searchTerm.trim() === "") {
      setFilteredPacientes(sortAZ(pacientes))
    } else {
      const term = searchTerm.toLowerCase().trim()
      const filtered = pacientes.filter(paciente =>
        paciente.nombres?.toLowerCase().includes(term) ||
        paciente.apellidos?.toLowerCase().includes(term) ||
        paciente.documento?.toLowerCase().includes(term)
      )
      setFilteredPacientes(sortAZ(filtered))
    }
  }, [searchTerm, pacientes])

  const loadpacientes = async () => {
    try {
      setLoading(prev => ({ ...prev, pacientes: true }))
      setError(null)
      
      const response = await api.getpacientes(1000, 0)
      
      const pacientesTransformados = response.pacientes?.map((paciente: any) => 
        transformBackendToFrontend.paciente(paciente)
      ) || []
      
      setpacientes(pacientesTransformados)
      setFilteredPacientes(pacientesTransformados)
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

  const handleDeleteHistoria = async (historia: HistoriaClinica) => {
    if (!window.confirm(`¿Estás seguro de eliminar esta historia clínica del ${historia.fecha_creacion}?`)) return
    try {
      setDeletingHcId(parseInt(historia.id))
      await api.deleteHistoriaClinica(parseInt(historia.id))
      alert("Historia clínica eliminada exitosamente")
      if (selectedpacienteId) {
        await loadHistorias(parseInt(selectedpacienteId))
      }
    } catch (err: any) {
      console.error("Error eliminando HC:", err)
      alert(`Error: ${err.message || 'Error desconocido'}`)
    } finally {
      setDeletingHcId(null)
    }
  }

  const clearSearch = () => {
    setSearchTerm("")
  }

  const paciente = pacientes.find((p) => p.id === selectedpacienteId)
  const pacienteHistorias = historias.filter((h) => h.id_paciente === selectedpacienteId)

  if (!selectedpacienteId) {
    return (
      <ProtectedRoute permissions={["ver_historia_clinica"]}>
        <div className="p-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Archivo de Pacientes</h1>
            <p className="text-gray-600 mt-2">Selecciona un paciente para ver su registro fotografico</p>
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
              {/* Barra de búsqueda */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buscar paciente ({filteredPacientes.length} de {pacientes.length} pacientes)
                </label>
                <div className="relative max-w-md">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                    placeholder="Buscar por nombre, apellido o documento..."
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent outline-none transition"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Filtra por nombre, apellido o número de documento
                </p>
              </div>

              {filteredPacientes.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  {searchTerm ? (
                    <>
                      <p className="text-gray-600 mb-4">No se encontraron pacientes con "{searchTerm}"</p>
                      <button
                        onClick={clearSearch}
                        className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition"
                        type="button"
                      >
                        <X size={16} />
                        <span>Limpiar búsqueda</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-4">No hay pacientes registrados</p>
                      <p className="text-sm text-gray-500">Agrega pacientes desde el módulo de pacientes</p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {/* Paginación superior */}
                  {filteredPacientes.length > ITEMS_PER_PAGE && (
                    <div className="mb-4 flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
                      <span className="text-sm text-gray-600">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredPacientes.length)} de {filteredPacientes.length} pacientes
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                          Página {currentPage} de {Math.ceil(filteredPacientes.length / ITEMS_PER_PAGE)}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredPacientes.length / ITEMS_PER_PAGE), p + 1))}
                          disabled={currentPage >= Math.ceil(filteredPacientes.length / ITEMS_PER_PAGE)}
                          className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPacientes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedpacienteId(p.id)}
                        className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-[#1a6b32] transition text-left group"
                        type="button"
                      >
                        <p className="font-semibold text-gray-800 group-hover:text-[#1a6b32] transition">
                          {p.nombres} {p.apellidos}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {p.tipo_documento}: {p.documento}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-gray-500">{p.ciudad}</p>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 group-hover:bg-[#1a6b32] group-hover:text-white transition">
                            {p.estado_paciente}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Paginación */}
                  {filteredPacientes.length > ITEMS_PER_PAGE && (
                    <div className="mt-4 flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
                      <span className="text-sm text-gray-600">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredPacientes.length)} de {filteredPacientes.length} pacientes
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                          Página {currentPage} de {Math.ceil(filteredPacientes.length / ITEMS_PER_PAGE)}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredPacientes.length / ITEMS_PER_PAGE), p + 1))}
                          disabled={currentPage >= Math.ceil(filteredPacientes.length / ITEMS_PER_PAGE)}
                          className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
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
              setSearchTerm("") // Limpiar búsqueda al volver
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={loading.historias || loading.saving}
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Archivo de Pacientes</h1>
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
          {/* Los registros se crean desde Plan Quirúrgico */}
        </div>

        {loading.historias ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1a6b32]"></div>
            <p className="text-gray-600 mt-4">Cargando los archivos de los pacientes...</p>
          </div>
        ) : pacienteHistorias.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-2">No hay registros</p>
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
                    <button
                      onClick={() => handleEdit(historia)}
                      className="p-2 text-[#669933] hover:bg-green-50 rounded-lg transition"
                      title="Agregar fotos"
                      disabled={loading.saving}
                      type="button"
                    >
                      <Camera size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteHistoria(historia)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Eliminar"
                      disabled={deletingHcId === parseInt(historia.id)}
                      type="button"
                    >
                      {deletingHcId === parseInt(historia.id) ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
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