"use client"

import { X, Clock, Calendar, User, FileText } from "lucide-react"
import type { cita } from "../pages/AgendaPage"
import type { paciente } from "../pages/AgendaPage"

interface citaModalProps {
  cita: cita
  paciente?: paciente
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

const tiposDeVisita: Record<string, string> = {
  consulta: "Consulta",
  control: "Control",
  valoracion: "Valoración",
  programacion_quirurgica: "Programación Quirúrgica",
}

export function citaModal({ cita, paciente, onClose, onEdit, onDelete }: citaModalProps) {
  const estadoColors: Record<string, string> = {
    pendiente: "bg-[#669933]/20 text-[#1a6b32]",
    confirmada: "bg-[#99d6e8]/20 text-[#1a6b32]",
    completada: "bg-blue-100 text-blue-700",
    cancelada: "bg-gray-200 text-gray-600",
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Detalles de la cita</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* paciente */}
          {paciente && (
            <div className="flex items-start space-x-3 pb-4 border-b border-gray-200">
              <User className="text-[#1a6b32] mt-1" size={20} />
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">paciente</p>
                <p className="font-medium text-gray-800">
                  {paciente.nombres} {paciente.apellidos}
                </p>
                <p className="text-xs text-gray-600">{paciente.documento}</p>
              </div>
            </div>
          )}

          {/* Tipo de Visita */}
          <div className="flex items-center space-x-3">
            <FileText className="text-[#669933]" size={20} />
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Tipo</p>
              <p className="font-medium text-gray-800">{tiposDeVisita[cita.tipo_cita]}</p>
            </div>
          </div>

          {/* Fecha */}
          <div className="flex items-center space-x-3">
            <Calendar className="text-[#99d6e8]" size={20} />
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Fecha</p>
              <p className="font-medium text-gray-800">{cita.fecha}</p>
            </div>
          </div>

          {/* Hora */}
          <div className="flex items-center space-x-3">
            <Clock className="text-blue-500" size={20} />
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Hora</p>
              <p className="font-medium text-gray-800">
                {cita.hora} ({cita.duracion} min)
              </p>
            </div>
          </div>

          {/* Estado */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Estado</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${estadoColors[cita.estado]}`}
            >
              {cita.estado}
            </span>
          </div>

          {/* Observaciones */}
          {cita.observaciones && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Observaciones</p>
              <p className="text-sm text-gray-800">{cita.observaciones}</p>
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
