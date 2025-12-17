"use client"

import { Edit2 } from "lucide-react"

export interface OtroAdicional {
  id: string
  nombre: string
  precio: number
}

interface Props {
  otroAdicional: OtroAdicional
  onClose: () => void
  onEdit: () => void
}

export function OtroAdicionalModal({ otroAdicional, onClose, onEdit }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold">{otroAdicional.nombre}</h2>
        <p className="text-gray-600 mb-4">
          ${otroAdicional.precio.toLocaleString("es-CO")}
        </p>

        <div className="flex justify-between">
          <button onClick={onClose} className="border px-4 py-2 rounded-lg">
            Cerrar
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 bg-[#669933] text-white px-4 py-2 rounded-lg"
          >
            <Edit2 size={18} />
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}
