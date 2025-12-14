from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from xml.etree import ElementTree as ET

try:
  import feedparser
except ModuleNotFoundError:
  feedparser = None
import httpx
from openai import OpenAI
try:
  from slugify import slugify
except ModuleNotFoundError:
  slugify = None

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
  if slugify is not None:
    base = slugify(title or "", lowercase=True)
  else:
    base = re.sub(r"[^a-z0-9]+", "-", (title or "").strip().lower())
    base = re.sub(r"-+", "-", base).strip("-")
  base = "-".join([p for p in base.split("-") if p and p not in {"the", "a", "an"}])
  if not base:
    base = "untitled"
  digest = hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]
  return f"{base[:80]}-{digest}"


def _entry_published_at(entry: Any) -> str | None:
  # feedparser provides multiple date variants.
  if isinstance(entry, dict):
    raw = (
      entry.get("published_at")
      or entry.get("published")
      or entry.get("updated")
      or entry.get("pubDate")
      or entry.get("updated_at")
    )
    if isinstance(raw, str) and raw.strip():
      dt = _try_parse_datetime(raw)
      return dt.isoformat() if dt else None
    return None

  for attr in ["published_parsed", "updated_parsed"]:
    parsed = getattr(entry, attr, None)
    if parsed:
      dt = datetime(*parsed[:6], tzinfo=timezone.utc)
      return dt.isoformat()
  return None


def _entry_field(entry: Any, name: str) -> Any:
  if isinstance(entry, dict):
    return entry.get(name)
  return getattr(entry, name, None)


def _try_parse_datetime(s: str) -> datetime | None:
  s = (s or "").strip()
  if not s:
    return None
  try:
    dt = parsedate_to_datetime(s)
    if dt.tzinfo is None:
      dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
  except Exception:
    pass
  try:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
  except Exception:
    return None


def _strip_ns(tag: str) -> str:
  if "}" in tag:
    return tag.split("}", 1)[1]
  return tag


def _child_text(el: ET.Element, name: str) -> str | None:
  for c in list(el):
    if _strip_ns(c.tag) == name:
      if c.text:
        return c.text.strip()
      return None
  return None


def _find_link(el: ET.Element) -> str | None:
  # Atom: <link href="..." rel="alternate"/>
  for c in list(el):
    if _strip_ns(c.tag) != "link":
      continue
    href = c.attrib.get("href")
    if href:
      rel = (c.attrib.get("rel") or "alternate").lower()
      if rel == "alternate":
        return href.strip()
  # RSS: <link>...</link>
  link = _child_text(el, "link")
  return link.strip() if link else None


def _fallback_parse_feed(feed_text: str) -> tuple[str | None, list[dict[str, Any]]]:
  try:
    root = ET.fromstring(feed_text)
  except Exception:
    return None, []

  root_name = _strip_ns(root.tag)
  entries: list[dict[str, Any]] = []
  feed_title: str | None = None

  # RSS 2.0
  if root_name == "rss" or root.find("channel") is not None:
    channel = root.find("channel")
    if channel is not None:
      feed_title = _child_text(channel, "title")
      for item in channel.findall("item"):
        title = _child_text(item, "title") or ""
        link = _child_text(item, "link")
        summary = _child_text(item, "description")
        pub = _child_text(item, "pubDate")
        entries.append(
          {
            "title": title,
            "link": link,
            "summary": summary,
            "published": pub,
          }
        )
    return feed_title, entries

  # Atom
  if root_name == "feed":
    feed_title = _child_text(root, "title")
    for entry in list(root):
      if _strip_ns(entry.tag) != "entry":
        continue
      title = _child_text(entry, "title") or ""
      link = _find_link(entry)
      summary = _child_text(entry, "summary") or _child_text(entry, "content")
      pub = _child_text(entry, "published") or _child_text(entry, "updated")
      entries.append(
        {
          "title": title,
          "link": link,
          "summary": summary,
          "published": pub,
        }
      )
    return feed_title, entries

  return None, []


def _clean_text(s: str | None) -> str | None:
  if not s:
    return None
  s2 = re.sub(r"<[^>]+>", " ", s)
  s2 = re.sub(r"\s+", " ", s2).strip()
  return s2 or None


def _first_sentence(s: str | None) -> str | None:
  s2 = _clean_text(s)
  if not s2:
    return None
  parts = re.split(r"(?<=[.!?])\s+", s2)
  return (parts[0] or "").strip() if parts else s2


