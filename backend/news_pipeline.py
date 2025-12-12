from __future__ import annotations

import hashlib
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import feedparser
import httpx
from openai import OpenAI
from slugify import slugify

from supabase_client import get_supabase_admin_client

logger = logging.getLogger("connected.news")


@dataclass
class PipelineResult:
  sources: int
  articles_fetched: int
  articles_upserted: int
  clusters_touched: int
  cards_published: int


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


def _parse_iso(dt: str | None) -> datetime | None:
  if not dt:
    return None
  try:
    return datetime.fromisoformat(dt.replace("Z", "+00:00")).astimezone(timezone.utc)
  except Exception:
    return None


def _is_stale_cluster(last_seen_at: str | None, hours: int = 48) -> bool:
  if not last_seen_at:
    return False
  try:
    dt = datetime.fromisoformat(last_seen_at.replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - dt) > timedelta(hours=hours)
  except Exception:
    return False


def _normalize_story_key(title: str) -> str:
  # Simple and cheap normalization for MVP.
  # Later: cluster via embeddings or fuzzy matching.
  base = slugify(title or "", lowercase=True)
  base = "-".join([p for p in base.split("-") if p and p not in {"the", "a", "an"}])
  if not base:
    base = "untitled"
  digest = hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]
  return f"{base[:80]}-{digest}"


def _entry_published_at(entry: Any) -> str | None:
  # feedparser provides multiple date variants.
  for attr in ["published_parsed", "updated_parsed"]:
    parsed = getattr(entry, attr, None)
    if parsed:
      dt = datetime(*parsed[:6], tzinfo=timezone.utc)
      return dt.isoformat()
  return None


def _build_fallback_card(category: str, title: str, url: str) -> dict[str, Any]:
  return {
    "category": category,
    "title": title,
    "what_happened": title,
    "why_it_matters": [],
    "talk_track": "Quick update: " + title,
    "smart_question": "How do you think this affects the market / industry?",
    "sources": [{"url": url}],
  }


def _validate_card(
  card: dict[str, Any], *, url: str, category: str, title: str
) -> tuple[bool, list[str]]:
  issues: list[str] = []

  required_keys = [
    "category",
    "title",
    "what_happened",
    "why_it_matters",
    "talk_track",
    "smart_question",
    "sources",
  ]
  for k in required_keys:
    if k not in card:
      issues.append(f"missing:{k}")

  if not isinstance(card.get("why_it_matters"), list):
    issues.append("why_it_matters:not_list")

  sources = card.get("sources")
  if not isinstance(sources, list) or not sources:
    issues.append("sources:empty")
  else:
    urls = [s.get("url") for s in sources if isinstance(s, dict)]
    if url not in urls:
      issues.append("sources:missing_url")

  for k in ["category", "title", "what_happened", "talk_track", "smart_question"]:
    v = card.get(k)
    if v is not None and not isinstance(v, str):
      issues.append(f"{k}:not_string")

  if issues:
    return False, issues

  if not card.get("title"):
    card["title"] = title
  if not card.get("category"):
    card["category"] = category

  return True, []


def _maybe_build_llm_card(
  *,
  category: str,
  title: str,
  url: str,
  summary: str | None,
) -> tuple[dict[str, Any], dict[str, Any] | None, float | None, str | None, str]:
  api_key = os.getenv("OPENAI_API_KEY")
  if not api_key:
    return _build_fallback_card(category, title, url), None, None, None, "v0-fallback"

  model = os.getenv("NEWS_CARD_LLM_MODEL", "gpt-4o-mini")
  client = OpenAI(api_key=api_key)

  system = (
    "You are a news brief assistant for young professionals and networkers. "
    "Create a compact, credible card. Never invent facts. "
    "Do not include numbers unless explicitly present in the provided summary/title. "
    "Always keep it short."
  )

  user = {
    "category": category,
    "title": title,
    "url": url,
    "summary": summary,
    "required_json": {
      "category": "string",
      "title": "string",
      "what_happened": "string (1 sentence)",
      "why_it_matters": "array of 2 short bullets max",
      "talk_track": "string (1 sentence user can say)",
      "smart_question": "string (1 question)",
      "sources": "array of {url} (must include the provided url)"
    },
  }

  try:
    resp = client.chat.completions.create(
      model=model,
      temperature=0.2,
      messages=[
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user)},
      ],
    )
    content = (resp.choices[0].message.content or "").strip()
    card = json.loads(content)

    if not isinstance(card, dict):
      raise ValueError("Card is not a JSON object")
    if "sources" not in card or not card["sources"]:
      card["sources"] = [{"url": url}]
    else:
      if all((s.get("url") != url) for s in card.get("sources", []) if isinstance(s, dict)):
        card["sources"].append({"url": url})

    qa = {"ok": True, "mode": "llm"}
    return card, qa, None, model, "v1-llm"
  except Exception as e:
    qa = {"ok": False, "mode": "llm", "error": str(e)}
    return _build_fallback_card(category, title, url), qa, None, model, "v1-llm-fallback"


