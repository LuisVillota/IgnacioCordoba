"use client"

import React, { useState } from "react"
import EsquemaMejorado from "./EsquemaMejorado"

type ProcedureType = 'lipo' | 'lipotras' | 'musculo' | 'incision'

interface DibujoAccion {
  tipo: ProcedureType
  x: number
  y: number
  timestamp: number
  tamaño: number
}

interface ModalEsquemaCompletoProps {
  isOpen: boolean
  onClose: () => void
  initialDrawings: DibujoAccion[]
  onSave: (drawings: DibujoAccion[]) => void
}

const ModalEsquemaCompleto: React.FC<ModalEsquemaCompletoProps> = ({
  isOpen,
  onClose,
  initialDrawings,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'corporal' | 'facial'>('corporal')
  const [drawings, setDrawings] = useState<DibujoAccion[]>(initialDrawings)

  if (!isOpen) return null

  const handleSave = (newDrawings: DibujoAccion[]) => {
    setDrawings(newDrawings)
  }

  const handleCloseAndSave = () => {
    onSave(drawings)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">✏️ Editor de Esquemas</h2>
            <p className="text-gray-600">Edita los esquemas corporal y facial</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleCloseAndSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              💾 Guardar y Cerrar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('corporal')}
              className={`px-6 py-3 font-medium ${activeTab === 'corporal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              🏃 Esquema Corporal
            </button>
            <button
              onClick={() => setActiveTab('facial')}
              className={`px-6 py-3 font-medium ${activeTab === 'facial' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              😊 Esquema Facial
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          {activeTab === 'corporal' ? (
            <EsquemaMejorado
              tipo="corporal"
              initialDrawings={drawings}
              onSave={handleSave}
            />
          ) : (
            <EsquemaMejorado
              tipo="facial"
              initialDrawings={drawings}
              onSave={handleSave}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p><strong>💡 Consejos:</strong></p>
              <ul className="list-disc ml-5 mt-1">
                <li>Usa la rueda del ratón para hacer zoom</li>
                <li>Ctrl + arrastrar para mover el esquema</li>
                <li>Haz clic en "Deshacer" para eliminar la última marca</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDrawings([])}
                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                🗑️ Limpiar Todo
              </button>
              <button
                onClick={handleCloseAndSave}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ✅ Finalizar Edición
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalEsquemaCompleto