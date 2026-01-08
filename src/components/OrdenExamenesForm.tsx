"use client"

import type React from "react"
import { useState } from "react"
import { Calendar, Clock, Download } from "lucide-react"
import type { paciente } from "../types/paciente"
import { generarPDFOrdenExamenes } from "../utils/simplePdfGenerator"

interface OrdenExamenesFormProps {
  paciente: paciente
}

interface Examen {
  id: string
  nombre: string
  seleccionado: boolean
}

export function OrdenExamenesForm({ paciente }: OrdenExamenesFormProps) {
  const [examenes, setExamenes] = useState<Examen[]>([
    { id: "1", nombre: "Examen de VIH", seleccionado: false },
    { id: "2", nombre: "Hemograma", seleccionado: false },
    { id: "3", nombre: "T de P", seleccionado: false },
    { id: "4", nombre: "T.T.P", seleccionado: false },
    { id: "5", nombre: "T. Coagulacion", seleccionado: false },
    { id: "6", nombre: "Glicemia en Ayunas", seleccionado: false },
    { id: "7", nombre: "Prueba de embarazo", seleccionado: false },
    { id: "8", nombre: "B.U.N", seleccionado: false },
    { id: "9", nombre: "Creatina", seleccionado: false },
    { id: "10", nombre: "P de O", seleccionado: false },
    { id: "11", nombre: "E.C.G", seleccionado: false },
  ])

  const [observaciones, setObservaciones] = useState("")
  const [generandoPDF, setGenerandoPDF] = useState(false)

  // Obtener fecha y hora actual
  const now = new Date()
  const fechaActual = now.toLocaleDateString("es-CO")
  const horaActual = now.toLocaleTimeString("es-CO", { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })

  const handleToggleExamen = (examenId: string) => {
    setExamenes(examenes.map(examen => 
      examen.id === examenId 
        ? { ...examen, seleccionado: !examen.seleccionado }
        : examen
    ))
  }

  const handleGenerarPDF = async () => {
    const examenesSeleccionados = examenes.filter(examen => examen.seleccionado)
    
    if (examenesSeleccionados.length === 0) {
      alert("Seleccione al menos un examen")
      return
    }

    setGenerandoPDF(true)
    try {
      await generarPDFOrdenExamenes({
        paciente,
        fecha: fechaActual,
        hora: horaActual,
        examenes,
        observaciones
      })
    } catch (error) {
      console.error("Error generando PDF:", error)
      alert("Error al generar el PDF. Por favor, intente nuevamente.")
    } finally {
      setGenerandoPDF(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleGenerarPDF()
  }

  const examenesSeleccionadosCount = examenes.filter(examen => examen.seleccionado).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información del paciente */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Información del paciente</h3>
        <p className="text-blue-700">
          <strong>Nombre:</strong> {paciente.nombres} {paciente.apellidos}
        </p>
        <p className="text-blue-700">
          <strong>Documento:</strong> {paciente.documento}
        </p>
      </div>

      {/* Fecha y Hora */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <Calendar className="text-[#1a6b32]" size={20} />
          <div>
            <p className="text-xs font-semibold text-gray-600">Fecha</p>
            <p className="font-medium text-gray-800">{fechaActual}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <Clock className="text-[#1a6b32]" size={20} />
          <div>
            <p className="text-xs font-semibold text-gray-600">Hora</p>
            <p className="font-medium text-gray-800">{horaActual}</p>
          </div>
        </div>
      </div>

      {/* Lista de Exámenes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Exámenes Solicitados ({examenesSeleccionadosCount} seleccionados)
        </label>
        <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
          {examenes.map((examen) => (
            <div key={examen.id} className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={`examen-${examen.id}`}
                checked={examen.seleccionado}
                onChange={() => handleToggleExamen(examen.id)}
                className="w-4 h-4 text-[#1a6b32] border-gray-300 rounded focus:ring-[#1a6b32]"
              />
              <label 
                htmlFor={`examen-${examen.id}`}
                className="flex-1 text-sm text-gray-800 cursor-pointer"
              >
                {examen.nombre}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Observaciones y Notas
        </label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
          rows={3}
          placeholder="Indicaciones especiales, preparación requerida, notas médicas, etc."
        />
      </div>

      {/* Botones */}
      <div className="flex items-center space-x-3 pt-4">
        <button
          type="submit"
          disabled={generandoPDF}
          className="flex-1 bg-[#1a6b32] hover:bg-[#155529] disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition flex items-center justify-center space-x-2"
        >
          <Download size={18} />
          <span>
            {generandoPDF ? 'Generando PDF...' : 'Generar Orden de Exámenes (PDF)'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setExamenes(examenes.map(examen => ({ ...examen, seleccionado: false })))
            setObservaciones("")
          }}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition"
        >
          Limpiar
        </button>
      </div>
    </form>
  )
}