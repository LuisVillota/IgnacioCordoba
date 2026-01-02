from sqlalchemy import Column, Integer, String, Text, DateTime, Time, Boolean, DECIMAL, JSON
from sqlalchemy.sql import func
from config.database import Base

class PlanQuirurgicoDB(Base):
    __tablename__ = "plan_quirurgico"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    paciente_id = Column(Integer, nullable=False, index=True)
    usuario_id = Column(Integer, nullable=False, index=True)
    estado_id = Column(Integer, nullable=False, index=True)
    
    # Datos del procedimiento
    procedimiento_desc = Column(Text, nullable=True)
    anestesiologo = Column(String(50), nullable=True)
    materiales_requeridos = Column(Text, nullable=True)
    notas_preoperatorias = Column(Text, nullable=True)
    riesgos = Column(Text, nullable=True)
    
    # Fechas y tiempos
    fecha_creacion = Column(DateTime, server_default=func.now())
    hora = Column(Time, nullable=True)
    fecha_programada = Column(DateTime, nullable=True)
    
    # Datos del paciente
    nombre_completo = Column(Text, nullable=True)
    peso = Column(DECIMAL(5, 2), nullable=True)
    altura = Column(DECIMAL(5, 2), nullable=True)
    fecha_nacimiento = Column(DateTime, nullable=True)
    imc = Column(DECIMAL(5, 2), nullable=True)
    
    # Información de procedimientos
    imagen_procedimiento = Column(String(255), nullable=True)
    fecha_ultimo_procedimiento = Column(DateTime, nullable=True)
    descripcion_procedimiento = Column(Text, nullable=True)
    detalles = Column(Text, nullable=True)
    notas_del_doctor = Column(Text, nullable=True)
    tiempo_cirugia_minutos = Column(Integer, nullable=True)
    
    # Información de contacto
    referido_por = Column(Integer, nullable=True)
    entidad = Column(Text, nullable=True)
    edad_nacimiento = Column(Integer, nullable=True)
    telefono_fijo = Column(String(20), nullable=True)
    celular = Column(String(20), nullable=True)
    direccion = Column(Text, nullable=True)
    email = Column(String(100), nullable=True)
    
    # Historia clínica
    motivo_consulta = Column(Text, nullable=True)
    farmacologicos = Column(Text, nullable=True)
    traumaticos = Column(Text, nullable=True)
    quirurgicos = Column(Text, nullable=True)
    alergicos = Column(Text, nullable=True)
    toxicos = Column(Text, nullable=True)
    habitos = Column(Text, nullable=True)
    
    # Examen físico
    cabeza = Column(Text, nullable=True)
    mamas = Column(Text, nullable=True)
    tcs = Column(Text, nullable=True)
    abdomen = Column(Text, nullable=True)
    gluteos = Column(Text, nullable=True)
    extremidades = Column(Text, nullable=True)
    pies_faneras = Column(Text, nullable=True)
    
    # Identificación y consulta
    identificacion = Column(String(50), nullable=True)
    fecha_consulta = Column(DateTime, nullable=True)
    hora_consulta = Column(Time, nullable=True)
    categoriaIMC = Column(String(50), nullable=True)
    edad_calculada = Column(Integer, nullable=True)
    ocupacion = Column(String(100), nullable=True)
    
    # JSON fields
    enfermedad_actual = Column(JSON, nullable=True)
    antecedentes = Column(JSON, nullable=True)
    notas_corporales = Column(JSON, nullable=True)
    
    # Conducta quirúrgica
    duracion_estimada = Column(Integer, nullable=True)
    tipo_anestesia = Column(String(50), nullable=True)
    requiere_hospitalizacion = Column(Boolean, default=False)
    tiempo_hospitalizacion = Column(String(50), nullable=True)
    reseccion_estimada = Column(String(100), nullable=True)
    firma_cirujano = Column(Text, nullable=True)
    firma_paciente = Column(Text, nullable=True)
    
    # Esquemas
    esquema_corporal = Column(Text, nullable=True)
    esquema_facial = Column(Text, nullable=True)
    esquema_mejorado = Column(JSON, nullable=True)  # Nuevo campo para el esquema interactivo