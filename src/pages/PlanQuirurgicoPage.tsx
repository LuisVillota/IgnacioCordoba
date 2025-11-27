"use client"

import type React from "react"
import { useState } from "react"
import { Plus, Edit2, Eye, Trash2 } from "lucide-react"
import type { PlanQuirurgico } from "../types/planQuirurgico"
import { PlanQuirurgicoForm } from "../components/PlanQuirurgicoForm"

export const PlanQuirurgicoPage: React.FC = () => {
  const [planesQuirurgicos, setPlanesQuirurgicos] = useState<PlanQuirurgico[]>([
    {
      id: "plan_001",
      id_paciente: "pac_001",
      id_usuario: "doctor_001",
      fecha_creacion: new Date().toISOString(),
      fecha_modificacion: new Date().toISOString(),
      datos_paciente: {
        id: "pac_001",
        identificacion: "1234567890",
        edad: 35,
        nombre_completo: "Juan Pérez García",
        peso: 75,
        altura: 1.75,
        imc: 24.5,
        categoriaIMC: "Peso normal",
        fecha_consulta: "2025-11-20",
        hora_consulta: "10:30",
      },
      historia_clinica: {
        nombre_completo: "Juan Pérez García",
        identificacion: "1234567890",
        ocupacion: "Ingeniero",
        fecha_nacimiento: "1989-05-15",
        edad_calculada: 35,
        referido_por: "Dr. López",
        entidad: "Clínica Central",
        telefono: "3101234567",
        celular: "3105678901",
        direccion: "Calle 50 #20-30",
        email: "juan@example.com",
        motivo_consulta: "Valoración",
        motivo_consulta_detalle: "Evaluación para liposucción de abdomen",
        enfermedad_actual: {
          hepatitis: false,
          discrasia_sanguinea: false,
          cardiopatias: false,
          hipertension: false,
          reumatologicas: false,
          diabetes: false,
          neurologicas: false,
          enfermedad_mental: false,
          no_refiere: true,
        },
        antecedentes: {
          farmacologicos: "Ninguno",
          traumaticos: "Ninguno",
          quirurgicos: "Apendicitis 2015",
          alergicos: "Penicilina",
          toxicos: "Ninguno",
          habitos: "Sedentario",
          ginecologicos: "N/A",
          fuma: "no",
          planificacion: "Preservativo",
        },
        enfermedades_piel: false,
        tratamientos_esteticos: "Ninguno",
        antecedentes_familiares: "Diabetes en madre",
        peso: 75,
        altura: 1.75,
        imc: 24.5,
        contextura: "Normal",
        notas_corporales: {
          cabeza: "Normal",
          mamas: "N/A",
          tcs: "Adecuado",
          abdomen: "Acúmulo de grasa localizada",
          gluteos: "Normal",
          extremidades: "Normal",
          pies_faneras: "Normal",
        },
        diagnostico: "Lipodistrofia abdominal",
        plan_conducta: "Liposucción de abdomen",
      },
      conducta_quirurgica: {
        duracion_estimada: 120,
        tipo_anestesia: "general",
        requiere_hospitalizacion: true,
        tiempo_hospitalizacion: "1 día",
        reseccion_estimada: "Aproximadamente 2-3 litros",
        firma_cirujano: "",
        firma_paciente: "",
      },
      dibujos_esquema: [],
      notas_doctor: "Paciente en excelentes condiciones generales",
      cirugias_previas: [],
      imagenes_adjuntas: [],
      estado: "completado",
    },
  ])

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanQuirurgico | undefined>()
  const [vistaActual, setVistaActual] = useState<"lista" | "formulario">("lista")

  const handleCrearNuevo = () => {
    setPlanSeleccionado(undefined)
    setVistaActual("formulario")
  }

  const handleEditar = (plan: PlanQuirurgico) => {
    setPlanSeleccionado(plan)
    setVistaActual("formulario")
  }

  const handleGuardar = (plan: PlanQuirurgico) => {
    if (planSeleccionado) {
      setPlanesQuirurgicos(planesQuirurgicos.map((p) => (p.id === plan.id ? plan : p)))
    } else {
      setPlanesQuirurgicos([...planesQuirurgicos, plan])
    }
    setVistaActual("lista")
  }

  const handleEliminar = (id: string) => {
    if (window.confirm("¿Está seguro de que desea eliminar este plan?")) {
      setPlanesQuirurgicos(planesQuirurgicos.filter((p) => p.id !== id))
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

      {planesQuirurgicos.length === 0 ? (
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
