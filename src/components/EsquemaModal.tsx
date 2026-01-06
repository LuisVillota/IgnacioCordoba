import React, { useState, useRef, useCallback, useEffect } from "react";

// --- TIPOS ---
type ProcedureType = 'lipo' | 'lipotras' | 'musculo' | 'incision';
interface DibujoAccion {
    tipo: ProcedureType;
    x: number;
    y: number;
    timestamp: number;
    tamaño: number;
}
type ZoneID = string;
type ProcedureTypeSVG = ProcedureType | null;
interface ZoneMarkingsSVG {
    [zoneId: string]: ProcedureTypeSVG;
}
type Tool = "select" | "pencil";
const ALL_PROCEDURES: ProcedureType[] = ['lipo', 'lipotras', 'musculo', 'incision'];

// --- PROPS DEL MODAL ---
interface EsquemaModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDrawings: DibujoAccion[];
    initialMarkings: ZoneMarkingsSVG;
    onSave: (drawings: DibujoAccion[], markings: ZoneMarkingsSVG) => void;
}

// Dimensiones Fijas (Asegúrate que coincidan con el width/height de tu Canvas)
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const SVG_VIEWBOX_WIDTH = 400; // Ajusta según tu SVG
const SVG_VIEWBOX_HEIGHT = 600; // Ajusta según tu SVG

// --- FUNCIONES AUXILIARES DE CANVAS (MOVIDAS DESDE PlanQuirurgicoForm) ---

// Función para calcular el tamaño basado en la escala
const getTamañoEscalado = (base: number, tamaño: number) => {
    const escalas = [0.5, 0.75, 1, 1.25]; // muy pequeño, pequeño, normal, grande
    return base * escalas[tamaño - 1];
};

// Función para obtener el nombre del tamaño
const getNombreTamaño = (tamaño: number) => {
    const nombres = ["Muy pequeño", "Pequeño", "Normal", "Grande"];
    return nombres[tamaño - 1];
};

// Funciones de Dibujo (simplificadas y adaptadas para ser portables)

function drawLiposuccion(ctx: CanvasRenderingContext2D, x: number, y: number, tamaño: number = 3) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2; // Ya no escalamos el lineWidth aquí
    ctx.setLineDash([]);
    
    const spacing = getTamañoEscalado(8, tamaño);
    const length = getTamañoEscalado(40, tamaño);
    const slope = 0.25;
    const numLines = 5;
    const totalWidth = (numLines - 1) * spacing;
    const offsetY = getTamañoEscalado(-20, tamaño);

    for (let i = 0; i < numLines; i++) {
        const offset = i * spacing - totalWidth / 2;
        ctx.beginPath();
        ctx.moveTo(x + offset, y + length + offsetY);
        ctx.lineTo(x + offset + length * slope, y + offsetY);
        ctx.stroke();
    }
}

const drawLipotras = (ctx: CanvasRenderingContext2D, x: number, y: number, tamaño: number = 3) => {
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    
    // Dibujar rejilla azul para lipotransferencia
    const gridSize = getTamañoEscalado(30, tamaño);
    const cellSize = getTamañoEscalado(6, tamaño);
    const numCells = Math.floor(gridSize / cellSize);
    const startX = x - gridSize / 2;
    const startY = y - gridSize / 2;

    for (let i = 1; i < numCells; i++) {
        ctx.beginPath();
        ctx.moveTo(startX + i * cellSize, startY);
        ctx.lineTo(startX + i * cellSize, startY + gridSize);
        ctx.stroke();
    }
    
    for (let i = 1; i < numCells; i++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + i * cellSize);
        ctx.lineTo(startX + gridSize, startY + i * cellSize);
        ctx.stroke();
    }
};

const drawMusculo = (ctx: CanvasRenderingContext2D, x: number, y: number, tamaño: number = 3) => {
    ctx.strokeStyle = "green";
    ctx.lineWidth = 4;
    ctx.setLineDash([5, 5]);
    const height = getTamañoEscalado(40, tamaño);
    
    ctx.beginPath();
    ctx.moveTo(x, y - height/2);
    ctx.lineTo(x, y + height/2);
    ctx.stroke();
};

