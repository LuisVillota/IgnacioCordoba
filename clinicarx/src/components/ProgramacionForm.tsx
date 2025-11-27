"use client"

import { X, Calendar, Scissors } from "lucide-react"
import type { Programacion } from "../pages/ProgramacionQuirurgicaPage"
import type { Paciente } from "../pages/PacientesPage"

interface ProgramacionModalProps {
  programacion: Programacion
  paciente?: Paciente
  onClose: () => void
  onEdit: () => void
}

export function ProgramacionModal({ programacion, paciente, onClose, onEdit }: ProgramacionModalProps) {
  const estadoColors: Record<string, string> = {
    programado: "bg-blue-100 text-blue-800",
    confirmado: "bg-green-100 text-green-800",
    aplazado: "bg-orange-100 text-orange-800",
    en_quirofano: "bg-purple-100 text-purple-800",
    operado: "bg-indigo-100 text-indigo-800",
    cancelado: "bg-red-100 text-red-800",
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Detalles de Programación</h2>
            <p className="text-sm text-gray-600 mt-1">
              {paciente?.nombres} {paciente?.apellidos}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Procedimiento */}
          <div className="flex items-center space-x-4">
            <Scissors className="text-[#669933]" size={24} />
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Procedimiento</p>
              <p className="text-lg font-bold text-gray-800">{programacion.tipo_procedimiento}</p>
              <p className="text-sm text-gray-600">Duración: {programacion.duracion} minutos</p>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="flex items-center space-x-4">
            <Calendar className="text-[#99d6e8]" size={24} />
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Fecha y Hora</p>
              <p className="text-lg font-bold text-gray-800">
                {programacion.fecha} a las {programacion.hora}
              </p>
            </div>
          </div>

          {/* Quirófano y Anestesiólogo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Quirófano</p>
              <p className="text-lg font-bold text-gray-800">{programacion.quirofano}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Anestesiólogo</p>
              <p className="text-lg font-bold text-gray-800">{programacion.anestesiologo}</p>
            </div>
          </div>

          {/* Estado */}
          <div className={`rounded-lg p-4 ${estadoColors[programacion.estado]}`}>
            <p className="text-xs font-semibold text-current uppercase mb-2">Estado</p>
            <p className="text-lg font-bold text-current capitalize">{programacion.estado.replace("_", " ")}</p>
          </div>

          {/* Observaciones */}
          {programacion.observaciones && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Observaciones</p>
              <p className="text-gray-800">{programacion.observaciones}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onEdit}
            className="flex-1 bg-[#669933] hover:bg-[#5a8a2a] text-white font-medium py-2 rounded-lg transition"
          >
            Editar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
