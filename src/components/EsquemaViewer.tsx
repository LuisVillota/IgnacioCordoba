"use client"

import React, { useState, useEffect, useRef } from "react"

interface EsquemaViewerProps {
  onClose: () => void
  planId?: string
  pacienteId?: string
  onEsquemaCapturado?: (file: File) => void
}

export const EsquemaViewer: React.FC<EsquemaViewerProps> = ({ onClose, planId, pacienteId, onEsquemaCapturado }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

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

  // Capturar esquema como PNG, descargarlo y pasarlo al padre
  const handleGuardarEsquema = async () => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      alert("El editor aún no ha cargado completamente. Espera un momento e intenta de nuevo.")
      return
    }

    setIsSaving(true)

    try {
      const iframeDoc = iframe.contentDocument
      const schemasWrapper = iframeDoc.querySelector('.schemas-wrapper') as HTMLElement
      if (!schemasWrapper) {
        alert("No se encontró el contenido de esquemas en el editor.")
        return
      }

      const iframeWindow = iframe.contentWindow as any
      if (!iframeWindow.html2canvas) {
        alert("El editor aún no ha cargado completamente. Espera un momento e intenta de nuevo.")
        return
      }

      // html2canvas no puede capturar <object> embeds — hay que inline-ar los SVGs
      const objectElements = schemasWrapper.querySelectorAll('object[type="image/svg+xml"]')
      const replacements: { original: Element; placeholder: Element; parent: Node }[] = []

      objectElements.forEach((obj: any) => {
        try {
          const svgDoc = obj.contentDocument
          if (!svgDoc || !svgDoc.documentElement) return
          const svgEl = svgDoc.documentElement
          if (svgEl.tagName !== 'svg') return

          // Clonar el SVG completo (con marcas, colores, dibujos del usuario)
          const clonedSvg = svgEl.cloneNode(true) as Element
          // Preservar dimensiones del <object>
          clonedSvg.setAttribute('width', obj.getAttribute('width') || '800')
          clonedSvg.setAttribute('height', obj.getAttribute('height') || '1000')
          clonedSvg.setAttribute('style', 'display:block;')

          // Reemplazar temporalmente <object> con <svg> inline
          obj.parentNode.insertBefore(clonedSvg, obj)
          obj.style.display = 'none'
          replacements.push({ original: obj, placeholder: clonedSvg, parent: obj.parentNode })
        } catch (e) {
          console.warn("No se pudo inline-ar un SVG:", e)
        }
      })

      const canvas = await iframeWindow.html2canvas(schemasWrapper, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      })

      // Restaurar <object> originales
      replacements.forEach(({ original, placeholder, parent }) => {
        ;(original as HTMLElement).style.display = ''
        parent.removeChild(placeholder)
      })

      // Convertir canvas a blob PNG
      const blob: Blob = await new Promise((resolve) => {
        canvas.toBlob((b: Blob) => resolve(b), 'image/png', 1.0)
      })

      const fileName = `esquema_${pacienteId || 'sin_paciente'}_${Date.now()}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      // Descargar el archivo al PC del usuario
      const url = URL.createObjectURL(blob)
      const a = iframeDoc.createElement('a')
      a.href = url
      a.download = fileName
      iframeDoc.body.appendChild(a)
      a.click()
      iframeDoc.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Pasar el archivo al componente padre para que lo suba al guardar el plan
      if (onEsquemaCapturado) {
        onEsquemaCapturado(file)
      }

      alert("Esquema descargado y listo para guardarse en la Historia Clínica al guardar el plan.")
    } catch (error: any) {
      console.error("Error capturando esquema:", error)
      alert(`Error al capturar el esquema: ${error.message || 'Error desconocido'}`)
    } finally {
      setIsSaving(false)
    }
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
        <button
          onClick={handleGuardarEsquema}
          disabled={isSaving || isLoading}
          className={`px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
            isSaving || isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-white text-[#1a6b32] hover:bg-gray-100'
          }`}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1a6b32]"></div>
              Guardando...
            </>
          ) : (
            <>Guardar Esquema</>
          )}
        </button>
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
          ref={iframeRef}
          src="/PRUEBA/index.html"
          className="w-full h-full border-0"
          title="Editor de Esquemas Corporales"
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