def _build_fallback_card(category: str, title: str, url: str, summary: str | None = None) -> dict[str, Any]:
  what = _first_sentence(summary) or title
  why: list[str] = []
  clean_summary = _clean_text(summary)
  if clean_summary and clean_summary != what:
    more = clean_summary.replace(what, "", 1).strip(" -:;,.\n\t")
    if more:
      extra_sentences = re.split(r"(?<=[.!?])\s+", more)
      for p in extra_sentences:
        p2 = (p or "").strip()
        if not p2:
          continue
        why.append(p2)
        if len(why) >= 2:
          break

  talk = ("Here’s a quick update: " + what) if what else ("Here’s a quick update: " + title)
  return {
    "category": category,
    "title": title,
    "what_happened": what,
    "why_it_matters": why,
    "talk_track": talk,
    "smart_question": "What do you think the second-order impact is over the next 3–6 months?",
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
    return _build_fallback_card(category, title, url, summary), None, None, None, "v0-fallback"

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

  def _extract_json_object(s: str) -> dict[str, Any] | None:
    s2 = (s or "").strip()
    if not s2:
      return None
    try:
      obj = json.loads(s2)
      return obj if isinstance(obj, dict) else None
    except Exception:
      pass
    l = s2.find("{")
    r = s2.rfind("}")
    if l >= 0 and r > l:
      try:
        obj = json.loads(s2[l : r + 1])
        return obj if isinstance(obj, dict) else None
      except Exception:
        return None
    return None

  try:
    try:
      resp = client.chat.completions.create(
        model=model,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
          {"role": "system", "content": system},
          {"role": "user", "content": json.dumps(user)},
        ],
      )
    except TypeError:
      resp = client.chat.completions.create(
        model=model,
        temperature=0.2,
        messages=[
          {"role": "system", "content": system},
          {"role": "user", "content": json.dumps(user)},
        ],
      )
    content = (resp.choices[0].message.content or "").strip()
    card = _extract_json_object(content)
    if card is None:
      raise ValueError("Failed to parse JSON")

    if not isinstance(card, dict):
      raise ValueError("Card is not a JSON object")

    sources = card.get("sources")
    normalized_sources: list[dict[str, Any]] = []
    if isinstance(sources, list):
      for s in sources:
        if isinstance(s, str) and s.strip():
          normalized_sources.append({"url": s.strip()})
        elif isinstance(s, dict):
          u = s.get("url")
          if isinstance(u, str) and u.strip():
            normalized_sources.append({"url": u.strip()})

    if not normalized_sources:
      normalized_sources = [{"url": url}]
    else:
      if all((s.get("url") != url) for s in normalized_sources if isinstance(s, dict)):
        normalized_sources.append({"url": url})
    card["sources"] = normalized_sources

    qa = {"ok": True, "mode": "llm"}
    return card, qa, None, model, "v1-llm"
  except Exception as e:
    qa = {"ok": False, "mode": "llm", "error": str(e)}
    return _build_fallback_card(category, title, url, summary), qa, None, model, "v1-llm-fallback"


