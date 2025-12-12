from __future__ import annotations

from pydantic import BaseModel


class NewsSourceIn(BaseModel):
  name: str
  source_type: str
  url: str
  category: str
  enabled: bool = True


class SeedNewsSourcesRequest(BaseModel):
  sources: list[NewsSourceIn]


class MascotAdviseRequest(BaseModel):
  setting: str
  goal: str
  person: str = ""
  time_budget: str = "5min"
  topic_text: str | None = None
  constraints: str | None = None
  max_lessons: int = 5
