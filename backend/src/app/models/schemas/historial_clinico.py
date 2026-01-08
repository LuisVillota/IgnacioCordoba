from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HistorialClinicoBase(BaseModel):
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

class HistorialClinicoCreate(HistorialClinicoBase):
    pass

class HistorialClinicoUpdate(HistorialClinicoBase):
    pass

class HistorialClinicoInDB(HistorialClinicoBase):
    id: int
    fecha_creacion: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    success: bool
    message: str
    url: Optional[str] = None 
    file_url: Optional[str] = None  
    filename: Optional[str] = None
    
    class Config:
        extra = "allow"