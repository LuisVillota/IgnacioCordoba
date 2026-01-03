"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { PlanQuirurgico } from "../types/planQuirurgico"
import { EsquemaViewer } from "../components/EsquemaViewer" 

type ProcedureType = 'lipo' | 'lipotras' | 'musculo' | 'incision';

interface Props {
  plan?: PlanQuirurgico
  onGuardar: (plan: PlanQuirurgico) => void
}

interface DibujoAccion {
  tipo: ProcedureType;
  x: number;
  y: number;
  timestamp: number;
  tamaño: number;
}

type ZoneMarkingsSVG = { [zoneId: string]: 'liposuction' | 'lipotransfer' | null };

interface Props {
  plan?: PlanQuirurgico;
  onGuardar: (plan: PlanQuirurgico) => void;
}

export const PlanQuirurgicoForm: React.FC<Props> = ({ plan, onGuardar }) => {

   const [showEsquemaViewer, setShowEsquemaViewer] = useState(false)
  // ---------------------------
  // Datos paciente
  // ---------------------------
  const [datosPaciente, setDatosPaciente] = useState({
    id: plan?.datos_paciente?.id ?? `pac_${Date.now()}`,
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
  // Historia clínica
  // ---------------------------
  const [historiaClinica, setHistoriaClinica] = useState(plan?.historia_clinica ?? {
    nombre_completo: datosPaciente.nombre_completo,
    identificacion: datosPaciente.identificacion,
    ocupacion: "",
    fecha_nacimiento: "",
    edad_calculada: 0,
    referido_por: "",
    entidad: "",
    telefono: "",
    celular: "",
    direccion: "",
    email: "",
    motivo_consulta: "",
    motivo_consulta_detalle: "",
    enfermedad_actual: {
      hepatitis: false,
      discrasia_sanguinea: false,
      cardiopatias: false,
      hipertension: false,
      reumatologicas: false,
      diabetes: false,
      neurologicas: false,
      enfermedad_mental: false,
      no_refiere: true,
    },
    antecedentes: {
      farmacologicos: "",
      traumaticos: "",
      quirurgicos: "",
      alergicos: "",
      toxicos: "",
      habitos: "",
      ginecologicos: "",
      fuma: "no",
      planificacion: "",
    },
    enfermedades_piel: false,
    tratamientos_esteticos: "",
    antecedentes_familiares: "",
    peso: datosPaciente.peso,
    altura: datosPaciente.altura,
    imc: datosPaciente.imc,
    contextura: "",
    notas_corporales: {
      cabeza: "",
      mamas: "",
      tcs: "",
      abdomen: "",
      gluteos: "",
      extremidades: "",
      pies_faneras: "",
    },
    diagnostico: "",
    plan_conducta: "",
  })

  // ---------------------------
  // Cirugías previas, conducta quirúrgica, notas, imágenes
  // ---------------------------
  const [cirugiasPrevias, setCirugiasPrevias] = useState(plan?.cirugias_previas ?? [])
  const [nuevaCirugia, setNuevaCirugia] = useState({ fecha: "", procedimiento: "", descripcion: "", detalles: "" })
  const [conductaQuirurgica, setConductaQuirurgica] = useState(plan?.conducta_quirurgica ?? {
    duracion_estimada: "",
    tipo_anestesia: "ninguna",
    requiere_hospitalizacion: false,
    tiempo_hospitalizacion: "",
    reseccion_estimada: "",
    firma_cirujano: "",
    firma_paciente: "",
  })
  const [notasDoctor, setNotasDoctor] = useState(plan?.notas_doctor ?? "")
  const [imagenesAdjuntas, setImagenesAdjuntas] = useState<string[]>(plan?.imagenes_adjuntas ?? [])

  // ===========================
  // NUEVO ESQUEMA MEJORADO CON TODAS LAS FUNCIONALIDADES
  // ===========================
  const [selectionHistory, setSelectionHistory] = useState<Array<any>>([]);
  const [svgDocuments, setSvgDocuments] = useState<Array<Document>>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<'liposuction' | 'lipotransfer'>('liposuction');
  // REFERENCIA para el procedimiento actual (para que los event listeners accedan al valor actual)
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
  const [zoneMarkings, setZoneMarkings] = useState<ZoneMarkingsSVG>({});

  const bodySvgRef = useRef<HTMLObjectElement>(null);
  const facialSvgRef = useRef<HTMLObjectElement>(null);
  const saveDropdownRef = useRef<HTMLDivElement>(null);

  // ---------------------------
  // Efecto para sincronizar el ref con el estado
  // ---------------------------
  useEffect(() => {
    selectedProcedureRef.current = selectedProcedure;
    console.log('Procedimiento actualizado en ref:', selectedProcedure);
  }, [selectedProcedure]);

  // ---------------------------
  // Efecto para inicializar fecha y hora automáticamente
  // ---------------------------
  useEffect(() => {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().slice(0, 5);
    
    setDatosPaciente(prev => ({
      ...prev,
      fecha_consulta: prev.fecha_consulta || fecha,
      hora_consulta: prev.hora_consulta || hora
    }));
  }, []);

  // ---------------------------
  // IMC en tiempo real
  // ---------------------------
  useEffect(() => {
    const p = parseFloat(datosPaciente.peso.toString())
    const h = parseFloat(datosPaciente.altura.toString())

    if (!p || !h || isNaN(p) || isNaN(h)) {
      setDatosPaciente(prev => ({ ...prev, imc: 0, categoriaIMC: "" }))
      setHistoriaClinica(prev => ({ ...prev, peso: datosPaciente.peso, altura: datosPaciente.altura, imc: 0 }))
      return
    }

    const imc = p / (h * h)
    const rounded = Math.round(imc * 100) / 100
    let categoria = ""
    if (rounded < 18.5) categoria = "Bajo peso"
    else if (rounded < 25) categoria = "Saludable"
    else if (rounded < 30) categoria = "Sobrepeso"
    else categoria = "Obesidad"

    setDatosPaciente(prev => ({ ...prev, imc: rounded, categoriaIMC: categoria }))
    setHistoriaClinica(prev => ({ ...prev, peso: datosPaciente.peso, altura: datosPaciente.altura, imc: rounded }))
  }, [datosPaciente.peso, datosPaciente.altura])

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
    console.log(`Botón adicional ${buttonNumber} presionado`);
    // Aquí puedes agregar la funcionalidad específica para cada botón
    alert(`Funcionalidad del botón ${buttonNumber} - Por implementar`);
  };

  const updateStrokeWidth = (value: number) => {
    setCurrentStrokeWidth(value);
  };

  const updateTextSize = (value: number) => {
    setCurrentTextSize(value);
  };

  const selectProcedure = (procedure: 'liposuction' | 'lipotransfer') => {
    console.log('Seleccionando procedimiento en UI:', procedure);
    setSelectedProcedure(procedure);
    // También actualizar el ref inmediatamente
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
    const svg = svgDoc.documentElement;
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
      console.log('Eliminando patrón existente:', pattern.id);
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
    
    console.log('Patrón de liposucción creado (líneas diagonales rojas)');

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
    
    console.log('Patrón de lipotransferencia creado (cuadrícula azul)');
    
    return defs;
  };

  const applyProcedurePattern = useCallback((element: SVGElement, procedure: 'liposuction' | 'lipotransfer') => {
    console.log('Aplicando procedimiento:', procedure, 'a elemento:', element);
    
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
      console.log('Aplicado patrón de liposucción (líneas diagonales rojas)');
    } else if (procedure === 'lipotransfer') {
      element.setAttribute('fill', 'url(#lipotransfer-pattern)');
      element.setAttribute('data-procedure', 'lipotransfer');
      element.style.fillOpacity = '1';
      console.log('Aplicado patrón de lipotransferencia (cuadrícula azul)');
    }
    
    // Actualizar estado de zonas marcadas
    const zoneId = element.getAttribute('data-zone-id');
    if (zoneId) {
      setZoneMarkings(prev => ({
        ...prev,
        [zoneId]: procedure
      }));
      console.log('Zona marcada:', zoneId, 'con procedimiento:', procedure);
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

      const svgElement = svgDoc.documentElement;
      
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
          
          // SOLUCIÓN: Usar una función que acceda a la referencia actual
          svgElement.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            if (isDrawingMode || isTextMode) {
              return;
            }
            
            // CORRECCIÓN CRÍTICA: Usar la referencia, no el estado
            const currentProcedureFromRef = selectedProcedureRef.current;
            console.log('Zona clickeada, procedimiento seleccionado (desde ref):', currentProcedureFromRef);
            
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
      const svgElement = doc.documentElement;
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

  // agregar cirugía previa
  const agregarCirugiaPrev = () => {
    if (!nuevaCirugia.procedimiento) return
    setCirugiasPrevias(prev => [
      ...prev,
      {
        id: `cp_${Date.now()}`,
        fecha: nuevaCirugia.fecha || new Date().toISOString().slice(0,10),
        procedimiento: nuevaCirugia.procedimiento,
        descripcion: nuevaCirugia.descripcion,
        detalles: nuevaCirugia.detalles,
      }
    ])
    setNuevaCirugia({ fecha: "", procedimiento: "", descripcion: "", detalles: "" })
  }

  // Manejar archivos
  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).map(f => f.name)
    setImagenesAdjuntas(prev => [...prev, ...arr])
  }

  // Calcular edad desde fecha nacimiento si se ingresa en historia
  useEffect(() => {
    const dob = historiaClinica.fecha_nacimiento
    if (!dob) return
    const diff = Date.now() - new Date(dob).getTime()
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
    setHistoriaClinica(prev => ({ ...prev, edad_calculada: age }))
    setDatosPaciente(prev => ({ ...prev, edad: age }))
  }, [historiaClinica.fecha_nacimiento])

  // Guardar esquema
  const handleSaveSchema = async (format: 'png' | 'pdf') => {
    setShowSaveDropdown(false);
    alert(`Funcionalidad de exportar a ${format.toUpperCase()} será implementada con html2canvas y jsPDF`);
  };

  // ---------------------------
  // Guardar
  // ---------------------------
  const handleSubmit = () => {
    const nuevoPlan: PlanQuirurgico = {
      id: plan?.id ?? `plan_${Date.now()}`,
      id_paciente: datosPaciente.id,
      id_usuario: plan?.id_usuario ?? "doctor_001",
      fecha_creacion: plan?.fecha_creacion ?? new Date().toISOString(),
      fecha_modificacion: new Date().toISOString(),
      datos_paciente: {
        id: datosPaciente.id,
        identificacion: datosPaciente.identificacion,
        edad: datosPaciente.edad,
        nombre_completo: datosPaciente.nombre_completo,
        peso: datosPaciente.peso,
        altura: datosPaciente.altura,
        imc: datosPaciente.imc,
        categoriaIMC: datosPaciente.categoriaIMC,
        fecha_consulta: datosPaciente.fecha_consulta,
        hora_consulta: datosPaciente.hora_consulta,
      },
      historia_clinica: historiaClinica,
      cirugias_previas: cirugiasPrevias,
      conducta_quirurgica: conductaQuirurgica,
      dibujos_esquema: [], // Se mantiene por compatibilidad
      notas_doctor: notasDoctor,
      imagenes_adjuntas: imagenesAdjuntas,
      estado: plan?.estado ?? "borrador",
      // Nuevos campos para el esquema mejorado
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

      {/* DATOS DEL PACIENTE */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Datos del Paciente</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input 
            className="border p-2" 
            placeholder="Identificación" 
            value={datosPaciente.identificacion}
            onChange={e => setDatosPaciente(prev => ({ ...prev, identificacion: e.target.value }))} 
          />
          
          {/* Fecha de consulta automática */}
          <input 
            className="border p-2 bg-gray-50" 
            type="date" 
            value={datosPaciente.fecha_consulta || new Date().toISOString().split('T')[0]}
            readOnly
          />
          
          {/* Hora de consulta automática */}
          <input 
            className="border p-2 bg-gray-50" 
            type="time" 
            value={datosPaciente.hora_consulta || new Date().toTimeString().slice(0, 5)}
            readOnly
          />
          
          <input 
            className="border p-2" 
            placeholder="Nombre completo" 
            value={datosPaciente.nombre_completo}
            onChange={e => {
              setDatosPaciente(prev => ({ ...prev, nombre_completo: e.target.value }))
              setHistoriaClinica(prev => ({ ...prev, nombre_completo: e.target.value }))
            }} 
          />
          
          <input 
            className="border p-2" 
            type="text" 
            placeholder="Peso (kg)" 
            value={datosPaciente.peso}
            onChange={e => setDatosPaciente(prev => ({ ...prev, peso: e.target.value }))} 
          />
          
          <input 
            className="border p-2" 
            type="text" 
            placeholder="Altura (m)" 
            value={datosPaciente.altura}
            onChange={e => setDatosPaciente(prev => ({ ...prev, altura: e.target.value }))} 
          />
          
          {/* Fecha de nacimiento para calcular edad */}
          <input 
            className="border p-2" 
            type="date" 
            placeholder="Fecha de nacimiento"
            value={historiaClinica.fecha_nacimiento}
            onChange={e => setHistoriaClinica(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
          />
          
          {/* Edad calculada automáticamente */}
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-sm font-semibold">IMC: {datosPaciente.imc || "—"}</div>
            <div className="text-xs text-gray-600">Categoría: {datosPaciente.categoriaIMC || "—"}</div>
            <div className="text-xs text-gray-600">Edad: {historiaClinica.edad_calculada || "—"} años</div>
          </div>
        </div>
      </section>

      {/* =========================== */}
      {/* ESQUEMA MEJORADO */}
      {/* =========================== */}

            {/* =========================== */}
      {/* ESQUEMA MEJORADO */}
      {/* =========================== */}      {/* =========================== */}
      {/* ESQUEMA MEJORADO */}
      {/* =========================== */}
      
          <div className="space-y-8">
      {/* BOTÓN PARA ABRIR EDITOR DE ESQUEMAS */}
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



      {/* ... resto de tu formulario ... */}

      {/* VISOR DE ESQUEMAS - MODAL */}
      {showEsquemaViewer && (
        <EsquemaViewer 
          onClose={() => setShowEsquemaViewer(false)} 
          planId={plan?.id}
        />
      )}
    </div>


      {/* Modal para texto */}
      {showTextModal && (
        <>
          <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50" onClick={closeTextModal}></div>
          <div className="text-input-modal fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-xl shadow-2xl z-50">
            <h3 className="text-xl font-bold mb-4">Agregar Texto</h3>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-700 font-medium">Tamaño del texto: {currentTextSize}</label>
                <input 
                  type="range" 
                  min="2" 
                  max="18" 
                  value={currentTextSize}
                  onChange={(e) => updateTextSize(parseInt(e.target.value))}
                  className="w-32 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
            <input
              type="text"
              id="textInput"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe el texto aquí..."
              className="w-full border-2 border-gray-300 p-3 rounded-lg mb-4 focus:border-blue-500 focus:outline-none"
              maxLength={50}
              autoFocus
            />
            <div className="modal-buttons flex justify-end gap-3">
              <button 
                onClick={closeTextModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button 
                onClick={addTextToSVG}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Agregar
              </button>
            </div>
          </div>
        </>
      )}

      {/* CIRUGÍAS PREVIAS Y NOTAS */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Cirugías Previas y Notas</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input type="date" className="border p-2" value={nuevaCirugia.fecha} onChange={e => setNuevaCirugia(prev => ({...prev, fecha: e.target.value}))} />
          <input className="border p-2" placeholder="Procedimiento" value={nuevaCirugia.procedimiento} onChange={e => setNuevaCirugia(prev => ({...prev, procedimiento: e.target.value}))} />
          <input className="border p-2" placeholder="Descripción" value={nuevaCirugia.descripcion} onChange={e => setNuevaCirugia(prev => ({...prev, descripcion: e.target.value}))} />
          <input className="border p-2 md:col-span-2" placeholder="Detalles" value={nuevaCirugia.detalles} onChange={e => setNuevaCirugia(prev => ({...prev, detalles: e.target.value}))} />
          <button onClick={agregarCirugiaPrev} className="px-3 py-1 bg-[#1a6b32] text-white rounded md:col-span-1">Agregar cirugía</button>
        </div>

        <div className="mt-4">
          <textarea className="w-full border p-2" placeholder="Notas del doctor" value={notasDoctor} onChange={e => setNotasDoctor(e.target.value)} />
        </div>

        <div className="mt-3">
          <input type="file" multiple onChange={e => handleFiles(e.target.files)} />
          <div className="mt-2 text-sm text-gray-600">Archivos adjuntos: {imagenesAdjuntas.join(", ")}</div>
        </div>

        {cirugiasPrevias.length > 0 && (
          <div className="mt-3">
            <h4 className="font-semibold">Listado de cirugías previas</h4>
            <ul className="list-disc ml-6">
              {cirugiasPrevias.map(c => (
                <li key={c.id}>{c.fecha} — {c.procedimiento} ({c.descripcion})</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* CONDUCTA QUIRÚRGICA */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Conducta Quirúrgica</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input 
            className="border p-2" 
            type="text" 
            placeholder="Tiempo QX (min)" 
            value={conductaQuirurgica.duracion_estimada} 
            onChange={e => setConductaQuirurgica(prev => ({...prev, duracion_estimada: e.target.value}))} 
          />
          <select className="border p-2" value={conductaQuirurgica.tipo_anestesia} onChange={e => setConductaQuirurgica(prev => ({...prev, tipo_anestesia: e.target.value as any}))}>
            <option value="general">General</option>
            <option value="peridural">Peridural</option>
            <option value="sedacion">Sedación</option>
            <option value="local">Local</option>
            <option value="ninguna">Ninguna</option>
          </select>
          <label className="flex items-center gap-2"><input type="checkbox" checked={conductaQuirurgica.requiere_hospitalizacion} onChange={e => setConductaQuirurgica(prev => ({...prev, requiere_hospitalizacion: e.target.checked}))} /> Requiere hospitalización</label>
          {conductaQuirurgica.requiere_hospitalizacion && <input className="border p-2" placeholder="Tiempo hospitalización" value={conductaQuirurgica.tiempo_hospitalizacion} onChange={e => setConductaQuirurgica(prev => ({...prev, tiempo_hospitalizacion: e.target.value}))} />}
          <input className="border p-2" placeholder="Resección estimada" value={conductaQuirurgica.reseccion_estimada} onChange={e => setConductaQuirurgica(prev => ({...prev, reseccion_estimada: e.target.value}))} />
          <input className="border p-2" placeholder="Firma cirujano (dataURL opcional)" value={conductaQuirurgica.firma_cirujano} onChange={e => setConductaQuirurgica(prev => ({...prev, firma_cirujano: e.target.value}))} />
          <input className="border p-2" placeholder="Firma paciente (dataURL opcional)" value={conductaQuirurgica.firma_paciente} onChange={e => setConductaQuirurgica(prev => ({...prev, firma_paciente: e.target.value}))} />
        </div>
      </section>

      {/* HISTORIA CLÍNICA */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Historia Clínica Completa</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="border p-2" placeholder="Ocupación" value={historiaClinica.ocupacion} onChange={e => setHistoriaClinica(prev => ({...prev, ocupacion: e.target.value}))} />
          <input className="border p-2" placeholder="Referido por" value={historiaClinica.referido_por} onChange={e => setHistoriaClinica(prev => ({...prev, referido_por: e.target.value}))} />
          <input className="border p-2" placeholder="Entidad" value={historiaClinica.entidad} onChange={e => setHistoriaClinica(prev => ({...prev, entidad: e.target.value}))} />
          <input className="border p-2" type="date" placeholder="Fecha de nacimiento" value={historiaClinica.fecha_nacimiento} onChange={e => setHistoriaClinica(prev => ({...prev, fecha_nacimiento: e.target.value}))} />
          <input className="border p-2" placeholder="Teléfono" value={historiaClinica.telefono} onChange={e => setHistoriaClinica(prev => ({...prev, telefono: e.target.value}))} />
          <input className="border p-2" placeholder="Celular" value={historiaClinica.celular} onChange={e => setHistoriaClinica(prev => ({...prev, celular: e.target.value}))} />
          <input className="border p-2" placeholder="Dirección" value={historiaClinica.direccion} onChange={e => setHistoriaClinica(prev => ({...prev, direccion: e.target.value}))} />
          <input className="border p-2" placeholder="Email" value={historiaClinica.email} onChange={e => setHistoriaClinica(prev => ({...prev, email: e.target.value}))} />
        </div>

        <div className="mt-3">
          <textarea className="w-full border p-2" placeholder="Motivo de consulta" value={historiaClinica.motivo_consulta} onChange={e => setHistoriaClinica(prev => ({...prev, motivo_consulta: e.target.value}))} />
        </div>

        <h4 className="font-semibold mt-3">Enfermedad actual</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          {Object.keys(historiaClinica.enfermedad_actual).map((k: any) => (
            <label key={k} className="flex gap-2 items-center">
              <input type="checkbox" checked={(historiaClinica.enfermedad_actual as any)[k]} onChange={e => setHistoriaClinica(prev => ({...prev, enfermedad_actual: {...prev.enfermedad_actual, [k]: e.target.checked}}))} />
              {k}
            </label>
          ))}
        </div>

        <h4 className="font-semibold mt-3">Antecedentes</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="border p-2" placeholder="Farmacológicos" value={historiaClinica.antecedentes.farmacologicos} onChange={e => setHistoriaClinica(prev => ({...prev, antecedentes: {...prev.antecedentes, farmacologicos: e.target.value}}))} />
          <input className="border p-2" placeholder="Traumáticos" value={historiaClinica.antecedentes.traumaticos} onChange={e => setHistoriaClinica(prev => ({...prev, antecedentes: {...prev.antecedentes, traumaticos: e.target.value}}))} />
          <input className="border p-2" placeholder="Quirúrgicos" value={historiaClinica.antecedentes.quirurgicos} onChange={e => setHistoriaClinica(prev => ({...prev, antecedentes: {...prev.antecedentes, quirurgicos: e.target.value}}))} />
          <input className="border p-2" placeholder="Alérgicos" value={historiaClinica.antecedentes.alergicos} onChange={e => setHistoriaClinica(prev => ({...prev, antecedentes: {...prev.antecedentes, alergicos: e.target.value}}))} />
          <input className="border p-2" placeholder="Tóxicos" value={historiaClinica.antecedentes.toxicos} onChange={e => setHistoriaClinica(prev => ({...prev, antecedentes: {...prev.antecedentes, toxicos: e.target.value}}))} />
          <input className="border p-2" placeholder="Hábitos" value={historiaClinica.antecedentes.habitos} onChange={e => setHistoriaClinica(prev => ({...prev, antecedentes: {...prev.antecedentes, habitos: e.target.value}}))} />
          <input className="border p-2" placeholder="Ginecológicos" value={historiaClinica.antecedentes.ginecologicos} onChange={e => setHistoriaClinica(prev => ({...prev, antecedentes: {...prev.antecedentes, ginecologicos: e.target.value}}))} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={historiaClinica.antecedentes.fuma === "si"} onChange={e => setHistoriaClinica(prev => ({...prev, antecedentes: {...prev.antecedentes, fuma: e.target.checked ? "si" : "no"}}))} /> Fuma</label>
        </div>

        <h4 className="font-semibold mt-3">Examen físico (notas)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {Object.keys(historiaClinica.notas_corporales).map((k: any) => (
            <textarea key={k} className="border p-2" placeholder={k} value={(historiaClinica.notas_corporales as any)[k]} onChange={e => setHistoriaClinica(prev => ({...prev, notas_corporales: {...prev.notas_corporales, [k]: e.target.value}}))} />
          ))}
        </div>

      </section>

      {/* BOTÓN GUARDAR */}
      <div className="flex justify-end">
        <button onClick={handleSubmit} className="bg-[#1a6b32] text-white px-6 py-3 rounded-lg">Guardar Plan Quirúrgico</button>
      </div>

    </div>
  )
}