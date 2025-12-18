from sqlalchemy import Column, Integer, String, Date, Time, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum


class EstadoProcedimiento(str, enum.Enum):
    PROGRAMADO = "Programado"
    APLAZADO = "Aplazado"
    CONFIRMADO = "Confirmado"
    EN_QUIROFANO = "En Quirofano"
    OPERADO = "Operado"
    CANCELADO = "Cancelado"


class AgendaProcedimientos(Base):
    __tablename__ = "agenda_procedimientos"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    numero_documento = Column(String(15), ForeignKey('paciente.numero_documento'), nullable=False)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    procedimiento_id = Column(Integer, ForeignKey('procedimiento.id'), nullable=False)
    duracion = Column(Integer)  # Duración en minutos
    anestesiologo = Column(String(100))
    estado = Column(
        Enum(EstadoProcedimiento), 
        default=EstadoProcedimiento.PROGRAMADO,
        nullable=False
    )
    observaciones = Column(Text)
    
    # Relaciones (si necesitas acceder a los datos relacionados)
    paciente = relationship("Paciente", back_populates="procedimientos_agendados")
    procedimiento = relationship("Procedimiento", back_populates="agendas")