function drawIncision(ctx: CanvasRenderingContext2D, x: number, y: number, tamaño: number = 3) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    const radius = getTamañoEscalado(20, tamaño);
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI, false);
    ctx.stroke();
}


// --- SVG RENDERER (CON TUS PATHS) ---
const renderSVGContent = (
    zoneMarkings: ZoneMarkingsSVG,
    selectedSVGZone: string | null,
    handleZoneClick: (zoneId: ZoneID) => void,
    setSelectedSVGZone: (zoneId: string | null) => void
) => {
    // ESTOS SON LOS PATHS REALES QUE DEBES REEMPLAZAR CON TUS D-PATHS COMPLETOS Y ASIGNAR ID SEMÁNTICOS
    const SELECTABLE_ZONES = [
        { id: 'mama_izq', d: "m 145.47,157.06 c 0,0 2.21,-4.17 0,-4.17 -2.21,0 0,4.17 0,4.17 z" },
        { id: 'mama_der', d: "m 154.51,156.97 c 0,0 2.21,-4.17 0,-4.17 -2.21,0 0,4.17 0,4.17 z" },
        // ... (AÑADE AQUÍ LOS IDs y D-PATHS DE TODAS LAS ZONAS SELECCIONABLES)
    ];

    const D_PATH_CONTORNO_FRONTAL = "m 142.17646,2.1524385 c 1.48866,0.3688125 3.01254,0.487146 4.54228,0.487146 ... (Añade el path completo aquí)";
    const D_PATH_CONTORNO_TRASERO = "m 170.19067,2.1524385 c 1.48866,0.3688125 3.01254,0.487146 4.29828,-0.301548 ... (Añade el path completo aquí)";

    // CORRECCIÓN: Separamos los tipos para que null no sea una clave
    type NonNullProcedureType = Exclude<ProcedureTypeSVG, null>;
    const patternMap: Record<NonNullProcedureType, string> = {
        lipo: 'url(#patron-lipo)',
        lipotras: 'url(#patron-lipotras)',
        musculo: 'url(#patron-musculo)',
        incision: 'url(#patron-incision)',
    };

    return (
        <svg
            id="cuerpo-interactivo-svg"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
        >
            <defs>
                {/* PATRONES DE PROCEDIMIENTOS */}
                <pattern id="patron-lipo" patternUnits="userSpaceOnUse" width="10" height="10">
                    <line x1="0" y1="10" x2="10" y2="0" stroke="red" strokeWidth="1.5" />
                    <line x1="0" y1="0" x2="10" y2="10" stroke="red" strokeWidth="1.5" />
                </pattern>
                <pattern id="patron-lipotras" patternUnits="userSpaceOnUse" width="8" height="8">
                    <line x1="4" y1="0" x2="4" y2="8" stroke="blue" strokeWidth="1" />
                    <line x1="0" y1="4" x2="8" y2="4" stroke="blue" strokeWidth="1" />
                </pattern>
                <pattern id="patron-musculo" patternUnits="userSpaceOnUse" width="20" height="10">
                    <line x1="0" y1="5" x2="20" y2="5" stroke="green" strokeWidth="2" strokeDasharray="5, 3" />
                </pattern>
                <pattern id="patron-incision" patternUnits="userSpaceOnUse" width="8" height="8">
                    <circle cx="4" cy="4" r="3" fill="red" stroke="black" strokeWidth="1" />
                </pattern>
            </defs>

            {/* Zonas Interactivas */}
            <g transform="translate(-62.06201,-28.096388) scale(1.5)"> {/* Ajusta este transform según necesites */}
                
                {/* Contornos Estáticos */}
                <path id="contorno_frontal" style={{ fill: 'none', stroke: 'black', strokeWidth: 1, pointerEvents: 'none' }} d={D_PATH_CONTORNO_FRONTAL} />
                <path id="contorno_trasero" style={{ fill: 'none', stroke: 'black', strokeWidth: 1, pointerEvents: 'none' }} d={D_PATH_CONTORNO_TRASERO} />
                
                {/* Zonas Seleccionables */}
                {SELECTABLE_ZONES.map(({ id, d }) => {
                    const marking = zoneMarkings[id];
                    const isHovered = id === selectedSVGZone;

                    return (
                        <path
                            key={id}
                            id={id}
                            d={d}
                            fill={marking ? patternMap[marking as NonNullProcedureType] : 'transparent'}
                            stroke={isHovered ? 'blue' : 'black'}
                            strokeWidth={isHovered ? 2 : 1}
                            cursor="pointer"
                            onMouseEnter={() => selectedSVGZone === null && setSelectedSVGZone(id)}
                            onMouseLeave={() => setSelectedSVGZone(null)}
                            onClick={() => handleZoneClick(id)}
                        />
                    );
                })}
            </g>
        </svg>
    );
};