def run_news_pipeline() -> PipelineResult:
  supabase = get_supabase_admin_client()

  logger.info("news_pipeline_start")

  max_entries_per_source = _env_int("NEWS_MAX_ENTRIES_PER_SOURCE", 50)
  max_total_entries = _env_int("NEWS_MAX_TOTAL_ENTRIES", 250)
  cluster_stale_hours = _env_int("NEWS_CLUSTER_STALE_HOURS", 48)
  card_cooldown_minutes = _env_int("NEWS_CLUSTER_CARD_COOLDOWN_MINUTES", 90)
  http_timeout_seconds = _env_int("NEWS_HTTP_TIMEOUT_SECONDS", 20)
  user_agent = os.getenv("NEWS_HTTP_USER_AGENT", "ConnectedNewsBot/0.1")

  sources_resp = (
    supabase.table("news_sources")
    .select("id,name,source_type,url,category,enabled")
    .eq("enabled", True)
    .execute()
  )
  sources = sources_resp.data or []

  if not sources:
    return PipelineResult(
      sources=0,
      articles_fetched=0,
      articles_upserted=0,
      clusters_touched=0,
      cards_published=0,
    )

  articles_fetched = 0
  articles_upserted = 0
  clusters_touched = 0
  cards_published = 0

  cluster_cache: dict[tuple[str, str], dict[str, Any]] = {}
  touched_clusters: set[str] = set()
  now = datetime.now(timezone.utc)
  cooldown = timedelta(minutes=card_cooldown_minutes)
  total_entries_seen = 0

  with httpx.Client(timeout=http_timeout_seconds, follow_redirects=True) as client:
    for src in sources:
      if total_entries_seen >= max_total_entries:
        break
      if src.get("source_type") != "rss":
        continue

      url = src["url"]
      category = src["category"]
      source_id = src["id"]

      try:
        resp = client.get(url, headers={"User-Agent": user_agent})
        if resp.status_code >= 400:
          continue
        feed_text = resp.text
      except Exception:
        logger.info("news_source_fetch_error", extra={"url": url})
        continue

      try:
        feed = feedparser.parse(feed_text)
      except Exception:
        logger.info("news_source_parse_error", extra={"url": url})
        continue

      seen_urls: set[str] = set()
      for entry in feed.entries[:max_entries_per_source]:
        if total_entries_seen >= max_total_entries:
          break
        articles_fetched += 1
        total_entries_seen += 1

        entry_url = getattr(entry, "link", None)
        entry_title = getattr(entry, "title", None) or ""

        if not entry_url or not entry_title:
          continue
        if entry_url in seen_urls:
          continue
        seen_urls.add(entry_url)

        published_at = _entry_published_at(entry)
        summary = getattr(entry, "summary", None)

        raw_payload = {
          "feed_title": getattr(feed.feed, "title", None),
          "entry": dict(entry),
        }

        upsert_payload = {
          "source_id": source_id,
          "url": entry_url,
          "title": entry_title,
          "published_at": published_at,
          "summary": summary,
          "fetched_at": _now_iso(),
          "raw": raw_payload,
        }

        # Upsert raw article by (source_id, url)
        upsert_resp = (
          supabase.table("news_articles_raw")
          .upsert(upsert_payload, on_conflict="source_id,url")
          .select("id,url,title")
          .execute()
        )

        if not upsert_resp.data:
          continue

        article_row = upsert_resp.data[0]
        article_id = article_row["id"]
        articles_upserted += 1

        # Cluster
        normalized_key = _normalize_story_key(entry_title)
        cache_key = (category, normalized_key)
        cached = cluster_cache.get(cache_key)

        if cached:
          cluster_id = cached["cluster_id"]
        else:
          existing_cluster = (
            supabase.table("news_story_clusters")
            .select("id,last_seen_at")
            .eq("category", category)
            .eq("normalized_key", normalized_key)
            .limit(1)
            .execute()
          )

          if existing_cluster.data:
            row0 = existing_cluster.data[0]
            if _is_stale_cluster(row0.get("last_seen_at"), hours=cluster_stale_hours):
              archived_key = normalized_key + "-archived-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
              supabase.table("news_story_clusters").update(
                {"status": "archived", "normalized_key": archived_key}
              ).eq("id", row0["id"]).execute()

              created = (
                supabase.table("news_story_clusters")
                .insert(
                  {
                    "category": category,
                    "title": entry_title,
                    "normalized_key": normalized_key,
                    "first_seen_at": _now_iso(),
                    "last_seen_at": _now_iso(),
                    "status": "active",
                  }
                )
                .select("id")
                .execute()
              )
              cluster_id = created.data[0]["id"]
            else:
              cluster_id = row0["id"]
          else:
            created = (
              supabase.table("news_story_clusters")
              .insert(
                {
                  "category": category,
                  "title": entry_title,
                  "normalized_key": normalized_key,
                  "first_seen_at": _now_iso(),
                  "last_seen_at": _now_iso(),
                  "status": "active",
                }
              )
              .select("id")
              .execute()
            )
            cluster_id = created.data[0]["id"]

          existing_card = (
            supabase.table("news_feed_cards")
            .select("updated_at")
            .eq("cluster_id", cluster_id)
            .limit(1)
            .execute()
          )
          card_updated_at = None
          if existing_card.data:
            card_updated_at = existing_card.data[0].get("updated_at")

          cluster_cache[cache_key] = {
            "cluster_id": cluster_id,
            "card_updated_at": card_updated_at,
          }

        if cluster_id not in touched_clusters:
          touched_clusters.add(cluster_id)
          supabase.table("news_story_clusters").update(
            {"last_seen_at": _now_iso(), "title": entry_title}
          ).eq("id", cluster_id).execute()
          clusters_touched += 1

        # Link cluster <-> article (idempotent)
        supabase.table("news_cluster_articles").upsert(
          {"cluster_id": cluster_id, "article_id": article_id},
          on_conflict="cluster_id,article_id",
        ).execute()

        # Publish/update card
        cached = cluster_cache.get(cache_key) or {}
        updated_at_dt = _parse_iso(cached.get("card_updated_at"))
        if updated_at_dt and (now - updated_at_dt) < cooldown:
          continue

        card, qa, hallucination_confidence, model_used, prompt_version = _maybe_build_llm_card(
          category=category,
          title=entry_title,
          url=entry_url,
          summary=summary,
        )
        ok, issues = _validate_card(card, url=entry_url, category=category, title=entry_title)
        if not ok:
          qa = {"ok": False, "mode": "qa", "issues": issues, "upstream": qa}
          card = _build_fallback_card(category, entry_title, entry_url)
        else:
          qa = qa or {"ok": True, "mode": "fallback"}

        card_upsert = {
          "cluster_id": cluster_id,
          "category": category,
          "card": card,
          "qa": qa,
          "hallucination_confidence": hallucination_confidence,
          "model": model_used,
          "prompt_version": prompt_version,
          "updated_at": _now_iso(),
          "published": True,
        }

        supabase.table("news_feed_cards").upsert(
          card_upsert,
          on_conflict="cluster_id",
        ).execute()
        cluster_cache[cache_key] = {
          **(cluster_cache.get(cache_key) or {}),
          "cluster_id": cluster_id,
          "card_updated_at": card_upsert["updated_at"],
        }
        cards_published += 1

  return PipelineResult(
    sources=len(sources),
    articles_fetched=articles_fetched,
    articles_upserted=articles_upserted,
    clusters_touched=clusters_touched,
    cards_published=cards_published,
  )
