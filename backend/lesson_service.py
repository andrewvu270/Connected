from __future__ import annotations

from typing import Any

from supabase_client import get_supabase_user_client


def list_skill_lessons(
  *,
  user_access_token: str,
  phase: str | None,
  domain: str | None,
  difficulty: str | None,
  tier: int | None,
  q: str | None,
  limit: int,
  offset: int,
) -> list[dict[str, Any]]:
  limit = max(1, min(int(limit or 20), 100))
  offset = max(0, int(offset or 0))

  supabase = get_supabase_user_client(user_access_token)
  query = supabase.table("lessons").select(
    "lesson_id,title,phase,domain,tier,difficulty,read_time_minutes,quality_score,actionability_score,tags"
  )

  if phase:
    query = query.eq("phase", phase)
  if domain:
    query = query.eq("domain", domain)
  if difficulty:
    query = query.eq("difficulty", difficulty)
  if tier is not None:
    query = query.eq("tier", int(tier))
  if q:
    query = query.ilike("title", f"%{q}%")

  query = query.order("actionability_score", desc=True).order("quality_score", desc=True)

  res = query.range(offset, offset + limit - 1).execute()
  return res.data or []


def get_skill_lesson(*, user_access_token: str, lesson_id: str) -> dict[str, Any] | None:
  supabase = get_supabase_user_client(user_access_token)
  res = (
    supabase.table("lessons")
    .select(
      "lesson_id,title,phase,domain,tier,difficulty,read_time_minutes,quality_score,actionability_score,tags,content"
    )
    .eq("lesson_id", lesson_id)
    .limit(1)
    .execute()
  )
  return res.data[0] if res.data else None


def list_knowledge_lessons(
  *,
  user_access_token: str,
  category: str | None,
  difficulty: str | None,
  q: str | None,
  limit: int,
  offset: int,
) -> list[dict[str, Any]]:
  limit = max(1, min(int(limit or 20), 100))
  offset = max(0, int(offset or 0))

  supabase = get_supabase_user_client(user_access_token)
  query = supabase.table("knowledge_lessons").select(
    "lesson_id,title,category,difficulty,read_time_minutes,quality_score,actionability_score,tags"
  )

  if category:
    query = query.eq("category", category)
  if difficulty:
    query = query.eq("difficulty", difficulty)
  if q:
    query = query.ilike("title", f"%{q}%")

  query = query.order("quality_score", desc=True).order("actionability_score", desc=True)

  res = query.range(offset, offset + limit - 1).execute()
  return res.data or []


def get_knowledge_lesson(*, user_access_token: str, lesson_id: str) -> dict[str, Any] | None:
  supabase = get_supabase_user_client(user_access_token)
  res = (
    supabase.table("knowledge_lessons")
    .select(
      "lesson_id,title,category,difficulty,read_time_minutes,quality_score,actionability_score,tags,content"
    )
    .eq("lesson_id", lesson_id)
    .limit(1)
    .execute()
  )
  return res.data[0] if res.data else None
