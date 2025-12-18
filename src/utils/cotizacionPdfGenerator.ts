import jsPDF from 'jspdf'

interface Paciente {
  id: string
  nombres: string
  apellidos: string
  tipo_documento: string
  documento: string
  telefono: string
  email: string
}

interface CotizacionItem {
  id: string
  nombre: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  tipo?: string
}

interface ServicioIncluido {
  id: string
  nombre: string
  requiere: boolean
}

interface CotizacionData {
  cotizacion: {
    id: string
    fecha_creacion: string
    fecha_vencimiento: string
    estado: string
    observaciones: string
    validez_dias: number
    subtotalProcedimientos: number
    subtotalAdicionales: number
    subtotalOtrosAdicionales: number
    total: number
  }
  paciente: Paciente
  items: CotizacionItem[]
  serviciosIncluidos: ServicioIncluido[]
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

// Función para agregar encabezado a cada página
const agregarEncabezado = (doc: jsPDF, data: CotizacionData, pageWidth: number, margin: number, logoBase64: string) => {
  const headerY = 15
  
  // Logo e información de la clínica en la parte superior DERECHA
  if (logoBase64) {
    try {
      const logoWidth = 60
      const logoHeight = 30
      const logoX = pageWidth - margin - logoWidth
      doc.addImage(logoBase64, 'JPEG', logoX, headerY, logoWidth, logoHeight)
      
      // Información de la clínica a la izquierda del logo
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 107, 50) // #1a6b32
      doc.text('Dr. Hernán Ignacio Córdoba', logoX - 35, headerY + 8)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(102, 153, 51) // #669933
      doc.text('CIRUGÍA PLÁSTICA', logoX - 35, headerY + 13)
    } catch (error) {
      console.error('Error cargando logo en encabezado:', error)
    }
  } else {
    // Si no hay logo, mostrar solo el texto a la derecha
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 107, 50) // #1a6b32
    doc.text('Dr. Hernán Ignacio Córdoba', pageWidth - margin - 80, headerY + 8, { align: 'right' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(102, 153, 51) // #669933
    doc.text('CIRUGÍA PLÁSTICA', pageWidth - margin - 80, headerY + 13, { align: 'right' })
  }

  // Información de la cotización en la parte superior IZQUIERDA
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(`COTIZACIÓN CZ-${data.cotizacion.id}`, margin, headerY + 8)
  
  // Fechas en el encabezado izquierdo
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.text(`Creado: ${data.cotizacion.fecha_creacion}`, margin, headerY + 15)
  doc.text(`Válido hasta: ${data.cotizacion.fecha_vencimiento}`, margin, headerY + 20)

  // Línea separadora del encabezado
  doc.setDrawColor(153, 214, 232) // #99d6e8
  doc.line(margin, headerY + 25, pageWidth - margin, headerY + 25)
}

// Función para agregar pie de página
const agregarPiePagina = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  const currentPage = doc.getCurrentPageInfo().pageNumber
  const totalPages = doc.getNumberOfPages()
  
