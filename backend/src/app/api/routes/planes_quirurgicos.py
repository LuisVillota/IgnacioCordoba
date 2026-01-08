from fastapi import APIRouter, HTTPException, Query, Response
from datetime import datetime
import pymysql
import os
import json
import traceback
from typing import Optional

from app.core.database import get_connection
from app.models.schemas.plan_quirurgico import (
    PlanQuirurgicoCreate, PlanQuirurgicoUpdate, 
    PlanQuirurgicoInDB, DescargarArchivoRequest
)

router = APIRouter()

# Configurar el directorio de uploads
if os.environ.get('RENDER'):
    # En Render, usa un directorio temporal
    UPLOAD_DIR = "/tmp/uploads"
else:
    # Localmente, usa uploads en el directorio actual
    UPLOAD_DIR = "uploads"

# Crear el directorio si no existe
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=dict)
def get_planes_quirurgicos(
    limit: int = Query(50, description="Límite de resultados"),
    offset: int = Query(0, description="Offset para paginación")
):
    """
    Obtiene todos los planes quirúrgicos con paginación
    """
    try:
        conn = get_connection()

        with conn:
            with conn.cursor() as cursor:
                # Obtener total de planes
                cursor.execute("SELECT COUNT(*) AS total FROM plan_quirurgico")
                total = cursor.fetchone()["total"]
                
                # Obtener planes con información de paciente y usuario
                cursor.execute("""
                    SELECT 
                        pq.*,
                        p.nombre AS paciente_nombre,
                        p.apellido AS paciente_apellido,
                        p.numero_documento AS paciente_documento,
                        CONCAT(p.nombre, ' ', p.apellido) AS nombre_completo_paciente,
                        u.nombre AS usuario_nombre
                    FROM plan_quirurgico pq
                    JOIN paciente p ON pq.paciente_id = p.id
                    JOIN usuario u ON pq.usuario_id = u.id
                    ORDER BY pq.fecha_creacion DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))

                planes = cursor.fetchall()

                return {
                    "success": True,
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "planes": planes
                }

    except Exception as e:
        print(f"❌ ERROR obteniendo planes quirúrgicos: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{plan_id}", response_model=dict)
def get_plan_quirurgico(plan_id: str):
    """
    Obtiene un plan quirúrgico específico por ID
    """
    try:
        # Limpiar ID si viene con prefijo 'plan_'
        plan_id_num = plan_id.replace('plan_', '')
        print(f"🔍 Buscando plan quirúrgico ID: {plan_id_num}")
        
        conn = get_connection()
        
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        pq.*,
                        p.nombre AS paciente_nombre,
                        p.apellido AS paciente_apellido,
                        p.numero_documento AS paciente_documento,
                        CONCAT(p.nombre, ' ', p.apellido) AS nombre_completo_paciente,
                        u.nombre AS usuario_nombre
                    FROM plan_quirurgico pq
                    JOIN paciente p ON pq.paciente_id = p.id
                    JOIN usuario u ON pq.usuario_id = u.id
                    WHERE pq.id = %s
                """, (plan_id_num,))
                
                plan = cursor.fetchone()
                
                if not plan:
                    print(f"❌ Plan {plan_id_num} no encontrado")
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                print(f"✅ Plan {plan_id_num} encontrado: {plan['nombre_completo_paciente']}")
                
                return {
                    "success": True,
                    "plan": plan
                }
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR obteniendo plan {plan_id}: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
def create_plan_quirurgico(plan: PlanQuirurgicoCreate):
    """
    Crea un nuevo plan quirúrgico
    """
    try:
        print(f"🆕 Creando nuevo plan quirúrgico para paciente ID: {plan.paciente_id}")
        
        def norm_datetime(v):
            if not v:
                return None
            if isinstance(v, str):
                return v.replace("T", " ").replace("Z", "")
            return v

        def norm_time(v):
            if not v:
                return None
            if isinstance(v, str):
                return v[:8]
            return v

        conn = get_connection()

        with conn.cursor() as cursor:
            # Verificar que el paciente existe
            cursor.execute("SELECT * FROM paciente WHERE id=%s", (plan.paciente_id,))
            paciente = cursor.fetchone()
            if not paciente:
                raise HTTPException(404, "Paciente no encontrado")

            # Verificar que el usuario existe
            cursor.execute("SELECT * FROM usuario WHERE id=%s", (plan.usuario_id,))
            usuario = cursor.fetchone()
            if not usuario:
                raise HTTPException(404, "Usuario no encontrado")

            # Calcular edad si no está proporcionada
            edad = plan.edad
            if not edad and paciente.get("fecha_nacimiento"):
                fn = paciente["fecha_nacimiento"]
                edad = (datetime.now().date() - fn.date()).days // 365

            # Calcular IMC si no está proporcionado
            imc = plan.imc
            categoria_imc = plan.categoriaIMC

            if plan.peso and plan.altura and plan.altura > 0:
                imc = imc or float(plan.peso) / (float(plan.altura) ** 2)
                categoria_imc = categoria_imc or (
                    "Bajo peso" if imc < 18.5 else
                    "Saludable" if imc < 25 else
                    "Sobrepeso" if imc < 30 else
                    "Obesidad"
                )

            # Preparar campos JSON
            enfermedad_actual_json = json.dumps(plan.enfermedad_actual) if plan.enfermedad_actual else None
            antecedentes_json = json.dumps(plan.antecedentes) if plan.antecedentes else None
            notas_corporales_json = json.dumps(plan.notas_corporales) if plan.notas_corporales else None
            esquema_mejorado_json = json.dumps(plan.esquema_mejorado) if plan.esquema_mejorado else None
            imagen_procedimiento_json = plan.imagen_procedimiento  # Ya debería ser JSON string

            sql = """
            INSERT INTO plan_quirurgico (
                paciente_id, usuario_id,
                procedimiento_desc, anestesiologo, materiales_requeridos,
                notas_preoperatorias, riesgos, hora, fecha_programada,
                nombre_completo, peso, altura, fecha_nacimiento, imc,
                imagen_procedimiento, fecha_ultimo_procedimiento,
                descripcion_procedimiento, detalles, notas_doctor,
                tiempo_cirugia_minutos, entidad, edad,
                telefono, celular, direccion, email,
                motivo_consulta, farmacologicos, traumaticos,
                quirurgicos, alergicos, toxicos, habitos,
                cabeza, mamas, tcs, abdomen, gluteos, extremidades, pies_faneras,
                identificacion, fecha_consulta, hora_consulta,
                categoriaIMC, edad_calculada, ocupacion,
                enfermedad_actual, antecedentes, notas_corporales,
                duracion_estimada, tipo_anestesia, requiere_hospitalizacion,
                tiempo_hospitalizacion, reseccion_estimada,
                firma_cirujano, firma_paciente,
                esquema_mejorado, plan_conducta, fecha_creacion
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,NOW()
            )
            """

            values = tuple([
                plan.paciente_id, plan.usuario_id,
                plan.procedimiento_desc, plan.anestesiologo, plan.materiales_requeridos,
                plan.notas_preoperatorias, plan.riesgos, norm_time(plan.hora),
                norm_datetime(plan.fecha_programada),
                plan.nombre_completo or f"{paciente['nombre']} {paciente['apellido']}",
                plan.peso, plan.altura, plan.fecha_nacimiento, imc,
                imagen_procedimiento_json, plan.fecha_ultimo_procedimiento,
                plan.descripcion_procedimiento, plan.detalles, plan.notas_doctor,
                plan.tiempo_cirugia_minutos, plan.entidad, edad,
                plan.telefono, plan.celular, plan.direccion, plan.email,
                plan.motivo_consulta, plan.farmacologicos, plan.traumaticos,
                plan.quirurgicos, plan.alergicos, plan.toxicos, plan.habitos,
                plan.cabeza, plan.mamas, plan.tcs, plan.abdomen,
                plan.gluteos, plan.extremidades, plan.pies_faneras,
                plan.identificacion, plan.fecha_consulta, norm_time(plan.hora_consulta),
                categoria_imc, edad, plan.ocupacion,
                enfermedad_actual_json, antecedentes_json, notas_corporales_json,
                plan.duracion_estimada, plan.tipo_anestesia,
                int(bool(plan.requiere_hospitalizacion)),
                plan.tiempo_hospitalizacion, plan.reseccion_estimada,
                plan.firma_cirujano, plan.firma_paciente,
                esquema_mejorado_json, plan.plan_conducta
            ])

            print(f"📝 Ejecutando INSERT para nuevo plan...")
            cursor.execute(sql, values)
            conn.commit()

            plan_id = cursor.lastrowid
            print(f"✅ Plan creado exitosamente con ID: {plan_id}")

            return {
                "success": True, 
                "plan_id": plan_id,
                "message": "Plan quirúrgico creado exitosamente"
            }

    except HTTPException as he:
        print(f"❌ HTTPException: {he.detail}")
        raise he
    except Exception as e:
        print(f"❌ ERROR creando plan quirúrgico: {str(e)}")
        traceback.print_exc()
        raise HTTPException(500, str(e))

