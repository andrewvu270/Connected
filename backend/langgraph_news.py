from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from news_pipeline import PipelineResult, run_news_pipeline


class NewsJobState(TypedDict, total=False):
  result: dict[str, Any]


def _run(_: NewsJobState) -> NewsJobState:
  res: PipelineResult = run_news_pipeline()
  return {
    "result": {
      "sources": res.sources,
      "articles_fetched": res.articles_fetched,
      "articles_upserted": res.articles_upserted,
      "clusters_touched": res.clusters_touched,
      "cards_published": res.cards_published,
    }
  }


def build_news_job_graph():
  g = StateGraph(NewsJobState)
  g.add_node("run", _run)
  g.set_entry_point("run")
  g.add_edge("run", END)
  return g.compile()
