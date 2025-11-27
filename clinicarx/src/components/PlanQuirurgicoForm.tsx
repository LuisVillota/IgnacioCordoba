"use client"

import React, { useState, useRef, useEffect } from "react"
import { PlanQuirurgico } from "../types/planQuirurgico"

interface Props {
  plan?: PlanQuirurgico
  onGuardar: (plan: PlanQuirurgico) => void
}

// Interface para guardar las acciones de dibujo
interface DibujoAccion {
  tipo: "lipo" | "lipotras" | "musculo" | "incision"
  x: number
  y: number
  timestamp: number
  tamaño: number
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

  // ---------------------------
  // Canvas / Esquema corporal
  // ---------------------------
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [herramienta, setHerramienta] = useState<"lipo" | "lipotras" | "musculo" | "incision" | null>(null)
  const [isCoolingDown, setIsCoolingDown] = useState(false)
  
  // Estados para el zoom y dibujos
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  
  // Guardar los dibujos como objetos
  const [dibujos, setDibujos] = useState<DibujoAccion[]>(plan?.dibujos_esquema ?? [])

  // Estados para el tamaño de los dibujos (1: muy pequeño, 2: pequeño, 3: normal, 4: grande)
  const [tamañoDibujo, setTamañoDibujo] = useState(3)

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

  // Cargar imagen
  useEffect(() => {
    const img = new Image()
    img.src = "/images/schema.png"
    img.onload = () => {
      imgRef.current = img
      redrawCanvas()
    }
  }, [])

