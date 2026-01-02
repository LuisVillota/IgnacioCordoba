"use client"

import { useState, useEffect } from "react"

export interface ProcedimientoFormData {
  nombre: string
  precio: number
}

interface ProcedimientoFormProps {
  procedimiento?: ProcedimientoFormData
  onSave: (data: ProcedimientoFormData) => void
  onClose: () => void
}

export function ProcedimientoForm({ procedimiento, onSave, onClose }: ProcedimientoFormProps) {
  const [formData, setFormData] = useState<ProcedimientoFormData>({
    nombre: "",
    precio: 0,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (procedimiento) {
      setFormData(procedimiento)
    }
  }, [procedimiento])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre del procedimiento es requerido"
    }

    if (formData.precio <= 0) {
      newErrors.precio = "El precio debe ser mayor a 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "precio" ? Number(value) : value,
    }))
    
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {procedimiento ? "Editar Procedimiento" : "Nuevo Procedimiento"}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Procedimiento *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent ${
                    errors.nombre ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Ej: ABDOMINOPLASTIA"
                />
                {errors.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio ($) *
                </label>
                <input
                  type="number"
                  name="precio"
                  value={formData.precio || ""}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-transparent ${
                    errors.precio ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Ej: 20000000"
                  min="0"
                  step="1000"
                />
                {errors.precio && (
                  <p className="mt-1 text-sm text-red-600">{errors.precio}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#1a6b32] text-white rounded-lg hover:bg-[#155529] transition"
              >
                {procedimiento ? "Guardar Cambios" : "Crear Procedimiento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}