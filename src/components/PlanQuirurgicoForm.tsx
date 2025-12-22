"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { PlanQuirurgico } from "../types/planQuirurgico"

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
  // NUEVO ESQUEMA MEJORADO (EXACTO COMO EL INDEX.HTML)
  // ===========================
  const [selectionHistory, setSelectionHistory] = useState<Array<any>>([]);
  const [svgDocuments, setSvgDocuments] = useState<Array<Document>>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<'liposuction' | 'lipotransfer'>('liposuction');
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
  
  // Para zonas marcadas
  const [zoneMarkings, setZoneMarkings] = useState<ZoneMarkingsSVG>({});

  const bodySvgRef = useRef<HTMLObjectElement>(null);
  const facialSvgRef = useRef<HTMLObjectElement>(null);
  const saveDropdownRef = useRef<HTMLDivElement>(null);

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
  // FUNCIONES DEL ESQUEMA (EXACTAMENTE COMO EL INDEX.HTML)
  // ===========================

  const updateStrokeWidth = (value: number) => {
    setCurrentStrokeWidth(value);
  };

  const updateTextSize = (value: number) => {
    setCurrentTextSize(value);
  };

  const selectProcedure = (procedure: 'liposuction' | 'lipotransfer') => {
    setSelectedProcedure(procedure);
  };

  const toggleDrawingMode = () => {
    const newDrawingMode = !isDrawingMode;
    setIsDrawingMode(newDrawingMode);
    
    if (newDrawingMode && isTextMode) {
      setIsTextMode(false);
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
    
    if (newTextMode && isDrawingMode) {
      setIsDrawingMode(false);
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
    const existingPatterns = defs.querySelectorAll('pattern');
    existingPatterns.forEach(pattern => pattern.remove());

    // Patrón de liposucción
    const lipoPattern = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    lipoPattern.setAttribute('id', 'liposuction-pattern');
    lipoPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    lipoPattern.setAttribute('width', '3');
    lipoPattern.setAttribute('height', '3');
    lipoPattern.setAttribute('patternTransform', 'rotate(45)');
    
    const lipoLine = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
    lipoLine.setAttribute('x1', '0');
    lipoLine.setAttribute('y1', '0');
    lipoLine.setAttribute('x2', '0');
    lipoLine.setAttribute('y2', '3');
    lipoLine.setAttribute('stroke', '#FF0000');
    lipoLine.setAttribute('stroke-width', '2');
    
    lipoPattern.appendChild(lipoLine);
    defs.appendChild(lipoPattern);

    // Patrón de lipotransferencia
    const transferPattern = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    transferPattern.setAttribute('id', 'lipotransfer-pattern');
    transferPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    transferPattern.setAttribute('width', '2.5');
    transferPattern.setAttribute('height', '2.5');
    
    const transferLineH = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
    transferLineH.setAttribute('x1', '0');
    transferLineH.setAttribute('y1', '0');
    transferLineH.setAttribute('x2', '2.5');
    transferLineH.setAttribute('y2', '0');
    transferLineH.setAttribute('stroke', '#0000FF');
    transferLineH.setAttribute('stroke-width', '1.5');
    
    const transferLineV = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
    transferLineV.setAttribute('x1', '0');
    transferLineV.setAttribute('y1', '0');
    transferLineV.setAttribute('x2', '0');
    transferLineV.setAttribute('y2', '2.5');
    transferLineV.setAttribute('stroke', '#0000FF');
    transferLineV.setAttribute('stroke-width', '1.5');
    
    transferPattern.appendChild(transferLineH);
    transferPattern.appendChild(transferLineV);
    defs.appendChild(transferPattern);
  };

  const applyProcedurePattern = (element: SVGElement, procedure: 'liposuction' | 'lipotransfer') => {
    const originalFill = element.getAttribute('data-original-fill') || 
                        element.style.fill || 
                        element.getAttribute('fill') || '';
    
    element.style.fillOpacity = '1';
    
    // Limpiar fill actual
    element.style.fill = '';
    element.removeAttribute('fill');
    
    if (procedure === 'liposuction') {
      element.setAttribute('fill', 'url(#liposuction-pattern)');
    } else if (procedure === 'lipotransfer') {
      element.setAttribute('fill', 'url(#lipotransfer-pattern)');
    }
    
    element.setAttribute('data-procedure', procedure);
    
    // Actualizar estado de zonas marcadas
    const zoneId = element.id || element.getAttribute('inkscape:label') || '';
    if (zoneId) {
      setZoneMarkings(prev => ({
        ...prev,
        [zoneId]: procedure
      }));
    }
  };

  const removeProcedurePattern = (element: SVGElement) => {
    const originalFill = element.getAttribute('data-original-fill') || '';
    
    if (originalFill) {
      element.setAttribute('fill', originalFill);
    } else {
      element.removeAttribute('fill');
    }
    
    const originalOpacity = element.getAttribute('data-original-opacity') || '';
    if (originalOpacity) {
      element.style.fillOpacity = originalOpacity;
    }
    
    element.removeAttribute('data-procedure');
    
    // Actualizar estado de zonas marcadas
    const zoneId = element.id || element.getAttribute('inkscape:label') || '';
    if (zoneId) {
      setZoneMarkings(prev => {
        const newMarkings = { ...prev };
        delete newMarkings[zoneId];
        return newMarkings;
      });
    }
  };

  const initializeSchema = (objectElement: HTMLObjectElement) => {
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

      // Configurar zonas clicables
      const allElements = svgDoc.querySelectorAll('*');
      allElements.forEach((element: Element) => {
        const svgElement = element as SVGElement;
        const label = svgElement.getAttribute('inkscape:label');
        if (label && (svgElement.tagName === 'path' || svgElement.tagName === 'rect' || svgElement.tagName === 'circle' || svgElement.tagName === 'ellipse')) {
          const originalFill = svgElement.getAttribute('fill') || '';
          svgElement.setAttribute('data-original-fill', originalFill);
          
          const originalOpacity = svgElement.getAttribute('fill-opacity') || '';
          if (originalOpacity) {
            svgElement.setAttribute('data-original-opacity', originalOpacity);
          }
          
          svgElement.classList.add('zone');
          svgElement.style.cursor = 'pointer';
          
          svgElement.addEventListener('click', function(e) {
            if (isDrawingMode) {
              e.stopPropagation();
              return;
            }
            
            if (isTextMode) {
              e.stopPropagation();
              return;
            }
            
            const currentProcedure = svgElement.getAttribute('data-procedure');
            
            if (currentProcedure) {
              removeProcedurePattern(svgElement);
              
              // Remover del historial
              setSelectionHistory(prev => prev.filter(item => 
                !(item.type === 'zone' && item.element === svgElement)
              ));
            } else {
              applyProcedurePattern(svgElement, selectedProcedure);
              
              setSelectionHistory(prev => [...prev, {
                element: svgElement,
                procedure: selectedProcedure,
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
  };

  // Inicializar los SVG cuando los refs estén listos
  useEffect(() => {
    if (bodySvgRef.current) {
      initializeSchema(bodySvgRef.current);
    }
    if (facialSvgRef.current) {
      initializeSchema(facialSvgRef.current);
    }
  }, [bodySvgRef.current, facialSvgRef.current]);

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
      {/* ESQUEMA MEJORADO (EXACTO COMO INDEX.HTML) */}
      {/* =========================== */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Esquema Corporal Interactivo</h3>
        
        {/* Controles del esquema - EXACTO COMO EL INDEX.HTML */}
        <div className="controls-panel bg-white rounded-xl p-6 mb-4 shadow-md">
          <div className="control-group flex flex-wrap gap-3 items-center">
            <button 
              className="btn-undo px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all"
              onClick={undoLastSelection}
            >
              Deshacer
            </button>
            
            <button 
              className="btn-reset px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              onClick={resetAllSelections}
            >
              Reestablecer Todo
            </button>
            
            <button 
              className={`btn-draw px-4 py-2 rounded-lg transition-all ${isDrawingMode ? 'bg-purple-600 text-white shadow-inner' : 'bg-purple-500 text-white hover:bg-purple-600'}`}
              onClick={toggleDrawingMode}
            >
              {isDrawingMode ? '✏️ Trazo Libre (Activado)' : '✏️ Trazo Libre'}
            </button>
            
            <button 
              className={`btn-text px-4 py-2 rounded-lg transition-all ${isTextMode ? 'bg-green-600 text-white shadow-inner' : 'bg-green-500 text-white hover:bg-green-600'}`}
              onClick={toggleTextMode}
            >
              {isTextMode ? '📝 Agregar Texto (Activado)' : '📝 Agregar Texto'}
            </button>
            
            <div className="relative" ref={saveDropdownRef}>
              <button 
                className="btn-save px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                onClick={() => setShowSaveDropdown(!showSaveDropdown)}
              >
                💾 Guardar
              </button>
              
              {showSaveDropdown && (
                <div className="save-dropdown absolute right-0 mt-2 bg-white rounded-lg shadow-xl z-50 border">
                  <div 
                    className="save-option px-4 py-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSaveSchema('png')}
                  >
                    Guardar como PNG
                  </div>
                  <div 
                    className="save-option px-4 py-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSaveSchema('pdf')}
                  >
                    Guardar como PDF
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sliders */}
          <div className="control-group flex flex-wrap gap-6 mt-4">
            <div className="slider-control flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg">
              <label className="text-gray-700 font-medium">Grosor trazo:</label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={currentStrokeWidth}
                onChange={(e) => updateStrokeWidth(parseInt(e.target.value))}
                className="w-32 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <span className="value-display font-semibold text-blue-600 min-w-8 text-right">
                {currentStrokeWidth}
              </span>
            </div>

            <div className="slider-control flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg">
              <label className="text-gray-700 font-medium">Tamaño texto:</label>
              <input 
                type="range" 
                min="8" 
                max="48" 
                value={currentTextSize}
                onChange={(e) => updateTextSize(parseInt(e.target.value))}
                className="w-32 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <span className="value-display font-semibold text-blue-600 min-w-8 text-right">
                {currentTextSize}
              </span>
            </div>
          </div>

          {/* Selector de procedimiento */}
          <div className="control-group flex flex-wrap items-center gap-3 mt-4">
            <label className="text-gray-700 font-medium">Procedimiento:</label>
            <div className="procedure-selector flex gap-2">
              <div 
                className={`procedure-option px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${selectedProcedure === 'liposuction' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 hover:border-gray-400'}`}
                onClick={() => selectProcedure('liposuction')}
                data-procedure="liposuction"
              >
                Liposucción
              </div>
              <div 
                className={`procedure-option px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${selectedProcedure === 'lipotransfer' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 hover:border-gray-400'}`}
                onClick={() => selectProcedure('lipotransfer')}
                data-procedure="lipotransfer"
              >
                Lipotransferencia
              </div>
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="legend-item flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg">
              <svg className="legend-pattern w-10 h-8 border border-gray-300 rounded">
                <defs>
                  <pattern id="legend-lipo" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="3" stroke="#FF0000" strokeWidth="2"/>
                  </pattern>
                </defs>
                <rect width="40" height="30" fill="url(#legend-lipo)"/>
              </svg>
              <span className="text-gray-700">Liposucción</span>
            </div>

            <div className="legend-item flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg">
              <svg className="legend-pattern w-10 h-8 border border-gray-300 rounded">
                <defs>
                  <pattern id="legend-transfer" patternUnits="userSpaceOnUse" width="2.5" height="2.5">
                    <line x1="0" y1="0" x2="0" y2="2.5" stroke="#0000FF" strokeWidth="1.5"/>
                    <line x1="0" y1="0" x2="2.5" y2="0" stroke="#0000FF" strokeWidth="1.5"/>
                  </pattern>
                </defs>
                <rect width="40" height="30" fill="url(#legend-transfer)"/>
              </svg>
              <span className="text-gray-700">Lipotransferencia</span>
            </div>
          </div>
        </div>

        {/* Contenedor de ambos esquemas - UNO ABAJO DEL OTRO */}
        <div className="schemas-wrapper space-y-8">
          {/* Esquema Corporal */}
          <div className="schema-section bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Esquema Corporal Femenino</h2>
            <div className="svg-container flex justify-center items-center min-h-[400px]">
              <object
                ref={bodySvgRef}
                id="body-schema"
                data="/images/schema.svg"
                type="image/svg+xml"
                width="800"
                height="1000"
                className="max-w-full h-auto"
              >
                Tu navegador no soporta SVG
              </object>
            </div>
          </div>

          {/* Esquema Facial */}
          <div className="schema-section bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Esquema Facial</h2>
            <div className="svg-container flex justify-center items-center min-h-[400px]">
              <object
                ref={facialSvgRef}
                id="facial-schema"
                data="/images/schema-facial.svg"
                type="image/svg+xml"
                width="800"
                height="600"
                className="max-w-full h-auto"
              >
                Tu navegador no soporta SVG
              </object>
            </div>
          </div>
        </div>

        {/* Indicadores de estado */}
        <div className="text-sm text-gray-600 mt-4">
          Modo: {isDrawingMode ? 'Trazo Libre' : isTextMode ? 'Texto' : 'Selección'} | 
          Procedimiento: {selectedProcedure === 'liposuction' ? 'Liposucción' : 'Lipotransferencia'} | 
          Zonas marcadas: {Object.keys(zoneMarkings).length} | 
          Historial: {selectionHistory.length} acciones
        </div>
      </section>

      {/* Modal para texto */}
      {showTextModal && (
        <>
          <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50" onClick={closeTextModal}></div>
          <div className="text-input-modal fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-xl shadow-2xl z-50">
            <h3 className="text-xl font-bold mb-4">Agregar Texto</h3>
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