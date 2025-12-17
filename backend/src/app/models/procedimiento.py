import uuid
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import Base

class Procedimiento(Base):
    __tablename__ = "procedimiento"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    precio: Mapped[int] = mapped_column(Integer, nullable=False)
