import logging
import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

try:
  from langgraph_news import build_news_job_graph
except ModuleNotFoundError:
  build_news_job_graph = None

try:
  from langgraph_brief import build_brief_job_graph
except ModuleNotFoundError:
  build_brief_job_graph = None
from supabase_client import get_supabase_admin_client
from api_models import (
  AuthEmailPasswordRequest,
  AuthMeResponse,
  AuthRefreshRequest,
  AuthSessionResponse,
  DrillStartRequest,
  DrillStartResponse,
  KnowledgeLessonDetail,
  KnowledgeLessonSummary,
  LearningPathResponse,
  LessonProgressRow,
  LessonProgressUpsertRequest,
  MascotAdviseRequest,
  NewsSourceIn,
  ProgressSummaryResponse,
  SeedNewsSourcesRequest,
  SkillLessonDetail,
  SkillLessonSummary,
)
from auth import get_current_user
from coach_models import SendMessageRequest, SendMessageResponse, StartSessionRequest, StartSessionResponse
from coach_service import send_message, start_session
from brief_pipeline import run_daily_brief
from mascot_service import advise as mascot_advise
from drill_service import record_vapi_event, start_drill
from lesson_service import get_knowledge_lesson, get_skill_lesson, list_knowledge_lessons, list_skill_lessons
from progress_service import list_lesson_progress, progress_summary, upsert_lesson_progress
from learning_path_service import recommend_learning_path

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("connected")

app = FastAPI(title="Connected AI Service")

web_origin_env = os.getenv("WEB_ORIGIN", "http://localhost:3000")
web_origins = [o.strip() for o in web_origin_env.split(",") if o.strip()]

allow_credentials = os.getenv("ALLOW_CREDENTIALS", "false").lower() == "true"
if web_origin_env.strip() == "*":
  web_origins = ["*"]
  allow_credentials = False

app.add_middleware(
  CORSMiddleware,
  allow_origins=web_origins,
  allow_credentials=allow_credentials,
  allow_methods=["*"] ,
  allow_headers=["*"] ,
)

news_job = build_news_job_graph() if build_news_job_graph else None
brief_job = build_brief_job_graph() if build_brief_job_graph else None


def _get_supabase_auth_base_url() -> str:
  url = os.getenv("SUPABASE_URL")
  if not url:
    raise HTTPException(status_code=500, detail="SUPABASE_URL not configured")
  return url.rstrip("/")


def _get_supabase_anon_key() -> str:
  key = os.getenv("SUPABASE_ANON_KEY")
  if not key:
    raise HTTPException(status_code=500, detail="SUPABASE_ANON_KEY not configured")
  return key


def _auth_error(resp: httpx.Response) -> HTTPException:
  detail: Any = None
  try:
    detail = resp.json()
  except Exception:
    detail = resp.text
  return HTTPException(status_code=resp.status_code, detail=detail)


def _require_admin(x_admin_key: str | None) -> None:
  expected = os.getenv("ADMIN_API_KEY")
  if not expected:
    raise HTTPException(status_code=500, detail="ADMIN_API_KEY not configured")
  if not x_admin_key or x_admin_key != expected:
    raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health():
  return {"ok": True}


@app.get("/config")
def config():
  return {
    "has_openai_key": bool(os.getenv("OPENAI_API_KEY")),
    "has_news_key": bool(os.getenv("NEWS_PROVIDER_API_KEY")),
    "has_supabase_url": bool(os.getenv("SUPABASE_URL")),
    "has_service_role": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
  }


@app.post("/jobs/news/run")
def run_news_job(x_admin_key: str | None = Header(default=None)):
  _require_admin(x_admin_key)
  if not news_job:
    raise HTTPException(status_code=503, detail="News job pipeline not available (langgraph dependency missing)")
  logger.info("news_job_start")
  out = news_job.invoke({})
  logger.info("news_job_done", extra={"result": out.get("result") if isinstance(out, dict) else None})
  return out


