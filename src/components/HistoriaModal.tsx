"use client"

import { X, Calendar, FileText } from "lucide-react"
import type { HistoriaClinica } from "../pages/HistoriaClinicaPage"
import type { Paciente } from "../pages/PacientesPage"

interface HistoriaModalProps {
  historia: HistoriaClinica
  paciente?: Paciente
  onClose: () => void
  onEdit: () => void
}

export function HistoriaModal({ historia, paciente, onClose, onEdit }: HistoriaModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Historia Clínica</h2>
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
          {/* Date */}
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar size={18} />
            <span className="text-sm">{historia.fecha_creacion}</span>
          </div>

          {/* Motivo de Consulta */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <FileText className="mr-2 text-[#1a6b32]" size={20} />
              Motivo de Consulta
            </h3>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{historia.motivo_consulta}</p>
          </section>

          {/* Antecedentes */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Antecedentes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Médicos</p>
                <p className="text-gray-700">{historia.antecedentes_medicos}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Quirúrgicos</p>
                <p className="text-gray-700">{historia.antecedentes_quirurgicos}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Alérgicos</p>
                <p className="text-gray-700">{historia.antecedentes_alergicos}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Farmacológicos</p>
                <p className="text-gray-700">{historia.antecedentes_farmacologicos}</p>
              </div>
            </div>
          </section>

          {/* Exploración Física */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Exploración Física</h3>
            <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">{historia.exploracion_fisica}</p>
          </section>

          {/* Diagnóstico y Tratamiento */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Diagnóstico</h3>
            <p className="text-gray-700 bg-green-50 p-4 rounded-lg mb-6">{historia.diagnostico}</p>

            <h3 className="text-lg font-semibold text-gray-800 mb-3">Tratamiento</h3>
            <p className="text-gray-700 bg-yellow-50 p-4 rounded-lg">{historia.tratamiento}</p>
          </section>

          {/* Recomendaciones */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Recomendaciones</h3>
            <p className="text-gray-700 bg-orange-50 p-4 rounded-lg">{historia.recomendaciones}</p>
          </section>
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
