from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

from openai import OpenAI

from supabase_client import get_supabase_admin_client, get_supabase_user_client


def _now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def _select_session(user_access_token: str, session_id: str) -> dict[str, Any] | None:
  supabase = get_supabase_user_client(user_access_token)
  res = (
    supabase.table("coach_sessions")
    .select("id,user_id,lesson_id,mode,status,state")
    .eq("id", session_id)
    .limit(1)
    .execute()
  )
  return res.data[0] if res.data else None


def _select_recent_messages(user_access_token: str, session_id: str, limit: int = 12) -> list[dict[str, Any]]:
  supabase = get_supabase_user_client(user_access_token)
  res = (
    supabase.table("coach_messages")
    .select("role,content,created_at")
    .eq("session_id", session_id)
    .order("created_at", desc=True)
    .limit(limit)
    .execute()
  )
  msgs = res.data or []
  return list(reversed(msgs))


def start_session(user_id: str, user_access_token: str, lesson_id: str | None, mode: str) -> str:
  if mode not in {"coach", "roleplay"}:
    mode = "coach"

  user_supabase = get_supabase_user_client(user_access_token)
  res = (
    user_supabase.table("coach_sessions")
    .insert(
      {
        "user_id": user_id,
        "lesson_id": lesson_id,
        "mode": mode,
        "status": "active",
        "state": {},
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
      }
    )
    .select("id")
    .execute()
  )
  session_id = res.data[0]["id"]

  admin = get_supabase_admin_client()

  admin.table("coach_messages").insert(
    {
      "session_id": session_id,
      "role": "system",
      "content": "Session started",
      "created_at": _now_iso(),
    }
  ).execute()

  admin.table("coach_messages").insert(
    {
      "session_id": session_id,
      "role": "coach",
      "content": "Let’s practice. What situation are you preparing for today?",
      "created_at": _now_iso(),
    }
  ).execute()

  return session_id


def _generate_coach_reply(*, mode: str, lesson_id: str | None, user_text: str, history: list[dict[str, Any]]) -> tuple[str, dict[str, Any] | None, str | None, str]:
  api_key = os.getenv("OPENAI_API_KEY")
  if not api_key:
    # Fallback: deterministic coach prompt
    return (
      "Got it. Try this next: ask one curious follow-up question (e.g., 'What got you into that?').",
      {"ok": True, "mode": "fallback"},
      None,
      "coach-v0-fallback",
    )

  model = os.getenv("COACH_LLM_MODEL", "gpt-4o-mini")
  client = OpenAI(api_key=api_key)

  system = (
    "You are a friendly social skills coach mascot for young professionals. "
    "Be concise (1-3 short sentences). "
    "Always give one actionable tip and one next prompt/question. "
    "Avoid therapy/medical framing."
  )

  context = {
    "mode": mode,
    "lesson_id": lesson_id,
    "history": history[-8:],
    "user": user_text,
    "required_json": {
      "reply": "string (1-3 short sentences)",
      "tip": "string (1 sentence)",
      "next_prompt": "string (a question or prompt)",
      "confidence": "number 0-1"
    },
  }

  try:
    resp = client.chat.completions.create(
      model=model,
      temperature=0.4,
      messages=[
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(context)},
      ],
    )
    content = (resp.choices[0].message.content or "").strip()
    parsed = json.loads(content)
    reply = parsed.get("reply") if isinstance(parsed, dict) else None
    if not reply:
      raise ValueError("Missing reply")

    qa = {"ok": True, "mode": "llm", "tip": parsed.get("tip"), "next_prompt": parsed.get("next_prompt"), "confidence": parsed.get("confidence")}
    return reply, qa, model, "coach-v1-llm"
  except Exception as e:
    return (
      "I hear you. Small move: ask a follow-up that starts with 'What' or 'How'. What would you ask next?",
      {"ok": False, "mode": "llm", "error": str(e)},
      model,
      "coach-v1-llm-fallback",
    )


def send_message(user_id: str, user_access_token: str, session_id: str, content: str) -> tuple[dict[str, Any], dict[str, Any]]:
  user_supabase = get_supabase_user_client(user_access_token)
  admin = get_supabase_admin_client()

  session = _select_session(user_access_token, session_id)
  if not session or session.get("user_id") != user_id:
    raise PermissionError("Session not found")

  if session.get("status") != "active":
    raise PermissionError("Session not active")

  user_msg = (
    user_supabase.table("coach_messages")
    .insert(
      {
        "session_id": session_id,
        "role": "user",
        "content": content,
        "created_at": _now_iso(),
      }
    )
    .select("id,role,content,created_at")
    .execute()
  ).data[0]

  history = _select_recent_messages(user_access_token, session_id, limit=12)
  reply_text, qa, model_used, prompt_version = _generate_coach_reply(
    mode=session.get("mode") or "coach",
    lesson_id=session.get("lesson_id"),
    user_text=content,
    history=history,
  )

  coach_msg = (
    admin.table("coach_messages")
    .insert(
      {
        "session_id": session_id,
        "role": "coach",
        "content": reply_text,
        "meta": {
          "qa": qa,
          "model": model_used,
          "prompt_version": prompt_version,
        },
        "created_at": _now_iso(),
      }
    )
    .select("id,role,content,meta,created_at")
    .execute()
  ).data[0]

  admin.table("coach_sessions").update({"updated_at": _now_iso()}).eq("id", session_id).execute()

  return user_msg, coach_msg
