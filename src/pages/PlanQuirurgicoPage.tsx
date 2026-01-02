"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Edit2, Eye, Trash2 } from "lucide-react"
import type { PlanQuirurgico } from "../types/planQuirurgico"
import { PlanQuirurgicoForm } from "../components/PlanQuirurgicoForm"
import { api } from "../lib/api"

export const PlanQuirurgicoPage: React.FC = () => {
  const [planesQuirurgicos, setPlanesQuirurgicos] = useState<PlanQuirurgico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanQuirurgico | undefined>()
  const [vistaActual, setVistaActual] = useState<"lista" | "formulario">("lista")

  // Cargar planes quirúrgicos al inicio
  useEffect(() => {
    cargarPlanes()
  }, [])

  const cargarPlanes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.getPlanesQuirurgicos(50, 0)
      
      if (response.error) {
        throw new Error(response.message || "Error cargando planes")
      }
      
      if (response.planes && Array.isArray(response.planes)) {
        setPlanesQuirurgicos(response.planes)
      } else {
        setPlanesQuirurgicos([])
      }
    } catch (error: any) {
      console.error("Error cargando planes quirúrgicos:", error)
      setError(error.message || "Error al cargar los planes quirúrgicos")
      setPlanesQuirurgicos([])
    } finally {
      setLoading(false)
    }
  }

  const handleCrearNuevo = () => {
    setPlanSeleccionado(undefined)
    setVistaActual("formulario")
  }

  const handleEditar = (plan: PlanQuirurgico) => {
    setPlanSeleccionado(plan)
    setVistaActual("formulario")
  }

  const handleGuardar = async (plan: PlanQuirurgico) => {
    try {
      let result
      
      if (planSeleccionado) {
        // Actualizar plan existente
        result = await api.updatePlanQuirurgico(plan.id, plan)
      } else {
        // Crear nuevo plan
        result = await api.createPlanQuirurgico(plan)
      }
      
      if (result.error) {
        throw new Error(result.message || "Error guardando plan")
      }
      
      if (result.success) {
        // Recargar la lista después de guardar
        await cargarPlanes()
        setVistaActual("lista")
      } else {
        throw new Error("Error inesperado al guardar")
      }
    } catch (error: any) {
      console.error("Error guardando plan:", error)
      alert(`Error al guardar: ${error.message}`)
    }
  }

  const handleEliminar = async (id: string) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este plan?")) {
      return
    }
    
    try {
      const result = await api.deletePlanQuirurgico(id)
      
      if (result.error) {
        throw new Error(result.message || "Error eliminando plan")
      }
      
      if (result.success) {
        // Recargar la lista después de eliminar
        await cargarPlanes()
        alert("Plan eliminado exitosamente")
      }
    } catch (error: any) {
      console.error("Error eliminando plan:", error)
      alert(`Error al eliminar: ${error.message}`)
    }
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
        </div>
        {vistaActual === "formulario" && (
          <PlanQuirurgicoForm 
            plan={planSeleccionado}
            onGuardar={handleGuardar}
            onCancel={() => setVistaActual("lista")}
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a6b32]">Planes Quirúrgicos</h1>
        <button
          onClick={handleCrearNuevo}
          className="flex items-center gap-2 bg-[#1a6b32] hover:bg-[#155228] text-white px-6 py-3 rounded-lg font-medium transition"
        >
          <Plus className="w-5 h-5" />
          Crear Nuevo Plan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a6b32]"></div>
          <p className="text-gray-500 mt-4">Cargando planes quirúrgicos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button
            onClick={cargarPlanes}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      ) : planesQuirurgicos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No hay planes quirúrgicos registrados</p>
          <button
            onClick={handleCrearNuevo}
            className="bg-[#99d6e8] hover:bg-[#7ac9dd] text-[#1a6b32] px-4 py-2 rounded font-medium"
          >
            Crear el Primer Plan
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {planesQuirurgicos.map((plan) => (
            <div key={plan.id} className="border rounded-lg p-4 hover:shadow-lg transition bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#1a6b32]">{plan.datos_paciente.nombre_completo}</h3>
                  <p className="text-sm text-gray-600">Cédula: {plan.datos_paciente.identificacion}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    plan.estado === "completado"
                      ? "bg-green-100 text-green-800"
                      : plan.estado === "aprobado"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {plan.estado === "completado" ? "Completado" : plan.estado === "aprobado" ? "Aprobado" : "Borrador"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-600">Edad:</span>
                  <p className="font-medium">{plan.datos_paciente.edad} años</p>
                </div>
                <div>
                  <span className="text-gray-600">Peso/Altura:</span>
                  <p className="font-medium">
                    {plan.datos_paciente.peso}kg / {plan.datos_paciente.altura}m
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">IMC:</span>
                  <p className="font-medium">
                    {plan.datos_paciente.imc?.toFixed(1)} ({plan.datos_paciente.categoriaIMC})
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Consulta:</span>
                  <p className="font-medium">{plan.datos_paciente.fecha_consulta}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleEditar(plan)}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm">
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                <button
                  onClick={() => handleEliminar(plan.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-red-500 text-red-600 hover:bg-red-50 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}