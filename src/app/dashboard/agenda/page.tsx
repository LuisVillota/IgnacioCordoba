"use client"

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, Edit2, Calendar, Clock, User, AlertCircle, RefreshCw, AlertTriangle, X, Trash2, Printer, Search } from "lucide-react"
import jsPDF from "jspdf"
import { ProtectedRoute } from "../../../components/ProtectedRoute" 
import { CitaModal } from "../../../components/CitaModal"
import { api, handleApiError } from "@/lib/api"
import { toast } from "sonner"
import type { paciente } from "../../../types/paciente"

interface cita {
  id: string
  id_paciente: string
  id_usuario: string
  tipo_cita: "consulta" | "control" | "valoracion" | "programacion_quirurgica" | "visitador_medico" | "valoracion_virtual" | "control_virtual" | "control_postquirurgico"
  fecha: string
  hora: string
  duracion: number
  estado: "pendiente" | "confirmada" | "cancelada" | "completada"
  observaciones?: string
  paciente_nombre?: string
  paciente_apellido?: string
  doctor_nombre?: string
}

interface citaConflict {
  citaExistente: cita
  nuevacita: Omit<cita, "id">
  mensaje: string
}

const tiposDeVisita = {
  consulta: { label: "Consulta", duracion: 60 },
  control: { label: "Control", duracion: 10 },
  valoracion: { label: "Valoración", duracion: 30 },
  programacion_quirurgica: { label: "Programación Quirúrgica", duracion: 20 },
  visitador_medico: { label: "Visitador Médico", duracion: 10 },
  valoracion_virtual: { label: "Valoración Virtual", duracion: 30 },
  control_virtual: { label: "Control Virtual", duracion: 10 },
  control_postquirurgico: { label: "Control Post-Quirúrgico", duracion: 10 },
}

const formatDate = (date: Date | string): string => {
  if (!date) return ''
  
  try {
    let d: Date
    
    if (typeof date === 'string') {
      // Si es string en formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date
      }
      
      // Si tiene hora, tomar solo la parte de fecha
      const datePart = date.split('T')[0] || date.split(' ')[0]
      d = new Date(datePart + 'T00:00:00')
    } else {
      d = date
    }
    
    if (isNaN(d.getTime())) return ''
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

const formatTime = (timeString: string): string => {
  if (!timeString) return '09:00'
  
  if (/^\d{2}:\d{2}$/.test(timeString)) return timeString
  
  const match = timeString.match(/^(\d{2}:\d{2})/)
  return match ? match[1] : '09:00'
}

const cleanTimeFormat = (timeString: string): string => {
  if (!timeString) return '09:00'
  
  const match = timeString.match(/^(\d{2}):(\d{2})/)
  if (match) {
    const horas = match[1]
    const minutos = match[2]
    return `${horas}:${minutos}`
  }
  
  return '09:00'
}

const transformBackendcita = (backendcita: any): cita => {
  
  let fecha = ''
  let hora = ''
  
  if (backendcita.fecha_hora) {
    const fechaHoraStr = backendcita.fecha_hora.toString()
    
    if (fechaHoraStr.includes(' ')) {
      const [datePart, timePart] = fechaHoraStr.split(' ')
      fecha = datePart
      hora = timePart ? formatTime(timePart) : '09:00'
    } 
    else if (fechaHoraStr.includes('T')) {
      const dateObj = new Date(fechaHoraStr)
      fecha = formatDate(dateObj)
      hora = dateObj.toTimeString().slice(0, 5)
    }
    else if (backendcita.fecha_hora instanceof Date) {
      fecha = formatDate(backendcita.fecha_hora)
      hora = backendcita.fecha_hora.toTimeString().slice(0, 5)
    }
  } else if (backendcita.fecha && backendcita.hora) {
    fecha = backendcita.fecha
    hora = formatTime(backendcita.hora)
  }
  
  if (!fecha) {
    fecha = formatDate(new Date())
  }

  let estado: cita["estado"] = "pendiente"
  if (backendcita.estado_id) {
    switch(backendcita.estado_id) {
      case 1: estado = "cancelada"; break;
      case 2: estado = "confirmada"; break;
      case 3: estado = "completada"; break;
      case 4: estado = "pendiente"; break;
      default: estado = "pendiente";
    }
  } else if (backendcita.estado_nombre) {
    const estadoLower = backendcita.estado_nombre.toLowerCase()
    if (estadoLower.includes('confirm')) estado = "confirmada"
    else if (estadoLower.includes('complet')) estado = "completada"
    else if (estadoLower.includes('cancel')) estado = "cancelada"
    else if (estadoLower.includes('pendient')) estado = "pendiente"
  } else if (backendcita.estado) {
    const estadoLower = backendcita.estado.toLowerCase()
    if (estadoLower.includes('confirm')) estado = "confirmada"
    else if (estadoLower.includes('complet')) estado = "completada"
    else if (estadoLower.includes('cancel')) estado = "cancelada"
    else if (estadoLower.includes('pendient')) estado = "pendiente"
  }

  let tipo_cita: cita["tipo_cita"] = "consulta"
  if (backendcita.tipo) {
    const tipoLower = backendcita.tipo.toLowerCase()
    if (tipoLower.includes('control') && tipoLower.includes('post') && tipoLower.includes('quirurg')) tipo_cita = "control_postquirurgico"
    else if (tipoLower.includes('control') && tipoLower.includes('virtual')) tipo_cita = "control_virtual"
    else if (tipoLower.includes('valoracion') && tipoLower.includes('virtual')) tipo_cita = "valoracion_virtual"
    else if (tipoLower.includes('visitador') && tipoLower.includes('medico')) tipo_cita = "visitador_medico"
    else if (tipoLower.includes('control')) tipo_cita = "control"
    else if (tipoLower.includes('valora')) tipo_cita = "valoracion"
    else if (tipoLower.includes('program') || tipoLower.includes('quirur')) tipo_cita = "programacion_quirurgica"
    else if (tipoLower.includes('consulta')) tipo_cita = "consulta"
  }

  const cita: cita = {
    id: backendcita.id?.toString() || backendcita.cita_id?.toString() || Date.now().toString(),
    id_paciente: backendcita.paciente_id?.toString() || backendcita.id_paciente?.toString() || '',
    id_usuario: backendcita.usuario_id?.toString() || backendcita.id_usuario?.toString() || '1',
    tipo_cita: tipo_cita,
    fecha: fecha,
    hora: hora,
    duracion: backendcita.duracion || backendcita.duracion_minutos || tiposDeVisita[tipo_cita]?.duracion || 30,
    estado: estado,
    observaciones: backendcita.observaciones || backendcita.notas || '',
    paciente_nombre: backendcita.paciente_nombre || backendcita.nombres || backendcita.nombre || '',
    paciente_apellido: backendcita.paciente_apellido || backendcita.apellidos || backendcita.apellido || '',
    doctor_nombre: backendcita.doctor_nombre || backendcita.doctor || backendcita.usuario_nombre || 'Dr. No Especificado',
  }

  return cita
}

const transformBackendpaciente = (backendpaciente: any): paciente => {
  return {
    id: backendpaciente.id?.toString() || '',
    nombres: backendpaciente.nombres || backendpaciente.nombre || '',
    apellidos: backendpaciente.apellidos || backendpaciente.apellido || '',
    tipo_documento: backendpaciente.tipo_documento || 'CC',
    documento: backendpaciente.documento || backendpaciente.numero_documento || '',
    fecha_nacimiento: backendpaciente.fecha_nacimiento || new Date().toISOString().split('T')[0],
    genero: backendpaciente.genero || 'no especificado',
    telefono: backendpaciente.telefono || '',
    email: backendpaciente.email || '',
    direccion: backendpaciente.direccion || '',
    ciudad: backendpaciente.ciudad || '',
    estado_paciente: backendpaciente.estado_paciente || 'activo',
    fecha_registro: backendpaciente.fecha_registro || new Date().toISOString().split('T')[0]
  }
}

// Función para crear paciente por defecto
const crearPacientePorDefecto = (id: string, nombres?: string, apellidos?: string): paciente => {
  const hoy = new Date().toISOString().split('T')[0]
  return {
    id: id,
    nombres: nombres || '',
    apellidos: apellidos || '',
    tipo_documento: 'CC',
    documento: '',
    fecha_nacimiento: hoy,
    genero: 'no especificado',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    estado_paciente: 'activo',
    fecha_registro: hoy
  }
}

const ordenarcitasPorFechaHoraAscendente = (citasArray: cita[]): cita[] => {
  
  const citasOrdenadas = citasArray.sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime()
    const fechaB = new Date(b.fecha).getTime()
    
    if (fechaA !== fechaB) {
      return fechaA - fechaB
    }
    
    const [horaA, minutoA] = a.hora.split(':').map(Number)
    const [horaB, minutoB] = b.hora.split(':').map(Number)
    
    const minutosA = horaA * 60 + (minutoA || 0)
    const minutosB = horaB * 60 + (minutoB || 0)
    
    return minutosA - minutosB
  })
  
  return citasOrdenadas
}

