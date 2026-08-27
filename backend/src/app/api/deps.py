from typing import Generator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_connection
from app.core.security import decode_access_token


def get_db() -> Generator:
    """Dependencia para obtener conexión a DB"""
    conn = None
    try:
        conn = get_connection()
        yield conn
    finally:
        if conn:
            conn.close()


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    return {
        "id": int(payload.get("sub")),
        "username": payload.get("username"),
        "rol": payload.get("rol"),
        "rol_id": payload.get("rol_id"),
    }


def require_roles(*rol_ids: int):
    def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if rol_ids and current_user.get("rol_id") not in rol_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para esta acción")
        return current_user

    return checker
