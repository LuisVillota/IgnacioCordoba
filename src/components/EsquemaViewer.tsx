"use client"

import React, { useState, useRef } from "react"
import { api } from "../lib/api"

interface EsquemaViewerProps {
  onClose: () => void
  planId?: string
  pacienteId?: string
  pacienteCedula?: string
  onEsquemaCapturado?: (file: File) => void
}

export const EsquemaViewer: React.FC<EsquemaViewerProps> = ({ onClose, planId, pacienteId, pacienteCedula, onEsquemaCapturado }) => {
  const [isSaving, setIsSaving] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Capturar el contenedor que ya tiene ambos esquemas lado a lado, subirlo a HC y descargarlo
  const handleGuardarEsquema = async () => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      alert("El editor aún no ha cargado completamente. Espera un momento e intenta de nuevo.")
      return
    }

    setIsSaving(true)

    try {
      const iframeDoc = iframe.contentDocument
      const iframeWindow = iframe.contentWindow as any

      if (!iframeWindow.html2canvas) {
        alert("El editor aún no ha cargado completamente. Espera un momento e intenta de nuevo.")
        return
      }

      // .body-head-container ya tiene corporal (izq) + facial (der) con display:flex
      const container = iframeDoc.querySelector('.body-head-container') as HTMLElement
      if (!container) {
        alert("No se encontró el contenedor de esquemas en el editor.")
        return
      }

      // Inline-ar los SVGs para que html2canvas pueda capturarlos
      const objectElements = container.querySelectorAll('object[type="image/svg+xml"]')
      const replacements: { original: Element; placeholder: Element; parent: Node }[] = []

      objectElements.forEach((obj: any) => {
        try {
          const svgDoc = obj.contentDocument
          if (!svgDoc || !svgDoc.documentElement) return
          const svgEl = svgDoc.documentElement
          if (svgEl.tagName !== 'svg') return

          const clonedSvg = svgEl.cloneNode(true) as Element
          clonedSvg.setAttribute('width', obj.getAttribute('width') || '800')
          clonedSvg.setAttribute('height', obj.getAttribute('height') || '1000')
          clonedSvg.setAttribute('style', 'display:block;')

          obj.parentNode.insertBefore(clonedSvg, obj)
          obj.style.display = 'none'
          replacements.push({ original: obj, placeholder: clonedSvg, parent: obj.parentNode })
        } catch (e) {
          console.warn("No se pudo inline-ar un SVG:", e)
        }
      })

      // Capturar el contenedor completo (corporal + facial lado a lado)
      const canvas = await iframeWindow.html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      })

      // Restaurar SVGs originales
      replacements.forEach(({ original, placeholder, parent }) => {
        ;(original as HTMLElement).style.display = ''
        parent.removeChild(placeholder)
      })

      // Convertir canvas a blob PNG
      const blob: Blob = await new Promise((resolve) => {
        canvas.toBlob((b: Blob) => resolve(b), 'image/png', 1.0)
      })

      const cedulaStr = pacienteCedula || pacienteId || 'sin_paciente'
      const fileName = `esquema_${cedulaStr}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      // 1. Subir a la HC del paciente primero
      if (pacienteId) {
        try {
          const historias = await api.getHistoriasBypaciente(parseInt(pacienteId))
          let historiasArray: any[] = []
          if (Array.isArray(historias)) historiasArray = historias
          else if (historias?.historias) historiasArray = historias.historias
          else if (historias?.data) historiasArray = historias.data

          if (historiasArray.length > 0) {
            const hcReciente = historiasArray[historiasArray.length - 1]
            const historiaId = parseInt(hcReciente.id)
            const uploadResult = await api.uploadHistoriaFoto(historiaId, file)
            console.log("✅ Esquema subido a HC:", uploadResult)

            if (uploadResult.url) {
              const fotosExistentes = hcReciente.fotos ? String(hcReciente.fotos).split(',').filter((f: string) => f.trim()) : []
              fotosExistentes.push(uploadResult.url)
              await api.updateHistoriaClinica(historiaId, {
                ...hcReciente,
                paciente_id: parseInt(pacienteId),
                fotos: fotosExistentes.join(',')
              })
              console.log("✅ Campo fotos actualizado en HC")
            }
          } else {
            console.warn("⚠️ No hay historia clínica para subir el esquema")
          }
        } catch (uploadErr) {
          console.warn("⚠️ No se pudo subir esquema a HC:", uploadErr)
        }
      }

      // 2. Descargar el archivo al PC del usuario
      const url = URL.createObjectURL(blob)
      const a = iframeDoc.createElement('a')
      a.href = url
      a.download = fileName
      iframeDoc.body.appendChild(a)
      a.click()
      iframeDoc.body.removeChild(a)
      URL.revokeObjectURL(url)

      // 3. Pasar el archivo al componente padre
      if (onEsquemaCapturado) {
        onEsquemaCapturado(file)
      }

      alert("Esquema guardado en la Historia Clínica y descargado exitosamente.")
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
          disabled={isSaving}
          className={`px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
            isSaving
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
        <iframe
          ref={iframeRef}
          src="/PRUEBA/index.html"
          className="w-full h-full border-0"
          title="Editor de Esquemas Corporales"
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
