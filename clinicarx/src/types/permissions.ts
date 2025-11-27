export type Permission =
  | "ver_usuarios"
  | "crear_usuario"
  | "editar_usuario"
  | "ver_pacientes"
  | "crear_paciente"
  | "editar_paciente"
  | "ver_agenda"
  | "crear_cita"
  | "editar_cita"
  | "ver_historia_clinica"
  | "crear_historia_clinica"
  | "editar_historia_clinica"
  | "ver_cotizaciones"
  | "crear_cotizacion"
  | "editar_cotizacion"
  | "modificar_precios"
  | "ver_procedimientos"
  | "editar_procedimientos"
  | "ver_sala_espera"
  | "ver_programacion"
  | "crear_programacion"
  | "editar_programacion"
  | "ver_auditoria"
  | "ver_reportes"
  | "generar_factura"
  | "editar_factura"

export const rolePermissions: Record<string, Permission[]> = {
  admin: [
    "ver_usuarios",
    "crear_usuario",
    "editar_usuario",
    "ver_pacientes",
    "crear_paciente",
    "editar_paciente",
    "ver_agenda",
    "crear_cita",
    "editar_cita",
    "ver_historia_clinica",
    "crear_historia_clinica",
    "editar_historia_clinica",
    "ver_cotizaciones",
    "crear_cotizacion",
    "editar_cotizacion",
    "modificar_precios",
    "ver_procedimientos",
    "editar_procedimientos",
    "ver_sala_espera",
    "ver_programacion",
    "crear_programacion",
    "editar_programacion",
    "ver_auditoria",
    "ver_reportes",
    "generar_factura",
    "editar_factura",
  ],
  secretaria: [
    "ver_pacientes",
    "crear_paciente",
    "editar_paciente",
    "ver_agenda",
    "crear_cita",
    "editar_cita",
    "ver_historia_clinica",
    "ver_cotizaciones",
    "crear_cotizacion",
    "ver_sala_espera",
    "ver_procedimientos",
    "generar_factura",
  ],
  doctor: [
    "ver_pacientes",
    "ver_agenda",
    "ver_historia_clinica",
    "crear_historia_clinica",
    "editar_historia_clinica",
    "ver_cotizaciones",
    "ver_procedimientos",
    "ver_sala_espera",
    "ver_programacion",
  ],
  programacion: ["ver_pacientes", "ver_programacion", "crear_programacion", "editar_programacion", "ver_reportes"],
}

export function hasPermission(rol: string, permission: Permission): boolean {
  const permissions = rolePermissions[rol] || []
  return permissions.includes(permission)
}

export function hasAnyPermission(rol: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(rol, p))
}

export function hasAllPermissions(rol: string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(rol, p))
}
