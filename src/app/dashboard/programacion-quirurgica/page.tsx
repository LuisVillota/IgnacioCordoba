"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  Edit2,
  Eye,
  RefreshCw,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Scissors,
} from "lucide-react"
import { ProtectedRoute } from "../../../components/ProtectedRoute"
import { ProgramacionForm } from "../../../components/ProgramacionForm"
import { ProgramacionModal } from "../../../components/ProgramacionModal"
import type { Programacion, CreateProgramacionData } from "../../../types/programacion"
import { api, handleApiError } from "../../../lib/api"

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Normaliza cualquier formato de hora del backend a "HH:MM" */
function normalizeHora(hora: string): string {
  if (!hora) return "09:00"
  // Formato intervalo PostgreSQL/MySQL: PT15H, PT9H30M, PT0H30M, etc.
  if (hora.startsWith("PT")) {
    const hMatch = hora.match(/PT(\d+)H/)
    const mMatch = hora.match(/H(\d+)M/)
    const h = hMatch ? parseInt(hMatch[1]) : 0
    const m = mMatch ? parseInt(mMatch[1]) : 0
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  }
  // HH:MM:SS → tomar solo HH:MM
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(hora)) return hora.substring(0, 5)
  // HH:MM → ya está bien
  if (/^\d{1,2}:\d{2}$/.test(hora)) {
    const [h, m] = hora.split(":").map(Number)
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  }
  return "09:00"
}

function minutosDesdeStr(hora: string): number {
  if (!hora) return 0
  const normalized = normalizeHora(hora)
  const [h, m] = normalized.split(":").map(Number)
  return h * 60 + (m || 0)
}

