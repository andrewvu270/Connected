from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import openai
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


def _llm_primary_provider() -> str:
  return (os.getenv("DAILY_BRIEF_PRIMARY_PROVIDER") or "anthropic").strip().lower()


def _llm_fallback_provider() -> str:
  return (os.getenv("DAILY_BRIEF_FALLBACK_PROVIDER") or "openai").strip().lower()


def _anthropic_api_key() -> str | None:
  return os.getenv("ANTHROPIC_API_KEY")


def _openai_api_key() -> str | None:
  return os.getenv("OPENAI_API_KEY")


def _anthropic_model() -> str:
  return os.getenv("DAILY_BRIEF_ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")


def _openai_model() -> str:
  return os.getenv("DAILY_BRIEF_LLM_MODEL", "gpt-4o-mini")


def _is_retryable_anthropic_status(status_code: int) -> bool:
  return status_code == 429 or (500 <= status_code <= 599)


def _call_anthropic_messages(*, system: str, user: dict[str, Any], temperature: float, max_tokens: int) -> tuple[str, str]:
  api_key = _anthropic_api_key()
  if not api_key:
    raise RuntimeError("Missing ANTHROPIC_API_KEY")

  model = _anthropic_model()
  payload = {
    "model": model,
    "max_tokens": max_tokens,
    "temperature": temperature,
    "system": system,
    "messages": [
      {"role": "user", "content": json.dumps(user)},
    ],
  }

  try:
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
      if _is_retryable_anthropic_status(resp.status_code):
        raise RuntimeError(f"anthropic_retryable_http_{resp.status_code}: {resp.text[:500]}")
      raise RuntimeError(f"anthropic_http_{resp.status_code}: {resp.text[:500]}")

    data = resp.json()
    blocks = data.get("content")
    if not isinstance(blocks, list) or not blocks:
      raise RuntimeError("anthropic_empty_content")

    text_parts: list[str] = []
    for b in blocks:
      if isinstance(b, dict) and b.get("type") == "text" and isinstance(b.get("text"), str):
        text_parts.append(b["text"])

    content = "".join(text_parts).strip()
    if not content:
      raise RuntimeError("anthropic_empty_text")
    return content, model
  except httpx.TimeoutException as e:
    raise RuntimeError(f"anthropic_timeout: {e}")
  except httpx.HTTPError as e:
    raise RuntimeError(f"anthropic_http_error: {e}")


def _call_openai_chat(*, system: str, user: dict[str, Any], temperature: float, max_tokens: int | None) -> tuple[str, str]:
  api_key = _openai_api_key()
  if not api_key:
    raise RuntimeError("Missing OPENAI_API_KEY")

  model = _openai_model()
  client = OpenAI(api_key=api_key)

  kwargs: dict[str, Any] = {}
  if max_tokens is not None:
    kwargs["max_tokens"] = max_tokens

  resp = client.chat.completions.create(
    model=model,
    temperature=temperature,
    messages=[
      {"role": "system", "content": system},
      {"role": "user", "content": json.dumps(user)},
    ],
    **kwargs,
  )
  content = (resp.choices[0].message.content or "").strip()
  return content, model


def _call_llm_json(*, system: str, user: dict[str, Any], temperature: float, max_tokens: int, purpose: str) -> tuple[dict[str, Any] | None, dict[str, Any]]:
  providers: list[str] = []
  primary = _llm_primary_provider()
  fallback = _llm_fallback_provider()
  if primary:
    providers.append(primary)
  if fallback and fallback != primary:
    providers.append(fallback)

  tried: list[dict[str, Any]] = []
  last_err: str | None = None

  for provider in providers:
    try:
      if provider == "anthropic":
        content, model = _call_anthropic_messages(
          system=system + " Return ONLY valid JSON.",
          user=user,
          temperature=temperature,
          max_tokens=max_tokens,
        )
      elif provider == "openai":
        content, model = _call_openai_chat(
          system=system + " Return ONLY valid JSON.",
          user=user,
          temperature=temperature,
          max_tokens=max_tokens,
        )
      else:
        raise RuntimeError(f"Unknown provider: {provider}")

      parsed = json.loads(content)
      if not isinstance(parsed, dict):
        raise ValueError("LLM response is not a JSON object")

      return parsed, {"ok": True, "provider": provider, "model": model, "purpose": purpose, "tried": tried}
    except Exception as e:
      retryable = False
      if provider == "anthropic":
        msg = str(e)
        retryable = msg.startswith("anthropic_retryable_http_") or msg.startswith("anthropic_timeout") or msg.startswith("anthropic_http_error")
      elif provider == "openai":
        retryable = isinstance(
          e,
          (
            openai.RateLimitError,
            openai.APITimeoutError,
            openai.APIConnectionError,
            openai.InternalServerError,
          ),
        )

      tried.append({"provider": provider, "error": str(e), "retryable": retryable})
      last_err = str(e)
      if not retryable:
        break

  return None, {"ok": False, "purpose": purpose, "error": last_err, "tried": tried}


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

  if not _anthropic_api_key() and not _openai_api_key():
    return brief

  parsed, qa = _call_llm_json(system=system, user=user, temperature=0.3, max_tokens=450, purpose="brief_overview")
  if isinstance(parsed, dict):
    brief["overview"] = parsed.get("overview")
    brief["tags"] = parsed.get("tags")
  else:
    brief["overview"] = None
    brief["llm_error"] = qa.get("error")
    brief["llm_meta"] = qa
  return brief


def _maybe_llm_topic_brief(*, topic: str, items: list[dict[str, Any]]) -> dict[str, Any]:
  max_tokens = _env_int("DAILY_BRIEF_MAX_TOKENS", 450)
  if not _anthropic_api_key() and not _openai_api_key():
    return {"topic": topic, "overview": None, "tags": [], "items": items, "mode": "no_llm"}

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

  parsed, qa = _call_llm_json(
    system=system,
    user=user,
    temperature=0.3,
    max_tokens=max_tokens,
    purpose="topic_brief",
  )
  if not isinstance(parsed, dict):
    return {
      "topic": topic,
      "overview": None,
      "tags": [],
      "conversation_starters": [],
      "items": items,
      "mode": "llm_error",
      "error": qa.get("error"),
      "meta": qa,
    }

  return {
    "topic": topic,
    "overview": parsed.get("overview"),
    "tags": parsed.get("tags") or [],
    "conversation_starters": parsed.get("conversation_starters") or [],
    "items": items,
    "mode": "llm",
    "provider": qa.get("provider"),
    "model": qa.get("model"),
    "meta": qa,
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