  doc.setFontSize(8)
  doc.setTextColor(119, 158, 77) // Verde suave
  doc.text('Dr. Hernán Ignacio Córdoba - Especialistas en Cirugía Plástica', pageWidth / 2, pageHeight - 15, { align: 'center' })
  doc.setTextColor(140, 140, 140) // Gris claro
  doc.text(`Página ${currentPage} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
}

export async function generarPDFCotizacion(data: CotizacionData) {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = 50 // Comenzar más abajo para dejar espacio al encabezado

    // Cargar el logo
    const logoBase64 = await loadImageAsBase64('/images/logo.jpg')

    // Función para agregar texto con manejo de páginas y encabezado
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false, x: number = margin, lineHeight: number = 7, color: string = '#000000', align: 'left' | 'center' | 'right' = 'left') => {
      if (yPosition > pageHeight - margin - 10) {
        doc.addPage()
        agregarEncabezado(doc, data, pageWidth, margin, logoBase64)
        yPosition = 50 // Resetear posición después del encabezado
      }
      
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', isBold ? 'bold' : 'normal')
      doc.setTextColor(color)
      doc.text(text, x, yPosition, { align })
      yPosition += lineHeight
    }

    // Agregar encabezado a la primera página
    agregarEncabezado(doc, data, pageWidth, margin, logoBase64)

    // Información del Paciente
    addText('INFORMACIÓN DEL PACIENTE', 14, true, margin, 10, '#1a6b32')
    yPosition += 2

    // Cuadro de información del paciente
    const patientInfoY = yPosition
    doc.setFillColor(240, 248, 255) // Fondo azul muy claro
    doc.roundedRect(margin, patientInfoY, pageWidth - 2 * margin, 30, 3, 3, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Nombre: ${data.paciente.nombres} ${data.paciente.apellidos}`, margin + 10, patientInfoY + 10)
    doc.text(`Documento: ${data.paciente.tipo_documento} - ${data.paciente.documento}`, margin + 10, patientInfoY + 20)
    doc.text(`Teléfono: ${data.paciente.telefono}`, pageWidth - margin - 100, patientInfoY + 10)
    doc.text(`Email: ${data.paciente.email}`, pageWidth - margin - 100, patientInfoY + 20)
    
    yPosition = patientInfoY + 35

    // Servicios Incluidos
    addText('SERVICIOS INCLUIDOS', 14, true, margin, 10, '#1a6b32')
    yPosition += 2

    // Lista de servicios incluidos
    data.serviciosIncluidos.forEach((servicio, index) => {
      if (servicio.requiere) {
        if (yPosition > pageHeight - margin - 10) {
          doc.addPage()
          agregarEncabezado(doc, data, pageWidth, margin, logoBase64)
          yPosition = 50
        }
        doc.setFontSize(9)
        doc.text(`✓ ${servicio.nombre}`, margin + 5, yPosition)
        yPosition += 5
      }
    })

    yPosition += 5

    // Procedimientos
    const procedimientos = data.items.filter(item => 
      ['ABDOMINOPLASTIA', 'CORRECCION', 'GLUTEOPLASTIA', 'LIPOESCULTURA'].some(term => 
        item.nombre.toUpperCase().includes(term)
      )
    )

    if (procedimientos.length > 0) {
      addText('PROCEDIMIENTOS', 12, true, margin, 10, '#1a6b32')
      yPosition += 2

      // Tabla de procedimientos
      procedimientos.forEach((item, index) => {
        if (yPosition > pageHeight - margin - 20) {
          doc.addPage()
          agregarEncabezado(doc, data, pageWidth, margin, logoBase64)
          yPosition = 50
        }

        doc.setFontSize(9)
        doc.text(item.nombre, margin + 5, yPosition)
        doc.text(`$${item.precio_unitario.toLocaleString('es-CO')}`, pageWidth - margin - 50, yPosition, { align: 'right' })
        yPosition += 4
      })

      yPosition += 5
    }

    // Adicionales
    const adicionales = data.items.filter(item => 
      !['ABDOMINOPLASTIA', 'CORRECCION', 'GLUTEOPLASTIA', 'LIPOESCULTURA'].some(term => 
        item.nombre.toUpperCase().includes(term)
      ) && item.precio_unitario > 0
    )

    if (adicionales.length > 0) {
      addText('ADICIONALES', 12, true, margin, 10, '#1a6b32')
      yPosition += 2

      // Tabla de adicionales
      adicionales.forEach((item, index) => {
        if (yPosition > pageHeight - margin - 20) {
          doc.addPage()
          agregarEncabezado(doc, data, pageWidth, margin, logoBase64)
          yPosition = 50
        }

        doc.setFontSize(9)
        doc.text(item.nombre, margin + 5, yPosition)
        doc.text(`$${item.precio_unitario.toLocaleString('es-CO')}`, pageWidth - margin - 50, yPosition, { align: 'right' })
        yPosition += 4
      })

      yPosition += 5
    }

