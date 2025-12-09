"use client";

import type React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import type { Cita } from "../pages/AgendaPage";
import DatePickerColombia from "../components/DatePickerColombia";

interface Paciente {
  id: string;
  nombres: string;
  apellidos: string;
  documento: string;
}

interface CitaFormProps {
  cita?: Cita;
  pacientes?: Paciente[];
  onSave: (data: Omit<Cita, "id">) => void;
  onClose: () => void;
}

const tiposDeVisita = {
  consulta: { label: "Consulta", duracion: 60 },
  control: { label: "Control", duracion: 30 },
  valoracion: { label: "Valoración", duracion: 45 },
  programacion_quirurgica: { label: "Programación Quirúrgica", duracion: 60 },
};

// Función para formatear fecha a YYYY-MM-DD
const formatDateForDB = (date: string): string => {
  if (!date) return '';
  
  // Si ya está en formato YYYY-MM-DD, retornar
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

// Función para formatear hora a HH:MM
const formatTimeForInput = (time: string): string => {
  if (!time) return '09:00';
  
  // Si ya está en formato HH:MM, retornar
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  
  // Si viene con segundos, extraer solo HH:MM
  const match = time.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : '09:00';
};

export function CitaForm({ cita, pacientes = [], onSave, onClose }: CitaFormProps) {
  // Preparar datos iniciales
  const [formData, setFormData] = useState({
    id_paciente: cita?.id_paciente || "",
    id_usuario: cita?.id_usuario || "1",
    tipo_cita: cita?.tipo_cita || ("consulta" as const),
    fecha: formatDateForDB(cita?.fecha || ""),
    hora: formatTimeForInput(cita?.hora || "09:00"),
    duracion: cita?.duracion || 60,
    estado: cita?.estado || ("pendiente" as const),
    observaciones: cita?.observaciones || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.id_paciente) newErrors.id_paciente = "Selecciona un paciente";
    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.hora) newErrors.hora = "La hora es requerida";
    
    // Validar formato de fecha
    if (formData.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(formData.fecha)) {
      newErrors.fecha = "Formato de fecha inválido. Use YYYY-MM-DD";
    }
    
    // Validar formato de hora
    if (formData.hora && !/^\d{2}:\d{2}$/.test(formData.hora)) {
      newErrors.hora = "Formato de hora inválido. Use HH:MM";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("📤 CitaForm - Enviando datos:", formData);
      
      // Preparar datos para enviar
      const dataToSend = {
        ...formData,
        fecha: formatDateForDB(formData.fecha),
        hora: formData.hora + ":00", // Agregar segundos para el backend
        duracion: Number(formData.duracion),
      };
      
      onSave(dataToSend);
    }
  };

  const handleTipoChange = (tipo: string) => {
    const duracion = tiposDeVisita[tipo as keyof typeof tiposDeVisita]?.duracion || 60;
    setFormData({
      ...formData,
      tipo_cita: tipo as any,
      duracion,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{cita ? "Editar Cita" : "Nueva Cita"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paciente {pacientes.length === 0 && <span className="text-red-500">*</span>}
            </label>
            {pacientes.length === 0 ? (
              <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
                No hay pacientes disponibles. Por favor, crea pacientes primero.
              </div>
            ) : (
              <>
                <select
                  value={formData.id_paciente}
                  onChange={(e) => setFormData({ ...formData, id_paciente: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.id_paciente ? "border-red-500" : "border-gray-300"
                  } focus:ring-2 focus:ring-[#99d6e8]`}
                >
                  <option value="">-- Selecciona un paciente --</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombres} {p.apellidos} ({p.documento})
                    </option>
                  ))}
                </select>
                {errors.id_paciente && <p className="text-xs text-red-600">{errors.id_paciente}</p>}
              </>
            )}
          </div>

          {/* Tipo de Visita */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Visita</label>
            <select
              value={formData.tipo_cita}
              onChange={(e) => handleTipoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#99d6e8]"
            >
              {Object.entries(tiposDeVisita).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label} ({value.duracion} min)
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha <span className="text-gray-500 text-xs">(YYYY-MM-DD)</span>
            </label>
            <DatePickerColombia
              value={formData.fecha}
              onChange={(v) => setFormData({ ...formData, fecha: formatDateForDB(v) })}
              error={!!errors.fecha}
            />
            {errors.fecha && <p className="text-xs text-red-600 mt-1">{errors.fecha}</p>}
          </div>

          {/* Hora + Duración */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora <span className="text-gray-500 text-xs">(HH:MM)</span>
              </label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.hora ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-[#99d6e8]`}
              />
              {errors.hora && <p className="text-xs text-red-600">{errors.hora}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
              <input
                type="number"
                min={15}
                step={15}
                value={formData.duracion}
                onChange={(e) => setFormData({ ...formData, duracion: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#99d6e8]"
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#99d6e8]"
            >
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              rows={3}
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#99d6e8]"
              placeholder="Notas adicionales sobre la cita..."
            />
          </div>

          {/* Botones */}
          <div className="flex items-center space-x-3 pt-4">
            <button
              type="submit"
              disabled={pacientes.length === 0}
              className={`flex-1 py-2 rounded-lg ${
                pacientes.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#1a6b32] text-white hover:bg-[#155529]"
              }`}
            >
              {cita ? "Actualizar" : "Agendar"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>

          {pacientes.length === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded mt-2">
              <p className="font-medium">⚠️ Atención:</p>
              <p>No puedes crear citas sin pacientes. Primero crea pacientes en la sección de Pacientes.</p>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}