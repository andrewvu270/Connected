from __future__ import annotations

from pydantic import BaseModel


class AuthEmailPasswordRequest(BaseModel):
  email: str
  password: str


class AuthRefreshRequest(BaseModel):
  refresh_token: str


class AuthSessionResponse(BaseModel):
  access_token: str | None = None
  refresh_token: str | None = None
  token_type: str | None = None
  expires_in: int | None = None
  expires_at: int | None = None
  user: dict | None = None


class AuthMeResponse(BaseModel):
  id: str
  email: str | None = None


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


class DrillSessionResponse(BaseModel):
  id: str
  user_id: str | None = None
  provider: str | None = None
  status: str | None = None
  setting: str | None = None
  goal: str | None = None
  person: str | None = None
  time_budget: str | None = None
  lesson_ids: list[str] | None = None
  prompt: dict | None = None
  events: list | None = None
  transcript: dict | None = None
  vapi_call_id: str | None = None
  coach_session_id: str | None = None
  created_at: str | None = None
  updated_at: str | None = None


class TtsRequest(BaseModel):
  text: str
  voice: str | None = None
  model: str | None = None
  format: str | None = None


class VapiWebhookEvent(BaseModel):
  status: str | None = None
  call_id: str | None = None
  callId: str | None = None
  transcript: dict | None = None
  metadata: dict | None = None


class SkillLessonSummary(BaseModel):
  lesson_id: str
  title: str
  phase: str | None = None
  domain: str | None = None
  tier: int | None = None
  difficulty: str | None = None
  read_time_minutes: int | None = None
  quality_score: float | None = None
  actionability_score: float | None = None
  tags: list[str] | None = None


class SkillLessonDetail(SkillLessonSummary):
  content: dict | None = None


class KnowledgeLessonSummary(BaseModel):
  lesson_id: str
  title: str
  category: str | None = None
  difficulty: str | None = None
  read_time_minutes: int | None = None
  quality_score: float | None = None
  actionability_score: float | None = None
  tags: list[str] | None = None


class KnowledgeLessonDetail(KnowledgeLessonSummary):
  content: dict | None = None


class LessonProgressUpsertRequest(BaseModel):
  lesson_type: str  # skill | knowledge
  lesson_id: str
  status: str  # started | completed


class LessonProgressRow(BaseModel):
  user_id: str
  lesson_type: str
  lesson_id: str
  status: str
  started_at: str | None = None
  completed_at: str | None = None
  created_at: str | None = None
  updated_at: str | None = None


class ProgressSummaryResponse(BaseModel):
  lessons: dict
  drills: dict


class LearningPathPhaseProgress(BaseModel):
  phase: str
  completed: int
  total: int


class LearningPathRecommendations(BaseModel):
  skills: list[SkillLessonSummary]
  knowledge: list[KnowledgeLessonSummary]


class LearningPathResponse(BaseModel):
  suggested_phase: str | None = None
  phase_progress: list[LearningPathPhaseProgress]
  recommendations: LearningPathRecommendations
