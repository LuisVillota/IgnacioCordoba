from pydantic import BaseModel, validator
from typing import Optional, Dict, Union
from datetime import date, datetime
import json

class PlanQuirurgicoBase(BaseModel):
    paciente_id: int
    usuario_id: int
    procedimiento_desc: Optional[str] = None
    anestesiologo: Optional[str] = None
    materiales_requeridos: Optional[str] = None
    notas_preoperatorias: Optional[str] = None
    riesgos: Optional[str] = None
    hora: Optional[str] = None
    fecha_programada: Optional[str] = None
    
    # Datos básicos del paciente
    nombre_completo: Optional[str] = None
    peso: Optional[float] = None
    altura: Optional[float] = None
    fecha_nacimiento: Optional[str] = None
    imc: Optional[float] = None
    identificacion: Optional[str] = None
    fecha_consulta: Optional[str] = None
    hora_consulta: Optional[str] = None
    categoriaIMC: Optional[str] = None
    edad_calculada: Optional[int] = None
    edad: Optional[int] = None
    
    # Datos adicionales
    ocupacion: Optional[str] = None
    telefono: Optional[str] = None
    celular: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    motivo_consulta: Optional[str] = None
    entidad: Optional[str] = None
    
    # Antecedentes (texto plano)
    farmacologicos: Optional[str] = None
    traumaticos: Optional[str] = None
    quirurgicos: Optional[str] = None
    alergicos: Optional[str] = None
    toxicos: Optional[str] = None
    habitos: Optional[str] = None
    
    # Examen físico (texto plano)
    cabeza: Optional[str] = None
    mamas: Optional[str] = None
    tcs: Optional[str] = None
    abdomen: Optional[str] = None
    gluteos: Optional[str] = None
    extremidades: Optional[str] = None
    pies_faneras: Optional[str] = None
    
    # Conducta quirúrgica
    duracion_estimada: Optional[int] = None
    tipo_anestesia: Optional[str] = None
    requiere_hospitalizacion: Optional[bool] = False
    tiempo_hospitalizacion: Optional[str] = None
    reseccion_estimada: Optional[str] = None
    firma_cirujano: Optional[str] = None
    firma_paciente: Optional[str] = None
    
    # JSON fields
    enfermedad_actual: Optional[Dict] = None
    antecedentes: Optional[Dict] = None
    notas_corporales: Optional[Dict] = None
    
    # Nuevos campos
    fecha_modificacion: Optional[str] = None
    esquema_mejorado: Optional[Dict] = None
    plan_conducta: Optional[str] = None
    
    # Otros campos
    imagen_procedimiento: Optional[str] = None
    fecha_ultimo_procedimiento: Optional[str] = None
    descripcion_procedimiento: Optional[str] = None
    detalles: Optional[str] = None
    notas_doctor: Optional[str] = None
    tiempo_cirugia_minutos: Optional[int] = None

class PlanQuirurgicoCreate(PlanQuirurgicoBase):
    pass

class PlanQuirurgicoUpdate(BaseModel):
    estado_id: Optional[int] = None
    procedimiento_desc: Optional[str] = None
    anestesiologo: Optional[str] = None
    materiales_requeridos: Optional[str] = None
    notas_preoperatorias: Optional[str] = None
    riesgos: Optional[str] = None
    hora: Optional[str] = None
    fecha_programada: Optional[str] = None
    
    # Datos médicos
    peso: Optional[float] = None
    altura: Optional[float] = None
    imc: Optional[float] = None
    
    # Antecedentes
    farmacologicos: Optional[str] = None
    traumaticos: Optional[str] = None
    quirurgicos: Optional[str] = None
    alergicos: Optional[str] = None
    toxicos: Optional[str] = None
    habitos: Optional[str] = None
    
    # Examen físico
    cabeza: Optional[str] = None
    mamas: Optional[str] = None
    tcs: Optional[str] = None
    abdomen: Optional[str] = None
    gluteos: Optional[str] = None
    extremidades: Optional[str] = None
    pies_faneras: Optional[str] = None
    
    # Conducta quirúrgica
    duracion_estimada: Optional[int] = None
    tipo_anestesia: Optional[str] = None
    requiere_hospitalizacion: Optional[bool] = None
    tiempo_hospitalizacion: Optional[str] = None
    reseccion_estimada: Optional[str] = None
    firma_cirujano: Optional[str] = None
    firma_paciente: Optional[str] = None
    
    # JSON fields
    enfermedad_actual: Optional[Dict] = None
    antecedentes: Optional[Dict] = None
    notas_corporales: Optional[Dict] = None
    
    # Nuevos campos
    esquema_mejorado: Optional[Dict] = None
    plan_conducta: Optional[str] = None
    
    # Otros
    imagen_procedimiento: Optional[str] = None
    descripcion_procedimiento: Optional[str] = None
    detalles: Optional[str] = None
    notas_doctor: Optional[str] = None
    tiempo_cirugia_minutos: Optional[int] = None

class PlanQuirurgicoInDB(PlanQuirurgicoBase):
    id: int
    fecha_creacion: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None
    
    @validator('enfermedad_actual', 'antecedentes', 'notas_corporales', 'esquema_mejorado', pre=True)
    def parse_json_fields(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return None
        return v
    
    class Config:
        from_attributes = True
class DescargarArchivoRequest(BaseModel):
    nombreArchivo: str