@app.post("/jobs/brief/run")
def run_brief_job(audience: str = "global", x_admin_key: str | None = Header(default=None)):
  _require_admin(x_admin_key)
  if not brief_job:
    raise HTTPException(status_code=503, detail="Brief job pipeline not available (langgraph dependency missing)")
  logger.info("brief_job_start", extra={"audience": audience})
  out = brief_job.invoke({"audience": audience})
  logger.info("brief_job_done", extra={"result": out.get("result") if isinstance(out, dict) else None})
  return out


@app.post("/jobs/brief/run_global")
def run_brief_global(x_admin_key: str | None = Header(default=None)):
  _require_admin(x_admin_key)
  logger.info("brief_global_start")
  res = run_daily_brief(audience="global")
  logger.info(
    "brief_global_done",
    extra={
      "audience": res.audience,
      "brief_date": res.brief_date,
      "items_selected": res.items_selected,
      "stored": res.stored,
    },
  )
  return {
    "audience": res.audience,
    "brief_date": res.brief_date,
    "items_selected": res.items_selected,
    "stored": res.stored,
  }


@app.post("/admin/news/sources/seed")
def seed_news_sources(payload: SeedNewsSourcesRequest, x_admin_key: str | None = Header(default=None)):
  _require_admin(x_admin_key)
  supabase = get_supabase_admin_client()
  rows = [s.model_dump() for s in payload.sources]
  res = supabase.table("news_sources").upsert(rows, on_conflict="url").execute()
  return {"inserted": len(res.data or [])}


@app.post("/admin/news/sources")
def create_news_source(source: NewsSourceIn, x_admin_key: str | None = Header(default=None)):
  _require_admin(x_admin_key)
  supabase = get_supabase_admin_client()
  res = supabase.table("news_sources").insert(source.model_dump()).execute()
  return {"id": res.data[0]["id"]}


@app.post("/auth/signup", response_model=AuthSessionResponse)
def auth_signup(payload: AuthEmailPasswordRequest):
  base = _get_supabase_auth_base_url()
  anon = _get_supabase_anon_key()
  with httpx.Client(timeout=15) as client:
    resp = client.post(
      f"{base}/auth/v1/signup",
      headers={
        "apikey": anon,
        "Content-Type": "application/json",
      },
      json={"email": payload.email, "password": payload.password},
    )
  if resp.status_code not in {200, 201}:
    raise _auth_error(resp)
  data = resp.json()
  return AuthSessionResponse(
    access_token=data.get("access_token"),
    refresh_token=data.get("refresh_token"),
    token_type=data.get("token_type"),
    expires_in=data.get("expires_in"),
    expires_at=data.get("expires_at"),
    user=data.get("user"),
  )


@app.post("/auth/login", response_model=AuthSessionResponse)
def auth_login(payload: AuthEmailPasswordRequest):
  base = _get_supabase_auth_base_url()
  anon = _get_supabase_anon_key()
  with httpx.Client(timeout=15) as client:
    resp = client.post(
      f"{base}/auth/v1/token?grant_type=password",
      headers={
        "apikey": anon,
        "Content-Type": "application/json",
      },
      json={"email": payload.email, "password": payload.password},
    )
  if resp.status_code != 200:
    raise _auth_error(resp)
  data = resp.json()
  return AuthSessionResponse(
    access_token=data.get("access_token"),
    refresh_token=data.get("refresh_token"),
    token_type=data.get("token_type"),
    expires_in=data.get("expires_in"),
    expires_at=data.get("expires_at"),
    user=data.get("user"),
  )


@app.post("/auth/refresh", response_model=AuthSessionResponse)
def auth_refresh(payload: AuthRefreshRequest):
  base = _get_supabase_auth_base_url()
  anon = _get_supabase_anon_key()
  with httpx.Client(timeout=15) as client:
    resp = client.post(
      f"{base}/auth/v1/token?grant_type=refresh_token",
      headers={
        "apikey": anon,
        "Content-Type": "application/json",
      },
      json={"refresh_token": payload.refresh_token},
    )
  if resp.status_code != 200:
    raise _auth_error(resp)
  data = resp.json()
  return AuthSessionResponse(
    access_token=data.get("access_token"),
    refresh_token=data.get("refresh_token"),
    token_type=data.get("token_type"),
    expires_in=data.get("expires_in"),
    expires_at=data.get("expires_at"),
    user=data.get("user"),
  )


