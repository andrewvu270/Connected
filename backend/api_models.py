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


class DrillStartRequest(BaseModel):
  provider: str = "vapi"  # vapi | text
  setting: str
  goal: str
  person: str = ""
  time_budget: str = "5min"
  constraints: str | None = None
  lesson_ids: list[str] = []


class DrillStartResponse(BaseModel):
  drill_session_id: str
  provider: str
  prompt: dict
  vapi: dict | None = None
  coach_session_id: str | None = None


class VapiWebhookEvent(BaseModel):
  status: str | None = None
  call_id: str | None = None
  callId: str | None = None
  transcript: dict | None = None
  metadata: dict | None = None
