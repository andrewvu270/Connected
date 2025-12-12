from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from openai import OpenAI

from supabase_client import get_supabase_admin_client

logger = logging.getLogger("connected.brief")


@dataclass
class BriefResult:
  items_selected: int
  stored: bool
  audience: str
  brief_date: str


def _utc_today_date() -> str:
  return datetime.now(timezone.utc).date().isoformat()


def _now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def _env_int(name: str, default: int) -> int:
  raw = os.getenv(name)
  if raw is None or raw == "":
    return default
  try:
    return int(raw)
  except Exception:
    return default


def _env_topics(name: str) -> list[str] | None:
  raw = os.getenv(name)
  if not raw:
    return None
  parts = [p.strip() for p in raw.split(",")]
  return [p for p in parts if p]


def _select_top_cards(*, hours: int = 24, limit: int = 20, category: str | None = None) -> list[dict[str, Any]]:
  supabase = get_supabase_admin_client()
  since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
  q = (
    supabase.table("news_feed_cards")
    .select("id, cluster_id, category, card, created_at")
    .eq("published", True)
    .gte("created_at", since)
    .order("created_at", desc=True)
    .limit(limit)
  )
  if category:
    q = q.eq("category", category)
  resp = q.execute()
  return resp.data or []


def _build_fallback_brief(cards: list[dict[str, Any]]) -> dict[str, Any]:
  items: list[dict[str, Any]] = []
  for row in cards:
    card = row.get("card") or {}
    items.append(
      {
        "category": row.get("category"),
        "title": card.get("title"),
        "what_happened": card.get("what_happened"),
        "why_it_matters": card.get("why_it_matters") or [],
        "talk_track": card.get("talk_track"),
        "smart_question": card.get("smart_question"),
        "sources": card.get("sources") or [],
        "created_at": row.get("created_at"),
      }
    )

  return {
    "brief_date": _utc_today_date(),
    "generated_at": _now_iso(),
    "overview": None,
    "topics": [],
    "items": items,
  }


def _dedupe_by_cluster(rows: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
  out: list[dict[str, Any]] = []
  seen: set[str] = set()
  for r in rows:
    cid = r.get("cluster_id")
    if cid and cid in seen:
      continue
    if cid:
      seen.add(cid)
    out.append(r)
    if len(out) >= limit:
      break
  return out


def _topic_payload(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
  payload: list[dict[str, Any]] = []
  for row in rows:
    card = row.get("card") or {}
    sources = card.get("sources") or []
    url = None
    if isinstance(sources, list) and sources and isinstance(sources[0], dict):
      url = sources[0].get("url")
    payload.append(
      {
        "title": card.get("title"),
        "what_happened": card.get("what_happened"),
        "url": url,
      }
    )
  return payload


def _maybe_llm_overview(brief: dict[str, Any]) -> dict[str, Any]:
  api_key = os.getenv("OPENAI_API_KEY")
  if not api_key:
    return brief

  model = os.getenv("DAILY_BRIEF_LLM_MODEL", "gpt-4o-mini")
  client = OpenAI(api_key=api_key)

  system = (
    "You write a morning/evening brief for young professionals. "
    "Be concise, neutral, and avoid hype. Do not invent facts."
  )

  user = {
    "brief_date": brief.get("brief_date"),
    "items": brief.get("items", [])[:15],
    "required_json": {
      "overview": "string, 3-5 sentences max",
      "tags": "array of up to 8 strings"
    },
  }

  try:
    resp = client.chat.completions.create(
      model=model,
      temperature=0.3,
      messages=[
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user)},
      ],
    )
    content = (resp.choices[0].message.content or "").strip()
    parsed = json.loads(content)
    if isinstance(parsed, dict):
      brief["overview"] = parsed.get("overview")
      brief["tags"] = parsed.get("tags")
    return brief
  except Exception as e:
    brief["overview"] = None
    brief["llm_error"] = str(e)
    return brief


