import jsPDF from "jspdf"

// Carga el logo desde /images/logo.jpg como base64
const loadLogoBase64 = async (): Promise<string> => {
  try {
    const response = await fetch('/images/logo.jpg')
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

export interface PlanPDFData {
  datospaciente: {
    nombre_completo: string
    identificacion: string
    edad: number
    peso: string | number
    altura: string | number
    imc: number
    categoriaIMC: string
    fecha_consulta: string
    hora_consulta: string
  }
  historiaClinica: {
    ocupacion: string
    fecha_nacimiento: string
    edad_calculada: number
    entidad: string
    referido_por?: string
    telefono: string
    celular: string
    direccion: string
    email: string
    motivo_consulta: string
    descripcion_enfermedad_actual?: string
    enfermedad_actual: Record<string, boolean>
    antecedentes: {
      farmacologicos: string
      traumaticos: string
      quirurgicos: string
      alergicos: string
      toxicos: string
      habitos: string
      ginecologicos: string
      fuma: string
    }
    enfermedades_piel?: boolean | string
    tratamientos_esteticos?: string
    antecedentes_familiares?: string
    contextura?: string
    notas_corporales: {
      cabeza: string
      mamas: string
      tcs: string
      abdomen: string
      gluteos: string
      extremidades: string
      piel_faneras: string
    }
    diagnostico: string
    plan_conducta: string
  }
  conductaQuirurgica: {
    duracion_estimada: string | number
    tipo_anestesia: string
    requiere_hospitalizacion: boolean
    tiempo_hospitalizacion: string
    reseccion_estimada: string
  }
  notasDoctor: string
  esquemaImageDataUrl?: string | null
  procedimientos?: string[]
}

// ─── Colores ───────────────────────────────────────────────────────────────
const VERDE     : [number,number,number] = [26, 107, 50]
const VERDE_CLR : [number,number,number] = [232, 245, 238]
const GRIS_LIN  : [number,number,number] = [200, 200, 200]
const GRIS_FND  : [number,number,number] = [245, 245, 245]
const BLANCO    : [number,number,number] = [255, 255, 255]
const NEGRO     : [number,number,number] = [0, 0, 0]
const GRIS_TXT  : [number,number,number] = [80, 80, 80]

const PAGE_W  = 210
const PAGE_H  = 297
const MARGIN  = 12
const INNER_W = PAGE_W - MARGIN * 2
const ROW_H   = 14
const ANT_H   = 10

// ─── Helpers ───────────────────────────────────────────────────────────────
const sf = (d: jsPDF, c: [number,number,number]) => d.setFillColor(c[0], c[1], c[2])
const sd = (d: jsPDF, c: [number,number,number]) => d.setDrawColor(c[0], c[1], c[2])
const st = (d: jsPDF, c: [number,number,number]) => d.setTextColor(c[0], c[1], c[2])

function drawHeader(doc: jsPDF, page: number, logoBase64?: string) {
  sf(doc, VERDE); doc.rect(0, 0, PAGE_W, 22, "F")

  // Logo real o placeholder
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', MARGIN, 2, 36, 18)
    } catch {
      sf(doc, BLANCO); doc.roundedRect(MARGIN, 3, 22, 16, 2, 2, "F")
      st(doc, VERDE); doc.setFont("helvetica", "bold"); doc.setFontSize(7)
      doc.text("LOGO", MARGIN + 11, 12, { align: "center" })
    }
  } else {
    sf(doc, BLANCO); doc.roundedRect(MARGIN, 3, 22, 16, 2, 2, "F")
    st(doc, VERDE); doc.setFont("helvetica", "bold"); doc.setFontSize(7)
    doc.text("LOGO", MARGIN + 11, 12, { align: "center" })
  }

  // Título centro
  st(doc, BLANCO); doc.setFont("helvetica", "bold"); doc.setFontSize(13)
  doc.text("PLAN QUIRÚRGICO", PAGE_W / 2, 10, { align: "center" })
  doc.setFont("helvetica", "normal"); doc.setFontSize(7)
  doc.text("Historia Clínica · Cirugía Plástica", PAGE_W / 2, 16, { align: "center" })

  // Info derecha
  doc.setFontSize(6.5)
  doc.text("N° Registro: _______________", PAGE_W - MARGIN, 8,  { align: "right" })
  doc.text("Fecha: _____________________", PAGE_W - MARGIN, 13, { align: "right" })
  doc.text(`Página: ${page}`,              PAGE_W - MARGIN, 18, { align: "right" })
}

