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

export function HistoriaForm({ historia, pacienteId, onSave, onClose, loading = false }: HistoriaFormProps) {
  const [formData, setFormData] = useState({
    id_paciente: pacienteId,
    motivo_consulta: "",
    antecedentes_medicos: "",
    antecedentes_quirurgicos: "",
    antecedentes_alergicos: "",
    antecedentes_farmacologicos: "",
    exploracion_fisica: "",
    diagnostico: "",
    tratamiento: "",
    recomendaciones: "",
    medico_id: "3",
    fotos: ""
  })

  // Inicializar formData con datos de historia si existe
  useEffect(() => {
    if (historia) {
      setFormData({
        id_paciente: historia.id_paciente,
        motivo_consulta: historia.motivo_consulta || "",
        antecedentes_medicos: historia.antecedentes_medicos || "",
        antecedentes_quirurgicos: historia.antecedentes_quirurgicos || "",
        antecedentes_alergicos: historia.antecedentes_alergicos || "",
        antecedentes_farmacologicos: historia.antecedentes_farmacologicos || "",
        exploracion_fisica: historia.exploracion_fisica || "",
        diagnostico: historia.diagnostico || "",
        tratamiento: historia.tratamiento || "",
        recomendaciones: historia.recomendaciones || "",
        medico_id: historia.medico_id || "3",
        fotos: historia.fotos || ""
      })
    }
  }, [historia])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Ref para prevenir doble envío
  const formSubmitted = useRef(false)

  // Inicializar photoUrls con fotos existentes
  useEffect(() => {
    if (historia?.fotos) {
      const urls = historia.fotos.split(',').filter(url => url.trim())
      setPhotoUrls(urls)
    }
  }, [historia])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.motivo_consulta.trim()) newErrors.motivo_consulta = "Requerido"
    if (!formData.diagnostico.trim()) newErrors.diagnostico = "Requerido"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileSelect = async (files: FileList) => {
    if (!historia?.id) {
      alert("Primero debes guardar la historia clínica antes de subir fotos")
      return
    }

    setUploadingPhotos(true)
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validaciones
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
        console.log(`📤 Subiendo foto: ${file.name}`)
        const uploadResponse = await api.uploadHistoriaFoto(parseInt(historia.id), file)
        
        if (uploadResponse.url) {
          // Agregar la URL devuelta por el backend
          setPhotoUrls(prev => [...prev, uploadResponse.url!])
          console.log(`✅ Foto subida: ${uploadResponse.url}`)
        }
      } catch (error) {
        console.error('❌ Error subiendo foto:', error)
        alert(`Error subiendo ${file.name}`)
      }
    }
    
    setUploadingPhotos(false)
  }

  const removePhoto = async (index: number) => {
    const newPhotoUrls = photoUrls.filter((_, i) => i !== index)
    setPhotoUrls(newPhotoUrls)
    
    // Si estamos editando, actualizar inmediatamente en el backend
    if (historia?.id) {
      try {
        const fotosString = newPhotoUrls.join(',')
        await api.updateHistoriaClinica(parseInt(historia.id), {
          ...formData,
          fotos: fotosString
        })
        console.log('✅ Foto eliminada de la base de datos')
      } catch (error) {
        console.error('❌ Error eliminando foto:', error)
        alert('Error al eliminar la foto')
        // Restaurar la foto en caso de error
        setPhotoUrls(photoUrls)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevenir doble envío
    if (formSubmitted.current || isSubmitting) {
      console.log("⚠️ Formulario ya enviado, ignorando...")
      return
    }
    
    if (!validateForm()) return
    
    formSubmitted.current = true
    setIsSubmitting(true)
    
    try {
      console.log("🔄 Guardando historia clínica...")
      
      // Preparar datos con las fotos actuales
      const fotosString = photoUrls.join(',')
      const historiaData = {
        ...formData,
        fotos: fotosString
      }
      
      if (historia) {
        // Actualizar historia existente
        console.log(`🔄 Actualizando historia ID: ${historia.id}`)
        await api.updateHistoriaClinica(parseInt(historia.id), historiaData)
        console.log(`✅ Historia ${historia.id} actualizada`)
      } else {
        // Crear nueva historia
        console.log(`🔄 Creando nueva historia...`)
        const response = await api.createHistoriaClinica(historiaData)
        console.log(`✅ Nueva historia creada ID: ${response.historia_id}`)
      }
      
      // Notificar al componente padre
      onSave(historiaData)
      
      // Cerrar el formulario
      setTimeout(() => {
        onClose()
      }, 300)
      
    } catch (error) {
      console.error('❌ Error guardando historia:', error)
      alert('Error al guardar la historia clínica. Por favor, intenta nuevamente.')
      formSubmitted.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDisabled = loading || uploadingPhotos || isSubmitting

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">
            {historia ? "Editar Historia Clínica" : "Nueva Historia Clínica"}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-lg" 
            disabled={isDisabled}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Motivo de Consulta */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Motivo de Consulta *</label>
            <textarea
              value={formData.motivo_consulta}
              onChange={(e) => setFormData({ ...formData, motivo_consulta: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                errors.motivo_consulta ? "border-red-500" : "border-gray-300"
              }`}
              rows={3}
              placeholder="Describe el motivo de la consulta..."
              disabled={isDisabled}
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
                disabled={isDisabled}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Antecedentes Quirúrgicos</label>
              <textarea
                value={formData.antecedentes_quirurgicos}
                onChange={(e) => setFormData({ ...formData, antecedentes_quirurgicos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
                rows={3}
                disabled={isDisabled}
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
                disabled={isDisabled}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Antecedentes Farmacológicos</label>
              <textarea
                value={formData.antecedentes_farmacologicos}
                onChange={(e) => setFormData({ ...formData, antecedentes_farmacologicos: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8]"
                rows={3}
                disabled={isDisabled}
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
              disabled={isDisabled}
            />
          </div>

          {/* Diagnóstico y Tratamiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnóstico *</label>
              <textarea
                value={formData.diagnostico}
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] ${
                  errors.diagnostico ? "border-red-500" : "border-gray-300"
                }`}
                rows={3}
                disabled={isDisabled}
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
                disabled={isDisabled}
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
              disabled={isDisabled}
            />
          </div>

          {/* Subida de Fotos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fotos Clínicas ({photoUrls.length} en total)
            </label>
            
            {!historia?.id && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ℹ️ Primero guarda la historia clínica para poder subir fotos
                </p>
              </div>
            )}
            
            {/* Input de subida - solo habilitado si hay historia guardada */}
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
                  {historia ? "Actualizando..." : "Guardando..."}
                </>
              ) : (
                historia ? "Actualizar" : "Guardar"
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