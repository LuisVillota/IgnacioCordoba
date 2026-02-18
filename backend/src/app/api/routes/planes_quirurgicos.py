from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
import pymysql
import os
from datetime import datetime
import cloudinary
import cloudinary.uploader
import json
import tempfile

from app.core.database import get_connection
from app.models.schemas.plan_quirurgico import (
    PlanQuirurgicoCreate, 
    PlanQuirurgicoUpdate, 
    PlanQuirurgicoInDB,
    DescargarArchivoRequest
)

router = APIRouter()

# Configurar Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Verificar si Cloudinary está configurado
USE_CLOUDINARY = all([
    os.getenv("CLOUDINARY_CLOUD_NAME"),
    os.getenv("CLOUDINARY_API_KEY"),
    os.getenv("CLOUDINARY_API_SECRET")
])

# Fallback a almacenamiento local
UPLOAD_DIR = "uploads"
PLANES_DIR = os.path.join(UPLOAD_DIR, "planes")

if not USE_CLOUDINARY:
    os.makedirs(PLANES_DIR, exist_ok=True)

# ==================== FUNCIONES AUXILIARES ====================

def json_to_str(field):
    """Convertir dict/list a JSON string, o retornar None si es None/vacío"""
    if field is None:
        return None
    if isinstance(field, (dict, list)):
        if not field:  # Si es dict/list vacío
            return None
        return json.dumps(field, ensure_ascii=False)
    return field

def str_to_json(field):
    """Convertir JSON string a dict/list, o retornar None si es None/vacío"""
    if field is None or field == '' or field == 'null':
        return None
    if isinstance(field, str):
        try:
            parsed = json.loads(field)
            return parsed if parsed else None
        except:
            return None
    return field

# ==================== ENDPOINTS ====================

@router.get("/", response_model=dict)
def get_planes_quirurgicos(limit: int = 100, offset: int = 0):
    """Obtener todos los planes quirúrgicos con paginación"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Obtener total de planes
                cursor.execute("SELECT COUNT(*) as total FROM plan_quirurgico")
                total = cursor.fetchone()['total']
                
                # Obtener planes con JOIN a paciente para nombre completo
                cursor.execute("""
                    SELECT 
                        pq.*,
                        CONCAT(p.nombre, ' ', p.apellido) as nombre_completo_paciente,
                        p.numero_documento as paciente_documento
                    FROM plan_quirurgico pq
                    LEFT JOIN paciente p ON pq.paciente_id = p.id
                    ORDER BY pq.fecha_creacion DESC 
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                planes = cursor.fetchall()
                
                # Procesar campos JSON
                for plan in planes:
                    plan['enfermedad_actual'] = str_to_json(plan.get('enfermedad_actual'))
                    plan['antecedentes'] = str_to_json(plan.get('antecedentes'))
                    plan['notas_corporales'] = str_to_json(plan.get('notas_corporales'))
                    plan['esquema_mejorado'] = str_to_json(plan.get('esquema_mejorado'))
                    
                    # Procesar imagen_procedimiento como array
                    if plan.get('imagen_procedimiento'):
                        try:
                            plan['imagen_procedimiento'] = json.loads(plan['imagen_procedimiento'])
                        except:
                            # Si no es JSON, convertir string separado por comas a array
                            if isinstance(plan['imagen_procedimiento'], str):
                                plan['imagen_procedimiento'] = [
                                    img.strip() 
                                    for img in plan['imagen_procedimiento'].split(',') 
                                    if img.strip()
                                ]
                
                return {
                    "success": True,
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "planes": planes
                }
    except Exception as e:
        print(f"❌ Error obteniendo planes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{plan_id}", response_model=dict)
