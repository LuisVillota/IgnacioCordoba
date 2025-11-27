"use client"

import { useState, useEffect } from "react"
import { Clock, AlertCircle, CheckCircle2, Phone } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { mockCitas, mockPacientes } from "../data/mockData"

interface CitaEspera {
  id: string
  id_paciente: string
  hora: string
  estado: "pendiente" | "llegada" | "confirmada" | "retraso" | "en_consulta" | "completada"
  tiempo_espera: number
}

export function SalaEsperaPage() {
  const [citasHoy, setCitasHoy] = useState<CitaEspera[]>([])
  const [horaActual, setHoraActual] = useState(new Date())

  useEffect(() => {
    // Simular citas de hoy
    const hoy = new Date().toISOString().split("T")[0]
    const citas = mockCitas
      .filter((c) => c.fecha === hoy)
      .map((c, idx) => ({
        id: c.id,
        id_paciente: c.id_paciente,
        hora: c.hora,
        estado: ["pendiente", "llegada", "confirmada", "retraso", "en_consulta", "completada"][idx % 6] as any,
        tiempo_espera: Math.floor(Math.random() * 30),
      }))

    setCitasHoy(citas)

    // Actualizar hora cada segundo
    const timer = setInterval(() => {
      setHoraActual(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleChangeEstado = (citaId: string, nuevoEstado: CitaEspera["estado"]) => {
    setCitasHoy(citasHoy.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c)))
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "llegada":
        return <AlertCircle className="text-yellow-500" size={20} />
      case "confirmada":
      case "en_consulta":
        return <CheckCircle2 className="text-green-500" size={20} />
      case "completada":
        return <CheckCircle2 className="text-blue-500" size={20} />
      default:
        return <Clock className="text-gray-400" size={20} />
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-gray-100 text-gray-800"
      case "llegada":
        return "bg-yellow-100 text-yellow-800"
      case "confirmada":
        return "bg-blue-100 text-blue-800"
      case "retraso":
        return "bg-orange-100 text-orange-800"
      case "en_consulta":
        return "bg-green-100 text-green-800"
      case "completada":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const estadoLabels: Record<string, string> = {
    pendiente: "Pendiente",
    llegada: "Llegada",
    confirmada: "Confirmada",
    retraso: "Retraso",
    en_consulta: "En Consulta",
    completada: "Completada",
  }

  return (
    <ProtectedRoute permissions={["ver_sala_espera"]}>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Sala de Espera</h1>
              <p className="text-gray-600 mt-2">Control en tiempo real de pacientes</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-[#1a6b32]">{horaActual.toLocaleTimeString("es-CO")}</p>
              <p className="text-gray-600">{horaActual.toLocaleDateString("es-CO")}</p>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Pendientes",
              count: citasHoy.filter((c) => c.estado === "pendiente").length,
              color: "bg-gray-50",
            },
            { label: "Llegada", count: citasHoy.filter((c) => c.estado === "llegada").length, color: "bg-yellow-50" },
            {
              label: "En Consulta",
              count: citasHoy.filter((c) => c.estado === "en_consulta").length,
              color: "bg-green-50",
            },
            {
              label: "Completada",
              count: citasHoy.filter((c) => c.estado === "completada").length,
              color: "bg-blue-50",
            },
          ].map((stat, idx) => (
            <div key={idx} className={`${stat.color} rounded-lg shadow-sm border border-gray-200 p-4 text-center`}>
              <p className="text-3xl font-bold text-gray-800">{stat.count}</p>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Lista de citas */}
        <div className="space-y-3">
          {citasHoy.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Clock size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No hay citas programadas para hoy</p>
            </div>
          ) : (
            citasHoy.map((cita) => {
              const paciente = mockPacientes.find((p) => p.id === cita.id_paciente)
              return (
                <div
                  key={cita.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {getEstadoIcon(cita.estado)}
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">
                          {paciente?.nombres} {paciente?.apellidos}
                        </p>
                        <p className="text-xs text-gray-600">
                          Documento: {paciente?.documento} | Teléfono: {paciente?.telefono}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">{cita.hora}</p>
                        <p className="text-xs text-gray-600">Espera: {cita.tiempo_espera} min</p>
                      </div>

                      <select
                        value={cita.estado}
                        onChange={(e) => handleChangeEstado(cita.id, e.target.value as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${getEstadoColor(cita.estado)}`}
                      >
                        {Object.entries(estadoLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Phone size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
