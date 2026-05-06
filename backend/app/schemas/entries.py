from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, Field

NonEmptyStr = Annotated[str, Field(min_length=1)]


class EntryCreate(BaseModel):
    date: date
    day_text: NonEmptyStr
    thought_text: NonEmptyStr
    tomorrow_text: NonEmptyStr


class EntryUpdate(BaseModel):
    day_text: NonEmptyStr | None = None
    thought_text: NonEmptyStr | None = None
    tomorrow_text: NonEmptyStr | None = None


class ImageResponse(BaseModel):
    id: str
    filename: str
    url: str
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EntryResponse(BaseModel):
    id: str
    user_id: str
    date: date
    day_text: str | None
    thought_text: str | None
    tomorrow_text: str | None
    created_at: datetime
    updated_at: datetime
    images: list[ImageResponse] = []

    model_config = {"from_attributes": True}


class EntryListResponse(BaseModel):
    items: list[EntryResponse]
    total: int
    streak: int