def _maybe_llm_topic_brief(*, topic: str, items: list[dict[str, Any]]) -> dict[str, Any]:
  api_key = os.getenv("OPENAI_API_KEY")
  if not api_key:
    return {"topic": topic, "overview": None, "tags": [], "items": items, "mode": "no_llm"}

  model = os.getenv("DAILY_BRIEF_LLM_MODEL", "gpt-4o-mini")
  max_tokens = _env_int("DAILY_BRIEF_MAX_TOKENS", 450)
  client = OpenAI(api_key=api_key)

  system = (
    "You write a daily brief for young professionals. "
    "Be concise, neutral, and avoid hype. Do not invent facts. "
    "Only reference what is clearly supported by the provided items."
  )

  user = {
    "topic": topic,
    "brief_date": _utc_today_date(),
    "items": items,
    "required_json": {
      "overview": "string, 3-5 sentences max",
      "tags": "array of up to 8 strings",
      "conversation_starters": "array of up to 3 short questions",
    },
  }

  try:
    resp = client.chat.completions.create(
      model=model,
      temperature=0.3,
      max_tokens=max_tokens,
      messages=[
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user)},
      ],
    )
    content = (resp.choices[0].message.content or "").strip()
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
      raise ValueError("Topic brief is not a JSON object")

    return {
      "topic": topic,
      "overview": parsed.get("overview"),
      "tags": parsed.get("tags") or [],
      "conversation_starters": parsed.get("conversation_starters") or [],
      "items": items,
      "mode": "llm",
      "model": model,
    }
  except Exception as e:
    return {
      "topic": topic,
      "overview": None,
      "tags": [],
      "conversation_starters": [],
      "items": items,
      "mode": "llm_error",
      "error": str(e),
      "model": model,
    }


def run_daily_brief(audience: str = "global") -> BriefResult:
  supabase = get_supabase_admin_client()
  brief_date = _utc_today_date()

  logger.info("daily_brief_start", extra={"audience": audience, "brief_date": brief_date})

  existing = (
    supabase.table("news_daily_briefs")
    .select("brief")
    .eq("brief_date", brief_date)
    .eq("audience", audience)
    .limit(1)
    .execute()
  )
  force = os.getenv("DAILY_BRIEF_FORCE_REGEN") == "1"
  if not force and existing.data:
    row0 = existing.data[0] if isinstance(existing.data, list) and existing.data else None
    brief_existing = (row0 or {}).get("brief") if isinstance(row0, dict) else None
    if isinstance(brief_existing, dict):
      logger.info("daily_brief_skip_existing", extra={"audience": audience, "brief_date": brief_date})
      return BriefResult(
        items_selected=len(brief_existing.get("items") or []),
        stored=True,
        audience=audience,
        brief_date=brief_date,
      )

  topics_default = [
    "culture",
    "economics",
    "finance",
    "fitness/health",
    "science",
    "tech",
    "society",
    "sports",
    "global issues/world affairs",
    "pop culture/media",
  ]
  topics = _env_topics("DAILY_BRIEF_TOPICS") or topics_default
  hours = _env_int("DAILY_BRIEF_LOOKBACK_HOURS", 24)
  per_topic_limit = _env_int("DAILY_BRIEF_ITEMS_PER_TOPIC", 10)
  max_topics = _env_int("DAILY_BRIEF_MAX_TOPICS", len(topics))

  all_items: list[dict[str, Any]] = []
  topic_sections: list[dict[str, Any]] = []

  for topic in topics[:max_topics]:
    rows = _select_top_cards(hours=hours, limit=per_topic_limit * 3, category=topic)
    rows = _dedupe_by_cluster(rows, per_topic_limit)
    topic_items = _build_fallback_brief(rows).get("items") or []
    topic_items = topic_items[:per_topic_limit]

    llm_items = _topic_payload(rows)[:per_topic_limit]

    section = _maybe_llm_topic_brief(topic=topic, items=llm_items)
    section["items"] = topic_items
    topic_sections.append(section)

    for it in topic_items[:3]:
      all_items.append(it)

  all_items = all_items[:25]
  brief = {
    "brief_date": brief_date,
    "generated_at": _now_iso(),
    "overview": None,
    "topics": topic_sections,
    "items": all_items,
  }
  brief = _maybe_llm_overview(brief)

  logger.info(
    "daily_brief_generated",
    extra={
      "audience": audience,
      "brief_date": brief_date,
      "topics": len(topic_sections),
      "items_selected": len(all_items),
    },
  )

  upsert_payload = {
    "brief_date": brief_date,
    "audience": audience,
    "brief": brief,
    "created_at": _now_iso(),
  }

  supabase.table("news_daily_briefs").upsert(
    upsert_payload,
    on_conflict="brief_date,audience",
  ).execute()

  return BriefResult(
    items_selected=len(all_items),
    stored=True,
    audience=audience,
    brief_date=brief_date,
  )
