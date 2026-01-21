from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from openai import OpenAI

from supabase_client import get_supabase_admin_client, get_supabase_user_client


def _now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def _raise_if_supabase_error(res: Any, context: str) -> None:
  err = getattr(res, "error", None)
  if err:
    raise RuntimeError(f"{context}: {err}")


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

  lesson_refs: list[dict[str, Any]] = []
  if lesson_ids:
    try:
      from lesson_service import get_knowledge_lesson, get_skill_lesson

      for lid in lesson_ids:
        if not lid:
          continue
        lesson = get_skill_lesson(user_access_token=user_access_token, lesson_id=lid)
        lesson_type = "skill"
        if not lesson:
          lesson = get_knowledge_lesson(user_access_token=user_access_token, lesson_id=lid)
          lesson_type = "knowledge"
        if isinstance(lesson, dict) and lesson.get("title"):
          lesson_refs.append(
            {
              "lesson_id": lid,
              "lesson_type": lesson_type,
              "title": lesson.get("title"),
            }
          )
    except Exception:
      lesson_refs = []

  if lesson_refs:
    prompt = {**prompt, "lesson_refs": lesson_refs}

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
    .execute()
  )
  _raise_if_supabase_error(created, "Failed to create drill session")
  if not isinstance(created.data, list) or not created.data or not isinstance(created.data[0], dict) or not created.data[0].get("id"):
    raise RuntimeError("Failed to create drill session: no id returned")
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
    webhook_url = os.getenv("VAPI_WEBHOOK_URL", "")
    if webhook_url and "/vapi/webhook" not in webhook_url:
      webhook_url = webhook_url.rstrip("/") + "/vapi/webhook"
    out["vapi"] = {
      "webhook_url": webhook_url,
      "metadata": {"drill_session_id": drill_session_id},
      "assistant": {
        "system_prompt": (
          "You are a conversation roleplay partner. Stay in character and keep replies short (1-2 sentences). "
          "End with a question to keep momentum.\n\n"
          f"Context: {prompt}"
        )
      },
    }

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

  return out


