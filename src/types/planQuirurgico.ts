export interface DatosBasicosPaciente {
  id: string
  identificacion: string
  edad: number
  nombre_completo: string
  peso: number
  altura: number
  imc?: number
  categoriaIMC?: string
  fecha_consulta: string
  hora_consulta: string
}

export interface HistoriaClinica {
  // Datos generales
  nombre_completo: string
  identificacion: string
  ocupacion: string
  fecha_nacimiento: string
  edad_calculada: number
  referido_por: string
  entidad: string
  telefono: string
  celular: string
  direccion: string
  email: string

  // Motivo de consulta
  motivo_consulta: string
  motivo_consulta_detalle: string

  // Enfermedad actual (checkboxes)
  enfermedad_actual: {
    hepatitis: boolean
    discrasia_sanguinea: boolean
    cardiopatias: boolean
    hipertension: boolean
    reumatologicas: boolean
    diabetes: boolean
    neurologicas: boolean
    enfermedad_mental: boolean
    no_refiere: boolean
  }

  // Antecedentes
  antecedentes: {
    farmacologicos: string
    traumaticos: string
    quirurgicos: string
    alergicos: string
    toxicos: string
    habitos: string
    ginecologicos: string
    fuma: "si" | "no"
    planificacion: string
  }

  // Condición de piel
  enfermedades_piel: boolean
  tratamientos_esteticos: string
  antecedentes_familiares: string

  // Examen físico
  peso: number
  altura: number
  imc: number
  contextura: string

  // Notas por área corporal
  notas_corporales: {
    cabeza: string
    mamas: string
    tcs: string
    abdomen: string
    gluteos: string
    extremidades: string
    pies_faneras: string
  }

  // Diagnóstico y conducta
  diagnostico: string
  plan_conducta: string
}

export interface CirugiasPrevia {
  id: string
  fecha: string
  procedimiento: string
  descripcion: string
  detalles: string
  imagenes?: string[]
}

export interface ConductaQuirurgica {
  duracion_estimada: number
  tipo_anestesia: "general" | "peridural" | "sedacion" | "local" | "ninguna"
  requiere_hospitalizacion: boolean
  tiempo_hospitalizacion: string
  reseccion_estimada: string
  firma_cirujano: string // base64 o dataURL
  firma_paciente: string // base64 o dataURL
}

export interface DibujoEsquema {
  id: string
  herramienta: "liposuccion" | "lipotransferencia" | "amarre_musculos" | "incision"
  puntos: Array<{ x: number; y: number }>
  timestamp: number
}

export interface PlanQuirurgico {
  id: string
  id_paciente: string
  id_usuario: string
  fecha_creacion: string
  fecha_modificacion: string

  datos_paciente: DatosBasicosPaciente
  historia_clinica: HistoriaClinica
  cirugias_previas: CirugiasPrevia[]
  conducta_quirurgica: ConductaQuirurgica
  dibujos_esquema: DibujoEsquema[]
  notas_doctor: string
  imagenes_adjuntas?: string[]

  estado: "borrador" | "completado" | "aprobado"
}
