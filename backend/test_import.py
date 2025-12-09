import sys
import os

print("🧪 Probando importaciones...")
print(f"Directorio actual: {os.getcwd()}")
print(f"Python path: {sys.path}")

# Agregar directorio actual al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("\n1. Probando importar config...")
    from src.core.config import settings
    print(f"   ✅ Config cargada")
    print(f"   DATABASE_URL: {settings.DATABASE_URL}")
    print(f"   DEBUG: {settings.DEBUG}")
except ImportError as e:
    print(f"   ❌ Error: {e}")
    print("   Verificando archivo config.py...")
    config_path = os.path.join("src", "core", "config.py")
    if os.path.exists(config_path):
        print(f"   ✓ config.py existe en {config_path}")
    else:
        print(f"   ✗ config.py NO existe")

try:
    print("\n2. Probando importar database...")
    from src.core.database import engine, Base
    print("   ✅ Database importado")
except ImportError as e:
    print(f"   ❌ Error: {e}")
    print("   Verificando archivo database.py...")
    db_path = os.path.join("src", "core", "database.py")
    if os.path.exists(db_path):
        print(f"   ✓ database.py existe en {db_path}")
    else:
        print(f"   ✗ database.py NO existe")

try:
    print("\n3. Probando importar modelos...")
    from src.app.models.usuario import Usuario
    print("   ✅ Modelos importados")
except ImportError as e:
    print(f"   ❌ Error: {e}")
    print("   Verificando estructura de modelos...")
    models_dir = os.path.join("src", "app", "models")
    if os.path.exists(models_dir):
        print(f"   ✓ Carpeta models existe")
        archivos = os.listdir(models_dir)
        print(f"   Archivos en models/: {archivos}")
    else:
        print(f"   ✗ Carpeta models NO existe")

print("\n✅ Prueba completada")