const getEstadoId = (estado: string): number => {
  switch(estado) {
    case 'pendiente': return 4;
    case 'confirmada': return 2;
    case 'completada': return 3;
    case 'cancelada': return 1;
    default: return 4;
  }
}

function ConflictoHorarioModal({ 
  conflicto, 
  onCancel, 
  onOverride 
}: { 
  conflicto: citaConflict
  onCancel: () => void
  onOverride: () => void
}) {
  const pacienteExistente = conflicto.citaExistente.paciente_nombre + ' ' + conflicto.citaExistente.paciente_apellido
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-800">Conflicto de Horario</h3>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Ya existe una cita programada en el mismo horario. Por favor revisa los detalles:
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-amber-800 mb-2">Cita Existente:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Paciente:</span>
                  <span className="font-medium">{pacienteExistente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{conflicto.citaExistente.fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">
                    {conflicto.citaExistente.hora} - {agregarMinutos(conflicto.citaExistente.hora, conflicto.citaExistente.duracion)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{tiposDeVisita[conflicto.citaExistente.tipo_cita]?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-medium capitalize ${
                    conflicto.citaExistente.estado === 'confirmada' ? 'text-green-600' :
                    conflicto.citaExistente.estado === 'pendiente' ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>
                    {conflicto.citaExistente.estado}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Nueva cita:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{conflicto.nuevacita.fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">
                    {conflicto.nuevacita.hora} - {agregarMinutos(conflicto.nuevacita.hora, conflicto.nuevacita.duracion)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{tiposDeVisita[conflicto.nuevacita.tipo_cita]?.label}</span>
                </div>
              </div>
            </div>
            
            <p className="text-amber-700 font-medium mt-4 text-sm">
              {conflicto.mensaje}
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={onOverride}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
            >
              Crear de Todas Formas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Algoritmo de distribución de columnas para citas solapadas (estilo Google Calendar) ───
interface CitaConColumna {
  cita: cita
  columna: number
  totalColumnas: number
}

function minutosDesdeHoraStr(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

function calcularColumnasOverlap(citasDelDia: cita[]): CitaConColumna[] {
  if (citasDelDia.length === 0) return []

  const sorted = [...citasDelDia].sort((a, b) => {
    const startA = minutosDesdeHoraStr(a.hora)
    const startB = minutosDesdeHoraStr(b.hora)
    if (startA !== startB) return startA - startB
    return b.duracion - a.duracion
  })

  // Agrupar citas solapadas en clusters
  const clusters: cita[][] = []
  let currentCluster: cita[] = [sorted[0]]
  let clusterEnd = minutosDesdeHoraStr(sorted[0].hora) + sorted[0].duracion

  for (let i = 1; i < sorted.length; i++) {
    const citaStart = minutosDesdeHoraStr(sorted[i].hora)
    if (citaStart < clusterEnd) {
      currentCluster.push(sorted[i])
      clusterEnd = Math.max(clusterEnd, citaStart + sorted[i].duracion)
    } else {
      clusters.push(currentCluster)
      currentCluster = [sorted[i]]
      clusterEnd = citaStart + sorted[i].duracion
    }
  }
  clusters.push(currentCluster)

  // Asignar columnas dentro de cada cluster
  const result: CitaConColumna[] = []
  for (const cluster of clusters) {
    const columns: cita[][] = []

    for (const c of cluster) {
      const cStart = minutosDesdeHoraStr(c.hora)
      let placed = false

      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1]
        const lastEnd = minutosDesdeHoraStr(lastInCol.hora) + lastInCol.duracion
        if (cStart >= lastEnd) {
          columns[col].push(c)
          placed = true
          break
        }
      }

      if (!placed) {
        columns.push([c])
      }
    }

    const totalColumnas = columns.length
    for (let col = 0; col < columns.length; col++) {
      for (const c of columns[col]) {
        result.push({ cita: c, columna: col, totalColumnas })
      }
    }
  }

  return result
}

// Modal para mostrar todas las citas de un día con vista tipo Google Calendar - CON INTERVALOS DE 10 MINUTOS CORREGIDO
function DiaCitasModal({
  fecha,
  citas,
  pacientes,
  onClose,
  onEdit,
  onNuevaCita,
  onVerDetalle
}: {
  fecha: string
  citas: cita[]
  pacientes: paciente[]
  onClose: () => void
  onEdit: (cita: cita) => void
  onNuevaCita: (fecha: string, hora?: string) => void
  onVerDetalle: (cita: cita) => void
}) {
  // Usar fecha local corregida
  const fechaCorregida = new Date(fecha + 'T00:00:00')
  const diaSemana = fechaCorregida.toLocaleDateString('es-ES', { weekday: 'long' })
  const diaMes = fechaCorregida.getDate()
  const mes = fechaCorregida.toLocaleDateString('es-ES', { month: 'long' })
  const año = fechaCorregida.getFullYear()
  
  // Crear intervalos de 10 minutos desde 7:00 AM hasta 8:00 PM
  const horasInicio = 7; // 7:00 AM
  const horasFin = 20; // 8:00 PM
  const totalHoras = horasFin - horasInicio;
  const intervalosPorHora = 6; // 60 minutos / 10 = 6 intervalos por hora
  const totalIntervalos = totalHoras * intervalosPorHora;
  
  const intervalosDelDia = Array.from({ length: totalIntervalos }, (_, i) => {
    const minutosTotales = i * 10; // Cada intervalo es de 10 minutos
    const horas = Math.floor(minutosTotales / 60) + horasInicio;
    const minutos = minutosTotales % 60;
    
    const horaStr = horas.toString().padStart(2, '0');
    const minutosStr = minutos.toString().padStart(2, '0');
    
    return {
      hora: `${horaStr}:${minutosStr}`,
      horaCompleta: horas,
      minutos: minutos,
      esHoraCompleta: minutos === 0, // Para resaltar las horas en punto
      esMediaHora: minutos === 30, // Para marcar las medias horas
    };
  });

  // Función para calcular la posición vertical de una cita
  const calcularPosicionCita = (hora: string) => {
    const [horas, minutos] = hora.split(':').map(Number);
    const minutosDesdeInicio = (horas - horasInicio) * 60 + minutos;

    // Convertir a píxeles: cada 10 minutos = 40px → 4px por minuto
    return minutosDesdeInicio * 4;
  };

  // Función para calcular la altura de una cita
  const calcularAlturaCita = (duracion: number) => {
    // 4px por minuto de duración (40px por cada 10 min)
    return duracion * 4;
  };

  // Función para formatear la hora para mostrar
  const formatHoraDisplay = (hora: string) => {
    const [horas, minutos] = hora.split(':').map(Number);
    const ampm = horas >= 12 ? 'PM' : 'AM';
    const horas12 = horas % 12 || 12;
    if (minutos === 0) {
      return `${horas12} ${ampm}`;
    }
    return `${horas12}:${minutos.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800 capitalize">
                {diaSemana}, {diaMes} de {mes} de {año}
              </h3>
              <p className="text-gray-600 mt-1">
                {citas.length} {citas.length === 1 ? 'cita' : 'citas'} programada{citas.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onNuevaCita(fecha)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#1a6b32] hover:bg-[#155529] text-white rounded-lg transition"
              >
                <Plus size={20} />
                <span>Nueva cita</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition p-2"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENEDOR PRINCIPAL CON SCROLL */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Columna de horas - CON INTERVALOS DE 10 MINUTOS */}
            <div className="w-24 flex-shrink-0 border-r bg-white sticky left-0 z-10">
              <div className="h-full">
                {intervalosDelDia.map((intervalo, index) => (
                  <div
                    key={`${intervalo.hora}-${index}`}
                    className={`flex items-center justify-center border-b border-gray-100 ${
                      intervalo.esHoraCompleta ? 'font-semibold bg-gray-50' : ''
                    }`}
                    style={{ 
                      height: '40px', // Altura fija para cada intervalo de 10 minutos
                      borderBottomWidth: intervalo.esHoraCompleta ? '2px' : '1px',
                      borderBottomStyle: intervalo.esHoraCompleta ? 'solid' : 'dashed'
                    }}
                  >
                    <div className="text-xs text-gray-600">
                      {intervalo.esHoraCompleta ? formatHoraDisplay(intervalo.hora) : ''}
                      {!intervalo.esHoraCompleta && intervalo.esMediaHora && (
                        <span className="text-gray-400">•</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Área principal del calendario - CON ALTURA FIJA Y INTERVALOS DE 10 MINUTOS */}
            <div className="flex-1 relative">
              {/* Contenedor principal con altura calculada */}
              <div 
                className="absolute inset-0"
                style={{ 
                  height: `${totalIntervalos * 40}px` // 40px por cada intervalo de 10 minutos
                }}
              >
                {/* Líneas de tiempo para cada intervalo de 10 minutos */}
                {intervalosDelDia.map((intervalo, index) => (
                  <div
                    key={`line-${intervalo.hora}-${index}`}
                    className={`absolute left-0 right-0 ${
                      intervalo.esHoraCompleta 
                        ? 'border-b-2 border-gray-300' 
                        : 'border-b border-gray-100 border-dashed'
                    }`}
                    style={{ 
                      top: `${index * 40}px`, 
                      height: '40px',
                    }}
                  >
                    {/* Slot para hacer clic y crear cita en este intervalo exacto */}
                    <button
                      onClick={() => onNuevaCita(fecha, intervalo.hora)}
                      className="w-full h-full hover:bg-gray-50/50 transition-colors group relative"
                      title={`Crear cita a las ${intervalo.hora}`}
                    >
                      {/* Mostrar guía visual para intervalos */}
                      {!intervalo.esHoraCompleta && (
                        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-px bg-gray-200 opacity-50"></div>
                      )}
                      
                      {/* Mostrar hora en hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
                          {intervalo.hora}
                        </span>
                      </div>
                    </button>
                  </div>
                ))}

                {/* Citas posicionadas con distribución de columnas (estilo Google Calendar) */}
                {(() => {
                  const citasConColumna = calcularColumnasOverlap(citas)
                  return citasConColumna.map(({ cita: citaItem, columna, totalColumnas }) => {
                    const paciente = pacientes.find(p => p.id === citaItem.id_paciente) ||
                      crearPacientePorDefecto(
                        citaItem.id_paciente,
                        citaItem.paciente_nombre,
                        citaItem.paciente_apellido
                      );

                    const estadoColor = {
                      confirmada: "bg-[#1a6b32]",
                      pendiente: "bg-[#669933]",
                      completada: "bg-blue-500",
                      cancelada: "bg-gray-400"
                    }[citaItem.estado] || "bg-gray-200";

                    const tipoColor = {
                      consulta: "border-l-4 border-l-blue-500",
                      control: "border-l-4 border-l-green-500",
                      valoracion: "border-l-4 border-l-purple-500",
                      programacion_quirurgica: "border-l-4 border-l-red-500",
                      visitador_medico: "border-l-4 border-l-amber-500",
                      valoracion_virtual: "border-l-4 border-l-cyan-500",
                      control_virtual: "border-l-4 border-l-emerald-500",
                      control_postquirurgico: "border-l-4 border-l-pink-500"
                    }[citaItem.tipo_cita] || "border-l-4 border-l-gray-500";

                    const posicion = calcularPosicionCita(citaItem.hora);
                    const altura = calcularAlturaCita(citaItem.duracion);
                    const horaFin = agregarMinutos(citaItem.hora, citaItem.duracion);

                    // Distribución horizontal por columnas
                    const columnWidth = 100 / totalColumnas
                    const leftPercent = columna * columnWidth

                    return (
                      <div
                        key={citaItem.id}
                        onClick={() => onVerDetalle(citaItem)}
                        className={`absolute rounded-md shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all ${estadoColor} ${tipoColor}`}
                        style={{
                          top: `${posicion}px`,
                          height: `${Math.max(altura, 100)}px`,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${columnWidth}% - 4px)`,
                          zIndex: 10,
                        }}
                        title={`${citaItem.hora} - ${horaFin} | ${paciente.nombres} ${paciente.apellidos} | ${tiposDeVisita[citaItem.tipo_cita]?.label}`}
                      >
                        <div className="p-2 h-full flex flex-col text-white overflow-hidden">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold">
                              {citaItem.hora} - {horaFin}
                            </span>
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded whitespace-nowrap ml-1">
                              {citaItem.estado.charAt(0).toUpperCase() + citaItem.estado.slice(1)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold truncate mt-0.5">
                            {paciente.nombres?.toUpperCase()} {paciente.apellidos?.toUpperCase()}
                          </h4>
                          {paciente.documento && (
                            <div className="text-[11px] opacity-90">
                              CC: {paciente.documento}
                            </div>
                          )}
                          <div className="text-[11px] opacity-95 font-medium">
                            {tiposDeVisita[citaItem.tipo_cita]?.label || citaItem.tipo_cita}
                          </div>
                          <div className="text-[10px] opacity-80">
                            {citaItem.duracion} min
                          </div>
                        </div>
                      </div>
                    );
                  })
                })()}

                {/* Indicador de hora actual (solo si es hoy) */}
                {formatDate(new Date()) === fecha && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                    style={{
                      top: `${calcularPosicionCita(
                        `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`
                      )}px`
                    }}
                  >
                    <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-4 gap-4 text-sm w-full">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#1a6b32] rounded"></div>
                <span className="text-gray-700">Confirmada</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#669933] rounded"></div>
                <span className="text-gray-700">Pendiente</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-700">Completada</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                <span className="text-gray-700">Cancelada</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Intervalos:</span> 10 minutos
              </div>
              <button
                onClick={() => onNuevaCita(fecha)}
                className="text-sm text-[#1a6b32] hover:text-[#155529] font-medium flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Agregar cita
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de confirmación para eliminar cita
function ConfirmarEliminacionModal({
  cita,
  paciente,
  onClose,
  onConfirm
}: {
  cita: cita
  paciente: paciente
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-800">Confirmar Eliminación</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              ¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-red-800 mb-2">Detalles de la cita a eliminar:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Paciente:</span>
                  <span className="font-medium">{paciente.nombres} {paciente.apellidos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{cita.fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">
                    {cita.hora} - {agregarMinutos(cita.hora, cita.duracion)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{tiposDeVisita[cita.tipo_cita]?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-medium capitalize ${
                    cita.estado === 'confirmada' ? 'text-green-600' :
                    cita.estado === 'pendiente' ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>
                    {cita.estado}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-red-700 font-medium text-sm">
              ⚠️ Esta acción eliminará permanentemente la cita del sistema.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Eliminar Cita
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente CitaForm actualizado con botón de eliminar Y DURACIONES ESPECÍFICAS
function CitaForm({ cita, pacientes, onSave, onClose, onDelete, onPlanQuirurgico }: {
  cita?: cita
  pacientes: paciente[]
  onSave: (data: Omit<cita, "id">) => void
  onClose: () => void
  onDelete?: () => void
  onPlanQuirurgico?: (pacienteId: string) => void
}) {
  const [formData, setFormData] = useState<Omit<cita, "id">>({
    id_paciente: cita?.id_paciente || "",
    id_usuario: cita?.id_usuario || "1",
    tipo_cita: cita?.tipo_cita || "consulta",
    fecha: cita?.fecha || formatDate(new Date()),
    hora: cita?.hora || "09:00",
    duracion: cita?.duracion || 60, // Valor por defecto actualizado
    estado: cita?.estado || "pendiente",
    observaciones: cita?.observaciones || "",
    paciente_nombre: cita?.paciente_nombre || "",
    paciente_apellido: cita?.paciente_apellido || "",
    doctor_nombre: cita?.doctor_nombre || "Dr. No Especificado",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pacienteCitaSearch, setPacienteCitaSearch] = useState('')
  const [showPacienteCitaDropdown, setShowPacienteCitaDropdown] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === "tipo_cita") {
      // Actualizar la duración automáticamente cuando se cambia el tipo de cita
      const nuevaDuracion = tiposDeVisita[value as keyof typeof tiposDeVisita]?.duracion || 60
      setFormData(prev => ({
        ...prev,
        tipo_cita: value as cita["tipo_cita"],
        duracion: nuevaDuracion
      }))
    } else if (name === "duracion") {
      // Solo permitir valores específicos para la duración
      const duracionesPermitidas = [10, 20, 30, 60]
      const valorNumerico = parseInt(value) || 60
      const duracionValida = duracionesPermitidas.includes(valorNumerico) ? valorNumerico : 60
      setFormData(prev => ({
        ...prev,
        [name]: duracionValida
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}
    
    if (!formData.id_paciente) {
      newErrors.id_paciente = "Selecciona un paciente"
    }
    if (!formData.fecha) {
      newErrors.fecha = "La fecha es requerida"
    }
    if (!formData.hora) {
      newErrors.hora = "La hora es requerida"
    }
    if (!formData.duracion || formData.duracion < 10) {
      newErrors.duracion = "La duración mínima es 10 minutos"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    onSave(formData)
  }

  const pacienteSeleccionado = pacientes.find(p => p.id === formData.id_paciente)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              {cita ? "Editar cita" : "Nueva cita"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition p-2"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paciente *
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar paciente por nombre o documento..."
                      value={(() => {
                        if (formData.id_paciente) {
                          const sel = pacientes.find(p => p.id.toString() === formData.id_paciente)
                          if (sel) return `${sel.nombres} ${sel.apellidos} (${sel.documento})`
                        }
                        return pacienteCitaSearch || ''
                      })()}
                      onChange={(e) => {
                        setPacienteCitaSearch(e.target.value)
                        if (formData.id_paciente) {
                          setFormData((prev: any) => ({ ...prev, id_paciente: '' }))
                        }
                        setShowPacienteCitaDropdown(true)
                      }}
                      onFocus={() => setShowPacienteCitaDropdown(true)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-[#1a6b32] transition ${
                        errors.id_paciente ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {showPacienteCitaDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {[...pacientes]
                        .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`))
                        .filter(p => {
                          const term = (pacienteCitaSearch || '').toLowerCase()
                          if (!term) return true
                          return `${p.nombres} ${p.apellidos}`.toLowerCase().includes(term) || p.documento?.includes(term)
                        })
                        .map((paciente) => (
                          <button
                            key={paciente.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev: any) => ({ ...prev, id_paciente: paciente.id.toString() }))
                              setPacienteCitaSearch('')
                              setShowPacienteCitaDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-green-50 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <span className="font-medium">{paciente.nombres} {paciente.apellidos}</span>
                            <span className="text-gray-500 ml-2">({paciente.documento})</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
                {errors.id_paciente && (
                  <p className="text-red-500 text-sm mt-1">{errors.id_paciente}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Visita
                </label>
                <select
                  name="tipo_cita"
                  value={formData.tipo_cita}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-[#1a6b32] transition"
                >
                  {Object.entries(tiposDeVisita).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label} ({value.duracion} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-[#1a6b32] transition ${
                      errors.fecha ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.fecha && (
                    <p className="text-red-500 text-sm mt-1">{errors.fecha}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora (HH:MM) *
                  </label>
                  <input
                    type="time"
                    name="hora"
                    value={formData.hora}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-[#1a6b32] transition ${
                      errors.hora ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.hora && (
                    <p className="text-red-500 text-sm mt-1">{errors.hora}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración (min) *
                  </label>
                  <select
                    name="duracion"
                    value={formData.duracion}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-[#1a6b32] transition ${
                      errors.duracion ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="10">10 minutos</option>
                    <option value="20">20 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="60">60 minutos</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Duración automática basada en el tipo de cita
                  </p>
                  {errors.duracion && (
                    <p className="text-red-500 text-sm mt-1">{errors.duracion}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-[#1a6b32] transition"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-[#1a6b32] transition"
                  placeholder="Notas adicionales sobre la cita..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor
                </label>
                <input
                  type="text"
                  name="doctor_nombre"
                  value={formData.doctor_nombre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a6b32] focus:border-[#1a6b32] transition"
                  placeholder="Nombre del doctor"
                />
              </div>
            </div>

            <div className="flex justify-between space-x-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex-1"
              >
                Cancelar
              </button>
              
              {/* Botón de eliminar - solo visible cuando se está editando una cita existente */}
              {cita && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex-1 flex items-center justify-center"
                >
                  <Trash2 size={18} className="mr-2" />
                  Eliminar
                </button>
              )}
              
              <button
                type="submit"
                className="px-4 py-2 bg-[#1a6b32] text-white rounded-lg hover:bg-[#155529] transition flex-1"
              >
                {cita ? "Actualizar" : "Crear"} Cita
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const router = useRouter()
  const [citas, setcitas] = useState<cita[]>([])
  const [pacientes, setpacientes] = useState<paciente[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [selectedcita, setSelectedcita] = useState<cita | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todas")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [conflictoHorario, setConflictoHorario] = useState<citaConflict | null>(null)
  const [pendienteGuardar, setPendienteGuardar] = useState<Omit<cita, "id"> | null>(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)
  const [mostrarConfirmarEliminacion, setMostrarConfirmarEliminacion] = useState(false)
  const [citaAEliminar, setCitaAEliminar] = useState<cita | null>(null)
  const [pacienteAEliminar, setPacienteAEliminar] = useState<paciente | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const testBackendConnection = async () => {
    setTestingConnection(true)
    try {
      const result = await api.testConnection()
      
      if (result.success) {
        toast.success("✅ Backend conectado correctamente")
        return true
      } else {
        toast.warning(`⚠️ Backend no disponible: ${result.message}`)
        return false
      }
    } catch (error) {
      toast.error("❌ Error al probar conexión con el backend")
      return false
    } finally {
      setTestingConnection(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const isBackendAvailable = await testBackendConnection()
      
      if (!isBackendAvailable) {
        setcitas([])
        setpacientes([])
        setUseMockData(false)
        toast.error("El backend no está disponible. No se pueden cargar los datos.")
        return
      }
      
      try {
        let citasResponse
        try {
          citasResponse = await api.getcitas(100, 0)
        } catch (citaError: any) {
          throw new Error(`No se pudieron cargar las citas: ${handleApiError(citaError)}`)
        }
        
        let citasArray: any[] = []
        
        if (Array.isArray(citasResponse)) {
          citasArray = citasResponse
        } else if (citasResponse?.citas && Array.isArray(citasResponse.citas)) {
          citasArray = citasResponse.citas
        } else if (citasResponse?.data && Array.isArray(citasResponse.data)) {
          citasArray = citasResponse.data
        } else if (citasResponse && typeof citasResponse === 'object') {
          const possibleKeys = ['citas', 'appointments', 'items', 'results']
          for (const key of possibleKeys) {
            if (Array.isArray(citasResponse[key])) {
              citasArray = citasResponse[key]
              break
            }
          }
        }
        
        const transformedcitas = citasArray.map(transformBackendcita)
        const citasOrdenadas = ordenarcitasPorFechaHoraAscendente(transformedcitas)
        
        const validcitas = citasOrdenadas.filter(c => c.fecha && c.hora)
        
        setcitas(validcitas)
        
        let pacientesResponse
        try {
          pacientesResponse = await api.getpacientes(100, 0)
        } catch (pacienteError: any) {
          throw new Error(`No se pudieron cargar los pacientes: ${handleApiError(pacienteError)}`)
        }
        
        let pacientesArray: any[] = []
        
        if (Array.isArray(pacientesResponse)) {
          pacientesArray = pacientesResponse
        } else if (pacientesResponse?.pacientes && Array.isArray(pacientesResponse.pacientes)) {
          pacientesArray = pacientesResponse.pacientes
        } else if (pacientesResponse?.data && Array.isArray(pacientesResponse.data)) {
          pacientesArray = pacientesResponse.data
        } else if (pacientesResponse && typeof pacientesResponse === 'object') {
          const possibleKeys = ['pacientes', 'patients', 'items', 'results']
          for (const key of possibleKeys) {
            if (Array.isArray(pacientesResponse[key])) {
              pacientesArray = pacientesResponse[key]
              break
            }
          }
        }
        
        const transformedpacientes = pacientesArray.map(transformBackendpaciente)
        setpacientes(transformedpacientes)
        
        setUseMockData(false)
        
        if (validcitas.length === 0) {
          toast.info("No hay citas programadas. ¡Crea tu primera cita!")
        }
        if (transformedpacientes.length === 0) {
          toast.warning("No hay pacientes registrados.")
        }
        
      } catch (apiError: any) {
        setcitas([])
        setpacientes([])
        setUseMockData(false)
        setError(`Error cargando datos: ${apiError.message}`)
        
        toast.error("Error cargando los datos. Por favor, verifica la conexión con el backend.")
      }
      
    } catch (error: any) {
      const errorMsg = error.message || "Error desconocido al cargar datos"
      setError(errorMsg)
      toast.error("Error al cargar los datos: " + errorMsg)
      
      setcitas([])
      setpacientes([])
      setUseMockData(false)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const citasDelDia = (fecha: string) => {
    const fechaFormateada = formatDate(fecha)
    if (!fechaFormateada) return []
    
    const citasFiltradas = citas.filter((c) => {
      const citaFecha = formatDate(c.fecha)
      const coincide = citaFecha === fechaFormateada && 
                      (filterEstado === "todas" || c.estado === filterEstado)
      return coincide
    })
    
    const citasOrdenadas = citasFiltradas.sort((a, b) => {
      const [horaA, minutoA] = a.hora.split(':').map(Number)
      const [horaB, minutoB] = b.hora.split(':').map(Number)
      
      const minutosA = horaA * 60 + (minutoA || 0)
      const minutosB = horaB * 60 + (minutoB || 0)
      
      return minutosA - minutosB
    })
    
    return citasOrdenadas
  }

  const verificarConflictoHorario = (nuevaCita: Omit<cita, "id">, idExcluir?: string): citaConflict | null => {
    const nuevaInicio = minutosDesdeHora(nuevaCita.hora)
    const nuevaFin = nuevaInicio + nuevaCita.duracion

    for (const cita of citas) {
      if (idExcluir && cita.id === idExcluir) continue
      if (cita.estado === "cancelada") continue
      if (formatDate(cita.fecha) !== formatDate(nuevaCita.fecha)) continue

      const citaInicio = minutosDesdeHora(cita.hora)
      const citaFin = citaInicio + cita.duracion

      if (Math.max(nuevaInicio, citaInicio) < Math.min(nuevaFin, citaFin)) {
        const mensaje = nuevaInicio === citaInicio && nuevaFin === citaFin
          ? "Ya existe una cita exactamente en el mismo horario."
          : `Las citas se superponen por ${Math.min(nuevaFin, citaFin) - Math.max(nuevaInicio, citaInicio)} minutos.`
        return { citaExistente: cita, nuevacita: nuevaCita, mensaje }
      }
    }

    return null
  }

  const minutosDesdeHora = (hora: string): number => {
    const [h, m] = hora.split(":").map(Number)
    return h * 60 + m
  }

  const handleSaveCita = async (data: Omit<cita, "id">) => {
    // Forzar que observaciones siempre sea string
    data.observaciones = data.observaciones || ""

    try {
      if (!data.id_paciente || !data.fecha || !data.hora || !data.id_usuario) {
        toast.error("Por favor completa todos los campos requeridos")
        return
      }

      const usuarioId = parseInt(data.id_usuario);
      if (isNaN(usuarioId)) {
        data.id_usuario = "1";
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
        toast.error("Formato de fecha inválido. Use YYYY-MM-DD")
        return
      }

      if (!/^\d{2}:\d{2}/.test(data.hora)) {
        toast.error("Formato de hora inválido. Use HH:MM")
        return
      }

      const conflicto = verificarConflictoHorario(data, editingId || undefined)

      if (conflicto) {
        setConflictoHorario(conflicto)
        setPendienteGuardar(data)
        return
      }

      await guardarcitaSinConflicto(data)

    } catch (error: any) {
      toast.error('Error al guardar la cita: ' + (error.message || "Error desconocido"))
    }
  }

  const guardarcitaSinConflicto = async (data: Omit<cita, "id">) => {
    try {
      const horaFormateada = cleanTimeFormat(data.hora)
      
      // Mapear los tipos de cita a los valores que espera el backend
      const tipoMapeo: Record<string, string> = {

        control: "control",
        valoracion: "valoracion",
        programacion_quirurgica: "program_quir",
        visitador_medico: "visitador_medico",
        valoracion_virtual: "valoracion_virtual",
        control_virtual: "control_virtual",
        control_postquirurgico: "control_postquirurgico"
      }
      
      const citaData = {
        paciente_id: parseInt(data.id_paciente),
        usuario_id: parseInt(data.id_usuario) || 1,
        fecha_hora: `${data.fecha}T${horaFormateada}:00`,
        tipo: tipoMapeo[data.tipo_cita] || data.tipo_cita,
        duracion_minutos: data.duracion,
        estado_id: getEstadoId(data.estado),
        notas: data.observaciones || ''
      };
      
      if (editingId) {
        await api.updatecita(parseInt(editingId), citaData)
        await loadData()
        
        toast.success('Cita actualizada exitosamente')
        setEditingId(null)
      } else {
        await api.createcita(citaData)
        await loadData()
        
        toast.success('Cita creada exitosamente')
      }
      
      setShowForm(false)
      setDiaSeleccionado(null)
      
    } catch (apiError: any) {
      const errorMsg = handleApiError(apiError)
      toast.error(`Error: ${errorMsg}`)
      toast.error('No se pudo guardar la cita. Por favor, inténtalo de nuevo.')
    }
  }

  const handleOverrideConflicto = async () => {
    if (!pendienteGuardar) return
    
    await guardarcitaSinConflicto(pendienteGuardar)
    
    setConflictoHorario(null)
    setPendienteGuardar(null)
    
    toast.warning("Cita creada a pesar del conflicto de horario")
  }

  const handleCancelConflicto = () => {
    setConflictoHorario(null)
    setPendienteGuardar(null)
    toast.info("Creación de cita cancelada por conflicto de horario")
  }

  const handleEdit = (cita: cita) => {
    setEditingId(cita.id)
    setSelectedcita(cita)
    setShowForm(true)
    setDiaSeleccionado(null)
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

  const handleDiaClick = (fecha: string) => {
    // Asegurarnos de que la fecha está en formato correcto
    const fechaCorregida = formatDate(fecha)
    setDiaSeleccionado(fechaCorregida)
  }

  // FUNCIÓN ACTUALIZADA CON PARÁMETRO hora
  const handleNuevaCitaDesdeModal = (fecha: string, hora?: string) => {
    setDiaSeleccionado(null)
    setEditingId(null)
    
    // Si se pasa una hora, crear una cita predeterminada con esa hora
    if (hora) {
      const nuevaCitaPredefinida: Omit<cita, "id"> = {
        id_paciente: "",
        id_usuario: "1",
        tipo_cita: "control",
        fecha: fecha,
        hora: hora,
        duracion: 10,
        estado: "pendiente",
        observaciones: "",
        paciente_nombre: "",
        paciente_apellido: "",
        doctor_nombre: "Dr. No Especificado"
      };
      
      setSelectedcita(nuevaCitaPredefinida as any);
    } else {
      setSelectedcita(null);
    }
    
    setShowForm(true);
  }

  // Función para solicitar eliminar cita
  const solicitarEliminarCita = (cita: cita) => {
    const paciente = getpacienteById(cita.id_paciente) || 
      crearPacientePorDefecto(
        cita.id_paciente,
        cita.paciente_nombre,
        cita.paciente_apellido
      )
    
    setCitaAEliminar(cita)
    setPacienteAEliminar(paciente)
    setMostrarConfirmarEliminacion(true)
    setSelectedcita(null) // Cerrar el modal de detalles si está abierto
  }

  // Función para confirmar y ejecutar la eliminación
  const confirmarEliminarCita = async () => {
    if (!citaAEliminar) return
    
    try {
      setEliminando(true)
      
      // Llamar a la API para eliminar la cita
      await api.deletecita(parseInt(citaAEliminar.id))
      
      // Recargar los datos
      await loadData()
      
      // Cerrar modales
      setMostrarConfirmarEliminacion(false)
      setCitaAEliminar(null)
      setPacienteAEliminar(null)
      setShowForm(false) // Cerrar también el formulario de edición
      setEditingId(null)
      setSelectedcita(null)
      
      // Mostrar mensaje de éxito
      toast.success('Cita eliminada exitosamente')
      
    } catch (apiError: any) {
      const errorMsg = handleApiError(apiError)
      toast.error(`Error al eliminar la cita: ${errorMsg}`)
    } finally {
      setEliminando(false)
    }
  }

  // Función para cancelar la eliminación
  const cancelarEliminacion = () => {
    setMostrarConfirmarEliminacion(false)
    setCitaAEliminar(null)
    setPacienteAEliminar(null)
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const monthName = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" })

  const getpacienteById = (id: string) => {
    return pacientes.find(p => p.id === id)
  }

  // ─── Generar PDF con todas las citas del mes ───
  const generarAgendaPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
    const PAGE_W = 210
    const PAGE_H = 297
    const MARGIN = 12
    const INNER_W = PAGE_W - MARGIN * 2

    const drawPageHeader = () => {
      doc.setFillColor(26, 107, 50)
      doc.rect(0, 0, PAGE_W, 22, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(13)
      doc.text("AGENDA DE CITAS", PAGE_W / 2, 10, { align: "center" })
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.text(monthName.charAt(0).toUpperCase() + monthName.slice(1), PAGE_W / 2, 16, { align: "center" })
    }

    const drawPageFooter = () => {
      doc.setFillColor(26, 107, 50)
      doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6)
      doc.text(
        "Calle 5D # 38a-35 Edificio Vida Cons 814-815  ·  Tels: 5518244 / 3176688522",
        PAGE_W / 2, PAGE_H - 4, { align: "center" }
      )
    }

    drawPageHeader()
    drawPageFooter()
    let y = 28

    const checkPage = (needed: number) => {
      if (y + needed > PAGE_H - 14) {
        doc.addPage()
        drawPageHeader()
        drawPageFooter()
        y = 28
      }
    }

    let hayCitas = false

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateStr = formatDate(date)
      const dayCitas = citasDelDia(dateStr)

      if (dayCitas.length === 0) continue
      hayCitas = true

      const neededHeight = 16 + dayCitas.length * 7
      checkPage(Math.min(neededHeight, 50))

      // Barra del día
      const diaSemana = date.toLocaleDateString('es-ES', { weekday: 'long' })
      doc.setFillColor(232, 245, 238)
      doc.setDrawColor(200, 200, 200)
      doc.rect(MARGIN, y, INNER_W, 7, "FD")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(26, 107, 50)
      doc.text(`${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, ${day} — ${dayCitas.length} cita(s)`, MARGIN + 3, y + 5)
      y += 9

      // Encabezado de tabla
      doc.setFillColor(245, 245, 245)
      doc.rect(MARGIN, y, INNER_W, 6, "FD")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(6.5)
      doc.setTextColor(80, 80, 80)
      doc.text("Hora", MARGIN + 2, y + 4)
      doc.text("Paciente", MARGIN + 30, y + 4)
      doc.text("Tipo", MARGIN + 110, y + 4)
      doc.text("Estado", MARGIN + 150, y + 4)
      y += 7

      // Filas de citas
      dayCitas.sort((a, b) => minutosDesdeHoraStr(a.hora) - minutosDesdeHoraStr(b.hora))
      dayCitas.forEach((c) => {
        checkPage(7)
        const pac = getpacienteById(c.id_paciente)
        const nombre = pac
          ? `${pac.nombres} ${pac.apellidos}`
          : `${c.paciente_nombre || ''} ${c.paciente_apellido || ''}`
        const horaFin = agregarMinutos(c.hora, c.duracion)
        const tipo = tiposDeVisita[c.tipo_cita]?.label || c.tipo_cita

        doc.setFont("helvetica", "normal")
        doc.setFontSize(7)
        doc.setTextColor(0, 0, 0)
        doc.text(`${c.hora} - ${horaFin}`, MARGIN + 2, y + 4)
        doc.text(nombre.substring(0, 45), MARGIN + 30, y + 4)
        doc.text(tipo.substring(0, 25), MARGIN + 110, y + 4)
        doc.text(c.estado.charAt(0).toUpperCase() + c.estado.slice(1), MARGIN + 150, y + 4)

        doc.setDrawColor(220, 220, 220)
        doc.line(MARGIN, y + 6, MARGIN + INNER_W, y + 6)
        y += 7
      })

      y += 4
    }

    if (!hayCitas) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(120, 120, 120)
      doc.text("No hay citas programadas para este mes.", PAGE_W / 2, 50, { align: "center" })
    }

    const mesNombre = monthName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    doc.save(`agenda_${mesNombre}.pdf`)
  }

  const renderCalendarDays = () => {
    const today = new Date()
    const todayStr = formatDate(today)
    
    return days.map((day) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateStr = formatDate(date)
      const dayscitas = citasDelDia(dateStr)
      const isToday = todayStr === dateStr

      return (
        <div
          key={day}
          onClick={() => handleDiaClick(dateStr)}
          className={`aspect-square p-2 rounded-lg border cursor-pointer transition ${
            isToday
              ? "border-[#1a6b32] bg-[#99d6e8]/10"
              : "border-gray-200 hover:border-[#669933] hover:bg-gray-50"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-start">
              <p className={`text-sm font-semibold ${isToday ? "text-[#1a6b32]" : "text-gray-700"}`}>
                {day}
              </p>
              {dayscitas.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                  {dayscitas.length}
                </span>
              )}
            </div>
            {dayscitas.length > 0 && (
              <div className="flex-1 mt-1 text-xs space-y-1 overflow-y-auto">
                {dayscitas.slice(0, 3).map((cita) => {
                  const paciente = getpacienteById(cita.id_paciente) || {
                    nombres: cita.paciente_nombre || '',
                    apellidos: cita.paciente_apellido || ''
                  }
                  const tipoColor = {
                    consulta: "bg-blue-500",
                    control: "bg-green-500",
                    valoracion: "bg-purple-500",
                    programacion_quirurgica: "bg-red-500",
                    visitador_medico: "bg-amber-500",
                    valoracion_virtual: "bg-cyan-500",
                    control_virtual: "bg-emerald-500",
                    control_postquirurgico: "bg-pink-500"
                  }[cita.tipo_cita] || "bg-gray-500"
                  
                  const estadoColor = {
                    confirmada: "bg-[#1a6b32]",
                    pendiente: "bg-[#669933]",
                    completada: "bg-blue-500",
                    cancelada: "bg-gray-400"
                  }[cita.estado] || "bg-gray-500"
                  
                  return (
                    <div
                      key={cita.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedcita(cita)
                      }}
                      className={`p-1.5 rounded text-white text-xs cursor-pointer hover:opacity-90 transition ${estadoColor}`}
                      title={`${cita.hora} - ${paciente.nombres} ${paciente.apellidos} (${cita.estado}, ${tiposDeVisita[cita.tipo_cita]?.label || cita.tipo_cita})`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock size={10} className="mr-1" />
                          <span className="truncate font-medium">{cita.hora}</span>
                        </div>
                        <span className={`text-[10px] px-1 rounded ${tipoColor}`}>
                          {tiposDeVisita[cita.tipo_cita]?.label?.charAt(0) || cita.tipo_cita.charAt(0)}
                        </span>
                      </div>
                      <div className="truncate mt-0.5">
                        {paciente.nombres.split(' ')[0]} {paciente.apellidos.split(' ')[0].charAt(0)}.
                      </div>
                    </div>
                  )
                })}
                {dayscitas.length > 3 && (
                  <p className="text-gray-500 text-xs pl-1 font-medium">
                    +{dayscitas.length - 3} más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a6b32] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute permissions={["ver_agenda"]}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Agenda y citas</h1>
            <p className="text-gray-600 mt-2">Gestiona las citas de los pacientes</p>
            <div className="flex items-center space-x-4 mt-1 text-sm">
              <span className="text-gray-700">Citas: {citas.length}</span>
              <span className="text-gray-700">Pacientes: {pacientes.length}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              disabled={testingConnection}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={testingConnection ? "animate-spin" : ""} />
              <span>Recargar</span>
            </button>
            <ProtectedRoute permissions={["crear_cita"]}>
              <button
                onClick={() => {
                  setEditingId(null)
                  setSelectedcita(null)
                  setShowForm(true)
                }}
                disabled={pacientes.length === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  pacientes.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#1a6b32] hover:bg-[#155529] text-white"
                }`}
              >
                <Plus size={20} />
                <span>Nueva cita</span>
              </button>
            </ProtectedRoute>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-800 font-medium">⚠️ Error cargando datos</p>
                <p className="text-amber-700 text-sm mt-1">{error}</p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={loadData}
                    disabled={testingConnection}
                    className={`px-3 py-1 rounded text-sm transition flex items-center ${
                      testingConnection 
                        ? "bg-amber-100 text-amber-700" 
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    <RefreshCw size={14} className={`mr-1 ${testingConnection ? "animate-spin" : ""}`} />
                    {testingConnection ? 'Probando...' : 'Reintentar conexión'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {pacientes.length === 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium">⚠️ Atención: No hay pacientes registrados</p>
            <p className="text-amber-700 text-sm mt-1">
              Para crear citas, primero necesitas registrar pacientes en la sección de pacientes.
            </p>
          </div>
        )}

        {citas.length === 0 && pacientes.length > 0 && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <Calendar className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-800 mb-2">No hay citas programadas</h3>
            <p className="text-blue-700 mb-4">Crea tu primera cita haciendo clic en "Nueva cita"</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#1a6b32] text-white rounded-lg hover:bg-[#155529] transition"
            >
              Crear Primera Cita
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 capitalize">{monthName}</h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1 text-gray-500" />
                    <span>Citas ordenadas por hora (más temprana primero)</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Mes anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Mes siguiente"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <button
                    onClick={generarAgendaPDF}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700"
                    title="Imprimir agenda del mes"
                  >
                    <Printer size={16} />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2 text-sm">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-2 rounded-lg border border-transparent" />
              ))}
              {renderCalendarDays()}
            </div>
          </div>

          <div className="space-y-6">
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
                      className="w-4 h-4 text-[#1a6b32] focus:ring-[#1a6b32]"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {estado === "todas" ? "Todas las citas" : estado}
                    </span>
                    {estado !== "todas" && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {citas.filter(c => c.estado === estado).length}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Citas de Hoy</h3>
                <span className="text-sm text-gray-500">{formatDate(new Date())}</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {citasDelDia(formatDate(new Date())).length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">No hay citas programadas para hoy</p>
                  </div>
                ) : (
                  citasDelDia(formatDate(new Date())).map((cita) => {
                    const paciente = getpacienteById(cita.id_paciente) || {
                      nombres: cita.paciente_nombre || '',
                      apellidos: cita.paciente_apellido || ''
                    }

                    const tipoColor = {
                      consulta: "bg-blue-500",
                      control: "bg-green-500",
                      valoracion: "bg-purple-500",
                      programacion_quirurgica: "bg-red-500",
                      visitador_medico: "bg-amber-500",
                      valoracion_virtual: "bg-cyan-500",
                      control_virtual: "bg-emerald-500",
                      control_postquirurgico: "bg-pink-500"
                    }[cita.tipo_cita] || "bg-gray-500"

                    const estadoColor = {
                      confirmada: "bg-[#1a6b32]",
                      pendiente: "bg-[#669933]",
                      completada: "bg-blue-500",
                      cancelada: "bg-gray-400"
                    }[cita.estado] || "bg-gray-500"

                    return (
                      <div
                        key={cita.id}
                        className={`p-3 rounded-lg flex justify-between items-center text-white ${estadoColor} cursor-pointer hover:opacity-90 transition`}
                        onClick={() => handleEdit(cita)}
                        title={`${cita.hora} - ${paciente.nombres} ${paciente.apellidos} (${cita.estado}, ${tiposDeVisita[cita.tipo_cita]?.label})`}
                      >
                        <div>
                          <p className="font-medium">{paciente.nombres.split(' ')[0]} {paciente.apellidos.split(' ')[0].charAt(0)}.</p>
                          <p className="text-xs">{cita.hora} - {tiposDeVisita[cita.tipo_cita]?.label}</p>
                        </div>
                        <span className={`px-2 py-1 text-[10px] rounded ${tipoColor}`}>
                          {tiposDeVisita[cita.tipo_cita]?.label?.charAt(0)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Estadísticas Rápidas</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">Citas Confirmadas</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {citas.filter(c => c.estado === 'confirmada').length}
                  </p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-sm text-amber-700">Citas Pendientes</p>
                  <p className="text-2xl font-bold text-amber-800">
                    {citas.filter(c => c.estado === 'pendiente').length}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">Citas Completadas</p>
                  <p className="text-2xl font-bold text-green-800">
                    {citas.filter(c => c.estado === 'completada').length}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">Total pacientes</p>
                  <p className="text-2xl font-bold text-gray-800">{pacientes.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <CitaForm
            cita={selectedcita || undefined}
            pacientes={pacientes}
            onSave={handleSaveCita}
            onClose={() => {
              setShowForm(false)
              setEditingId(null)
              setSelectedcita(null)
            }}
            onPlanQuirurgico={(pacienteId) => {
              setShowForm(false)
              setSelectedcita(null)
              setDiaSeleccionado(null)
              router.push(`/dashboard/plan-quirurgico?paciente_id=${pacienteId}`)
            }}
            onDelete={selectedcita ? () => solicitarEliminarCita(selectedcita) : undefined}
          />
        )}

        {selectedcita && !showForm && (
          <CitaModal
            cita={selectedcita}
            paciente={getpacienteById(selectedcita.id_paciente) ||
              crearPacientePorDefecto(
                selectedcita.id_paciente,
                selectedcita.paciente_nombre,
                selectedcita.paciente_apellido
              )
            }
            onClose={() => setSelectedcita(null)}
            onEdit={() => handleEdit(selectedcita)}
            onDelete={() => solicitarEliminarCita(selectedcita)}
            onPlanQuirurgico={(pacienteId) => {
              setSelectedcita(null)
              setDiaSeleccionado(null)
              router.push(`/dashboard/plan-quirurgico?paciente_id=${pacienteId}`)
            }}
          />
        )}

        {diaSeleccionado && (
          <DiaCitasModal
            fecha={diaSeleccionado}
            citas={citasDelDia(diaSeleccionado)}
            pacientes={pacientes}
            onClose={() => setDiaSeleccionado(null)}
            onEdit={handleEdit}
            onNuevaCita={handleNuevaCitaDesdeModal}
            onVerDetalle={(cita) => {
              setDiaSeleccionado(null)
              setSelectedcita(cita)
            }}
          />
        )}

        {conflictoHorario && (
          <ConflictoHorarioModal
            conflicto={conflictoHorario}
            onCancel={handleCancelConflicto}
            onOverride={handleOverrideConflicto}
          />
        )}

        {mostrarConfirmarEliminacion && citaAEliminar && pacienteAEliminar && (
          <ConfirmarEliminacionModal
            cita={citaAEliminar}
            paciente={pacienteAEliminar}
            onClose={cancelarEliminacion}
            onConfirm={confirmarEliminarCita}
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