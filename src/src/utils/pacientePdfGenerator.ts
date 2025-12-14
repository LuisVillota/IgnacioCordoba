import jsPDF from 'jspdf'

interface Paciente {
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
  estado_paciente: string
  fecha_registro: string
}

// Función para cargar imagen como Base64
const loadImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error cargando imagen:', error)
    return ''
  }
}

// Función auxiliar para formatear el género de forma segura
const formatearGenero = (genero?: string): string => {
  if (!genero) return 'No especificado'
  return genero.charAt(0).toUpperCase() + genero.slice(1)
}

// Función auxiliar para valores seguros
const valorSeguro = (valor: any, defaultValue: string = 'No especificado'): string => {
  return valor || defaultValue
}

export async function generarPDFPaciente(paciente: Paciente) {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // Cargar el logo
    const logoBase64 = await loadImageAsBase64('/images/logo.jpg')

    // Función para agregar texto
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false, x: number = margin, lineHeight: number = 7, color: string = '#000000', align: 'left' | 'center' | 'right' = 'left') => {
      if (yPosition > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }
      
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', isBold ? 'bold' : 'normal')
      doc.setTextColor(color)
      doc.text(text, x, yPosition, { align })
      yPosition += lineHeight
    }

    // Logo en la parte superior derecha
    if (logoBase64) {
      try {
        const logoWidth = 60
        const logoHeight = 30
        const logoX = pageWidth - margin - logoWidth
        const logoY = margin
        doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight)
      } catch (error) {
        console.error('Error cargando logo:', error)
      }
    }

    // Título principal
    addText('CLINICARX', 18, true, margin, 8, '#1a6b32')
    addText('CIRUGÍA PLÁSTICA', 14, false, margin, 8, '#669933')
    addText('Ficha del Paciente', 12, false, margin, 12, '#000000')
    
    yPosition = margin + 35

    // Línea separadora
    doc.setDrawColor(153, 214, 232) // #99d6e8
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 15

    // Información Principal del Paciente
    addText('INFORMACIÓN PRINCIPAL', 14, true, margin, 10, '#1a6b32')
    yPosition += 2

    // Cuadro de información principal
    const mainInfoY = yPosition
    doc.setFillColor(240, 248, 255) // Fondo azul muy claro
    doc.roundedRect(margin, mainInfoY, pageWidth - 2 * margin, 45, 3, 3, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Nombre completo: ${valorSeguro(paciente.nombres)} ${valorSeguro(paciente.apellidos)}`, margin + 10, mainInfoY + 10)
    doc.text(`Documento: ${valorSeguro(paciente.tipo_documento)} - ${valorSeguro(paciente.documento)}`, margin + 10, mainInfoY + 20)
    doc.text(`Fecha de Nacimiento: ${valorSeguro(paciente.fecha_nacimiento)}`, margin + 10, mainInfoY + 30)
    doc.text(`Género: ${formatearGenero(paciente.genero)}`, pageWidth - margin - 80, mainInfoY + 10)
    doc.text(`Estado: ${paciente.estado_paciente === "activo" ? "Activo" : "Inactivo"}`, pageWidth - margin - 80, mainInfoY + 20)
    
    yPosition = mainInfoY + 50

    // Información de Contacto
    addText('INFORMACIÓN DE CONTACTO', 14, true, margin, 10, '#1a6b32')
    yPosition += 2

    // Cuadro de contacto
    const contactInfoY = yPosition
    doc.setFillColor(255, 253, 231) // Fondo amarillo muy claro
    doc.roundedRect(margin, contactInfoY, pageWidth - 2 * margin, 35, 3, 3, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Teléfono: ${valorSeguro(paciente.telefono)}`, margin + 10, contactInfoY + 10)
    doc.text(`Email: ${valorSeguro(paciente.email)}`, margin + 10, contactInfoY + 20)
    
    yPosition = contactInfoY + 40

    // Dirección
    addText('DIRECCIÓN', 14, true, margin, 10, '#1a6b32')
    yPosition += 2

    // Cuadro de dirección
    const addressY = yPosition
    doc.setFillColor(245, 245, 245) // Fondo gris claro
    doc.roundedRect(margin, addressY, pageWidth - 2 * margin, 25, 3, 3, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Dirección: ${valorSeguro(paciente.direccion)}`, margin + 10, addressY + 10)
    doc.text(`Ciudad: ${valorSeguro(paciente.ciudad)}`, margin + 10, addressY + 20)
    
    yPosition = addressY + 30

    // Información de Registro
    addText('INFORMACIÓN DE REGISTRO', 14, true, margin, 10, '#1a6b32')
    yPosition += 2

    // Cuadro de registro
    const registerY = yPosition
    doc.setFillColor(230, 255, 230) // Fondo verde muy claro
    doc.roundedRect(margin, registerY, pageWidth - 2 * margin, 20, 3, 3, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Fecha de Registro: ${valorSeguro(paciente.fecha_registro)}`, margin + 10, registerY + 10)
    
    yPosition = registerY + 25

    // Notas adicionales
    addText('NOTAS ADICIONALES', 14, true, margin, 10, '#1a6b32')
    yPosition += 2

    // Cuadro de notas
    const notesY = yPosition
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(153, 214, 232) // #99d6e8
    doc.roundedRect(margin, notesY, pageWidth - 2 * margin, 30, 3, 3, 'S') // Solo borde
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text('• Este documento contiene información confidencial del paciente', margin + 10, notesY + 10)
    doc.text('• La información debe ser manejada con estricta confidencialidad', margin + 10, notesY + 18)
    doc.text('• Última actualización: ' + new Date().toLocaleDateString('es-CO'), margin + 10, notesY + 26)
    
    yPosition = notesY + 35

    // Pie de página - OPCIÓN 4 (Colores suaves y profesionales)
    doc.setFontSize(8)

    // Verde suave para la marca
    doc.setTextColor(119, 158, 77) // Verde más suave y profesional
    doc.text('ClinicaRX - Especialistas en Cirugía Plástica', pageWidth / 2, pageHeight - 15, { align: 'center' })

    // Gris claro para la información de generación
    doc.setTextColor(140, 140, 140) // Gris más claro y discreto
    doc.text(`Documento generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, pageHeight - 10, { align: 'center' })

    // Guardar PDF
    doc.save(`ficha-paciente-${paciente.documento}.pdf`)
    
  } catch (error) {
    console.error('Error generando PDF:', error)
    throw new Error('No se pudo generar el PDF')
  }
}