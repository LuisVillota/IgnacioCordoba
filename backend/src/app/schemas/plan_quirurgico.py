from pydantic import BaseModel, Field
from datetime import datetime, time, date
from typing import Optional, List, Dict, Any
from decimal import Decimal

# Sub-schemas para estructura compleja
class Datospaciente(BaseModel):
    id: Optional[str] = None
    identificacion: Optional[str] = None
    edad: Optional[int] = None
    nombre_completo: Optional[str] = None
    peso: Optional[Decimal] = None
    altura: Optional[Decimal] = None
    imc: Optional[Decimal] = None
    categoriaIMC: Optional[str] = None
    fecha_consulta: Optional[date] = None
    hora_consulta: Optional[time] = None

class EnfermedadActual(BaseModel):
    hepatitis: bool = False
    discrasia_sanguinea: bool = False
    cardiopatias: bool = False
    hipertension: bool = False
    reumatologicas: bool = False
    diabetes: bool = False
    neurologicas: bool = False
    enfermedad_mental: bool = False
    no_refiere: bool = True

class Antecedentes(BaseModel):
    farmacologicos: Optional[str] = None
    traumaticos: Optional[str] = None
    quirurgicos: Optional[str] = None
    alergicos: Optional[str] = None
    toxicos: Optional[str] = None
    habitos: Optional[str] = None
    ginecologicos: Optional[str] = None
    fuma: str = "no"
    planificacion: Optional[str] = None

class NotasCorporales(BaseModel):
    cabeza: Optional[str] = None
    mamas: Optional[str] = None
    tcs: Optional[str] = None
    abdomen: Optional[str] = None
    gluteos: Optional[str] = None
    extremidades: Optional[str] = None
    pies_faneras: Optional[str] = None

class HistoriaClinica(BaseModel):
    nombre_completo: Optional[str] = None
    identificacion: Optional[str] = None
    ocupacion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    edad_calculada: Optional[int] = None
    referido_por: Optional[str] = None
    entidad: Optional[str] = None
    telefono: Optional[str] = None
    celular: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    motivo_consulta: Optional[str] = None
    motivo_consulta_detalle: Optional[str] = None
    enfermedad_actual: EnfermedadActual = Field(default_factory=EnfermedadActual)
    antecedentes: Antecedentes = Field(default_factory=Antecedentes)
    enfermedades_piel: bool = False
    tratamientos_esteticos: Optional[str] = None
    antecedentes_familiares: Optional[str] = None
    peso: Optional[Decimal] = None
    altura: Optional[Decimal] = None
    imc: Optional[Decimal] = None
    contextura: Optional[str] = None
    notas_corporales: NotasCorporales = Field(default_factory=NotasCorporales)
    diagnostico: Optional[str] = None
    plan_conducta: Optional[str] = None

class CirugiaPrevia(BaseModel):
    id: Optional[str] = None
    fecha: Optional[date] = None
    procedimiento: Optional[str] = None
    descripcion: Optional[str] = None
    detalles: Optional[str] = None

class ConductaQuirurgica(BaseModel):
    duracion_estimada: Optional[str] = None
    tipo_anestesia: str = "ninguna"
    requiere_hospitalizacion: bool = False
    tiempo_hospitalizacion: Optional[str] = None
    reseccion_estimada: Optional[str] = None
    firma_cirujano: Optional[str] = None
    firma_paciente: Optional[str] = None

class EsquemaMejorado(BaseModel):
    zoneMarkings: Dict[str, str] = {}
    selectionHistory: List[Dict[str, Any]] = []
    currentStrokeWidth: int = 3
    currentTextSize: int = 16
    selectedProcedure: str = "liposuction"

# Schema principal
class PlanQuirurgicoCreate(BaseModel):
    id_paciente: Optional[str] = None
    id_usuario: str = "doctor_001"
    datos_paciente: Datospaciente
    historia_clinica: HistoriaClinica
    cirugias_previas: List[CirugiaPrevia] = []
    conducta_quirurgica: ConductaQuirurgica
    dibujos_esquema: List[Dict[str, Any]] = []
    notas_doctor: Optional[str] = None
    imagenes_adjuntas: List[str] = []
    estado: str = "borrador"
    esquema_mejorado: Optional[EsquemaMejorado] = None

class PlanQuirurgicoUpdate(BaseModel):
    datos_paciente: Optional[Datospaciente] = None
    historia_clinica: Optional[HistoriaClinica] = None
    cirugias_previas: Optional[List[CirugiaPrevia]] = None
    conducta_quirurgica: Optional[ConductaQuirurgica] = None
    notas_doctor: Optional[str] = None
    imagenes_adjuntas: Optional[List[str]] = None
    estado: Optional[str] = None
    esquema_mejorado: Optional[EsquemaMejorado] = None

class PlanQuirurgicoResponse(PlanQuirurgicoCreate):
    id: str
    fecha_creacion: datetime
    fecha_modificacion: datetime

    class Config:
        from_attributes = True