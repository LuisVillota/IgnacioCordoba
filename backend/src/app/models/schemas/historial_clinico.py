from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 🔴 AGREGAR ESTOS MODELOS AL ARCHIVO

class HistoriaClinicaBase(BaseModel):
    paciente_id: int
    motivo_consulta: Optional[str] = None
    antecedentes_medicos: Optional[str] = None
    antecedentes_quirurgicos: Optional[str] = None
    antecedentes_alergicos: Optional[str] = None
    antecedentes_farmacologicos: Optional[str] = None
    exploracion_fisica: Optional[str] = None
    diagnostico: Optional[str] = None
    tratamiento: Optional[str] = None
    recomendaciones: Optional[str] = None
    fotos: Optional[str] = None

class HistoriaClinicaCreate(HistoriaClinicaBase):
    pass

class HistoriaClinicaUpdate(BaseModel):
    paciente_id: Optional[int] = None
    motivo_consulta: Optional[str] = None
    antecedentes_medicos: Optional[str] = None
    antecedentes_quirurgicos: Optional[str] = None
    antecedentes_alergicos: Optional[str] = None
    antecedentes_farmacologicos: Optional[str] = None
    exploracion_fisica: Optional[str] = None
    diagnostico: Optional[str] = None
    tratamiento: Optional[str] = None
    recomendaciones: Optional[str] = None
    fotos: Optional[str] = None

class HistoriaClinicaInDB(HistoriaClinicaBase):
    id: int
    fecha_creacion: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    success: bool
    message: str
    url: Optional[str] = None
    filename: Optional[str] = None