function agregarMins(hora: string, mins: number): string {
  const total = minutosDesdeStr(normalizeHora(hora)) + mins
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// ─── Estado colours ────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<string, { bg: string; light: string; text: string }> = {
  Programado:   { bg: "bg-blue-500",   light: "bg-blue-100",   text: "text-blue-800"   },
  Confirmado:   { bg: "bg-green-500",  light: "bg-green-100",  text: "text-green-800"  },
  Aplazado:     { bg: "bg-orange-500", light: "bg-orange-100", text: "text-orange-800" },
  "En Quirofano": { bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-800" },
  Operado:      { bg: "bg-indigo-500", light: "bg-indigo-100", text: "text-indigo-800" },
  Cancelado:    { bg: "bg-red-400",    light: "bg-red-100",    text: "text-red-800"    },
}

function getEstadoColor(estado: string) {
  return ESTADO_COLORS[estado] ?? { bg: "bg-gray-400", light: "bg-gray-100", text: "text-gray-800" }
}

function getEstadoIcon(estado: string) {
  const icons: Record<string, string> = {
    Confirmado: "✅", Operado: "🏥", "En Quirofano": "⚕️", Cancelado: "❌", Aplazado: "⏸️",
  }
  return icons[estado] ?? "📅"
}

// ─── Overlap column layout (same algorithm as agenda) ─────────────────────

interface ProgConColumna { prog: Programacion; columna: number; totalColumnas: number }

function calcularColumnas(progs: Programacion[]): ProgConColumna[] {
  if (progs.length === 0) return []
  const sorted = [...progs].sort((a, b) => minutosDesdeStr(a.hora) - minutosDesdeStr(b.hora))
  const clusters: Programacion[][] = []
  let cur = [sorted[0]]
  let end = minutosDesdeStr(sorted[0].hora) + (sorted[0].duracion || 60)

  for (let i = 1; i < sorted.length; i++) {
    const s = minutosDesdeStr(sorted[i].hora)
    if (s < end) { cur.push(sorted[i]); end = Math.max(end, s + (sorted[i].duracion || 60)) }
    else { clusters.push(cur); cur = [sorted[i]]; end = s + (sorted[i].duracion || 60) }
  }
  clusters.push(cur)

  const result: ProgConColumna[] = []
  for (const cluster of clusters) {
    const cols: Programacion[][] = []
    for (const p of cluster) {
      const ps = minutosDesdeStr(p.hora)
      let placed = false
      for (let c = 0; c < cols.length; c++) {
        const last = cols[c][cols[c].length - 1]
        if (ps >= minutosDesdeStr(last.hora) + (last.duracion || 60)) { cols[c].push(p); placed = true; break }
      }
      if (!placed) cols.push([p])
    }
    const total = cols.length
    cols.forEach((col, ci) => col.forEach(p => result.push({ prog: p, columna: ci, totalColumnas: total })))
  }
  return result
}

// ─── Day Modal with timeline ───────────────────────────────────────────────

function DiaProgramacionesModal({
  fecha, programaciones, onClose, onNuevaProgramacion, onEdit, onVerDetalle,
}: {
  fecha: string
  programaciones: Programacion[]
  onClose: () => void
  onNuevaProgramacion: (fecha: string, hora?: string) => void
  onEdit: (p: Programacion) => void
  onVerDetalle: (p: Programacion) => void
}) {
  const [sel, setSel] = useState<Programacion | null>(null)

  const d = new Date(fecha + "T00:00:00")
  const diaSemana = d.toLocaleDateString("es-ES", { weekday: "long" })
  const label = `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, ${d.getDate()} de ${d.toLocaleDateString("es-ES", { month: "long" })} de ${d.getFullYear()}`

  const H_INI = 7, H_FIN = 20
  const TOTAL = (H_FIN - H_INI) * 6 // 10-min slots
  const slots = Array.from({ length: TOTAL }, (_, i) => {
    const mins = i * 10
    const h = Math.floor(mins / 60) + H_INI
    const m = mins % 60
    return { hora: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`, esHora: m === 0, esMedia: m === 30 }
  })

  const pos  = (hora: string) => { const [h, m] = hora.split(":").map(Number); return ((h - H_INI) * 60 + m) * 4 }
  const alto = (dur: number)  => Math.max(dur * 4, 40)

  const fmt12 = (hora: string) => {
    const [h, m] = hora.split(":").map(Number)
    const ap = h >= 12 ? "PM" : "AM"; const h12 = h % 12 || 12
    return m === 0 ? `${h12} ${ap}` : `${h12}:${m.toString().padStart(2, "0")} ${ap}`
  }

  const progsConCol = calcularColumnas(programaciones)
  const todayStr = formatDateStr(new Date())

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ width: sel ? "900px" : "700px", maxWidth: "98vw" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{label}</h3>
            <p className="text-gray-500 text-sm mt-0.5">
              {programaciones.length} programación{programaciones.length !== 1 ? "es" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNuevaProgramacion(fecha)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a6b32] hover:bg-[#155529] text-white rounded-lg transition text-sm"
            >
              <Plus size={16} /> Nueva programación
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Timeline */}
          <div className="flex flex-1 overflow-y-auto">
            {/* Hour labels */}
            <div className="w-20 flex-shrink-0 border-r bg-white sticky left-0 z-10">
              {slots.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-center border-b border-gray-100 ${s.esHora ? "font-semibold bg-gray-50" : ""}`}
                  style={{ height: "40px", borderBottomWidth: s.esHora ? "2px" : "1px", borderBottomStyle: s.esHora ? "solid" : "dashed" }}
                >
                  <span className="text-xs text-gray-500">
                    {s.esHora ? fmt12(s.hora) : s.esMedia ? "·" : ""}
                  </span>
                </div>
              ))}
            </div>

            {/* Events area */}
            <div className="flex-1 relative">
              <div className="absolute inset-0" style={{ height: `${TOTAL * 40}px` }}>
                {/* Grid + click-to-create slots */}
                {slots.map((s, i) => (
                  <div
                    key={i}
                    className={`absolute left-0 right-0 ${s.esHora ? "border-b-2 border-gray-300" : "border-b border-gray-100 border-dashed"}`}
                    style={{ top: `${i * 40}px`, height: "40px" }}
                  >
                    <button
                      onClick={() => onNuevaProgramacion(fecha, s.hora)}
                      className="w-full h-full hover:bg-green-50/40 transition group"
                      title={`Nueva programación a las ${s.hora}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded shadow">{s.hora}</span>
                      </div>
                    </button>
                  </div>
                ))}

                {/* Programaciones */}
                {progsConCol.map(({ prog, columna, totalColumnas }) => {
                  const c = getEstadoColor(prog.estado)
                  const top  = pos(prog.hora || "07:00")
                  const h    = alto(prog.duracion || 60)
                  const cw   = 100 / totalColumnas
                  const isSel = sel?.id === prog.id
                  const horaFin = agregarMins(prog.hora || "07:00", prog.duracion || 60)
                  return (
                    <div
                      key={prog.id}
                      onClick={() => setSel(isSel ? null : prog)}
                      className={`absolute rounded-md shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all border-l-4 border-white/40 ${c.bg} ${isSel ? "ring-2 ring-white ring-offset-1" : ""}`}
                      style={{ top: `${top}px`, height: `${h}px`, left: `calc(${columna * cw}% + 2px)`, width: `calc(${cw}% - 4px)`, zIndex: isSel ? 20 : 10 }}
                      title={`${prog.hora} | ${prog.paciente_nombre} ${prog.paciente_apellido} | ${prog.estado}`}
                    >
                      <div className="p-1.5 h-full flex flex-col text-white overflow-hidden">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-semibold">{prog.hora} – {horaFin}</span>
                          <span className="text-[9px] bg-white/20 px-1 rounded shrink-0">{prog.estado}</span>
                        </div>
                        <span className="text-xs font-bold truncate mt-0.5">
                          {prog.paciente_nombre} {prog.paciente_apellido}
                        </span>
                        {prog.numero_documento && <span className="text-[10px] opacity-90">CC: {prog.numero_documento}</span>}
                        {prog.procedimiento_nombre && <span className="text-[10px] opacity-80 truncate">{prog.procedimiento_nombre}</span>}
                      </div>
                    </div>
                  )
                })}

                {/* Current time line */}
                {fecha === todayStr && (() => {
                  const now = new Date()
                  const nowH = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
                  return (
                    <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 pointer-events-none" style={{ top: `${pos(nowH)}px` }}>
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Detail side panel */}
          {sel && (
            <div className="w-72 border-l bg-white flex flex-col flex-shrink-0 overflow-y-auto">
              <div className={`p-4 ${getEstadoColor(sel.estado).light} border-b flex items-start justify-between`}>
                <span className={`text-sm font-semibold px-2 py-1 rounded-full ${getEstadoColor(sel.estado).light} ${getEstadoColor(sel.estado).text}`}>
                  {getEstadoIcon(sel.estado)} {sel.estado}
                </span>
                <button onClick={() => setSel(null)} className="text-gray-400 hover:text-gray-600 p-0.5">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-4 flex-1">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Paciente</p>
                  <p className="font-bold text-gray-800 mt-0.5">{sel.paciente_nombre} {sel.paciente_apellido}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Cédula</p>
                  <p className="text-gray-800 text-sm">{sel.numero_documento || "No registrado"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Fecha y hora</p>
                  <p className="text-gray-800 text-sm">{sel.fecha}</p>
                  <p className="text-gray-600 text-sm">{sel.hora} — {agregarMins(sel.hora || "00:00", sel.duracion || 60)} ({sel.duracion} min)</p>
                </div>
                {sel.procedimiento_nombre && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Procedimiento</p>
                    <p className="text-gray-800 text-sm">{sel.procedimiento_nombre}</p>
                  </div>
                )}
                {sel.anestesiologo && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Anestesiólogo</p>
                    <p className="text-gray-800 text-sm">{sel.anestesiologo}</p>
                  </div>
                )}
                {sel.observaciones && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Observaciones</p>
                    <p className="text-gray-700 text-sm">{sel.observaciones}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t space-y-2">
                <ProtectedRoute permissions={["editar_programacion"]}>
                  <button
                    onClick={() => { onEdit(sel); setSel(null) }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1a6b32] hover:bg-[#155529] text-white rounded-lg transition text-sm"
                  >
                    <Edit2 size={14} /> Editar programación
                  </button>
                </ProtectedRoute>
                <button
                  onClick={() => { onVerDetalle(sel); setSel(null) }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition text-sm"
                >
                  <Eye size={14} /> Ver detalle completo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="border-t p-3 bg-gray-50 flex-shrink-0">
          <div className="flex flex-wrap gap-3">
            {Object.entries(ESTADO_COLORS).map(([estado, c]) => (
              <div key={estado} className="flex items-center gap-1.5 text-xs">
                <div className={`w-3 h-3 rounded ${c.bg}`} />
                <span className="text-gray-600">{estado}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ProgramacionQuirurgicaPage() {
  const [programaciones, setProgramaciones] = useState<Programacion[]>([])
  const [showForm, setShowForm]             = useState(false)
  const [selectedProgramacion, setSelectedProgramacion] = useState<Programacion | null>(null)
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey]         = useState(0)
  const [stats, setStats] = useState({ total: 0, programados: 0, confirmados: 0, enQuirofano: 0, operados: 0, cancelados: 0, aplazados: 0 })

  // Calendar
  const [currentDate, setCurrentDate]     = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)
  const [verDetalleProg, setVerDetalleProg] = useState<Programacion | null>(null)

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => { loadProgramaciones() }, [refreshKey])

  const loadProgramaciones = async () => {
    setLoading(true); setError(null)
    try {
      const response = await api.getAgendaProcedimientos(200, 0)
      if (response && response.procedimientos) {
        const formatted: Programacion[] = response.procedimientos.map((proc: any) => ({
          id: proc.id.toString(),
          paciente_id: proc.paciente_id || "",
          numero_documento: proc.numero_documento || "",
          fecha: proc.fecha,
          hora: normalizeHora(proc.hora || "09:00"),
          duracion: proc.duracion || 60,
          procedimiento_id: proc.procedimiento_id?.toString() || "0",
          anestesiologo: proc.anestesiologo || "",
          estado: proc.estado,
          observaciones: proc.observaciones || "",
          fecha_creacion: proc.fecha_creacion || new Date().toISOString(),
          paciente_nombre: proc.paciente_nombre,
          paciente_apellido: proc.paciente_apellido,
          procedimiento_nombre: proc.procedimiento_nombre,
          procedimiento_precio: proc.procedimiento_precio,
        }))
        setProgramaciones(formatted)
        calcularEstadisticas(formatted)
      } else {
        setProgramaciones([])
        setStats({ total: 0, programados: 0, confirmados: 0, enQuirofano: 0, operados: 0, cancelados: 0, aplazados: 0 })
      }
    } catch (err: any) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const calcularEstadisticas = (list: Programacion[]) => {
    setStats({
      total: list.length,
      programados: list.filter(p => p.estado === "Programado").length,
      confirmados: list.filter(p => p.estado === "Confirmado").length,
      enQuirofano: list.filter(p => p.estado === "En Quirofano").length,
      operados:    list.filter(p => p.estado === "Operado").length,
      cancelados:  list.filter(p => p.estado === "Cancelado").length,
      aplazados:   list.filter(p => p.estado === "Aplazado").length,
    })
  }

  // ── Save / Edit / Delete ──────────────────────────────────────────────────

  const handleEdit = (prog: Programacion) => {
    setSelectedProgramacion(prog); setEditingId(prog.id); setShowForm(true); setDiaSeleccionado(null)
  }

  const handleSaveProgramacion = async (data: CreateProgramacionData) => {
    setLoading(true); setError(null); setSuccessMessage(null)
    try {
      const procId = parseInt(data.procedimiento_id.toString(), 10)
      if (isNaN(procId) || procId <= 0) { setError("Por favor selecciona un procedimiento de la lista"); setLoading(false); return }
      let hora = data.hora
      if (hora.includes(":") && hora.split(":").length === 2) hora += ":00"
      const payload = {
        numero_documento: data.numero_documento,
        fecha: data.fecha, hora,
        procedimiento_id: procId,
        duracion: data.duracion,
        anestesiologo: data.anestesiologo,
        estado: data.estado,
        observaciones: data.observaciones,
        paciente_id: data.paciente_id ? parseInt(data.paciente_id) : undefined,
      }
      let response
      if (editingId) {
        const idNum = parseInt(editingId)
        if (isNaN(idNum)) { setError("ID de edición inválido"); setLoading(false); return }
        response = await api.updateAgendaProcedimiento(idNum, payload)
      } else {
        response = await api.createAgendaProcedimiento(payload)
      }
      if (response && response.error === true) {
        setError(`❌ ${response.message || "Error desconocido"}`); setLoading(false); return
      }
      if (response && response.success !== false) {
        setSuccessMessage(editingId ? "Programación actualizada correctamente" : "Programación creada correctamente")
        setTimeout(() => setRefreshKey(k => k + 1), 500)
        setShowForm(false); setEditingId(null); setSelectedProgramacion(null)
      } else {
        setError("❌ Respuesta inesperada del servidor")
      }
    } catch (err: any) {
      setError(`❌ ${handleApiError(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeEstado = async (id: string, nuevoEstado: Programacion["estado"]) => {
    setLoading(true); setError(null)
    try {
      const idNum = parseInt(id); if (isNaN(idNum)) { setError("ID inválido"); return }
      const p = programaciones.find(x => x.id === id); if (!p) { setError("Programación no encontrada"); return }
      await api.updateAgendaProcedimiento(idNum, {
        numero_documento: p.numero_documento, fecha: p.fecha, hora: p.hora,
        duracion: p.duracion, procedimiento_id: parseInt(p.procedimiento_id),
        anestesiologo: p.anestesiologo, estado: nuevoEstado, observaciones: p.observaciones || "",
      })
      setSuccessMessage(`Estado cambiado a "${nuevoEstado}"`)
      setRefreshKey(k => k + 1)
    } catch (err: any) { setError(handleApiError(err)) }
    finally { setLoading(false) }
  }

  // ── Calendar helpers ──────────────────────────────────────────────────────

  const getDaysInMonth  = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay()
  const changeMonth = (offset: number) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  const monthName   = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" })

  const programacionesDelDia = (fecha: string) =>
    programaciones
      .filter(p => p.fecha === fecha)
      .sort((a, b) => minutosDesdeStr(a.hora) - minutosDesdeStr(b.hora))

  const handleNuevaProgramacionDesdeModal = (fecha: string, hora?: string) => {
    setDiaSeleccionado(null); setEditingId(null)
    setSelectedProgramacion(hora ? { fecha, hora } as any : { fecha } as any)
    setShowForm(true)
  }

  // ── Calendar render ───────────────────────────────────────────────────────

  const renderCalendarDays = () => {
    const todayStr = formatDateStr(new Date())
    const days = getDaysInMonth(currentDate)
    return Array.from({ length: days }, (_, i) => {
      const day = i + 1
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateStr = formatDateStr(date)
      const dayProgs = programacionesDelDia(dateStr)
      const isToday = todayStr === dateStr

      return (
        <div
          key={day}
          onClick={() => setDiaSeleccionado(dateStr)}
          className={`min-h-[80px] p-2 rounded-lg border cursor-pointer transition ${
            isToday ? "border-[#1a6b32] bg-[#99d6e8]/10" : "border-gray-200 hover:border-[#669933] hover:bg-gray-50"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <p className={`text-sm font-semibold ${isToday ? "text-[#1a6b32]" : "text-gray-700"}`}>{day}</p>
            {dayProgs.length > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-800 rounded-full px-1.5 py-0.5">{dayProgs.length}</span>
            )}
          </div>
          <div className="space-y-0.5">
            {dayProgs.slice(0, 3).map(prog => {
              const c = getEstadoColor(prog.estado)
              return (
                <div key={prog.id} className={`rounded px-1 py-0.5 text-white text-[10px] truncate ${c.bg}`}>
                  <span className="font-medium">{prog.hora}</span>
                  {" "}
                  {prog.paciente_nombre?.split(" ")[0]} {prog.paciente_apellido?.charAt(0)}.
                </div>
              )
            })}
            {dayProgs.length > 3 && (
              <p className="text-[10px] text-gray-400 pl-0.5">+{dayProgs.length - 3} más</p>
            )}
          </div>
        </div>
      )
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute permissions={["ver_programacion"]}>
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Programación Quirúrgica</h1>
            <p className="text-gray-600 mt-1">Gestiona las cirugías programadas</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
            <ProtectedRoute permissions={["crear_programacion"]}>
              <button
                onClick={() => { setEditingId(null); setSelectedProgramacion(null); setShowForm(true) }}
                className="flex items-center gap-2 bg-[#1a6b32] hover:bg-[#155529] text-white px-4 py-2 rounded-lg transition"
              >
                <Plus size={18} /> Nueva Programación
              </button>
            </ProtectedRoute>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1"><p className="text-red-700 text-sm">{error}</p></div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1"><p className="text-green-700 text-sm">{successMessage}</p></div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600"><X size={16} /></button>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: "Total",       value: stats.total,       color: "text-gray-800",   bg: "bg-gray-50",    border: "border-gray-200" },
            { label: "Programados", value: stats.programados, color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200" },
            { label: "Confirmados", value: stats.confirmados, color: "text-green-600",  bg: "bg-green-50",   border: "border-green-200" },
            { label: "En Quirófano",value: stats.enQuirofano, color: "text-purple-600", bg: "bg-purple-50",  border: "border-purple-200" },
            { label: "Operados",    value: stats.operados,    color: "text-indigo-600", bg: "bg-indigo-50",  border: "border-indigo-200" },
            { label: "Cancelados",  value: stats.cancelados,  color: "text-red-600",    bg: "bg-red-50",     border: "border-red-200" },
            { label: "Aplazados",   value: stats.aplazados,   color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg border ${s.border} p-3 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-800 capitalize">{monthName}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                Hoy
              </button>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
              <div key={d} className="text-center text-sm font-semibold text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a6b32]" />
              <span className="ml-3 text-gray-600">Cargando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px]" />
              ))}
              {renderCalendarDays()}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
            {Object.entries(ESTADO_COLORS).map(([estado, c]) => (
              <div key={estado} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-3 h-3 rounded ${c.bg}`} />
                {estado}
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <p className="text-xs text-gray-400 mt-3 text-center">
          Haz clic en un día para ver y gestionar sus programaciones
        </p>
      </div>

      {/* Day Modal */}
      {diaSeleccionado && (
        <DiaProgramacionesModal
          fecha={diaSeleccionado}
          programaciones={programacionesDelDia(diaSeleccionado)}
          onClose={() => setDiaSeleccionado(null)}
          onNuevaProgramacion={handleNuevaProgramacionDesdeModal}
          onEdit={handleEdit}
          onVerDetalle={p => { setDiaSeleccionado(null); setVerDetalleProg(p) }}
        />
      )}

      {/* Programacion Form */}
      {showForm && (
        <ProgramacionForm
          programacion={selectedProgramacion || undefined}
          onSave={handleSaveProgramacion}
          onClose={() => { setShowForm(false); setEditingId(null); setSelectedProgramacion(null); setError(null); setSuccessMessage(null) }}
          isLoading={loading}
        />
      )}

      {/* Programacion Detail Modal */}
      {verDetalleProg && !showForm && (
        <ProgramacionModal
          programacion={verDetalleProg}
          onClose={() => setVerDetalleProg(null)}
          onEdit={() => { handleEdit(verDetalleProg); setVerDetalleProg(null) }}
        />
      )}
    </ProtectedRoute>
  )
}
