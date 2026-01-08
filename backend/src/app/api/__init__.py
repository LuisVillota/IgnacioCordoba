from fastapi import APIRouter
from .routes import (
    sistema,
    usuario,
    pacientes,
    citas,
    estados,
    procedimientos,
    adicionales,
    otro_adicionales,
    historias_clinicas,
    sala_espera,
    agenda_procedimiento,
    cotizaciones,
    planes_quirurgicos,
    debug,
    upload  
)

api_router = APIRouter()
api_router.include_router(sistema.router, tags=["sistema"])
api_router.include_router(usuario.router, prefix="/usuarios", tags=["usuarios"])
api_router.include_router(pacientes.router, prefix="/pacientes", tags=["pacientes"])
api_router.include_router(citas.router, prefix="/citas", tags=["citas"])
api_router.include_router(estados.router, prefix="/estados", tags=["estados"])
api_router.include_router(procedimientos.router, prefix="/procedimientos", tags=["procedimientos"])
api_router.include_router(adicionales.router, prefix="/adicionales", tags=["adicionales"])
api_router.include_router(otro_adicionales.router, prefix="/otros-adicionales", tags=["otros-adicionales"])
api_router.include_router(historias_clinicas.router, prefix="/historias-clinicas", tags=["historias-clinicas"])
api_router.include_router(sala_espera.router, prefix="/sala-espera", tags=["sala-espera"])
api_router.include_router(agenda_procedimiento.router, prefix="/agenda-procedimientos", tags=["agenda-procedimientos"])
api_router.include_router(cotizaciones.router, prefix="/cotizaciones", tags=["cotizaciones"])
api_router.include_router(planes_quirurgicos.router, prefix="/planes-quirurgicos", tags=["planes-quirurgicos"])
api_router.include_router(debug.router, prefix="/debug", tags=["debug"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])  # ✅ NUEVO