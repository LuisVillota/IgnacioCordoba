"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { mockPacientes } from "../data/mockData"
import type { Cita } from "../pages/AgendaPage"

interface CitaFormProps {
  cita?: Cita
  onSave: (data: Omit<Cita, "id">) => void
  onClose: () => void
}

const tiposDeVisita = {
  consulta: { label: "Consulta", duracion: 60 },
  control: { label: "Control", duracion: 30 },
  valoracion: { label: "Valoración", duracion: 45 },
  programacion_quirurgica: { label: "Programación Quirúrgica", duracion: 60 },
}

export function CitaForm({ cita, onSave, onClose }: CitaFormProps) {
  const [formData, setFormData] = useState({
    id_paciente: cita?.id_paciente || "",
    id_usuario: cita?.id_usuario || "3",
    tipo_cita: cita?.tipo_cita || ("consulta" as const),
    fecha: cita?.fecha || "",
    hora: cita?.hora || "09:00",
    duracion: cita?.duracion || 60,
    estado: cita?.estado || ("pendiente" as const),
    observaciones: cita?.observaciones || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.id_paciente) newErrors.id_paciente = "Selecciona un paciente"
    if (!formData.fecha) newErrors.fecha = "La fecha es requerida"
    if (!formData.hora) newErrors.hora = "La hora es requerida"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleTipoChange = (tipo: string) => {
    const duracion = tiposDeVisita[tipo as keyof typeof tiposDeVisita]?.duracion || 60
    setFormData({
      ...formData,
      tipo_cita: tipo as "consulta" | "control" | "valoracion" | "programacion_quirurgica",
      duracion,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{cita ? "Editar Cita" : "Nueva Cita"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <select
              value={formData.id_paciente}
              onChange={(e) => setFormData({ ...formData, id_paciente: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                errors.id_paciente ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">-- Selecciona un paciente --</option>
              {mockPacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombres} {p.apellidos}
                </option>
              ))}
            </select>
            {errors.id_paciente && <p className="text-xs text-red-600 mt-1">{errors.id_paciente}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Visita</label>
            <select
              value={formData.tipo_cita}
              onChange={(e) => handleTipoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
            >
              {Object.entries(tiposDeVisita).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label} ({value.duracion} min)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                errors.fecha ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.fecha && <p className="text-xs text-red-600 mt-1">{errors.fecha}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                  errors.hora ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.hora && <p className="text-xs text-red-600 mt-1">{errors.hora}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
              <input
                type="number"
                value={formData.duracion}
                onChange={(e) => setFormData({ ...formData, duracion: Number.parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
                min="15"
                step="15"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
            >
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
              rows={3}
              placeholder="Notas adicionales..."
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-[#1a6b32] hover:bg-[#155529] text-white font-medium py-2 rounded-lg transition"
            >
              {cita ? "Actualizar" : "Agendar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
