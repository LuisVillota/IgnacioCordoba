"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import type { HistoriaClinica } from "../pages/HistoriaClinicaPage"

interface HistoriaFormProps {
  historia?: HistoriaClinica
  pacienteId: string
  onSave: (data: Omit<HistoriaClinica, "id" | "fecha_creacion">) => void
  onClose: () => void
}

export function HistoriaForm({ historia, pacienteId, onSave, onClose }: HistoriaFormProps) {
  const [formData, setFormData] = useState({
    id_paciente: pacienteId,
    motivo_consulta: historia?.motivo_consulta || "",
    antecedentes_medicos: historia?.antecedentes_medicos || "",
    antecedentes_quirurgicos: historia?.antecedentes_quirurgicos || "",
    antecedentes_alergicos: historia?.antecedentes_alergicos || "",
    antecedentes_farmacologicos: historia?.antecedentes_farmacologicos || "",
    exploracion_fisica: historia?.exploracion_fisica || "",
    diagnostico: historia?.diagnostico || "",
    tratamiento: historia?.tratamiento || "",
    recomendaciones: historia?.recomendaciones || "",
    medico_id: historia?.medico_id || "3",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.motivo_consulta.trim()) newErrors.motivo_consulta = "Requerido"
    if (!formData.diagnostico.trim()) newErrors.diagnostico = "Requerido"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">
            {historia ? "Editar Historia Clínica" : "Nueva Historia Clínica"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Motivo de Consulta */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Motivo de Consulta</label>
            <textarea
              value={formData.motivo_consulta}
              onChange={(e) => setFormData({ ...formData, motivo_consulta: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                errors.motivo_consulta ? "border-red-500" : "border-gray-300"
              }`}
              rows={3}
              placeholder="Describe el motivo de la consulta..."
            />
            {errors.motivo_consulta && <p className="text-xs text-red-600 mt-1">{errors.motivo_consulta}</p>}
          </div>

          {/* Antecedentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Antecedentes Médicos</label>
              <textarea
                value={formData.antecedentes_medicos}
                onChange={(e) => setFormData({ ...formData, antecedentes_medicos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Antecedentes Quirúrgicos</label>
              <textarea
                value={formData.antecedentes_quirurgicos}
                onChange={(e) => setFormData({ ...formData, antecedentes_quirurgicos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Antecedentes Alérgicos</label>
              <textarea
                value={formData.antecedentes_alergicos}
                onChange={(e) => setFormData({ ...formData, antecedentes_alergicos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Antecedentes Farmacológicos</label>
              <textarea
                value={formData.antecedentes_farmacologicos}
                onChange={(e) => setFormData({ ...formData, antecedentes_farmacologicos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
                rows={3}
              />
            </div>
          </div>

          {/* Exploración Física */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Exploración Física</label>
            <textarea
              value={formData.exploracion_fisica}
              onChange={(e) => setFormData({ ...formData, exploracion_fisica: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
              rows={3}
            />
          </div>

          {/* Diagnóstico y Tratamiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnóstico</label>
              <textarea
                value={formData.diagnostico}
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                  errors.diagnostico ? "border-red-500" : "border-gray-300"
                }`}
                rows={3}
              />
              {errors.diagnostico && <p className="text-xs text-red-600 mt-1">{errors.diagnostico}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tratamiento</label>
              <textarea
                value={formData.tratamiento}
                onChange={(e) => setFormData({ ...formData, tratamiento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
                rows={3}
              />
            </div>
          </div>

          {/* Recomendaciones */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Recomendaciones</label>
            <textarea
              value={formData.recomendaciones}
              onChange={(e) => setFormData({ ...formData, recomendaciones: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-[#1a6b32] hover:bg-[#155529] text-white font-medium py-2 rounded-lg transition"
            >
              {historia ? "Actualizar" : "Guardar"}
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
