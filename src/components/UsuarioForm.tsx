"use client"

import { useState } from "react"
import { X, Save } from "lucide-react"

interface UsuarioFormProps {
  usuario?: {
    id: string
    username: string
    nombre: string
    email: string
    rol: string
    estado: "activo" | "inactivo"
  }
  onSave: (data: any) => void
  onClose: () => void
}


export function UsuarioForm({ usuario, onSave, onClose }: UsuarioFormProps) {
  const isEdit = !!usuario

  const [formData, setFormData] = useState({
    username: usuario?.username || "",
    password: "",
    nombre: usuario?.nombre || "",
    email: usuario?.email || "",
    rol_id: usuario ? Number(usuario.rol) : 1,
    activo: usuario ? usuario.estado === "activo" : true
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target

    setFormData(prev => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value
    }))
  }

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()

  //  VALIDACIÓN CRÍTICA
  if (!isEdit && formData.password.trim() === "") {
    alert("La contraseña es obligatoria para crear un usuario")
    return
  }

  // 🔥 SOLUCIÓN: Construir el payload correctamente
  const payload: any = {
    username: formData.username.trim(),
    nombre: formData.nombre.trim(),
    email: formData.email.trim(),
    rol_id: Number(formData.rol_id),
    activo: Boolean(formData.activo),
  }

  // Solo incluir password si NO está vacío
  if (formData.password.trim() !== "") {
    payload.password = formData.password.trim()
  } else if (!isEdit) {
    // Si es creación, siempre debe tener password
    alert("La contraseña es obligatoria")
    return
  }

  console.log("📤 PAYLOAD USUARIO:", payload)
  onSave(payload)
}

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {isEdit ? "Editar Usuario" : "Nuevo Usuario"}
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Usuario</label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Contraseña {isEdit && "(opcional)"}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isEdit ? "Dejar vacío para no cambiar" : ""}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select
              name="rol_id"
              value={formData.rol_id}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value={1}>Administrador</option>
              <option value={2}>Doctor</option>
              <option value={3}>Recepción</option>
              <option value={4}>Otro</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            <label>Usuario activo</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 bg-[#1a6b32] text-white rounded-lg"
            >
              <Save size={18} />
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}