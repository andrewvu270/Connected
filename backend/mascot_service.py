from __future__ import annotations

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Any

from supabase_client import get_supabase_admin_client


def _utc_today_date() -> str:
  tz_name = (os.getenv("APP_TIMEZONE") or "America/New_York").strip() or "America/New_York"
  tz = ZoneInfo(tz_name)
  return datetime.now(tz).date().isoformat()


def _dedupe_by_lesson_id(rows: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
  out: list[dict[str, Any]] = []
  seen: set[str] = set()
  for r in rows:
    lid = r.get("lesson_id")
    if lid and lid in seen:
      continue
    if lid:
      seen.add(lid)
    out.append(r)
    if len(out) >= limit:
      break
  return out


def _goal_to_subdomains(goal: str) -> list[str]:
  g = (goal or "").strip().lower()
  if g in {"avoid_silence", "awkward_silence", "flow"}:
    return ["Question Mastery", "Flow Management", "Active Listening"]
  if g in {"build_connection", "connect", "rapport"}:
    return ["Emotional Intelligence", "Networking & Relationship Building", "Cultural Knowledge"]
  if g in {"sound_confident", "confidence", "presence"}:
    return ["Flow Management", "Question Mastery", "Social Dynamics"]
  if g in {"persuade", "pitch", "influence"}:
    return ["Persuasion & Influence", "Social Dynamics", "Question Mastery"]
  if g in {"handle_tension", "conflict", "repair"}:
    return ["Conflict Resolution", "Emotional Intelligence", "Active Listening"]
  if g in {"make_impression", "charisma", "memorable"}:
    return ["Being Interesting", "Storytelling", "Cultural Knowledge"]
  return [
    "Question Mastery",
    "Flow Management",
    "Active Listening",
    "Emotional Intelligence",
    "Networking & Relationship Building",
  ]


def _setting_to_subdomains(setting: str) -> list[str]:
  s = (setting or "").strip().lower()
  if s in {"work_meeting", "meeting", "work", "interview"}:
    return ["Flow Management", "Question Mastery", "Persuasion & Influence"]
  if s in {"networking", "event"}:
    return ["Networking & Relationship Building", "Question Mastery", "Being Interesting"]
  if s in {"1on1", "one_on_one"}:
    return ["Active Listening", "Emotional Intelligence", "Question Mastery"]
  if s in {"group", "group_hang"}:
    return ["Flow Management", "Social Dynamics", "Being Interesting"]
  if s in {"date", "dating"}:
    return ["Emotional Intelligence", "Being Interesting", "Question Mastery"]
  if s in {"texting"}:
    return ["Flow Management", "Question Mastery", "Emotional Intelligence"]
  return []


def _setting_to_knowledge_categories(setting: str) -> list[str]:
  s = (setting or "").strip().lower()
  if s in {"work_meeting", "meeting", "work", "interview"}:
    return ["Economics", "Finance", "Technology", "Society", "Global Issues & World Affairs"]
  if s in {"networking", "event"}:
    return ["Technology", "Economics", "Culture", "Society", "Finance"]
  if s in {"group", "group_hang"}:
    return ["Culture", "Society", "Sports", "Pop Culture / Media"]
  if s in {"date", "dating"}:
    return ["Culture", "Society", "Pop Culture / Media", "Fitness / Health"]
  if s in {"texting"}:
    return ["Culture", "Society", "Pop Culture / Media"]
  if s in {"1on1", "one_on_one"}:
    return ["Society", "Culture", "Economics"]
  return ["Technology", "Economics", "Culture", "Society"]


def _normalize_topic(s: str) -> str:
  return (s or "").strip().lower().replace("&", "and")


def _setting_to_brief_keywords(setting: str) -> list[str]:
  s = (setting or "").strip().lower()
  if s in {"work_meeting", "meeting", "work", "interview"}:
    return ["econom", "finance", "tech", "societ", "world", "global"]
  if s in {"networking", "event"}:
    return ["tech", "econom", "culture", "societ", "finance"]
  if s in {"group", "group_hang"}:
    return ["culture", "pop", "media", "sports", "societ"]
  if s in {"date", "dating"}:
    return ["culture", "pop", "media", "societ", "health", "fitness"]
  if s in {"texting"}:
    return ["culture", "pop", "media", "societ"]
  if s in {"1on1", "one_on_one"}:
    return ["societ", "culture", "econom"]
  return ["tech", "econom", "culture"]


def _select_skills_lessons(*, subdomains: list[str], limit: int, topic_text: str | None) -> list[dict[str, Any]]:
  if limit <= 0:
    return []
  supabase = get_supabase_admin_client()
  q = (
    supabase.table("lessons")
    .select("lesson_id,title,phase,domain,tier,difficulty,read_time_minutes,quality_score,actionability_score,tags")
    .in_("domain", subdomains)
    .order("actionability_score", desc=True)
    .order("quality_score", desc=True)
    .limit(max(limit * 2, 10))
  )
  if topic_text:
    q = q.ilike("title", f"%{topic_text}%")
  res = q.execute()
  rows = res.data or []
  rows = _dedupe_by_lesson_id(rows, limit)
  return rows


def _select_knowledge_lessons(*, categories: list[str], limit: int, topic_text: str | None) -> list[dict[str, Any]]:
  if limit <= 0:
    return []
  supabase = get_supabase_admin_client()
  q = (
    supabase.table("knowledge_lessons")
    .select("lesson_id,title,category,difficulty,read_time_minutes,quality_score,actionability_score,tags")
    .in_("category", categories)
    .order("quality_score", desc=True)
    .limit(max(limit * 2, 10))
  )
  if topic_text:
    q = q.ilike("title", f"%{topic_text}%")
  res = q.execute()
  rows = res.data or []
  rows = _dedupe_by_lesson_id(rows, limit)
  return rows


def _select_today_global_brief() -> dict[str, Any] | None:
  supabase = get_supabase_admin_client()
  today = _utc_today_date()
  res = (
    supabase.table("news_daily_briefs")
    .select("brief")
    .eq("brief_date", today)
    .eq("audience", "global")
    .limit(1)
    .execute()
  )
  if not res.data:
    return None
  row0 = res.data[0]
  brief = row0.get("brief") if isinstance(row0, dict) else None
  return brief if isinstance(brief, dict) else None


def _pick_brief_topics_for_setting(brief: dict[str, Any] | None, setting: str, max_topics: int) -> list[dict[str, Any]]:
  if not brief or max_topics <= 0:
    return []
  topics = brief.get("topics")
  if not isinstance(topics, list):
    return []

  keywords = _setting_to_brief_keywords(setting)
  picked: list[dict[str, Any]] = []

  def score_topic(t: dict[str, Any]) -> int:
    name = _normalize_topic(str(t.get("topic") or ""))
    score = 0
    for k in keywords:
      if k in name:
        score += 1
    return score

  candidates = [t for t in topics if isinstance(t, dict) and t.get("topic")]
  candidates.sort(key=score_topic, reverse=True)

  for t in candidates:
    if len(picked) >= max_topics:
      break
    picked.append(
      {
        "topic": t.get("topic"),
        "overview": t.get("overview"),
        "conversation_starters": t.get("conversation_starters") or [],
        "tags": t.get("tags") or [],
      }
    )

  return picked


def _conversation_kit(*, setting: str, goal: str) -> dict[str, Any]:
  s = (setting or "").strip().lower()
  g = (goal or "").strip().lower()

  opener = "Hey — how’s your week going?"
  if s in {"work_meeting", "meeting", "work", "interview"}:
    opener = "Quick one — what’s the main outcome you want from this meeting?"
  elif s in {"networking", "event"}:
    opener = "Nice to meet you — what have you been working on lately?"
  elif s in {"date", "dating"}:
    opener = "So what’s been the highlight of your week?"
  elif s in {"texting"}:
    opener = "Haha nice — what’s been keeping you busy today?"

  flow_steps = [
    "Ask one open-ended question.",
    "Mirror one key detail back in your own words.",
    "Ask a follow-up that starts with 'What' or 'How'.",
    "Share one short related detail about yourself (1 sentence).",
    "If it slows down, switch to a nearby topic (work, plans, media, current event).",
  ]

  if g in {"avoid_silence", "awkward_silence", "flow"}:
    flow_steps = [
      "Start with an open-ended question.",
      "Use a follow-up ladder: what → how → why.",
      "If you get a short answer, offer two options (A/B) to make it easy.",
      "Share one small opinion to invite theirs.",
      "Close the loop: summarize and ask what’s next for them.",
    ]

  question_ladder = [
    "What’s been on your mind this week?",
    "How did you get into that?",
    "What’s the most interesting part of it right now?",
    "What’s one thing you’re looking forward to next?",
    "If you could change one thing about it, what would it be?",
  ]

  exit_lines = [
    "I’m going to say hi to a couple people, but it was great talking — let’s reconnect soon.",
    "I’ve got to run, but this was fun — what’s the best way to stay in touch?",
  ]

  return {
    "opener": opener,
    "flow_steps": flow_steps,
    "question_ladder": question_ladder,
    "exit_lines": exit_lines,
  }


def advise(*, setting: str, goal: str, person: str, time_budget: str, topic_text: str | None, constraints: str | None, max_lessons: int = 5) -> dict[str, Any]:
  max_lessons = max(0, min(int(max_lessons or 0), 5))

  goal_subdomains = _goal_to_subdomains(goal)
  setting_subdomains = _setting_to_subdomains(setting)
  subdomains = list(dict.fromkeys(goal_subdomains + setting_subdomains))

  categories = _setting_to_knowledge_categories(setting)

  skills_target = 3
  knowledge_target = 2
  if max_lessons <= 2:
    skills_target = max_lessons
    knowledge_target = 0

  skills_rows = _select_skills_lessons(subdomains=subdomains, limit=min(skills_target, max_lessons), topic_text=topic_text)
  remaining = max_lessons - len(skills_rows)
  knowledge_rows = _select_knowledge_lessons(categories=categories, limit=min(knowledge_target, remaining), topic_text=topic_text)

  remaining = max_lessons - (len(skills_rows) + len(knowledge_rows))
  if remaining > 0:
    more_skills = _select_skills_lessons(subdomains=subdomains, limit=remaining, topic_text=None)
    existing_ids = {r.get("lesson_id") for r in skills_rows}
    for r in more_skills:
      if r.get("lesson_id") in existing_ids:
        continue
      skills_rows.append(r)
      if len(skills_rows) + len(knowledge_rows) >= max_lessons:
        break

  lessons_out: list[dict[str, Any]] = []
  citations: list[dict[str, Any]] = []

  for r in skills_rows:
    lessons_out.append(
      {
        "type": "skill",
        "lesson_id": r.get("lesson_id"),
        "title": r.get("title"),
        "phase": r.get("phase"),
        "domain": r.get("domain"),
        "difficulty": r.get("difficulty"),
        "read_time_minutes": r.get("read_time_minutes"),
      }
    )
    citations.append(
      {
        "type": "lesson",
        "id": r.get("lesson_id"),
        "title": r.get("title"),
        "reason": "Matched your setting/goal",
      }
    )

  for r in knowledge_rows:
    lessons_out.append(
      {
        "type": "knowledge",
        "lesson_id": r.get("lesson_id"),
        "title": r.get("title"),
        "category": r.get("category"),
        "difficulty": r.get("difficulty"),
        "read_time_minutes": r.get("read_time_minutes"),
      }
    )
    citations.append(
      {
        "type": "knowledge",
        "id": r.get("lesson_id"),
        "title": r.get("title"),
        "reason": "Suggested background knowledge for this setting",
      }
    )

  brief = _select_today_global_brief()
  brief_topics = _pick_brief_topics_for_setting(brief, setting, max_topics=1)
  for t in brief_topics:
    citations.append(
      {
        "type": "brief",
        "id": _utc_today_date(),
        "title": t.get("topic"),
        "reason": "Relevant daily brief topic for this setting",
      }
    )

  out = {
    "input": {
      "setting": setting,
      "goal": goal,
      "person": person,
      "time_budget": time_budget,
      "topic_text": topic_text,
      "constraints": constraints,
    },
    "recommendations": {
      "lessons": lessons_out[:max_lessons],
      "brief_topics": brief_topics,
      "conversation_kit": _conversation_kit(setting=setting, goal=goal),
    },
    "citations": citations,
  }

  return out
