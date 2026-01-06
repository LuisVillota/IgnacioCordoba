import sys
import os
sys.path.append('.')

import pymysql
import hashlib

def test_database():
    print("🧪 PRUEBA DESDE CONSOLA - Sistema Consultorio")
    print("=" * 50)
    
    try:
        # 1. Probar conexión
        print("\n1. 🔌 Probando conexión a MySQL...")
        conn = get_connection(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=3306
        )
        print("   ✅ Conexión exitosa")
        
        cursor = conn.cursor()
        
        # 2. Verificar tablas
        print("\n2. 📊 Verificando estructura de tablas...")
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"   ✅ Se encontraron {len(tables)} tablas")
        
        for i, table in enumerate(tables[:10], 1):
            print(f"   {i:2}. {table[0]}")
        
        if len(tables) > 10:
            print(f"   ... y {len(tables) - 10} más")
        
        # 3. Verificar usuarios
        print("\n3. 👥 Verificando usuarios...")
        cursor.execute("""
            SELECT u.id, u.username, u.nombre, u.email, r.nombre as rol, u.activo
            FROM Usuario u 
            JOIN Rol r ON u.rol_id = r.id
            ORDER BY u.id
        """)
        users = cursor.fetchall()
        
        print(f"   ✅ {len(users)} usuarios encontrados:")
        for user in users:
            status = "🟢" if user[5] else "🔴"
            print(f"   {status} {user[1]:12} ({user[2]:25}) - Rol: {user[4]:12}")
        
        # 4. Probar login
        print("\n4. 🔐 Probando login con usuarios...")
        test_credentials = [
            ("admin", "admin123"),
            ("secretaria", "sec123"),
            ("doctor", "doc123"),
            ("programacion", "prog123")
        ]
        
        for username, password in test_credentials:
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            cursor.execute(
                "SELECT nombre, rol_id FROM Usuario WHERE username = %s AND password = %s",
                (username, password_hash)
            )
            result = cursor.fetchone()
            
            if result:
                cursor.execute("SELECT nombre FROM Rol WHERE id = %s", (result[1],))
                rol_nombre = cursor.fetchone()[0]
                print(f"   ✅ {username:12} -> {result[0]:25} (Rol: {rol_nombre})")
            else:
                print(f"   ❌ {username:12} -> Login fallido")
        
        # 5. Verificar estados
        print("\n5. 🏷️ Verificando estados del sistema...")
        
        estados_tablas = [
            ("Estado_Cita", "estados de cita"),
            ("Estado_Quirurgico", "estados quirúrgicos"),
            ("Estado_Cotizacion", "estados de cotización"),
            ("Estado_Factura", "estados de factura"),
            ("Tipo_Documento", "tipos de documento")
        ]
        
        for tabla, descripcion in estados_tablas:
            cursor.execute(f"SELECT COUNT(*) FROM {tabla}")
            count = cursor.fetchone()[0]
            print(f"   📋 {tabla:25}: {count:2} {descripcion}")
        
        # 6. Verificar pacientes
        print("\n6. 🧑‍⚕️ Verificando pacientes...")
        cursor.execute("SELECT COUNT(*) FROM Paciente")
        paciente_count = cursor.fetchone()[0]
        print(f"   👤 Total pacientes: {paciente_count}")
        
        if paciente_count > 0:
            cursor.execute("SELECT nombre, apellido, numero_documento FROM Paciente LIMIT 3")
            for paciente in cursor.fetchall():
                print(f"   📝 {paciente[0]} {paciente[1]} (Doc: {paciente[2]})")
            if paciente_count > 3:
                print(f"   ... y {paciente_count - 3} más")
        
        # 7. Verificar citas
        print("\n7. 📅 Verificando citas...")
        cursor.execute("SELECT COUNT(*) FROM Cita")
        cita_count = cursor.fetchone()[0]
        print(f"   📆 Total citas: {cita_count}")
        
        # 8. Resumen final
        print("\n" + "=" * 50)
        print("📈 RESUMEN FINAL:")
        print("-" * 50)
        
        resumen_tablas = [
            "Rol", "Usuario", "Paciente", "Cita", "Estado_Cita",
            "Estado_Quirurgico", "Estado_Cotizacion", "Estado_Factura",
            "Tipo_Documento", "Permiso", "Rol_Permiso", "Historial_Clinico"
        ]
        
        total_registros = 0
        for tabla in resumen_tablas:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {tabla}")
                count = cursor.fetchone()[0]
                total_registros += count
                print(f"   {tabla:25}: {count:4} registros")
            except:
                print(f"   {tabla:25}: No existe o error")
        
        print(f"\n   {'TOTAL':25}: {total_registros:4} registros")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n🎉 ¡Sistema verificado correctamente!")
        print("\n🔧 Próximos pasos:")
        print("   1. Iniciar API: python run.py")
        print("   2. Probar en navegador: http://localhost:8000")
        print("   3. Ver documentación: http://localhost:8000/docs")
        print("   4. Conectar frontend Next.js")
        
    except pymysql.err.OperationalError as e:
        print(f"❌ Error de conexión: {e}")
        print("\n💡 Soluciones:")
        print("   - Verifica que MySQL esté corriendo")
        print("   - Verifica usuario/contraseña en .env")
        print("   - Ejecuta tu script SQL en MySQL Workbench")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database()