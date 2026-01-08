from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
import traceback

from app.core.database import get_connection
from app.models.schemas.cotizacion import (
    CotizacionCreate, CotizacionUpdate, CotizacionInDB
)

router = APIRouter()

@router.get("/", response_model=dict)
def get_cotizaciones(
    limit: int = Query(50, description="Límite de resultados"),
    offset: int = Query(0, description="Offset para paginación")
):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        c.id,
                        c.paciente_id,
                        c.usuario_id,
                        c.plan_id,
                        c.estado_id,
                        ec.nombre as estado_nombre,
                        c.total,
                        c.notas as observaciones,
                        DATE(c.fecha_emision) as fecha_creacion,
                        DATE(c.fecha_vencimiento) as fecha_vencimiento,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        p.numero_documento as paciente_documento,
                        u.nombre as usuario_nombre
                    FROM cotizacion c
                    JOIN paciente p ON c.paciente_id = p.id
                    JOIN usuario u ON c.usuario_id = u.id
                    JOIN estado_cotizacion ec ON c.estado_id = ec.id
                    ORDER BY c.fecha_emision DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                cotizaciones = cursor.fetchall()
                
                for cotizacion in cotizaciones:
                    cursor.execute("""
                        SELECT 
                            id,
                            tipo,
                            COALESCE(procedimiento_id, 0) as item_id,
                            descripcion as nombre,
                            cantidad,
                            precio_unitario,
                            subtotal
                        FROM cotizacion_item
                        WHERE cotizacion_id = %s
                        ORDER BY tipo, descripcion
                    """, (cotizacion['id'],))
                    items = cursor.fetchall()
                    
                    cursor.execute("""
                        SELECT 
                            servicio_nombre,
                            requiere
                        FROM cotizacion_servicio_incluido
                        WHERE cotizacion_id = %s
                    """, (cotizacion['id'],))
                    servicios_incluidos = cursor.fetchall()
                    
                    if not servicios_incluidos:
                        servicios_incluidos = [
                            {"servicio_nombre": "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", "requiere": False},
                            {"servicio_nombre": "ANESTESIOLOGO", "requiere": False},
                            {"servicio_nombre": "CONTROLES CON MEDICO Y ENFERMERA", "requiere": False},
                            {"servicio_nombre": "VALORACION CON ANESTESIOLOGO", "requiere": False},
                            {"servicio_nombre": "HEMOGRAMA DE CONTROL", "requiere": False},
                            {"servicio_nombre": "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", "requiere": False},
                            {"servicio_nombre": "IMPLANTES", "requiere": False},
                        ]
                    
                    subtotal_procedimientos = 0
                    subtotal_adicionales = 0
                    subtotal_otros_adicionales = 0
                    
                    for item in items:
                        if item['tipo'] == 'procedimiento':
                            subtotal_procedimientos += float(item['subtotal'])
                        elif item['tipo'] == 'adicional':
                            subtotal_adicionales += float(item['subtotal'])
                        elif item['tipo'] == 'otro_adicional':
                            subtotal_otros_adicionales += float(item['subtotal'])
                    
                    cotizacion['items'] = items
                    cotizacion['servicios_incluidos'] = servicios_incluidos
                    cotizacion['subtotal_procedimientos'] = subtotal_procedimientos
                    cotizacion['subtotal_adicionales'] = subtotal_adicionales
                    cotizacion['subtotal_otros_adicionales'] = subtotal_otros_adicionales
                    
                    if cotizacion['fecha_vencimiento'] and cotizacion['fecha_creacion']:
                        try:
                            fecha_creacion = datetime.strptime(str(cotizacion['fecha_creacion']), '%Y-%m-%d')
                            fecha_vencimiento = datetime.strptime(str(cotizacion['fecha_vencimiento']), '%Y-%m-%d')
                            validez_dias = (fecha_vencimiento - fecha_creacion).days
                            cotizacion['validez_dias'] = validez_dias if validez_dias > 0 else 7
                        except:
                            cotizacion['validez_dias'] = 7
                    else:
                        cotizacion['validez_dias'] = 7
                
                cursor.execute("SELECT COUNT(*) as total FROM cotizacion")
                total = cursor.fetchone()['total']
                
                return {
                    "cotizaciones": cotizaciones,
                    "total": total,
                    "limit": limit,
                    "offset": offset
                }
    except Exception as e:
        error_msg = str(e)
        if "cotizacion" in error_msg.lower():
            return {"cotizaciones": [], "total": 0}
        raise HTTPException(status_code=500, detail=error_msg)
        
