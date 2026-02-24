export interface Cita {
  id: string;
  id_paciente: string;
  id_usuario: string;
  tipo_cita: "consulta" | "control" | "valoracion" | "programacion_quirurgica" | "visitador_medico" | "valoracion_virtual" | "control_virtual" | "control_postquirurgico";
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM:SS
  duracion: number;
  estado: "pendiente" | "confirmada" | "completada" | "cancelada";
  observaciones?: string;
}
