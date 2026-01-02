// En types/planQuirurgico.ts
export interface PlanQuirurgico {
  id: string
  id_paciente: string
  id_usuario: string
  fecha_creacion: string
  fecha_modificacion: string
  datos_paciente: {
    id: string
    identificacion: string
    edad: number
    nombre_completo: string
    peso: number | string
    altura: number | string
    imc: number
    categoriaIMC: string
    fecha_consulta: string
    hora_consulta: string
  }
  historia_clinica: any // Ajusta según tu estructura
  conducta_quirurgica: any // Ajusta según tu estructura
  dibujos_esquema: any[]
  notas_doctor: string
  cirugias_previas: any[]
  imagenes_adjuntas: string[]
  estado: 'borrador' | 'aprobado' | 'completado'
  esquema_mejorado?: {
    zoneMarkings: Record<string, any>
    selectionHistory: any[]
    currentStrokeWidth: number
    currentTextSize: number
    selectedProcedure: string
  }
}