def run_news_pipeline() -> PipelineResult:
  supabase = get_supabase_admin_client()

  logger.info("news_pipeline_start")

  max_entries_per_source = _env_int("NEWS_MAX_ENTRIES_PER_SOURCE", 5)
  max_entries_per_category = _env_int("NEWS_MAX_ENTRIES_PER_CATEGORY", 5)
  _max_total_raw = (os.getenv("NEWS_MAX_TOTAL_ENTRIES") or "").strip()
  max_total_entries: int | None = None
  if _max_total_raw:
    try:
      max_total_entries = int(_max_total_raw)
    except Exception:
      max_total_entries = None
  cluster_stale_hours = _env_int("NEWS_CLUSTER_STALE_HOURS", 48)
  card_cooldown_minutes = _env_int("NEWS_CLUSTER_CARD_COOLDOWN_MINUTES", 90)
  http_timeout_seconds = _env_int("NEWS_HTTP_TIMEOUT_SECONDS", 20)
  user_agent = os.getenv("NEWS_HTTP_USER_AGENT", "ConnectedNewsBot/0.1")
  log_sources = (os.getenv("NEWS_LOG_SOURCES") or "").strip().lower() in {"1", "true", "yes"}

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

  sources_by_category: dict[str, list[dict[str, Any]]] = {}
  for src in sources:
    if not isinstance(src, dict):
      continue
    if not src.get("enabled"):
      continue
    if src.get("source_type") != "rss":
      continue
    cat = src.get("category") or ""
    if cat not in sources_by_category:
      sources_by_category[cat] = []
    sources_by_category[cat].append(src)

  # Stable ordering helps produce predictable results while iterating.
  category_order = sorted([c for c in sources_by_category.keys() if c])

  if max_total_entries is None:
    max_total_entries = max_entries_per_category * max(1, len(category_order))

  with httpx.Client(timeout=http_timeout_seconds, follow_redirects=True) as client:
    for category in category_order:
      if total_entries_seen >= max_total_entries:
        break
      cat_sources = sources_by_category.get(category) or []
      cat_entries_seen = 0

      for src in cat_sources:
        if total_entries_seen >= max_total_entries:
          break
        if cat_entries_seen >= max_entries_per_category:
          break

        url = src["url"]
        source_id = src["id"]

        try:
          resp = client.get(url, headers={"User-Agent": user_agent})
          if resp.status_code >= 400:
            if log_sources:
              logger.info(
                "news_source_fetch_bad_status",
                extra={"category": category, "source_name": src.get("name"), "url": url, "status": resp.status_code},
              )
            continue
          feed_text = resp.text
        except Exception:
          logger.exception(
            "news_source_fetch_error",
            extra={"category": category, "source_name": src.get("name"), "url": url},
          )
          continue

        try:
          if feedparser is not None:
            feed = feedparser.parse(feed_text)
            feed_title = getattr(feed.feed, "title", None)
            entries = feed.entries
          else:
            feed_title, entries = _fallback_parse_feed(feed_text)
        except Exception:
          logger.exception(
            "news_source_parse_error",
            extra={"category": category, "source_name": src.get("name"), "url": url},
          )
          continue

        entries_list = list(entries or [])
        min_utc = datetime.min.replace(tzinfo=timezone.utc)

        def _entry_sort_key(e: Any) -> datetime:
          dt = _parse_iso(_entry_published_at(e))
          return dt or min_utc

        try:
          entries_list.sort(key=_entry_sort_key, reverse=True)
        except Exception:
          pass

        if log_sources:
          logger.info(
            "news_source_parsed",
            extra={
              "category": category,
              "source_name": src.get("name"),
              "url": url,
              "entries": len(entries_list),
            },
          )

        seen_urls: set[str] = set()
        for entry in entries_list[:max_entries_per_source]:
          if total_entries_seen >= max_total_entries:
            break
          if cat_entries_seen >= max_entries_per_category:
            break

          entry_url = _entry_field(entry, "link")
          entry_title = _entry_field(entry, "title") or ""

          if not entry_url or not entry_title:
            continue
          if entry_url in seen_urls:
            continue
          seen_urls.add(entry_url)

          articles_fetched += 1
          total_entries_seen += 1

          published_at = _entry_published_at(entry)
          summary = _entry_field(entry, "summary")
          if summary is None:
            summary = _entry_field(entry, "description")

          raw_payload = {
            "feed_title": feed_title,
            "entry": (entry if isinstance(entry, dict) else dict(entry)),
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
          upsert_resp = supabase.table("news_articles_raw").upsert(
            upsert_payload,
            on_conflict="source_id,url",
            returning="representation",
          ).execute()

          article_row = None
          if isinstance(upsert_resp.data, list) and upsert_resp.data and isinstance(upsert_resp.data[0], dict):
            article_row = upsert_resp.data[0]

          if not article_row or "id" not in article_row:
            reread = (
              supabase.table("news_articles_raw")
              .select("id,url,title")
              .eq("source_id", source_id)
              .eq("url", entry_url)
              .limit(1)
              .execute()
            )
            if isinstance(reread.data, list) and reread.data and isinstance(reread.data[0], dict):
              article_row = reread.data[0]

          if not article_row or "id" not in article_row:
            continue

          article_id = article_row["id"]
          articles_upserted += 1
          cat_entries_seen += 1

          # Cluster
          cluster_input = entry_title
          summary_sentence = _first_sentence(summary)
          if summary_sentence:
            cluster_input = f"{entry_title} {summary_sentence}"
          normalized_key = _normalize_story_key(cluster_input)
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
                  .execute()
                )
                cluster_id = None
                if isinstance(created.data, list) and created.data and isinstance(created.data[0], dict):
                  cluster_id = created.data[0].get("id")
                if not cluster_id:
                  reread = (
                    supabase.table("news_story_clusters")
                    .select("id")
                    .eq("category", category)
                    .eq("normalized_key", normalized_key)
                    .limit(1)
                    .execute()
                  )
                  if isinstance(reread.data, list) and reread.data and isinstance(reread.data[0], dict):
                    cluster_id = reread.data[0].get("id")
                if not cluster_id:
                  continue
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
                .execute()
              )
              cluster_id = None
              if isinstance(created.data, list) and created.data and isinstance(created.data[0], dict):
                cluster_id = created.data[0].get("id")
              if not cluster_id:
                reread = (
                  supabase.table("news_story_clusters")
                  .select("id")
                  .eq("category", category)
                  .eq("normalized_key", normalized_key)
                  .limit(1)
                  .execute()
                )
                if isinstance(reread.data, list) and reread.data and isinstance(reread.data[0], dict):
                  cluster_id = reread.data[0].get("id")
              if not cluster_id:
                continue

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
            card = _build_fallback_card(category, entry_title, entry_url, summary)
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
