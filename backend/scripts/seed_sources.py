import json
import os
from pathlib import Path

from dotenv import load_dotenv

from supabase_client import get_supabase_admin_client


def main() -> None:
  load_dotenv()

  path = os.getenv("NEWS_SOURCES_JSON", "scripts/sources.sample.json")
  p = Path(path)
  if not p.exists():
    raise SystemExit(f"Sources file not found: {p}")

  payload = json.loads(p.read_text(encoding="utf-8"))
  sources = payload.get("sources")
  if not isinstance(sources, list) or not sources:
    raise SystemExit("No sources provided")

  supabase = get_supabase_admin_client()
  res = supabase.table("news_sources").upsert(sources, on_conflict="url").execute()
  print({"inserted": len(res.data or [])})


if __name__ == "__main__":
  main()
