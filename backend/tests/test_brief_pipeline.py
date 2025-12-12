from backend import brief_pipeline


def test_dedupe_by_cluster():
  rows = [
    {"cluster_id": "c1", "card": {"title": "a"}},
    {"cluster_id": "c1", "card": {"title": "b"}},
    {"cluster_id": "c2", "card": {"title": "c"}},
  ]
  out = brief_pipeline._dedupe_by_cluster(rows, limit=10)
  assert len(out) == 2
  assert out[0]["cluster_id"] == "c1"
  assert out[1]["cluster_id"] == "c2"


def test_topic_payload_extracts_compact_items():
  rows = [
    {
      "card": {
        "title": "T",
        "what_happened": "W",
        "sources": [{"url": "https://example.com"}],
      }
    }
  ]
  payload = brief_pipeline._topic_payload(rows)
  assert payload == [{"title": "T", "what_happened": "W", "url": "https://example.com"}]