def get_plan_quirurgico(plan_id: int):
    """Obtener un plan quirúrgico específico"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        pq.*,
                        CONCAT(p.nombre, ' ', p.apellido) as nombre_completo_paciente,
                        p.numero_documento as paciente_documento
                    FROM plan_quirurgico pq
                    LEFT JOIN paciente p ON pq.paciente_id = p.id
                    WHERE pq.id = %s
                """, (plan_id,))
                plan = cursor.fetchone()
                
                if not plan:
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                # Procesar campos JSON
                plan['enfermedad_actual'] = str_to_json(plan.get('enfermedad_actual'))
                plan['antecedentes'] = str_to_json(plan.get('antecedentes'))
                plan['notas_corporales'] = str_to_json(plan.get('notas_corporales'))
                plan['esquema_mejorado'] = str_to_json(plan.get('esquema_mejorado'))
                
                # Procesar imagen_procedimiento como array
                if plan.get('imagen_procedimiento'):
                    try:
                        plan['imagen_procedimiento'] = json.loads(plan['imagen_procedimiento'])
                    except:
                        if isinstance(plan['imagen_procedimiento'], str):
                            plan['imagen_procedimiento'] = [
                                img.strip() 
                                for img in plan['imagen_procedimiento'].split(',') 
                                if img.strip()
                            ]
                
                return {
                    "success": True,
                    "plan": plan
                }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error obteniendo plan {plan_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_plan_quirurgico(plan: PlanQuirurgicoCreate):
    """Crear un nuevo plan quirúrgico"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (plan.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Convertir campos JSON a string
                enfermedad_actual_str = json_to_str(plan.enfermedad_actual)
                antecedentes_str = json_to_str(plan.antecedentes)
                notas_corporales_str = json_to_str(plan.notas_corporales)
                esquema_mejorado_str = json_to_str(plan.esquema_mejorado)
                
                # Preparar valores - IMPORTANTE: orden debe coincidir con columnas
                valores = (
                    plan.paciente_id,              # 1
                    plan.usuario_id,               # 2
                    plan.procedimiento_desc,       # 3
                    plan.anestesiologo,            # 4
                    plan.materiales_requeridos,    # 5
                    plan.notas_preoperatorias,     # 6
                    plan.riesgos,                  # 7
                    plan.hora,                     # 8
                    plan.fecha_programada,         # 9
                    plan.nombre_completo,          # 10
                    plan.peso,                     # 11
                    plan.altura,                   # 12
                    plan.fecha_nacimiento,         # 13
                    plan.imc,                      # 14
                    plan.imagen_procedimiento,     # 15
                    plan.fecha_ultimo_procedimiento, # 16
                    plan.descripcion_procedimiento,  # 17
                    plan.detalles,                 # 18
                    plan.notas_doctor,             # 19
                    plan.tiempo_cirugia_minutos,   # 20
                    plan.entidad,                  # 21
                    plan.edad,                     # 22
                    plan.telefono,                 # 23
                    plan.celular,                  # 24
                    plan.direccion,                # 25
                    plan.email,                    # 26
                    plan.motivo_consulta,          # 27
                    plan.farmacologicos,           # 28
                    plan.traumaticos,              # 29
                    plan.quirurgicos,              # 30
                    plan.alergicos,                # 31
                    plan.toxicos,                  # 32
                    plan.habitos,                  # 33
                    plan.cabeza,                   # 34
                    plan.mamas,                    # 35
                    plan.tcs,                      # 36
                    plan.abdomen,                  # 37
                    plan.gluteos,                  # 38
                    plan.extremidades,             # 39
                    plan.pies_faneras,             # 40
                    plan.identificacion,           # 41
                    plan.fecha_consulta,           # 42
                    plan.hora_consulta,            # 43
                    plan.categoriaIMC,             # 44
                    plan.edad_calculada,           # 45
                    plan.ocupacion,                # 46
                    enfermedad_actual_str,         # 47
                    antecedentes_str,              # 48
                    notas_corporales_str,          # 49
                    plan.duracion_estimada,        # 50
                    plan.tipo_anestesia,           # 51
                    plan.requiere_hospitalizacion, # 52
                    plan.tiempo_hospitalizacion,   # 53
                    plan.reseccion_estimada,       # 54
                    plan.firma_cirujano,           # 55
                    plan.firma_paciente,           # 56
                    esquema_mejorado_str,          # 57
                    plan.plan_conducta             # 58
                )
                
                print(f"🔍 DEBUG: Total de valores a insertar: {len(valores)}")
                
                # Query INSERT con 58 columnas
                query = """
                    INSERT INTO plan_quirurgico (
                        paciente_id, usuario_id, procedimiento_desc, anestesiologo,
                        materiales_requeridos, notas_preoperatorias, riesgos, hora,
                        fecha_programada, nombre_completo, peso, altura, fecha_nacimiento,
                        imc, imagen_procedimiento, fecha_ultimo_procedimiento,
                        descripcion_procedimiento, detalles, notas_doctor,
                        tiempo_cirugia_minutos, entidad, edad, telefono, celular,
                        direccion, email, motivo_consulta, farmacologicos, traumaticos,
                        quirurgicos, alergicos, toxicos, habitos, cabeza, mamas,
                        tcs, abdomen, gluteos, extremidades, pies_faneras,
                        identificacion, fecha_consulta, hora_consulta, categoriaIMC,
                        edad_calculada, ocupacion, enfermedad_actual, antecedentes,
                        notas_corporales, duracion_estimada, tipo_anestesia,
                        requiere_hospitalizacion, tiempo_hospitalizacion,
                        reseccion_estimada, firma_cirujano, firma_paciente,
                        esquema_mejorado, plan_conducta
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """
                
                # Contar placeholders
                num_placeholders = query.count('%s')
                print(f"🔍 DEBUG: Placeholders en query: {num_placeholders}")
                print(f"🔍 DEBUG: Valores proporcionados: {len(valores)}")
                
                if num_placeholders != len(valores):
                    raise Exception(f"Desajuste: {num_placeholders} placeholders vs {len(valores)} valores")
                
                cursor.execute(query, valores)
                
                plan_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico creado exitosamente",
                    "plan_id": plan_id,
                    "id": plan_id
                }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creando plan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    """Crear un nuevo plan quirúrgico"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (plan.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Convertir campos JSON a string
                enfermedad_actual_str = json_to_str(plan.enfermedad_actual)
                antecedentes_str = json_to_str(plan.antecedentes)
                notas_corporales_str = json_to_str(plan.notas_corporales)
                esquema_mejorado_str = json_to_str(plan.esquema_mejorado)
                
                # Insertar plan quirúrgico - CORREGIDO: 55 campos = 55 valores
                cursor.execute("""
                    INSERT INTO plan_quirurgico (
                        paciente_id, usuario_id, procedimiento_desc, anestesiologo,
                        materiales_requeridos, notas_preoperatorias, riesgos, hora,
                        fecha_programada, nombre_completo, peso, altura, fecha_nacimiento,
                        imc, imagen_procedimiento, fecha_ultimo_procedimiento,
                        descripcion_procedimiento, detalles, notas_doctor,
                        tiempo_cirugia_minutos, entidad, edad, telefono, celular,
                        direccion, email, motivo_consulta, farmacologicos, traumaticos,
                        quirurgicos, alergicos, toxicos, habitos, cabeza, mamas,
                        tcs, abdomen, gluteos, extremidades, pies_faneras,
                        identificacion, fecha_consulta, hora_consulta, categoriaIMC,
                        edad_calculada, ocupacion, enfermedad_actual, antecedentes,
                        notas_corporales, duracion_estimada, tipo_anestesia,
                        requiere_hospitalizacion, tiempo_hospitalizacion,
                        reseccion_estimada, firma_cirujano, firma_paciente,
                        plan_conducta, esquema_mejorado
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    # 1-10
                    plan.paciente_id, plan.usuario_id, plan.procedimiento_desc,
                    plan.anestesiologo, plan.materiales_requeridos,
                    plan.notas_preoperatorias, plan.riesgos, plan.hora,
                    plan.fecha_programada, plan.nombre_completo,
                    # 11-20
                    plan.peso, plan.altura, plan.fecha_nacimiento, plan.imc,
                    plan.imagen_procedimiento, plan.fecha_ultimo_procedimiento,
                    plan.descripcion_procedimiento, plan.detalles, plan.notas_doctor,
                    plan.tiempo_cirugia_minutos,
                    # 21-30
                    plan.entidad, plan.edad, plan.telefono, plan.celular, 
                    plan.direccion, plan.email, plan.motivo_consulta, 
                    plan.farmacologicos, plan.traumaticos, plan.quirurgicos,
                    # 31-40
                    plan.alergicos, plan.toxicos, plan.habitos, plan.cabeza, 
                    plan.mamas, plan.tcs, plan.abdomen, plan.gluteos,
                    plan.extremidades, plan.pies_faneras,
                    # 41-50
                    plan.identificacion, plan.fecha_consulta, plan.hora_consulta, 
                    plan.categoriaIMC, plan.edad_calculada, plan.ocupacion, 
                    enfermedad_actual_str, antecedentes_str, notas_corporales_str,
                    plan.duracion_estimada,
                    # 51-55
                    plan.tipo_anestesia, plan.requiere_hospitalizacion,
                    plan.tiempo_hospitalizacion, plan.reseccion_estimada,
                    plan.firma_cirujano, plan.firma_paciente, plan.plan_conducta,
                    esquema_mejorado_str
                ))
                
                plan_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico creado exitosamente",
                    "plan_id": plan_id,
                    "id": plan_id
                }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creando plan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    """Crear un nuevo plan quirúrgico"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("SELECT id FROM paciente WHERE id = %s", (plan.paciente_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Paciente no encontrado")
                
                # Convertir campos JSON a string
                enfermedad_actual_str = json_to_str(plan.enfermedad_actual)
                antecedentes_str = json_to_str(plan.antecedentes)
                notas_corporales_str = json_to_str(plan.notas_corporales)
                esquema_mejorado_str = json_to_str(plan.esquema_mejorado)
                
                # Insertar plan quirúrgico - CORREGIDO
                cursor.execute("""
                    INSERT INTO plan_quirurgico (
                        paciente_id, usuario_id, procedimiento_desc, anestesiologo,
                        materiales_requeridos, notas_preoperatorias, riesgos, hora,
                        fecha_programada, nombre_completo, peso, altura, fecha_nacimiento,
                        imc, imagen_procedimiento, fecha_ultimo_procedimiento,
                        descripcion_procedimiento, detalles, notas_doctor,
                        tiempo_cirugia_minutos, entidad, edad, telefono, celular,
                        direccion, email, motivo_consulta, farmacologicos, traumaticos,
                        quirurgicos, alergicos, toxicos, habitos, cabeza, mamas,
                        tcs, abdomen, gluteos, extremidades, pies_faneras,
                        identificacion, fecha_consulta, hora_consulta, categoriaIMC,
                        edad_calculada, ocupacion, enfermedad_actual, antecedentes,
                        notas_corporales, duracion_estimada, tipo_anestesia,
                        requiere_hospitalizacion, tiempo_hospitalizacion,
                        reseccion_estimada, firma_cirujano, firma_paciente,
                        plan_conducta, esquema_mejorado
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    plan.paciente_id, plan.usuario_id, plan.procedimiento_desc,
                    plan.anestesiologo, plan.materiales_requeridos,
                    plan.notas_preoperatorias, plan.riesgos, plan.hora,
                    plan.fecha_programada, plan.nombre_completo, plan.peso,
                    plan.altura, plan.fecha_nacimiento, plan.imc,
                    plan.imagen_procedimiento, plan.fecha_ultimo_procedimiento,
                    plan.descripcion_procedimiento, plan.detalles, plan.notas_doctor,
                    plan.tiempo_cirugia_minutos, plan.entidad, plan.edad,
                    plan.telefono, plan.celular, plan.direccion, plan.email,
                    plan.motivo_consulta, plan.farmacologicos, plan.traumaticos,
                    plan.quirurgicos, plan.alergicos, plan.toxicos, plan.habitos,
                    plan.cabeza, plan.mamas, plan.tcs, plan.abdomen, plan.gluteos,
                    plan.extremidades, plan.pies_faneras, plan.identificacion,
                    plan.fecha_consulta, plan.hora_consulta, plan.categoriaIMC,
                    plan.edad_calculada, plan.ocupacion, enfermedad_actual_str,
                    antecedentes_str, notas_corporales_str, plan.duracion_estimada,
                    plan.tipo_anestesia, plan.requiere_hospitalizacion,
                    plan.tiempo_hospitalizacion, plan.reseccion_estimada,
                    plan.firma_cirujano, plan.firma_paciente, plan.plan_conducta,
                    esquema_mejorado_str
                ))
                
                plan_id = cursor.lastrowid
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico creado exitosamente",
                    "plan_id": plan_id,
                    "id": plan_id
                }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creando plan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{plan_id}", response_model=dict)
def update_plan_quirurgico(plan_id: int, plan: PlanQuirurgicoUpdate):
    """Actualizar un plan quirúrgico existente"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el plan existe
                cursor.execute("SELECT id FROM plan_quirurgico WHERE id = %s", (plan_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                # Convertir campos JSON a string
                enfermedad_actual_str = json_to_str(plan.enfermedad_actual)
                antecedentes_str = json_to_str(plan.antecedentes)
                notas_corporales_str = json_to_str(plan.notas_corporales)
                esquema_mejorado_str = json_to_str(plan.esquema_mejorado)
                
                # Actualizar plan
                cursor.execute("""
                    UPDATE plan_quirurgico SET
                        procedimiento_desc = %s, anestesiologo = %s,
                        materiales_requeridos = %s, notas_preoperatorias = %s,
                        riesgos = %s, hora = %s, fecha_programada = %s,
                        peso = %s, altura = %s, imc = %s,
                        farmacologicos = %s, traumaticos = %s, quirurgicos = %s,
                        alergicos = %s, toxicos = %s, habitos = %s,
                        cabeza = %s, mamas = %s, tcs = %s, abdomen = %s,
                        gluteos = %s, extremidades = %s, pies_faneras = %s,
                        duracion_estimada = %s, tipo_anestesia = %s,
                        requiere_hospitalizacion = %s, tiempo_hospitalizacion = %s,
                        reseccion_estimada = %s, firma_cirujano = %s,
                        firma_paciente = %s, enfermedad_actual = %s,
                        antecedentes = %s, notas_corporales = %s,
                        esquema_mejorado = %s, plan_conducta = %s,
                        descripcion_procedimiento = %s, detalles = %s,
                        notas_doctor = %s, tiempo_cirugia_minutos = %s
                    WHERE id = %s
                """, (
                    plan.procedimiento_desc, plan.anestesiologo,
                    plan.materiales_requeridos, plan.notas_preoperatorias,
                    plan.riesgos, plan.hora, plan.fecha_programada,
                    plan.peso, plan.altura, plan.imc,
                    plan.farmacologicos, plan.traumaticos, plan.quirurgicos,
                    plan.alergicos, plan.toxicos, plan.habitos,
                    plan.cabeza, plan.mamas, plan.tcs, plan.abdomen,
                    plan.gluteos, plan.extremidades, plan.pies_faneras,
                    plan.duracion_estimada, plan.tipo_anestesia,
                    plan.requiere_hospitalizacion, plan.tiempo_hospitalizacion,
                    plan.reseccion_estimada, plan.firma_cirujano,
                    plan.firma_paciente, enfermedad_actual_str,
                    antecedentes_str, notas_corporales_str,
                    esquema_mejorado_str, plan.plan_conducta,
                    plan.descripcion_procedimiento, plan.detalles,
                    plan.notas_doctor, plan.tiempo_cirugia_minutos,
                    plan_id  # Este va al final para el WHERE
                ))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico actualizado exitosamente",
                    "plan_id": plan_id
                }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error actualizando plan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    """Actualizar un plan quirúrgico existente"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el plan existe
                cursor.execute("SELECT id FROM plan_quirurgico WHERE id = %s", (plan_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                # Convertir campos JSON a string
                enfermedad_actual_str = json_to_str(plan.enfermedad_actual)
                antecedentes_str = json_to_str(plan.antecedentes)
                notas_corporales_str = json_to_str(plan.notas_corporales)
                esquema_mejorado_str = json_to_str(plan.esquema_mejorado)
                
                # Actualizar plan - CORREGIDO
                cursor.execute("""
                    UPDATE plan_quirurgico SET
                        procedimiento_desc = %s, anestesiologo = %s,
                        materiales_requeridos = %s, notas_preoperatorias = %s,
                        riesgos = %s, hora = %s, fecha_programada = %s,
                        peso = %s, altura = %s, imc = %s,
                        farmacologicos = %s, traumaticos = %s, quirurgicos = %s,
                        alergicos = %s, toxicos = %s, habitos = %s,
                        cabeza = %s, mamas = %s, tcs = %s, abdomen = %s,
                        gluteos = %s, extremidades = %s, pies_faneras = %s,
                        duracion_estimada = %s, tipo_anestesia = %s,
                        requiere_hospitalizacion = %s, tiempo_hospitalizacion = %s,
                        reseccion_estimada = %s, firma_cirujano = %s,
                        firma_paciente = %s, enfermedad_actual = %s,
                        antecedentes = %s, notas_corporales = %s,
                        esquema_mejorado = %s, plan_conducta = %s,
                        descripcion_procedimiento = %s, detalles = %s,
                        notas_doctor = %s, tiempo_cirugia_minutos = %s
                    WHERE id = %s
                """, (
                    plan.procedimiento_desc, plan.anestesiologo,
                    plan.materiales_requeridos, plan.notas_preoperatorias,
                    plan.riesgos, plan.hora, plan.fecha_programada,
                    plan.peso, plan.altura, plan.imc,
                    plan.farmacologicos, plan.traumaticos, plan.quirurgicos,
                    plan.alergicos, plan.toxicos, plan.habitos,
                    plan.cabeza, plan.mamas, plan.tcs, plan.abdomen,
                    plan.gluteos, plan.extremidades, plan.pies_faneras,
                    plan.duracion_estimada, plan.tipo_anestesia,
                    plan.requiere_hospitalizacion, plan.tiempo_hospitalizacion,
                    plan.reseccion_estimada, plan.firma_cirujano,
                    plan.firma_paciente, enfermedad_actual_str,
                    antecedentes_str, notas_corporales_str,
                    esquema_mejorado_str, plan.plan_conducta,
                    plan.descripcion_procedimiento, plan.detalles,
                    plan.notas_doctor, plan.tiempo_cirugia_minutos,
                    plan_id
                ))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico actualizado exitosamente",
                    "plan_id": plan_id
                }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error actualizando plan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{plan_id}", response_model=dict)
def delete_plan_quirurgico(plan_id: int):
    """Eliminar un plan quirúrgico y sus archivos asociados"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Obtener el plan con sus archivos
                cursor.execute("SELECT imagen_procedimiento FROM plan_quirurgico WHERE id = %s", (plan_id,))
                plan = cursor.fetchone()
                if not plan:
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                # Eliminar archivos
                if plan['imagen_procedimiento']:
                    try:
                        archivos = json.loads(plan['imagen_procedimiento'])
                    except:
                        archivos = [img.strip() for img in plan['imagen_procedimiento'].split(',') if img.strip()]
                    
                    for archivo_url in archivos:
                        archivo_url = archivo_url.strip()
                        
                        if USE_CLOUDINARY and 'cloudinary.com' in archivo_url:
                            # Eliminar de Cloudinary
                            try:
                                parts = archivo_url.split('/')
                                if 'planes' in parts:
                                    idx = parts.index('planes')
                                    if idx + 1 < len(parts):
                                        filename = parts[idx + 1].split('.')[0]
                                        public_id = f"planes/{filename}"
                                        cloudinary.uploader.destroy(public_id)
                                        print(f"🗑️ Eliminado de Cloudinary: {public_id}")
                            except Exception as e:
                                print(f"⚠️ Error eliminando de Cloudinary: {e}")
                        
                        elif archivo_url.startswith('/uploads/'):
                            # Eliminar archivo local
                            file_path = archivo_url[1:]  # Remover '/' inicial
                            if os.path.exists(file_path):
                                try:
                                    os.remove(file_path)
                                    print(f"🗑️ Eliminado archivo local: {file_path}")
                                except Exception as e:
                                    print(f"⚠️ Error eliminando archivo local: {e}")
                
                # Eliminar registro de la base de datos
                cursor.execute("DELETE FROM plan_quirurgico WHERE id = %s", (plan_id,))
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico eliminado exitosamente",
                    "plan_id": plan_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error eliminando plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{plan_id}/archivo", response_model=dict)
async def upload_plan_archivo(
    plan_id: int,
    file: UploadFile = File(...)
):
    """
    Subir un archivo (imagen o PDF) a un plan quirúrgico.
    Usa Cloudinary si está configurado, sino almacenamiento local.
    """
    try:
        # Verificar que el plan existe
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, imagen_procedimiento FROM plan_quirurgico WHERE id = %s", (plan_id,))
            plan = cursor.fetchone()
            if not plan:
                raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
        
        # Validar tipo de archivo
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf'}
        file_ext = os.path.splitext(file.filename or "unknown.jpg")[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail="Tipo de archivo no permitido. Use JPG, PNG, GIF, BMP, WebP o PDF."
            )
        
        # Validar tamaño (máximo 15MB para PDFs, 10MB para imágenes)
        max_size = 15 * 1024 * 1024 if file_ext == '.pdf' else 10 * 1024 * 1024
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(
                status_code=400, 
                detail=f"El archivo es demasiado grande. Máximo {max_size // (1024*1024)}MB."
            )
        
        # Generar nombre único
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f"plan_{plan_id}_{timestamp}"
        
        if USE_CLOUDINARY:
            # ========== CLOUDINARY ==========
            print(f"☁️ Subiendo a Cloudinary: {filename}")
            
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
                tmp_file.write(content)
                tmp_path = tmp_file.name
            
            try:
                # Subir a Cloudinary
                upload_result = cloudinary.uploader.upload(
                    tmp_path,
                    folder="planes",
                    public_id=filename,
                    resource_type="auto"  # Permite PDFs e imágenes
                )
                
                file_url = upload_result['secure_url']
                print(f"✅ Subido a Cloudinary: {file_url}")
                
            finally:
                # Limpiar archivo temporal
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        
        else:
            # ========== ALMACENAMIENTO LOCAL ==========
            print(f"💾 Guardando localmente: {filename}{file_ext}")
            file_path = os.path.join(PLANES_DIR, f"{filename}{file_ext}")
            
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            
            if not os.path.exists(file_path):
                raise HTTPException(
                    status_code=500, 
                    detail="Error al guardar el archivo en el servidor"
                )
            
            file_url = f"/uploads/planes/{filename}{file_ext}"
            print(f"✅ Guardado localmente: {file_path}")
        
        # Actualizar base de datos
        with conn.cursor() as cursor:
            # Obtener archivos actuales
            archivos_actuales = []
            if plan['imagen_procedimiento']:
                try:
                    archivos_actuales = json.loads(plan['imagen_procedimiento'])
                except:
                    archivos_actuales = [img.strip() for img in plan['imagen_procedimiento'].split(',') if img.strip()]
            
            # Agregar nuevo archivo
            archivos_actuales.append(file_url)
            archivos_json = json.dumps(archivos_actuales)
            
            cursor.execute(
                "UPDATE plan_quirurgico SET imagen_procedimiento = %s WHERE id = %s",
                (archivos_json, plan_id)
            )
            conn.commit()
        
        conn.close()
        print(f"🔗 URL final: {file_url}")
        
        return {
            "success": True,
            "message": "Archivo subido exitosamente",
            "url": file_url,
            "filename": f"{filename}{file_ext}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error subiendo archivo: {str(e)}")

@router.post("/{plan_id}/descargar-archivo")
async def descargar_archivo(plan_id: int, request: DescargarArchivoRequest):
    """
    Descargar un archivo específico de un plan quirúrgico.
    Funciona tanto para Cloudinary como almacenamiento local.
    """
    try:
        nombreArchivo = request.nombreArchivo
        
        # Verificar que el plan existe
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT imagen_procedimiento FROM plan_quirurgico WHERE id = %s", (plan_id,))
            plan = cursor.fetchone()
            if not plan:
                raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
        conn.close()
        
        # Obtener lista de archivos
        archivos = []
        if plan['imagen_procedimiento']:
            try:
                archivos = json.loads(plan['imagen_procedimiento'])
            except:
                archivos = [img.strip() for img in plan['imagen_procedimiento'].split(',') if img.strip()]
        
        # Buscar el archivo
        archivo_url = None
        for url in archivos:
            if nombreArchivo in url:
                archivo_url = url
                break
        
        if not archivo_url:
            raise HTTPException(status_code=404, detail="Archivo no encontrado en el plan")
        
        # Si es de Cloudinary, redirigir a la URL
        if USE_CLOUDINARY and 'cloudinary.com' in archivo_url:
            # Para Cloudinary, simplemente devolver la URL
            return {
                "success": True,
                "url": archivo_url,
                "message": "Descargue desde la URL proporcionada"
            }
        
        # Si es almacenamiento local, servir el archivo
        file_path = archivo_url[1:] if archivo_url.startswith('/') else archivo_url
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")
        
        # Determinar tipo de contenido
        extension = os.path.splitext(file_path)[1].lower()
        media_type = "application/octet-stream"
        if extension in ['.jpg', '.jpeg']:
            media_type = "image/jpeg"
        elif extension == '.png':
            media_type = "image/png"
        elif extension == '.pdf':
            media_type = "application/pdf"
        elif extension == '.gif':
            media_type = "image/gif"
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=nombreArchivo
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error descargando archivo: {e}")
        raise HTTPException(status_code=500, detail=f"Error descargando archivo: {str(e)}")