"""
Migración de una sola corrida: la columna cita.tipo parece estar limitada (ENUM/CHECK) a
unos pocos valores, y por eso agendar visitador_medico, valoracion_virtual, control_virtual,
control_postquirurgico, etc. devuelve 500. Este script inspecciona la columna y, si hace
falta, la convierte a VARCHAR(50) conservando los valores existentes.

Uso:
    python migrate_cita_tipo.py            # dry-run: solo muestra el estado actual
    python migrate_cita_tipo.py --apply    # aplica el ALTER TABLE
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.core.database import get_connection

APPLY = "--apply" in sys.argv

TIPOS_NECESARIOS = [
    "consulta", "control", "valoracion", "program_quir", "visitador_medico",
    "valoracion_virtual", "control_virtual", "control_postquirurgico",
]


def main():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SHOW COLUMNS FROM cita LIKE 'tipo'")
            col = cursor.fetchone()
            print("Columna actual:", col)

            cursor.execute("SELECT tipo, COUNT(*) AS n FROM cita GROUP BY tipo")
            print("Valores existentes:", cursor.fetchall())

            definicion = str(col["Type"]).lower()
            if definicion.startswith("varchar(") and int(definicion[len("varchar("):-1]) >= 50:
                print(f"\nLa columna ya es {col['Type']}; nada que hacer.")
                return

            print(f"\nLa columna es {col['Type']}. Faltan valores permitidos; se convertirá a VARCHAR(50).")
            if not APPLY:
                print("DRY-RUN: no se cambió nada. Corra con --apply para aplicar.")
                return

            default = col["Default"] if col["Default"] is not None else "control"
            cursor.execute(
                "ALTER TABLE cita MODIFY COLUMN tipo VARCHAR(50) NOT NULL DEFAULT %s", (default,)
            )
            conn.commit()
            print("ALTER TABLE hecho. Valores soportados por el frontend:", TIPOS_NECESARIOS)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
