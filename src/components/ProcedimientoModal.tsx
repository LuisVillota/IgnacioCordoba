"use client"

import { Edit2 } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"

export interface Procedimiento {
  id: string
  nombre: string
  precio: number
}

interface ProcedimientoModalProps {
  procedimiento: Procedimiento
  onClose: () => void
  onEdit: () => void
}

export function ProcedimientoModal({ procedimiento, onClose, onEdit }: ProcedimientoModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{procedimiento.nombre}</h2>
              <p className="text-gray-600 mt-1">ID: PR-{procedimiento.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="border-t border-b border-gray-200 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Precio</p>
                  <p className="text-lg font-semibold text-[#1a6b32]">
                    ${procedimiento.precio.toLocaleString("es-CO")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">ID del Procedimiento</p>
                  <p className="text-lg font-medium text-gray-800">PR-{procedimiento.id}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cerrar
            </button>
            <div className="flex space-x-2">
              <ProtectedRoute permissions={["editar_procedimientos"]}>
                <button
                  onClick={onEdit}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#669933] text-white rounded-lg hover:bg-[#558822] transition"
                >
                  <Edit2 size={18} />
                  <span>Editar</span>
                </button>
              </ProtectedRoute>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}