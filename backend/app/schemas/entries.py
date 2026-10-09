import datetime as dt
from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field

NonEmptyStr = Annotated[str, Field(min_length=1)]
# Blank strings are stored as NULL so optional sections stay truly empty
OptionalText = Annotated[
    str | None, BeforeValidator(lambda v: None if isinstance(v, str) and not v.strip() else v)
]


class EntryCreate(BaseModel):
    date: date
    day_text: NonEmptyStr
    thought_text: OptionalText = None
    tomorrow_text: OptionalText = None


class EntryUpdate(BaseModel):
    date: dt.date | None = None
    day_text: NonEmptyStr | None = None
    thought_text: OptionalText = None
    tomorrow_text: OptionalText = None


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
