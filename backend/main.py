import logging
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from langgraph_news import build_news_job_graph
from langgraph_brief import build_brief_job_graph
from supabase_client import get_supabase_admin_client
from api_models import DrillStartRequest, DrillStartResponse, MascotAdviseRequest, NewsSourceIn, SeedNewsSourcesRequest
from auth import get_current_user
from coach_models import SendMessageRequest, SendMessageResponse, StartSessionRequest, StartSessionResponse
from coach_service import send_message, start_session
from brief_pipeline import run_daily_brief
from mascot_service import advise as mascot_advise
from drill_service import record_vapi_event, start_drill

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("connected")

app = FastAPI(title="Connected AI Service")

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    os.getenv("WEB_ORIGIN", "http://localhost:3000"),
  ],
  allow_credentials=True,
  allow_methods=["*"] ,
  allow_headers=["*"] ,
)

news_job = build_news_job_graph()
brief_job = build_brief_job_graph()


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
def run_news_job():
  logger.info("news_job_start")
  out = news_job.invoke({})
  logger.info("news_job_done", extra={"result": out.get("result") if isinstance(out, dict) else None})
  return out


@app.post("/jobs/brief/run")
def run_brief_job(audience: str = "global"):
  logger.info("brief_job_start", extra={"audience": audience})
  out = brief_job.invoke({"audience": audience})
  logger.info("brief_job_done", extra={"result": out.get("result") if isinstance(out, dict) else None})
  return out


@app.post("/jobs/brief/run_global")
def run_brief_global():
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


@app.post("/coach/sessions/start", response_model=StartSessionResponse)
def coach_start_session(payload: StartSessionRequest, authorization: str | None = Header(default=None)):
  user = get_current_user(authorization)
  session_id = start_session(
    user_id=user.id,
    user_access_token=user.access_token,
    lesson_id=payload.lesson_id,
    mode=payload.mode,
  )
  return StartSessionResponse(session_id=session_id)


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
