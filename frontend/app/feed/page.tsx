"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "../../src/components/AppShell";
import { Badge } from "../../src/components/ui/Badge";
import { Button } from "../../src/components/ui/Button";
import { Card, CardContent } from "../../src/components/ui/Card";
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
    <AppShell title="Feed" subtitle="Rolling updates (latest 50). Diversified across categories.">
      {loading ? <div className="text-sm text-muted">Loading…</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data.map((row) => {
          const card = row.card || {};
          const sourceUrl = Array.isArray(card.sources) && card.sources[0]?.url ? card.sources[0]?.url : null;
          const why = Array.isArray(card.why_it_matters) ? card.why_it_matters : [];

          return (
            <Card key={row.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{row.category ?? ""}</Badge>
                    </div>
                    <div className="mt-3 text-base font-semibold tracking-tight">
                      {card.title ?? "Untitled"}
                    </div>
                  </div>
                  {sourceUrl ? (
                    <a href={sourceUrl} target="_blank" rel="noreferrer">
                      <Button size="sm">Source</Button>
                    </a>
                  ) : null}
                </div>

                {card.what_happened ? (
                  <div className="mt-3 text-sm leading-relaxed text-muted">
                    {card.what_happened}
                  </div>
                ) : null}

                {why.length ? (
                  <ul className="mt-4 grid gap-2 pl-5 text-sm text-muted">
                    {why.slice(0, 3).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}

                {card.talk_track ? (
                  <div className="mt-4 rounded-xl border border-border bg-bg p-4 text-sm">
                    <div className="text-xs font-medium text-muted">Talk track</div>
                    <div className="mt-1 leading-relaxed text-text">{card.talk_track}</div>
                  </div>
                ) : null}

                {card.smart_question ? (
                  <div className="mt-3 rounded-xl border border-border bg-bg p-4 text-sm">
                    <div className="text-xs font-medium text-muted">Smart question</div>
                    <div className="mt-1 leading-relaxed text-text">{card.smart_question}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
