// components/ProgramacionModal.tsx
"use client"

import { X, Calendar, Clock, Scissors, User, MapPin, AlertCircle, Clipboard } from "lucide-react"
import type { Programacion } from "../pages/ProgramacionQuirurgicaPage"
import { ProtectedRoute } from "./ProtectedRoute"

interface ProgramacionModalProps {
  programacion: Programacion
  onClose: () => void
  onEdit?: () => void
}

export function ProgramacionModal({ programacion, onClose, onEdit }: ProgramacionModalProps) {
  const estadoColors: Record<string, string> = {
    "Programado": "bg-blue-100 text-blue-800",
    "Confirmado": "bg-green-100 text-green-800",
    "Aplazado": "bg-orange-100 text-orange-800",
    "En Quirofano": "bg-purple-100 text-purple-800",
    "Operado": "bg-indigo-100 text-indigo-800",
    "Cancelado": "bg-red-100 text-red-800",
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Detalles de la Programación</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Programación #{programacion.id}</h3>
              <p className="text-sm text-gray-600">ID: {programacion.id}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${estadoColors[programacion.estado]}`}>
              {programacion.estado}
            </span>
          </div>

          {/* Paciente */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
              <User size={16} className="mr-2" />
              Paciente
            </h4>
            <p className="text-gray-800 font-medium">
              {programacion.paciente_nombre} {programacion.paciente_apellido}
            </p>
            <p className="text-sm text-gray-600">Documento: {programacion.numero_documento}</p>
          </div>

          {/* Procedimiento */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
              <Scissors size={16} className="mr-2" />
              Procedimiento
            </h4>
            <p className="text-gray-800 font-medium">{programacion.procedimiento_nombre}</p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-sm text-gray-600">Duración</p>
                <p className="text-gray-800">{programacion.duracion} minutos</p>
              </div>
              {programacion.procedimiento_precio && (
                <div>
                  <p className="text-sm text-gray-600">Precio</p>
                  <p className="text-gray-800">${programacion.procedimiento_precio.toLocaleString("es-CO")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                <Calendar size={16} className="mr-2" />
                Fecha
              </h4>
              <p className="text-gray-800">{programacion.fecha}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                <Clock size={16} className="mr-2" />
                Hora
              </h4>
              <p className="text-gray-800">{programacion.hora}</p>
            </div>
          </div>

          {/* Anestesiólogo */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Anestesiólogo</h4>
            <p className="text-gray-800">{programacion.anestesiologo || "No especificado"}</p>
          </div>

          {/* Observaciones */}
          {programacion.observaciones && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                <Clipboard size={16} className="mr-2" />
                Observaciones
              </h4>
              <p className="text-gray-800 whitespace-pre-wrap">{programacion.observaciones}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            {onEdit && (
              <ProtectedRoute permissions={["editar_programacion"]}>
                <button
                  onClick={onEdit}
                  className="flex-1 bg-[#669933] hover:bg-[#558822] text-white font-medium py-3 rounded-lg transition"
                >
                  Editar
                </button>
              </ProtectedRoute>
            )}
            <button
              onClick={onClose}
              className={`${onEdit ? 'flex-1' : 'w-full'} bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition`}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}