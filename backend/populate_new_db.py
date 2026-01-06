import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pymysql
import hashlib
from datetime import datetime

def create_initial_data():
    try:
        # Conexión a MySQL
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='u997398721_consultorio_db',
            port=3306,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        
        print("✅ Conectado a MySQL")
        
        with conn:
            with conn.cursor() as cursor:
                # 1. Verificar si ya existen usuarios
                cursor.execute("SELECT COUNT(*) as count FROM Usuario")
                result = cursor.fetchone()
                
                if result['count'] > 0:
                    print(f"✅ Ya existen {result['count']} usuarios en la base de datos")
                    
                    # Mostrar usuarios existentes
                    cursor.execute("""
                        SELECT u.id, u.username, u.nombre, u.email, r.nombre as rol, u.activo
                        FROM Usuario u 
                        JOIN Rol r ON u.rol_id = r.id
                    """)
                    usuarios = cursor.fetchall()
                    print("\n📋 Usuarios existentes:")
                    for user in usuarios:
                        print(f"  - {user['username']} ({user['rol']}) - {user['email']}")
                    return
                
                # 2. Insertar roles primero
                print("\n🔄 Insertando roles...")
                roles = [
                    ('admin', 'Administrador del sistema'),
                    ('secretaria', 'Personal administrativo'),
                    ('doctor', 'Médico cirujano'),
                    ('programacion', 'Personal de programación quirúrgica')
                ]
                
                for nombre, descripcion in roles:
                    cursor.execute(
                        "INSERT IGNORE INTO Rol (nombre, descripcion) VALUES (%s, %s)",
                        (nombre, descripcion)
                    )
                
                # 3. Insertar usuarios con SHA256 (como tu backend espera)
                print("🔄 Insertando usuarios...")
                usuarios = [
                    {
                        "username": "admin",
                        "password": "admin123",
                        "nombre": "Administrador",
                        "email": "admin@cirugiplastica.com",
                        "rol_nombre": "admin"
                    },
                    {
                        "username": "secretaria",
                        "password": "sec123",
                        "nombre": "Secretaria Principal",
                        "email": "secretaria@cirugiplastica.com",
                        "rol_nombre": "secretaria"
                    },
                    {
                        "username": "doctor",
                        "password": "doc123",
                        "nombre": "Dr. Juan Pérez",
                        "email": "doctor@cirugiplastica.com",
                        "rol_nombre": "doctor"
                    },
                    {
                        "username": "programacion",
                        "password": "prog123",
                        "nombre": "Programación Quirúrgica",
                        "email": "programacion@cirugiplastica.com",
                        "rol_nombre": "programacion"
                    }
                ]
                
                for user in usuarios:
                    # Obtener ID del rol
                    cursor.execute("SELECT id FROM Rol WHERE nombre = %s", (user["rol_nombre"],))
                    rol = cursor.fetchone()
                    
                    if rol:
                        # Hash con SHA256 (como tu backend lo hace)
                        password_hash = hashlib.sha256(user["password"].encode()).hexdigest()
                        
                        # Insertar usuario
                        cursor.execute("""
                            INSERT INTO Usuario 
                            (username, password, nombre, email, rol_id, activo, fecha_creacion)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            user["username"],
                            password_hash,  # SHA256 hash
                            user["nombre"],
                            user["email"],
                            rol["id"],
                            True,
                            datetime.now()
                        ))
                        print(f"  ✅ Usuario {user['username']} creado")
                
                conn.commit()
                
                print("\n🎉 ¡Todos los usuarios creados exitosamente!")
                print("\n📋 Credenciales para login (SHA256):")
                print("-" * 50)
                for user in usuarios:
                    print(f"👤 Usuario: {user['username']}")
                    print(f"🔑 Contraseña: {user['password']}")
                    print(f"📧 Email: {user['email']}")
                    print(f"🎭 Rol: {user['rol_nombre']}")
                    print("-" * 50)
                
                # 4. Insertar algunos datos de prueba adicionales
                print("\n🔄 Creando datos de prueba adicionales...")
                
                # Insertar estados de cita
                estados_cita = [
                    ('pendiente', '#FFC107'),
                    ('confirmada', '#17A2B8'),
                    ('completada', '#28A745'),
                    ('cancelada', '#DC3545')
                ]
                
                for nombre, color in estados_cita:
                    cursor.execute(
                        "INSERT IGNORE INTO Estado_Cita (nombre, color) VALUES (%s, %s)",
                        (nombre, color)
                    )
                
                # Insertar 2 pacientes de prueba
                pacientes = [
                    {
                        'numero_documento': '12345678',
                        'tipo_documento': 'CC',
                        'nombre': 'María',
                        'apellido': 'González',
                        'fecha_nacimiento': '1985-03-15',
                        'genero': 'F',
                        'telefono': '3001234567',
                        'email': 'maria@email.com',
                        'direccion': 'Calle 123 #45-67'
                    },
                    {
                        'numero_documento': '87654321',
                        'tipo_documento': 'CC',
                        'nombre': 'Carlos',
                        'apellido': 'Rodríguez',
                        'fecha_nacimiento': '1978-07-22',
                        'genero': 'M',
                        'telefono': '3109876543',
                        'email': 'carlos@email.com',
                        'direccion': 'Av. Siempre Viva 742'
                    }
                ]
                
                for paciente in pacientes:
                    cursor.execute("""
                        INSERT IGNORE INTO Paciente 
                        (numero_documento, tipo_documento, nombre, apellido, 
                         fecha_nacimiento, genero, telefono, email, direccion)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        paciente['numero_documento'],
                        paciente['tipo_documento'],
                        paciente['nombre'],
                        paciente['apellido'],
                        paciente['fecha_nacimiento'],
                        paciente['genero'],
                        paciente['telefono'],
                        paciente['email'],
                        paciente['direccion']
                    ))
                
                conn.commit()
                print("✅ Datos de prueba creados")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Iniciando creación de datos iniciales...")
    print(f"📁 Directorio actual: {os.getcwd()}")
    print(f"🔗 Base de datos: u997398721_consultorio_db")
    print(f"👤 Usuario MySQL: root")
    print("=" * 50)
    
    create_initial_data()