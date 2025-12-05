# backend/src/app/models/__init__.py
from .base import BaseModel
from .usuario import Usuario, Rol, Permiso
from .paciente import Paciente

# Comenta los otros imports por ahora
# from .cita import Cita, EstadoCita
# from .historial import HistorialClinico, Anexo, Antecedente
# from .quirurgico import PlanQuirurgico, EstadoQuirurgico, Procedimiento, Tarifa, NotaOperacion, ProgramacionQuirurgica
# from .financiero import Cotizacion, EstadoCotizacion, CotizacionItem, Factura, EstadoFactura, FacturaItem
# from .documentos import Plantilla, TipoDocumento
# from .auditoria import Auditoria

__all__ = [
    "BaseModel",
    "Usuario", "Rol", "Permiso",
    "Paciente",
    # "Cita", "EstadoCita",
    # "HistorialClinico", "Anexo", "Antecedente",
    # "PlanQuirurgico", "EstadoQuirurgico", "Procedimiento", "Tarifa", "NotaOperacion", "ProgramacionQuirurgica",
    # "Cotizacion", "EstadoCotizacion", "CotizacionItem", "Factura", "EstadoFactura", "FacturaItem",
    # "Plantilla", "TipoDocumento",
    # "Auditoria"
]