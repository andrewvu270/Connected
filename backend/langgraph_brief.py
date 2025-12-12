from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from brief_pipeline import BriefResult, run_daily_brief


class BriefJobState(TypedDict, total=False):
  audience: str
  result: dict[str, Any]


def _run(state: BriefJobState) -> BriefJobState:
  audience = state.get("audience") or "global"
  res: BriefResult = run_daily_brief(audience=audience)
  return {
    "result": {
      "audience": res.audience,
      "brief_date": res.brief_date,
      "items_selected": res.items_selected,
      "stored": res.stored,
    }
  }


def build_brief_job_graph():
  g = StateGraph(BriefJobState)
  g.add_node("run", _run)
  g.set_entry_point("run")
  g.add_edge("run", END)
  return g.compile()
