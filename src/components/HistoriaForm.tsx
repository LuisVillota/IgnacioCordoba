"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { X, Upload, X as XIcon, Loader2 } from "lucide-react"
import type { HistoriaClinica } from "../types/historia-clinica"
import { api } from "../lib/api"

interface HistoriaFormProps {
  historia?: HistoriaClinica
  pacienteId: string
  onSave: (data: Omit<HistoriaClinica, "id" | "fecha_creacion">) => void
  onClose: () => void
  loading?: boolean
}

export function HistoriaForm({ historia, onSave, onClose, loading = false }: HistoriaFormProps) {
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formSubmitted = useRef(false)

  useEffect(() => {
    if (historia?.fotos) {
      const urls = historia.fotos.split(',').filter(url => url.trim())
      setPhotoUrls(urls)
    }
  }, [historia])

  const handleFileSelect = async (files: FileList) => {
    if (!historia?.id) {
      alert("No se puede subir fotos sin un registro guardado")
      return
    }

    setUploadingPhotos(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (file.size > 10 * 1024 * 1024) {
        alert(`El archivo ${file.name} es demasiado grande (máximo 10MB)`)
        continue
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        alert(`El archivo ${file.name} no es una imagen válida`)
        continue
      }

      try {
        const uploadResponse = await api.uploadHistoriaFoto(parseInt(historia.id), file)
        if (uploadResponse.url) {
          setPhotoUrls(prev => [...prev, uploadResponse.url!])
        }
      } catch (error) {
        console.error('Error subiendo foto:', error)
        alert(`Error subiendo ${file.name}`)
      }
    }

    setUploadingPhotos(false)
  }

  const removePhoto = async (index: number) => {
    const newPhotoUrls = photoUrls.filter((_, i) => i !== index)
    setPhotoUrls(newPhotoUrls)

    if (historia?.id) {
      try {
        const fotosString = newPhotoUrls.join(',')
        await api.updateHistoriaClinica(parseInt(historia.id), {
          id_paciente: historia.id_paciente,
          motivo_consulta: historia.motivo_consulta,
          antecedentes_medicos: historia.antecedentes_medicos || "",
          antecedentes_quirurgicos: historia.antecedentes_quirurgicos || "",
          antecedentes_alergicos: historia.antecedentes_alergicos || "",
          antecedentes_farmacologicos: historia.antecedentes_farmacologicos || "",
          exploracion_fisica: historia.exploracion_fisica || "",
          diagnostico: historia.diagnostico,
          tratamiento: historia.tratamiento || "",
          recomendaciones: historia.recomendaciones || "",
          medico_id: historia.medico_id || "3",
          fotos: fotosString
        })
      } catch (error) {
        console.error('Error eliminando foto:', error)
        alert('Error al eliminar la foto')
        setPhotoUrls(photoUrls)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formSubmitted.current || isSubmitting) return
    if (!historia) return

    formSubmitted.current = true
    setIsSubmitting(true)

    try {
      const fotosString = photoUrls.join(',')
      const historiaData = {
        id_paciente: historia.id_paciente,
        motivo_consulta: historia.motivo_consulta,
        antecedentes_medicos: historia.antecedentes_medicos || "",
        antecedentes_quirurgicos: historia.antecedentes_quirurgicos || "",
        antecedentes_alergicos: historia.antecedentes_alergicos || "",
        antecedentes_farmacologicos: historia.antecedentes_farmacologicos || "",
        exploracion_fisica: historia.exploracion_fisica || "",
        diagnostico: historia.diagnostico,
        tratamiento: historia.tratamiento || "",
        recomendaciones: historia.recomendaciones || "",
        medico_id: historia.medico_id || "3",
        fotos: fotosString
      }

      await api.updateHistoriaClinica(parseInt(historia.id), historiaData)
      onSave(historiaData)
      setTimeout(() => onClose(), 300)
    } catch (error) {
      console.error('Error guardando fotos:', error)
      alert('Error al guardar. Intenta nuevamente.')
      formSubmitted.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDisabled = loading || uploadingPhotos || isSubmitting

  // Campos de solo lectura del plan quirúrgico
  const readOnlyFields = [
    { label: "Motivo de Consulta", value: historia?.motivo_consulta },
    { label: "Diagnóstico", value: historia?.diagnostico },
    { label: "Tratamiento", value: historia?.tratamiento },
    { label: "Recomendaciones", value: historia?.recomendaciones },
  ]

  const readOnlyFieldsPairs = [
    [
      { label: "Antecedentes Médicos", value: historia?.antecedentes_medicos },
      { label: "Antecedentes Quirúrgicos", value: historia?.antecedentes_quirurgicos },
    ],
    [
      { label: "Antecedentes Alérgicos", value: historia?.antecedentes_alergicos },
      { label: "Antecedentes Farmacológicos", value: historia?.antecedentes_farmacologicos },
    ],
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Historia Clínica</h2>
            <p className="text-sm text-gray-500 mt-0.5">Los datos provienen del Plan Quirúrgico · Solo puedes agregar fotos</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
            disabled={isDisabled}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Datos de solo lectura */}
          {readOnlyFields[0].value && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{readOnlyFields[0].label}</label>
              <p className="text-gray-800 bg-gray-50 p-3 rounded-lg text-sm">{readOnlyFields[0].value}</p>
            </div>
          )}

          {readOnlyFieldsPairs.map((pair, pairIdx) => (
            <div key={pairIdx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pair.map((field, idx) => (
                field.value ? (
                  <div key={idx}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{field.label}</label>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg text-sm">{field.value}</p>
                  </div>
                ) : null
              ))}
            </div>
          ))}

          {historia?.exploracion_fisica && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Exploración Física</label>
              <p className="text-gray-800 bg-blue-50 p-3 rounded-lg text-sm">{historia.exploracion_fisica}</p>
            </div>
          )}

          {readOnlyFields.slice(1).map((field, idx) => (
            field.value ? (
              <div key={idx}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{field.label}</label>
                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg text-sm">{field.value}</p>
              </div>
            ) : null
          ))}

          {/* Separador */}
          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Upload size={20} className="text-[#1a6b32]" />
              Fotos Clínicas ({photoUrls.length})
            </h3>

            {/* Input de subida */}
            <div className="mb-4">
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg ${
                isDisabled || !historia?.id
                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-[#1a6b32] cursor-pointer'
              }`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingPhotos ? (
                    <Loader2 className="w-8 h-8 mb-2 text-gray-500 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                  )}
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">
                      {uploadingPhotos ? 'Subiendo fotos...' : 'Click para seleccionar fotos'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">JPEG, PNG, GIF, BMP, WebP (máx. 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  disabled={isDisabled || !historia?.id}
                />
              </label>
            </div>

            {/* Previsualización de fotos */}
            {photoUrls.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Fotos guardadas:</p>
                <div className="grid grid-cols-3 gap-2">
                  {photoUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Foto clínica ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-image.jpg'
                          e.currentTarget.alt = 'Imagen no disponible'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={isDisabled}
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isDisabled}
              className="flex-1 bg-[#1a6b32] hover:bg-[#155529] text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando fotos...
                </>
              ) : (
                "Guardar Fotos"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isDisabled}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