@router.put("/{plan_id}", response_model=dict)
def update_plan_quirurgico(plan_id: str, plan_update: PlanQuirurgicoUpdate):
    """
    Actualiza un plan quirúrgico existente
    """
    try:
        # Extraer ID numérico
        plan_id_num = plan_id.replace('plan_', '')
        print(f"🔄 Actualizando plan quirúrgico ID: {plan_id_num}")
        
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # 1. Verificar que el plan existe y obtener datos actuales
                cursor.execute("""
                    SELECT * FROM plan_quirurgico WHERE id = %s
                """, (plan_id_num,))
                
                plan_existente = cursor.fetchone()
                if not plan_existente:
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                print(f"✅ Plan encontrado: {plan_existente['nombre_completo']}")
                
                # 2. Construir query dinámica
                update_fields = []
                values = []
                
                # 3. Calcular IMC si se actualizan peso o altura
                peso = plan_update.peso if plan_update.peso is not None else plan_existente['peso']
                altura = plan_update.altura if plan_update.altura is not None else plan_existente['altura']
                
                # Solo calcular IMC si tenemos ambos valores válidos
                if peso is not None and altura is not None and altura > 0:
                    try:
                        peso_float = float(peso)
                        altura_float = float(altura)
                        imc_calculado = peso_float / (altura_float ** 2)
                        
                        update_fields.append("imc = %s")
                        values.append(float(imc_calculado))
                        
                        # Calcular categoría IMC
                        if imc_calculado < 18.5:
                            categoria = "Bajo peso"
                        elif imc_calculado < 25:
                            categoria = "Saludable"
                        elif imc_calculado < 30:
                            categoria = "Sobrepeso"
                        else:
                            categoria = "Obesidad"
                        
                        update_fields.append("categoriaIMC = %s")
                        values.append(categoria)
                        
                    except (ValueError, TypeError) as e:
                        print(f"⚠️ Error calculando IMC: {e}")
                        # Mantener valores existentes si hay error
                        if plan_existente['imc']:
                            update_fields.append("imc = %s")
                            values.append(float(plan_existente['imc']))
                        if plan_existente['categoriaIMC']:
                            update_fields.append("categoriaIMC = %s")
                            values.append(plan_existente['categoriaIMC'])
                
                # 4. Mapear campos normales con manejo de tipos
                field_mapping = {
                    'procedimiento_desc': plan_update.procedimiento_desc,
                    'anestesiologo': plan_update.anestesiologo,
                    'materiales_requeridos': plan_update.materiales_requeridos,
                    'notas_preoperatorias': plan_update.notas_preoperatorias,
                    'riesgos': plan_update.riesgos,
                    'hora': plan_update.hora,
                    'fecha_programada': plan_update.fecha_programada,
                    'peso': plan_update.peso,
                    'altura': plan_update.altura,
                    'farmacologicos': plan_update.farmacologicos,
                    'traumaticos': plan_update.traumaticos,
                    'quirurgicos': plan_update.quirurgicos,
                    'alergicos': plan_update.alergicos,
                    'toxicos': plan_update.toxicos,
                    'habitos': plan_update.habitos,
                    'cabeza': plan_update.cabeza,
                    'mamas': plan_update.mamas,
                    'tcs': plan_update.tcs,
                    'abdomen': plan_update.abdomen,
                    'gluteos': plan_update.gluteos,
                    'extremidades': plan_update.extremidades,
                    'pies_faneras': plan_update.pies_faneras,
                    'duracion_estimada': plan_update.duracion_estimada,
                    'tipo_anestesia': plan_update.tipo_anestesia,
                    'tiempo_hospitalizacion': plan_update.tiempo_hospitalizacion,
                    'reseccion_estimada': plan_update.reseccion_estimada,
                    'firma_cirujano': plan_update.firma_cirujano,
                    'firma_paciente': plan_update.firma_paciente,
                    'imagen_procedimiento': plan_update.imagen_procedimiento,
                    'descripcion_procedimiento': plan_update.descripcion_procedimiento,
                    'detalles': plan_update.detalles,
                    'notas_doctor': plan_update.notas_doctor,
                    'tiempo_cirugia_minutos': plan_update.tiempo_cirugia_minutos,
                    'plan_conducta': plan_update.plan_conducta
                }
                
                for field, value in field_mapping.items():
                    if value is not None:
                        update_fields.append(f"{field} = %s")
                        values.append(value)
                
                # 5. Manejar campo booleano
                if plan_update.requiere_hospitalizacion is not None:
                    update_fields.append("requiere_hospitalizacion = %s")
                    requiere_int = 1 if plan_update.requiere_hospitalizacion else 0
                    values.append(requiere_int)
                
                # 6. Manejar campos JSON - siempre serializar si se proporcionan
                if plan_update.enfermedad_actual is not None:
                    update_fields.append("enfermedad_actual = %s")
                    values.append(json.dumps(plan_update.enfermedad_actual))
                
                if plan_update.antecedentes is not None:
                    update_fields.append("antecedentes = %s")
                    values.append(json.dumps(plan_update.antecedentes))
                
                if plan_update.notas_corporales is not None:
                    update_fields.append("notas_corporales = %s")
                    values.append(json.dumps(plan_update.notas_corporales))
                
                if plan_update.esquema_mejorado is not None:
                    update_fields.append("esquema_mejorado = %s")
                    values.append(json.dumps(plan_update.esquema_mejorado))
                
                # 7. Actualizar fecha de modificación
                update_fields.append("fecha_modificacion = NOW()")
                
                # 8. Verificar si hay algo para actualizar
                if len(update_fields) <= 1:  # Solo fecha_modificacion
                    return {
                        "success": True,
                        "message": "Sin cambios para actualizar",
                        "plan_id": plan_id
                    }
                
                # 9. Ejecutar actualización
                values.append(plan_id_num)
                query = f"UPDATE plan_quirurgico SET {', '.join(update_fields)} WHERE id = %s"
                
                print(f"📝 Query de actualización: {query}")
                print(f"📝 Valores: {values}")
                
                cursor.execute(query, values)
                conn.commit()
                
                # 10. Obtener el plan actualizado para retornar
                cursor.execute("""
                    SELECT * FROM plan_quirurgico WHERE id = %s
                """, (plan_id_num,))
                
                plan_actualizado = cursor.fetchone()
                
                print(f"✅ Plan {plan_id_num} actualizado exitosamente")
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico actualizado exitosamente",
                    "plan_id": plan_id,
                    "data": plan_actualizado
                }
                
    except HTTPException as he:
        print(f"❌ HTTPException: {he.detail}")
        raise he
    except pymysql.err.ProgrammingError as pe:
        print(f"❌ Error SQL: {pe}")
        raise HTTPException(status_code=500, detail={
            "error": "Error de programación SQL",
            "message": str(pe)
        })
    except pymysql.err.OperationalError as oe:
        print(f"❌ Error operacional: {oe}")
        raise HTTPException(status_code=500, detail={
            "error": "Error operacional de base de datos",
            "message": str(oe)
        })
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"❌ Error general: {error_details}")
        raise HTTPException(status_code=500, detail={
            "error": "Error actualizando plan quirúrgico",
            "message": str(e),
            "details": error_details
        })

