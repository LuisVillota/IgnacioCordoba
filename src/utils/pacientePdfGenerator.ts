import jsPDF from 'jspdf'

interface paciente {
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
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
  switch (genero.toLowerCase()) {
    case 'masculino': return 'Masculino'
    case 'femenino': return 'Femenino'
    case 'otro': return 'Otro'
    case 'prefiero no decir': return 'Prefiero no decir'
    default: return genero.charAt(0).toUpperCase() + genero.slice(1)
  }
}

// Función auxiliar para formatear fecha
const formatearFecha = (fecha: string): string => {
  if (!fecha) return 'No especificada'
  try {
    const date = new Date(fecha)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return fecha
  }
}

// Función auxiliar para valores seguros
const valorSeguro = (valor: any, defaultValue: string = 'No especificado'): string => {
  if (valor === null || valor === undefined || valor === '') return defaultValue
  return String(valor).trim()
}

export async function generarPDFpaciente(paciente: paciente) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = {
      top: 20,
      right: 15,
      bottom: 25,
      left: 15
    }
    
    let yPosition = margin.top
    const contentWidth = pageWidth - margin.left - margin.right
    
    // Variables de estilo
    const colors = {
      primary: '#1a6b32',
      secondary: '#669933',
      accent: '#99d6e8',
      lightGray: '#f8f9fa',
      mediumGray: '#e9ecef',
      darkGray: '#495057',
      text: '#212529',
      white: '#ffffff'
    }
    
    const fonts = {
      title: 14,
      subtitle: 11,
      section: 10,
      body: 9,
      small: 8,
      xsmall: 7
    }
    
    const lineHeights = {
      title: 8,
      subtitle: 6,
      section: 6,
      body: 5,
      small: 4.5,
      xsmall: 4
    }

    // POSICIONES FIJAS PARA MEJOR ALINEACIÓN
    const labelStartX = margin.left + 5
    const valueStartX = margin.left + 50  // MOVIDO MÁS A LA DERECHA (antes era 20 o 35)

    // Función para agregar texto
    const addText = (
      text: string, 
      fontSize: number = fonts.body, 
      isBold: boolean = false, 
      x: number = margin.left, 
      lineHeight: number = lineHeights.body,
      color: string = colors.text, 
      align: 'left' | 'center' | 'right' = 'left'
    ): void => {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', isBold ? 'bold' : 'normal')
      doc.setTextColor(color)
      doc.text(text, x, yPosition, { align })
      yPosition += lineHeight
    }

    // Función para agregar sección
    const addSection = (title: string): void => {
      yPosition += 5
      addText(title, fonts.section, true, margin.left, lineHeights.section + 1, colors.primary)
      
      // Línea decorativa
      doc.setDrawColor(colors.accent)
      doc.setLineWidth(0.3)
      doc.line(margin.left, yPosition - 2, margin.left + 25, yPosition - 2)
      yPosition += 3
    }

    // Función para agregar un item de información CON VALORES MÁS A LA DERECHA
    const addInfoItem = (label: string, value: string, isBoldValue: boolean = false, valueColor?: string): void => {
      // Verificar si necesitamos nueva página
      if (yPosition + lineHeights.small * 3 > pageHeight - margin.bottom) {
        doc.addPage()
        yPosition = margin.top
      }
      
      // Etiqueta (izquierda)
      doc.setFontSize(fonts.small)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.darkGray)
      doc.text(label + ':', labelStartX, yPosition)
      
      // Valor (DERECHA - posición fija)
      doc.setFont('helvetica', isBoldValue ? 'bold' : 'normal')
      doc.setTextColor(valueColor || colors.text)
      
      // Manejar texto largo
      const maxValueWidth = contentWidth - (valueStartX - margin.left) - 5
      const lines = doc.splitTextToSize(value, maxValueWidth)
      
      if (Array.isArray(lines)) {
        // Primera línea en posición fija
        doc.text(lines[0], valueStartX, yPosition)
        yPosition += lineHeights.small
        
        // Líneas adicionales (indentadas)
        for (let i = 1; i < lines.length; i++) {
          if (yPosition + lineHeights.small > pageHeight - margin.bottom) {
            doc.addPage()
            yPosition = margin.top
          }
          doc.text(lines[i], valueStartX + 5, yPosition) // Indentado para líneas adicionales
          yPosition += lineHeights.small
        }
      } else {
        doc.text(lines, valueStartX, yPosition)
        yPosition += lineHeights.small
      }
      
      yPosition += 2  // Espacio entre items
    }

    // ================================
    // ENCABEZADO
    // ================================
    
    // Logo
    try {
      const logoBase64 = await loadImageAsBase64('/images/logo.jpg')
      if (logoBase64) {
        const logoWidth = 30
        const logoHeight = 15
        const logoX = pageWidth - margin.right - logoWidth
        const logoY = margin.top
        doc.addImage(logoBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight)
      }
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error)
    }

    // Títulos
    addText('CLINICA RX', fonts.title, true, margin.left, lineHeights.title, colors.primary)
    addText('CIRUGÍA PLÁSTICA', fonts.subtitle, false, margin.left, lineHeights.subtitle, colors.secondary)
    addText('FICHA DEL PACIENTE', fonts.small, false, margin.left, lineHeights.subtitle + 2, colors.darkGray)
    
    // Línea separadora
    yPosition += 2
    doc.setDrawColor(colors.accent)
    doc.setLineWidth(0.5)
    doc.line(margin.left, yPosition, pageWidth - margin.right, yPosition)
    yPosition += 8

    // ================================
    // INFORMACIÓN PERSONAL (VALORES MÁS A LA DERECHA)
    // ================================
    
    addSection('DATOS PERSONALES')
    
    const tipoDoc = paciente.tipo_documento === 'CC' ? 'Cédula' : 
                   paciente.tipo_documento === 'CE' ? 'Cédula Extranjería' : 
                   paciente.tipo_documento === 'PP' ? 'Pasaporte' : paciente.tipo_documento
    
    const estadoColor = paciente.estado_paciente === 'activo' ? colors.primary : '#dc3545'
    
    // Nombre completo
    addInfoItem(
      'Nombre completo',
      `${valorSeguro(paciente.nombres)} ${valorSeguro(paciente.apellidos)}`,
      true
    )
    
    // Documento
    addInfoItem(
      'Documento',
      `${tipoDoc} ${valorSeguro(paciente.documento)}`,
      true
    )
    
    // Fecha de nacimiento
    addInfoItem(
      'Fecha de nacimiento',
      formatearFecha(paciente.fecha_nacimiento),
      false
    )
    
    // Género
    addInfoItem(
      'Género',
      formatearGenero(paciente.genero),
      false
    )
    
    // Estado
    addInfoItem(
      'Estado',
      paciente.estado_paciente === 'activo' ? 'Activo' : 'Inactivo',
      true,
      estadoColor
    )

    // ================================
    // INFORMACIÓN DE CONTACTO
    // ================================
    
    addSection('CONTACTO')
    
    const emailColor = paciente.email ? '#0d6efd' : colors.darkGray
    
    // Teléfono
    addInfoItem(
      'Teléfono',
      valorSeguro(paciente.telefono),
      true
    )
    
    // Email
    addInfoItem(
      'Correo electrónico',
      valorSeguro(paciente.email),
      true,
      emailColor
    )

    // ================================
    // DIRECCIÓN
    // ================================
    
    addSection('DIRECCIÓN')
    
    // Dirección
    addInfoItem(
      'Dirección',
      valorSeguro(paciente.direccion),
      true
    )
    
    // Ciudad
    addInfoItem(
      'Ciudad',
      valorSeguro(paciente.ciudad),
      true
    )

    // ================================
    // INFORMACIÓN DE REGISTRO
    // ================================
    
    addSection('REGISTRO')
    
    // Fecha de registro
    addInfoItem(
      'Fecha de registro',
      formatearFecha(paciente.fecha_registro),
      true
    )
    
    // ID del paciente
    addInfoItem(
      'ID del paciente',
      paciente.id,
      true,
      colors.primary
    )

    // ================================
    // INFORMACIÓN ADICIONAL
    // ================================
    
    addSection('INFORMACIÓN ADICIONAL')
    
    // Cuadro de información
    yPosition += 3
    const infoHeight = 25
    const infoStartY = yPosition
    
    // Fondo
    doc.setFillColor(colors.lightGray)
    doc.rect(margin.left, infoStartY, contentWidth, infoHeight, 'F')
    
    // Borde
    doc.setDrawColor(colors.mediumGray)
    doc.setLineWidth(0.2)
    doc.rect(margin.left, infoStartY, contentWidth, infoHeight, 'S')
    
    // Contenido (alineado a la izquierda dentro del cuadro)
    const infoLines = [
      '• Esta ficha contiene información médica confidencial.',
      '• El acceso está restringido a personal autorizado.',
      `• Generado el: ${new Date().toLocaleDateString('es-CO')}`
    ]
    
    doc.setFontSize(fonts.xsmall)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(colors.darkGray)
    
    infoLines.forEach((line, index) => {
      const lineY = infoStartY + 8 + (index * 5)
      doc.text(line, margin.left + 5, lineY) // Alineado a la izquierda dentro del cuadro
    })
    
    yPosition = infoStartY + infoHeight + 8

    // ================================
    // PIE DE PÁGINA
    // ================================
    
    // Línea separadora
    const footerY = pageHeight - 18
    doc.setDrawColor(colors.mediumGray)
    doc.setLineWidth(0.2)
    doc.line(margin.left, footerY, pageWidth - margin.right, footerY)
    
    // Información de contacto
    doc.setFontSize(fonts.xsmall)
    doc.setTextColor(colors.darkGray)
    doc.setFont('helvetica', 'normal')
    
    const footerLines = [
      'ClínicaRX - Especialistas en Cirugía Plástica',
      'Calle 5D # 38a - 35 Edificio vida Cons 814 - 815 Torre 2',
      'Teléfonos: 5518244 - 3176688522 - 3183100885',
      'Email: hica-dministracion@hotmail.com'
    ]
    
    footerLines.forEach((line, index) => {
      const lineY = footerY + 4 + (index * 3)
      doc.text(line, pageWidth / 2, lineY, { align: 'center' })
    })

    // ================================
    // GUARDAR PDF
    // ================================
    
    const fileName = `ficha-paciente-${paciente.documento}.pdf`
    doc.save(fileName)
    
    console.log(`PDF generado exitosamente para: ${paciente.nombres} ${paciente.apellidos}`)
    
  } catch (error) {
    console.error('Error generando PDF:', error)
    throw new Error(`No se pudo generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}