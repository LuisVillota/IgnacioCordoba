from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import BaseModel

class HistorialClinico(BaseModel):
    __tablename__ = "historial_clinico"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    paciente_id = Column(Integer, ForeignKey("paciente.id"), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now(), nullable=False)
    motivo_consulta = Column(Text)
    antecedentes_medicos = Column(Text)
    antecedentes_quirurgicos = Column(Text)
    antecedentes_alergicos = Column(Text)
    antecedentes_farmacologicos = Column(Text)
    exploracion_fisica = Column(Text)
    diagnostico = Column(Text)
    tratamiento = Column(Text)
    recomendaciones = Column(Text)
    fotos = Column(Text)  # URLs separadas por comas
    
    # Relación con paciente
    paciente = relationship("Paciente", back_populates="historiales")
    
    def __repr__(self):
        return f"<HistorialClinico {self.id} - Paciente {self.paciente_id}>"