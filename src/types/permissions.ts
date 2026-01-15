export type Permission =
  // Usuarios
  | "ver_usuarios"
  | "crear_usuario"
  | "editar_usuario"

  // pacientes
  | "ver_pacientes"
  | "crear_paciente"
  | "editar_paciente"

  // Agenda / citas
  | "ver_agenda"
  | "crear_cita"
  | "editar_cita"

  // Historia clínica
  | "ver_historia_clinica"
  | "crear_historia_clinica"
  | "editar_historia_clinica"

  // Cotizaciones
  | "ver_cotizaciones"
  | "crear_cotizacion"
  | "editar_cotizacion"

  // Adicionales 
  | "ver_adicional"
  | "crear_adicional"
  | "editar_adicional"
  | "eliminar_adicional"

  // Procedimientos
  | "ver_procedimientos"
  | "editar_procedimientos"

  // Programación
  | "ver_programacion"
  | "crear_programacion"
  | "editar_programacion"

  // Sala de espera
  | "ver_sala_espera"

  // Precios / Auditoría / Reportes
  | "modificar_precios"
  | "ver_auditoria"
  | "ver_reportes"

  // Facturación
  | "generar_factura"
  | "editar_factura"

export const rolePermissions: Record<string, Permission[]> = {
  admin: [
    // Usuarios
    "ver_usuarios",
    "crear_usuario",
    "editar_usuario",

    // Pacientes
    "ver_pacientes",
    "crear_paciente",
    "editar_paciente",

    // Agenda
    "ver_agenda",
    "crear_cita",
    "editar_cita",

    // Historia clínica
    "ver_historia_clinica",
    "crear_historia_clinica",
    "editar_historia_clinica",

    // Cotizaciones
    "ver_cotizaciones",
    "crear_cotizacion",
    "editar_cotizacion",

    // Adicionales
    "ver_adicional",
    "crear_adicional",
    "editar_adicional",
    "eliminar_adicional",

    // Procedimientos
    "ver_procedimientos",
    "editar_procedimientos",

    // Programación
    "ver_programacion",
    "crear_programacion",
    "editar_programacion",

    // Sala de espera (todos tienen acceso)
    "ver_sala_espera",

    // Precios / Auditoría / Reportes
    "modificar_precios",
    "ver_auditoria",
    "ver_reportes",

    // Facturación
    "generar_factura",
    "editar_factura",
  ],

  secretaria: [
    // NOTA: Secretaría NO tiene acceso a usuarios

    // Pacientes
    "ver_pacientes",
    "crear_paciente",
    "editar_paciente",

    // Agenda
    "ver_agenda",
    "crear_cita",
    "editar_cita",

    // Historia clínica (solo ver)
    "ver_historia_clinica",

    // Cotizaciones
    "ver_cotizaciones",
    "crear_cotizacion",

    // Adicionales
    "ver_adicional",
    "crear_adicional",

    // Procedimientos (solo ver)
    "ver_procedimientos",

    // Sala de espera (todos tienen acceso)
    "ver_sala_espera",

    // Facturación
    "generar_factura",
  ],

  doctor: [
    // Pacientes
    "ver_pacientes",
    
    // Agenda
    "ver_agenda",

    // Historia clínica
    "ver_historia_clinica",
    "crear_historia_clinica",
    "editar_historia_clinica",

    // Cotizaciones (solo ver)
    "ver_cotizaciones",
    
    // Procedimientos (solo ver)
    "ver_procedimientos",
    
    // Adicionales (solo ver)
    "ver_adicional",

    // Sala de espera (todos tienen acceso)
    "ver_sala_espera",
    
    // Programación (solo ver)
    "ver_programacion",
  ],

  programacion: [
    // Pacientes (según solicitud)
    "ver_pacientes",

    // Agenda (según solicitud)
    "ver_agenda",

    // Programación (según solicitud)
    "ver_programacion",
    "crear_programacion",
    "editar_programacion",

    // Sala de espera (todos tienen acceso)
    "ver_sala_espera",
    
    // Reportes
    "ver_reportes",
  ],
}

export function hasPermission(rol: string, permission: Permission): boolean {
  const permissions = rolePermissions[rol] || []
  return permissions.includes(permission)
}

export function hasAnyPermission(
  rol: string,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(rol, p))
}

export function hasAllPermissions(
  rol: string,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(rol, p))
}