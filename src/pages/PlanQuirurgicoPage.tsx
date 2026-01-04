"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Plus, Edit2, Eye, Calendar, Scale, User, FileText, RefreshCw } from "lucide-react"
import type { PlanQuirurgico } from "../types/planQuirurgico"
import { PlanQuirurgicoForm } from "../components/PlanQuirurgicoForm"
import { api } from "../lib/api"

export const PlanQuirurgicoPage: React.FC = () => {
  const [planesQuirurgicos, setPlanesQuirurgicos] = useState<PlanQuirurgico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanQuirurgico | undefined>()
  const [vistaActual, setVistaActual] = useState<"lista" | "formulario">("lista")
  const [refreshing, setRefreshing] = useState(false)
  
  // Usar useRef para prevenir llamadas duplicadas
  const isMounted = useRef(true)
  const isFetching = useRef(false)

  // Cargar planes quirúrgicos al inicio
  useEffect(() => {
    isMounted.current = true
    cargarPlanes()
    
    return () => {
      isMounted.current = false
    }
  }, [])

  const cargarPlanes = async () => {
    // Evitar llamadas duplicadas
    if (isFetching.current) {
      console.log("⏸️ Ya hay una carga en proceso, ignorando llamada duplicada")
      return
    }
    
    try {
      isFetching.current = true
      setLoading(true)
      setError(null)
      console.log("📥 Iniciando carga de planes quirúrgicos...")
      
      const response = await api.getPlanesQuirurgicos(100, 0)
      
      console.log("📥 Respuesta de API:", {
        success: response.success,
        error: response.error,
        total: response.total,
        planesCount: response.planes?.length || 0
      })
      
      // Verificar si el componente sigue montado
      if (!isMounted.current) return
      
      if (response.error) {
        // Si es error de llamada duplicada, ignorarlo
        if (response.message?.includes("Ya hay una llamada") || response.isDuplicateError) {
          console.log("⚠️ Ignorando error de llamada duplicada")
          return
        }
        throw new Error(response.message || "Error cargando planes")
      }
      
      if (response.planes && Array.isArray(response.planes)) {
        console.log(`✅ Cargados ${response.planes.length} planes quirúrgicos`)
        setPlanesQuirurgicos(response.planes)
        
        // Debug: mostrar primeros 2 planes
        if (response.planes.length > 0) {
          console.log("📋 Primeros planes:", response.planes.slice(0, 2).map(p => ({
            id: p.id,
            nombre: p.datos_paciente?.nombre_completo,
            identificacion: p.datos_paciente?.identificacion,
            peso: p.datos_paciente?.peso,
            altura: p.datos_paciente?.altura
          })))
        }
      } else {
        console.warn("⚠️ No se recibieron planes en la respuesta")
        setPlanesQuirurgicos([])
      }
    } catch (error: any) {
      // Verificar si el componente sigue montado
      if (!isMounted.current) return
      
      console.error("❌ Error cargando planes quirúrgicos:", error)
      setError(error.message || "Error al cargar los planes quirúrgicos")
      setPlanesQuirurgicos([])
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setRefreshing(false)
      }
      isFetching.current = false
    }
  }

  const handleRefresh = () => {
    if (isFetching.current) {
      console.log("⏸️ Ya hay una actualización en proceso")
      return
    }
    setRefreshing(true)
    cargarPlanes()
  }

  const handleCrearNuevo = () => {
    setPlanSeleccionado(undefined)
    setVistaActual("formulario")
  }

  const handleEditar = async (plan: PlanQuirurgico) => {
    console.log("🔄 Editando plan:", {
      id: plan.id,
      nombre: plan.datos_paciente?.nombre_completo || 'Sin nombre'
    })
    
    try {
      // Obtener datos frescos de la base de datos
      const result = await api.getPlanQuirurgico(plan.id)
      
      console.log("📥 Resultado de getPlanQuirurgico:", {
        success: result.success,
        error: result.error,
        hasData: !!result.datos_paciente,
        nombre: result.datos_paciente?.nombre_completo
      })
      
      if (result.error) {
        console.error("❌ Error obteniendo plan para editar:", result.message)
        // Usar los datos que ya tenemos como fallback
        alert(`Error al cargar plan completo. Se cargarán datos parciales.`)
        setPlanSeleccionado(plan)
        setVistaActual("formulario")
        return
      }
      
      if (result.success) {
        setPlanSeleccionado(result)
        setVistaActual("formulario")
      } else {
        // Si el plan ya viene con datos, usarlo directamente
        console.log("⚠️ Usando datos existentes como fallback")
        setPlanSeleccionado(plan)
        setVistaActual("formulario")
      }
    } catch (error: any) {
      console.error("❌ Error inesperado al editar:", error)
      // Fallback: usar los datos que ya tenemos
      alert("Error al cargar datos completos. Se usarán datos parciales.")
      setPlanSeleccionado(plan)
      setVistaActual("formulario")
    }
  }

  const [planParaVer, setPlanParaVer] = useState<PlanQuirurgico | null>(null)
  const [showDetallesModal, setShowDetallesModal] = useState(false)

  const handleVerDetalles = (plan: PlanQuirurgico) => {
    setPlanParaVer(plan)
    setShowDetallesModal(true)
  }

  const cerrarDetallesModal = () => {
    setShowDetallesModal(false)
    setPlanParaVer(null)
  }

  const descargarArchivo = (nombreArchivo: string) => {
    // Simular descarga - en producción esto debería hacer una petición al servidor
    alert(`Descargando archivo: ${nombreArchivo}`)
  }

  const handleGuardar = async (plan: PlanQuirurgico) => {
    try {
      console.log("💾 Guardando plan:", {
        id: plan.id,
        nombre: plan.datos_paciente.nombre_completo,
        esEdicion: !!planSeleccionado
      })
      
      let result
      
      if (planSeleccionado) {
        // Actualizar plan existente
        console.log("📝 Actualizando plan existente...")
        result = await api.updatePlanQuirurgico(plan.id, plan)
      } else {
        // Crear nuevo plan
        console.log("🆕 Creando nuevo plan...")
        result = await api.createPlanQuirurgico(plan)
      }
      
      console.log("✅ Resultado del guardado:", result)
      
      // fetchAPI ya devuelve un objeto, NO lanza excepciones
      if (result.error) {
        // Si hay error, mostrar mensaje y salir
        console.error("❌ Error guardando plan:", result.message)
        alert(`Error al guardar: ${result.message}`)
        return // Salir de la función
      }
      
      // Si es éxito, recargar la lista
      if (result.success) {
        console.log("✅ Plan guardado exitosamente, recargando lista...")
        await cargarPlanes()
        setVistaActual("lista")
        alert(planSeleccionado ? "Plan actualizado exitosamente" : "Plan creado exitosamente")
      } else {
        // Si no hay error pero tampoco éxito, mostrar mensaje genérico
        console.error("❌ Error inesperado al guardar:", result)
        alert("Error inesperado al guardar el plan")
      }
    } catch (error: any) {
      // Este catch solo debería ejecutarse para errores inesperados (network, etc.)
      console.error("❌ Error inesperado guardando plan:", error)
      alert(`Error inesperado: ${error.message}`)
    }
  }

  // Formatear fecha
  const formatFecha = (fecha: string) => {
    if (!fecha) return ''
    try {
      const date = new Date(fecha)
      return date.toLocaleDateString('es-ES')
    } catch {
      return fecha
    }
  }

  // Formatear hora a 12 horas con AM/PM
  const formatHora12 = (hora: string) => {
    if (!hora) return ''
    try {
      // Manejar diferentes formatos de hora
      let horaStr = hora
      
      // Si viene en formato PT15H (duración ISO), extraer la hora
      if (hora.startsWith('PT') && hora.includes('H')) {
        const match = hora.match(/PT(\d+)H/)
        if (match) {
          horaStr = `${match[1]}:00:00`
        }
      }
      
      // Si viene como "15:30:00" o "15:30"
      const parts = horaStr.split(':')
      if (parts.length >= 2) {
        let horas = parseInt(parts[0])
        const minutos = parts[1]
        
        const periodo = horas >= 12 ? 'PM' : 'AM'
        
        // Convertir a formato 12 horas
        if (horas === 0) {
          horas = 12 // Medianoche
        } else if (horas > 12) {
          horas = horas - 12
        }
        
        return `${horas}:${minutos} ${periodo}`
      }
      
      return hora
    } catch (error) {
      console.error('Error formateando hora:', error)
      return hora
    }
  }

  // Calcular IMC
  const calcularIMC = (peso: number, altura: number) => {
    if (!peso || !altura || altura === 0) return { imc: 0, categoria: '' }
    const imc = peso / (altura * altura)
    let categoria = ''
    if (imc < 18.5) categoria = "Bajo peso"
    else if (imc < 25) categoria = "Saludable"
    else if (imc < 30) categoria = "Sobrepeso"
    else categoria = "Obesidad"
    return { imc: parseFloat(imc.toFixed(1)), categoria }
  }

  if (vistaActual === "formulario") {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => setVistaActual("lista")}
            className="text-[#1a6b32] hover:text-[#155228] font-medium flex items-center gap-2 mb-4"
          >
            ← Volver a Lista
          </button>
          <h1 className="text-3xl font-bold text-[#1a6b32]">
            {planSeleccionado ? "Editar Plan Quirúrgico" : "Crear Nuevo Plan Quirúrgico"}
          </h1>
          {planSeleccionado && (
            <p className="text-gray-600 mt-2">
              Editando plan para: <span className="font-semibold">{planSeleccionado.datos_paciente.nombre_completo}</span>
            </p>
          )}
        </div>
        <PlanQuirurgicoForm 
          plan={planSeleccionado}
          onGuardar={handleGuardar}
          onCancel={() => setVistaActual("lista")}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1a6b32]">Planes Quirúrgicos</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los planes quirúrgicos de los pacientes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            onClick={handleCrearNuevo}
            className="flex items-center gap-2 bg-[#1a6b32] hover:bg-[#155228] text-white px-6 py-3 rounded-lg font-medium transition"
          >
            <Plus className="w-5 h-5" />
            Crear Nuevo Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a6b32]"></div>
          <p className="text-gray-500 mt-4">Cargando planes quirúrgicos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg mb-4">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div>
              <p className="font-bold">Error al cargar planes quirúrgicos</p>
              <p className="mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      ) : planesQuirurgicos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-gray-400 mb-4 text-5xl">📋</div>
          <p className="text-gray-500 text-lg mb-2">No hay planes quirúrgicos registrados</p>
          <p className="text-gray-400 mb-6">Comienza creando tu primer plan quirúrgico</p>
          <button
            onClick={handleCrearNuevo}
            className="bg-[#1a6b32] hover:bg-[#155228] text-white px-6 py-3 rounded-lg font-medium"
          >
            Crear Primer Plan
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-bold">{planesQuirurgicos.length}</span> plan{planesQuirurgicos.length !== 1 ? 'es' : ''} quirúrgico{planesQuirurgicos.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {planesQuirurgicos.map((plan) => {
            // Calcular IMC si no está en los datos
            const imcData = plan.datos_paciente.imc ? 
              { imc: plan.datos_paciente.imc, categoria: plan.datos_paciente.categoriaIMC } :
              calcularIMC(plan.datos_paciente.peso, plan.datos_paciente.altura)
            
            return (
              <div key={plan.id} className="border rounded-xl p-5 hover:shadow-lg transition-shadow bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <User className="w-6 h-6 text-[#1a6b32]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#1a6b32]">
                        {plan.datos_paciente.nombre_completo || 'Paciente sin nombre'}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <span className="font-medium">Documento:</span>
                          <span>{plan.datos_paciente.identificacion || 'No registrado'}</span>
                        </div>
                        {plan.historia_clinica?.telefono && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span className="font-medium">Tel:</span>
                            <span>{plan.historia_clinica.telefono}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleVerDetalles(plan)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Ver</span>
                    </button>
                    <button
                      onClick={() => handleEditar(plan)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg border border-green-500 text-green-600 hover:bg-green-50 text-sm"
                      title="Editar plan"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Medidas Corporales</span>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Peso:</span>
                        <span className="font-medium">{plan.datos_paciente.peso || '?'} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Altura:</span>
                        <span className="font-medium">{plan.datos_paciente.altura || '?'} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IMC:</span>
                        <span className="font-medium">
                          {imcData.imc || '?'} 
                          {imcData.categoria ? <span className="text-xs ml-1">({imcData.categoria})</span> : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Diagnóstico</span>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-800 line-clamp-2">
                        {plan.historia_clinica?.diagnostico || 
                         plan.historia_clinica?.motivo_consulta_detalle || 
                         'No especificado'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Consulta</span>
                    </div>
                    <div className="text-sm">
                      {plan.datos_paciente.fecha_consulta && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fecha:</span>
                          <span className="font-medium">{formatFecha(plan.datos_paciente.fecha_consulta)}</span>
                        </div>
                      )}
                      {plan.datos_paciente.hora_consulta && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hora:</span>
                          <span className="font-medium">{formatHora12(plan.datos_paciente.hora_consulta)}</span>
                        </div>
                      )}
                      {plan.fecha_creacion && (
                        <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
                          <span className="text-gray-600">Creado:</span>
                          <span className="font-medium">{formatFecha(plan.fecha_creacion)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {plan.historia_clinica?.motivo_consulta && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Motivo de consulta:</span>
                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {plan.historia_clinica.motivo_consulta}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Debug panel (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && planesQuirurgicos.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
          <details>
            <summary className="font-medium text-gray-700 cursor-pointer">Debug Info</summary>
            <div className="mt-2 text-sm">
              <p>Total planes: {planesQuirurgicos.length}</p>
              <p>Primer plan datos:</p>
              <pre className="mt-2 p-2 bg-gray-800 text-gray-100 rounded overflow-auto text-xs max-h-60">
                {JSON.stringify(planesQuirurgicos[0], null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}

      {/* MODAL DE DETALLES DEL PLAN */}
      {showDetallesModal && planParaVer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8">
            {/* Encabezado */}
            <div className="p-6 border-b bg-[#1a6b32] text-white rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Plan Quirúrgico Completo</h2>
                  <p className="text-green-100">
                    Paciente: {planParaVer.datos_paciente.nombre_completo}
                  </p>
                  <p className="text-sm text-green-100">
                    Documento: {planParaVer.datos_paciente.identificacion}
                  </p>
                </div>
                <button
                  onClick={cerrarDetallesModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido - Con scroll */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              
              {/* DATOS DEL PACIENTE */}
              <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-bold text-[#1a6b32] mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Datos del Paciente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Identificación</label>
                    <p className="text-gray-800">{planParaVer.datos_paciente.identificacion || 'No registrado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Nombre Completo</label>
                    <p className="text-gray-800">{planParaVer.datos_paciente.nombre_completo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Edad</label>
                    <p className="text-gray-800">{planParaVer.historia_clinica?.edad_calculada || planParaVer.datos_paciente.edad || '—'} años</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Peso</label>
                    <p className="text-gray-800">{planParaVer.datos_paciente.peso ? `${planParaVer.datos_paciente.peso} kg` : '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Altura</label>
                    <p className="text-gray-800">{planParaVer.datos_paciente.altura ? `${planParaVer.datos_paciente.altura} m` : '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">IMC</label>
                    <p className="text-gray-800">
                      {planParaVer.datos_paciente.imc || '—'}
                      {planParaVer.datos_paciente.categoriaIMC && (
                        <span className="text-sm ml-2 text-gray-600">({planParaVer.datos_paciente.categoriaIMC})</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Fecha de Consulta</label>
                    <p className="text-gray-800">{formatFecha(planParaVer.datos_paciente.fecha_consulta)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Hora de Consulta</label>
                    <p className="text-gray-800">{formatHora12(planParaVer.datos_paciente.hora_consulta)}</p>
                  </div>
                </div>
              </section>

              {/* HISTORIA CLÍNICA */}
              {planParaVer.historia_clinica && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Historia Clínica
                  </h3>
                  
                  {/* Datos de Contacto */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Datos de Contacto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {planParaVer.historia_clinica.telefono && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Teléfono</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.telefono}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.celular && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Celular</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.celular}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.email && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Email</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.email}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.direccion && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Dirección</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.direccion}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.ocupacion && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Ocupación</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.ocupacion}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.entidad && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Entidad</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.entidad}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Motivo de Consulta */}
                  {planParaVer.historia_clinica.motivo_consulta && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Motivo de Consulta</h4>
                      <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                        {planParaVer.historia_clinica.motivo_consulta}
                      </p>
                    </div>
                  )}

                  {/* Diagnóstico */}
                  {planParaVer.historia_clinica.diagnostico && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Diagnóstico</h4>
                      <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                        {planParaVer.historia_clinica.diagnostico}
                      </p>
                    </div>
                  )}

                  {/* Plan de Conducta */}
                  {planParaVer.historia_clinica.plan_conducta && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Plan de Conducta</h4>
                      <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                        {planParaVer.historia_clinica.plan_conducta}
                      </p>
                    </div>
                  )}

                  {/* Enfermedad Actual */}
                  {planParaVer.historia_clinica.enfermedad_actual && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Enfermedad Actual</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(planParaVer.historia_clinica.enfermedad_actual).map(([key, value]) => 
                          value ? (
                            <div key={key} className="flex items-center gap-2 bg-white p-2 rounded border">
                              <span className="text-green-600">✓</span>
                              <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  {/* Antecedentes */}
                  {planParaVer.historia_clinica.antecedentes && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Antecedentes</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(planParaVer.historia_clinica.antecedentes).map(([key, value]) => 
                          value && value !== 'no' ? (
                            <div key={key} className="bg-white p-2 rounded border">
                              <label className="text-sm font-semibold text-gray-600 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </label>
                              <p className="text-gray-800 text-sm mt-1">
                                {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value}
                              </p>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  {/* Examen Físico */}
                  {planParaVer.historia_clinica.notas_corporales && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Examen Físico</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(planParaVer.historia_clinica.notas_corporales).map(([key, value]) => 
                          value ? (
                            <div key={key} className="bg-white p-2 rounded border">
                              <label className="text-sm font-semibold text-gray-600 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </label>
                              <p className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">{value}</p>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* CONDUCTA QUIRÚRGICA */}
              {planParaVer.conducta_quirurgica && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Conducta Quirúrgica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {planParaVer.conducta_quirurgica.duracion_estimada && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Duración Estimada</label>
                        <p className="text-gray-800">{planParaVer.conducta_quirurgica.duracion_estimada} minutos</p>
                      </div>
                    )}
                    {planParaVer.conducta_quirurgica.tipo_anestesia && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Tipo de Anestesia</label>
                        <p className="text-gray-800 capitalize">{planParaVer.conducta_quirurgica.tipo_anestesia}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Requiere Hospitalización</label>
                      <p className="text-gray-800">
                        {planParaVer.conducta_quirurgica.requiere_hospitalizacion ? 'Sí' : 'No'}
                      </p>
                    </div>
                    {planParaVer.conducta_quirurgica.tiempo_hospitalizacion && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Tiempo de Hospitalización</label>
                        <p className="text-gray-800">{planParaVer.conducta_quirurgica.tiempo_hospitalizacion}</p>
                      </div>
                    )}
                    {planParaVer.conducta_quirurgica.reseccion_estimada && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Resección Estimada</label>
                        <p className="text-gray-800">{planParaVer.conducta_quirurgica.reseccion_estimada}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* NOTAS DEL DOCTOR */}
              {planParaVer.notas_doctor && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4">Notas del Doctor</h3>
                  <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                    {planParaVer.notas_doctor}
                  </p>
                </section>
              )}

              {/* ARCHIVOS ADJUNTOS */}
              {planParaVer.imagenes_adjuntas && planParaVer.imagenes_adjuntas.length > 0 && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4">Archivos Adjuntos</h3>
                  <div className="space-y-2">
                    {planParaVer.imagenes_adjuntas.map((archivo, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white rounded border hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-600 text-xl">📄</span>
                          <div>
                            <p className="font-medium text-gray-800">{archivo}</p>
                            <p className="text-xs text-gray-500">Archivo {index + 1} de {planParaVer.imagenes_adjuntas.length}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => descargarArchivo(archivo)}
                          className="px-3 py-1 bg-[#1a6b32] text-white rounded hover:bg-[#155228] text-sm"
                        >
                          ⬇️ Descargar
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ESQUEMA QUIRÚRGICO */}
              {planParaVer.esquema_mejorado && Object.keys(planParaVer.esquema_mejorado.zoneMarkings || {}).length > 0 && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4">Esquema Quirúrgico</h3>
                  <div className="bg-white p-3 rounded border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Zonas Marcadas</label>
                        <p className="text-gray-800">
                          {Object.keys(planParaVer.esquema_mejorado.zoneMarkings).length} zona(s)
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Procedimiento Principal</label>
                        <p className="text-gray-800 capitalize">
                          {planParaVer.esquema_mejorado.selectedProcedure === 'liposuction' 
                            ? 'Liposucción' 
                            : 'Lipotransferencia'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Nota: Abra el editor de esquemas en modo edición para ver las marcas detalladas
                    </p>
                  </div>
                </section>
              )}

              {/* FECHAS */}
              <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-bold text-[#1a6b32] mb-4">Información del Registro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Fecha de Creación</label>
                    <p className="text-gray-800">{formatFecha(planParaVer.fecha_creacion)}</p>
                  </div>
                  {planParaVer.fecha_modificacion && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Última Modificación</label>
                      <p className="text-gray-800">{formatFecha(planParaVer.fecha_modificacion)}</p>
                    </div>
                  )}
                </div>
              </section>

            </div>

            {/* Pie de página */}
            <div className="p-6 border-t flex justify-between items-center bg-gray-50 rounded-b-lg">
              <div className="text-sm text-gray-600">
                Plan ID: {planParaVer.id}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    cerrarDetallesModal()
                    handleEditar(planParaVer)
                  }}
                  className="px-4 py-2 bg-[#1a6b32] text-white rounded hover:bg-[#155228]"
                >
                  Editar Plan
                </button>
                <button
                  onClick={cerrarDetallesModal}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}