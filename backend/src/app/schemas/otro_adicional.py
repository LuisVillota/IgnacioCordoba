from pydantic import BaseModel

class OtroAdicionalBase(BaseModel):
    nombre: str
    precio: int


class OtroAdicionalCreate(OtroAdicionalBase):
    pass


class OtroAdicionalResponse(OtroAdicionalBase):
    id: str

    class Config:
        from_attributes = True
