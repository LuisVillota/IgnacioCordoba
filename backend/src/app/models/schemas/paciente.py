from pydantic import BaseModel, validator
from typing import Optional
from datetime import date
import re

class PacienteBase(BaseModel):
    numero_documento: str
    tipo_documento: Optional[str] = "CC"
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    
    @validator('email')
    def validate_email(cls, v):
        if v and v != "":
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, v):
                raise ValueError('Formato de email inválido')
        return v
    
    @validator('telefono')
    def validate_telefono(cls, v):
        if v and v != "":
            # Eliminar espacios, guiones, paréntesis
            v_clean = re.sub(r'[\(\)\-\s+]', '', v)
            if not v_clean.isdigit():
                raise ValueError('El teléfono debe contener solo números')
        return v

class PacienteCreate(PacienteBase):
    pass

class PacienteUpdate(BaseModel):
    numero_documento: Optional[str] = None
    tipo_documento: Optional[str] = None
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    
    @validator('email')
    def validate_email(cls, v):
        if v and v != "":
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, v):
                raise ValueError('Formato de email inválido')
        return v
    
    @validator('telefono')
    def validate_telefono(cls, v):
        if v and v != "":
            v_clean = re.sub(r'[\(\)\-\s+]', '', v)
            if not v_clean.isdigit():
                raise ValueError('El teléfono debe contener solo números')
        return v

class PacienteInDB(PacienteBase):
    id: int
    fecha_registro: Optional[date] = None
    
    class Config:
        from_attributes = True

class PacienteBusqueda(BaseModel):
    id: int
    nombre_completo: str
    documento: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    edad: Optional[int] = None

class MessageResponse(BaseModel):
    message: str