@router.delete("/{plan_id}", response_model=dict)
def delete_plan_quirurgico(plan_id: str):
    """
    Elimina un plan quirúrgico
    """
    try:
        # Extraer ID numérico
        plan_id_num = plan_id.replace('plan_', '')
        print(f"🗑️ Eliminando plan quirúrgico ID: {plan_id_num}")
        
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el plan existe
                cursor.execute("SELECT id, nombre_completo FROM plan_quirurgico WHERE id = %s", (plan_id_num,))
                plan = cursor.fetchone()
                if not plan:
                    raise HTTPException(status_code=404, detail="Plan quirúrgico no encontrado")
                
                print(f"✅ Plan encontrado para eliminar: {plan['nombre_completo']}")
                
                # Eliminar el plan
                cursor.execute("DELETE FROM plan_quirurgico WHERE id = %s", (plan_id_num,))
                conn.commit()
                
                print(f"✅ Plan {plan_id_num} eliminado exitosamente")
                
                return {
                    "success": True,
                    "message": "Plan quirúrgico eliminado exitosamente",
                    "plan_id": plan_id,
                    "plan_nombre": plan['nombre_completo']
                }
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR eliminando plan: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error eliminando plan quirúrgico",
            "message": str(e)
        })

# 🔴 FUNCIÓN CRÍTICA: DESCARGA DE ARCHIVOS
@router.post("/{plan_id}/descargar-archivo")
async def descargar_archivo_plan(plan_id: str, data: DescargarArchivoRequest):
    """
    Descarga un archivo adjunto de un plan quirúrgico
    """
    try:
        nombre_archivo = data.nombreArchivo
        
        print(f"📥 📥 📥 SOLICITUD DE DESCARGA RECIBIDA 📥 📥 📥")
        print(f"   Plan ID recibido: {plan_id}")
        print(f"   Tipo de plan_id: {type(plan_id)}")
        print(f"   Nombre archivo: {nombre_archivo}")
        print(f"   Directorio UPLOAD: {UPLOAD_DIR}")
        print(f"   Existe directorio: {os.path.exists(UPLOAD_DIR)}")
        
        if not nombre_archivo:
            raise HTTPException(status_code=400, detail="Nombre de archivo requerido")
        
        # Convertir plan_id a entero (puede venir como string o ya como int)
        try:
            if isinstance(plan_id, str) and plan_id.startswith('plan_'):
                plan_id_clean = plan_id.replace('plan_', '')
            else:
                plan_id_clean = str(plan_id)
            
            plan_id_int = int(plan_id_clean)
        except ValueError as e:
            print(f"❌ ERROR: plan_id no es un número válido: {plan_id}")
            raise HTTPException(status_code=400, detail=f"ID de plan no válido: {plan_id}")
        
        # Listar archivos en el directorio si existe
        if os.path.exists(UPLOAD_DIR):
            archivos = os.listdir(UPLOAD_DIR)
            print(f"📁 Archivos en {UPLOAD_DIR} ({len(archivos)}):")
            for archivo in archivos[:10]:  # Mostrar solo los primeros 10
                print(f"   - {archivo}")
            if len(archivos) > 10:
                print(f"   ... y {len(archivos) - 10} más")
        else:
            print(f"⚠️ El directorio {UPLOAD_DIR} NO existe")
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            print(f"✅ Directorio creado: {UPLOAD_DIR}")
                
        conn = get_connection()
        
        with conn:
            with conn.cursor() as cursor:
                # Buscar el plan en la base de datos
                cursor.execute("""
                    SELECT id, imagen_procedimiento, nombre_completo 
                    FROM plan_quirurgico 
                    WHERE id = %s
                """, (plan_id_int,))
                
                plan = cursor.fetchone()
                
                if not plan:
                    print(f"❌ Plan ID {plan_id_int} no encontrado en la base de datos")
                    raise HTTPException(status_code=404, detail="Plan no encontrado")
                
                print(f"✅ Plan encontrado en BD: {plan['nombre_completo']}")
                print(f"📊 Campo imagen_procedimiento: {plan['imagen_procedimiento']}")
                print(f"📊 Tipo de imagen_procedimiento: {type(plan['imagen_procedimiento'])}")
                
                # Parsear el JSON de imagen_procedimiento
                archivos_adjuntos = []
                if plan['imagen_procedimiento']:
                    try:
                        if isinstance(plan['imagen_procedimiento'], str):
                            archivos_adjuntos = json.loads(plan['imagen_procedimiento'])
                            if not isinstance(archivos_adjuntos, list):
                                archivos_adjuntos = [archivos_adjuntos]
                        elif isinstance(plan['imagen_procedimiento'], list):
                            archivos_adjuntos = plan['imagen_procedimiento']
                        else:
                            archivos_adjuntos = [str(plan['imagen_procedimiento'])]
                    except json.JSONDecodeError as e:
                        print(f"⚠️ Error parseando JSON: {e}")
                        # Intentar interpretar como string simple
                        archivos_adjuntos = [str(plan['imagen_procedimiento'])]
                    except Exception as e:
                        print(f"⚠️ Error parseando imagen_procedimiento: {e}")
                        archivos_adjuntos = [str(plan['imagen_procedimiento'])]
                
                print(f"📋 Archivos adjuntos parseados ({len(archivos_adjuntos)}): {archivos_adjuntos}")
                
                # Verificar que el archivo solicitado esté en la lista
                if nombre_archivo not in archivos_adjuntos:
                    print(f"❌ Archivo '{nombre_archivo}' no encontrado en la lista de archivos adjuntos")
                    print(f"   Archivos disponibles: {archivos_adjuntos}")
                    raise HTTPException(
                        status_code=404, 
                        detail=f"El archivo '{nombre_archivo}' no se encuentra en los archivos adjuntos del plan. Archivos disponibles: {', '.join(archivos_adjuntos)}"
                    )
                
                print(f"✅ Archivo '{nombre_archivo}' encontrado en la lista de archivos adjuntos")
                
                # Buscar el archivo físicamente
                file_path = os.path.join(UPLOAD_DIR, nombre_archivo)
                
                print(f"🔍 Buscando archivo físicamente en: {file_path}")
                print(f"   Existe físicamente: {os.path.exists(file_path)}")
                
                if os.path.exists(file_path):
                    # El archivo existe físicamente
                    print(f"✅ Archivo encontrado físicamente en: {file_path}")
                    file_size = os.path.getsize(file_path)
                    print(f"   Tamaño del archivo: {file_size} bytes")
                    
                    # Leer el archivo
                    with open(file_path, "rb") as file:
                        file_content = file.read()
                        
                    print(f"✅ Archivo leído exitosamente ({len(file_content)} bytes)")
                    
                else:
                    # El archivo NO existe físicamente - crear simulado
                    print(f"⚠️ Archivo NO encontrado físicamente. Creando archivo simulado...")
                    
                    extension = os.path.splitext(nombre_archivo)[1].lower()
                    print(f"   Extensión detectada: {extension}")
                    
                    # Intentar importar dependencias para archivos simulados
                    try:
                        if extension == '.pdf':
                            # Crear un PDF simple
                            from reportlab.pdfgen import canvas
                            from io import BytesIO
                            
                            print("   Creando PDF simulado...")
                            buffer = BytesIO()
                            c = canvas.Canvas(buffer)
                            c.drawString(100, 750, f"Plan Quirúrgico: {plan['nombre_completo']}")
                            c.drawString(100, 730, f"Archivo: {nombre_archivo}")
                            c.drawString(100, 710, f"ID Plan: {plan_id_int}")
                            c.drawString(100, 690, f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                            c.drawString(100, 670, "Nota: Este es un archivo simulado")
                            c.drawString(100, 650, "Los archivos reales no se encontraron en el servidor")
                            c.drawString(100, 630, f"Directorios buscados: {UPLOAD_DIR}")
                            c.drawString(100, 610, f"Archivos adjuntos en BD: {', '.join(archivos_adjuntos)}")
                            c.showPage()
                            c.save()
                            
                            file_content = buffer.getvalue()
                            file_size = len(file_content)
                            print(f"   PDF simulado creado ({file_size} bytes)")
                            
                        elif extension in ['.jpg', '.jpeg', '.png', '.gif']:
                            # Crear una imagen simple
                            try:
                                from PIL import Image, ImageDraw, ImageFont
                                import io
                                
                                print("   Creando imagen simulada...")
                                img = Image.new('RGB', (800, 600), color='white')
                                d = ImageDraw.Draw(img)
                                
                                try:
                                    font = ImageFont.truetype("arial.ttf", 20)
                                except:
                                    font = ImageFont.load_default()
                                
                                d.text((50, 50), f"Plan Quirúrgico: {plan['nombre_completo']}", fill='black', font=font)
                                d.text((50, 80), f"Archivo: {nombre_archivo}", fill='black', font=font)
                                d.text((50, 110), f"ID Plan: {plan_id_int}", fill='black', font=font)
                                d.text((50, 140), f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", fill='black', font=font)
                                d.text((50, 170), "Nota: Esta es una imagen simulada", fill='black', font=font)
                                d.text((50, 200), "Los archivos reales no se encontraron en el servidor", fill='black', font=font)
                                d.text((50, 230), f"Directorios buscados: {UPLOAD_DIR}", fill='black', font=font)
                                d.text((50, 260), f"Archivos en BD: {len(archivos_adjuntos)}", fill='black', font=font)
                                
                                buffer = io.BytesIO()
                                
                                if extension == '.png':
                                    img.save(buffer, format='PNG')
                                elif extension in ['.jpg', '.jpeg']:
                                    img.save(buffer, format='JPEG')
                                elif extension == '.gif':
                                    img.save(buffer, format='GIF')
                                
                                file_content = buffer.getvalue()
                                file_size = len(file_content)
                                print(f"   Imagen simulada creada ({file_size} bytes)")
                                
                            except ImportError:
                                print("   Pillow no disponible, creando archivo de texto en su lugar")
                                raise ImportError("Pillow no disponible")
                                
                        else:
                            # Para otros tipos de archivo, crear un archivo de texto
                            print("   Creando archivo de texto simulado...")
                            contenido_texto = f"""Plan Quirúrgico: {plan['nombre_completo']}
Archivo: {nombre_archivo}
ID Plan: {plan_id_int}
Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Nota: Este es un archivo simulado
Los archivos reales no se encontraron en el servidor

Este archivo fue solicitado pero no existe físicamente en el servidor.
Los nombres de archivo están almacenados en la base de datos como referencias.

Directorio buscado: {UPLOAD_DIR}
Archivos adjuntos en BD: {', '.join(archivos_adjuntos)}

Para solucionar este problema:
1. Asegúrese de que los archivos se suban correctamente al crear/editar el plan
2. Verifique que los archivos existan en el directorio {UPLOAD_DIR}
3. Confirme que los nombres de archivo en la BD coincidan con los archivos físicos
"""
                            
                            file_content = contenido_texto.encode('utf-8')
                            file_size = len(file_content)
                            print(f"   Archivo de texto simulado creado ({file_size} bytes)")
                            
                    except ImportError as ie:
                        print(f"⚠️ Dependencias faltantes para archivos simulados: {ie}")
                        print("   Creando archivo de texto simple...")
                        
                        # Crear un archivo de texto simple como fallback
                        contenido_texto = f"""ERROR: No se pudo generar el archivo simulado
Archivo solicitado: {nombre_archivo}
Plan: {plan['nombre_completo']}
ID Plan: {plan_id_int}
Error: Dependencias faltantes: {ie}

El archivo no existe físicamente y no se pudieron generar dependencias.
"""
                        
                        file_content = contenido_texto.encode('utf-8')
                        file_size = len(file_content)
                
                # Obtener la extensión para determinar el tipo MIME
                file_extension = os.path.splitext(nombre_archivo)[1].lower()
                
                # Mapear extensiones comunes a tipos MIME
                mime_types = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.pdf': 'application/pdf',
                    '.doc': 'application/msword',
                    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    '.xls': 'application/vnd.ms-excel',
                    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    '.txt': 'text/plain',
                    '.csv': 'text/csv',
                    '.zip': 'application/zip',
                    '.rar': 'application/x-rar-compressed',
                }
                
                media_type = mime_types.get(file_extension, 'application/octet-stream')
                print(f"📄 Tipo MIME determinado: {media_type}")
                print(f"📦 Tamaño del archivo a enviar: {file_size} bytes")
                
                # Crear respuesta con el archivo
                headers = {
                    "Content-Disposition": f'attachment; filename="{nombre_archivo}"',
                    "Content-Length": str(file_size),
                    "Cache-Control": "private, max-age=0, must-revalidate",
                    "X-File-Name": nombre_archivo,
                    "X-Plan-ID": str(plan_id_int),
                    "X-Plan-Name": plan['nombre_completo'],
                    "X-File-Size": str(file_size),
                    "X-File-Type": media_type,
                }
                
                print(f"📤 Enviando respuesta con headers: {headers}")
                
                return Response(
                    content=file_content,
                    media_type=media_type,
                    headers=headers
                )
                
    except HTTPException as he:
        print(f"❌ HTTPException en descarga: {he.detail}")
        raise he
    except ImportError as ie:
        # Si faltan dependencias para crear archivos simulados
        print(f"⚠️ Error de importación: {ie}")
        
        contenido = f"Error: No se pudo generar el archivo. Dependencias faltantes: {ie}\n\n" \
                   f"Archivo solicitado: {nombre_archivo}\n" \
                   f"Plan ID: {plan_id}"
        
        return Response(
            content=contenido.encode('utf-8'),
            media_type='text/plain',
            headers={
                "Content-Disposition": f'attachment; filename="error-descarga.txt"',
                "Content-Length": str(len(contenido)),
                "X-Error": "Dependencias faltantes"
            }
        )
        
    except Exception as e:
        print(f"❌ ❌ ❌ ERROR CRÍTICO descargando archivo: {str(e)}")
        traceback.print_exc()
        
        error_msg = f"Error interno del servidor al descargar el archivo: {str(e)}"
        print(f"❌ Enviando error al cliente: {error_msg}")
        
        raise HTTPException(
            status_code=500, 
            detail=error_msg
        )

# Endpoint para verificar archivos de un plan
@router.get("/{plan_id}/archivos")
def get_archivos_plan(plan_id: str):
    """
    Obtiene la lista de archivos adjuntos de un plan quirúrgico
    """
    try:
        plan_id_num = plan_id.replace('plan_', '')
        print(f"📁 Obteniendo archivos del plan ID: {plan_id_num}")
        
        conn = get_connection()
        
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT imagen_procedimiento, nombre_completo 
                    FROM plan_quirurgico 
                    WHERE id = %s
                """, (plan_id_num,))
                
                plan = cursor.fetchone()
                
                if not plan:
                    raise HTTPException(status_code=404, detail="Plan no encontrado")
                
                archivos_adjuntos = []
                if plan['imagen_procedimiento']:
                    try:
                        if isinstance(plan['imagen_procedimiento'], str):
                            archivos_adjuntos = json.loads(plan['imagen_procedimiento'])
                            if not isinstance(archivos_adjuntos, list):
                                archivos_adjuntos = [archivos_adjuntos]
                    except:
                        archivos_adjuntos = [plan['imagen_procedimiento']]
                
                # Verificar cuáles archivos existen físicamente
                archivos_con_estado = []
                for archivo in archivos_adjuntos:
                    file_path = os.path.join(UPLOAD_DIR, archivo)
                    existe_fisicamente = os.path.exists(file_path)
                    
                    archivos_con_estado.append({
                        "nombre": archivo,
                        "existe": existe_fisicamente,
                        "tamaño": os.path.getsize(file_path) if existe_fisicamente else 0
                    })
                
                return {
                    "success": True,
                    "plan_id": plan_id,
                    "plan_nombre": plan['nombre_completo'],
                    "total_archivos": len(archivos_adjuntos),
                    "archivos": archivos_con_estado,
                    "directorio_uploads": UPLOAD_DIR,
                    "existe_directorio": os.path.exists(UPLOAD_DIR)
                }
                
    except Exception as e:
        print(f"❌ ERROR obteniendo archivos del plan: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))