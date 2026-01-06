export interface paciente {
  id: string
  nombres: string
  apellidos: string
  tipo_documento: string
  documento: string
  fecha_nacimiento: string
  genero?: string
  telefono: string
  email: string
  direccion: string
  ciudad: string
  estado_paciente: "activo" | "inactivo"
  fecha_registro: string
}