    // FORZAR NUEVA PÁGINA PARA EL RESUMEN DE VALORES
    if (yPosition > pageHeight - 150) {
      doc.addPage()
      agregarEncabezado(doc, data, pageWidth, margin, logoBase64)
      yPosition = 50
    } else {
      // Si hay espacio suficiente, agregar línea separadora
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 15
    }

    // ========== SEGUNDA PÁGINA - RESUMEN DE VALORES ==========
    
    // RESUMEN DE VALORES - SECCIÓN PRINCIPAL EN SEGUNDA PÁGINA
    addText('RESUMEN DE VALORES', 16, true, margin, 12, '#1a6b32')
    yPosition += 5

    // Cuadro de totales mejorado
    const totalsY = yPosition
    doc.setFillColor(245, 248, 246) // Fondo verde muy suave
    doc.roundedRect(margin, totalsY, pageWidth - 2 * margin, 80, 5, 5, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    
    // Subtotal Procedimientos
    doc.text('Subtotal Procedimientos:', margin + 15, totalsY + 15)
    doc.text(`$${data.cotizacion.subtotalProcedimientos.toLocaleString('es-CO')}`, pageWidth - margin - 15, totalsY + 15, { align: 'right' })
    
    // Subtotal Adicionales
    doc.text('Subtotal Adicionales:', margin + 15, totalsY + 28)
    doc.text(`$${data.cotizacion.subtotalAdicionales.toLocaleString('es-CO')}`, pageWidth - margin - 15, totalsY + 28, { align: 'right' })
    
    // Subtotal Otros Adicionales
    doc.text('Subtotal Otros Adicionales:', margin + 15, totalsY + 41)
    doc.text(`$${data.cotizacion.subtotalOtrosAdicionales.toLocaleString('es-CO')}`, pageWidth - margin - 15, totalsY + 41, { align: 'right' })
    
    // Línea separadora antes del total
    doc.setDrawColor(153, 214, 232) // #99d6e8
    doc.line(margin + 15, totalsY + 48, pageWidth - margin - 15, totalsY + 48)
    
    // TOTAL GENERAL - MÁS DESTACADO
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 107, 50) // #1a6b32
    doc.text('TOTAL GENERAL:', margin + 15, totalsY + 62)
    doc.text(`$${data.cotizacion.total.toLocaleString('es-CO')}`, pageWidth - margin - 15, totalsY + 62, { align: 'right' })
    
    yPosition = totalsY + 75

    // VALOR TOTAL EN LETRAS
    const valorEnLetras = convertirNumeroALetras(data.cotizacion.total)
    addText('VALOR EN LETRAS:', 11, true, margin, 8, '#1a6b32')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    
    // Cuadro para el valor en letras
    const valorLetrasY = yPosition
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(153, 214, 232) // #99d6e8
    doc.roundedRect(margin, valorLetrasY, pageWidth - 2 * margin, 25, 3, 3, 'S') // Solo borde
    
    const valorLetrasLines = doc.splitTextToSize(valorEnLetras, pageWidth - 2 * margin - 10)
    valorLetrasLines.forEach((line: string, index: number) => {
      doc.text(line, margin + 5, valorLetrasY + 10 + (index * 5))
    })
    yPosition = valorLetrasY + 30

    // Observaciones (en segunda página si hay espacio)
    if (data.cotizacion.observaciones) {
      addText('OBSERVACIONES', 12, true, margin, 10, '#1a6b32')
      yPosition += 2

      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      const observacionesLines = doc.splitTextToSize(data.cotizacion.observaciones, pageWidth - 2 * margin - 10)
      observacionesLines.forEach((line: string, index: number) => {
        if (yPosition > pageHeight - margin - 10) {
          doc.addPage()
          agregarEncabezado(doc, data, pageWidth, margin, logoBase64)
          yPosition = 50
        }
        doc.text(line, margin + 5, yPosition + (index * 4))
      })
      yPosition += observacionesLines.length * 4 + 5
    }

