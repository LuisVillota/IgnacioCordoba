from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.adicional import Adicional
from src.schemas.adicional import (
    AdicionalCreate,
    AdicionalResponse
)

router = APIRouter(
    prefix="/adicionales",
    tags=["Adicionales"]
)


@router.get("/", response_model=list[AdicionalResponse])
def listar_adicionales(db: Session = Depends(get_db)):
    return db.query(Adicional).all()


@router.post("/", response_model=AdicionalResponse)
def crear_adicional(
    data: AdicionalCreate,
    db: Session = Depends(get_db)
):
    adicional = Adicional(**data.model_dump())
    db.add(adicional)
    db.commit()
    db.refresh(adicional)
    return adicional


@router.put("/{adicional_id}", response_model=AdicionalResponse)
def actualizar_adicional(
    adicional_id: str,
    data: AdicionalCreate,
    db: Session = Depends(get_db)
):
    adicional = db.get(Adicional, adicional_id)

    if not adicional:
        raise HTTPException(status_code=404, detail="Adicional no encontrado")

    for key, value in data.model_dump().items():
        setattr(adicional, key, value)

    db.commit()
    db.refresh(adicional)
    return adicional


@router.delete("/{adicional_id}")
def eliminar_adicional(
    adicional_id: str,
    db: Session = Depends(get_db)
):
    adicional = db.get(Adicional, adicional_id)

    if not adicional:
        raise HTTPException(status_code=404, detail="Adicional no encontrado")

    db.delete(adicional)
    db.commit()
    return {"message": "Adicional eliminado correctamente"}
