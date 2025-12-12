from __future__ import annotations

from pydantic import BaseModel


class StartSessionRequest(BaseModel):
  lesson_id: str | None = None
  mode: str = "coach"  # coach | roleplay


class StartSessionResponse(BaseModel):
  session_id: str


class SendMessageRequest(BaseModel):
  content: str


class SendMessageResponse(BaseModel):
  session_id: str
  user_message: dict
  coach_message: dict