def record_vapi_event(*, payload: dict[str, Any]) -> dict[str, Any]:
  secret = os.getenv("VAPI_WEBHOOK_SECRET")
  drill_session_id = None

  def _event_key(obj: Any) -> str:
    if not isinstance(obj, dict):
      raw = json.dumps(obj, sort_keys=True, default=str, separators=(",", ":"))
      return "sha1:" + hashlib.sha1(raw.encode("utf-8")).hexdigest()

    event_id = (
      obj.get("id")
      or obj.get("eventId")
      or obj.get("event_id")
      or obj.get("webhookId")
      or obj.get("webhook_id")
    )
    if isinstance(event_id, str) and event_id:
      return "id:" + event_id

    call_id = (
      obj.get("call_id")
      or obj.get("callId")
      or (obj.get("call") or {}).get("id")
      or (obj.get("call") or {}).get("callId")
      or ((obj.get("message") or {}).get("call") or {}).get("id")
    )
    msg_type = (obj.get("message") or {}).get("type")
    ts = (
      obj.get("timestamp")
      or obj.get("createdAt")
      or (obj.get("message") or {}).get("timestamp")
      or (obj.get("message") or {}).get("createdAt")
    )

    if call_id or msg_type or ts:
      return f"sig:{call_id}:{msg_type}:{ts}"

    safe_obj = {k: v for k, v in obj.items() if k != "_event_key"}
    raw = json.dumps(safe_obj, sort_keys=True, default=str, separators=(",", ":"))
    return "sha1:" + hashlib.sha1(raw.encode("utf-8")).hexdigest()

  def _get_in(obj: Any, path: list[str]) -> Any:
    cur: Any = obj
    for key in path:
      if not isinstance(cur, dict):
        return None
      cur = cur.get(key)
    return cur

  def _find_first(obj: Any, keys: set[str]) -> Any:
    if isinstance(obj, dict):
      for k, v in obj.items():
        if k in keys and v is not None:
          return v
        found = _find_first(v, keys)
        if found is not None:
          return found
    elif isinstance(obj, list):
      for item in obj:
        found = _find_first(item, keys)
        if found is not None:
          return found
    return None

  meta = payload.get("metadata") if isinstance(payload, dict) else None
  if isinstance(meta, dict):
    drill_session_id = meta.get("drill_session_id")

  if not drill_session_id:
    for path in (
      ["call", "metadata", "drill_session_id"],
      ["call", "assistantOverrides", "metadata", "drill_session_id"],
      ["message", "metadata", "drill_session_id"],
      ["message", "call", "metadata", "drill_session_id"],
    ):
      val = _get_in(payload, path)
      if isinstance(val, str) and val:
        drill_session_id = val
        break

  if not drill_session_id:
    val = _find_first(payload, {"drill_session_id", "drillSessionId", "drill_sessionId"})
    if isinstance(val, str) and val:
      drill_session_id = val

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

  incoming_key = _event_key(payload)
  existing_keys: set[str] = set()
  for ev in events:
    if isinstance(ev, dict):
      k = ev.get("_event_key")
      if not isinstance(k, str) or not k:
        k = _event_key({kk: vv for kk, vv in ev.items() if kk != "_event_key"})
      if isinstance(k, str) and k:
        existing_keys.add(k)

  if incoming_key in existing_keys:
    _ = secret
    return {"ok": True, "drill_session_id": drill_session_id, "deduped": True}

  stored_payload = dict(payload)
  stored_payload["_event_key"] = incoming_key
  events.append(stored_payload)

  updates: dict[str, Any] = {"events": events, "updated_at": _now_iso()}

  msg_type = _get_in(payload, ["message", "type"])
  status = payload.get("status")
  if isinstance(msg_type, str) and msg_type in {"end-of-call-report", "call-ended", "call-ended-report", "call-end"}:
    updates["status"] = "completed"
  elif status in {"completed", "failed"}:
    updates["status"] = status

  transcript = payload.get("transcript")
  if transcript is None:
    transcript = _get_in(payload, ["message", "transcript"])
  if transcript is None and isinstance(msg_type, str) and msg_type == "end-of-call-report":
    transcript = _get_in(payload, ["message", "analysis", "artifact", "messages"])
  if transcript is not None:
    updates["transcript"] = transcript

  vapi_call_id = (
    payload.get("call_id")
    or payload.get("callId")
    or _get_in(payload, ["call", "id"])
    or _get_in(payload, ["call", "callId"])
    or _get_in(payload, ["message", "call", "id"])
  )
  if vapi_call_id:
    updates["vapi_call_id"] = str(vapi_call_id)

  admin.table("drill_sessions").update(updates).eq("id", drill_session_id).execute()

  _ = secret
  return {"ok": True, "drill_session_id": drill_session_id}


def get_drill_session(*, user_access_token: str, drill_session_id: str) -> dict[str, Any] | None:
  sb = get_supabase_user_client(user_access_token)
  res = (
    sb.table("drill_sessions")
    .select(
      "id,user_id,provider,status,setting,goal,person,time_budget,lesson_ids,prompt,feedback,feedback_provider,feedback_model,feedback_created_at,events,transcript,vapi_call_id,coach_session_id,created_at,updated_at"
    )
    .eq("id", drill_session_id)
    .limit(1)
    .execute()
  )
  return res.data[0] if res.data else None


def list_drill_sessions(
  *,
  user_access_token: str,
  limit: int = 20,
  offset: int = 0,
) -> list[dict[str, Any]]:
  limit = max(1, min(int(limit or 20), 100))
  offset = max(0, int(offset or 0))
  sb = get_supabase_user_client(user_access_token)
  res = (
    sb.table("drill_sessions")
    .select(
      "id,provider,status,setting,goal,person,time_budget,lesson_ids,feedback,created_at,updated_at"
    )
    .order("created_at", desc=True)
    .range(offset, offset + limit - 1)
    .execute()
  )
  return res.data or []


def complete_drill_session(*, user_access_token: str, drill_session_id: str, transcript: Any | None) -> bool:
  sb = get_supabase_user_client(user_access_token)
  updates: dict[str, Any] = {
    "status": "completed",
    "updated_at": _now_iso(),
  }
  # Feedback generation requires either transcript or an end-of-call summary.
  # For text drills, the UI provides transcript explicitly.
  updates["transcript"] = transcript if transcript is not None else []

  res = (
    sb.table("drill_sessions")
    .update(updates)
    .eq("id", drill_session_id)
    .execute()
  )
  _raise_if_supabase_error(res, "Failed to complete drill session")

  # If RLS prevents access or id is unknown, Supabase returns empty data.
  return bool(getattr(res, "data", None))


