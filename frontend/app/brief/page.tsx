"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "../../src/components/AppShell";
import { Badge } from "../../src/components/ui/Badge";
import { Card, CardContent } from "../../src/components/ui/Card";
import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type BriefItem = {
  category?: string | null;
  title?: string | null;
  what_happened?: string | null;
  why_it_matters?: string[] | null;
  talk_track?: string | null;
};

type Brief = {
  audience?: string | null;
  date?: string | null;
  overview?: string | null;
  items?: BriefItem[] | null;
};

export default function BriefPage() {
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000", []);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);

  useEffect(() => {
    requireAuthOrRedirect("/login");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus(null);
      setLoading(true);
      try {
        const res = await fetchAuthed(`${aiUrl}/news/brief?audience=global`, {
          method: "GET",
          headers: {}
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          setStatus(`Failed to load brief: ${res.status}`);
          return;
        }

        const json = (await res.json()) as { brief?: Brief };
        if (!cancelled) setBrief(json?.brief ?? null);
      } catch (e: any) {
        setStatus(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [aiUrl]);

  const items = Array.isArray(brief?.items) ? brief!.items! : [];

  return (
    <AppShell
      title="Today’s Brief"
      subtitle="A short summary grounded in your curated feed."
      actions={
        <div className="flex items-center gap-3">
          <Link className="text-sm text-muted hover:text-text" href="/feed">
            Feed
          </Link>
          <Link className="text-sm text-muted hover:text-text" href="/learning-path">
            Learning
          </Link>
        </div>
      }
    >
      {loading ? <div className="text-sm text-muted">Loading…</div> : null}
      {status ? <div className="text-sm text-red-600">{status}</div> : null}

      {brief?.overview ? (
        <Card className="mt-6">
          <CardContent className="p-6 text-sm leading-relaxed text-muted">{brief.overview}</CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4">
        {items.map((it: BriefItem, idx: number) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{it.category ?? ""}</Badge>
              </div>
              <div className="mt-3 text-base font-semibold tracking-tight">{it.title ?? ""}</div>

              {it.what_happened ? (
                <div className="mt-3 text-sm leading-relaxed text-muted">{it.what_happened}</div>
              ) : null}

              {Array.isArray(it.why_it_matters) && it.why_it_matters.length ? (
                <ul className="mt-4 grid gap-2 pl-5 text-sm text-muted">
                  {it.why_it_matters.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}

              {it.talk_track ? (
                <div className="mt-4 rounded-xl border border-border bg-bg p-4 text-sm">
                  <div className="text-xs font-medium text-muted">Talk track</div>
                  <div className="mt-1 leading-relaxed text-text">{it.talk_track}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