    // Términos y Condiciones (en segunda página)
    addText('TÉRMINOS Y CONDICIONES', 12, true, margin, 10, '#1a6b32')
    yPosition += 2

    const terminos = [
      '• Esta cotización es válida por el período indicado',
      '• Los precios están sujetos a cambios sin previo aviso',
      '• El pago debe realizarse según los términos acordados',
      '• Para procedimientos programados se requiere depósito',
      '• Consulte por métodos de pago y financiación',
      '• La cotización incluye únicamente los servicios marcados',
      '• Cualquier servicio adicional será cotizado por separado'
    ]

    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    terminos.forEach((termino, index) => {
      if (yPosition > pageHeight - margin - 10) {
        doc.addPage()
        agregarEncabezado(doc, data, pageWidth, margin, logoBase64)
        yPosition = 50
      }
      doc.text(termino, margin + 5, yPosition + (index * 4))
    })

    yPosition += terminos.length * 4 + 10

    // Firmas
    const firmasY = Math.max(yPosition, pageHeight - 60)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, firmasY, pageWidth - margin, firmasY)
    
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    
    // Firma del médico
    doc.text('Dr. Hernán Ignacio Córdoba', margin, firmasY + 10)
    doc.text('Cirujano Plástico', margin, firmasY + 15)
    doc.line(margin, firmasY + 18, margin + 80, firmasY + 18)
    
    // Firma del paciente
    doc.text('Paciente/Acompañante', pageWidth - margin - 80, firmasY + 10)
    doc.text('Aceptación de cotización', pageWidth - margin - 80, firmasY + 15)
    doc.line(pageWidth - margin - 80, firmasY + 18, pageWidth - margin, firmasY + 18)

    // Agregar pie de página a todas las páginas
    for (let i = 1; i <= doc.getNumberOfPages(); i++) {
      doc.setPage(i)
      agregarPiePagina(doc, pageWidth, pageHeight)
    }

    // Guardar PDF
    doc.save(`cotizacion-${data.paciente.documento}-CZ${data.cotizacion.id}.pdf`)
    
  } catch (error) {
    console.error('Error generando PDF:', error)
    throw new Error('No se pudo generar el PDF de la cotización')
  }
}

// Función para convertir números a letras (español)
function convertirNumeroALetras(numero: number): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  if (numero === 0) return 'CERO PESOS'

  let resultado = ''
  const millones = Math.floor(numero / 1000000)
  const resto = numero % 1000000

  if (millones > 0) {
    if (millones === 1) {
      resultado += 'UN MILLÓN '
    } else {
      resultado += convertirNumeroALetras(millones) + ' MILLONES '
    }
  }

  const miles = Math.floor(resto / 1000)
  const centenasUnidades = resto % 1000

  if (miles > 0) {
    if (miles === 1) {
      resultado += 'MIL '
    } else {
      resultado += convertirNumeroALetras(miles) + ' MIL '
    }
  }

  const cientos = Math.floor(centenasUnidades / 100)
  const decenasUnidades = centenasUnidades % 100

  if (cientos > 0) {
    if (centenasUnidades === 100) {
      resultado += 'CIEN '
    } else {
      resultado += centenas[cientos] + ' '
    }
  }

  if (decenasUnidades > 0) {
    if (decenasUnidades < 10) {
      resultado += unidades[decenasUnidades] + ' '
    } else if (decenasUnidades < 20) {
      resultado += especiales[decenasUnidades - 10] + ' '
    } else {
      const decena = Math.floor(decenasUnidades / 10)
      const unidad = decenasUnidades % 10
      resultado += decenas[decena]
      if (unidad > 0) {
        resultado += ' Y ' + unidades[unidad] + ' '
      } else {
        resultado += ' '
      }
    }
  }

  return resultado.trim() + ' PESOS COLOMBIANOS'
}