import re
from typing import Optional

def parse_int_safe(value) -> Optional[int]:
    """Parsea un valor a entero de forma segura"""
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        cleaned = value.strip()
        if cleaned == "":
            return None
        try:
            return int(cleaned)
        except ValueError:
            numbers = re.findall(r'\d+', cleaned)
            if numbers:
                try:
                    return int(numbers[0])
                except:
                    pass
    raise ValueError(f"No se pudo convertir a entero: {value}")