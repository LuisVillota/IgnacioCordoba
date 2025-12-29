"use client"

import { useState, useEffect } from "react"
import { OrdenExamenesForm } from "../components/OrdenExamenesForm"
import { api, handleApiError } from "@/lib/api"
import { toast } from "sonner"
import { Search, Filter, Loader2, User, Phone, Mail, Calendar } from "lucide-react"

interface Paciente {
  id: string
  nombres: string
  apellidos: string
  documento: string
  telefono?: string
  email?: string
  fecha_nacimiento?: string
  genero?: string
  direccion?: string
  ciudad?: string
  estado_paciente?: string
  fecha_registro?: string
}

export function OrdenExamenesPage() {
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")

  useEffect(() => {
    loadPacientes()
  }, [])

  const loadPacientes = async () => {
    try {
      setLoading(true)
      
      const response = await api.getPacientes(100, 0)
      
      let pacientesArray: Paciente[] = []
      
      if (Array.isArray(response)) {
        pacientesArray = response.map(transformPacienteFromBackend)
      } else if (response?.pacientes && Array.isArray(response.pacientes)) {
        pacientesArray = response.pacientes.map(transformPacienteFromBackend)
      } else if (response?.data && Array.isArray(response.data)) {
        pacientesArray = response.data.map(transformPacienteFromBackend)
      }
      
      setPacientes(pacientesArray)
      
    } catch (error: any) {
      toast.error("Error cargando pacientes: " + handleApiError(error))
      setPacientes([])
    } finally {
      setLoading(false)
    }
  }

  const transformPacienteFromBackend = (backendPaciente: any): Paciente => {
    return {
      id: backendPaciente.id?.toString() || '',
      nombres: backendPaciente.nombre || backendPaciente.nombres || '',
      apellidos: backendPaciente.apellido || backendPaciente.apellidos || '',
      documento: backendPaciente.numero_documento || backendPaciente.documento || '',
      telefono: backendPaciente.telefono || '',
      email: backendPaciente.email || '',
      fecha_nacimiento: backendPaciente.fecha_nacimiento || '',
      genero: backendPaciente.genero || '',
      direccion: backendPaciente.direccion || '',
      ciudad: backendPaciente.ciudad || '',
      estado_paciente: backendPaciente.estado || 'activo',
      fecha_registro: backendPaciente.fecha_registro || backendPaciente.created_at || ''
    }
  }

  const filteredPacientes = pacientes.filter(paciente => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      paciente.nombres.toLowerCase().includes(searchLower) ||
      paciente.apellidos.toLowerCase().includes(searchLower) ||
      paciente.documento.toLowerCase().includes(searchLower) ||
      paciente.telefono?.toLowerCase().includes(searchLower) ||
      paciente.email?.toLowerCase().includes(searchLower)
    
    const matchesEstado = filterEstado === "todos" || paciente.estado_paciente === filterEstado
    
    return matchesSearch && matchesEstado
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Órdenes para Exámenes</h1>
        <p className="text-gray-600 mt-2">Generar órdenes médicas para exámenes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Seleccionar Paciente</h2>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                <Filter size={18} className="text-gray-500" />
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent text-sm"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
                <button
                  onClick={loadPacientes}
                  className="p-2 text-gray-600 hover:text-[#1a6b32] hover:bg-gray-100 rounded-lg transition"
                  title="Actualizar lista"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto text-[#1a6b32]" size={32} />
                <p className="text-gray-600 mt-3">Cargando pacientes...</p>
              </div>
            ) : filteredPacientes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>{searchTerm ? "No se encontraron pacientes" : "No hay pacientes registrados"}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {filteredPacientes.map((paciente) => (
                  <div
                    key={paciente.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedPaciente?.id === paciente.id
                        ? "border-[#1a6b32] bg-[#1a6b32]/5"
                        : "border-gray-200 hover:border-[#1a6b32]/50"
                    }`}
                    onClick={() => setSelectedPaciente(paciente)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-[#1a6b32]/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-[#1a6b32]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-800 truncate">
                              {paciente.nombres} {paciente.apellidos}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 flex items-center">
                              <span className="font-mono bg-gray-100 px-1 rounded">{paciente.documento}</span>
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {paciente.telefono && (
                                <span className="inline-flex items-center text-xs text-gray-500">
                                  <Phone size={12} className="mr-1" />
                                  {paciente.telefono}
                                </span>
                              )}
                              {paciente.email && (
                                <span className="inline-flex items-center text-xs text-gray-500">
                                  <Mail size={12} className="mr-1" />
                                  {paciente.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          paciente.estado_paciente === "activo"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {paciente.estado_paciente || "activo"}
                      </span>
                    </div>
                    {paciente.fecha_nacimiento && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center">
                        <Calendar size={12} className="mr-1" />
                        Nacimiento: {new Date(paciente.fecha_nacimiento).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-semibold">{filteredPacientes.length}</span> de{" "}
                <span className="font-semibold">{pacientes.length}</span> pacientes
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow h-full">
            {selectedPaciente ? (
              <>
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        Orden de Exámenes para {selectedPaciente.nombres} {selectedPaciente.apellidos}
                      </h2>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <span className="text-sm text-gray-600">Documento: {selectedPaciente.documento}</span>
                        {selectedPaciente.telefono && (
                          <span className="text-sm text-gray-600">Teléfono: {selectedPaciente.telefono}</span>
                        )}
                        {selectedPaciente.email && (
                          <span className="text-sm text-gray-600">Email: {selectedPaciente.email}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPaciente(null)}
                      className="text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1 rounded transition"
                    >
                      Cambiar paciente
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Nueva Orden de Exámenes</h3>
                  <OrdenExamenesForm 
                    paciente={selectedPaciente}
                  />
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-500 h-full flex flex-col justify-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">Seleccione un paciente</h3>
                <p className="mb-6">Elija un paciente de la lista para generar una orden de exámenes</p>
                <div className="mt-6">
                  <button
                    onClick={loadPacientes}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#1a6b32] bg-[#1a6b32]/10 rounded-lg hover:bg-[#1a6b32]/20 transition"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualizar Lista de Pacientes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}