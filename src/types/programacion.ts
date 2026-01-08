// src/types/programacion.ts
export interface Programacion {
  id: string;
  paciente_id: string;
  numero_documento: string;
  fecha: string;
  hora: string;
  duracion: number;
  procedimiento_id: string;
  anestesiologo: string;
  estado: "Programado" | "Aplazado" | "Confirmado" | "En Quirofano" | "Operado" | "Cancelado";
  observaciones: string;
  fecha_creacion: string;
  
  // Campos adicionales que vienen de joins/relaciones
  paciente_nombre?: string;
  paciente_apellido?: string;
  procedimiento_nombre?: string;
  procedimiento_precio?: number;
  usuario_id?: string;
  usuario_nombre?: string;
  updated_at?: string;
  fecha_modificacion?: string;
  
  // Alias para compatibilidad (como en Cotizacion)
  id_paciente?: string;
  paciente_documento?: string;
}

// Tipo para el formulario (similar a CotizacionFormData)
export type ProgramacionFormData = Omit<Programacion, 'id' | 'fecha_creacion' | 'updated_at'> & {
  _isEditing?: boolean;
  _programacionId?: string;
  _backendData?: any;
};

// Tipo para crear/actualizar (sin los campos opcionales)
export type CreateProgramacionData = {
  paciente_id: string;
  fecha: string;
  hora: string;
  duracion: number;
  procedimiento_id: string;
  anestesiologo: string;
  estado: Programacion["estado"];
  observaciones: string;
  numero_documento?: string; // Opcional porque puede venir del paciente
};

// Tipo para búsqueda/filtros
export type ProgramacionFilters = {
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: Programacion["estado"];
  procedimiento_id?: string;
  anestesiologo?: string;
  paciente_nombre?: string;
  paciente_documento?: string;
};