@router.get("/{cotizacion_id}", response_model=dict)
def get_cotizacion(cotizacion_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        c.*,
                        c.notas as observaciones,
                        ec.nombre as estado_nombre,
                        p.nombre as paciente_nombre,
                        p.apellido as paciente_apellido,
                        p.numero_documento as paciente_documento,
                        p.telefono as paciente_telefono,
                        p.email as paciente_email,
                        u.nombre as usuario_nombre
                    FROM cotizacion c
                    JOIN estado_cotizacion ec ON c.estado_id = ec.id
                    JOIN paciente p ON c.paciente_id = p.id
                    JOIN usuario u ON c.usuario_id = u.id
                    WHERE c.id = %s
                """, (cotizacion_id,))
                cotizacion = cursor.fetchone()
                
                if not cotizacion:
                    raise HTTPException(status_code=404, detail="Cotización no encontrada")
                
                cursor.execute("""
                    SELECT 
                        id,
                        tipo,
                        item_id,
                        descripcion as nombre,
                        cantidad,
                        precio_unitario,
                        subtotal
                    FROM cotizacion_item
                    WHERE cotizacion_id = %s
                    ORDER BY tipo, descripcion
                """, (cotizacion_id,))
                items = cursor.fetchall()
                
                cursor.execute("""
                    SELECT 
                        servicio_nombre,
                        requiere
                    FROM cotizacion_servicio_incluido
                    WHERE cotizacion_id = %s
                """, (cotizacion_id,))
                servicios_incluidos = cursor.fetchall()
                
                if not servicios_incluidos:
                    servicios_incluidos = [
                        {"servicio_nombre": "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", "requiere": False},
                        {"servicio_nombre": "ANESTESIOLOGO", "requiere": False},
                        {"servicio_nombre": "CONTROLES CON MEDICO Y ENFERMERA", "requiere": False},
                        {"servicio_nombre": "VALORACION CON ANESTESIOLOGO", "requiere": False},
                        {"servicio_nombre": "HEMOGRAMA DE CONTROL", "requiere": False},
                        {"servicio_nombre": "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", "requiere": False},
                        {"servicio_nombre": "IMPLANTES", "requiere": False},
                    ]
                
                subtotal_procedimientos = 0
                subtotal_adicionales = 0
                subtotal_otros_adicionales = 0
                
                for item in items:
                    if item['tipo'] == 'procedimiento':
                        subtotal_procedimientos += float(item['subtotal'])
                    elif item['tipo'] == 'adicional':
                        subtotal_adicionales += float(item['subtotal'])
                    elif item['tipo'] == 'otro_adicional':
                        subtotal_otros_adicionales += float(item['subtotal'])
                
                cotizacion['items'] = items
                cotizacion['servicios_incluidos'] = servicios_incluidos
                cotizacion['subtotal_procedimientos'] = subtotal_procedimientos
                cotizacion['subtotal_adicionales'] = subtotal_adicionales
                cotizacion['subtotal_otros_adicionales'] = subtotal_otros_adicionales
                
                if cotizacion['fecha_vencimiento'] and cotizacion['fecha_emision']:
                    try:
                        fecha_creacion = datetime.strptime(str(cotizacion['fecha_emision']), '%Y-%m-%d %H:%M:%S')
                        fecha_vencimiento = datetime.strptime(str(cotizacion['fecha_vencimiento']), '%Y-%m-%d')
                        validez_dias = (fecha_vencimiento - fecha_creacion.date()).days
                        cotizacion['validez_dias'] = validez_dias if validez_dias > 0 else 7
                    except:
                        cotizacion['validez_dias'] = 7
                else:
                    cotizacion['validez_dias'] = 7
                
                return cotizacion
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error obteniendo cotización",
            "message": str(e)
        })
    
@router.post("/", response_model=dict)
def create_cotizacion(cotizacion: CotizacionCreate):
    try:
        conn = get_connection()
        
        with conn:
            with conn.cursor() as cursor:
                # Verificar que el paciente existe
                cursor.execute("SELECT id, nombre, apellido FROM paciente WHERE id = %s", (cotizacion.paciente_id,))
                paciente = cursor.fetchone()
                if not paciente:
                    raise HTTPException(status_code=404, detail=f"Paciente con ID {cotizacion.paciente_id} no encontrado")
                
                paciente_nombre = paciente['nombre']
                paciente_apellido = paciente['apellido']
                
                # Verificar que el usuario existe
                cursor.execute("SELECT id, nombre FROM usuario WHERE id = %s", (cotizacion.usuario_id,))
                usuario = cursor.fetchone()
                if not usuario:
                    raise HTTPException(status_code=404, detail=f"Usuario con ID {cotizacion.usuario_id} no encontrado")
                
                usuario_nombre = usuario['nombre']
                
                # Verificar que el estado existe
                if cotizacion.estado_id:
                    cursor.execute("SELECT id FROM estado_cotizacion WHERE id = %s", (cotizacion.estado_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail=f"Estado de cotización con ID {cotizacion.estado_id} no encontrado")
                
                # Calcular fecha_vencimiento si no se proporciona
                fecha_vencimiento = cotizacion.fecha_vencimiento
                if not fecha_vencimiento and cotizacion.validez_dias:
                    fecha_vencimiento = (datetime.now() + timedelta(days=cotizacion.validez_dias)).date()
                
                # Insertar cotización
                cursor.execute("""
                    INSERT INTO cotizacion (
                        paciente_id, usuario_id, plan_id, estado_id,
                        notas, fecha_vencimiento, fecha_emision,
                        subtotal_procedimientos, subtotal_adicionales, subtotal_otros_adicionales
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s)
                """, (
                    cotizacion.paciente_id,
                    cotizacion.usuario_id,
                    cotizacion.plan_id,
                    cotizacion.estado_id,
                    cotizacion.observaciones or "",
                    fecha_vencimiento,
                    cotizacion.subtotal_procedimientos or 0,
                    cotizacion.subtotal_adicionales or 0,
                    cotizacion.subtotal_otros_adicionales or 0
                ))
                
                cotizacion_id = cursor.lastrowid
                
                # Insertar items
                for item in cotizacion.items:
                    cursor.execute("""
                        INSERT INTO cotizacion_item (
                            cotizacion_id, tipo, item_id, descripcion,
                            cantidad, precio_unitario, subtotal
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        cotizacion_id,
                        item.tipo,
                        item.item_id,
                        item.nombre,
                        item.cantidad,
                        item.precio_unitario,
                        item.subtotal
                    ))
                
                # Insertar servicios incluidos
                for servicio in cotizacion.servicios_incluidos:
                    cursor.execute("""
                        INSERT INTO cotizacion_servicio_incluido (
                            cotizacion_id, servicio_nombre, requiere
                        ) VALUES (%s, %s, %s)
                    """, (
                        cotizacion_id,
                        servicio.servicio_nombre,
                        servicio.requiere
                    ))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Cotización creada exitosamente",
                    "cotizacion_id": cotizacion_id,
                    "paciente_nombre": f"{paciente_nombre} {paciente_apellido}",
                    "usuario_nombre": usuario_nombre
                }
                
    except HTTPException:
        raise
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR DETALLADO: {error_details}")
        raise HTTPException(status_code=500, detail={
            "error": "Error creando cotización",
            "message": str(e),
            "type": type(e).__name__
        })
                        
