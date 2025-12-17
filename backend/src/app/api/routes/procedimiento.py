from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.procedimiento import Procedimiento
from src.schemas.procedimiento import (
    ProcedimientoCreate,
    ProcedimientoResponse
)

router = APIRouter(
    prefix="/procedimientos",
    tags=["Procedimientos"]
)


@router.get("/", response_model=list[ProcedimientoResponse])
def listar_procedimientos(db: Session = Depends(get_db)):
    return db.query(Procedimiento).all()


@router.post("/", response_model=ProcedimientoResponse)
def crear_procedimiento(
    data: ProcedimientoCreate,
    db: Session = Depends(get_db)
):
    procedimiento = Procedimiento(**data.model_dump())
    db.add(procedimiento)
    db.commit()
    db.refresh(procedimiento)
    return procedimiento


@router.put("/{procedimiento_id}", response_model=ProcedimientoResponse)
def actualizar_procedimiento(
    procedimiento_id: str,
    data: ProcedimientoCreate,
    db: Session = Depends(get_db)
):
    procedimiento = db.get(Procedimiento, procedimiento_id)

    if not procedimiento:
        raise HTTPException(status_code=404, detail="Procedimiento no encontrado")

    for key, value in data.model_dump().items():
        setattr(procedimiento, key, value)

    db.commit()
    db.refresh(procedimiento)
    return procedimiento


@router.delete("/{procedimiento_id}")
def eliminar_procedimiento(
    procedimiento_id: str,
    db: Session = Depends(get_db)
):
    procedimiento = db.get(Procedimiento, procedimiento_id)

    if not procedimiento:
        raise HTTPException(status_code=404, detail="Procedimiento no encontrado")

    db.delete(procedimiento)
    db.commit()
    return {"message": "Procedimiento eliminado correctamente"}