def _extract_end_of_call_summary(events: Any) -> str | None:
  if not isinstance(events, list):
    return None
  for ev in reversed(events):
    if not isinstance(ev, dict):
      continue
    msg = ev.get("message") if isinstance(ev.get("message"), dict) else None
    msg_type = msg.get("type") if isinstance(msg, dict) else None
    if msg_type not in {"end-of-call-report", "call-ended-report"}:
      continue
    analysis = msg.get("analysis") if isinstance(msg.get("analysis"), dict) else None
    if isinstance(analysis, dict) and isinstance(analysis.get("summary"), str) and analysis.get("summary").strip():
      return str(analysis.get("summary")).strip()
    artifact = analysis.get("artifact") if isinstance(analysis, dict) and isinstance(analysis.get("artifact"), dict) else None
    if isinstance(artifact, dict):
      for k in ("summary", "report"):
        v = artifact.get(k)
        if isinstance(v, str) and v.strip():
          return v.strip()
  return None


def _truncate(s: str, max_chars: int) -> str:
  if len(s) <= max_chars:
    return s
  return s[: max(0, max_chars - 3)] + "..."


def _call_anthropic_feedback(*, system: str, user: str, temperature: float, max_tokens: int) -> tuple[str, str]:
  api_key = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
  if not api_key:
    raise RuntimeError("Missing ANTHROPIC_API_KEY")

  model = os.getenv("DRILL_FEEDBACK_ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
  payload = {
    "model": model,
    "max_tokens": max_tokens,
    "temperature": temperature,
    "system": system,
    "messages": [{"role": "user", "content": user}],
  }

  with httpx.Client(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
    resp = client.post(
      "https://api.anthropic.com/v1/messages",
      headers={
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      json=payload,
    )

  if resp.status_code >= 400:
    raise RuntimeError(f"anthropic_http_{resp.status_code}: {resp.text[:500]}")

  data = resp.json()
  blocks = data.get("content")
  if not isinstance(blocks, list) or not blocks:
    raise RuntimeError("anthropic_empty_content")

  parts: list[str] = []
  for b in blocks:
    if isinstance(b, dict) and b.get("type") == "text" and isinstance(b.get("text"), str):
      parts.append(b.get("text"))

  out = "\n".join([p.strip() for p in parts if p and p.strip()]).strip()
  if not out:
    raise RuntimeError("anthropic_empty_text")
  return out, model


def _call_openai_feedback(*, system: str, user: str, temperature: float) -> tuple[str, str]:
  api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
  if not api_key:
    raise RuntimeError("Missing OPENAI_API_KEY")
  model = os.getenv("DRILL_FEEDBACK_OPENAI_MODEL", "gpt-4o-mini")
  client = OpenAI(api_key=api_key)
  resp = client.chat.completions.create(
    model=model,
    temperature=temperature,
    messages=[
      {"role": "system", "content": system},
      {"role": "user", "content": user},
    ],
  )
  text = (resp.choices[0].message.content or "").strip()
  if not text:
    raise RuntimeError("openai_empty_text")
  return text, model


def _generate_feedback_text(*, row: dict[str, Any], user_access_token: str) -> tuple[str, str, str]:
  prompt = row.get("prompt") if isinstance(row.get("prompt"), dict) else {}
  setting = row.get("setting") or prompt.get("setting") or ""
  goal = row.get("goal") or prompt.get("goal") or ""
  person = row.get("person") or prompt.get("person") or ""
  objective = prompt.get("objective") or ""
  constraints = prompt.get("constraints")
  lesson_refs = prompt.get("lesson_refs") if isinstance(prompt.get("lesson_refs"), list) else []
  lesson_ids: list[str] = []
  for lr in lesson_refs:
    if isinstance(lr, dict) and isinstance(lr.get("lesson_id"), str) and lr.get("lesson_id"):
      lesson_ids.append(lr.get("lesson_id"))
  if not lesson_ids and isinstance(row.get("lesson_ids"), list):
    lesson_ids = [str(x) for x in row.get("lesson_ids") if isinstance(x, str) and x]

  lesson_context: list[dict[str, Any]] = []
  if lesson_ids:
    try:
      from lesson_service import get_knowledge_lesson, get_skill_lesson

      for lid in lesson_ids[:5]:
        lesson_type = "skill"
        lesson = get_skill_lesson(user_access_token=user_access_token, lesson_id=lid)
        if not lesson:
          lesson = get_knowledge_lesson(user_access_token=user_access_token, lesson_id=lid)
          lesson_type = "knowledge"
        if isinstance(lesson, dict):
          title = lesson.get("title")
          content = lesson.get("content")
          content_excerpt = ""
          if content is not None:
            content_excerpt = _truncate(
              json.dumps(content, ensure_ascii=False, default=str),
              1800,
            )
          lesson_context.append(
            {
              "lesson_id": lid,
              "lesson_type": lesson_type,
              "title": title,
              "content_excerpt": content_excerpt,
            }
          )
    except Exception:
      lesson_context = []

  transcript = row.get("transcript")
  transcript_text = _truncate(json.dumps(transcript, ensure_ascii=False, default=str), 6000) if transcript is not None else ""
  end_summary = _extract_end_of_call_summary(row.get("events"))

  system = (
    "You are a communication coach. Provide concise feedback comments for a user after a roleplay conversation. "
    "Do not mention policies or internal reasoning."
  )

  user = {
    "setting": setting,
    "goal": goal,
    "person": person,
    "objective": objective,
    "constraints": constraints,
    "lessons": lesson_context,
    "end_of_call_summary": end_summary,
    "transcript": transcript_text,
    "required_format": [
      "What you did well: (2-4 bullets)",
      "What to improve: (2-4 bullets)",
      "Next time: (1-2 bullets)",
    ],
    "tone": "direct, supportive, specific",
    "length": "max 120 words",
  }

  user_str = json.dumps(user, ensure_ascii=False)

  temperature = float(os.getenv("DRILL_FEEDBACK_TEMPERATURE", "0.4") or 0.4)
  max_tokens = int(os.getenv("DRILL_FEEDBACK_MAX_TOKENS", "220") or 220)

  try:
    text, model = _call_anthropic_feedback(
      system=system,
      user=user_str,
      temperature=temperature,
      max_tokens=max_tokens,
    )
    return text, "anthropic", model
  except Exception:
    text, model = _call_openai_feedback(system=system, user=user_str, temperature=temperature)
    return text, "openai", model


def get_drill_session_with_feedback(*, user_access_token: str, drill_session_id: str) -> dict[str, Any] | None:
  row = get_drill_session(user_access_token=user_access_token, drill_session_id=drill_session_id)
  if not row or not isinstance(row, dict):
    return row

  status = str(row.get("status") or "").lower()
  if status not in {"completed", "failed"}:
    return row

  cached_col = row.get("feedback")
  if isinstance(cached_col, str) and cached_col.strip():
    row["feedback"] = cached_col.strip()
    return row

  prompt = row.get("prompt") if isinstance(row.get("prompt"), dict) else {}
  cached_prompt = prompt.get("feedback") if isinstance(prompt, dict) else None
  if isinstance(cached_prompt, str) and cached_prompt.strip():
    row["feedback"] = cached_prompt.strip()
    return row

  if row.get("transcript") is None and not _extract_end_of_call_summary(row.get("events")):
    return row

  feedback = None
  provider = "fallback"
  model = "fallback"
  created_at = _now_iso()
  try:
    feedback, provider, model = _generate_feedback_text(row=row, user_access_token=user_access_token)
  except Exception:
    feedback = "What you did well:\n- You stayed engaged.\n\nWhat to improve:\n- Ask one open-ended question and one follow-up.\n\nNext time:\n- Share one short personal detail to build rapport."

  row["feedback"] = feedback

  try:
    admin = get_supabase_admin_client()
    updates: dict[str, Any] = {
      "feedback": feedback,
      "feedback_provider": provider,
      "feedback_model": model,
      "feedback_created_at": created_at,
      "updated_at": _now_iso(),
    }
    # Keep prompt cache for backward compatibility/debug.
    if isinstance(prompt, dict):
      updates["prompt"] = {**prompt, "feedback": feedback}
    admin.table("drill_sessions").update(updates).eq("id", drill_session_id).execute()
  except Exception:
    pass

  return row
