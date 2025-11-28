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

export async function generarPDFOrdenExamenes(data: OrdenExamenesData) {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // Cargar el logo
    const logoBase64 = await loadImageAsBase64('/images/logo.jpg')

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

    // Título principal en la parte superior izquierda
    addText('CLINICARX', 18, true, margin, 8, '#1a6b32')
    addText('CIRUGÍA PLÁSTICA', 14, false, margin, 8, '#669933')
    addText('Orden de Exámenes Médicos', 12, false, margin, 12, '#000000')
    
    yPosition = margin + 35 // Ajustar posición después del título

    addLine()

    // Información del Paciente
    addText('INFORMACIÓN DEL PACIENTE', 14, true, margin, 10, '#1a6b32')
    yPosition += 2
    
    // Crear cuadro de información del paciente
    const patientInfoY = yPosition
    doc.setFillColor(240, 248, 255) // Fondo azul muy claro
    doc.roundedRect(margin, patientInfoY, pageWidth - 2 * margin, 30, 3, 3, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Nombre: ${data.paciente.nombres} ${data.paciente.apellidos}`, margin + 10, patientInfoY + 10)
    doc.text(`Documento: ${data.paciente.documento}`, margin + 10, patientInfoY + 20)
    doc.text(`Fecha: ${data.fecha}`, pageWidth - margin - 80, patientInfoY + 10)
    doc.text(`Hora: ${data.hora}`, pageWidth - margin - 80, patientInfoY + 20)
    
    yPosition = patientInfoY + 35

    // Exámenes Solicitados
    addText('EXÁMENES SOLICITADOS', 14, true, margin, 10, '#1a6b32')
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
      doc.text('EXAMEN SOLICITADO', margin + 25, yPosition + 5)
      yPosition += 8

      // Filas de la tabla - solo exámenes seleccionados
      examenesSeleccionados.forEach((examen, index) => {
        if (yPosition > pageHeight - margin - 15) {
          doc.addPage()
          yPosition = margin
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
    doc.text('Firma del Paciente', pageWidth - margin - 80, yPosition + 5)
    doc.text('Aceptación y Conformidad', pageWidth - margin - 80, yPosition + 10)
    doc.line(pageWidth - margin - 80, yPosition + 15, pageWidth - margin, yPosition + 15)

    // Información de contacto en el pie de página
    doc.setFontSize(8)
    doc.setTextColor(102, 153, 51) // #669933
    doc.text('ClinicaRX - Especialistas en Cirugía Plástica', pageWidth / 2, pageHeight - 15, { align: 'center' })
    doc.setTextColor(102, 102, 102)
    doc.text(`Documento generado el ${data.fecha} a las ${data.hora}`, pageWidth / 2, pageHeight - 10, { align: 'center' })

    // Guardar PDF
    doc.save(`orden-examenes-${data.paciente.documento}.pdf`)
    
  } catch (error) {
    console.error('Error generando PDF:', error)
    throw new Error('No se pudo generar el PDF')
  }
}