import jsPDF from 'jspdf'

interface Examen {
  id: string
  nombre: string
  seleccionado: boolean
}

interface OrdenExamenesData {
  paciente: any
  fecha: string
  hora: string
  examenes: Examen[]
  observaciones: string
}

// Función para cargar imagen como Base64 (necesaria para el logo)
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

// Función para formatear fecha y hora
const obtenerFechaHoraActual = () => {
  const now = new Date()
  const fecha = now.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const hora = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  })
  return { fecha, hora }
}

export async function generarPDFOrdenExamenes(data: OrdenExamenesData) {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // Cargar el logo
    const logoBase64 = await loadImageAsBase64('/images/logo.jpg')

    // Obtener fecha y hora de generación
    const { fecha: fechaGeneracion, hora: horaGeneracion } = obtenerFechaHoraActual()

    // Función para agregar texto con manejo de páginas
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

    // Función para agregar línea separadora
    const addLine = (color: string = '#99d6e8') => {
      if (yPosition > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }
      doc.setDrawColor(153, 214, 232) // #99d6e8
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 10
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

    // Fecha de generación en la parte superior izquierda
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100) // Color gris
    doc.text(`Generado: ${fechaGeneracion} - ${horaGeneracion}`, margin, 15)
    
    yPosition = 25 // Ajustar posición después de la fecha

    // Título principal
    addText('CIRUGÍA PLÁSTICA', 14, false, margin, 8, '#669933')
    addText('Orden de Exámenes Médicos', 12, false, margin, 12, '#000000')
    
    yPosition += 5 // Espacio adicional

    addLine()

    // Información del paciente
    addText('INFORMACIÓN DEL paciente', 14, true, margin, 10, '#1a6b32')
    yPosition += 2
    
    // Crear cuadro de información del paciente
    const patientInfoY = yPosition
    doc.setFillColor(240, 248, 255) // Fondo azul muy claro
    doc.roundedRect(margin, patientInfoY, pageWidth - 2 * margin, 40, 3, 3, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    
    // Datos del paciente
    const datospaciente = [
      `Nombre: ${data.paciente.nombres} ${data.paciente.apellidos}`,
      `Documento: ${data.paciente.documento}`,
      `Fecha de orden: ${data.fecha}`,
      `Hora de orden: ${data.hora}`
    ]
    
    // Añadir datos del paciente al cuadro
    datospaciente.forEach((linea, index) => {
      doc.text(linea, margin + 10, patientInfoY + 12 + (index * 8))
    })
    
    yPosition = patientInfoY + 45

    // Exámenes Solicitados
    addText('EXÁMENES SOLIcitaDOS', 14, true, margin, 10, '#1a6b32')
    yPosition += 5

    // Tabla de exámenes - solo los seleccionados
    const examenesSeleccionados = data.examenes.filter(examen => examen.seleccionado)
    
    if (examenesSeleccionados.length === 0) {
      addText('No se han seleccionado exámenes', 12, false, margin, 8, '#666666')
    } else {
      // Encabezado de tabla
      doc.setFillColor(153, 214, 232) // #99d6e8
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 8, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text('N°', margin + 8, yPosition + 5)
      doc.text('EXAMEN SOLIcitaDO', margin + 25, yPosition + 5)
      yPosition += 8

      // Filas de la tabla - solo exámenes seleccionados
      examenesSeleccionados.forEach((examen, index) => {
        if (yPosition > pageHeight - margin - 15) {
          doc.addPage()
          yPosition = margin
          // Volver a agregar encabezado en nueva página
          doc.setFillColor(153, 214, 232)
          doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 8, 2, 2, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(10)
          doc.text('N°', margin + 8, yPosition + 5)
          doc.text('EXAMEN SOLIcitaDO', margin + 25, yPosition + 5)
          yPosition += 8
        }

        // Fondo alternado para filas
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250)
        } else {
          doc.setFillColor(255, 255, 255)
        }
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 8, 1, 1, 'F')

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.text((index + 1).toString(), margin + 8, yPosition + 5)
        doc.text(examen.nombre, margin + 25, yPosition + 5)
        yPosition += 8
      })
    }

    yPosition += 10

    // Observaciones/Notas
    if (data.observaciones) {
      addText('OBSERVACIONES Y NOTAS', 14, true, margin, 10, '#1a6b32')
      yPosition += 2
      
      // Cuadro de observaciones
      const observacionesY = yPosition
      doc.setFillColor(255, 253, 231) // Fondo amarillo muy claro
      doc.roundedRect(margin, observacionesY, pageWidth - 2 * margin, 40, 3, 3, 'F')
      
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      
      // Dividir observaciones en líneas si son muy largas
      const observacionesLines = doc.splitTextToSize(data.observaciones, pageWidth - 2 * margin - 10)
      observacionesLines.forEach((line: string, index: number) => {
        doc.text(line, margin + 5, observacionesY + 10 + (index * 6))
      })
      
      yPosition = observacionesY + 45
    }

    // Espacio para firmas
    yPosition = Math.max(yPosition, pageHeight - 80)
    addLine()

    // Firma del médico
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text('Firma del Médico', margin, yPosition + 5)
    doc.text('Nombre y Registro Profesional', margin, yPosition + 10)
    doc.setDrawColor(102, 102, 102)
    doc.line(margin, yPosition + 15, margin + 80, yPosition + 15)

    // Firma del paciente
    doc.text('Firma del paciente', pageWidth - margin - 80, yPosition + 5)
    doc.text('Aceptación y Conformidad', pageWidth - margin - 80, yPosition + 10)
    doc.line(pageWidth - margin - 80, yPosition + 15, pageWidth - margin, yPosition + 15)

    // Pie de página con información adicional
    yPosition = pageHeight - 15
    doc.setFontSize(8)
    doc.setTextColor(102, 102, 102)
    
    // Información de la clínica a la izquierda
    doc.text('Clínica de Cirugía Plástica - Dr. Ignacio Córdoba', margin, yPosition)
    
    // Información de generación del documento a la derecha
    doc.text(`Generado el: ${fechaGeneracion} - ${horaGeneracion}`, pageWidth - margin, yPosition, { align: 'right' })

    // Guardar PDF con nombre descriptivo
    const nombreArchivo = `orden-examenes-${data.paciente.documento}-${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(nombreArchivo)
    
    return {
      success: true,
      nombreArchivo,
      fechaGeneracion,
      horaGeneracion
    }
    
  } catch (error) {
    console.error('Error generando PDF:', error)
    throw new Error('No se pudo generar el PDF')
  }
}

// Función auxiliar para mostrar vista previa del PDF (opcional)
export async function generarVistaPreviaPDF(data: OrdenExamenesData): Promise<string> {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = margin

    // Obtener fecha y hora de generación
    const { fecha: fechaGeneracion, hora: horaGeneracion } = obtenerFechaHoraActual()

    // Fecha de generación en la parte superior
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Generado: ${fechaGeneracion} - ${horaGeneracion}`, margin, 15)
    
    yPosition = 25

    // Título
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 107, 50) // #1a6b32
    doc.text('Vista Previa - Orden de Exámenes', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    // Información básica
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`paciente: ${data.paciente.nombres} ${data.paciente.apellidos}`, margin, yPosition)
    yPosition += 7
    doc.text(`Documento: ${data.paciente.documento}`, margin, yPosition)
    yPosition += 7
    doc.text(`Fecha orden: ${data.fecha} - Hora: ${data.hora}`, margin, yPosition)

    // Convertir a Data URL para vista previa
    return doc.output('datauristring')
  } catch (error) {
    console.error('Error generando vista previa:', error)
    return ''
  }
}