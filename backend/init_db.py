import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.core.database import engine, Base
from src.app.models import *
from seed_data import seed_initial_data

def init_database():
    print("🔨 Inicializando base de datos...")
    
    # 1. Eliminar tablas existentes (CUIDADO en producción!)
    print("   Borrando tablas existentes...")
    Base.metadata.drop_all(bind=engine)
    
    # 2. Crear todas las tablas
    print("   Creando tablas...")
    Base.metadata.create_all(bind=engine)
    
    # 3. Insertar datos iniciales
    print("   Insertando datos iniciales...")
    seed_initial_data()
    
    print("✅ Base de datos inicializada completamente!")

if __name__ == "__main__":
    init_database()