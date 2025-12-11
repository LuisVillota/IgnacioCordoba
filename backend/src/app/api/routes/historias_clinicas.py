from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from ...models.historial_clinico import HistorialClinico
from ...models.paciente import Paciente
from ...schemas.historial_clinico import (
    HistorialClinicoCreate, 
    HistorialClinicoUpdate, 
    HistorialClinicoResponse
)
from ....core.database import get_db

router = APIRouter(prefix="/api/historias-clinicas", tags=["Historia Clínica"])

@router.get("/", response_model=List[HistorialClinicoResponse])
def get_historias_clinicas(
    skip: int = Query(0, alias="offset"),
    limit: int = Query(100, alias="limit"),
    db: Session = Depends(get_db)
):
    """
    Obtener todas las historias clínicas
    """
    try:
        historias = db.query(HistorialClinico).offset(skip).limit(limit).all()
        return historias
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener historias clínicas: {str(e)}"
        )

@router.get("/paciente/{paciente_id}", response_model=List[HistorialClinicoResponse])
def get_historias_by_paciente(
    paciente_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener historias clínicas de un paciente específico
    """
    try:
        # Verificar que el paciente existe
        paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
        if not paciente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Paciente con ID {paciente_id} no encontrado"
            )
        
        historias = db.query(HistorialClinico).filter(
            HistorialClinico.paciente_id == paciente_id
        ).order_by(HistorialClinico.fecha_creacion.desc()).all()
        
        return historias
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener historias del paciente: {str(e)}"
        )

@router.get("/{historia_id}", response_model=HistorialClinicoResponse)
def get_historia_clinica(
    historia_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener una historia clínica específica por ID
    """
    try:
        historia = db.query(HistorialClinico).filter(
            HistorialClinico.id == historia_id
        ).first()
        
        if not historia:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Historia clínica con ID {historia_id} no encontrada"
            )
        
        return historia
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener la historia clínica: {str(e)}"
        )

@router.post("/", response_model=HistorialClinicoResponse, status_code=status.HTTP_201_CREATED)
def create_historia_clinica(
    historia: HistorialClinicoCreate,
    db: Session = Depends(get_db)
):
    """
    Crear una nueva historia clínica
    """
    try:
        # Verificar que el paciente existe
        paciente = db.query(Paciente).filter(Paciente.id == historia.paciente_id).first()
        if not paciente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Paciente con ID {historia.paciente_id} no encontrado"
            )
        
        # Crear la historia clínica
        db_historia = HistorialClinico(**historia.model_dump())
        db.add(db_historia)
        db.commit()
        db.refresh(db_historia)
        
        return db_historia
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la historia clínica: {str(e)}"
        )

@router.put("/{historia_id}", response_model=HistorialClinicoResponse)
def update_historia_clinica(
    historia_id: int,
    historia_update: HistorialClinicoUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar una historia clínica existente
    """
    try:
        db_historia = db.query(HistorialClinico).filter(
            HistorialClinico.id == historia_id
        ).first()
        
        if not db_historia:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Historia clínica con ID {historia_id} no encontrada"
            )
        
        # Actualizar los campos
        update_data = historia_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_historia, field, value)
        
        db.commit()
        db.refresh(db_historia)
        
        return db_historia
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar la historia clínica: {str(e)}"
        )

@router.delete("/{historia_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_historia_clinica(
    historia_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar una historia clínica
    """
    try:
        db_historia = db.query(HistorialClinico).filter(
            HistorialClinico.id == historia_id
        ).first()
        
        if not db_historia:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Historia clínica con ID {historia_id} no encontrada"
            )
        
        db.delete(db_historia)
        db.commit()
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la historia clínica: {str(e)}"
        )