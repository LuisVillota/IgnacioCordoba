"use client" 

import { useState, useEffect } from "react"
import { Search, Plus, Edit2, Eye, Loader2, RefreshCw } from "lucide-react"
import { ProtectedRoute } from "../../../components/ProtectedRoute"
import { useAuth } from "../../../hooks/useAuth"
import { hasAnyPermission } from "../../../types/permissions"
import { api, transformBackendToFrontend, handleApiError } from "../../../lib/api"
import { formatFechaHora } from "../../../lib/dateUtils"
import { UsuarioForm } from "../../../components/UsuarioForm"
import { UsuarioModal } from "../../../components/UsuarioModal"

export interface Usuario {
  id: string
  username: string
  nombre: string
  email: string
  rol: string
  estado_usuario: "activo" | "inactivo"
  fecha_registro: string
}

export default function UsuariosPage() {
  const { user } = useAuth()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchUsuarios()
  }, [])

  useEffect(() => {
    if (selectedUsuario) {
      const actualizado = usuarios.find(u => u.id === selectedUsuario.id)
      if (actualizado && JSON.stringify(actualizado) !== JSON.stringify(selectedUsuario)) {
        setSelectedUsuario(actualizado)
      }
    }
  }, [usuarios, selectedUsuario])

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.getUsuarios()
      
      
      let usuariosBackend = []
      
      if (response.usuarios && Array.isArray(response.usuarios)) {
        usuariosBackend = response.usuarios
      } else if (Array.isArray(response)) {
        usuariosBackend = response
      }
      
      
      const transformed = usuariosBackend.map(
        (user: any) => transformBackendToFrontend.usuario(user)
      )

      
      setUsuarios(transformed)
    } catch (err: any) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSaveUsuario = async (payload: any) => {
    try {
      
      const isEdit = !!editingId
      
      if (isEdit) {
        const updateData: any = {
          nombre: payload.nombre,
          email: payload.email,
          rol_id: Number(payload.rol_id),
          activo: Boolean(payload.activo),
        }
        
        if (payload.username && payload.username.trim() !== "") {
          updateData.username = payload.username
        }
        
        if (payload.password && payload.password.trim() !== "") {
          updateData.password = payload.password
        }
        
        
        const response = await api.updateUsuario(parseInt(editingId), updateData)
        
        if (response && response.success) {
          const updatedUserResponse = await api.getUsuario(parseInt(editingId))
          const updatedUser = transformBackendToFrontend.usuario(updatedUserResponse)
          
          const updatedUsuarios = usuarios.map(u => 
            u.id === editingId ? updatedUser : u
          )
          
          setUsuarios(updatedUsuarios)
          
          if (selectedUsuario?.id === editingId) {
            setSelectedUsuario(updatedUser)
          }
          
          setEditingId(null)
          setShowForm(false)
          alert("✅ Usuario actualizado exitosamente")
        } else {
          alert("❌ Error actualizando usuario")
        }
      } else {
        if (!payload.password || payload.password.trim() === "") {
          alert("❌ La contraseña es obligatoria para crear un usuario")
          return
        }
        
        const createData = {
          username: payload.username.trim(),
          password: payload.password.trim(),
          nombre: payload.nombre.trim(),
          email: payload.email.trim(),
          rol_id: Number(payload.rol_id),
          activo: Boolean(payload.activo),
        }
        
        
        const response = await api.createUsuario(createData)
        
        if (response && response.success && response.usuario_id) {
          const newUserResponse = await api.getUsuario(response.usuario_id)
          const newUser = transformBackendToFrontend.usuario(newUserResponse)
          
          setUsuarios([newUser, ...usuarios])
          setShowForm(false)
          alert("✅ Usuario creado exitosamente")
        } else {
          alert("❌ Error creando usuario")
        }
      }
    } catch (err: any) {
      
      if (err.message) {
        if (err.message.includes("username") || err.message.includes("nombre de usuario")) {
          alert("❌ El nombre de usuario ya existe o no es válido")
        } else if (err.message.includes("email")) {
          alert("❌ El email ya está registrado")
        } else if (err.message.includes("password")) {
          alert("❌ Error con la contraseña")
        } else if (err.message.includes("rol_id")) {
          alert("❌ El rol especificado no existe")
        } else {
          alert(`❌ Error: ${handleApiError(err)}`)
        }
      } else {
        alert(`❌ Error: ${handleApiError(err)}`)
      }
    }
  }

  const handleEdit = (usuario: Usuario) => {
    setEditingId(usuario.id)
    setSelectedUsuario(usuario)
    setShowForm(true)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchUsuarios()
  }

  if (!user || !hasAnyPermission(user.rol, ["ver_usuarios"])) {
    return null
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-2">
            {loading ? "Cargando..." : `${usuarios.length} usuarios registrados`}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span>Recargar</span>
          </button>

          <ProtectedRoute permissions={["crear_usuario"]}>
            <button
              onClick={() => {
                setEditingId(null)
                setSelectedUsuario(null)
                setShowForm(true)
              }}
              className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
            >
              <Plus size={20} />
              <span>Nuevo Usuario</span>
            </button>
          </ProtectedRoute>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">❌ Error: {error}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            disabled={loading}
          />
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto mb-4 text-[#1a6b32]" size={40} />
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Rol</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Registro</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No hay usuarios
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map(usuario => (
                  <tr key={usuario.id}>
                    <td className="px-6 py-4">
                      {usuario.nombre}
                    </td>
                    <td className="px-6 py-4">{usuario.email}</td>
                    <td className="px-6 py-4 capitalize">{usuario.rol}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          usuario.estado_usuario === "activo"
                            ? "bg-[#99d6e8]/30 text-[#1a6b32]"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {usuario.estado_usuario === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatFechaHora(usuario.fecha_registro)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => setSelectedUsuario(usuario)}
                          className="p-2 text-blue-600"
                        >
                          <Eye size={18} />
                        </button>
                        <ProtectedRoute permissions={["editar_usuario"]}>
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="p-2 text-green-600"
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
      )}

      {showForm && (
        <UsuarioForm
          usuario={selectedUsuario ? {
            ...selectedUsuario,
            estado: selectedUsuario.estado_usuario,  
            rol: selectedUsuario.rol  
          } : undefined}
          onSave={handleSaveUsuario}
          onClose={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      {selectedUsuario && !showForm && (
        <UsuarioModal
        usuario={{
          ...selectedUsuario,
          activo: selectedUsuario.estado_usuario  
        }}
        onClose={() => setSelectedUsuario(null)}
      />
      )}
    </div>
  )
}