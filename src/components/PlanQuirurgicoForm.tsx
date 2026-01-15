"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { PlanQuirurgico } from "../types/planQuirurgico"
import { Search, Upload, X, Eye, Download } from "lucide-react"
import { api } from "../lib/api"
import { EsquemaViewer } from "../components/EsquemaViewer"

type ProcedureType = 'liposuction' | 'lipotransfer';

interface Props {
  plan?: PlanQuirurgico
  onGuardar: (plan: PlanQuirurgico) => void
  onCancel?: () => void
}

interface DibujoAccion {
  tipo: ProcedureType;
  x: number;
  y: number;
  timestamp: number;
  tamaño: number;
}

type ZoneMarkingsSVG = { [zoneId: string]: 'liposuction' | 'lipotransfer' | null };

export const PlanQuirurgicoForm: React.FC<Props> = ({ plan, onGuardar, onCancel }) => {
  
  // ---------------------------
  // Estado para selector de pacientes
  // ---------------------------
  const [cargandopacientes, setCargandopacientes] = useState(false)
  const [pacientes, setpacientes] = useState<any[]>([])
  const [pacienteSeleccionado, setpacienteSeleccionado] = useState<any>(null)
  const [showSelectorpacientes, setShowSelectorpacientes] = useState(false)
  const [searchTerm, setSearchTerm] = useState("") 
  
  // ---------------------------
  // Estado para el visor de esquemas
  // ---------------------------
  const [showEsquemaViewer, setShowEsquemaViewer] = useState(false)

  // ---------------------------
  // Estado para archivos/imágenes
  // ---------------------------
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({})
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [archivosCargados, setArchivosCargados] = useState<string[]>([])
  const [isLoadingArchivos, setIsLoadingArchivos] = useState(false)

  // ---------------------------
  // Datos paciente
  // ---------------------------
  const [datospaciente, setDatospaciente] = useState({
    id: plan?.datos_paciente?.id ?? "",
    identificacion: plan?.datos_paciente?.identificacion ?? "",
    edad: plan?.datos_paciente?.edad ?? 0,
    nombre_completo: plan?.datos_paciente?.nombre_completo ?? "",
    peso: plan?.datos_paciente?.peso ?? "",
    altura: plan?.datos_paciente?.altura ?? "",
    imc: plan?.datos_paciente?.imc ?? 0,
    categoriaIMC: plan?.datos_paciente?.categoriaIMC ?? "",
    fecha_consulta: plan?.datos_paciente?.fecha_consulta ?? "",
    hora_consulta: plan?.datos_paciente?.hora_consulta ?? "",
  })

  // ---------------------------
  // Historia clínica - CON VALORES POR DEFECTO SEGUROS
  // ---------------------------
  const defaultEnfermedadActual = {
    hepatitis: false,
    discrasia_sanguinea: false,
    cardiopatias: false,
    hipertension: false,
    reumatologicas: false,
    diabetes: false,
    neurologicas: false,
    enfermedad_mental: false,
    no_refiere: true,
  }

  const defaultAntecedentes = {
    farmacologicos: "",
    traumaticos: "",
    quirurgicos: "",
    alergicos: "",
    toxicos: "",
    habitos: "",
    ginecologicos: "",
    fuma: "no",
    planificacion: "",
  }

  const defaultNotasCorporales = {
    cabeza: "",
    mamas: "",
    tcs: "",
    abdomen: "",
    gluteos: "",
    extremidades: "",
    pies_faneras: "",
  }

  const defaultHistoriaClinica = {
    nombre_completo: datospaciente.nombre_completo,
    identificacion: datospaciente.identificacion,
    ocupacion: "",
    fecha_nacimiento: "",
    edad_calculada: 0,
    entidad: "",
    telefono: "",
    celular: "",
    direccion: "",
    email: "",
    motivo_consulta: "",
    motivo_consulta_detalle: "",
    enfermedad_actual: defaultEnfermedadActual,
    antecedentes: defaultAntecedentes,
    enfermedades_piel: false,
    tratamientos_esteticos: "",
    antecedentes_familiares: "",
    peso: datospaciente.peso,
    altura: datospaciente.altura,
    imc: datospaciente.imc,
    contextura: "",
    notas_corporales: defaultNotasCorporales,
    diagnostico: "",
    plan_conducta: "",
  }
  const getSafeHistoriaClinica = () => {
    if (!plan?.historia_clinica) {
      return defaultHistoriaClinica;
    }    
    return {
      ...defaultHistoriaClinica,
      ...plan.historia_clinica,
      enfermedad_actual: plan.historia_clinica.enfermedad_actual 
        ? { ...defaultEnfermedadActual, ...plan.historia_clinica.enfermedad_actual }
        : defaultEnfermedadActual,
      antecedentes: plan.historia_clinica.antecedentes
        ? { ...defaultAntecedentes, ...plan.historia_clinica.antecedentes }
        : defaultAntecedentes,
      notas_corporales: plan.historia_clinica.notas_corporales
        ? { ...defaultNotasCorporales, ...plan.historia_clinica.notas_corporales }
        : defaultNotasCorporales,
    };
  };

  const [historiaClinica, setHistoriaClinica] = useState(getSafeHistoriaClinica())
  
  interface ConductaQuirurgica {
    duracion_estimada: string | number;
    tipo_anestesia: string;
    requiere_hospitalizacion: boolean;
    tiempo_hospitalizacion: string;
    reseccion_estimada: string;
    firma_cirujano: string;
    firma_paciente: string;
  }

  const defaultConductaQuirurgica: ConductaQuirurgica = {
    duracion_estimada: "",
    tipo_anestesia: "ninguna",
    requiere_hospitalizacion: false,
    tiempo_hospitalizacion: "",
    reseccion_estimada: "",
    firma_cirujano: "",
    firma_paciente: "",
  }

  const getSafeConductaQuirurgica = (): ConductaQuirurgica => {
    if (!plan?.conducta_quirurgica) {
      return defaultConductaQuirurgica;
    }
    return { ...defaultConductaQuirurgica, ...plan.conducta_quirurgica };
  }

  const [conductaQuirurgica, setConductaQuirurgica] = useState<ConductaQuirurgica>(getSafeConductaQuirurgica())
  const [notasDoctor, setNotasDoctor] = useState(plan?.notas_doctor ?? "")
  const [imagenesAdjuntas, setImagenesAdjuntas] = useState<string[]>(plan?.imagenes_adjuntas ?? [])
  const [selectionHistory, setSelectionHistory] = useState<Array<any>>([]);
  const [svgDocuments, setSvgDocuments] = useState<Array<Document>>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<'liposuction' | 'lipotransfer'>('liposuction');
  const selectedProcedureRef = useRef<'liposuction' | 'lipotransfer'>('liposuction');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<SVGPathElement | null>(null);
  const [pathPoints, setPathPoints] = useState<Array<{x: number, y: number}>>([]);
  const [isTextMode, setIsTextMode] = useState(false);
  const [pendingTextPosition, setPendingTextPosition] = useState<{x: number, y: number, svgDoc: Document} | null>(null);
  const [textInput, setTextInput] = useState("");
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(3);
  const [currentTextSize, setCurrentTextSize] = useState(16);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  
  // NUEVO: Estado para controlar el modo de selección de zonas
  const [isZoneSelectionMode, setIsZoneSelectionMode] = useState(false);
  // NUEVO: Estado para controlar la visibilidad de los botones de procedimientos adicionales
  const [showAdditionalButtons, setShowAdditionalButtons] = useState(false);
  
  // Para zonas marcadas
  const [zoneMarkings, setZoneMarkings] = useState<ZoneMarkingsSVG>(() => {
    if (plan?.esquema_mejorado?.zoneMarkings) {
      return plan.esquema_mejorado.zoneMarkings;
    }
    return {};
  });

  // Inicializar el historial de selección si hay datos en el plan
  useEffect(() => {
    if (plan?.esquema_mejorado?.selectedProcedure) {
      const procedure = plan.esquema_mejorado.selectedProcedure;
      if (procedure === 'liposuction' || procedure === 'lipotransfer') {
        setSelectedProcedure(procedure);
        selectedProcedureRef.current = procedure;
      }
    }
    if (plan?.esquema_mejorado?.currentStrokeWidth) {
      setCurrentStrokeWidth(plan.esquema_mejorado.currentStrokeWidth);
    }
    if (plan?.esquema_mejorado?.currentTextSize) {
      setCurrentTextSize(plan.esquema_mejorado.currentTextSize);
    }
  }, [plan]);

  // Cargar archivos cuando hay un plan existente
  useEffect(() => {
    if (plan?.id) {
      cargarArchivosDelPlan(plan.id);
    }
  }, [plan?.id]);

  const bodySvgRef = useRef<HTMLObjectElement>(null);
  const facialSvgRef = useRef<HTMLObjectElement>(null);
  const saveDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------
  // Efecto para sincronizar el ref con el estado
  // ---------------------------
  useEffect(() => {
    selectedProcedureRef.current = selectedProcedure;
  }, [selectedProcedure]);

  // ---------------------------
  // Efecto para inicializar fecha y hora automáticamente si no hay plan
  // Y cargar pacientes automáticamente
  // ---------------------------
  useEffect(() => {
    const initializeForm = async () => {
      if (!plan) {
        // Cargar pacientes automáticamente cuando se crea un nuevo plan
        await cargarpacientes();
        
        const now = new Date();
        const fecha = now.toISOString().split('T')[0];
        const hora = now.toTimeString().slice(0, 5);
        
        setDatospaciente(prev => ({
          ...prev,
          fecha_consulta: fecha,
          hora_consulta: hora
        }));
      } else if (plan.datos_paciente?.id) {
        // Si ya hay un plan, cargar el paciente específico
        await cargarpacientes();
        
        // Buscar el paciente en la lista cargada
        const paciente = pacientes.find(p => p.id.toString() === plan.datos_paciente.id);
        if (paciente) {
          setpacienteSeleccionado(paciente);
        }
      }
    };
    
    initializeForm();
  }, [plan]);

  // ---------------------------
  // FUNCIONES PARA ARCHIVOS
  // ---------------------------

  const cargarArchivosDelPlan = async (planId: string) => {
    if (!planId || planId === '') return;
    
    setIsLoadingArchivos(true);
    try {
      console.log("📥 Cargando archivos del plan:", planId);
      
      const result = await api.getPlanQuirurgico(planId);
      
      if (result.success && result.imagenes_adjuntas) {
        setArchivosCargados(Array.isArray(result.imagenes_adjuntas) ? result.imagenes_adjuntas : []);
        setImagenesAdjuntas(Array.isArray(result.imagenes_adjuntas) ? result.imagenes_adjuntas : []);
        console.log(`✅ Cargados ${result.imagenes_adjuntas.length} archivos del plan`);
      } else {
        setArchivosCargados([]);
        setImagenesAdjuntas([]);
        console.log("ℹ️ No hay archivos adjuntos para este plan");
      }
    } catch (error) {
      console.error("❌ Error cargando archivos del plan:", error);
      setArchivosCargados([]);
      setImagenesAdjuntas([]);
    } finally {
      setIsLoadingArchivos(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      handleFileUpload(file);
    });
    
    // Resetear el input para permitir seleccionar el mismo archivo nuevamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    // Verificar si ya tenemos un plan guardado
    const planId = plan?.id;
    
    // Verificar que planId exista y tenga el formato correcto
    if (!planId || planId === '' || planId === 'plan_') {
      alert("Debe guardar el plan primero antes de subir archivos");
      return;
    }
    
    // Extraer el ID numérico del plan
    let planIdNum: number | string;
    
    if (planId.startsWith('plan_')) {
      planIdNum = planId.replace('plan_', '');
    } else {
      planIdNum = planId;
    }
    
    // Convertir a número y validar
    const planIdParsed = parseInt(planIdNum as string);
    if (isNaN(planIdParsed) || planIdParsed <= 0) {
      alert("ID de plan inválido. Guarde el plan primero.");
      return;
    }
    
    // Verificar tipo de archivo
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert("Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, GIF, BMP, WebP) y PDFs.");
      return;
    }
    
    // Verificar tamaño (15MB máximo para PDFs, 10MB para imágenes)
    const maxSize = file.type === 'application/pdf' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`El archivo es demasiado grande. Máximo ${maxSize / (1024 * 1024)}MB para ${file.type.includes('image') ? 'imágenes' : 'PDFs'}.`);
      return;
    }
    
    const fileName = file.name;
    setUploadingFiles(prev => ({ ...prev, [fileName]: true }));
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    
    try {
      console.log("📤 Subiendo archivo:", fileName, "para plan ID:", planIdParsed);
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[fileName] || 0;
          if (currentProgress < 90) {
            return { ...prev, [fileName]: currentProgress + 10 };
          }
          clearInterval(progressInterval);
          return prev;
        });
      }, 200);
      
      // Subir archivo usando la API
      const result = await api.uploadPlanArchivo(planIdParsed, file);
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
      
      if (result.success && result.url) {
        console.log("✅ Archivo subido exitosamente:", result.url);
        
        // Agregar a la lista de archivos cargados
        setArchivosCargados(prev => [...prev, result.url]);
        setImagenesAdjuntas(prev => [...prev, result.url]);
        
        // Mostrar mensaje de éxito
        setTimeout(() => {
          setUploadingFiles(prev => {
            const newState = { ...prev };
            delete newState[fileName];
            return newState;
          });
          setUploadProgress(prev => {
            const newState = { ...prev };
            delete newState[fileName];
            return newState;
          });
        }, 1000);
      } else {
        throw new Error(result.message || "Error subiendo archivo");
      }
    } catch (error: any) {
      console.error("❌ Error subiendo archivo:", error);
      alert(`Error subiendo archivo: ${error.message || "Error desconocido"}`);
      
      setUploadingFiles(prev => {
        const newState = { ...prev };
        delete newState[fileName];
        return newState;
      });
      setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[fileName];
        return newState;
      });
    }
  };

  const handleDownloadFile = async (url: string, fileName: string) => {
    const planId = plan?.id;
    
    if (!planId || planId === '') {
      alert("No se puede descargar el archivo. Plan no identificado.");
      return;
    }
    
    try {
      console.log("📥 Descargando archivo:", fileName, "desde URL:", url);
      
      // Extraer solo el nombre del archivo para el backend
      let nombreArchivo = fileName;
      
      // Si la URL es de Cloudinary, extraer el nombre del archivo
      if (url.includes('cloudinary.com')) {
        const urlParts = url.split('/');
        const planesIndex = urlParts.indexOf('planes');
        if (planesIndex !== -1 && planesIndex + 1 < urlParts.length) {
          nombreArchivo = urlParts[planesIndex + 1];
        }
      } else if (url.includes('/')) {
        const urlParts = url.split('/');
        nombreArchivo = urlParts[urlParts.length - 1];
      }
      
      console.log("📤 Enviando a API:", { nombreArchivo, planId });
      
      // Usar la función de la API para descargar
      const result = await api.downloadPlanFile(nombreArchivo, planId);
      
      if (result.success) {
        console.log("✅ Archivo descargado exitosamente");
      } else {
        // Si falla pero tenemos una URL, intentar abrirla directamente
        if (url.includes('http')) {
          console.log("🔄 Abriendo URL directamente:", url);
          window.open(url, '_blank');
        } else {
          alert(result.message || "Error descargando archivo");
        }
      }
    } catch (error: any) {
      console.error("❌ Error descargando archivo:", error);
      
      // Si hay error, intentar abrir directamente la URL si es completa
      if (url.includes('http')) {
        window.open(url, '_blank');
      } else {
        alert(`Error descargando archivo: ${error.message || "Error desconocido"}`);
      }
    }
  };

  const handleViewFile = (url: string) => {
    if (url.includes('http')) {
      window.open(url, '_blank');
    } else {
      // Si es una URL relativa, construirla completa
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://ignaciocordoba-backend.onrender.com";
      const fullUrl = url.startsWith('/') ? `${apiUrl}${url}` : `${apiUrl}/${url}`;
      window.open(fullUrl, '_blank');
    }
  };

  const handleDeleteFile = async (url: string, index: number) => {
    if (!window.confirm("¿Está seguro de eliminar este archivo?")) {
      return;
    }
    
    // Actualizar estados locales
    setArchivosCargados(prev => prev.filter((_, i) => i !== index));
    setImagenesAdjuntas(prev => prev.filter((_, i) => i !== index));
    
    // Nota: Para eliminar físicamente del servidor/Cloudinary,
    // necesitaríamos un endpoint DELETE específico en el backend.
    // Por ahora solo eliminamos de la lista local.
    
    console.log("🗑️ Archivo eliminado de la lista:", url);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      return "📕";
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
      return "🖼️";
    } else {
      return "📄";
    }
  };

  const getFileNameFromUrl = (url: string) => {
    if (!url) return "Archivo";
    
    if (url.includes('/')) {
      const parts = url.split('/');
      return parts[parts.length - 1];
    }
    
    return url;
  };

  // ---------------------------
  // Función para cargar todos los pacientes
  // ---------------------------
  const cargarpacientes = async () => {
    setCargandopacientes(true);
    try {
      const pacientesData = await api.getTodospacientes();
      
      // Si la función devuelve un array directamente
      let pacientesArray = [];
      
      if (Array.isArray(pacientesData)) {
        pacientesArray = pacientesData;
      } else if (pacientesData && pacientesData.pacientes && Array.isArray(pacientesData.pacientes)) {
        pacientesArray = pacientesData.pacientes;
      } else if (pacientesData && pacientesData.data && Array.isArray(pacientesData.data)) {
        pacientesArray = pacientesData.data;
      } else {
        setpacientes([]);
        return;
      }
      
      // Mapear los campos
      const pacientesMapeados = pacientesArray.map((paciente: any) => {
        // Crear nombre_completo
        const nombreCompleto = paciente.nombre_completo || 
          `${paciente.nombre || ''} ${paciente.apellido || ''}`.trim() || 
          'Nombre no disponible';
        
        // Usar numero_documento como documento
        const documento = paciente.numero_documento || paciente.documento || '';
        
        // Calcular edad
        let edad = paciente.edad || 0;
        if (!edad && paciente.fecha_nacimiento) {
          try {
            const fechaNacimiento = new Date(paciente.fecha_nacimiento);
            const hoy = new Date();
            edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
            
            const mesCumple = fechaNacimiento.getMonth();
            const diaCumple = fechaNacimiento.getDate();
            const mesActual = hoy.getMonth();
            const diaActual = hoy.getDate();
            
            if (mesActual < mesCumple || (mesActual === mesCumple && diaActual < diaCumple)) {
              edad--;
            }
          } catch (error) {
            console.warn("Error calculando edad:", error);
          }
        }
        
        return {
          ...paciente,
          id: paciente.id?.toString() || '',
          nombre_completo: nombreCompleto,
          documento: documento,
          edad: edad,
          numero_documento: paciente.numero_documento,
          tipo_documento: paciente.tipo_documento,
          nombre: paciente.nombre,
          apellido: paciente.apellido,
          fecha_nacimiento: paciente.fecha_nacimiento,
          genero: paciente.genero,
          telefono: paciente.telefono,
          email: paciente.email,
          direccion: paciente.direccion,
          ciudad: paciente.ciudad,
          fecha_registro: paciente.fecha_registro
        };
      });
      
      setpacientes(pacientesMapeados);
      
      // Si ya hay un paciente seleccionado, mantenerlo
      if (datospaciente.id && pacientesMapeados.length > 0) {
        const pacienteExistente = pacientesMapeados.find((p: any) => 
          p.id.toString() === datospaciente.id.toString()
        );
        if (pacienteExistente) {
          setpacienteSeleccionado(pacienteExistente);
        }
      }
      
      // Si no hay plan y no hay paciente seleccionado, mostrar selector
      if (!plan && !pacienteSeleccionado && pacientesMapeados.length > 0) {
        setShowSelectorpacientes(true);
      }
      
    } catch (error) {
      console.error("Error cargando pacientes:", error);
      
      // Mostrar mensaje de error
      let errorMessage = "Error al cargar los pacientes";
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch") || error.message.includes("Network")) {
          errorMessage = "No se pudo conectar con el servidor.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      alert(errorMessage);
      setpacientes([]);
      
      // Datos de ejemplo para desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log("Usando datos de ejemplo para desarrollo");
        const pacientesEjemplo = [
          {
            id: "1",
            nombre_completo: "María Pérez",
            documento: "12345678",
            edad: 35,
            telefono: "3001234567",
            email: "maria@ejemplo.com",
            direccion: "Calle 123 #45-67",
            fecha_nacimiento: "1989-05-15",
            genero: "Femenino"
          },
          {
            id: "2", 
            nombre_completo: "Juan Rodríguez",
            documento: "87654321",
            edad: 42,
            telefono: "3109876543",
            email: "juan@ejemplo.com",
            direccion: "Av. Principal #89-10",
            fecha_nacimiento: "1982-08-22",
            genero: "Masculino"
          },
          {
            id: "3",
            nombre_completo: "Ana Gómez",
            documento: "23456789",
            edad: 28,
            telefono: "3204567890",
            email: "ana@ejemplo.com",
            direccion: "Carrera 56 #12-34",
            fecha_nacimiento: "1996-03-10",
            genero: "Femenino"
          }
        ];
        setpacientes(pacientesEjemplo);
      }
    } finally {
      setCargandopacientes(false);
    }
  };
  
  const pacientesFiltrados = pacientes.filter(paciente => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase();
    const nombreCompleto = paciente.nombre_completo || `${paciente.nombre || ''} ${paciente.apellido || ''}`.toLowerCase();
    const documento = paciente.numero_documento || paciente.documento || '';
    const telefono = paciente.telefono || '';
    const email = paciente.email || '';
    
    return (
      nombreCompleto.includes(term) ||
      documento.toLowerCase().includes(term) ||
      telefono.includes(term) ||
      email.toLowerCase().includes(term)
    );
  });
  
  // ---------------------------
  // Función para seleccionar un paciente
  // ---------------------------
  const seleccionarpaciente = async (paciente: any) => {
    try {
      setpacienteSeleccionado(paciente);
      
      // Calcular edad si no está en los datos
      let edad = paciente.edad || 0;
      if (!edad && paciente.fecha_nacimiento) {
        const fechaNacimiento = new Date(paciente.fecha_nacimiento);
        const hoy = new Date();
        edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
        
        const mesCumple = fechaNacimiento.getMonth();
        const diaCumple = fechaNacimiento.getDate();
        const mesActual = hoy.getMonth();
        const diaActual = hoy.getDate();
        
        if (mesActual < mesCumple || (mesActual === mesCumple && diaActual < diaCumple)) {
          edad--;
        }
      }
      
      // Actualizar datos del paciente en el formulario
      setDatospaciente(prev => ({
        ...prev,
        id: paciente.id.toString(),
        identificacion: paciente.numero_documento || paciente.documento || '',
        nombre_completo: paciente.nombre_completo || `${paciente.nombre} ${paciente.apellido}`.trim(),
        edad: edad
      }));
      
      // Actualizar también la historia clínica con datos básicos
      setHistoriaClinica((prev: typeof historiaClinica) => ({
        ...prev,
        nombre_completo: paciente.nombre_completo || `${paciente.nombre} ${paciente.apellido}`.trim(),
        identificacion: paciente.numero_documento || paciente.documento || '',
        fecha_nacimiento: paciente.fecha_nacimiento || '',
        edad_calculada: edad,
        telefono: paciente.telefono || '',
        email: paciente.email || '',
        direccion: paciente.direccion || '',
        ciudad: paciente.ciudad || '',
        genero: paciente.genero || ''
      }));
      
      // Cerrar el selector
      setShowSelectorpacientes(false);
      
    } catch (error) {
      console.error("Error seleccionando paciente:", error);
      alert("Error al seleccionar el paciente");
    }
  };

  // ---------------------------
  // IMC en tiempo real
  // ---------------------------
  useEffect(() => {
    const p = parseFloat(datospaciente.peso.toString())
    const h = parseFloat(datospaciente.altura.toString())

    if (!p || !h || isNaN(p) || isNaN(h)) {
      setDatospaciente(prev => ({ ...prev, imc: 0, categoriaIMC: "" }))
      setHistoriaClinica((prev: typeof historiaClinica) => ({ ...prev, peso: datospaciente.peso, altura: datospaciente.altura, imc: 0 }))
      return
    }

    const imc = p / (h * h)
    const rounded = Math.round(imc * 100) / 100
    let categoria = ""
    if (rounded < 18.5) categoria = "Bajo peso"
    else if (rounded < 25) categoria = "Saludable"
    else if (rounded < 30) categoria = "Sobrepeso"
    else categoria = "Obesidad"

    setDatospaciente(prev => ({ ...prev, imc: rounded, categoriaIMC: categoria }))
    setHistoriaClinica((prev: typeof historiaClinica) => ({ ...prev, peso: datospaciente.peso, altura: datospaciente.altura, imc: rounded }))
  }, [datospaciente.peso, datospaciente.altura])

  // ===========================
  // FUNCIONES DEL ESQUEMA - CON NUEVAS FUNCIONALIDADES
  // ===========================

  // NUEVO: Función para alternar el modo de selección de zonas
  const toggleZoneSelectionMode = () => {
    const newZoneMode = !isZoneSelectionMode;
    setIsZoneSelectionMode(newZoneMode);
    setShowAdditionalButtons(newZoneMode);
    
    // Desactivar otros modos cuando se activa selección de zonas
    if (newZoneMode) {
      if (isDrawingMode) {
        setIsDrawingMode(false);
        svgDocuments.forEach(doc => {
          doc.documentElement.classList.remove('drawing-mode');
        });
      }
      if (isTextMode) {
        setIsTextMode(false);
        svgDocuments.forEach(doc => {
          doc.documentElement.classList.remove('text-mode');
        });
      }
    }
  };

  // NUEVO: Función para manejar los botones adicionales (1-7)
  const handleAdditionalButtonClick = (buttonNumber: number) => {
    alert(`Funcionalidad del botón ${buttonNumber} - Por implementar`);
  };

  const updateStrokeWidth = (value: number) => {
    setCurrentStrokeWidth(value);
  };

  const updateTextSize = (value: number) => {
    setCurrentTextSize(value);
  };

  const selectProcedure = (procedure: 'liposuction' | 'lipotransfer') => {
    setSelectedProcedure(procedure);
    selectedProcedureRef.current = procedure;
  };

  const toggleDrawingMode = () => {
    const newDrawingMode = !isDrawingMode;
    setIsDrawingMode(newDrawingMode);
    
    if (newDrawingMode) {
      setIsTextMode(false);
      if (isZoneSelectionMode) {
        setIsZoneSelectionMode(false);
        setShowAdditionalButtons(false);
      }
    }
    
    svgDocuments.forEach(doc => {
      const svgElement = doc.documentElement;
      if (newDrawingMode) {
        svgElement.classList.add('drawing-mode');
      } else {
        svgElement.classList.remove('drawing-mode');
      }
    });
  };

  const toggleTextMode = () => {
    const newTextMode = !isTextMode;
    setIsTextMode(newTextMode);
    
    if (newTextMode) {
      setIsDrawingMode(false);
      if (isZoneSelectionMode) {
        setIsZoneSelectionMode(false);
        setShowAdditionalButtons(false);
      }
    }
    
    svgDocuments.forEach(doc => {
      const svgElement = doc.documentElement;
      if (newTextMode) {
        svgElement.classList.add('text-mode');
      } else {
        svgElement.classList.remove('text-mode');
      }
    });
  };

  const openTextModal = (x: number, y: number, svgDoc: Document) => {
    setPendingTextPosition({ x, y, svgDoc });
    setShowTextModal(true);
  };

  const closeTextModal = () => {
    setShowTextModal(false);
    setPendingTextPosition(null);
    setTextInput("");
  };

  const addTextToSVG = () => {
    if (!pendingTextPosition || !textInput.trim()) {
      closeTextModal();
      return;
    }
    
    const textElement = pendingTextPosition.svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.setAttribute('x', pendingTextPosition.x.toString());
    textElement.setAttribute('y', pendingTextPosition.y.toString());
    textElement.setAttribute('fill', '#000000');
    textElement.setAttribute('font-size', currentTextSize.toString());
    textElement.setAttribute('font-family', 'Arial, sans-serif');
    textElement.setAttribute('font-weight', 'bold');
    textElement.textContent = textInput;
    textElement.classList.add('user-added-text');
    
    pendingTextPosition.svgDoc.documentElement.appendChild(textElement);
    
    setSelectionHistory(prev => [...prev, {
      element: textElement,
      type: 'text'
    }]);
    
    closeTextModal();
  };

  const removeTextElement = (textElement: SVGTextElement) => {
    if (textElement && textElement.parentNode) {
      textElement.parentNode.removeChild(textElement);
    }
  };

  const undoLastSelection = () => {
    if (selectionHistory.length === 0) return;
    
    const lastSelection = selectionHistory[selectionHistory.length - 1];
    if (lastSelection.type === 'zone') {
      removeProcedurePattern(lastSelection.element);
    } else if (lastSelection.type === 'freedraw') {
      removeFreeDrawPath(lastSelection.element);
    } else if (lastSelection.type === 'text') {
      removeTextElement(lastSelection.element);
    }
    
    setSelectionHistory(prev => prev.slice(0, -1));
  };

  const resetAllSelections = () => {
    selectionHistory.forEach(selection => {
      if (selection.type === 'zone') {
        removeProcedurePattern(selection.element);
      } else if (selection.type === 'freedraw') {
        removeFreeDrawPath(selection.element);
      } else if (selection.type === 'text') {
        removeTextElement(selection.element);
      }
    });
    setSelectionHistory([]);
    setZoneMarkings({});
  };

  const removeFreeDrawPath = (pathElement: SVGPathElement) => {
    if (pathElement && pathElement.parentNode) {
      pathElement.parentNode.removeChild(pathElement);
    }
  };

  const startDrawing = (e: MouseEvent, svgDoc: Document) => {
    if (isTextMode) {
      const pt = getSVGPoint(e, svgDoc);
      openTextModal(pt.x, pt.y, svgDoc);
      return;
    }
    
    if (!isDrawingMode) return;
    
    setIsDrawing(true);
    
    const pt = getSVGPoint(e, svgDoc);
    setPathPoints([pt]);
    
    const newPath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'path');
    newPath.classList.add('free-draw-path');
    newPath.setAttribute('fill', 'none');
    newPath.setAttribute('stroke', '#000000');
    newPath.setAttribute('stroke-width', currentStrokeWidth.toString());
    newPath.setAttribute('stroke-linecap', 'round');
    newPath.setAttribute('stroke-linejoin', 'round');
    
    svgDoc.documentElement.appendChild(newPath);
    setCurrentPath(newPath);
  };

  const continueDrawing = (e: MouseEvent, svgDoc: Document) => {
    if (isTextMode) return;
    if (!isDrawingMode || !isDrawing) return;
    
    const pt = getSVGPoint(e, svgDoc);
    setPathPoints(prev => [...prev, pt]);
    
    updatePathData();
  };

  const stopDrawing = (e: MouseEvent, svgDoc: Document) => {
    if (isTextMode) return;
    if (!isDrawingMode || !isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentPath && pathPoints.length > 2) {
      setSelectionHistory(prev => [...prev, {
        element: currentPath,
        type: 'freedraw'
      }]);
    } else if (currentPath) {
      currentPath.parentNode?.removeChild(currentPath);
    }
    
    setCurrentPath(null);
    setPathPoints([]);
  };

  const getSVGPoint = (e: MouseEvent, svgDoc: Document) => {
    // CORRECCIÓN: Usar type assertion a unknown primero, luego a SVGSVGElement
    const svg = svgDoc.documentElement as unknown as SVGSVGElement;
    const pt = svg.createSVGPoint();

    pt.x = e.clientX;
    pt.y = e.clientY;
    
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return { x: 0, y: 0 };
    
    return pt.matrixTransform(matrix);
  };

  const updatePathData = () => {
    if (!currentPath || pathPoints.length < 2) return;
    
    let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    
    for (let i = 1; i < pathPoints.length - 1; i++) {
      const xc = (pathPoints[i].x + pathPoints[i + 1].x) / 2;
      const yc = (pathPoints[i].y + pathPoints[i + 1].y) / 2;
      d += ` Q ${pathPoints[i].x} ${pathPoints[i].y}, ${xc} ${yc}`;
    }
    
    if (pathPoints.length > 1) {
      const last = pathPoints[pathPoints.length - 1];
      d += ` L ${last.x} ${last.y}`;
    }
    
    currentPath.setAttribute('d', d);
  };

  const createPatterns = (svgDoc: Document) => {
    let defs = svgDoc.querySelector('defs');
    if (!defs) {
      defs = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgDoc.documentElement.insertBefore(defs, svgDoc.documentElement.firstChild);
    }

    // Limpiar patrones existentes
    const existingPatterns = defs.querySelectorAll('pattern[id*="liposuction"], pattern[id*="lipotransfer"]');
    existingPatterns.forEach(pattern => {
      pattern.remove();
    });

    // Patrón de liposucción - LÍNEAS DIAGONALES ROJAS
    const lipoPattern = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    lipoPattern.setAttribute('id', 'liposuction-pattern');
    lipoPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    lipoPattern.setAttribute('width', '8');
    lipoPattern.setAttribute('height', '8');
    lipoPattern.setAttribute('patternTransform', 'rotate(45)');
    
    const lipoLine = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
    lipoLine.setAttribute('x1', '0');
    lipoLine.setAttribute('y1', '0');
    lipoLine.setAttribute('x2', '0');
    lipoLine.setAttribute('y2', '8');
    lipoLine.setAttribute('stroke', '#FF0000');
    lipoLine.setAttribute('stroke-width', '1.5');
    
    lipoPattern.appendChild(lipoLine);
    defs.appendChild(lipoPattern);

    // Patrón de lipotransferencia - CUADRÍCULA AZUL
    const transferPattern = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    transferPattern.setAttribute('id', 'lipotransfer-pattern');
    transferPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    transferPattern.setAttribute('width', '10');
    transferPattern.setAttribute('height', '10');
    
    // Línea horizontal azul
    const transferLineH = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
    transferLineH.setAttribute('x1', '0');
    transferLineH.setAttribute('y1', '0');
    transferLineH.setAttribute('x2', '10');
    transferLineH.setAttribute('y2', '0');
    transferLineH.setAttribute('stroke', '#0000FF');
    transferLineH.setAttribute('stroke-width', '1');
    
    // Línea vertical azul
    const transferLineV = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
    transferLineV.setAttribute('x1', '0');
    transferLineV.setAttribute('y1', '0');
    transferLineV.setAttribute('x2', '0');
    transferLineV.setAttribute('y2', '10');
    transferLineV.setAttribute('stroke', '#0000FF');
    transferLineV.setAttribute('stroke-width', '1');
    
    transferPattern.appendChild(transferLineH);
    transferPattern.appendChild(transferLineV);
    defs.appendChild(transferPattern);
    
    return defs;
  };

  const applyProcedurePattern = useCallback((element: SVGElement, procedure: 'liposuction' | 'lipotransfer') => {
    // Verificar que los patrones existan
    const svgDoc = element.ownerDocument;
    
    // Guardar el fill original si no está ya guardado
    const currentFill = element.getAttribute('fill');
    if (!element.hasAttribute('data-original-fill')) {
      element.setAttribute('data-original-fill', currentFill || 'none');
    }
    
    // Guardar la opacidad original
    const currentOpacity = element.style.fillOpacity || element.getAttribute('fill-opacity') || '0.09';
    if (!element.hasAttribute('data-original-opacity')) {
      element.setAttribute('data-original-opacity', currentOpacity);
    }
    
    // Limpiar y aplicar nuevo patrón
    element.style.fill = '';
    
    // Crear ID único para la zona si no existe
    if (!element.hasAttribute('data-zone-id')) {
      const zoneId = `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      element.setAttribute('data-zone-id', zoneId);
    }
    
    // Aplicar el patrón correcto
    if (procedure === 'liposuction') {
      element.setAttribute('fill', 'url(#liposuction-pattern)');
      element.setAttribute('data-procedure', 'liposuction');
      element.style.fillOpacity = '1';
    } else if (procedure === 'lipotransfer') {
      element.setAttribute('fill', 'url(#lipotransfer-pattern)');
      element.setAttribute('data-procedure', 'lipotransfer');
      element.style.fillOpacity = '1';
    }
    
    // Actualizar estado de zonas marcadas
    const zoneId = element.getAttribute('data-zone-id');
    if (zoneId) {
      setZoneMarkings(prev => ({
        ...prev,
        [zoneId]: procedure
      }));
    }
  }, []);

  const removeProcedurePattern = (element: SVGElement) => {
    const originalFill = element.getAttribute('data-original-fill');
    const originalOpacity = element.getAttribute('data-original-opacity');
    
    if (originalFill && originalFill !== 'none') {
      element.setAttribute('fill', originalFill);
    } else {
      element.removeAttribute('fill');
    }
    
    if (originalOpacity) {
      element.style.fillOpacity = originalOpacity;
    } else {
      element.style.fillOpacity = '';
    }
    
    element.removeAttribute('data-procedure');
    
    // Actualizar estado de zonas marcadas
    const zoneId = element.getAttribute('data-zone-id');
    if (zoneId) {
      setZoneMarkings(prev => {
        const newMarkings = { ...prev };
        delete newMarkings[zoneId];
        return newMarkings;
      });
    }
  };

  const initializeSchema = useCallback((objectElement: HTMLObjectElement) => {
    if (!objectElement) return;
    
    const handleLoad = () => {
      const svgDoc = objectElement.contentDocument;
      if (!svgDoc) return;

      // Agregar al array de documentos
      setSvgDocuments(prev => {
        const exists = prev.some(doc => doc === svgDoc);
        if (!exists) {
          return [...prev, svgDoc];
        }
        return prev;
      });

      // Crear patrones
      createPatterns(svgDoc);

      // CORRECCIÓN: Usar type assertion a unknown primero, luego a SVGSVGElement
      const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;
      
      svgElement.style.userSelect = 'none';
      svgElement.style.webkitUserSelect = 'none';
      
      // Configurar eventos
      svgElement.addEventListener('mousedown', (e) => startDrawing(e as MouseEvent, svgDoc));
      svgElement.addEventListener('mousemove', (e) => continueDrawing(e as MouseEvent, svgDoc));
      svgElement.addEventListener('mouseup', (e) => stopDrawing(e as MouseEvent, svgDoc));
      svgElement.addEventListener('mouseleave', (e) => stopDrawing(e as MouseEvent, svgDoc));

      // Encontrar zonas de forma más agresiva
      const possibleZoneElements = svgDoc.querySelectorAll('path, rect, circle, ellipse, polygon, g');
      
      possibleZoneElements.forEach((element: Element) => {
        const svgElement = element as SVGElement;
        
        // Marcar todos los elementos posibles como zonas
        if (!svgElement.classList.contains('zone')) {
          svgElement.classList.add('zone');
          svgElement.style.cursor = 'pointer';
          svgElement.style.pointerEvents = 'auto';
          
          // Asegurar que tenga algún fill para ser visible
          if (!svgElement.getAttribute('fill') && !svgElement.hasAttribute('data-original-fill')) {
            svgElement.setAttribute('data-original-fill', 'none');
          }
          
          // Guardar la opacidad original
          const originalOpacity = svgElement.style.fillOpacity || svgElement.getAttribute('fill-opacity') || '0.09';
          if (!svgElement.hasAttribute('data-original-opacity')) {
            svgElement.setAttribute('data-original-opacity', originalOpacity);
          }
          
          // Crear ID único para la zona
          if (!svgElement.hasAttribute('data-zone-id')) {
            const zoneId = `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            svgElement.setAttribute('data-zone-id', zoneId);
          }
          
          svgElement.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            if (isDrawingMode || isTextMode) {
              return;
            }
            
            const currentProcedureFromRef = selectedProcedureRef.current;
            const currentProcedure = svgElement.getAttribute('data-procedure');
            
            if (currentProcedure) {
              // Si ya tiene un procedimiento, removerlo
              removeProcedurePattern(svgElement);
              
              // Remover del historial
              setSelectionHistory(prev => prev.filter(item => 
                !(item.type === 'zone' && item.element === svgElement)
              ));
            } else {
              // Usar el valor actual del ref
              applyProcedurePattern(svgElement, currentProcedureFromRef);
              
              setSelectionHistory(prev => [...prev, {
                element: svgElement,
                procedure: currentProcedureFromRef,
                type: 'zone'
              }]);
            }
          });
        }
      });

      // Deshabilitar interacción con textos existentes
      const textElements = svgDoc.querySelectorAll('text');
      textElements.forEach(text => {
        text.style.pointerEvents = 'none';
        text.style.userSelect = 'none';
        text.style.webkitUserSelect = 'none';
      });

      // Aplicar clases según modo actual
      if (isDrawingMode) {
        svgElement.classList.add('drawing-mode');
      }
      if (isTextMode) {
        svgElement.classList.add('text-mode');
      }
    };

    objectElement.addEventListener('load', handleLoad);
    
    // Si ya está cargado
    if (objectElement.contentDocument) {
      handleLoad();
    }

    return () => {
      objectElement.removeEventListener('load', handleLoad);
    };
  }, [isDrawingMode, isTextMode, applyProcedurePattern]);

  // Inicializar los SVG cuando los refs estén listos
  useEffect(() => {
    if (bodySvgRef.current) {
      initializeSchema(bodySvgRef.current);
    }
    if (facialSvgRef.current) {
      initializeSchema(facialSvgRef.current);
    }
  }, [initializeSchema]);

  // Actualizar clases cuando cambian los modos
  useEffect(() => {
    svgDocuments.forEach(doc => {
      const svgElement = doc.documentElement as unknown as SVGSVGElement;
      if (isDrawingMode) {
        svgElement.classList.add('drawing-mode');
        svgElement.classList.remove('text-mode');
      } else if (isTextMode) {
        svgElement.classList.add('text-mode');
        svgElement.classList.remove('drawing-mode');
      } else {
        svgElement.classList.remove('drawing-mode', 'text-mode');
      }
    });
  }, [isDrawingMode, isTextMode, svgDocuments]);

  // Teclas de acceso rápido
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && showTextModal) {
        addTextToSVG();
      } else if (e.key === 'Escape' && showTextModal) {
        closeTextModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTextModal, textInput]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(event.target as Node)) {
        setShowSaveDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------
  // Manejar archivos ANTIGUO (mantener para compatibilidad)
  // ---------------------------
  const handleFilesOld = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).map(f => f.name)
    setImagenesAdjuntas(prev => [...prev, ...arr])
  }

  // Eliminar imagen adjunta ANTIGUA
  const eliminarImagenAdjunta = (index: number) => {
    setImagenesAdjuntas(prev => prev.filter((_, i) => i !== index))
  }

  // Calcular edad desde fecha nacimiento si se ingresa en historia
  useEffect(() => {
    const dob = historiaClinica.fecha_nacimiento
    if (!dob) return
    const diff = Date.now() - new Date(dob).getTime()
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
    setHistoriaClinica((prev: typeof historiaClinica) => ({ ...prev, edad_calculada: age }))
    setDatospaciente(prev => ({ ...prev, edad: age }))
  }, [historiaClinica.fecha_nacimiento])

  // Guardar esquema
  const handleSaveSchema = async (format: 'png' | 'pdf') => {
    setShowSaveDropdown(false);
    alert(`Funcionalidad de exportar a ${format.toUpperCase()} será implementada con html2canvas y jsPDF`);
  };

  // ---------------------------
  // Guardar plan quirúrgico
  // ---------------------------
  const handleSubmit = () => {
    if (!plan && !datospaciente.id) {
      alert("Debe seleccionar un paciente antes de guardar")
      return
    }

    // Función para limpiar y convertir valores numéricos
    const limpiarValorNumerico = (valor: any): number | null => {
      if (valor === null || valor === undefined || valor === '') {
        return null;
      }
      const num = parseFloat(valor.toString());
      return isNaN(num) ? null : num;
    };

    // Preparar datos limpios
    const datospacienteLimpios = {
      id: datospaciente.id,
      identificacion: datospaciente.identificacion,
      edad: limpiarValorNumerico(datospaciente.edad) || 0,
      nombre_completo: datospaciente.nombre_completo,
      peso: limpiarValorNumerico(datospaciente.peso) || 0,
      altura: limpiarValorNumerico(datospaciente.altura) || 0,
      imc: limpiarValorNumerico(datospaciente.imc) || 0,
      categoriaIMC: datospaciente.categoriaIMC,
      fecha_consulta: datospaciente.fecha_consulta,
      hora_consulta: datospaciente.hora_consulta,
    };

    const historiaClinicaLimpia = {
      ...historiaClinica,
      edad_calculada: limpiarValorNumerico(historiaClinica.edad_calculada) || 0,
      peso: limpiarValorNumerico(historiaClinica.peso) || 0,
      altura: limpiarValorNumerico(historiaClinica.altura) || 0,
      imc: limpiarValorNumerico(historiaClinica.imc) || 0,
    };

    const conductaQuirurgicaLimpia = {
      ...conductaQuirurgica,
      duracion_estimada: limpiarValorNumerico(conductaQuirurgica.duracion_estimada),
    };

    //  IMPORTANTE: Extraer solo el ID numérico para el plan
    const planIdNum = plan?.id ? plan.id.replace('plan_', '') : '';

    const nuevoPlan: PlanQuirurgico = {
      id: plan?.id ?? `plan_${Date.now()}`,
      id_paciente: datospaciente.id || plan?.id_paciente || "",
      id_usuario: plan?.id_usuario ?? "1",
      fecha_creacion: plan?.fecha_creacion ?? new Date().toISOString(),
      fecha_modificacion: new Date().toISOString(),
      datos_paciente: datospacienteLimpios,
      historia_clinica: historiaClinicaLimpia,
      cirugias_previas: [],
      conducta_quirurgica: conductaQuirurgicaLimpia,
      dibujos_esquema: [],
      notas_doctor: notasDoctor,
      imagenes_adjuntas: archivosCargados.length > 0 ? archivosCargados : imagenesAdjuntas,
      esquema_mejorado: {
        zoneMarkings,
        selectionHistory,
        currentStrokeWidth,
        currentTextSize,
        selectedProcedure
      }
    }

    onGuardar(nuevoPlan)
  }

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div className="space-y-8">

      {/* BOTÓN CANCELAR (solo si viene de onCancel) */}
      {onCancel && (
        <div className="mb-4">
          <button
            onClick={onCancel}
            className="text-[#1a6b32] hover:text-[#155228] font-medium flex items-center gap-2"
          >
            ← Volver
          </button>
        </div>
      )}

      {/* SELECTOR DE paciente (solo cuando se crea nuevo o no hay selección) */}
      {(!plan || !pacienteSeleccionado) && (
        <section className="p-4 border rounded bg-white">
          <h3 className="font-bold text-lg text-[#1a6b32] mb-3">
            {plan ? "paciente del Plan" : "Seleccionar paciente"}
          </h3>
          
          {pacienteSeleccionado ? (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-green-800">
                    paciente seleccionado: {pacienteSeleccionado.nombre_completo}
                  </div>
                  <div className="text-sm text-green-700">
                    Documento: {pacienteSeleccionado.numero_documento || pacienteSeleccionado.documento} | 
                    Edad: {datospaciente.edad} años | 
                    Tel: {pacienteSeleccionado.telefono || 'No registrado'}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {pacienteSeleccionado.email ? `Email: ${pacienteSeleccionado.email}` : ''}
                    {pacienteSeleccionado.direccion ? ` | Dirección: ${pacienteSeleccionado.direccion}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => setShowSelectorpacientes(true)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Cambiar paciente
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowSelectorpacientes(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-[#1a6b32] hover:bg-green-50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl">👤</span>
                  <span className="font-medium text-gray-700">Seleccionar paciente</span>
                  <span className="text-sm text-gray-500">Haz clic para elegir un paciente de la lista</span>
                </div>
              </button>
              
              {/* Mostrar cargando si está cargando pacientes */}
              {cargandopacientes && (
                <div className="mt-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#1a6b32] mb-2"></div>
                  <p className="text-sm text-gray-600">Cargando lista de pacientes...</p>
                </div>
              )}
            </div>
          )}

          {/* Modal/Selector de pacientes */}
          {showSelectorpacientes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
              {/* Encabezado */}
              <div className="p-4 border-b flex justify-between items-center bg-[#1a6b32] text-white">
                <div>
                  <h3 className="text-lg font-semibold">Seleccionar paciente</h3>
                  <p className="text-sm opacity-90">Seleccione un paciente para el plan quirúrgico</p>
                </div>
                <button
                  onClick={() => setShowSelectorpacientes(false)}
                  className="text-white hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Barra de búsqueda */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, apellido o documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a6b32]"
                  />
                </div>
              </div>
              
              {/* Contenido principal */}
              <div className="flex-1 overflow-hidden">
                {cargandopacientes ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a6b32] mx-auto mb-3"></div>
                      <p className="text-gray-600">Cargando pacientes...</p>
                    </div>
                  </div>
                ) : pacientes.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <span className="text-3xl mb-3 block">😕</span>
                      <p className="text-gray-600">No hay pacientes registrados</p>
                      <button
                        onClick={cargarpacientes}
                        className="mt-3 px-4 py-2 bg-[#1a6b32] text-white rounded hover:bg-[#155228]"
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto">
                    {/* Tabla */}
                    <div className="min-w-full">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre Completo</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Documento</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Teléfono</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Edad</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {pacientesFiltrados.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                {searchTerm ? "No se encontraron pacientes con ese criterio" : "No hay pacientes registrados"}
                              </td>
                            </tr>
                          ) : (
                            pacientesFiltrados.map((paciente) => (
                              <tr 
                                key={paciente.id} 
                                className="hover:bg-gray-50 transition cursor-pointer"
                                onClick={() => seleccionarpaciente(paciente)}
                              >
                                <td className="px-6 py-4 text-sm">
                                  <p className="font-medium text-gray-800">
                                    {paciente.nombre_completo || `${paciente.nombre} ${paciente.apellido}`.trim()}
                                  </p>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {paciente.numero_documento || paciente.documento}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {paciente.telefono || "No registrado"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {paciente.edad || 'No especificada'} años
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {paciente.email || "No registrado"}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="flex items-center justify-center">
                                    <button
                                      onClick={() => seleccionarpaciente(paciente)}
                                      className="px-3 py-1 bg-[#1a6b32] text-white text-sm rounded hover:bg-[#155228] transition"
                                    >
                                      Seleccionar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Pie de página */}
              <div className="p-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {pacientes.length > 0 && (
                    <>
                      Mostrando <span className="font-bold">{pacientesFiltrados.length}</span> de{" "}
                      <span className="font-bold">{pacientes.length}</span> paciente{pacientes.length !== 1 ? 's' : ''}
                      {searchTerm && ` - Búsqueda: "${searchTerm}"`}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSelectorpacientes(false)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={cargarpacientes}
                    disabled={cargandopacientes}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className={cargandopacientes ? "animate-spin" : ""}>↻</span>
                    Recargar lista
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </section>
      )}

      {/* DATOS DEL paciente */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Datos del paciente</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Identificación</label>
            <input 
              className="w-full border p-2 rounded bg-gray-50" 
              placeholder="Identificación" 
              value={datospaciente.identificacion}
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de consulta</label>
            <input 
              className="w-full border p-2 rounded" 
              type="date" 
              value={datospaciente.fecha_consulta || new Date().toISOString().split('T')[0]}
              onChange={e => setDatospaciente(prev => ({ ...prev, fecha_consulta: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora de consulta</label>
            <input 
              className="w-full border p-2 rounded" 
              type="time" 
              value={datospaciente.hora_consulta || new Date().toTimeString().slice(0, 5)}
              onChange={e => setDatospaciente(prev => ({ ...prev, hora_consulta: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input 
              className="w-full border p-2 rounded bg-gray-50" 
              placeholder="Nombre completo" 
              value={datospaciente.nombre_completo}
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
            <input 
              className="w-full border p-2 rounded" 
              type="number" 
              step="0.1"
              placeholder="Peso (kg)" 
              value={datospaciente.peso}
              onChange={e => setDatospaciente(prev => ({ ...prev, peso: e.target.value }))} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Altura (m)</label>
            <input 
              className="w-full border p-2 rounded" 
              type="number" 
              step="0.01"
              placeholder="Altura (m)" 
              value={datospaciente.altura}
              onChange={e => setDatospaciente(prev => ({ ...prev, altura: e.target.value }))} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
            <input 
              className="w-full border p-2 rounded" 
              type="date" 
              placeholder="Fecha de nacimiento"
              value={historiaClinica.fecha_nacimiento}
              onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({ ...prev, fecha_nacimiento: e.target.value }))}
            />
          </div>
          
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-sm font-semibold">IMC: {datospaciente.imc ? datospaciente.imc.toFixed(1) : "—"}</div>
            <div className="text-xs text-gray-600">Categoría: {datospaciente.categoriaIMC || "—"}</div>
            <div className="text-xs text-gray-600">Edad: {historiaClinica.edad_calculada || datospaciente.edad || "—"} años</div>
          </div>
        </div>
      </section>

      {/* =========================== */}
      {/* ESQUEMA MEJORADO - VERSIÓN CON EDITOR SEPARADO */}
      {/* =========================== */}
      <section className="p-4 border rounded bg-white">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Editor de Esquemas</h3>
          <button
            onClick={() => setShowEsquemaViewer(true)}
            className="px-6 py-2 bg-[#1a6b32] text-white rounded-lg hover:bg-[#155427] flex items-center gap-2"
          >
            🎨 Abrir Editor de Esquemas
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Abre el editor interactivo para marcar zonas de liposucción, lipotransferencia, agregar texto y dibujos libres.
        </p>
      </section>
      
      {/* VISOR DE ESQUEMAS - MODAL */}
      {showEsquemaViewer && (
        <EsquemaViewer 
          onClose={() => setShowEsquemaViewer(false)} 
          planId={plan?.id}
        />
      )}

      {/* =========================== */}
      {/* SECCIÓN MEJORADA PARA ARCHIVOS */}
      {/* =========================== */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Archivos Adjuntos del Plan</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Suba imágenes del paciente, estudios previos, PDFs de consentimiento informado o cualquier documento relevante para el plan quirúrgico.
            Formatos permitidos: JPG, PNG, GIF, BMP, WebP, PDF. Máximo 10MB por imagen, 15MB por PDF.
          </p>
          
          {/* Área para subir archivos */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1a6b32] transition-colors">
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              onChange={handleFileSelect} 
              className="hidden" 
              id="plan-file-upload"
              accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf,image/*,application/pdf"
            />
            <label htmlFor="plan-file-upload" className="cursor-pointer block">
              <div className="flex flex-col items-center justify-center gap-3">
                <Upload className="text-gray-400" size={32} />
                <div>
                  <span className="font-medium text-gray-700">Haga clic para seleccionar archivos</span>
                  <p className="text-sm text-gray-500 mt-1">o arrastre y suelte archivos aquí</p>
                </div>
                <span className="text-xs text-gray-400">
                  Se permiten imágenes y PDFs (máx. 10MB imágenes, 15MB PDFs)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Lista de archivos cargados */}
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-3">Archivos cargados ({archivosCargados.length})</h4>
          
          {isLoadingArchivos ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#1a6b32] mb-2"></div>
              <p className="text-sm text-gray-600">Cargando archivos...</p>
            </div>
          ) : archivosCargados.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <span className="text-3xl mb-2 block">📁</span>
              <p className="text-gray-500">No hay archivos adjuntos</p>
              <p className="text-sm text-gray-400 mt-1">Suba archivos usando el botón de arriba</p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivosCargados.map((url, index) => {
                const fileName = getFileNameFromUrl(url);
                const fileIcon = getFileIcon(fileName);
                const isUploading = uploadingFiles[fileName];
                const uploadProgressValue = uploadProgress[fileName] || 0;
                
                return (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl">{fileIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate" title={fileName}>
                            {fileName}
                          </span>
                          {isUploading && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Subiendo...
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Archivo {index + 1} de {archivosCargados.length}
                        </div>
                        
                        {/* Barra de progreso para archivos en subida */}
                        {isUploading && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgressValue}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 text-right mt-1">
                              {uploadProgressValue}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewFile(url)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                        title="Ver archivo"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDownloadFile(url, fileName)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                        title="Descargar archivo"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(url, index)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                        title="Eliminar archivo"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* NOTAS Y ARCHIVOS ADJUNTOS (MANTENER PARA COMPATIBILIDAD) */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Notas del Doctor</h3>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas del doctor</label>
          <textarea 
            className="w-full border p-2 rounded" 
            rows={4}
            placeholder="Escriba aquí las observaciones, notas o comentarios importantes..." 
            value={notasDoctor} 
            onChange={e => setNotasDoctor(e.target.value)} 
          />
        </div>
      </section>

      {/* CONDUCTA QUIRÚRGICA */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Conducta Quirúrgica</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo QX (Horas)</label>
            <input 
              className="w-full border p-2 rounded" 
              type="number" 
              placeholder="Ej: 120" 
              value={conductaQuirurgica.duracion_estimada} 
              onChange={e => setConductaQuirurgica((prev: ConductaQuirurgica) => ({...prev, duracion_estimada: e.target.value}))} 
              min="0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de anestesia</label>
            <select className="w-full border p-2 rounded" value={conductaQuirurgica.tipo_anestesia} onChange={e => setConductaQuirurgica((prev: ConductaQuirurgica) => ({...prev, tipo_anestesia: e.target.value}))}>
              <option value="general">General</option>
              <option value="peridural">Peridural</option>
              <option value="sedacion">Sedación</option>
              <option value="local">Local</option>
              <option value="ninguna">Ninguna</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={conductaQuirurgica.requiere_hospitalizacion} 
                onChange={e => setConductaQuirurgica((prev: ConductaQuirurgica) => ({...prev, requiere_hospitalizacion: e.target.checked}))} 
              /> 
              Requiere hospitalización
            </label>
          </div>
          
          {conductaQuirurgica.requiere_hospitalizacion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo hospitalización</label>
              <input 
                className="w-full border p-2 rounded" 
                placeholder="Tiempo hospitalización" 
                value={conductaQuirurgica.tiempo_hospitalizacion} 
                onChange={e => setConductaQuirurgica((prev: ConductaQuirurgica) => ({...prev, tiempo_hospitalizacion: e.target.value}))} 
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resección estimada</label>
            <input 
              className="w-full border p-2 rounded" 
              placeholder="Resección estimada" 
              value={conductaQuirurgica.reseccion_estimada} 
              onChange={e => setConductaQuirurgica((prev: ConductaQuirurgica) => ({...prev, reseccion_estimada: e.target.value}))} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma cirujano (URL opcional)</label>
            <input 
              className="w-full border p-2 rounded" 
              placeholder="Firma cirujano (dataURL opcional)" 
              value={conductaQuirurgica.firma_cirujano} 
              onChange={e => setConductaQuirurgica((prev: ConductaQuirurgica) => ({...prev, firma_cirujano: e.target.value}))} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma paciente (URL opcional)</label>
            <input 
              className="w-full border p-2 rounded" 
              placeholder="Firma paciente (dataURL opcional)" 
              value={conductaQuirurgica.firma_paciente} 
              onChange={e => setConductaQuirurgica((prev: ConductaQuirurgica) => ({...prev, firma_paciente: e.target.value}))} 
            />
          </div>
        </div>
      </section>

      {/* HISTORIA CLÍNICA */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Historia Clínica Completa</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ocupación</label>
            <input className="w-full border p-2 rounded" placeholder="Ocupación" value={historiaClinica.ocupacion} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, ocupacion: e.target.value}))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entidad</label>
            <input className="w-full border p-2 rounded" placeholder="Entidad" value={historiaClinica.entidad} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, entidad: e.target.value}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
            <input className="w-full border p-2 rounded" type="date" placeholder="Fecha de nacimiento" value={historiaClinica.fecha_nacimiento} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, fecha_nacimiento: e.target.value}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input className="w-full border p-2 rounded" placeholder="Teléfono" value={historiaClinica.telefono} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, telefono: e.target.value}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
            <input className="w-full border p-2 rounded" placeholder="Celular" value={historiaClinica.celular} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, celular: e.target.value}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input className="w-full border p-2 rounded" placeholder="Dirección" value={historiaClinica.direccion} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, direccion: e.target.value}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="w-full border p-2 rounded" placeholder="Email" value={historiaClinica.email} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, email: e.target.value}))} />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de consulta</label>
          <textarea 
            className="w-full border p-2 rounded" 
            rows={3}
            placeholder="Motivo de consulta" 
            value={historiaClinica.motivo_consulta} 
            onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, motivo_consulta: e.target.value}))} 
          />
        </div>

        <h4 className="font-semibold mt-3 mb-2">Enfermedad actual</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Object.keys(historiaClinica.enfermedad_actual).map((k: any) => (
            <label key={k} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
              <input 
                type="checkbox" 
                checked={(historiaClinica.enfermedad_actual as any)[k]} 
                onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({
                  ...prev, 
                  enfermedad_actual: {
                    ...prev.enfermedad_actual, 
                    [k]: e.target.checked
                  }
                }))} 
              />
              <span className="text-sm capitalize">{k.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>

        <h4 className="font-semibold mt-3 mb-2">Antecedentes</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farmacológicos</label>
            <input className="w-full border p-2 rounded" placeholder="Farmacológicos" value={historiaClinica.antecedentes.farmacologicos} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, antecedentes: {...prev.antecedentes, farmacologicos: e.target.value}}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Traumáticos</label>
            <input className="w-full border p-2 rounded" placeholder="Traumáticos" value={historiaClinica.antecedentes.traumaticos} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, antecedentes: {...prev.antecedentes, traumaticos: e.target.value}}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quirúrgicos</label>
            <input className="w-full border p-2 rounded" placeholder="Quirúrgicos" value={historiaClinica.antecedentes.quirurgicos} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, antecedentes: {...prev.antecedentes, quirurgicos: e.target.value}}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alérgicos</label>
            <input className="w-full border p-2 rounded" placeholder="Alérgicos" value={historiaClinica.antecedentes.alergicos} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, antecedentes: {...prev.antecedentes, alergicos: e.target.value}}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tóxicos</label>
            <input className="w-full border p-2 rounded" placeholder="Tóxicos" value={historiaClinica.antecedentes.toxicos} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, antecedentes: {...prev.antecedentes, toxicos: e.target.value}}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hábitos</label>
            <input className="w-full border p-2 rounded" placeholder="Hábitos" value={historiaClinica.antecedentes.habitos} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, antecedentes: {...prev.antecedentes, habitos: e.target.value}}))} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ginecológicos</label>
            <input className="w-full border p-2 rounded" placeholder="Ginecológicos" value={historiaClinica.antecedentes.ginecologicos} onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, antecedentes: {...prev.antecedentes, ginecologicos: e.target.value}}))} />
          </div>
          
          <div className="flex items-center p-2">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={historiaClinica.antecedentes.fuma === "si"} 
                onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({
                  ...prev, 
                  antecedentes: {
                    ...prev.antecedentes, 
                    fuma: e.target.checked ? "si" : "no"
                  }
                }))} 
              /> 
              Fuma
            </label>
          </div>
        </div>

        <h4 className="font-semibold mt-3 mb-2">Examen físico (notas)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.keys(historiaClinica.notas_corporales).map((k: any) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{k}</label>
              <textarea 
                className="w-full border p-2 rounded" 
                rows={2}
                placeholder={k} 
                value={(historiaClinica.notas_corporales as any)[k]} 
                onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({
                  ...prev, 
                  notas_corporales: {
                    ...prev.notas_corporales, 
                    [k]: e.target.value
                  }
                }))} 
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
          <input 
            className="w-full border p-2 rounded" 
            placeholder="Diagnóstico" 
            value={historiaClinica.diagnostico} 
            onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, diagnostico: e.target.value}))} 
          />
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan de conducta</label>
          <textarea 
            className="w-full border p-2 rounded" 
            rows={3}
            placeholder="Plan de conducta" 
            value={historiaClinica.plan_conducta} 
            onChange={e => setHistoriaClinica((prev: typeof historiaClinica) => ({...prev, plan_conducta: e.target.value}))} 
          />
        </div>

      </section>

      {/* BOTÓN GUARDAR */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          {onCancel && (
            <button 
              onClick={onCancel} 
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => {
              // Validar campos requeridos
              if (!datospaciente.nombre_completo) {
                alert("El nombre completo del paciente es requerido")
                return
              }
              if (!datospaciente.identificacion) {
                alert("La identificación del paciente es requerida")
                return
              }
              handleSubmit()
            }} 
            className="bg-[#1a6b32] text-white px-6 py-3 rounded-lg hover:bg-[#155228]"
          >
            {plan ? "Actualizar Plan Quirúrgico" : "Guardar Plan Quirúrgico"}
          </button>
        </div>
      </div>

    </div>
  )
}