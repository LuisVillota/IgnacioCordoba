export interface Cita {
  id: string
  id_paciente: string
  id_usuario: string
  tipo_cita: "consulta" | "control" | "valoracion" | "programacion_quirurgica"
  fecha: string
  hora: string
  duracion: number
  estado: "pendiente" | "confirmada" | "cancelada" | "completada"
  observaciones?: string
  paciente_nombre?: string
  paciente_apellido?: string
  doctor_nombre?: string
}

export interface Paciente {
  id: string
  nombres: string
  apellidos: string
  documento: string
  telefono?: string
  email?: string
  tipo_documento?: string      
  fecha_nacimiento?: string   
  genero?: string              
  direccion?: string          
  ciudad?: string             
  estado_paciente?: string     
  fecha_registro?: string     
}

export interface CitaConflict {
  citaExistente: Cita
  nuevaCita: Omit<Cita, "id">
  mensaje: string
}