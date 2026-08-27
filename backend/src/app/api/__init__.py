from fastapi import APIRouter, Depends
from .deps import get_current_user, require_roles
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

ROL_ADMIN = 1
auth = [Depends(get_current_user)]

api_router = APIRouter()
# sistema y usuario aplican su propia protección por ruta (mezclan endpoints públicos y privados)
api_router.include_router(sistema.router, tags=["sistema"])
api_router.include_router(usuario.router, prefix="/usuarios", tags=["usuarios"])
api_router.include_router(pacientes.router, prefix="/pacientes", tags=["pacientes"], dependencies=auth)
api_router.include_router(citas.router, prefix="/citas", tags=["citas"], dependencies=auth)
api_router.include_router(estados.router, prefix="/estados", tags=["estados"], dependencies=auth)
api_router.include_router(procedimientos.router, prefix="/procedimientos", tags=["procedimientos"], dependencies=auth)
api_router.include_router(adicionales.router, prefix="/adicionales", tags=["adicionales"], dependencies=auth)
api_router.include_router(otro_adicionales.router, prefix="/otros-adicionales", tags=["otros-adicionales"], dependencies=auth)
api_router.include_router(historias_clinicas.router, prefix="/historias-clinicas", tags=["historias-clinicas"], dependencies=auth)
api_router.include_router(sala_espera.router, prefix="/sala-espera", tags=["sala-espera"], dependencies=auth)
api_router.include_router(agenda_procedimiento.router, prefix="/agenda-procedimientos", tags=["agenda-procedimientos"], dependencies=auth)
api_router.include_router(cotizaciones.router, prefix="/cotizaciones", tags=["cotizaciones"], dependencies=auth)
api_router.include_router(planes_quirurgicos.router, prefix="/planes-quirurgicos", tags=["planes-quirurgicos"], dependencies=auth)
api_router.include_router(debug.router, prefix="/debug", tags=["debug"], dependencies=[Depends(require_roles(ROL_ADMIN))])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"], dependencies=auth)
__all__ = ["api_router"]