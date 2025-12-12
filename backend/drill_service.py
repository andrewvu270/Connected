from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from supabase_client import get_supabase_admin_client, get_supabase_user_client


def _now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def _build_drill_prompt(*, setting: str, goal: str, person: str, time_budget: str, constraints: str | None, lesson_ids: list[str]) -> dict[str, Any]:
  s = (setting or "").strip().lower()
  g = (goal or "").strip().lower()

  persona = "a friendly peer"
  if s in {"work_meeting", "meeting", "work"}:
    persona = "a colleague in a meeting"
  elif s in {"interview"}:
    persona = "an interviewer"
  elif s in {"networking", "event"}:
    persona = "a new connection at a networking event"
  elif s in {"date", "dating"}:
    persona = "a date"

  objective = "Have a short, natural conversation"
  if g in {"avoid_silence", "awkward_silence", "flow"}:
    objective = "Keep the conversation flowing without awkward silences"
  elif g in {"build_connection", "connect", "rapport"}:
    objective = "Build rapport and find common ground"
  elif g in {"sound_confident", "confidence", "presence"}:
    objective = "Sound confident and grounded"
  elif g in {"persuade", "pitch", "influence"}:
    objective = "Communicate clearly and persuade respectfully"
  elif g in {"handle_tension", "conflict", "repair"}:
    objective = "Lower tension and repair the conversation"

  rubric = [
    "Asked at least 2 open-ended questions",
    "Used at least 1 follow-up question based on what they said",
    "Shared 1 short relevant detail to build connection",
  ]

  if constraints:
    rubric.append("Stayed within your stated constraint")

  return {
    "version": "drill-v1",
    "setting": setting,
    "goal": goal,
    "person": person,
    "time_budget": time_budget,
    "persona": persona,
    "objective": objective,
    "constraints": constraints,
    "lesson_ids": lesson_ids,
    "rubric": rubric,
    "opener": "Hey — nice to meet you. What’s been keeping you busy lately?",
  }


def start_drill(
  *,
  user_id: str,
  user_access_token: str,
  provider: str,
  setting: str,
  goal: str,
  person: str,
  time_budget: str,
  constraints: str | None,
  lesson_ids: list[str],
) -> dict[str, Any]:
  provider = (provider or "").strip().lower()
  if provider not in {"vapi", "text"}:
    provider = "vapi"

  prompt = _build_drill_prompt(
    setting=setting,
    goal=goal,
    person=person,
    time_budget=time_budget,
    constraints=constraints,
    lesson_ids=lesson_ids,
  )

  user_sb = get_supabase_user_client(user_access_token)
  created = (
    user_sb.table("drill_sessions")
    .insert(
      {
        "user_id": user_id,
        "provider": provider,
        "status": "started",
        "setting": setting,
        "goal": goal,
        "person": person or "",
        "time_budget": time_budget or "5min",
        "lesson_ids": lesson_ids or [],
        "prompt": prompt,
        "events": [],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
      }
    )
    .select("id")
    .execute()
  )
  drill_session_id = created.data[0]["id"]

  out: dict[str, Any] = {
    "drill_session_id": drill_session_id,
    "provider": provider,
    "prompt": prompt,
  }

  if provider == "text":
    from coach_service import start_session

    session_state = {"drill_prompt": prompt, "drill_session_id": drill_session_id}
    coach_session_id = start_session(
      user_id=user_id,
      user_access_token=user_access_token,
      lesson_id=(lesson_ids[0] if lesson_ids else None),
      mode="roleplay",
      initial_state=session_state,
      initial_coach_message=str(prompt.get("opener") or "Hey — nice to meet you."),
    )

    admin = get_supabase_admin_client()
    admin.table("drill_sessions").update(
      {"coach_session_id": coach_session_id, "updated_at": _now_iso()}
    ).eq("id", drill_session_id).execute()

    out["coach_session_id"] = coach_session_id

  if provider == "vapi":
    out["vapi"] = {
      "webhook_url": os.getenv("VAPI_WEBHOOK_URL", ""),
      "metadata": {"drill_session_id": drill_session_id},
      "assistant": {
        "system_prompt": (
          "You are a conversation roleplay partner. Stay in character and keep replies short (1-2 sentences). "
          "End with a question to keep momentum.\n\n"
          f"Context: {prompt}"
        )
      },
    }

  return out


def record_vapi_event(*, payload: dict[str, Any]) -> dict[str, Any]:
  secret = os.getenv("VAPI_WEBHOOK_SECRET")
  drill_session_id = None

  meta = payload.get("metadata") if isinstance(payload, dict) else None
  if isinstance(meta, dict):
    drill_session_id = meta.get("drill_session_id")

  if not drill_session_id:
    return {"ok": False, "error": "Missing metadata.drill_session_id"}

  admin = get_supabase_admin_client()
  res = admin.table("drill_sessions").select("id,events").eq("id", drill_session_id).limit(1).execute()
  if not res.data:
    return {"ok": False, "error": "Unknown drill_session_id"}

  row = res.data[0]
  events = row.get("events") if isinstance(row, dict) else None
  if not isinstance(events, list):
    events = []

  events.append(payload)

  updates: dict[str, Any] = {"events": events, "updated_at": _now_iso()}

  status = payload.get("status")
  if status in {"completed", "failed"}:
    updates["status"] = status

  transcript = payload.get("transcript")
  if transcript is not None:
    updates["transcript"] = transcript

  vapi_call_id = payload.get("call_id") or payload.get("callId")
  if vapi_call_id:
    updates["vapi_call_id"] = str(vapi_call_id)

  admin.table("drill_sessions").update(updates).eq("id", drill_session_id).execute()

  _ = secret
  return {"ok": True, "drill_session_id": drill_session_id}
