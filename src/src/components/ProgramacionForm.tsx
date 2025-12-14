// src/components/ProgramacionForm.tsx
"use client"

import { useState, useEffect } from "react"
import { X, Calendar, Clock, MapPin, User } from "lucide-react"
import type { Programacion } from "../pages/ProgramacionQuirurgicaPage"
import type { Paciente } from "../pages/PacientesPage"
import { mockPacientes } from "../data/mockData"

interface ProgramacionFormProps {
  programacion?: Programacion
  onSave: (data: Omit<Programacion, "id">) => void
  onClose: () => void
}

export function ProgramacionForm({ programacion, onSave, onClose }: ProgramacionFormProps) {
  const [formData, setFormData] = useState({
    id_paciente: programacion?.id_paciente || "",
    fecha: programacion?.fecha || "",
    hora: programacion?.hora || "",
    duracion: programacion?.duracion || 60,
    tipo_procedimiento: programacion?.tipo_procedimiento || "",
    quirofano: programacion?.quirofano || "Quirófano 1",
    anestesiologo: programacion?.anestesiologo || "",
    estado: programacion?.estado || "programado",
    observaciones: programacion?.observaciones || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">
            {programacion ? "Editar Programación" : "Nueva Programación"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paciente</label>
            <select
              value={formData.id_paciente}
              onChange={(e) => handleChange("id_paciente", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
              required
            >
              <option value="">Seleccionar paciente</option>
              {mockPacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nombres} {paciente.apellidos} - {paciente.documento}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleChange("fecha", e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => handleChange("hora", e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Procedimiento y Duración */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Procedimiento</label>
              <input
                type="text"
                value={formData.tipo_procedimiento}
                onChange={(e) => handleChange("tipo_procedimiento", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                placeholder="Ej: Rinoplastia, Abdominoplastia..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duración (minutos)</label>
              <input
                type="number"
                value={formData.duracion}
                onChange={(e) => handleChange("duracion", parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                min="30"
                step="15"
                required
              />
            </div>
          </div>

          {/* Quirófano y Anestesiólogo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quirófano</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                <select
                  value={formData.quirofano}
                  onChange={(e) => handleChange("quirofano", e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                  required
                >
                  <option value="Quirófano 1">Quirófano 1</option>
                  <option value="Quirófano 2">Quirófano 2</option>
                  <option value="Quirófano 3">Quirófano 3</option>
                  <option value="Quirófano 4">Quirófano 4</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Anestesiólogo</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={formData.anestesiologo}
                  onChange={(e) => handleChange("anestesiologo", e.target.value)}
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
                  placeholder="Nombre del anestesiólogo"
                  required
                />
              </div>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => handleChange("estado", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
            >
              <option value="programado">Programado</option>
              <option value="confirmado">Confirmado</option>
              <option value="aplazado">Aplazado</option>
              <option value="en_quirofano">En Quirófano</option>
              <option value="operado">Operado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleChange("observaciones", e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent"
              placeholder="Notas adicionales sobre la programación..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-[#1a6b32] hover:bg-[#155529] text-white font-medium py-3 rounded-lg transition"
            >
              {programacion ? "Actualizar" : "Crear"} Programación
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}