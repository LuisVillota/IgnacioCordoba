export interface HistoriaClinica {
  id: string;
  id_paciente: string;
  motivo_consulta: string;
  antecedentes_medicos?: string;
  antecedentes_quirurgicos?: string;
  antecedentes_alergicos?: string;
  antecedentes_farmacologicos?: string;
  exploracion_fisica?: string;
  diagnostico: string;
  tratamiento?: string;
  recomendaciones?: string;
  medico_id: string;
  fotos?: string;
  fecha_creacion: string;
  fecha_actualizacion?: string;
}