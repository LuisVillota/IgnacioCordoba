"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from "lucide-react"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { CitaForm } from "../components/CitaForm"
import { CitaModal } from "../components/CitaModal"
import { mockCitas, mockPacientes } from "../data/mockData"

export interface Cita {
  id: string
  id_paciente: string
  id_usuario: string
  tipo_cita: "consulta" | "control" | "valoracion" | "programacion_quirurgica"
  fecha: string
  hora: string
  duracion: number
  estado: "pendiente" | "confirmada" | "cancelada" | "completada"
  observaciones: string
}

const tiposDeVisita = {
  consulta: { label: "Consulta", duracion: 60 },
  control: { label: "Control", duracion: 30 },
  valoracion: { label: "Valoración", duracion: 45 },
  programacion_quirurgica: { label: "Programación Quirúrgica", duracion: 60 },
}

export function AgendaPage() {
  const [citas, setCitas] = useState<Cita[]>(mockCitas)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todas")

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const citasDelDia = (fecha: string) => {
    return citas.filter((c) => c.fecha === fecha && (filterEstado === "todas" || c.estado === filterEstado))
  }

  const handleSaveCita = (data: Omit<Cita, "id">) => {
    // Validar que no haya conflicto horario
    const conflicto = citas.some(
      (c) =>
        c.fecha === data.fecha &&
        c.id !== editingId &&
        c.estado !== "cancelada" &&
        !(data.hora >= agregarMinutos(c.hora, c.duracion) || agregarMinutos(data.hora, data.duracion) <= c.hora),
    )

    if (conflicto) {
      alert("Ya existe una cita en ese horario. Por favor elige otro.")
      return
    }

    if (editingId) {
      setCitas(citas.map((c) => (c.id === editingId ? { ...data, id: editingId } : c)))
      setEditingId(null)
    } else {
      const newCita: Cita = {
        ...data,
        id: Date.now().toString(),
      }
      setCitas([...citas, newCita])
    }
    setShowForm(false)
  }

  const handleEdit = (cita: Cita) => {
    setEditingId(cita.id)
    setSelectedCita(cita)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta cita?")) {
      setCitas(citas.filter((c) => c.id !== id))
    }
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthName = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" })

  return (
    <ProtectedRoute permissions={["ver_agenda"]}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Agenda y Citas</h1>
            <p className="text-gray-600 mt-2">Gestiona las citas de los pacientes</p>
          </div>
          <ProtectedRoute permissions={["crear_cita"]}>
            <button
              onClick={() => {
                setEditingId(null)
                setSelectedCita(null)
                setShowForm(true)
              }}
              className="flex items-center space-x-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
            >
              <Plus size={20} />
              <span>Nueva Cita</span>
            </button>
          </ProtectedRoute>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 capitalize">{monthName}</h2>
              <div className="flex items-center space-x-2">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const daysCitas = citasDelDia(dateStr)
                const isToday = new Date().toISOString().split("T")[0] === dateStr

                return (
                  <div
                    key={day}
                    className={`aspect-square p-2 rounded-lg border cursor-pointer transition ${
                      isToday
                        ? "border-[#1a6b32] bg-[#99d6e8]/10"
                        : "border-gray-200 hover:border-[#669933] hover:bg-gray-50"
                    }`}
                  >
                    <div className="h-full flex flex-col">
                      <p className={`text-sm font-semibold ${isToday ? "text-[#1a6b32]" : "text-gray-700"}`}>{day}</p>
                      {daysCitas.length > 0 && (
                        <div className="flex-1 mt-1 text-xs space-y-1 overflow-y-auto">
                          {daysCitas.slice(0, 2).map((cita) => {
                            const paciente = mockPacientes.find((p) => p.id === cita.id_paciente)
                            return (
                              <div
                                key={cita.id}
                                onClick={() => setSelectedCita(cita)}
                                className={`p-1 rounded text-white text-xs truncate cursor-pointer hover:opacity-80 ${
                                  cita.estado === "confirmada"
                                    ? "bg-[#1a6b32]"
                                    : cita.estado === "pendiente"
                                      ? "bg-[#669933]"
                                      : cita.estado === "completada"
                                        ? "bg-blue-500"
                                        : "bg-gray-400"
                                }`}
                              >
                                {cita.hora} {paciente?.nombres}
                              </div>
                            )
                          })}
                          {daysCitas.length > 2 && (
                            <p className="text-gray-500 text-xs pl-1">+{daysCitas.length - 2} más</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Filtrar por Estado</h3>
              <div className="space-y-2">
                {["todas", "pendiente", "confirmada", "completada", "cancelada"].map((estado) => (
                  <label key={estado} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="estado"
                      value={estado}
                      checked={filterEstado === estado}
                      onChange={(e) => setFilterEstado(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 capitalize">{estado === "todas" ? "Todas" : estado}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Today's Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Citas de Hoy</h3>
              <div className="space-y-3">
                {citasDelDia(new Date().toISOString().split("T")[0]).length === 0 ? (
                  <p className="text-sm text-gray-600">No hay citas hoy</p>
                ) : (
                  citasDelDia(new Date().toISOString().split("T")[0]).map((cita) => {
                    const paciente = mockPacientes.find((p) => p.id === cita.id_paciente)
                    return (
                      <div key={cita.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{cita.hora}</p>
                            <p className="text-xs text-gray-600">{paciente?.nombres}</p>
                            <span
                              className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded capitalize ${
                                cita.estado === "confirmada"
                                  ? "bg-[#99d6e8]/30 text-[#1a6b32]"
                                  : cita.estado === "pendiente"
                                    ? "bg-[#669933]/30 text-[#1a6b32]"
                                    : cita.estado === "completada"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {cita.estado}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEdit(cita)}
                              className="p-1 text-[#669933] hover:bg-green-50 rounded transition"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(cita.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showForm && (
          <CitaForm
            cita={selectedCita || undefined}
            onSave={handleSaveCita}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
            }}
          />
        )}

        {selectedCita && !showForm && (
          <CitaModal
            cita={selectedCita}
            paciente={mockPacientes.find((p) => p.id === selectedCita.id_paciente)}
            onClose={() => setSelectedCita(null)}
            onEdit={() => handleEdit(selectedCita)}
            onDelete={() => {
              handleDelete(selectedCita.id)
              setSelectedCita(null)
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}

function agregarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number)
  const totalMinutos = h * 60 + m + minutos
  const horas = Math.floor(totalMinutos / 60)
  const mins = totalMinutos % 60
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}
