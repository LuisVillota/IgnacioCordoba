"""
Migración de una sola corrida: agrega ?t=<token firmado> a las URLs /uploads/... ya
guardadas en historial_clinico.fotos y plan_quirurgico.imagen_procedimiento, para que
sigan funcionando con la nueva ruta protegida en main.py.

Uso:
    python migrate_file_tokens.py            # dry-run, no escribe nada
    python migrate_file_tokens.py --apply    # aplica los cambios
"""
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import pymysql
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.core.database import get_connection
from app.core.security import sign_file_path

APPLY = "--apply" in sys.argv


def add_token_if_needed(url: str) -> tuple[str, bool]:
    url = url.strip()
    if not url or not url.startswith("/uploads/") or "?t=" in url:
        return url, False
    relative_path = url[len("/uploads/"):]
    token = sign_file_path(relative_path)
    return f"{url}?t={token}", True


def migrate_historias(cursor):
    cursor.execute("SELECT id, fotos FROM historial_clinico WHERE fotos IS NOT NULL AND fotos != ''")
    rows = cursor.fetchall()
    changed = 0
    for row in rows:
        fotos = [f for f in row["fotos"].split(",") if f.strip()]
        nuevas = []
        row_changed = False
        for f in fotos:
            nueva, did_change = add_token_if_needed(f)
            nuevas.append(nueva)
            row_changed = row_changed or did_change
        if row_changed:
            changed += 1
            nuevo_valor = ",".join(nuevas)
            print(f"historial_clinico.id={row['id']}: {row['fotos']!r} -> {nuevo_valor!r}")
            if APPLY:
                cursor.execute("UPDATE historial_clinico SET fotos = %s WHERE id = %s", (nuevo_valor, row["id"]))
    print(f"historial_clinico: {changed}/{len(rows)} filas con fotos locales sin token")


def migrate_planes(cursor):
    cursor.execute("SELECT id, imagen_procedimiento FROM plan_quirurgico WHERE imagen_procedimiento IS NOT NULL AND imagen_procedimiento != ''")
    rows = cursor.fetchall()
    changed = 0
    for row in rows:
        raw = row["imagen_procedimiento"]
        try:
            archivos = json.loads(raw)
            is_json = isinstance(archivos, list)
        except Exception:
            is_json = False
        if not is_json:
            archivos = [a for a in raw.split(",") if a.strip()]

        nuevas = []
        row_changed = False
        for a in archivos:
            nueva, did_change = add_token_if_needed(a)
            nuevas.append(nueva)
            row_changed = row_changed or did_change
        if row_changed:
            changed += 1
            nuevo_valor = json.dumps(nuevas) if is_json else ",".join(nuevas)
            print(f"plan_quirurgico.id={row['id']}: {raw!r} -> {nuevo_valor!r}")
            if APPLY:
                cursor.execute("UPDATE plan_quirurgico SET imagen_procedimiento = %s WHERE id = %s", (nuevo_valor, row["id"]))
    print(f"plan_quirurgico: {changed}/{len(rows)} filas con archivos locales sin token")


def main():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            migrate_historias(cursor)
            migrate_planes(cursor)
        if APPLY:
            conn.commit()
            print("COMMIT hecho.")
        else:
            print("\nDRY-RUN: no se escribió nada. Corré con --apply para aplicar.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