@app.post("/auth/logout")
def auth_logout(authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  base = _get_supabase_auth_base_url()
  anon = _get_supabase_anon_key()
  with httpx.Client(timeout=15) as client:
    resp = client.post(
      f"{base}/auth/v1/logout",
      headers={
        "apikey": anon,
        "Authorization": f"Bearer {user.access_token}",
      },
    )
  if resp.status_code not in {200, 204}:
    raise _auth_error(resp)
  return {"ok": True}


@app.get("/auth/me", response_model=AuthMeResponse)
def auth_me(authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  return AuthMeResponse(id=user.id, email=user.email)


@app.get("/news/feed")
def get_news_feed(limit: int = Query(default=50, ge=1, le=200)):
  supabase = get_supabase_admin_client()
  res = (
    supabase.table("news_feed_cards")
    .select("id, category, card, created_at")
    .eq("published", True)
    .order("created_at", desc=True)
    .limit(limit)
    .execute()
  )
  if getattr(res, "error", None):
    raise HTTPException(status_code=500, detail=str(res.error))
  return {"data": res.data or []}


@app.get("/news/brief")
def get_news_brief(
  audience: str = Query(default="global"),
  brief_date: str | None = Query(default=None),
):
  supabase = get_supabase_admin_client()
  if not brief_date:
    brief_date = datetime.now(timezone.utc).date().isoformat()
  res = (
    supabase.table("news_daily_briefs")
    .select("brief")
    .eq("brief_date", brief_date)
    .eq("audience", audience)
    .limit(1)
    .execute()
  )
  if getattr(res, "error", None):
    raise HTTPException(status_code=500, detail=str(res.error))
  row0 = res.data[0] if isinstance(res.data, list) and res.data else None
  brief = (row0 or {}).get("brief") if isinstance(row0, dict) else None
  return {"audience": audience, "brief_date": brief_date, "brief": brief}


@app.post("/coach/sessions/start", response_model=StartSessionResponse)
def coach_start_session(payload: StartSessionRequest, authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  try:
    session_id = start_session(
      user_id=user.id,
      user_access_token=user.access_token,
      lesson_id=payload.lesson_id,
      mode=payload.mode,
    )
    return StartSessionResponse(session_id=session_id)
  except RuntimeError as e:
    raise HTTPException(status_code=500, detail=str(e))


@app.get("/lessons", response_model=list[SkillLessonSummary])
def list_lessons_endpoint(
  authorization: str | None = Header(default=None),
  phase: str | None = Query(default=None),
  domain: str | None = Query(default=None),
  difficulty: str | None = Query(default=None),
  tier: int | None = Query(default=None),
  q: str | None = Query(default=None),
  limit: int = Query(default=20),
  offset: int = Query(default=0),
):
  user = get_current_user(authorization)
  return list_skill_lessons(
    user_access_token=user.access_token,
    phase=phase,
    domain=domain,
    difficulty=difficulty,
    tier=tier,
    q=q,
    limit=limit,
    offset=offset,
  )


@app.get("/lessons/{lesson_id}", response_model=SkillLessonDetail)
def get_lesson_endpoint(lesson_id: str, authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  row = get_skill_lesson(user_access_token=user.access_token, lesson_id=lesson_id)
  if not row:
    raise HTTPException(status_code=404, detail="Lesson not found")
  return row


@app.get("/knowledge_lessons", response_model=list[KnowledgeLessonSummary])
def list_knowledge_lessons_endpoint(
  authorization: str | None = Header(default=None),
  category: str | None = Query(default=None),
  difficulty: str | None = Query(default=None),
  q: str | None = Query(default=None),
  limit: int = Query(default=20),
  offset: int = Query(default=0),
):
  user = get_current_user(authorization)
  return list_knowledge_lessons(
    user_access_token=user.access_token,
    category=category,
    difficulty=difficulty,
    q=q,
    limit=limit,
    offset=offset,
  )


@app.get("/knowledge_lessons/{lesson_id}", response_model=KnowledgeLessonDetail)
def get_knowledge_lesson_endpoint(lesson_id: str, authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  row = get_knowledge_lesson(user_access_token=user.access_token, lesson_id=lesson_id)
  if not row:
    raise HTTPException(status_code=404, detail="Knowledge lesson not found")
  return row


@app.post("/progress/lessons", response_model=LessonProgressRow)
def upsert_progress_endpoint(payload: LessonProgressUpsertRequest, authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  return upsert_lesson_progress(
    user_id=user.id,
    user_access_token=user.access_token,
    lesson_type=payload.lesson_type,
    lesson_id=payload.lesson_id,
    status=payload.status,
  )


@app.get("/progress/lessons", response_model=list[LessonProgressRow])
def list_progress_endpoint(
  authorization: str | None = Header(default=None),
  lesson_type: str | None = Query(default=None),
  status: str | None = Query(default=None),
  limit: int = Query(default=50),
  offset: int = Query(default=0),
):
  user = get_current_user(authorization)
  return list_lesson_progress(
    user_id=user.id,
    user_access_token=user.access_token,
    lesson_type=lesson_type,
    status=status,
    limit=limit,
    offset=offset,
  )


@app.get("/progress/summary", response_model=ProgressSummaryResponse)
def progress_summary_endpoint(authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  return progress_summary(user_id=user.id, user_access_token=user.access_token)


@app.get("/learning_path/recommendations", response_model=LearningPathResponse)
def learning_path_recommendations_endpoint(
  authorization: str | None = Header(default=None),
  skills_limit: int = Query(default=5),
  knowledge_limit: int = Query(default=2),
):
  user = get_current_user(authorization)
  try:
    return recommend_learning_path(
      user_id=user.id,
      user_access_token=user.access_token,
      skills_limit=skills_limit,
      knowledge_limit=knowledge_limit,
    )
  except RuntimeError as e:
    raise HTTPException(status_code=500, detail=str(e))


@app.post("/coach/sessions/{session_id}/message", response_model=SendMessageResponse)
def coach_send_message(session_id: str, payload: SendMessageRequest, authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  try:
    user_msg, coach_msg = send_message(
      user_id=user.id,
      user_access_token=user.access_token,
      session_id=session_id,
      content=payload.content,
    )
  except PermissionError:
    raise HTTPException(status_code=404, detail="Session not found")

  return SendMessageResponse(session_id=session_id, user_message=user_msg, coach_message=coach_msg)


@app.post("/mascot/advise")
def mascot_advise_endpoint(payload: MascotAdviseRequest, authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  logger.info(
    "mascot_advise_start",
    extra={
      "user_id": user.id,
      "setting": payload.setting,
      "goal": payload.goal,
      "max_lessons": payload.max_lessons,
    },
  )
  out = mascot_advise(
    setting=payload.setting,
    goal=payload.goal,
    person=payload.person,
    time_budget=payload.time_budget,
    topic_text=payload.topic_text,
    constraints=payload.constraints,
    max_lessons=payload.max_lessons,
  )
  logger.info(
    "mascot_advise_done",
    extra={
      "user_id": user.id,
      "lessons": len((out.get("recommendations") or {}).get("lessons") or []),
    },
  )
  return out


@app.post("/mascot/drill/start", response_model=DrillStartResponse)
def mascot_drill_start(payload: DrillStartRequest, authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  out = start_drill(
    user_id=user.id,
    user_access_token=user.access_token,
    provider=payload.provider,
    setting=payload.setting,
    goal=payload.goal,
    person=payload.person,
    time_budget=payload.time_budget,
    constraints=payload.constraints,
    lesson_ids=payload.lesson_ids,
  )
  return out


@app.post("/vapi/webhook")
def vapi_webhook(payload: dict[str, Any], x_vapi_webhook_secret: str | None = Header(default=None)):
  expected = os.getenv("VAPI_WEBHOOK_SECRET")
  if expected and (not x_vapi_webhook_secret or x_vapi_webhook_secret != expected):
    raise HTTPException(status_code=401, detail="Unauthorized")
  return record_vapi_event(payload=payload)