function drawFooter(doc: jsPDF) {
  sf(doc, VERDE); doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F")
  st(doc, BLANCO); doc.setFont("helvetica", "normal"); doc.setFontSize(6)
  doc.text(
    "Calle 5D # 38a-35 Edificio Vida Cons 814-815  ·  Tels: 5518244 / 3176688522  ·  hica-administracion@hotmail.com",
    PAGE_W / 2, PAGE_H - 4, { align: "center" }
  )
}

function sectionBar(doc: jsPDF, y: number, title: string): number {
  sf(doc, VERDE); doc.rect(MARGIN, y, INNER_W, 7, "F")
  st(doc, BLANCO); doc.setFont("helvetica", "bold"); doc.setFontSize(8)
  doc.text(title, MARGIN + 3, y + 5)
  return y + 9
}

function fieldCell(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  bg: [number,number,number] = BLANCO
) {
  sf(doc, bg); sd(doc, GRIS_LIN); doc.rect(x, y, w, h, "FD")
  doc.setFont("helvetica", "bold"); doc.setFontSize(6); st(doc, GRIS_TXT)
  doc.text(label, x + 2, y + 4)
  if (value) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); st(doc, NEGRO)
    const lines: string[] = doc.splitTextToSize(value, w - 4)
    doc.text(lines[0], x + 2, y + 10)
  }
}

function antRow(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string
) {
  const lw = 42, vw = w - lw
  sf(doc, GRIS_FND); sd(doc, GRIS_LIN); doc.rect(x, y, lw, h, "FD")
  sf(doc, BLANCO);                       doc.rect(x + lw, y, vw, h, "FD")
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); st(doc, GRIS_TXT)
  doc.text(label, x + 2, y + h / 2 + 1.5)
  if (value) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); st(doc, NEGRO)
    const lines: string[] = doc.splitTextToSize(value, vw - 4)
    doc.text(lines[0], x + lw + 2, y + h / 2 + 1.5)
  }
}

function textArea(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string
) {
  sf(doc, BLANCO); sd(doc, GRIS_LIN); doc.rect(x, y, w, h, "FD")
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); st(doc, GRIS_TXT)
  doc.text(label, x + 2, y + 4.5)
  if (value) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); st(doc, NEGRO)
    const lines: string[] = doc.splitTextToSize(value, w - 4)
    lines.slice(0, 5).forEach((l: string, i: number) => doc.text(l, x + 2, y + 9.5 + i * 4.5))
  }
}

function cbBox(doc: jsPDF, x: number, y: number, checked: boolean, label: string) {
  sd(doc, GRIS_LIN); sf(doc, checked ? VERDE_CLR : BLANCO)
  doc.rect(x, y, 4, 4, "FD")
  if (checked) {
    st(doc, VERDE); doc.setFont("helvetica", "bold"); doc.setFontSize(7)
    doc.text("x", x + 0.8, y + 3.2)
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); st(doc, NEGRO)
  doc.text(label, x + 5.5, y + 3.2)
}

