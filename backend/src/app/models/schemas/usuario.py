from pydantic import BaseModel
from typing import Optional

class UsuarioBase(BaseModel):
    username: str
    nombre: str
    email: str

class UsuarioCreate(UsuarioBase):
    password: str
    rol_id: int
    activo: bool = True

class UsuarioUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    nombre: Optional[str] = None
    email: Optional[str] = None
    rol_id: Optional[int] = None
    activo: Optional[bool] = None

class UsuarioResponse(UsuarioBase):
    id: int
    rol: str
    activo: bool

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    success: bool
    message: str
    usuario: UsuarioResponse
    token: str

class MessageResponse(BaseModel):
    message: str