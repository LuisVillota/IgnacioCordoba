from pydantic import BaseModel

class AdicionalBase(BaseModel):
    nombre: str
    precio: int


class AdicionalCreate(AdicionalBase):
    pass


class AdicionalResponse(AdicionalBase):
    id: str

    class Config:
        from_attributes = True
