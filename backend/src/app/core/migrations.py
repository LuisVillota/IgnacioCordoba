"""Migraciones idempotentes que corren al arrancar el backend."""
import logging

from app.core.database import get_connection

logger = logging.getLogger(__name__)


def ensure_cita_tipo_varchar() -> None:
    """
    cita.tipo estaba limitada (ENUM) a pocos valores, y agendar tipos como
    valoracion_virtual o control_postquirurgico devolvía 500. Si la columna sigue
    siendo ENUM la convierte a VARCHAR(50) conservando los valores existentes.
    Si ya es texto no hace nada. Nunca tumba el arranque: ante cualquier error solo registra.
    """
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SHOW COLUMNS FROM cita LIKE 'tipo'")
                col = cursor.fetchone()
                if not col:
                    logger.warning("Migración cita.tipo: la columna no existe, se omite")
                    return
                if not str(col["Type"]).lower().startswith("enum"):
                    logger.info("Migración cita.tipo: ya es %s, nada que hacer", col["Type"])
                    return
                default = col["Default"] if col["Default"] is not None else "control"
                logger.warning("Migración cita.tipo: %s -> VARCHAR(50)", col["Type"])
                cursor.execute(
                    "ALTER TABLE cita MODIFY COLUMN tipo VARCHAR(50) NOT NULL DEFAULT %s",
                    (default,),
                )
            conn.commit()
            logger.warning("Migración cita.tipo aplicada")
        finally:
            conn.close()
    except Exception:
        logger.exception("Migración cita.tipo falló; el backend arranca igual")
