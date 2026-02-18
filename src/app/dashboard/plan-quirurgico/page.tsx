"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Plus, Edit2, Eye, Calendar, Scale, User, FileText, RefreshCw, Download, Printer, Trash2 } from "lucide-react"
import type { PlanQuirurgico } from "../../../types/planQuirurgico"
import { PlanQuirurgicoForm } from "../../../components/PlanQuirurgicoForm"
import { api } from "../../../lib/api"

export default function PlanQuirurgicoPage() {
  const [planesQuirurgicos, setPlanesQuirurgicos] = useState<PlanQuirurgico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanQuirurgico | undefined>()
  const [vistaActual, setVistaActual] = useState<"lista" | "formulario">("lista")
  const [refreshing, setRefreshing] = useState(false)
  
  // Usar useRef para prevenir llamadas duplicadas
  const isMounted = useRef(true)
  const isFetching = useRef(false)

  // Cargar planes quirúrgicos al inicio
  useEffect(() => {
    isMounted.current = true
    cargarPlanes()
    
    return () => {
      isMounted.current = false
    }
  }, [])

  const cargarPlanes = async () => {
    // Evitar llamadas duplicadas
    if (isFetching.current) {
      console.log("⏸️ Ya hay una carga en proceso, ignorando llamada duplicada")
      return
    }
    
    try {
      isFetching.current = true
      setLoading(true)
      setError(null)
      console.log("📥 Iniciando carga de planes quirúrgicos...")
      
      const response = await api.getPlanesQuirurgicos(100, 0)
      
      console.log("📥 Respuesta de API:", {
        success: response.success,
        error: response.error,
        total: response.total,
        planesCount: response.planes?.length || 0
      })
      
      // Verificar si el componente sigue montado
      if (!isMounted.current) return
      
      if (response.error) {
        // Si es error de llamada duplicada, ignorarlo
        if (response.message?.includes("Ya hay una llamada") || response.isDuplicateError) {
          console.log("⚠️ Ignorando error de llamada duplicada")
          return
        }
        throw new Error(response.message || "Error cargando planes")
      }
      
      if (response.planes && Array.isArray(response.planes)) {
        console.log(`✅ Cargados ${response.planes.length} planes quirúrgicos`)
        setPlanesQuirurgicos(response.planes)
        
        // Debug: mostrar primeros 2 planes
        if (response.planes.length > 0) {
            console.log("📋 Primeros planes:", response.planes.slice(0, 2).map((p: PlanQuirurgico) => ({
            id: p.id,
            nombre: p.datos_paciente?.nombre_completo,
            identificacion: p.datos_paciente?.identificacion,
            peso: p.datos_paciente?.peso,
            altura: p.datos_paciente?.altura
          })))
        }
      } else {
        console.warn("⚠️ No se recibieron planes en la respuesta")
        setPlanesQuirurgicos([])
      }
    } catch (error: any) {
      // Verificar si el componente sigue montado
      if (!isMounted.current) return
      
      console.error("❌ Error cargando planes quirúrgicos:", error)
      setError(error.message || "Error al cargar los planes quirúrgicos")
      setPlanesQuirurgicos([])
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setRefreshing(false)
      }
      isFetching.current = false
    }
  }

  const handleRefresh = () => {
    if (isFetching.current) {
      console.log("⏸️ Ya hay una actualización en proceso")
      return
    }
    setRefreshing(true)
    cargarPlanes()
  }

  const handleCrearNuevo = () => {
    setPlanSeleccionado(undefined)
    setVistaActual("formulario")
  }

  const handleEditar = async (plan: PlanQuirurgico) => {
    console.log("🔄 Editando plan:", {
      id: plan.id,
      nombre: plan.datos_paciente?.nombre_completo || 'Sin nombre'
    })
    
    try {
      // Obtener datos frescos de la base de datos
      const result = await api.getPlanQuirurgico(plan.id)
      
      console.log("📥 Resultado de getPlanQuirurgico:", {
        success: result.success,
        error: result.error,
        hasData: !!result.datos_paciente,
        nombre: result.datos_paciente?.nombre_completo
      })
      
      if (result.error) {
        console.error("❌ Error obteniendo plan para editar:", result.message)
        // Usar los datos que ya tenemos como fallback
        alert(`Error al cargar plan completo. Se cargarán datos parciales.`)
        setPlanSeleccionado(plan)
        setVistaActual("formulario")
        return
      }
      
      if (result.success) {
        setPlanSeleccionado(result)
        setVistaActual("formulario")
      } else {
        // Si el plan ya viene con datos, usarlo directamente
        console.log("⚠️ Usando datos existentes como fallback")
        setPlanSeleccionado(plan)
        setVistaActual("formulario")
      }
    } catch (error: any) {
      console.error("❌ Error inesperado al editar:", error)
      // Fallback: usar los datos que ya tenemos
      alert("Error al cargar datos completos. Se usarán datos parciales.")
      setPlanSeleccionado(plan)
      setVistaActual("formulario")
    }
  }

  const [planParaVer, setPlanParaVer] = useState<PlanQuirurgico | null>(null)
  const [showDetallesModal, setShowDetallesModal] = useState(false)

  const handleVerDetalles = (plan: PlanQuirurgico) => {
    setPlanParaVer(plan)
    setShowDetallesModal(true)
  }

  const cerrarDetallesModal = () => {
    setShowDetallesModal(false)
    setPlanParaVer(null)
  }

  // Función para eliminar un archivo adjunto
  const eliminarArchivo = async (nombreArchivo: string, planId: string) => {
    if (!confirm(`¿Está seguro que desea eliminar el archivo "${nombreArchivo}"?`)) {
      return;
    }

    try {
      console.log("🗑️ Eliminando archivo:", { nombreArchivo, planId });
      
      // Mostrar indicador de carga
      const deleteButtons = document.querySelectorAll(`button[data-delete-filename="${nombreArchivo}"]`);
      deleteButtons.forEach(button => {
        const htmlButton = button as HTMLButtonElement;
        htmlButton.innerHTML = '<span class="animate-spin mr-2">⏳</span> Eliminando...';
        htmlButton.disabled = true;
      });

      // Llamar a la API para eliminar
      const result = await api.deletePlanFile(nombreArchivo, planId);
      
      console.log("📥 Resultado de eliminación:", result);
      
      if (result.error) {
        throw new Error(result.message || "Error desconocido al eliminar");
      }
      
      console.log("✅ Archivo eliminado exitosamente", result);
      
      // Si estamos viendo detalles de un plan, actualizar la lista de archivos
      if (planParaVer && planParaVer.id === planId) {
        const nuevosArchivos = planParaVer.imagenes_adjuntas?.filter(archivo => archivo !== nombreArchivo) || [];
        setPlanParaVer({
          ...planParaVer,
          imagenes_adjuntas: nuevosArchivos
        });
      }
      
      // Si estamos editando un plan, actualizar el plan seleccionado
      if (planSeleccionado && planSeleccionado.id === planId) {
        const nuevosArchivos = planSeleccionado.imagenes_adjuntas?.filter(archivo => archivo !== nombreArchivo) || [];
        setPlanSeleccionado({
          ...planSeleccionado,
          imagenes_adjuntas: nuevosArchivos
        });
      }
      
      // Recargar la lista de planes para reflejar el cambio
      await cargarPlanes();
      
      alert(`Archivo "${nombreArchivo}" eliminado exitosamente`);
      
    } catch (error: any) {
      console.error("❌ Error al eliminar archivo:", error);
      alert(`Error al eliminar el archivo: ${error.message}`);
    } finally {
      // Restaurar botones
      const deleteButtons = document.querySelectorAll(`button[data-delete-filename="${nombreArchivo}"]`);
      deleteButtons.forEach(button => {
        const htmlButton = button as HTMLButtonElement;
        htmlButton.innerHTML = 'Eliminar';
        htmlButton.disabled = false;
      });
    }
  };

  // Función mejorada para descargar archivos
  const descargarArchivo = async (nombreArchivo: string, planId: string) => {
    try {
      // Validar que tenemos los datos necesarios
      if (!nombreArchivo || !planId) {
        console.error("❌ Faltan datos para la descarga:", { nombreArchivo, planId })
        alert("No se puede descargar el archivo. Faltan datos.");
        return;
      }
      
      console.log("🔄 Iniciando descarga...", { nombreArchivo, planId });
      
      // Mostrar indicador de carga
      const downloadButtons = document.querySelectorAll(`button[data-filename="${nombreArchivo}"]`);
      const originalContents: string[] = [];
      
      // Guardar contenido original de todos los botones
      downloadButtons.forEach(button => {
        originalContents.push(button.innerHTML);
        button.innerHTML = '<span class="animate-spin mr-2">⏳</span> Descargando...';
        (button as HTMLButtonElement).disabled = true;
      });
      
      // Llamar a la API para descargar
      const result = await api.downloadPlanFile(nombreArchivo, planId);
      
      console.log("📥 Resultado de descarga:", result);
      
      if (result.error) {
        throw new Error(result.message || "Error desconocido al descargar");
      }
      
      // Si la API devuelve una URL directa al archivo
      if (result.url) {
        console.log("✅ URL de descarga obtenida:", result.url);
        
        // Crear un enlace temporal y hacer click para descargar
        const link = document.createElement('a');
        link.href = result.url;
        link.download = nombreArchivo;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // También podemos abrir en nueva pestaña para PDFs
        if (nombreArchivo.toLowerCase().endsWith('.pdf')) {
          window.open(result.url, '_blank');
        }
      } 
      // Si la API devuelve datos binarios (Blob)
      else if (result.blob) {
        console.log("✅ Blob recibido, creando URL de objeto");
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }
      // Si no hay URL ni blob, intentar construir la URL
      else {
        console.log("⚠️ No se recibió URL ni blob, intentando construir URL");
        
        // Construir URL basada en el nombre del archivo y planId
        // Esto dependerá de cómo esté configurada tu API
        const fileUrl = `/api/planes/${planId}/archivos/${encodeURIComponent(nombreArchivo)}`;
        console.log("🔗 URL construida:", fileUrl);
        
        // Intentar descargar con la URL construida
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = nombreArchivo;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      console.log("✅ Descarga completada exitosamente", result);
      
      // Mostrar mensaje de éxito
      setTimeout(() => {
        alert(`Archivo "${nombreArchivo}" descargado exitosamente`);
      }, 500);
      
    } catch (error: any) {
      console.error("❌ Error al descargar archivo:", error);
      
      // Intentar método alternativo si el primero falla
      try {
        console.log("🔄 Intentando método alternativo de descarga...");
        
        // Construir URL directa asumiendo una estructura común
        const fileUrl = `/api/files/${planId}/${encodeURIComponent(nombreArchivo)}`;
        console.log("🔗 URL alternativa:", fileUrl);
        
        window.open(fileUrl, '_blank');
        
        alert(`Archivo "${nombreArchivo}" se está abriendo en nueva ventana`);
      } catch (fallbackError) {
        console.error("❌ Método alternativo también falló:", fallbackError);
        alert(`Error al descargar el archivo: ${error.message}. Intente abrirlo manualmente desde el servidor.`);
      }
    } finally {
      // Restaurar botones
      const downloadButtons = document.querySelectorAll(`button[data-filename="${nombreArchivo}"]`);
      downloadButtons.forEach((button, index) => {
        const htmlButton = button as HTMLButtonElement;
        htmlButton.innerHTML = 'Descargar';
        htmlButton.disabled = false;
      });
    }
  };

  // Función para visualizar PDFs directamente en el navegador
  const visualizarArchivo = (nombreArchivo: string, planId: string) => {
    if (!nombreArchivo.toLowerCase().endsWith('.pdf')) {
      alert("Esta función solo está disponible para archivos PDF");
      return;
    }

    try {
      console.log("👁️ Visualizando archivo PDF:", { nombreArchivo, planId });
      
      // Construir URL para visualizar el PDF
      // Ajusta esta URL según tu configuración de API
      const pdfUrl = `/api/planes/${planId}/archivos/${encodeURIComponent(nombreArchivo)}?view=true`;
      
      // Abrir en nueva ventana/pestaña
      const nuevaVentana = window.open(pdfUrl, '_blank', 'width=1200,height=800,scrollbars=yes');
      
      if (!nuevaVentana) {
        alert("Por favor, permite las ventanas emergentes para visualizar el PDF");
        return;
      }
      
      // Opcional: agregar un mensaje mientras carga
      nuevaVentana.document.write(`
        <html>
          <head>
            <title>Cargando PDF: ${nombreArchivo}</title>
            <style>
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
                font-family: Arial, sans-serif;
              }
              .loading {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #1a6b32;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="loading">
              <div class="spinner"></div>
              <h2>Cargando PDF...</h2>
              <p>${nombreArchivo}</p>
            </div>
          </body>
        </html>
      `);
      
    } catch (error: any) {
      console.error("❌ Error al visualizar archivo:", error);
      alert(`Error al visualizar el PDF: ${error.message}. Intente descargarlo primero.`);
    }
  };

  // Función para formatear hora a formato válido para MySQL (HH:MM:SS)
  const formatearHoraParaMySQL = (hora: string): string => {
    if (!hora) return '';
    
    console.log("🕒 Formateando hora para MySQL:", hora);
    
    // Si la hora ya es 'Invalid' o similar, devolver cadena vacía
    if (hora.toLowerCase().includes('inval')) {
      console.log("⚠️ Hora inválida detectada, devolviendo cadena vacía");
      return '';
    }
    
    try {
      // Si ya está en formato HH:MM:SS, devolverla
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(hora)) {
        const parts = hora.split(':');
        let horas = parts[0].padStart(2, '0');
        let minutos = parts[1].padStart(2, '0');
        let segundos = parts[2] ? parts[2].padStart(2, '0') : '00';
        
        // Validar rangos
        const horasNum = parseInt(horas);
        const minutosNum = parseInt(minutos);
        const segundosNum = parseInt(segundos);
        
        if (horasNum >= 0 && horasNum < 24 && 
            minutosNum >= 0 && minutosNum < 60 && 
            segundosNum >= 0 && segundosNum < 60) {
          return `${horas.padStart(2, '0')}:${minutos}:${segundos}`;
        }
      }
      
      // Si está en formato PT15H (duración ISO)
      if (hora.startsWith('PT') && hora.includes('H')) {
        const match = hora.match(/PT(\d+)H/);
        if (match) {
          const horas = parseInt(match[1]);
          if (horas >= 0 && horas < 24) {
            return `${horas.toString().padStart(2, '0')}:00:00`;
          }
        }
      }
      
      // Si está en formato AM/PM
      if (hora.includes('AM') || hora.includes('PM')) {
        const match = hora.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
        if (match) {
          let horas = parseInt(match[1]);
          const minutos = match[2] ? match[2] : '00';
          const periodo = match[3].toUpperCase();
          
          // Convertir a formato 24h
          if (periodo === 'PM' && horas !== 12) {
            horas += 12;
          } else if (periodo === 'AM' && horas === 12) {
            horas = 0;
          }
          
          if (horas >= 0 && horas < 24) {
            return `${horas.toString().padStart(2, '0')}:${minutos}:00`;
          }
        }
      }
      
      console.log("⚠️ No se pudo formatear la hora, devolviendo cadena vacía");
      return '';
    } catch (error) {
      console.error("❌ Error formateando hora para MySQL:", error);
      return '';
    }
  };

  // Función para sanitizar y validar los datos antes de enviar
  const sanitizarPlanParaGuardar = (plan: PlanQuirurgico): PlanQuirurgico => {
    const planSanitizado = { ...plan };
    
    // Sanitizar datos del paciente
    if (planSanitizado.datos_paciente) {
      // Validar y formatear la hora de consulta
      if (planSanitizado.datos_paciente.hora_consulta) {
        const horaFormateada = formatearHoraParaMySQL(planSanitizado.datos_paciente.hora_consulta);
        planSanitizado.datos_paciente.hora_consulta = horaFormateada;
        console.log("🕒 Hora formateada para guardar:", {
          original: plan.datos_paciente.hora_consulta,
          formateada: horaFormateada
        });
      }
      
      // Validar otros campos importantes
      if (!planSanitizado.datos_paciente.nombre_completo || 
          planSanitizado.datos_paciente.nombre_completo.trim() === '') {
        throw new Error("El nombre del paciente es requerido");
      }
      
      // Convertir peso y altura a números si son strings
      if (planSanitizado.datos_paciente.peso) {
        const pesoNum = parseFloat(planSanitizado.datos_paciente.peso as any);
        if (!isNaN(pesoNum)) {
          planSanitizado.datos_paciente.peso = pesoNum;
        }
      }
      
      if (planSanitizado.datos_paciente.altura) {
        const alturaNum = parseFloat(planSanitizado.datos_paciente.altura as any);
        if (!isNaN(alturaNum)) {
          planSanitizado.datos_paciente.altura = alturaNum;
        }
      }
    }
    
    // Sanitizar historia clínica si existe
    if (planSanitizado.historia_clinica) {
      // Asegurar que los campos booleanos sean booleanos
      if (planSanitizado.historia_clinica.antecedentes) {
        Object.keys(planSanitizado.historia_clinica.antecedentes).forEach(key => {
          const value = planSanitizado.historia_clinica!.antecedentes[key];
          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'sí') {
              planSanitizado.historia_clinica!.antecedentes[key] = true;
            } else if (lowerValue === 'false' || lowerValue === 'no') {
              planSanitizado.historia_clinica!.antecedentes[key] = false;
            }
          }
        });
      }
    }
    
    console.log("🧹 Plan sanitizado para guardar:", {
      id: planSanitizado.id,
      nombre: planSanitizado.datos_paciente.nombre_completo,
      hora_consulta: planSanitizado.datos_paciente.hora_consulta
    });
    
    return planSanitizado;
  };

  // Función para imprimir el contenido del modal
  const imprimirPlan = () => {
    if (!planParaVer) return;

    // Crear una ventana de impresión
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    // Obtener datos del plan
    const plan = planParaVer;
    const imcData = plan.datos_paciente.imc ? 
      { imc: plan.datos_paciente.imc, categoria: plan.datos_paciente.categoriaIMC } :
      calcularIMC(Number(plan.datos_paciente.peso), Number(plan.datos_paciente.altura));

    // URL del logo de la clínica
    const logoUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQceqGrv0esgBkN1C8B_p7qsRJaV-zVHVk0sw&s';

    // Crear contenido HTML para imprimir
    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Quirúrgico - ${plan.datos_paciente.nombre_completo}</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
              
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  font-family: 'Inter', sans-serif;
              }
              
              body {
                  padding: 20px 25px;
                  color: #333;
                  background: white;
                  line-height: 1.5;
                  font-size: 12px;
              }
              
              .print-container {
                  max-width: 950px;
                  margin: 0 auto;
                  background: white;
              }
              
              .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 25px;
                  padding-bottom: 15px;
                  border-bottom: 2px solid #1a6b32;
              }
              
              .header-left {
                  flex: 1;
              }
              
              .header-right {
                  text-align: right;
                  margin-left: 20px;
              }
              
              .logo-container {
                  width: 80px;
                  height: 80px;
                  overflow: hidden;
                  border-radius: 10px;
                  border: 2px solid #1a6b32;
                  background: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
              }
              
              .logo {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
              }
              
              .clinic-name {
                  font-size: 10px;
                  color: #666;
                  margin-top: 5px;
                  font-weight: 500;
              }
              
              .header h1 {
                  color: #1a6b32;
                  font-size: 20px;
                  font-weight: 700;
                  margin-bottom: 5px;
              }
              
              .header .subtitle {
                  color: #666;
                  font-size: 13px;
                  margin-bottom: 15px;
              }
              
              .patient-info {
                  background: #f8f9fa;
                  border: 1px solid #dee2e6;
                  border-radius: 6px;
                  padding: 12px;
                  margin-bottom: 15px;
                  font-size: 11px;
              }
              
              .patient-info strong {
                  color: #1a6b32;
              }
              
              .info-box {
                  background: #f8f9fa;
                  border: 1px solid #dee2e6;
                  border-radius: 6px;
                  padding: 12px;
                  margin-bottom: 15px;
                  font-size: 11px;
              }
              
              .section-title {
                  color: #1a6b32;
                  font-size: 14px;
                  font-weight: 600;
                  margin: 20px 0 10px 0;
                  padding-bottom: 6px;
                  border-bottom: 1px solid #e9ecef;
              }
              
              .grid-3 {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 10px;
                  margin-bottom: 15px;
              }
              
              .grid-2 {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 10px;
                  margin-bottom: 15px;
              }
              
              .grid-4 {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 8px;
                  margin-bottom: 12px;
              }
              
              .data-item {
                  margin-bottom: 8px;
                  page-break-inside: avoid;
              }
              
              .data-label {
                  font-weight: 600;
                  color: #555;
                  font-size: 10px;
                  margin-bottom: 2px;
              }
              
              .data-value {
                  color: #222;
                  font-size: 11px;
                  padding: 4px 0;
              }
              
              .compact-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                  gap: 8px;
                  margin-bottom: 12px;
              }
              
              .text-content {
                  background: white;
                  border: 1px solid #dee2e6;
                  border-radius: 4px;
                  padding: 10px;
                  margin: 8px 0;
                  white-space: pre-wrap;
                  font-size: 11px;
                  line-height: 1.4;
                  max-height: 150px;
                  overflow-y: auto;
              }
              
              .file-list {
                  margin-top: 10px;
              }
              
              .file-item {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 8px;
                  border: 1px solid #dee2e6;
                  border-radius: 4px;
                  margin-bottom: 6px;
                  background: white;
                  font-size: 10px;
              }
              
              .file-info {
                  display: flex;
                  align-items: center;
                  gap: 8px;
              }
              
              .file-icon {
                  padding: 5px;
                  border-radius: 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
              }
              
              .badge {
                  display: inline-block;
                  padding: 3px 6px;
                  border-radius: 12px;
                  font-size: 9px;
                  font-weight: 500;
                  margin-right: 5px;
                  margin-bottom: 3px;
              }
              
              .badge-yes {
                  background: #d4edda;
                  color: #155724;
              }
              
              .badge-no {
                  background: #f8d7da;
                  color: #721c24;
              }
              
              .badge-neutral {
                  background: #e2e3e5;
                  color: #383d41;
              }
              
              .footer {
                  margin-top: 25px;
                  padding-top: 12px;
                  border-top: 1px solid #dee2e6;
                  text-align: center;
                  color: #666;
                  font-size: 9px;
              }
              
              .print-date {
                  text-align: right;
                  margin-bottom: 15px;
                  color: #666;
                  font-size: 10px;
              }
              
              .compact-section {
                  margin-bottom: 15px;
                  page-break-inside: avoid;
              }
              
              .two-column {
                  column-count: 2;
                  column-gap: 20px;
                  margin-bottom: 15px;
              }
              
              .checkbox-item {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  margin-bottom: 4px;
                  font-size: 10px;
              }
              
              .checkbox-item input[type="checkbox"] {
                  width: 10px;
                  height: 10px;
                  accent-color: #1a6b32;
              }
              
              .signature-line {
                  margin-top: 30px;
                  padding-top: 15px;
                  border-top: 1px dashed #666;
                  text-align: center;
                  font-size: 10px;
              }
              
              .signature-space {
                  height: 50px;
                  margin: 10px 0;
              }
              
              @media print {
                  body {
                      padding: 15px 20px;
                      font-size: 11px !important;
                  }
                  
                  .no-print {
                      display: none !important;
                  }
                  
                  .print-container {
                      max-width: 100%;
                  }
                  
                  .section-title {
                      page-break-after: avoid;
                      font-size: 13px !important;
                  }
                  
                  .info-box, .text-content, .file-item {
                      page-break-inside: avoid;
                  }
                  
                  .header {
                      page-break-after: avoid;
                  }
                  
                  .patient-info {
                      page-break-after: avoid;
                  }
              }
              
              /* Estilos para mejor uso de espacio */
              .compact-table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 10px;
                  margin-bottom: 12px;
              }
              
              .compact-table th {
                  background: #f1f3f4;
                  border: 1px solid #dee2e6;
                  padding: 6px 8px;
                  text-align: left;
                  color: #1a6b32;
                  font-weight: 600;
              }
              
              .compact-table td {
                  border: 1px solid #dee2e6;
                  padding: 6px 8px;
                  vertical-align: top;
              }
              
              .compact-table tr:nth-child(even) {
                  background: #f8f9fa;
              }
              
              .inline-grid {
                  display: grid;
                  grid-template-columns: auto 1fr;
                  gap: 8px;
                  align-items: start;
                  margin-bottom: 8px;
              }
              
              .inline-label {
                  font-weight: 600;
                  color: #555;
                  font-size: 10px;
                  min-width: 120px;
              }
              
              .inline-value {
                  color: #222;
                  font-size: 11px;
              }
          </style>
      </head>
      <body>
          <div class="print-container">
              <div class="print-date">
                  Impreso el: ${new Date().toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                  })}
              </div>
              
              <div class="header">
                  <div class="header-left">
                      <h1>📋 PLAN QUIRÚRGICO</h1>
                      <div class="subtitle">Documento Médico - Sistema de Gestión Quirúrgica</div>
                      <div class="patient-info">
                          <strong>Paciente:</strong> ${plan.datos_paciente.nombre_completo} | 
                          <strong>Documento:</strong> ${plan.datos_paciente.identificacion || 'No registrado'} | 
                          <strong>Fecha Consulta:</strong> ${formatFecha(plan.datos_paciente.fecha_consulta)}
                      </div>
                  </div>
                  <div class="header-right">
                      <div class="logo-container">
                          <img src="${logoUrl}" alt="Logo Clínica" class="logo" onerror="this.style.display='none'">
                      </div>
                      <div class="clinic-name">Clínica Especializada</div>
                  </div>
              </div>
              
              <!-- DATOS DEL PACIENTE -->
              <div class="compact-section">
                  <div class="section-title">👤 DATOS DEL PACIENTE</div>
                  <div class="compact-table">
                      <table class="compact-table">
                          <thead>
                              <tr>
                                  <th style="width: 25%">Información</th>
                                  <th style="width: 25%">Datos Personales</th>
                                  <th style="width: 25%">Medidas Corporales</th>
                                  <th style="width: 25%">Consulta</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>
                                      <div class="data-label">Identificación</div>
                                      <div class="data-value">${plan.datos_paciente.identificacion || '—'}</div>
                                  </td>
                                  <td>
                                      <div class="data-label">Nombre Completo</div>
                                      <div class="data-value">${plan.datos_paciente.nombre_completo}</div>
                                  </td>
                                  <td>
                                      <div class="data-label">Peso</div>
                                      <div class="data-value">${plan.datos_paciente.peso || '—'} kg</div>
                                  </td>
                                  <td>
                                      <div class="data-label">Fecha Consulta</div>
                                      <div class="data-value">${formatFecha(plan.datos_paciente.fecha_consulta)}</div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div class="data-label">Edad</div>
                                      <div class="data-value">${plan.historia_clinica?.edad_calculada || plan.datos_paciente.edad || '—'} años</div>
                                  </td>
                                  <td>
                                      ${plan.historia_clinica?.ocupacion ? `
                                      <div class="data-label">Ocupación</div>
                                      <div class="data-value">${plan.historia_clinica.ocupacion}</div>
                                      ` : '<div class="data-value">—</div>'}
                                  </td>
                                  <td>
                                      <div class="data-label">Altura</div>
                                      <div class="data-value">${plan.datos_paciente.altura || '—'} m</div>
                                  </td>
                                  <td>
                                      <div class="data-label">Hora Consulta</div>
                                      <div class="data-value">${formatHora12(plan.datos_paciente.hora_consulta)}</div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colspan="2">
                                      <div class="data-label">Entidad</div>
                                      <div class="data-value">${plan.historia_clinica?.entidad || '—'}</div>
                                  </td>
                                  <td colspan="2">
                                      <div class="data-label">IMC</div>
                                      <div class="data-value">${imcData.imc || '—'} ${imcData.categoria ? `(${imcData.categoria})` : ''}</div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>
              
              <!-- CONTACTO -->
              ${plan.historia_clinica && (plan.historia_clinica.telefono || plan.historia_clinica.celular || plan.historia_clinica.email || plan.historia_clinica.direccion) ? `
              <div class="compact-section">
                  <div class="section-title">📞 CONTACTO</div>
                  <div class="grid-4">
                      ${plan.historia_clinica.telefono ? `
                      <div class="info-box">
                          <div class="data-label">Teléfono</div>
                          <div class="data-value">${plan.historia_clinica.telefono}</div>
                      </div>` : ''}
                      
                      ${plan.historia_clinica.celular ? `
                      <div class="info-box">
                          <div class="data-label">Celular</div>
                          <div class="data-value">${plan.historia_clinica.celular}</div>
                      </div>` : ''}
                      
                      ${plan.historia_clinica.email ? `
                      <div class="info-box">
                          <div class="data-label">Email</div>
                          <div class="data-value">${plan.historia_clinica.email}</div>
                      </div>` : ''}
                      
                      ${plan.historia_clinica.direccion ? `
                      <div class="info-box">
                          <div class="data-label">Dirección</div>
                          <div class="data-value">${plan.historia_clinica.direccion}</div>
                      </div>` : ''}
                  </div>
              </div>
              ` : ''}
              
              <!-- HISTORIA CLÍNICA -->
              ${plan.historia_clinica ? `
              <div class="compact-section">
                  <div class="section-title">📝 HISTORIA CLÍNICA</div>
                  
                  <!-- Motivo de Consulta -->
                  ${plan.historia_clinica.motivo_consulta ? `
                  <div class="inline-grid">
                      <div class="inline-label">Motivo Consulta:</div>
                      <div class="text-content" style="margin: 0; max-height: 80px;">${plan.historia_clinica.motivo_consulta}</div>
                  </div>` : ''}
                  
                  <!-- Diagnóstico -->
                  ${plan.historia_clinica.diagnostico ? `
                  <div class="inline-grid">
                      <div class="inline-label">Diagnóstico:</div>
                      <div class="text-content" style="margin: 0; max-height: 80px;">${plan.historia_clinica.diagnostico}</div>
                  </div>` : ''}
                  
                  <!-- Plan de Conducta -->
                  ${plan.historia_clinica.plan_conducta ? `
                  <div class="inline-grid">
                      <div class="inline-label">Plan de Conducta:</div>
                      <div class="text-content" style="margin: 0; max-height: 80px;">${plan.historia_clinica.plan_conducta}</div>
                  </div>` : ''}
                  
                  <!-- Enfermedad Actual -->
                  ${plan.historia_clinica.enfermedad_actual ? `
                  <div class="info-box">
                      <div style="font-weight: 600; margin-bottom: 8px; color: #1a6b32; font-size: 11px;">🩺 Enfermedad Actual</div>
                      <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                          ${Object.entries(plan.historia_clinica.enfermedad_actual)
                              .filter(([_, value]) => value)
                              .map(([key, _]) => `
                              <span class="badge badge-yes">${key.replace(/_/g, ' ').toUpperCase()}</span>
                              `).join('')}
                          ${Object.entries(plan.historia_clinica.enfermedad_actual)
                              .filter(([_, value]) => !value)
                              .map(([key, _]) => `
                              <span class="badge badge-neutral">${key.replace(/_/g, ' ').toUpperCase()}</span>
                              `).join('')}
                      </div>
                  </div>` : ''}
                  
                  <!-- Antecedentes (en 2 columnas para ahorrar espacio) -->
                  ${plan.historia_clinica.antecedentes ? `
                  <div class="info-box">
                      <div style="font-weight: 600; margin-bottom: 8px; color: #1a6b32; font-size: 11px;">📋 Antecedentes</div>
                      <div class="two-column">
                          ${Object.entries(plan.historia_clinica.antecedentes)
                              .map(([key, value]) => {
                                  if (!value || value === '' || value === 'no' || value === false) return '';
                                  
                                  let displayValue = value;
                                  if (typeof value === 'boolean') {
                                      displayValue = value ? 'Sí' : 'No';
                                  } else if (typeof value === 'object') {
                                      displayValue = Object.entries(value)
                                          .filter(([_, subVal]) => subVal && subVal !== '')
                                          .map(([subKey, subVal]) => `${subKey}: ${subVal}`)
                                          .join(', ');
                                  }
                                  
                                  if (!displayValue || displayValue === 'No') return '';
                                  
                                  return `
                                  <div class="checkbox-item">
                                      <input type="checkbox" checked>
                                      <span style="font-weight: 600; color: #555;">${key.replace(/_/g, ' ')}:</span>
                                      <span>${displayValue}</span>
                                  </div>
                                  `;
                              }).join('')}
                      </div>
                  </div>` : ''}
                  
                  <!-- Examen Físico -->
                  ${plan.historia_clinica.notas_corporales ? `
                  <div class="info-box">
                      <div style="font-weight: 600; margin-bottom: 8px; color: #1a6b32; font-size: 11px;">🔍 Examen Físico</div>
                      <div class="two-column">
                          ${Object.entries(plan.historia_clinica.notas_corporales)
                              .filter(([_, value]) => typeof value === 'string' && value.trim())
                              .map(([key, value]) => `
                              <div class="data-item">
                                  <div class="data-label" style="text-transform: capitalize;">${key.replace(/_/g, ' ')}</div>
                                  <div class="data-value">${value}</div>
                              </div>
                              `).join('')}
                      </div>
                  </div>` : ''}
              </div>
              ` : ''}
              
              <!-- CONDUCTA QUIRÚRGICA -->
              ${plan.conducta_quirurgica ? `
              <div class="compact-section">
                  <div class="section-title">⚕️ CONDUCTA QUIRÚRGICA</div>
                  <div class="grid-4">
                      ${plan.conducta_quirurgica.duracion_estimada ? `
                      <div class="info-box">
                          <div class="data-label">Duración</div>
                          <div class="data-value">${plan.conducta_quirurgica.duracion_estimada} min</div>
                      </div>` : ''}
                      
                      ${plan.conducta_quirurgica.tipo_anestesia ? `
                      <div class="info-box">
                          <div class="data-label">Anestesia</div>
                          <div class="data-value">${plan.conducta_quirurgica.tipo_anestesia}</div>
                      </div>` : ''}
                      
                      <div class="info-box">
                          <div class="data-label">Hospitalización</div>
                          <div class="data-value">${plan.conducta_quirurgica.requiere_hospitalizacion ? 'Sí' : 'No'}</div>
                      </div>
                      
                      ${plan.conducta_quirurgica.tiempo_hospitalizacion ? `
                      <div class="info-box">
                          <div class="data-label">Tiempo Hosp.</div>
                          <div class="data-value">${plan.conducta_quirurgica.tiempo_hospitalizacion}</div>
                      </div>` : ''}
                      
                      ${plan.conducta_quirurgica.reseccion_estimada ? `
                      <div class="info-box">
                          <div class="data-label">Resección</div>
                          <div class="data-value">${plan.conducta_quirurgica.reseccion_estimada}</div>
                      </div>` : ''}
                  </div>
              </div>
              ` : ''}
              
              <!-- NOTAS DEL DOCTOR -->
              ${plan.notas_doctor ? `
              <div class="compact-section">
                  <div class="section-title">📋 NOTAS DEL DOCTOR</div>
                  <div class="text-content">${plan.notas_doctor}</div>
              </div>
              ` : ''}
              
              <!-- ESQUEMA QUIRÚRGICO -->
              ${plan.esquema_mejorado && Object.keys(plan.esquema_mejorado.zoneMarkings || {}).length > 0 ? `
              <div class="compact-section">
                  <div class="section-title">📐 ESQUEMA QUIRÚRGICO</div>
                  <div class="grid-2">
                      <div class="info-box">
                          <div class="data-label">Zonas Marcadas</div>
                          <div class="data-value">${Object.keys(plan.esquema_mejorado.zoneMarkings).length} zona(s)</div>
                      </div>
                      <div class="info-box">
                          <div class="data-label">Procedimiento</div>
                          <div class="data-value">
                              ${plan.esquema_mejorado.selectedProcedure === 'liposuction' ? 'Liposucción' : 'Lipotransferencia'}
                          </div>
                      </div>
                  </div>
              </div>
              ` : ''}
              
              <!-- ARCHIVOS ADJUNTOS -->
              ${plan.imagenes_adjuntas && plan.imagenes_adjuntas.length > 0 ? `
              <div class="compact-section">
                  <div class="section-title">📎 ARCHIVOS (${plan.imagenes_adjuntas.length})</div>
                  <div class="file-list">
                      ${plan.imagenes_adjuntas.map((archivo: string, index: number) => {
                          const extension = archivo.split('.').pop()?.toLowerCase() || '';
                          const esImagen = ['jpg', 'jpeg', 'png', 'gif'].includes(extension);
                          const esPDF = extension === 'pdf';
                          const icon = esImagen ? '🖼️' : esPDF ? '📄' : '📎';
                          
                          return `
                          <div class="file-item">
                              <div class="file-info">
                                  <div class="file-icon" style="background: ${esImagen ? '#dbeafe' : esPDF ? '#fee2e2' : '#f3f4f6'};">
                                      ${icon}
                                  </div>
                                  <div>
                                      <div style="font-weight: 500; font-size: 10px;">${archivo}</div>
                                      <div style="font-size: 9px; color: #666;">
                                          ${esImagen ? 'Imagen' : esPDF ? 'PDF' : 'Archivo'} • ${extension.toUpperCase()}
                                      </div>
                                  </div>
                              </div>
                          </div>
                          `;
                      }).join('')}
                  </div>
              </div>
              ` : ''}
              
              <!-- INFORMACIÓN DEL REGISTRO -->
              <div class="compact-section">
                  <div class="section-title">📅 REGISTRO</div>
                  <div class="grid-2">
                      <div class="info-box">
                          <div class="data-label">Creación</div>
                          <div class="data-value">${formatFecha(plan.fecha_creacion)}</div>
                      </div>
                      ${plan.fecha_modificacion ? `
                      <div class="info-box">
                          <div class="data-label">Modificación</div>
                          <div class="data-value">${formatFecha(plan.fecha_modificacion)}</div>
                      </div>` : `
                      <div class="info-box">
                          <div class="data-label">Modificación</div>
                          <div class="data-value">—</div>
                      </div>`}
                  </div>
                  <div class="info-box">
                      <div class="data-label">ID del Plan</div>
                      <div class="data-value" style="font-family: monospace; font-size: 10px;">${plan.id}</div>
                  </div>
              </div>
              
              <!-- FIRMA -->
              <div class="signature-line">
                  <div>Firma del Médico Responsable</div>
                  <div class="signature-space"></div>
                  <div>_________________________________________</div>
                  <div style="margin-top: 5px; font-size: 9px;">
                      Dr. ___________________________________ | CMP: ________________
                  </div>
              </div>
              
              <div class="footer">
                  <div>Documento confidencial - Generado por Sistema de Gestión de Planes Quirúrgicos</div>
                  <div style="margin-top: 3px;">© ${new Date().getFullYear()} - Clínica Especializada - Todos los derechos reservados</div>
              </div>
          </div>
          
          <script>
              // Esperar a que la página cargue e imprimir automáticamente
              window.onload = function() {
                  setTimeout(function() {
                      window.print();
                      setTimeout(function() {
                          window.close();
                      }, 1000);
                  }, 500);
              }
          </script>
      </body>
      </html>
    `;

    // Escribir el contenido en la ventana
    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();
  };

  const handleGuardar = async (plan: PlanQuirurgico) => {
    try {
      console.log("💾 Guardando plan:", {
        id: plan.id,
        nombre: plan.datos_paciente.nombre_completo,
        esEdicion: !!planSeleccionado
      })
      
      // Sanitizar y validar los datos antes de enviar
      let planSanitizado: PlanQuirurgico;
      try {
        planSanitizado = sanitizarPlanParaGuardar(plan);
      } catch (validationError: any) {
        console.error("❌ Error de validación:", validationError);
        alert(`Error de validación: ${validationError.message}`);
        return;
      }
      
      let result
      
      if (planSeleccionado) {
        // Actualizar plan existente
        console.log("📝 Actualizando plan existente...")
        result = await api.updatePlanQuirurgico(planSanitizado.id, planSanitizado)
      } else {
        // Crear nuevo plan
        console.log("🆕 Creando nuevo plan...")
        result = await api.createPlanQuirurgico(planSanitizado)
      }
      
      console.log("✅ Resultado del guardado:", result)
      
      // fetchAPI ya devuelve un objeto, NO lanza excepciones
      if (result.error) {
        // Si hay error, mostrar mensaje y salir
        console.error("❌ Error guardando plan:", result.message)
        alert(`Error al guardar: ${result.message}`)
        return // Salir de la función
      }
      
      // Si es éxito, recargar la lista
      if (result.success) {
        console.log("✅ Plan guardado exitosamente, recargando lista...")
        await cargarPlanes()
        setVistaActual("lista")
        alert(planSeleccionado ? "Plan actualizado exitosamente" : "Plan creado exitosamente")
      } else {
        // Si no hay error pero tampoco éxito, mostrar mensaje genérico
        console.error("❌ Error inesperado al guardar:", result)
        alert("Error inesperado al guardar el plan")
      }
    } catch (error: any) {
      // Este catch solo debería ejecutarse para errores inesperados (network, etc.)
      console.error("❌ Error inesperado guardando plan:", error)
      alert(`Error inesperado: ${error.message}`)
    }
  }

  // Formatear fecha
  const formatFecha = (fecha: string) => {
    if (!fecha) return ''
    try {
      const date = new Date(fecha)
      return date.toLocaleDateString('es-ES')
    } catch {
      return fecha
    }
  }

  // Formatear hora a 12 horas con AM/PM
  const formatHora12 = (hora: string) => {
    if (!hora) return ''
    try {
      // Si la hora es inválida, devolver cadena vacía
      if (hora.toLowerCase().includes('inval')) {
        return '';
      }
      
      // Manejar diferentes formatos de hora
      let horaStr = hora
      
      // Si viene en formato PT15H (duración ISO), extraer la hora
      if (hora.startsWith('PT') && hora.includes('H')) {
        const match = hora.match(/PT(\d+)H/)
        if (match) {
          horaStr = `${match[1]}:00:00`
        }
      }
      
      // Si viene como "15:30:00" o "15:30"
      const parts = horaStr.split(':')
      if (parts.length >= 2) {
        let horas = parseInt(parts[0])
        const minutos = parts[1]
        
        const periodo = horas >= 12 ? 'PM' : 'AM'
        
        // Convertir a formato 12 horas
        if (horas === 0) {
          horas = 12 // Medianoche
        } else if (horas > 12) {
          horas = horas - 12
        }
        
        return `${horas}:${minutos} ${periodo}`
      }
      
      return hora
    } catch (error) {
      console.error('Error formateando hora:', error)
      return ''
    }
  }

  // Calcular IMC
  const calcularIMC = (peso: number, altura: number) => {
    if (!peso || !altura || altura === 0) return { imc: 0, categoria: '' }
    const imc = peso / (altura * altura)
    let categoria = ''
    if (imc < 18.5) categoria = "Bajo peso"
    else if (imc < 25) categoria = "Saludable"
    else if (imc < 30) categoria = "Sobrepeso"
    else categoria = "Obesidad"
    return { imc: parseFloat(imc.toFixed(1)), categoria }
  }

  if (vistaActual === "formulario") {
    return (
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => setVistaActual("lista")}
            className="text-[#1a6b32] hover:text-[#155228] font-medium flex items-center gap-2 mb-4"
          >
            ← Volver a Lista
          </button>
          <h1 className="text-3xl font-bold text-[#1a6b32]">
            {planSeleccionado ? "Editar Plan Quirúrgico" : "Crear Nuevo Plan Quirúrgico"}
          </h1>
          {planSeleccionado && (
            <p className="text-gray-600 mt-2">
              Editando plan para: <span className="font-semibold">{planSeleccionado.datos_paciente.nombre_completo}</span>
            </p>
          )}
        </div>
        <PlanQuirurgicoForm 
          plan={planSeleccionado}
          onGuardar={handleGuardar}
          onCancel={() => setVistaActual("lista")}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1a6b32]">Planes Quirúrgicos</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los planes quirúrgicos de los pacientes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            onClick={handleCrearNuevo}
            className="flex items-center gap-2 bg-[#1a6b32] hover:bg-[#155228] text-white px-6 py-3 rounded-lg font-medium transition"
          >
            <Plus className="w-5 h-5" />
            Crear Nuevo Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a6b32]"></div>
          <p className="text-gray-500 mt-4">Cargando planes quirúrgicos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg mb-4">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div>
              <p className="font-bold">Error al cargar planes quirúrgicos</p>
              <p className="mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      ) : planesQuirurgicos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-gray-400 mb-4 text-5xl">📋</div>
          <p className="text-gray-500 text-lg mb-2">No hay planes quirúrgicos registrados</p>
          <p className="text-gray-400 mb-6">Comienza creando tu primer plan quirúrgico</p>
          <button
            onClick={handleCrearNuevo}
            className="bg-[#1a6b32] hover:bg-[#155228] text-white px-6 py-3 rounded-lg font-medium"
          >
            Crear Primer Plan
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-bold">{planesQuirurgicos.length}</span> plan{planesQuirurgicos.length !== 1 ? 'es' : ''} quirúrgico{planesQuirurgicos.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {planesQuirurgicos.map((plan) => {
            // Calcular IMC si no está en los datos
            const imcData = plan.datos_paciente.imc ? 
              { imc: plan.datos_paciente.imc, categoria: plan.datos_paciente.categoriaIMC } :
              calcularIMC(Number(plan.datos_paciente.peso), Number(plan.datos_paciente.altura))

            return (
              <div key={plan.id} className="border rounded-xl p-5 hover:shadow-lg transition-shadow bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <User className="w-6 h-6 text-[#1a6b32]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#1a6b32]">
                        {plan.datos_paciente.nombre_completo || 'paciente sin nombre'}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <span className="font-medium">Documento:</span>
                          <span>{plan.datos_paciente.identificacion || 'No registrado'}</span>
                        </div>
                        {plan.historia_clinica?.telefono && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span className="font-medium">Tel:</span>
                            <span>{plan.historia_clinica.telefono}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleVerDetalles(plan)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Ver</span>
                    </button>
                    <button
                      onClick={() => handleEditar(plan)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg border border-green-500 text-green-600 hover:bg-green-50 text-sm"
                      title="Editar plan"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Medidas Corporales</span>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Peso:</span>
                        <span className="font-medium">{plan.datos_paciente.peso || '?'} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Altura:</span>
                        <span className="font-medium">{plan.datos_paciente.altura || '?'} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IMC:</span>
                        <span className="font-medium">
                          {imcData.imc || '?'} 
                          {imcData.categoria ? <span className="text-xs ml-1">({imcData.categoria})</span> : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Diagnóstico</span>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-800 line-clamp-2">
                        {plan.historia_clinica?.diagnostico || 
                         plan.historia_clinica?.motivo_consulta_detalle || 
                         'No especificado'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Consulta</span>
                    </div>
                    <div className="text-sm">
                      {plan.datos_paciente.fecha_consulta && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fecha:</span>
                          <span className="font-medium">{formatFecha(plan.datos_paciente.fecha_consulta)}</span>
                        </div>
                      )}
                      {plan.datos_paciente.hora_consulta && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hora:</span>
                          <span className="font-medium">{formatHora12(plan.datos_paciente.hora_consulta)}</span>
                        </div>
                      )}
                      {plan.fecha_creacion && (
                        <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
                          <span className="text-gray-600">Creado:</span>
                          <span className="font-medium">{formatFecha(plan.fecha_creacion)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {plan.historia_clinica?.motivo_consulta && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Motivo de consulta:</span>
                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {plan.historia_clinica.motivo_consulta}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DE DETALLES DEL PLAN */}
      {showDetallesModal && planParaVer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8">
            {/* Encabezado */}
            <div className="p-6 border-b bg-[#1a6b32] text-white rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Plan Quirúrgico Completo</h2>
                  <p className="text-green-100">
                    paciente: {planParaVer.datos_paciente.nombre_completo}
                  </p>
                  <p className="text-sm text-green-100">
                    Documento: {planParaVer.datos_paciente.identificacion}
                  </p>
                </div>
                <button
                  onClick={cerrarDetallesModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido - Con scroll */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              
              {/* DATOS DEL paciente */}
              <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-bold text-[#1a6b32] mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Datos del paciente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Identificación</label>
                    <p className="text-gray-800">{planParaVer.datos_paciente.identificacion || 'No registrado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Nombre Completo</label>
                    <p className="text-gray-800">{planParaVer.datos_paciente.nombre_completo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Edad</label>
                    <p className="text-gray-800">{planParaVer.historia_clinica?.edad_calculada || planParaVer.datos_paciente.edad || '—'} años</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Peso</label>
                    <p className="text-gray-800">{planParaVer.datos_paciente.peso ? `${planParaVer.datos_paciente.peso} kg` : '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Altura</label>
                    <p className="text-gray-800">{planParaVer.datos_paciente.altura ? `${planParaVer.datos_paciente.altura} m` : '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">IMC</label>
                    <p className="text-gray-800">
                      {planParaVer.datos_paciente.imc || '—'}
                      {planParaVer.datos_paciente.categoriaIMC && (
                        <span className="text-sm ml-2 text-gray-600">({planParaVer.datos_paciente.categoriaIMC})</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Fecha de Consulta</label>
                    <p className="text-gray-800">{formatFecha(planParaVer.datos_paciente.fecha_consulta)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Hora de Consulta</label>
                    <p className="text-gray-800">{formatHora12(planParaVer.datos_paciente.hora_consulta)}</p>
                  </div>
                </div>
              </section>

              {/* HISTORIA CLÍNICA */}
              {planParaVer.historia_clinica && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Historia Clínica
                  </h3>
                  
                  {/* Datos de Contacto */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Datos de Contacto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {planParaVer.historia_clinica.telefono && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Teléfono</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.telefono}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.celular && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Celular</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.celular}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.email && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Email</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.email}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.direccion && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Dirección</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.direccion}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.ocupacion && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Ocupación</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.ocupacion}</p>
                        </div>
                      )}
                      {planParaVer.historia_clinica.entidad && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Entidad</label>
                          <p className="text-gray-800">{planParaVer.historia_clinica.entidad}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Motivo de Consulta */}
                  {planParaVer.historia_clinica.motivo_consulta && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Motivo de Consulta</h4>
                      <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                        {planParaVer.historia_clinica.motivo_consulta}
                      </p>
                    </div>
                  )}

                  {/* Diagnóstico */}
                  {planParaVer.historia_clinica.diagnostico && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Diagnóstico</h4>
                      <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                        {planParaVer.historia_clinica.diagnostico}
                      </p>
                    </div>
                  )}

                  {/* Plan de Conducta */}
                  {planParaVer.historia_clinica.plan_conducta && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Plan de Conducta</h4>
                      <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                        {planParaVer.historia_clinica.plan_conducta}
                      </p>
                    </div>
                  )}

                  {/* Enfermedad Actual */}
                  {planParaVer.historia_clinica.enfermedad_actual && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Enfermedad Actual</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(planParaVer.historia_clinica.enfermedad_actual).map(([key, value]) => 
                          value ? (
                            <div key={key} className="flex items-center gap-2 bg-white p-2 rounded border">
                              <span className="text-green-600">✓</span>
                              <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  {/* Antecedentes */}
                  {planParaVer.historia_clinica.antecedentes && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Antecedentes</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(planParaVer.historia_clinica.antecedentes).map(([key, value]) => {
                          const getDisplayValue = (val: any): React.ReactNode => {
                            if (val === null || val === undefined || val === '') {
                              return null;
                            }
                            
                            if (typeof val === 'boolean') {
                              return val ? 'Sí' : 'No';
                            }
                            
                            if (typeof val === 'string') {
                              return val === 'no' ? null : val;
                            }
                            
                            if (typeof val === 'object') {
                              if (Object.keys(val).length === 0) {
                                return null;
                              }
                              return Object.entries(val)
                                .filter(([_, subVal]) => subVal !== null && subVal !== undefined && subVal !== '')
                                .map(([subKey, subVal]) => `${subKey}: ${subVal}`)
                                .join(', ') || null;
                            }
                            return String(val);
                          };
                          const displayValue = getDisplayValue(value);
                          if (displayValue === null || displayValue === undefined) {
                            return null;
                          }
                          return (
                            <div key={key} className="bg-white p-2 rounded border">
                              <label className="text-sm font-semibold text-gray-600 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </label>
                              <p className="text-gray-800 text-sm mt-1">
                                {displayValue}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                 {/* Examen Físico */}
                  {planParaVer.historia_clinica.notas_corporales && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Examen Físico</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(planParaVer.historia_clinica.notas_corporales).map(([key, value]) => {
                          if (typeof value !== 'string' || !value.trim()) {
                            return null;
                          }
                          
                          return (
                            <div key={key} className="bg-white p-2 rounded border">
                              <label className="text-sm font-semibold text-gray-600 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </label>
                              <p className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">{value}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* CONDUCTA QUIRÚRGICA */}
              {planParaVer.conducta_quirurgica && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Conducta Quirúrgica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {planParaVer.conducta_quirurgica.duracion_estimada && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Duración Estimada</label>
                        <p className="text-gray-800">{planParaVer.conducta_quirurgica.duracion_estimada} minutos</p>
                      </div>
                    )}
                    {planParaVer.conducta_quirurgica.tipo_anestesia && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Tipo de Anestesia</label>
                        <p className="text-gray-800 capitalize">{planParaVer.conducta_quirurgica.tipo_anestesia}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Requiere Hospitalización</label>
                      <p className="text-gray-800">
                        {planParaVer.conducta_quirurgica.requiere_hospitalizacion ? 'Sí' : 'No'}
                      </p>
                    </div>
                    {planParaVer.conducta_quirurgica.tiempo_hospitalizacion && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Tiempo de Hospitalización</label>
                        <p className="text-gray-800">{planParaVer.conducta_quirurgica.tiempo_hospitalizacion}</p>
                      </div>
                    )}
                    {planParaVer.conducta_quirurgica.reseccion_estimada && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Resección Estimada</label>
                        <p className="text-gray-800">{planParaVer.conducta_quirurgica.reseccion_estimada}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* NOTAS DEL DOCTOR */}
              {planParaVer.notas_doctor && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4">Notas del Doctor</h3>
                  <p className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                    {planParaVer.notas_doctor}
                  </p>
                </section>
              )}

              {/* ARCHIVOS ADJUNTOS */}
              {planParaVer.imagenes_adjuntas && planParaVer.imagenes_adjuntas.length > 0 && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Archivos Adjuntos ({planParaVer.imagenes_adjuntas.length})
                  </h3>
                  <div className="space-y-3">
                    {planParaVer.imagenes_adjuntas.map((archivo: string, index: number) => {
                      // Determinar el tipo de archivo por extensión
                      const extension = archivo.split('.').pop()?.toLowerCase() || ''
                      const esImagen = ['jpg', 'jpeg', 'png', 'gif'].includes(extension)
                      const esPDF = extension === 'pdf'
                      
                      return (
                        <div key={index} className="flex justify-between items-center p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${esImagen ? 'bg-blue-100' : esPDF ? 'bg-red-100' : 'bg-gray-100'}`}>
                              {esImagen ? (
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              ) : esPDF ? (
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 truncate max-w-md">{archivo}</p>
                              <p className="text-xs text-gray-500">
                                {esImagen ? 'Imagen' : esPDF ? 'Documento PDF' : 'Archivo'} • {extension.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {esPDF && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  visualizarArchivo(archivo, planParaVer.id)
                                }}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
                                title={`Ver ${archivo}`}
                              >
                                <Eye className="w-3 h-3" />
                                Ver
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                descargarArchivo(archivo, planParaVer.id)
                              }}
                              data-filename={archivo}
                              className="px-3 py-1.5 bg-[#1a6b32] text-white rounded hover:bg-[#155228] transition-colors text-sm flex items-center gap-1"
                              title={`Descargar ${archivo}`}
                            >
                              <Download className="w-3 h-3" />
                              Descargar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                eliminarArchivo(archivo, planParaVer.id)
                              }}
                              data-delete-filename={archivo}
                              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                              title={`Eliminar ${archivo}`}
                            >
                              <Trash2 className="w-3 h-3" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* ESQUEMA QUIRÚRGICO */}
              {planParaVer.esquema_mejorado && Object.keys(planParaVer.esquema_mejorado.zoneMarkings || {}).length > 0 && (
                <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-bold text-[#1a6b32] mb-4">Esquema Quirúrgico</h3>
                  <div className="bg-white p-3 rounded border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Zonas Marcadas</label>
                        <p className="text-gray-800">
                          {Object.keys(planParaVer.esquema_mejorado.zoneMarkings).length} zona(s)
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-600">Procedimiento Principal</label>
                        <p className="text-gray-800 capitalize">
                          {planParaVer.esquema_mejorado.selectedProcedure === 'liposuction' 
                            ? 'Liposucción' 
                            : 'Lipotransferencia'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Nota: Abra el editor de esquemas en modo edición para ver las marcas detalladas
                    </p>
                  </div>
                </section>
              )}


              {/* FECHAS */}
              <section className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-bold text-[#1a6b32] mb-4">Información del Registro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Fecha de Creación</label>
                    <p className="text-gray-800">{formatFecha(planParaVer.fecha_creacion)}</p>
                  </div>
                  {planParaVer.fecha_modificacion && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Última Modificación</label>
                      <p className="text-gray-800">{formatFecha(planParaVer.fecha_modificacion)}</p>
                    </div>
                  )}
                </div>
              </section>

            </div>

            {/* Pie de página */}
            <div className="p-6 border-t flex justify-between items-center bg-gray-50 rounded-b-lg">
              <div className="text-sm text-gray-600">
                Plan ID: {planParaVer.id}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={imprimirPlan}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Plan
                </button>
                <button
                  onClick={() => {
                    cerrarDetallesModal()
                    handleEditar(planParaVer)
                  }}
                  className="px-4 py-2 bg-[#1a6b32] text-white rounded hover:bg-[#155228]"
                >
                  Editar Plan
                </button>
                <button
                  onClick={cerrarDetallesModal}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}