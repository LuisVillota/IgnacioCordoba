from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...schemas.cotizacion import CotizacionCreate, CotizacionResponse
from ...models.cotizacion import Cotizacion, CotizacionItem, CotizacionServicioIncluido
from ...core.database import get_db

router = APIRouter()

@router.post("/", response_model=CotizacionResponse)
async def create_cotizacion(
    cotizacion: CotizacionCreate,
    db: Session = Depends(get_db)
):
    """
    Crear una nueva cotización.
    IMPORTANTE: El campo 'total' NO se envía, la BD lo calcula automáticamente.
    """
    
    # Crear la cotización sin el campo 'total'
    db_cotizacion = Cotizacion(
        paciente_id=cotizacion.paciente_id,
        usuario_id=cotizacion.usuario_id,
        estado_id=cotizacion.estado_id,
        subtotal_procedimientos=cotizacion.subtotal_procedimientos,
        subtotal_adicionales=cotizacion.subtotal_adicionales,
        subtotal_otros_adicionales=cotizacion.subtotal_otros_adicionales,
        # **NO incluir: total**
        validez_dias=cotizacion.validez_dias,
        observaciones=cotizacion.observaciones,
        fecha_vencimiento=cotizacion.fecha_vencimiento
    )
    
    db.add(db_cotizacion)
    db.commit()
    db.refresh(db_cotizacion)
    
    # Crear items de la cotización
    for item in cotizacion.items:
        db_item = CotizacionItem(
            cotizacion_id=db_cotizacion.id,
            tipo=item.tipo,
            item_id=item.item_id,
            nombre=item.nombre,
            descripcion=item.descripcion,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=item.subtotal
        )
        db.add(db_item)
    
    # Crear servicios incluidos
    for servicio in cotizacion.servicios_incluidos:
        db_servicio = CotizacionServicioIncluido(
            cotizacion_id=db_cotizacion.id,
            servicio_nombre=servicio.servicio_nombre,
            requiere=servicio.requiere
        )
        db.add(db_servicio)
    
    db.commit()
    db.refresh(db_cotizacion)
    
    return db_cotizacion