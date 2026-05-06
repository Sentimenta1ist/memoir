import uuid
from datetime import date, datetime, UTC

from sqlalchemy import String, Date, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Entry(Base):
    __tablename__ = "entries"
    __table_args__ = (UniqueConstraint("user_id", "date"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    day_text: Mapped[str | None] = mapped_column(Text)
    thought_text: Mapped[str | None] = mapped_column(Text)
    tomorrow_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    user: Mapped["User"] = relationship("User", back_populates="entries")
    images: Mapped[list["Image"]] = relationship(
        "Image", back_populates="entry", order_by="Image.position", cascade="all, delete-orphan"
    )
