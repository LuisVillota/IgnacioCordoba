"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Edit2, Eye, Trash2, Loader2, RefreshCw } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { PacienteForm } from "../components/PacienteForm"
import { PacienteModal } from "../components/PacienteModal"
import { useAuth } from "../hooks/useAuth"
import { hasAnyPermission } from "../types/permissions"
import { api, transformBackendToFrontend, handleApiError } from "../lib/api"

export interface Paciente {
  id: string
  nombres: string
  apellidos: string
  tipo_documento: string
  documento: string
  fecha_nacimiento: string
  genero?: string
  telefono: string
  email: string
  direccion: string
  ciudad: string
  estado_paciente: "activo" | "inactivo"
  fecha_registro: string
}

export function PacientesPage() {
  const { user } = useAuth()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchPacientes()
  }, [])

  useEffect(() => {
    if (selectedPaciente) {
      const pacienteActualizado = pacientes.find(p => p.id === selectedPaciente.id)
      if (pacienteActualizado && JSON.stringify(pacienteActualizado) !== JSON.stringify(selectedPaciente)) {
        setSelectedPaciente(pacienteActualizado)
      }
    }
  }, [pacientes, selectedPaciente])

  const fetchPacientes = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getPacientes(100)
      const transformedPacientes = response.pacientes.map(transformBackendToFrontend.paciente)
      setPacientes(transformedPacientes)
    } catch (err: any) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filteredPacientes = pacientes.filter(
    (p) =>
      p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.documento.includes(searchTerm),
  )

  const handleSavePaciente = async (data: Omit<Paciente, "id" | "fecha_registro">) => {
    try {
      const backendData = {
        numero_documento: data.documento,
        tipo_documento: data.tipo_documento || "CC",
        nombre: data.nombres,
        apellido: data.apellidos,
        fecha_nacimiento: data.fecha_nacimiento || null,
        genero: data.genero || null,
        telefono: data.telefono || null,
        email: data.email || null,
        direccion: data.direccion || null,
        ciudad: data.ciudad || null
      }

      if (editingId) {
        await api.updatePaciente(parseInt(editingId), backendData)
        
        const pacienteActualizado = {
          ...data,
          id: editingId,
          fecha_registro: pacientes.find(p => p.id === editingId)?.fecha_registro || ""
        }

        const nuevosPacientes = pacientes.map(p => 
          p.id === editingId ? pacienteActualizado : p
        )
        setPacientes(nuevosPacientes)

        if (selectedPaciente && selectedPaciente.id === editingId) {
          setSelectedPaciente(pacienteActualizado)
        }
        
        setEditingId(null)
      } else {
        const response = await api.createPaciente(backendData)
        
        if (response.success) {
          const newPacienteResponse = await api.getPaciente(response.paciente_id)
          const newPaciente = transformBackendToFrontend.paciente(newPacienteResponse)
          
          setPacientes([newPaciente, ...pacientes])
        }
      }
      setShowForm(false)
    } catch (err: any) {
      alert(`Error: ${handleApiError(err)}`)
    }
  }

  const handleEdit = (paciente: Paciente) => {
    setEditingId(paciente.id)
    setSelectedPaciente(paciente)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este paciente?")) {
      try {
        await api.deletePaciente(parseInt(id))
        if (selectedPaciente && selectedPaciente.id === id) {
          setSelectedPaciente(null)
        }
        setPacientes(pacientes.filter((p) => p.id !== id))
      } catch (err: any) {
        alert(`Error: ${handleApiError(err)}`)
      }
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPacientes()
  }

  if (!user || !hasAnyPermission(user.rol, ["ver_pacientes"])) {
    return null
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Pacientes</h1>
          <p className="text-gray-600 mt-2">
            {loading ? "Cargando..." : `${pacientes.length} pacientes registrados`}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span>Recargar</span>
          </button>
          
          <ProtectedRoute permissions={["crear_paciente"]}>
            <button
              onClick={() => {
                setEditingId(null)
                setSelectedPaciente(null)
                setShowForm(true)
              }}
              className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
            >
              <Plus size={20} />
              <span>Nuevo Paciente</span>
            </button>
          </ProtectedRoute>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error: {error}</p>
          <button 
            onClick={fetchPacientes}
            className="mt-2 text-sm text-red-700 underline"
          >
            Intentar nuevamente
          </button>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
            disabled={loading}
          />
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto mb-4 text-[#1a6b32]" size={40} />
          <p className="text-gray-600">Cargando pacientes...</p>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre Completo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Documento</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Teléfono</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Género</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Registro</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPacientes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? "No se encontraron pacientes con ese criterio" : "No hay pacientes registrados"}
                    </td>
                  </tr>
                ) : (
                  filteredPacientes.map((paciente) => (
                    <tr key={paciente.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">
                        <p className="font-medium text-gray-800">
                          {paciente.nombres} {paciente.apellidos}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {paciente.tipo_documento}: {paciente.documento}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{paciente.telefono || "No especificado"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {paciente.genero || "No especificado"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            paciente.estado_paciente === "activo"
                              ? "bg-[#99d6e8]/30 text-[#1a6b32]"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {paciente.estado_paciente === "activo" ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{paciente.fecha_registro}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setSelectedPaciente(paciente)}
                            className="p-2 text-[#1a6b32] hover:bg-blue-50 rounded-lg transition"
                            title="Ver detalles"
                          >
                            <Eye size={18} />
                          </button>
                          <ProtectedRoute permissions={["editar_paciente"]}>
                            <button
                              onClick={() => handleEdit(paciente)}
                              className="p-2 text-[#669933] hover:bg-green-50 rounded-lg transition"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                          </ProtectedRoute>
                          <ProtectedRoute permissions={["editar_paciente"]}>
                            <button
                              onClick={() => handleDelete(paciente.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
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
      )}

      {showForm && (
        <PacienteForm
          paciente={selectedPaciente || undefined}
          onSave={handleSavePaciente}
          onClose={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      {selectedPaciente && !showForm && (
        <PacienteModal paciente={selectedPaciente} onClose={() => setSelectedPaciente(null)} />
      )}
    </div>
  )
}