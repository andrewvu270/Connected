from __future__ import annotations

from typing import Any

from supabase_client import get_supabase_user_client


def _phase_rank(phase: str | None) -> int:
  if not phase:
    return 10_000
  p = str(phase)
  for i in range(1, 10):
    if f"Phase {i}" in p:
      return i
  return 10_000


def _dedupe_by_id(rows: list[dict[str, Any]], key: str, limit: int) -> list[dict[str, Any]]:
  out: list[dict[str, Any]] = []
  seen: set[str] = set()
  for r in rows:
    v = r.get(key)
    if not v:
      continue
    s = str(v)
    if s in seen:
      continue
    seen.add(s)
    out.append(r)
    if len(out) >= limit:
      break
  return out


def _completed_ids(*, supabase, user_id: str, lesson_type: str) -> set[str]:
  res = (
    supabase.table("user_lesson_progress")
    .select("lesson_id")
    .eq("user_id", user_id)
    .eq("lesson_type", lesson_type)
    .eq("status", "completed")
    .execute()
  )
  rows = res.data or []
  return {str(r.get("lesson_id")) for r in rows if isinstance(r, dict) and r.get("lesson_id")}


def _phase_progress(*, supabase, user_id: str) -> tuple[list[dict[str, Any]], str | None]:
  all_lessons = supabase.table("lessons").select("lesson_id,phase").execute().data or []
  completed = _completed_ids(supabase=supabase, user_id=user_id, lesson_type="skill")

  phase_to_total: dict[str, int] = {}
  phase_to_completed: dict[str, int] = {}

  for r in all_lessons:
    if not isinstance(r, dict):
      continue
    lid = r.get("lesson_id")
    ph = r.get("phase")
    if not lid or not ph:
      continue
    phase_to_total[str(ph)] = phase_to_total.get(str(ph), 0) + 1
    if str(lid) in completed:
      phase_to_completed[str(ph)] = phase_to_completed.get(str(ph), 0) + 1

  phases = sorted(phase_to_total.keys(), key=_phase_rank)
  progress_rows: list[dict[str, Any]] = []
  suggested_phase: str | None = None

  for ph in phases:
    total = phase_to_total.get(ph, 0)
    comp = phase_to_completed.get(ph, 0)
    progress_rows.append({"phase": ph, "completed": comp, "total": total})
    if suggested_phase is None and comp < total:
      suggested_phase = ph

  if suggested_phase is None and phases:
    suggested_phase = phases[-1]

  return progress_rows, suggested_phase


def recommend_learning_path(
  *,
  user_id: str,
  user_access_token: str,
  skills_limit: int = 5,
  knowledge_limit: int = 2,
) -> dict[str, Any]:
  skills_limit = max(0, min(int(skills_limit or 0), 10))
  knowledge_limit = max(0, min(int(knowledge_limit or 0), 10))

  supabase = get_supabase_user_client(user_access_token)

  phase_progress, suggested_phase = _phase_progress(supabase=supabase, user_id=user_id)

  completed_skills = _completed_ids(supabase=supabase, user_id=user_id, lesson_type="skill")
  completed_knowledge = _completed_ids(supabase=supabase, user_id=user_id, lesson_type="knowledge")

  skills_rows: list[dict[str, Any]] = []
  if skills_limit > 0:
    # Prefer suggested phase but do not gate.
    if suggested_phase:
      res = (
        supabase.table("lessons")
        .select("lesson_id,title,phase,domain,tier,difficulty,read_time_minutes,quality_score,actionability_score,tags")
        .eq("phase", suggested_phase)
        .order("actionability_score", desc=True)
        .order("quality_score", desc=True)
        .limit(max(skills_limit * 3, 15))
        .execute()
      )
      cand = [r for r in (res.data or []) if isinstance(r, dict) and str(r.get("lesson_id")) not in completed_skills]
      skills_rows.extend(_dedupe_by_id(cand, "lesson_id", skills_limit))

    remaining = skills_limit - len(skills_rows)
    if remaining > 0:
      res2 = (
        supabase.table("lessons")
        .select("lesson_id,title,phase,domain,tier,difficulty,read_time_minutes,quality_score,actionability_score,tags")
        .order("actionability_score", desc=True)
        .order("quality_score", desc=True)
        .limit(max(remaining * 5, 25))
        .execute()
      )
      cand2 = [r for r in (res2.data or []) if isinstance(r, dict) and str(r.get("lesson_id")) not in completed_skills]
      skills_rows.extend(_dedupe_by_id(cand2, "lesson_id", skills_limit))

  knowledge_rows: list[dict[str, Any]] = []
  if knowledge_limit > 0:
    resk = (
      supabase.table("knowledge_lessons")
      .select("lesson_id,title,category,difficulty,read_time_minutes,quality_score,actionability_score,tags")
      .order("quality_score", desc=True)
      .order("actionability_score", desc=True)
      .limit(max(knowledge_limit * 5, 10))
      .execute()
    )
    candk = [r for r in (resk.data or []) if isinstance(r, dict) and str(r.get("lesson_id")) not in completed_knowledge]
    knowledge_rows = _dedupe_by_id(candk, "lesson_id", knowledge_limit)

  return {
    "suggested_phase": suggested_phase,
    "phase_progress": phase_progress,
    "recommendations": {
      "skills": skills_rows[:skills_limit],
      "knowledge": knowledge_rows[:knowledge_limit],
    },
  }
