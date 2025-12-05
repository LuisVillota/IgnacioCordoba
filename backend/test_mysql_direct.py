import pymysql

try:
    print("🔍 Probando conexión directa a MySQL...")
    
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='root',
        database='consultorio_db',
        port=3306
    )
    
    print("✅ Conexión exitosa!")
    
    # Probar que podemos ejecutar comandos
    cursor = conn.cursor()
    
    # Verificar tablas existentes
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()
    
    if tables:
        print(f"📊 Tablas existentes: {len(tables)}")
        for table in tables:
            print(f"   - {table[0]}")
    else:
        print("📊 No hay tablas aún")
    
    cursor.close()
    conn.close()
    
except pymysql.err.OperationalError as e:
    print(f"❌ Error de MySQL: {e}")
    print("\n💡 Posibles soluciones:")
    print("1. ¿MySQL está corriendo? (Revisa XAMPP/MySQL Service)")
    print("2. ¿La base de datos 'consultorio_db' existe?")
    print("3. ¿Usuario/contraseña correctos?")
    
    # Probar sin base de datos primero
    print("\n🔍 Probando conexión sin especificar base de datos...")
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            port=3306
        )
        print("✅ Puede conectarse al servidor MySQL")
        conn.close()
    except Exception as e2:
        print(f"❌ No puede conectarse al servidor: {e2}")
        
except Exception as e:
    print(f"❌ Error general: {e}")