@router.put("/{cotizacion_id}", response_model=dict)
def update_cotizacion(cotizacion_id: int, cotizacion: CotizacionUpdate):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                # Verificar que la cotización existe
                cursor.execute("SELECT id FROM cotizacion WHERE id = %s", (cotizacion_id,))
                if not cursor.fetchone():
                    print(f"❌ Cotización {cotizacion_id} no encontrada")
                    raise HTTPException(status_code=404, detail="Cotización no encontrada")
                
                # Preparar campos a actualizar
                update_fields = []
                values = []
                
                if cotizacion.paciente_id is not None:
                    cursor.execute("SELECT id FROM paciente WHERE id = %s", (cotizacion.paciente_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Paciente no encontrado")
                    
                    update_fields.append("paciente_id = %s")
                    values.append(cotizacion.paciente_id)
                
                if cotizacion.usuario_id is not None:
                    cursor.execute("SELECT id FROM usuario WHERE id = %s", (cotizacion.usuario_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Usuario no encontrado")
                    
                    update_fields.append("usuario_id = %s")
                    values.append(cotizacion.usuario_id)
                
                if cotizacion.estado_id is not None:
                    cursor.execute("SELECT id FROM estado_cotizacion WHERE id = %s", (cotizacion.estado_id,))
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Estado no encontrado")
                    
                    update_fields.append("estado_id = %s")
                    values.append(cotizacion.estado_id)
                
                if cotizacion.subtotal_procedimientos is not None:
                    update_fields.append("subtotal_procedimientos = %s")
                    values.append(float(cotizacion.subtotal_procedimientos))
                
                if cotizacion.subtotal_adicionales is not None:
                    update_fields.append("subtotal_adicionales = %s")
                    values.append(float(cotizacion.subtotal_adicionales))
                
                if cotizacion.subtotal_otros_adicionales is not None:
                    update_fields.append("subtotal_otros_adicionales = %s")
                    values.append(float(cotizacion.subtotal_otros_adicionales))
                
                if cotizacion.observaciones is not None:
                    update_fields.append("notas = %s")
                    values.append(cotizacion.observaciones)
                
                if cotizacion.fecha_vencimiento is not None:
                    update_fields.append("fecha_vencimiento = %s")
                    values.append(cotizacion.fecha_vencimiento)
                
                # Actualizar cotización principal si hay campos
                if update_fields:
                    values.append(cotizacion_id)
                    query = f"UPDATE cotizacion SET {', '.join(update_fields)} WHERE id = %s"
                    print(f"📝 Query SQL: {query}")
                    print(f"📝 Valores: {values}")
                    
                    cursor.execute(query, values)
                    conn.commit()
                    
                    print(f"✅ Cotización {cotizacion_id} actualizada")
                
                # Actualizar items si se proporcionan
                if cotizacion.items is not None:
                    print(f"📦 Actualizando {len(cotizacion.items)} items...")
                    
                    cursor.execute("DELETE FROM cotizacion_item WHERE cotizacion_id = %s", (cotizacion_id,))
                    
                    for item in cotizacion.items:
                        cursor.execute("""
                            INSERT INTO cotizacion_item (
                                cotizacion_id, tipo, item_id, descripcion,
                                cantidad, precio_unitario, subtotal
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            cotizacion_id,
                            item.tipo,
                            item.item_id,
                            item.nombre,
                            item.cantidad,
                            float(item.precio_unitario),
                            float(item.subtotal)
                        ))
                    
                    conn.commit()
                    print(f"✅ Items actualizados para cotización {cotizacion_id}")
                
                # Actualizar servicios incluidos si se proporcionan
                if cotizacion.servicios_incluidos is not None:
                    print(f"🔧 Actualizando {len(cotizacion.servicios_incluidos)} servicios incluidos...")
                    
                    try:
                        cursor.execute("DELETE FROM cotizacion_servicio_incluido WHERE cotizacion_id = %s", (cotizacion_id,))
                        
                        for servicio in cotizacion.servicios_incluidos:
                            cursor.execute("""
                                INSERT INTO cotizacion_servicio_incluido (
                                    cotizacion_id, servicio_nombre, requiere
                                ) VALUES (%s, %s, %s)
                            """, (
                                cotizacion_id,
                                servicio.servicio_nombre,
                                servicio.requiere
                            ))
                        
                        conn.commit()
                        print(f"✅ Servicios incluidos actualizados para cotización {cotizacion_id}")
                        
                    except Exception as table_error:
                        print(f"⚠️ Tabla de servicios no disponible: {table_error}")
                
                return {
                    "success": True,
                    "message": "Cotización actualizada exitosamente",
                    "cotizacion_id": cotizacion_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error actualizando cotización: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error actualizando cotización",
            "message": str(e)
        })
                    
@router.delete("/{cotizacion_id}", response_model=dict)
def delete_cotizacion(cotizacion_id: int):
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM cotizacion WHERE id = %s", (cotizacion_id,))
                cotizacion_existente = cursor.fetchone()
                if not cotizacion_existente:
                    raise HTTPException(status_code=404, detail="Cotización no encontrada")
                
                cursor.execute("DELETE FROM cotizacion_item WHERE cotizacion_id = %s", (cotizacion_id,))
                cursor.execute("DELETE FROM cotizacion WHERE id = %s", (cotizacion_id,))
                
                conn.commit()
                
                return {
                    "success": True,
                    "message": "Cotización eliminada exitosamente",
                    "cotizacion_id": cotizacion_id
                }
                
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={
            "error": "Error eliminando cotización",
            "message": str(e),
            "type": type(e).__name__
        })

@router.get("/plantilla-servicios", response_model=dict)
def get_plantilla_servicios():
    servicios_base = [
        {"servicio_nombre": "CIRUJANO PLASTICO, AYUDANTE Y PERSONAL CLINICO", "requiere": False},
        {"servicio_nombre": "ANESTESIOLOGO", "requiere": False},
        {"servicio_nombre": "CONTROLES CON MEDICO Y ENFERMERA", "requiere": False},
        {"servicio_nombre": "VALORACION CON ANESTESIOLOGO", "requiere": False},
        {"servicio_nombre": "HEMOGRAMA DE CONTROL", "requiere": False},
        {"servicio_nombre": "UNA NOCHE DE HOSPITALIZACION CON UN ACOMPAÑANTES", "requiere": False},
        {"servicio_nombre": "IMPLANTES", "requiere": False},
    ]
    return {"servicios": servicios_base}