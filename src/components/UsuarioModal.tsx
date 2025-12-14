"use client"

import { X } from "lucide-react"

interface UsuarioModalProps {
  usuario: {
  id: string
  username: string
  nombre: string
  email: string
  rol: string
  activo: "activo" | "inactivo"
  fecha_registro: string
  }
  onClose: () => void
}



export function UsuarioModal({ usuario, onClose }: UsuarioModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Detalle del Usuario</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="p-6 space-y-3 text-sm">
          <p><strong>Usuario:</strong> {usuario.username}</p>
          <p><strong>Nombre:</strong> {usuario.nombre}</p>
          <p><strong>Email:</strong> {usuario.email}</p>
          <p><strong>Rol:</strong> {usuario.rol}</p>
          <p>
            <strong>Estado:</strong>{" "}
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            usuario.activo
                                ? "bg-[#99d6e8]/30 text-[#1a6b32]"
                                : "bg-gray-200 text-gray-600"
                            }`}
                        >
                            {usuario.activo ? "Activo" : "Inactivo"}
                        </span>
          </p>
          <p><strong>Fecha creación:</strong> {usuario.fecha_registro}</p>
        </div>

        

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
