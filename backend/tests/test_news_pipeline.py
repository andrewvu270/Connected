from backend import news_pipeline


def test_normalize_story_key_is_deterministic():
  a = news_pipeline._normalize_story_key("The Market Rally Continues")
  b = news_pipeline._normalize_story_key("The Market Rally Continues")
  assert a == b


def test_normalize_story_key_changes_with_title():
  a = news_pipeline._normalize_story_key("Apple releases new product")
  b = news_pipeline._normalize_story_key("Microsoft releases new product")
  assert a != b


def test_validate_card_ok():
  url = "https://example.com/story"
  card = {
    "category": "tech",
    "title": "Test",
    "what_happened": "Test happened.",
    "why_it_matters": ["a", "b"],
    "talk_track": "Talking point.",
    "smart_question": "What does it mean?",
    "sources": [{"url": url}],
  }
  ok, issues = news_pipeline._validate_card(card, url=url, category="tech", title="Test")
  assert ok is True
  assert issues == []


def test_validate_card_requires_sources_and_url():
  url = "https://example.com/story"
  card = {
    "category": "tech",
    "title": "Test",
    "what_happened": "Test happened.",
    "why_it_matters": [],
    "talk_track": "Talking point.",
    "smart_question": "What does it mean?",
    "sources": [],
  }
  ok, issues = news_pipeline._validate_card(card, url=url, category="tech", title="Test")
  assert ok is False
  assert "sources:empty" in issues
