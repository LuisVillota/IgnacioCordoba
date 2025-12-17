from pydantic import BaseModel

class ProcedimientoBase(BaseModel):
    nombre: str
    precio: int

class ProcedimientoCreate(ProcedimientoBase):
    pass

class ProcedimientoResponse(ProcedimientoBase):
    id: str

    class Config:
        from_attributes = True
