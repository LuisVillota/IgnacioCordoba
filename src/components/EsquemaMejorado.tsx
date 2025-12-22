"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"

type ProcedureType = 'lipo' | 'lipotras' | 'musculo' | 'incision'
type Tool = "select" | "draw" | "text"

interface DibujoAccion {
  tipo: ProcedureType
  x: number
  y: number
  timestamp: number
  tamaño: number
}

interface EsquemaMejoradoProps {
  tipo: 'corporal' | 'facial'
  initialDrawings?: DibujoAccion[]
  onSave?: (drawings: DibujoAccion[]) => void
  modoVistaPrevia?: boolean
}

const EsquemaMejorado: React.FC<EsquemaMejoradoProps> = ({
  tipo,
  initialDrawings = [],
  onSave,
  modoVistaPrevia = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTool, setActiveTool] = useState<Tool>("select")
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureType>('lipo')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<string>('')
  const [pathPoints, setPathPoints] = useState<{x: number, y: number}[]>([])
  const [drawings, setDrawings] = useState<DibujoAccion[]>(initialDrawings)
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Función para obtener coordenadas del SVG
  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const matrix = svg.getScreenCTM()?.inverse()
    return matrix ? pt.matrixTransform(matrix) : pt
  }, [])

  // Manejo del dibujo
  const startDrawing = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool !== 'draw' || modoVistaPrevia) return
    e.preventDefault()
    
    const point = getSVGPoint(e.clientX, e.clientY)
    setIsDrawing(true)
    setPathPoints([point])
    setCurrentPath(`M ${point.x} ${point.y}`)
  }

  const continueDrawing = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || activeTool !== 'draw' || modoVistaPrevia) return
    
    const point = getSVGPoint(e.clientX, e.clientY)
    const newPoints = [...pathPoints, point]
    setPathPoints(newPoints)
    
    let d = `M ${newPoints[0].x} ${newPoints[0].y}`
    for (let i = 1; i < newPoints.length; i++) {
      d += ` L ${newPoints[i].x} ${newPoints[i].y}`
    }
    setCurrentPath(d)
  }

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    
    setIsDrawing(false)
    if (pathPoints.length > 2 && currentPath) {
      const nuevoDibujo: DibujoAccion = {
        tipo: selectedProcedure,
        x: pathPoints[0].x,
        y: pathPoints[0].y,
        timestamp: Date.now(),
        tamaño: strokeWidth
      }
      const nuevosDibujos = [...drawings, nuevoDibujo]
      setDrawings(nuevosDibujos)
      if (onSave) {
        onSave(nuevosDibujos)
      }
    }
    setPathPoints([])
    setCurrentPath('')
  }, [isDrawing, pathPoints, currentPath, selectedProcedure, strokeWidth, drawings, onSave])

  // Zoom y pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (modoVistaPrevia) return
    
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.5, Math.min(zoom * zoomFactor, 3))

    const newOffsetX = mouseX - (mouseX - offset.x) * (newZoom / zoom)
    const newOffsetY = mouseY - (mouseY - offset.y) * (newZoom / zoom)

    setZoom(newZoom)
    setOffset({ x: newOffsetX, y: newOffsetY })
  }, [zoom, offset, modoVistaPrevia])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (modoVistaPrevia) return
    
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault()
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      setLastMousePos({ x: e.clientX, y: e.clientY })
    } else if (isDrawing) {
      continueDrawing(e as any)
    }
  }, [isDragging, lastMousePos, isDrawing, continueDrawing])

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
    }
    if (isDrawing) {
      stopDrawing()
    }
  }

  // Funciones de utilidad
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3))
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
  const resetZoom = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const undo = () => {
    if (drawings.length > 0) {
      const nuevosDibujos = drawings.slice(0, -1)
      setDrawings(nuevosDibujos)
      if (onSave) {
        onSave(nuevosDibujos)
      }
    }
  }

  const clearAll = () => {
    setDrawings([])
    if (onSave) {
      onSave([])
    }
  }

  // Renderizar patrones SVG
  const renderPatterns = () => (
    <defs>
      <pattern id="liposuction-pattern" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="#FF0000" strokeWidth="2" />
      </pattern>
      
      <pattern id="lipotransfer-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
        <line x1="4" y1="0" x2="4" y2="8" stroke="#0000FF" strokeWidth="1" />
        <line x1="0" y1="4" x2="8" y2="4" stroke="#0000FF" strokeWidth="1" />
      </pattern>
      
      <pattern id="musculo-pattern" patternUnits="userSpaceOnUse" width="20" height="10">
        <line x1="0" y1="5" x2="20" y2="5" stroke="#00FF00" strokeWidth="4" strokeDasharray="5,5" />
      </pattern>
      
      <pattern id="incision-pattern" patternUnits="userSpaceOnUse" width="12" height="12">
        <path d="M6,2 A4,4 0 1,0 6,10 A4,4 0 1,0 6,2" fill="none" stroke="#FF6600" strokeWidth="2" />
      </pattern>
    </defs>
  )

  // Renderizar dibujos guardados
  const renderDrawings = () => {
    return drawings.map((dibujo, idx) => {
      let size = dibujo.tamaño * 2
      
      switch (dibujo.tipo) {
        case 'lipo':
          return (
            <g key={idx} transform={`translate(${dibujo.x}, ${dibujo.y})`}>
              <line x1="-15" y1="0" x2="15" y2="0" stroke="#FF0000" strokeWidth={size/2} />
              <line x1="0" y1="-15" x2="0" y2="15" stroke="#FF0000" strokeWidth={size/2} />
            </g>
          )
        case 'lipotras':
          return (
            <rect
              key={idx}
              x={dibujo.x - size}
              y={dibujo.y - size}
              width={size * 2}
              height={size * 2}
              fill="url(#lipotransfer-pattern)"
              stroke="#0000FF"
              strokeWidth="1"
            />
          )
        case 'musculo':
          return (
            <line
              key={idx}
              x1={dibujo.x}
              y1={dibujo.y - size}
              x2={dibujo.x}
              y2={dibujo.y + size}
              stroke="#00FF00"
              strokeWidth={size}
              strokeDasharray="5,3"
            />
          )
        case 'incision':
          return (
            <circle
              key={idx}
              cx={dibujo.x}
              cy={dibujo.y}
              r={size}
              fill="none"
              stroke="#FF6600"
              strokeWidth="3"
            />
          )
        default:
          return null
      }
    })
  }

  return (
    <div className="esquema-mejorado">
      {!modoVistaPrevia && (
        <div className="controls-panel mb-4 p-4 bg-white rounded-lg shadow">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTool("select")}
                className={`px-3 py-2 rounded text-sm ${activeTool === "select" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
              >
                🖱️ Seleccionar
              </button>
              <button 
                onClick={() => setActiveTool("draw")}
                className={`px-3 py-2 rounded text-sm ${activeTool === "draw" ? "bg-red-600 text-white" : "bg-gray-200"}`}
              >
                ✏️ Dibujar
              </button>
            </div>
            
            {activeTool === 'draw' && (
              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium">Procedimiento:</span>
                <select 
                  value={selectedProcedure}
                  onChange={(e) => setSelectedProcedure(e.target.value as ProcedureType)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="lipo">Liposucción</option>
                  <option value="lipotras">Lipotransferencia</option>
                  <option value="musculo">Músculo</option>
                  <option value="incision">Incisión</option>
                </select>
                
                <span className="text-sm font-medium ml-2">Grosor:</span>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm">{strokeWidth}</span>
              </div>
            )}
            
            <div className="flex gap-2 ml-auto">
              <button onClick={zoomIn} className="px-3 py-2 bg-blue-500 text-white rounded text-sm">Zoom +</button>
              <button onClick={zoomOut} className="px-3 py-2 bg-blue-500 text-white rounded text-sm">Zoom -</button>
              <button onClick={resetZoom} className="px-3 py-2 bg-gray-500 text-white rounded text-sm">Reset Zoom</button>
              <button onClick={undo} className="px-3 py-2 bg-yellow-500 text-white rounded text-sm">Deshacer</button>
              <button onClick={clearAll} className="px-3 py-2 bg-red-500 text-white rounded text-sm">Borrar Todo</button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            <span>Zoom: {Math.round(zoom * 100)}% | </span>
            <span>Herramienta: {activeTool} | </span>
            <span>Dibujos: {drawings.length} | </span>
            <span>Ctrl + arrastrar para mover | </span>
            <span>Rueda del ratón para zoom</span>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="relative border rounded overflow-hidden bg-white"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ 
          cursor: isDragging ? 'grabbing' : activeTool === 'draw' ? 'crosshair' : 'default',
          height: modoVistaPrevia ? '300px' : '600px'
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 400 600"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
          onMouseDown={startDrawing}
        >
          {renderPatterns()}
          
          {/* Imagen base del esquema */}
          <image 
            href={tipo === 'corporal' ? "/images/schema.png" : "/images/schema-facial.png"}
            x="0"
            y="0"
            width="400"
            height="600"
            preserveAspectRatio="xMidYMid meet"
          />
          
          {/* Dibujos actuales */}
          {renderDrawings()}
          
          {/* Dibujo en progreso */}
          {currentPath && (
            <path
              d={currentPath}
              fill="none"
              stroke={selectedProcedure === 'lipo' ? '#FF0000' : 
                     selectedProcedure === 'lipotras' ? '#0000FF' :
                     selectedProcedure === 'musculo' ? '#00FF00' : '#FF6600'}
              strokeWidth={strokeWidth * 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        
        {!modoVistaPrevia && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
            <div>🖱️ Clic: {selectedProcedure}</div>
            <div>📏 Grosor: {strokeWidth}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EsquemaMejorado