// components/EsquemaViewer.tsx
"use client"

import React, { useState, useEffect } from "react"

interface EsquemaViewerProps {
  onClose: () => void
  planId?: string
}

export const EsquemaViewer: React.FC<EsquemaViewerProps> = ({ onClose, planId }) => {
  const [isLoading, setIsLoading] = useState(true)

  // Manejar mensajes del iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CLOSE_ESQUEMA_VIEWER') {
        onClose()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onClose])

  // Manejar carga del iframe
  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Barra superior */}
      <div className="bg-[#1a6b32] text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-[#1a6b32] rounded-lg hover:bg-gray-100 flex items-center gap-2"
          >
            ← Volver al Plan Quirúrgico
          </button>
          <h1 className="text-xl font-bold">
            {planId ? `Editor de Esquemas - Plan ${planId}` : "Editor de Esquemas Corporales"}
          </h1>
        </div>
      </div>

      {/* Contenedor principal */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a6b32] mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando editor de esquemas...</p>
            </div>
          </div>
        )}
        
        {/* Iframe con el HTML */}
        <iframe
          src="/PRUEBA/index.html"
          className="w-full h-full border-0"
          title="Editor de Esquemas Corporales"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          onLoad={handleIframeLoad}
        />
      </div>

      {/* Botón flotante */}
      <button
        onClick={onClose}
        className="fixed bottom-6 right-6 bg-[#1a6b32] text-white px-6 py-3 rounded-lg shadow-lg hover:bg-[#155427] flex items-center gap-2 z-10"
      >
        ← Volver al Plan
      </button>
    </div>
  )
}