from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.otro_adicional import OtroAdicional
from src.schemas.otro_adicional import (
    OtroAdicionalCreate,
    OtroAdicionalResponse
)

router = APIRouter(
    prefix="/otros-adicionales",
    tags=["Otros Adicionales"]
)


@router.get("/", response_model=list[OtroAdicionalResponse])
def listar_otros_adicionales(db: Session = Depends(get_db)):
    return db.query(OtroAdicional).all()


@router.post("/", response_model=OtroAdicionalResponse)
def crear_otro_adicional(
    data: OtroAdicionalCreate,
    db: Session = Depends(get_db)
):
    otro = OtroAdicional(**data.model_dump())
    db.add(otro)
    db.commit()
    db.refresh(otro)
    return otro


@router.put("/{otro_id}", response_model=OtroAdicionalResponse)
def actualizar_otro_adicional(
    otro_id: str,
    data: OtroAdicionalCreate,
    db: Session = Depends(get_db)
):
    otro = db.get(OtroAdicional, otro_id)

    if not otro:
        raise HTTPException(status_code=404, detail="Otro adicional no encontrado")

    for key, value in data.model_dump().items():
        setattr(otro, key, value)

    db.commit()
    db.refresh(otro)
    return otro


@router.delete("/{otro_id}")
def eliminar_otro_adicional(
    otro_id: str,
    db: Session = Depends(get_db)
):
    otro = db.get(OtroAdicional, otro_id)

    if not otro:
        raise HTTPException(status_code=404, detail="Otro adicional no encontrado")

    db.delete(otro)
    db.commit()
    return {"message": "Otro adicional eliminado correctamente"}
