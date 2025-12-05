from src.core.database import SessionLocal
from src.app.models import Usuario, Rol
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_initial_data():
    db = SessionLocal()
    
    try:
        print("🌱 Insertando datos iniciales...")
        
        # 1. Crear roles
        roles_data = [
            ("admin", "Administrador del sistema"),
            ("secretaria", "Secretaria/Administrativa"),
            ("doctor", "Médico cirujano"),
            ("programacion", "Programación quirúrgica")
        ]
        
        roles = {}
        for nombre, desc in roles_data:
            rol = Rol(nombre=nombre, descripcion=desc)
            db.add(rol)
            db.flush()  # Para obtener ID
            roles[nombre] = rol
        
        # 2. Crear usuarios según tus datos mock
        usuarios_data = [
            {
                "username": "admin",
                "password": "admin123",
                "nombre": "Admin User",
                "email": "admin@cirugiplastica.com",
                "rol_nombre": "admin"
            },
            {
                "username": "secretaria",
                "password": "sec123",
                "nombre": "Secretaria Test",
                "email": "secretaria@cirugiplastica.com",
                "rol_nombre": "secretaria"
            },
            {
                "username": "doctor",
                "password": "doc123",
                "nombre": "Dr. Hernán Ignacio Córdoba",
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
        
        for user_data in usuarios_data:
            usuario = Usuario(
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                nombre=user_data["nombre"],
                email=user_data["email"],
                rol_id=roles[user_data["rol_nombre"]].id,
                activo=True
            )
            db.add(usuario)
        
        db.commit()
        print("✅ Datos iniciales insertados exitosamente!")
        print("   Usuarios creados con sus contraseñas originales:")
        for user in usuarios_data:
            print(f"   - {user['username']}:{user['password']} ({user['nombre']})")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_initial_data()