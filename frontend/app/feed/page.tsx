"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type FeedRow = {
  id: string;
  category: string | null;
  created_at?: string | null;
  card?: {
    title?: string | null;
    what_happened?: string | null;
    why_it_matters?: string[] | null;
    talk_track?: string | null;
    smart_question?: string | null;
    sources?: { url?: string | null }[] | null;
  } | null;
};

export default function FeedPage() {
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000", []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FeedRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await requireAuthOrRedirect("/login");

        const res = await fetchAuthed(`${aiUrl}/news/feed?limit=50&diversify=true`, { cache: "no-store" });
        if (!res.ok) {
          setError(`Error: ${res.status}`);
          return;
        }

        const json = (await res.json()) as { data?: FeedRow[] };
        if (cancelled) return;
        setData(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        if (cancelled) return;
        setError(String(e?.message ?? e ?? "Unknown error"));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aiUrl]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: 0 }}>Feed</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>Rolling updates (latest 50)</p>

      {loading ? <div style={{ marginTop: 16, opacity: 0.8 }}>Loading…</div> : null}
      {error ? (
        <div style={{ marginTop: 16, color: "#b00020" }}>{error}</div>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {data.map((row) => {
          const card = row.card || {};
          const sourceUrl = Array.isArray(card.sources) && card.sources[0]?.url ? card.sources[0]?.url : null;
          const why = Array.isArray(card.why_it_matters) ? card.why_it_matters : [];

          return (
            <article
              key={row.id}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>{row.category ?? ""}</div>
              <div style={{ fontWeight: 600, marginTop: 6 }}>{card.title ?? "Untitled"}</div>
              {card.what_happened ? <div style={{ marginTop: 8, opacity: 0.9 }}>{card.what_happened}</div> : null}

              {why.length ? (
                <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18 }}>
                  {why.slice(0, 3).map((b, i) => (
                    <li key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}

              {card.talk_track ? (
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                  <span style={{ fontWeight: 600 }}>Talk track:</span> {card.talk_track}
                </div>
              ) : null}

              {card.smart_question ? (
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                  <span style={{ fontWeight: 600 }}>Ask:</span> {card.smart_question}
                </div>
              ) : null}

              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 10 }}
                >
                  Source
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
