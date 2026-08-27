// El backend devuelve fechas/horas como "YYYY-MM-DDTHH:MM:SS" (o "YYYY-MM-DD HH:MM:SS"),
// sin zona horaria. new Date() interpreta ese formato como hora local (no UTC), así que
// no hace falta ningún ajuste de zona horaria aquí, solo formatear la salida.
export const formatFechaHora = (value: string | Date | null | undefined): string => {
  if (!value) return ''

  const fecha = value instanceof Date ? value : new Date(value.replace(' ', 'T'))
  if (isNaN(fecha.getTime())) return typeof value === 'string' ? value : ''

  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = fecha.getFullYear()
  const horas = String(fecha.getHours()).padStart(2, '0')
  const minutos = String(fecha.getMinutes()).padStart(2, '0')

  return `${dia}/${mes}/${anio} ${horas}:${minutos}`
}