// --- COMPONENTE MODAL ---
const EsquemaModal: React.FC<EsquemaModalProps> = ({ isOpen, onClose, initialDrawings, initialMarkings, onSave }) => {
    if (!isOpen) return null;

    // --- ESTADOS ---
    const [activeTool, setActiveTool] = useState<Tool>("select");
    const [zoneMarkings, setZoneMarkings] = useState<ZoneMarkingsSVG>(initialMarkings);
    const [selectedSVGZone, setSelectedSVGZone] = useState<string | null>(null);
    const [dibujos, setDibujos] = useState<DibujoAccion[]>(initialDrawings);
    const [herramientaPencil, setHerramientaPencil] = useState<ProcedureType>('lipo'); // Herramienta activa para el lápiz
    
    // Zoom/Pan
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    
    // Dibujo
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tamañoDibujo, setTamañoDibujo] = useState(3);
    const [isCoolingDown, setIsCoolingDown] = useState(false);

    // -----------------------------------------------------
    // LÓGICA DE INTERACCIÓN (SVG)
    // -----------------------------------------------------
    const handleZoneClick = (zoneId: ZoneID) => {
        if (activeTool !== 'select') return;

        const currentMarking = zoneMarkings[zoneId];
        let nextMarking: ProcedureTypeSVG = null;

        const currentIndex = currentMarking ? ALL_PROCEDURES.indexOf(currentMarking) : -1;
        
        if (currentIndex === ALL_PROCEDURES.length - 1) {
            nextMarking = null; 
        } else {
            // Aseguramos que 'lipo' sea el siguiente si es null
            nextMarking = ALL_PROCEDURES[currentIndex + 1] || 'lipo';
        }
        
        setZoneMarkings(prev => ({
            ...prev,
            [zoneId]: nextMarking,
        }));
    };

    // -----------------------------------------------------
    // LÓGICA DE DIBUJO (CANVAS)
    // -----------------------------------------------------
    
    // Función auxiliar para obtener coordenadas del canvas (¡CRUCIAL!)
    const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        // Aplicar la transformación inversa: (Coordenada - Offset) / Zoom
        const x = (clientX - rect.left - offset.x) / zoom;
        const y = (clientY - rect.top - offset.y) / zoom;
        
        return { x, y };
    }, [zoom, offset]);

    const saveDibujo = (tipo: ProcedureType, x: number, y: number, tamaño: number) => {
        const newDibujo: DibujoAccion = {
            tipo,
            x,
            y,
            tamaño,
            timestamp: Date.now()
        };
        setDibujos(prev => [...prev, newDibujo]);
    };

    const handleDraw = (e: React.MouseEvent) => {
        if (activeTool !== "pencil" || isCoolingDown) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY);
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Guardar el dibujo en la lista
        saveDibujo(herramientaPencil, canvasCoords.x, canvasCoords.y, tamañoDibujo);

        // Dibujar inmediatamente (sin aplicar transformaciones aquí, ya se hace en redrawCanvas)
        switch (herramientaPencil) {
            case "lipo":
                drawLiposuccion(ctx, canvasCoords.x, canvasCoords.y, tamañoDibujo);
                break;
            case "lipotras":
                drawLipotras(ctx, canvasCoords.x, canvasCoords.y, tamañoDibujo);
                break;
            case "musculo":
                drawMusculo(ctx, canvasCoords.x, canvasCoords.y, tamañoDibujo);
                break;
            case "incision":
                drawIncision(ctx, canvasCoords.x, canvasCoords.y, tamañoDibujo);
                break;
        }

        setIsCoolingDown(true);
        setTimeout(() => setIsCoolingDown(false), 50); // Reduje el cooldown para dibujo más fluido
    };

    // Redraw Canvas (Usa useCallback para optimizar)
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Limpiar canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Guardar estado del contexto
        ctx.save();
        
        // Aplicar transformaciones de zoom y pan
        ctx.translate(offset.x, offset.y);
        ctx.scale(zoom, zoom);
        
        // Redibujar todos los dibujos
        dibujos.forEach(dibujo => {
            switch (dibujo.tipo) {
                case "lipo":
                    drawLiposuccion(ctx, dibujo.x, dibujo.y, dibujo.tamaño);
                    break;
                case "lipotras":
                    drawLipotras(ctx, dibujo.x, dibujo.y, dibujo.tamaño);
                    break;
                case "musculo":
                    drawMusculo(ctx, dibujo.x, dibujo.y, dibujo.tamaño);
                    break;
                case "incision":
                    drawIncision(ctx, dibujo.x, dibujo.y, dibujo.tamaño);
                    break;
            }
        });
        
        // Restaurar estado del contexto
        ctx.restore();
    }, [zoom, offset, dibujos]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    // -----------------------------------------------------
    // LÓGICA DE ZOOM Y PAN (MOVIDA Y CORREGIDA)
    // -----------------------------------------------------

    const zoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
    const zoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
    const resetZoom = () => setZoom(1);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.5, Math.min(zoom * zoomFactor, 3));

        // Calcular nuevo offset para hacer zoom hacia el puntero del mouse
        const newOffsetX = mouseX - (mouseX - offset.x) * (newZoom / zoom);
        const newOffsetY = mouseY - (mouseY - offset.y) * (newZoom / zoom);

        setZoom(newZoom);
        setOffset({ x: newOffsetX, y: newOffsetY });
    };

    // Arrastrar para mover (pan)
    const handleMouseDown = (e: React.MouseEvent) => {
        // Activamos el arrastre si es el botón del medio o Ctrl + click izquierdo
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            e.preventDefault();
            setIsDragging(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
        // Si es el lápiz, iniciamos el dibujo inmediatamente (ya se maneja en onMouseMove)
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            const deltaX = e.clientX - lastMousePos.x;
            const deltaY = e.clientY - lastMousePos.y;
            
            setOffset(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));
            
            setLastMousePos({ x: e.clientX, y: e.clientY });
        } else if (activeTool === 'pencil' && e.buttons === 1 && !e.ctrlKey) {
            // Dibuja continuo si el lápiz está activo y el botón izquierdo está presionado
            handleDraw(e);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Deshacer/Borrar
    const deshacer = () => { setDibujos(prev => prev.slice(0, -1)); };
    const borrarTodo = () => { 
        setDibujos([]);
        setZoneMarkings({});
    };

    // Guardar y Cerrar
    const handleSaveAndClose = () => {
        onSave(dibujos, zoneMarkings);
        onClose();
    };
    
    // -----------------------------------------------------
    // RENDER DEL MODAL
    // -----------------------------------------------------
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={{ padding: '20px' }}>
                    
                    {/* ENCABEZADO Y ACCIONES */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>✏️ Editor de Esquema Corporal</h2>
                        <button onClick={handleSaveAndClose} style={{ padding: '8px 16px', background: '#1a6b32', color: 'white', borderRadius: '4px' }}>
                            Guardar y Cerrar
                        </button>
                    </div>

                    {/* CONTROLES */}
                    <div className="flex flex-wrap gap-2 items-center mb-3">
                        
                        {/* 1. SELECCIÓN DE HERRAMIENTA PRINCIPAL */}
                        <button 
                            onClick={() => setActiveTool("select")} 
                            style={{ background: activeTool === "select" ? '#a855f7' : '#d8b4fe', color: 'white', padding: '6px 10px', borderRadius: '4px' }}
                        >
                            Seleccionar Zona (SVG)
                        </button>
                        <button 
                            onClick={() => setActiveTool("pencil")} 
                            style={{ background: activeTool === "pencil" ? '#ef4444' : '#fecaca', color: 'white', padding: '6px 10px', borderRadius: '4px' }}
                        >
                            Lápiz (Canvas)
                        </button>
                        
                        {/* 2. CONTROLES DE ZOOM */}
                        <button onClick={zoomIn} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Zoom In (+)</button>
                        <button onClick={zoomOut} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Zoom Out (-)</button>
                        <button onClick={resetZoom} className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">Reset Zoom</button>

                        {/* 3. CONTROLES DE LÁPIZ (Solo si 'pencil' está activo) */}
                        {activeTool === 'pencil' && (
                            <>
                                <span className="text-sm font-medium text-gray-700 ml-4">Procedimiento:</span>
                                {ALL_PROCEDURES.map((proc) => (
                                    <button 
                                        key={proc}
                                        onClick={() => setHerramientaPencil(proc)} 
                                        style={{ background: herramientaPencil === proc ? '#059669' : '#a7f3d0', color: 'white', padding: '6px 10px', borderRadius: '4px' }}
                                    >
                                        {proc.charAt(0).toUpperCase() + proc.slice(1)}
                                    </button>
                                ))}
                                
                                <span className="text-sm font-medium text-gray-700 ml-4">Tamaño:</span>
                                {[1, 2, 3, 4].map(size => (
                                    <button 
                                        key={size}
                                        onClick={() => setTamañoDibujo(size)} 
                                        className={`px-2 py-1 text-xs rounded ${tamañoDibujo === size ? "bg-purple-500 text-white" : "bg-purple-200"}`}
                                    >
                                        {getNombreTamaño(size)}
                                    </button>
                                ))}
                            </>
                        )}
                        
                        {/* 4. ACCIONES */}
                        <button onClick={deshacer} style={{ background: '#e5e7eb', padding: '6px 10px', borderRadius: '4px' }}>Deshacer</button>
                        <button onClick={borrarTodo} style={{ background: '#fca5a5', color: 'white', padding: '6px 10px', borderRadius: '4px' }}>Borrar Todo</button>
                    </div>

                    {/* INDICADOR DE ESTADO */}
                    <div className="text-sm text-gray-600 mb-2">
                         Zoom: {Math.round(zoom * 100)}% | Herramienta: **{activeTool}** | Dibujos: {dibujos.length} | Ctrl + arrastrar o botón medio para mover
                    </div>
                    
                    {/* CONTENEDOR HÍBRIDO SVG + CANVAS */}
                    <div 
                        style={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, margin: '0 auto', overflow: 'hidden' }}
                        // Conectamos los eventos de zoom/pan aquí
                        onWheel={handleWheel} 
                        onMouseDown={handleMouseDown} 
                        onMouseMove={handleMouseMove} 
                        onMouseUp={handleMouseUp} 
                        onMouseLeave={handleMouseUp} 
                    >
                        {/* Capa de Transformación para Zoom/Pan */}
                        <div style={{ 
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, 
                            transformOrigin: '0 0', 
                            position: 'absolute', 
                            width: '100%', 
                            height: '100%' 
                        }}>
                            
                            {/* CAPA SVG: Dibuja el cuerpo y las marcas rellenas */}
                            <div style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                // El SVG solo captura clics si la herramienta 'select' está activa
                                pointerEvents: activeTool === 'select' ? 'auto' : 'none', 
                                width: '100%', 
                                height: '100%' 
                            }}>
                                {renderSVGContent(zoneMarkings, selectedSVGZone, handleZoneClick, setSelectedSVGZone)}
                            </div>

                            {/* CAPA CANVAS: Dibuja las marcas a mano alzada */}
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_WIDTH}
                                height={CANVAS_HEIGHT}
                                // Si se usa el lápiz, el click dispara un punto. El dibujo continuo se hace en handleMouseMove.
                                onClick={activeTool === 'pencil' ? handleDraw : undefined} 
                                style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    pointerEvents: activeTool === 'pencil' && !isDragging ? 'auto' : 'none', // Deshabilita el click si estamos arrastrando o en modo select
                                    backgroundColor: 'transparent' 
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EsquemaModal;

// --- ESTILOS (MOVIDOS AL FINAL) ---
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '8px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    width: `${CANVAS_WIDTH + 80}px` // Ancho para acomodar el canvas más padding
};