  // Redibujar canvas cuando cambia el zoom, offset o dibujos
  useEffect(() => {
    redrawCanvas()
  }, [zoom, offset, dibujos])

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !imgRef.current) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Guardar estado del contexto
    ctx.save()
    
    // Aplicar transformaciones de zoom y pan
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)
    
    // Dibujar imagen base
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)
    
    // Redibujar todos los dibujos
    dibujos.forEach(dibujo => {
      switch (dibujo.tipo) {
        case "lipo":
          drawLiposuccion(ctx, dibujo.x, dibujo.y, dibujo.tamaño, false)
          break
        case "lipotras":
          drawLipotras(ctx, dibujo.x, dibujo.y, dibujo.tamaño, false)
          break
        case "musculo":
          drawMusculo(ctx, dibujo.x, dibujo.y, dibujo.tamaño, false)
          break
        case "incision":
          drawIncision(ctx, dibujo.x, dibujo.y, dibujo.tamaño, false)
          break
      }
    })
    
    // Restaurar estado del contexto
    ctx.restore()
  }

  // Función auxiliar para convertir coordenadas de pantalla a coordenadas del canvas
  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - offset.x) / zoom
    const y = (clientY - rect.top - offset.y) / zoom
    
    return { x, y }
  }

  const saveDibujo = (tipo: "lipo" | "lipotras" | "musculo" | "incision", x: number, y: number, tamaño: number) => {
    const newDibujo: DibujoAccion = {
      tipo,
      x,
      y,
      tamaño,
      timestamp: Date.now()
    }
    setDibujos(prev => [...prev, newDibujo])
  }

  // Función para calcular el tamaño basado en la escala
  const getTamañoEscalado = (base: number, tamaño: number) => {
    const escalas = [0.5, 0.75, 1, 1.25] // muy pequeño, pequeño, normal, grande
    return base * escalas[tamaño - 1]
  }

  // Función para obtener el nombre del tamaño
  const getNombreTamaño = (tamaño: number) => {
    const nombres = ["Muy pequeño", "Pequeño", "Normal", "Grande"]
    return nombres[tamaño - 1]
  }

  function drawLiposuccion(ctx: CanvasRenderingContext2D, x: number, y: number, tamaño: number = 3, applyTransform: boolean = true) {
    if (applyTransform) {
      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(zoom, zoom)
    }
    
    ctx.strokeStyle = "red"
    ctx.lineWidth = 2 / zoom

    const spacing = getTamañoEscalado(8, tamaño)
    const length = getTamañoEscalado(40, tamaño)
    const slope = 0.25
    const numLines = 5
    const totalWidth = (numLines - 1) * spacing

    const offsetY = getTamañoEscalado(-20, tamaño)

    for (let i = 0; i < numLines; i++) {
        const offset = i * spacing - totalWidth / 2

        ctx.beginPath()
        ctx.moveTo(x + offset, y + length + offsetY)
        ctx.lineTo(x + offset + length * slope, y + offsetY)
        ctx.stroke()
    }

    // Línea vertical centrada y subida
    ctx.beginPath()
    ctx.moveTo(x, y + offsetY)
    ctx.lineTo(x, y + length + offsetY)
    ctx.stroke()

    if (applyTransform) {
      ctx.restore()
    }
  }

  const drawLipotras = (ctx: CanvasRenderingContext2D, x: number, y: number, tamaño: number = 3, applyTransform: boolean = true) => {
  if (applyTransform) {
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)
  }
  
  ctx.strokeStyle = "blue"
  ctx.lineWidth = 1.5 / zoom
  
  // Dibujar rejilla azul para lipotransferencia
  const gridSize = getTamañoEscalado(30, tamaño)
  const cellSize = getTamañoEscalado(6, tamaño)
  const numCells = Math.floor(gridSize / cellSize)
  const startX = x - gridSize / 2
  const startY = y - gridSize / 2

  for (let i = 1; i < numCells; i++) {
    ctx.beginPath()
    ctx.moveTo(startX + i * cellSize, startY)
    ctx.lineTo(startX + i * cellSize, startY + gridSize)
    ctx.stroke()
  }
 
  for (let i = 1; i < numCells; i++) {
    ctx.beginPath()
    ctx.moveTo(startX, startY + i * cellSize)
    ctx.lineTo(startX + gridSize, startY + i * cellSize)
    ctx.stroke()
  }

  if (applyTransform) {
    ctx.restore()
  }
}

  const drawMusculo = (ctx: CanvasRenderingContext2D, x: number, y: number, tamaño: number = 3, applyTransform: boolean = true) => {
    if (applyTransform) {
      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(zoom, zoom)
    }
    
    ctx.strokeStyle = "green"
    ctx.lineWidth = 4 / zoom
    const height = getTamañoEscalado(40, tamaño)
    
    ctx.beginPath()
    ctx.moveTo(x, y - height/2)
    ctx.lineTo(x, y + height/2)
    ctx.stroke()

    if (applyTransform) {
      ctx.restore()
    }
  }

  function drawIncision(ctx: CanvasRenderingContext2D, x: number, y: number, tamaño: number = 3, applyTransform: boolean = true) {
    if (applyTransform) {
      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(zoom, zoom)
    }
    
    ctx.strokeStyle = "red"
    ctx.lineWidth = 3 / zoom
    const radius = getTamañoEscalado(20, tamaño)
    
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI, false)
    ctx.stroke()

    if (applyTransform) {
      ctx.restore()
    }
  }

  const handleDraw = (e: React.MouseEvent) => {
    if (!herramienta || isCoolingDown) return
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const canvasCoords = getCanvasCoordinates(e.clientX, e.clientY)
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Guardar el dibujo en la lista con el tamaño seleccionado
    saveDibujo(herramienta, canvasCoords.x, canvasCoords.y, tamañoDibujo)

    // Dibujar inmediatamente
    switch (herramienta) {
      case "lipo":
        drawLiposuccion(ctx, canvasCoords.x, canvasCoords.y, tamañoDibujo)
        break
      case "lipotras":
        drawLipotras(ctx, canvasCoords.x, canvasCoords.y, tamañoDibujo)
        break
      case "musculo":
        drawMusculo(ctx, canvasCoords.x, canvasCoords.y, tamañoDibujo)
        break
      case "incision":
        drawIncision(ctx, canvasCoords.x, canvasCoords.y, tamañoDibujo)
        break
    }

    setIsCoolingDown(true)
    setTimeout(() => setIsCoolingDown(false), 500)
  }

  // Función para deseleccionar herramienta
  const deseleccionarHerramienta = () => {
    setHerramienta(null)
  }

  // Funciones de zoom
  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3))
  }

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5))
  }

  const resetZoom = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  // Zoom con rueda del mouse
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.5, Math.min(zoom * zoomFactor, 3))

    // Calcular nuevo offset para hacer zoom hacia el puntero del mouse
    const newOffsetX = mouseX - (mouseX - offset.x) * (newZoom / zoom)
    const newOffsetY = mouseY - (mouseY - offset.y) * (newZoom / zoom)

    setZoom(newZoom)
    setOffset({ x: newOffsetX, y: newOffsetY })
  }

  // Arrastrar para mover (pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault()
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const borrarTodo = () => {
    setDibujos([])
  }

  const deshacer = () => {
    setDibujos(prev => prev.slice(0, -1))
  }

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
      dibujos_esquema: dibujos,
      notas_doctor: notasDoctor,
      imagenes_adjuntas: imagenesAdjuntas,
      estado: plan?.estado ?? "borrador",
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

      {/* ESQUEMA */}
      <section className="p-4 border rounded bg-white">
        <h3 className="font-bold text-lg text-[#1a6b32] mb-3">Esquema Corporal Interactivo</h3>
        
        {/* Controles de zoom, herramientas y tamaños */}
        <div className="flex flex-wrap gap-2 items-center mb-3">
          {/* Controles de Zoom */}
          <div className="flex gap-2 mr-4">
            <button onClick={zoomIn} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Zoom In (+)
            </button>
            <button onClick={zoomOut} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Zoom Out (-)
            </button>
            <button onClick={resetZoom} className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">
              Reset Zoom
            </button>
          </div>
          
          {/* Controles de Tamaño */}
          <div className="flex gap-2 mr-4">
            <span className="text-sm font-medium text-gray-700 flex items-center">Tamaño:</span>
            <button 
              onClick={() => setTamañoDibujo(1)} 
              className={`px-2 py-1 text-xs rounded ${tamañoDibujo === 1 ? "bg-purple-500 text-white" : "bg-purple-200"}`}
            >
              Muy pequeño
            </button>
            <button 
              onClick={() => setTamañoDibujo(2)} 
              className={`px-2 py-1 text-xs rounded ${tamañoDibujo === 2 ? "bg-purple-500 text-white" : "bg-purple-200"}`}
            >
              Pequeño
            </button>
            <button 
              onClick={() => setTamañoDibujo(3)} 
              className={`px-2 py-1 text-xs rounded ${tamañoDibujo === 3 ? "bg-purple-500 text-white" : "bg-purple-200"}`}
            >
              Normal
            </button>
            <button 
              onClick={() => setTamañoDibujo(4)} 
              className={`px-2 py-1 text-xs rounded ${tamañoDibujo === 4 ? "bg-purple-500 text-white" : "bg-purple-200"}`}
            >
              Grande
            </button>
          </div>
          
          {/* Herramientas de Dibujo */}
          <div className="flex gap-2">
            <button 
              onClick={() => setHerramienta("lipo")} 
              className={`px-3 py-1 rounded ${herramienta === "lipo" ? "bg-red-500 text-white" : "bg-red-200"}`}
            >
              Liposucción
            </button>
            <button 
              onClick={() => setHerramienta("lipotras")} 
              className={`px-3 py-1 rounded ${herramienta === "lipotras" ? "bg-blue-500 text-white" : "bg-blue-200"}`}
            >
              Lipotransferencia
            </button>
            <button 
              onClick={() => setHerramienta("musculo")} 
              className={`px-3 py-1 rounded ${herramienta === "musculo" ? "bg-green-500 text-white" : "bg-green-200"}`}
            >
              Amarre Músculos
            </button>
            <button 
              onClick={() => setHerramienta("incision")} 
              className={`px-3 py-1 rounded ${herramienta === "incision" ? "bg-orange-500 text-white" : "bg-orange-200"}`}
            >
              Incisión
            </button>
            <button 
              onClick={deseleccionarHerramienta}
              className={`px-3 py-1 rounded ${!herramienta ? "bg-gray-500 text-white" : "bg-gray-200"}`}
            >
              Deseleccionar
            </button>
            <button onClick={deshacer} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
              Deshacer
            </button>
            <button onClick={borrarTodo} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">
              Borrar Todo
            </button>
          </div>
        </div>

        {/* Indicador de estado actual */}
        <div className="text-sm text-gray-600 mb-2">
          Zoom: {Math.round(zoom * 100)}% | 
          Tamaño: {getNombreTamaño(tamañoDibujo)} | 
          Herramienta: {herramienta ? herramienta : "Ninguna"} | 
          Dibujos: {dibujos.length} | 
          Usa la rueda del mouse para hacer zoom | 
          Ctrl + arrastrar o botón medio para mover
        </div>

        {/* Canvas con eventos */}
        <canvas
          ref={canvasRef}
          width={600}
          height={800}
          onClick={handleDraw}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => {
            handleMouseMove(e)
            if (e.buttons === 1 && !e.ctrlKey && !isDragging && herramienta) handleDraw(e)
          }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="border rounded cursor-crosshair"
          style={{
            cursor: isDragging ? 'grabbing' : herramienta ? 'crosshair' : 'default'
          }}
        />
      </section>

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