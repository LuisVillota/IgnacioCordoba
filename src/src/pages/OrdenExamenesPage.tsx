"use client"

import { useState } from "react"
import { OrdenExamenesForm } from "../components/OrdenExamenesForm"
import { mockPacientes } from "../data/mockData"
import type { Paciente } from "./PacientesPage"

export function OrdenExamenesPage() {
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Órdenes para Exámenes</h1>
        <p className="text-gray-600 mt-2">Gestión de órdenes médicas para exámenes y procedimientos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Pacientes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Seleccionar Paciente</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {mockPacientes.map((paciente) => (
              <div
                key={paciente.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaciente?.id === paciente.id
                    ? "border-[#1a6b32] bg-[#1a6b32]/5"
                    : "border-gray-200 hover:border-[#1a6b32]/50"
                }`}
                onClick={() => setSelectedPaciente(paciente)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {paciente.nombres} {paciente.apellidos}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {paciente.documento} • {paciente.telefono}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {paciente.email}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      paciente.estado === "activo"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {paciente.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario de Orden de Exámenes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedPaciente ? "Orden de Exámenes" : "Seleccione un paciente"}
          </h2>
          
          {selectedPaciente ? (
            <OrdenExamenesForm paciente={selectedPaciente} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p>Seleccione un paciente de la lista para crear una orden de exámenes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}