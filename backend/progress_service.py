from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from supabase_client import get_supabase_user_client


def _now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def upsert_lesson_progress(
  *,
  user_id: str,
  user_access_token: str,
  lesson_type: str,
  lesson_id: str,
  status: str,
) -> dict[str, Any]:
  lt = (lesson_type or "").strip().lower()
  if lt not in {"skill", "knowledge"}:
    lt = "skill"

  st = (status or "").strip().lower()
  if st not in {"started", "completed"}:
    st = "started"

  supabase = get_supabase_user_client(user_access_token)

  existing = (
    supabase.table("user_lesson_progress")
    .select("user_id,lesson_type,lesson_id,status,started_at,completed_at")
    .eq("user_id", user_id)
    .eq("lesson_type", lt)
    .eq("lesson_id", lesson_id)
    .limit(1)
    .execute()
  )
  row0 = existing.data[0] if existing.data else None

  started_at = (row0 or {}).get("started_at") if isinstance(row0, dict) else None
  completed_at = (row0 or {}).get("completed_at") if isinstance(row0, dict) else None

  now = _now_iso()
  if st == "started" and not started_at:
    started_at = now
  if st == "completed":
    if not started_at:
      started_at = now
    completed_at = now

  payload: dict[str, Any] = {
    "user_id": user_id,
    "lesson_type": lt,
    "lesson_id": lesson_id,
    "status": st,
    "started_at": started_at,
    "completed_at": completed_at,
    "updated_at": now,
  }

  res = supabase.table("user_lesson_progress").upsert(
    payload,
    on_conflict="user_id,lesson_type,lesson_id",
    returning="representation",
  ).execute()

  if isinstance(res.data, list) and res.data:
    row0 = res.data[0]
    if isinstance(row0, dict):
      return row0

  # Fallback: fetch the row back (covers cases where representation isn't returned).
  reread = (
    supabase.table("user_lesson_progress")
    .select("user_id,lesson_type,lesson_id,status,started_at,completed_at,created_at,updated_at")
    .eq("user_id", user_id)
    .eq("lesson_type", lt)
    .eq("lesson_id", lesson_id)
    .limit(1)
    .execute()
  )
  if isinstance(reread.data, list) and reread.data and isinstance(reread.data[0], dict):
    return reread.data[0]

  raise RuntimeError("Failed to upsert lesson progress")


def list_lesson_progress(
  *,
  user_id: str,
  user_access_token: str,
  lesson_type: str | None,
  status: str | None,
  limit: int,
  offset: int,
) -> list[dict[str, Any]]:
  limit = max(1, min(int(limit or 50), 200))
  offset = max(0, int(offset or 0))

  supabase = get_supabase_user_client(user_access_token)
  q = (
    supabase.table("user_lesson_progress")
    .select("user_id,lesson_type,lesson_id,status,started_at,completed_at,created_at,updated_at")
    .eq("user_id", user_id)
    .order("updated_at", desc=True)
  )

  if lesson_type:
    lt = (lesson_type or "").strip().lower()
    if lt in {"skill", "knowledge"}:
      q = q.eq("lesson_type", lt)

  if status:
    st = (status or "").strip().lower()
    if st in {"started", "completed"}:
      q = q.eq("status", st)

  res = q.range(offset, offset + limit - 1).execute()
  return res.data or []


def progress_summary(*, user_id: str, user_access_token: str) -> dict[str, Any]:
  supabase = get_supabase_user_client(user_access_token)

  lp = (
    supabase.table("user_lesson_progress")
    .select("lesson_type,status")
    .eq("user_id", user_id)
    .execute()
  ).data or []

  drills = (
    supabase.table("drill_sessions")
    .select("status,provider")
    .eq("user_id", user_id)
    .execute()
  ).data or []

  out = {
    "lessons": {
      "started": 0,
      "completed": 0,
      "skills_completed": 0,
      "knowledge_completed": 0,
    },
    "drills": {
      "started": 0,
      "completed": 0,
      "by_provider": {"vapi": 0, "text": 0},
    },
  }

  for r in lp:
    if not isinstance(r, dict):
      continue
    st = r.get("status")
    lt = r.get("lesson_type")
    if st == "started":
      out["lessons"]["started"] += 1
    if st == "completed":
      out["lessons"]["completed"] += 1
      if lt == "skill":
        out["lessons"]["skills_completed"] += 1
      if lt == "knowledge":
        out["lessons"]["knowledge_completed"] += 1

  for r in drills:
    if not isinstance(r, dict):
      continue
    st = r.get("status")
    provider = (r.get("provider") or "").strip().lower()
    if st == "started":
      out["drills"]["started"] += 1
    if st == "completed":
      out["drills"]["completed"] += 1
    if provider in {"vapi", "text"}:
      out["drills"]["by_provider"][provider] += 1

  return out
