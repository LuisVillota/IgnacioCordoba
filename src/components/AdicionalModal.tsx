"use client"

import { Edit2 } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"

export interface Adicional {
  id: string
  nombre: string
  precio: number
}

interface AdicionalModalProps {
  adicional: Adicional
  onClose: () => void
  onEdit: () => void
}

export function AdicionalModal({ adicional, onClose, onEdit }: AdicionalModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{adicional.nombre}</h2>
            <p className="text-gray-500">ID: AD-{adicional.id}</p>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <p className="text-lg font-semibold text-[#1a6b32]">
          ${adicional.precio.toLocaleString("es-CO")}
        </p>

        <div className="flex justify-between mt-6">
          <button onClick={onClose} className="border px-4 py-2 rounded-lg">
            Cerrar
          </button>

          <ProtectedRoute permissions={["editar_adicional"]}>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 bg-[#669933] text-white px-4 py-2 rounded-lg"
            >
              <Edit2 size={18} />
              Editar
            </button>
          </ProtectedRoute>
        </div>
      </div>
    </div>
  )
}