// ─── Función principal ─────────────────────────────────────────────────────
export async function generarPlanPDF(data: PlanPDFData): Promise<void> {
  const logoBase64 = await loadLogoBase64()

  const doc  = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  let page   = 1
  let y      = 25

  drawHeader(doc, page, logoBase64)
  drawFooter(doc)

  const check = (needed: number) => {
    if (y + needed > PAGE_H - 14) {
      doc.addPage(); page++
      drawHeader(doc, page, logoBase64)
      drawFooter(doc)
      y = 25
    }
  }

  const { datospaciente: dp, historiaClinica: hc, conductaQuirurgica: cq, notasDoctor } = data

  // ══ SECCIÓN 1 — DATOS PERSONALES ══════════════════════════════════════════
  check(80)
  y = sectionBar(doc, y, "SECCIÓN 1 — DATOS PERSONALES")

  const c3 = INNER_W / 3
  fieldCell(doc, MARGIN,        y, c3, ROW_H, "Nombre completo",       dp.nombre_completo)
  fieldCell(doc, MARGIN + c3,   y, c3, ROW_H, "Identificación / C.C.", dp.identificacion)
  fieldCell(doc, MARGIN + c3*2, y, c3, ROW_H, "Ocupación",             hc.ocupacion)
  y += ROW_H

  const [ca, cb, cc] = [INNER_W*.15, INNER_W*.35, INNER_W*.50]
  fieldCell(doc, MARGIN,       y, ca, ROW_H, "Edad (años)", String(dp.edad || hc.edad_calculada || ""))
  fieldCell(doc, MARGIN+ca,    y, cb, ROW_H, "Referido por", hc.referido_por || "")
  fieldCell(doc, MARGIN+ca+cb, y, cc, ROW_H, "Entidad / EPS", hc.entidad)
  y += ROW_H

  const [ce, cf, cg] = [INNER_W*.28, INNER_W*.22, INNER_W*.50]
  fieldCell(doc, MARGIN,       y, ce, ROW_H, "Fecha de nacimiento", hc.fecha_nacimiento)
  fieldCell(doc, MARGIN+ce,    y, cf, ROW_H, "Teléfono",            hc.telefono)
  fieldCell(doc, MARGIN+ce+cf, y, cg, ROW_H, "Celular",             hc.celular)
  y += ROW_H

  fieldCell(doc, MARGIN,             y, INNER_W*.55, ROW_H, "Dirección",          hc.direccion)
  fieldCell(doc, MARGIN+INNER_W*.55, y, INNER_W*.45, ROW_H, "Correo electrónico", hc.email)
  y += ROW_H + 2

  check(22)
  textArea(doc, MARGIN, y, INNER_W, 20, "MOTIVO DE CONSULTA", hc.motivo_consulta)
  y += 22

  // ══ SECCIÓN 2 — ENFERMEDAD ACTUAL ══════════════════════════════════════════
  check(70)
  y = sectionBar(doc, y, "SECCIÓN 2 — ENFERMEDAD ACTUAL")

  textArea(doc, MARGIN, y, INNER_W, 16, "Descripción de la enfermedad actual", hc.descripcion_enfermedad_actual || "")
  y += 18

  const ENF_MAP: Record<string, string> = {
    acido_peptica:       "Enf. Ácido Péptica",
    cardiopatias:        "Cardiopatías",
    diabetes:            "Diabetes",
    hepatitis:           "Hepatitis",
    hipertension:        "Hipertensión",
    neurologicas:        "Nefrológicos",
    discrasia_sanguinea: "Discrasia Sanguínea",
    reumatologicas:      "Reumatológicos",
    enfermedad_mental:   "Enf. Mental",
  }
  const ENF_GRID = [
    ["acido_peptica",       "cardiopatias",        "diabetes"],
    ["hepatitis",           "hipertension",        "neurologicas"],
    ["discrasia_sanguinea", "reumatologicas",      "enfermedad_mental"],
  ]
  const cbW = INNER_W / 3, cbH = 9

  ENF_GRID.forEach(row => {
    check(cbH + 1)
    row.forEach((key, ci) => {
      sf(doc, BLANCO); sd(doc, GRIS_LIN)
      doc.rect(MARGIN + ci * cbW, y, cbW, cbH, "FD")
      cbBox(doc, MARGIN + ci * cbW + 3, y + 2.5,
        !!(hc.enfermedad_actual as any)[key],
        ENF_MAP[key] || key)
    })
    y += cbH
  })
  y += 4

  // ══ SECCIÓN 3 — ANTECEDENTES ═══════════════════════════════════════════════
  check(20)
  y = sectionBar(doc, y, "SECCIÓN 3 — ANTECEDENTES")

  const ants: [string, string][] = [
    ["Farmacológicos",               hc.antecedentes.farmacologicos || ""],
    ["Traumáticos",                  hc.antecedentes.traumaticos    || ""],
    ["Quirúrgicos",                  hc.antecedentes.quirurgicos    || ""],
    ["Alérgicos",                    hc.antecedentes.alergicos      || ""],
    ["Tóxicos",                      hc.antecedentes.toxicos        || ""],
    ["Hábitos",                      hc.antecedentes.habitos        || ""],
    ["Ginecológicos",                hc.antecedentes.ginecologicos  || ""],
    ["Enf. / Ca. de Piel",          hc.enfermedades_piel ? "Sí" : "No"],
    ["Tratamientos Estéticos Previos", hc.tratamientos_esteticos    || ""],
    ["Antecedentes Familiares",      hc.antecedentes_familiares     || ""],
  ]
  ants.forEach(([lbl, val]) => {
    check(ANT_H + 1)
    antRow(doc, MARGIN, y, INNER_W, ANT_H, lbl, val)
    y += ANT_H
  })

  check(10)
  sf(doc, BLANCO); sd(doc, GRIS_LIN); doc.rect(MARGIN, y, INNER_W, 9, "FD")
  cbBox(doc, MARGIN + 3, y + 2.5, hc.antecedentes.fuma === "si", "Fuma")
  y += 11

  // ══ SECCIÓN 4 — EXAMEN FÍSICO GENERAL ═════════════════════════════════════
  check(55)
  y = sectionBar(doc, y, "SECCIÓN 4 — EXAMEN FÍSICO GENERAL")

  const [e1, e2, e3, e4] = [INNER_W*.18, INNER_W*.18, INNER_W*.18, INNER_W*.46]
  fieldCell(doc, MARGIN,          y, e1, ROW_H, "Peso (kg)",        String(dp.peso   || ""))
  fieldCell(doc, MARGIN+e1,       y, e2, ROW_H, "Talla (m)",        String(dp.altura || ""))
  fieldCell(doc, MARGIN+e1+e2,    y, e3, ROW_H, "IMC",              dp.imc ? dp.imc.toFixed(1) : "")
  fieldCell(doc, MARGIN+e1+e2+e3, y, e4, ROW_H, "Clasificación IMC",dp.categoriaIMC || "")
  y += ROW_H + 2

  // Tabla referencia IMC
  check(32)
  const iw1 = 22, iw2 = 32, irh = 6, ix = MARGIN
  sf(doc, VERDE_CLR); sd(doc, GRIS_LIN)
  doc.rect(ix, y, iw1+iw2, irh, "FD")
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); st(doc, NEGRO)
  doc.text("IMC",           ix + 2,       y + 4)
  doc.text("Clasificación", ix + iw1 + 2, y + 4)
  y += irh

  const irows: [string, string][] = [
    ["< 18.5",      "Bajo peso"],
    ["18.5 – 24.9", "Normal"],
    ["25 – 29.9",   "Sobrepeso"],
    ["≥ 30",        "Obesidad"],
  ]
  irows.forEach(([r, c]) => {
    sf(doc, BLANCO)
    doc.rect(ix,       y, iw1, irh, "FD")
    doc.rect(ix + iw1, y, iw2, irh, "FD")
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); st(doc, NEGRO)
    doc.text(r, ix + 2,       y + 4)
    doc.text(c, ix + iw1 + 2, y + 4)
    y += irh
  })
  y += 4

  // ══ SECCIÓN 5 — EXPLORACIÓN REGIONAL ══════════════════════════════════════
  check(20)
  y = sectionBar(doc, y, "SECCIÓN 5 — EXPLORACIÓN REGIONAL Y DIAGNÓSTICO")

  const regiones: [string, string][] = [
    ["Cabeza",                  hc.notas_corporales.cabeza       || ""],
    ["Mamas",                   hc.notas_corporales.mamas        || ""],
    ["T.C.S",                   hc.notas_corporales.tcs          || ""],
    ["Contextura",              hc.contextura                    || ""],
    ["Abdomen",                 hc.notas_corporales.abdomen      || ""],
    ["Glúteos y Extremidades",  `${hc.notas_corporales.gluteos || ""} ${hc.notas_corporales.extremidades || ""}`.trim()],
    ["Piel y Faneras",          hc.notas_corporales.piel_faneras || ""],
  ]
  regiones.forEach(([lbl, val]) => {
    check(ANT_H + 1)
    antRow(doc, MARGIN, y, INNER_W, ANT_H, lbl, val)
    y += ANT_H
  })

  y += 2
  check(22); textArea(doc, MARGIN, y, INNER_W, 20, "DIAGNÓSTICO",    hc.diagnostico);  y += 22
  check(24); textArea(doc, MARGIN, y, INNER_W, 22, "PLAN / CONDUCTA",hc.plan_conducta); y += 24

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 2 — PLAN QUIRÚRGICO (Esquema + Cirugías + Conducta + Firmas)
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage(); page++
  drawHeader(doc, page, logoBase64)
  drawFooter(doc)
  y = 25

  // Datos resumidos del paciente (compacto)
  y = sectionBar(doc, y, "PLAN QUIRÚRGICO")

  const p5 = INNER_W / 5
  fieldCell(doc, MARGIN,       y, p5,     10, "Identificación", dp.identificacion)
  fieldCell(doc, MARGIN+p5,    y, p5*2,   10, "Nombre Completo", dp.nombre_completo)
  fieldCell(doc, MARGIN+p5*3,  y, p5,     10, "Fecha", dp.fecha_consulta || new Date().toLocaleDateString('es-CO'))
  fieldCell(doc, MARGIN+p5*4,  y, p5,     10, "Hora", dp.hora_consulta || "")
  y += 12

  // ── Imagen del esquema (corporal izq + facial der en una sola imagen) ──
  if (data.esquemaImageDataUrl) {
    try {
      const imgW = INNER_W
      const maxH = 140
      const imgH = Math.min(imgW / 1.6, maxH) // Relación horizontal (imagen combinada es ancha)

      sd(doc, GRIS_LIN); sf(doc, BLANCO)
      doc.rect(MARGIN - 0.5, y - 0.5, imgW + 1, imgH + 1, "FD")
      doc.addImage(data.esquemaImageDataUrl, 'PNG', MARGIN, y, imgW, imgH)
      y += imgH + 3
    } catch (imgError) {
      console.warn("No se pudo agregar la imagen del esquema al PDF:", imgError)
      sf(doc, GRIS_FND); sd(doc, GRIS_LIN)
      doc.rect(MARGIN, y, INNER_W, 25, "FD")
      st(doc, GRIS_TXT); doc.setFont("helvetica", "italic"); doc.setFontSize(9)
      doc.text("(Esquema no disponible)", PAGE_W / 2, y + 13, { align: "center" })
      y += 28
    }
  } else {
    sf(doc, GRIS_FND); sd(doc, GRIS_LIN)
    doc.rect(MARGIN, y, INNER_W, 25, "FD")
    st(doc, GRIS_TXT); doc.setFont("helvetica", "italic"); doc.setFontSize(9)
    doc.text("(Abra el editor de esquemas para incluir el esquema)", PAGE_W / 2, y + 13, { align: "center" })
    y += 28
  }

  // ── Leyenda de patrones (como en el formulario físico) ──────────────
  check(14)
  const legendY = y
  const legendItems = [
    { label: "Liposucción", pattern: "///" },
    { label: "Lipoinyección", pattern: "\\\\\\"},
    { label: "Amarre", pattern: "---" },
    { label: "Incisión", pattern: "___" },
  ]
  const legendBoxW = 12, legendBoxH = 6, legendGap = INNER_W / legendItems.length
  legendItems.forEach((item, i) => {
    const lx = MARGIN + i * legendGap
    sd(doc, NEGRO); sf(doc, BLANCO)
    doc.rect(lx, legendY, legendBoxW, legendBoxH, "FD")
    // Dibujar patrón dentro del cuadro
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); st(doc, NEGRO)
    doc.text(item.pattern, lx + legendBoxW / 2, legendY + 4.2, { align: "center" })
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); st(doc, NEGRO)
    doc.text(item.label, lx + legendBoxW + 2, legendY + 4.2)
  })
  y = legendY + legendBoxH + 4

  // ══ CIRUGÍAS (procedimientos seleccionados) ════════════════════════════
  const procs = data.procedimientos || []
  if (procs.length > 0) {
    check(10 + procs.length * 5)
    y = sectionBar(doc, y, "CIRUGÍAS")

    sf(doc, BLANCO); sd(doc, GRIS_LIN)
    const listH = Math.max(procs.length * 5 + 4, 12)
    doc.rect(MARGIN, y, INNER_W, listH, "FD")

    doc.setFont("helvetica", "normal"); doc.setFontSize(8); st(doc, NEGRO)
    procs.forEach((proc, i) => {
      doc.text(`${i + 1}. ${proc}`, MARGIN + 4, y + 4 + i * 5)
    })
    y += listH + 2
  }

  // ══ CONDUCTA QUIRÚRGICA ════════════════════════════════════════════════════
  check(40)
  y = sectionBar(doc, y, "CONDUCTA")

  // Fila 1: Tipo de anestesia con checkboxes
  sf(doc, BLANCO); sd(doc, GRIS_LIN)
  doc.rect(MARGIN, y, INNER_W, 10, "FD")
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); st(doc, GRIS_TXT)
  doc.text("Tipo de Anestesia:", MARGIN + 2, y + 6)

  const anestesias = ["General", "Sedación", "Local", "Local + Sedación", "Epidural"]
  let ax = MARGIN + 38
  anestesias.forEach(a => {
    const checked = (cq.tipo_anestesia || "").toLowerCase().includes(a.toLowerCase())
    cbBox(doc, ax, y + 3, checked, a)
    ax += doc.getTextWidth(a) + 12
  })
  y += 10

  // Fila 2: Hospitalización + Tiempo QX + Resección
  const q3 = INNER_W / 3
  fieldCell(doc, MARGIN,       y, q3, 10, "Hospitalización",
    cq.requiere_hospitalizacion ? `Sí – ${cq.tiempo_hospitalizacion || ""}` : "No")
  fieldCell(doc, MARGIN+q3,    y, q3, 10, "Tiempo Quirúrgico (min)", String(cq.duracion_estimada || ""))
  fieldCell(doc, MARGIN+q3*2,  y, q3, 10, "Resección Estimada", cq.reseccion_estimada || "")
  y += 12

  // Notas del doctor
  if (notasDoctor) {
    check(18)
    textArea(doc, MARGIN, y, INNER_W, 16, "NOTAS DEL DOCTOR", notasDoctor)
    y += 18
  }

  // ══ FIRMAS ═════════════════════════════════════════════════════════════════
  check(30); y += 6
  const fw = INNER_W / 2 - 8
  const fx1 = MARGIN + 8, fx2 = MARGIN + INNER_W / 2 + 8

  sd(doc, NEGRO); doc.setLineWidth(0.5)
  doc.line(fx1, y + 14, fx1 + fw, y + 14)
  doc.line(fx2, y + 14, fx2 + fw, y + 14)

  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); st(doc, NEGRO)
  doc.text("Firma del Médico Responsable", fx1 + fw/2, y + 18, { align: "center" })
  doc.text("Firma del Paciente",           fx2 + fw/2, y + 18, { align: "center" })

  doc.setFont("helvetica", "normal"); doc.setFontSize(7); st(doc, GRIS_TXT)
  doc.text("CMP / Reg. Médico: _______________", fx1 + fw/2, y + 23, { align: "center" })
  doc.text("C.C.: ___________________________",  fx2 + fw/2, y + 23, { align: "center" })

  // ── Descargar ───────────────────────────────────────────────────────────
  const nombre = dp.nombre_completo
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
  doc.save(`plan_quirurgico_${nombre || "paciente"}.pdf`)
}