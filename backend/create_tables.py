import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.core.database import engine, Base
from src.app.models import *

def create_tables():
    print("🔨 Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas exitosamente!")

if __name__ == "__main__":
    create_tables()