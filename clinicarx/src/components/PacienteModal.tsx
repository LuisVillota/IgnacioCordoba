"use client"

import { X, Mail, Phone, MapPin, Calendar } from "lucide-react"
import type { Paciente } from "../pages/PacientesPage"

interface PacienteModalProps {
  paciente: Paciente
  onClose: () => void
}

export function PacienteModal({ paciente, onClose }: PacienteModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Detalles del Paciente</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Name */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-2xl font-bold text-[#1a6b32]">
              {paciente.nombres} {paciente.apellidos}
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {paciente.tipo_documento}: {paciente.documento}
            </p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Contact */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Contacto</p>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Phone size={18} className="text-[#669933] mt-1" />
                  <div>
                    <p className="text-xs text-gray-600">Teléfono</p>
                    <p className="font-medium text-gray-800">{paciente.telefono}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail size={18} className="text-[#99d6e8] mt-1" />
                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="font-medium text-gray-800">{paciente.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Información Personal</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Fecha de Nacimiento</p>
                  <p className="font-medium text-gray-800">{paciente.fecha_nacimiento}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Estado</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      paciente.estado_paciente === "activo"
                        ? "bg-[#99d6e8]/30 text-[#1a6b32]"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {paciente.estado_paciente === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <MapPin size={18} className="text-[#1a6b32] mt-1" />
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Dirección</p>
                <p className="text-gray-800">{paciente.direccion}</p>
                <p className="text-gray-600 text-sm">{paciente.ciudad}</p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Calendar size={18} className="text-blue-600 mt-1" />
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Registro</p>
                <p className="text-gray-800 font-medium">{paciente.fecha_registro}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
