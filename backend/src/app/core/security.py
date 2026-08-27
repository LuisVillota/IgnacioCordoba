import hashlib
import hmac
import base64
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, stored_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), stored_hash.encode())
    except ValueError:
        return False


def verify_legacy_sha256(plain: str, stored_hash: str) -> bool:
    return hashlib.sha256(plain.encode()).hexdigest() == stored_hash


def create_access_token(subject: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {**subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def sign_file_path(path: str) -> str:
    """Token de capacidad de vida larga para servir /uploads sin sesión (usado en <img src>).
    No expira: las URLs firmadas quedan guardadas de forma permanente en la BD
    (historial_clinico.fotos, plan_quirurgico.imagen_procedimiento)."""
    digest = hmac.new(settings.SECRET_KEY.encode(), path.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def verify_file_token(path: str, token: str) -> bool:
    if not token:
        return False
    return hmac.compare_digest(sign_file_path(path), token)
