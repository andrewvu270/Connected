"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "../../src/components/AppShell";
import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type FeedRow = {
  id: string;
  category: string | null;
  created_at?: string | null;
  card?: {
    title?: string | null;
    what_happened?: string | null;
    sources?: { url?: string | null }[] | null;
  } | null;
};

type DrillListItem = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  setting?: string | null;
  goal?: string | null;
  feedback?: string | null;
};

export default function DashboardPage() {
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000", []);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [drills, setDrills] = useState<DrillListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        await requireAuthOrRedirect("/login");

        const [feedRes, drillRes] = await Promise.all([
          fetchAuthed(`${aiUrl}/news/feed?limit=8&diversify=true`, { cache: "no-store" }),
          fetchAuthed(`${aiUrl}/drills?limit=5`, { cache: "no-store" }),
        ]);

        if (!feedRes.ok) {
          setStatus(`Failed to load feed: ${feedRes.status}`);
        } else {
          const json = (await feedRes.json()) as { data?: FeedRow[] };
          if (!cancelled) setFeed(Array.isArray(json.data) ? json.data : []);
        }

        if (!drillRes.ok) {
          setStatus((prev) => prev ?? `Failed to load drills: ${drillRes.status}`);
        } else {
          const json = (await drillRes.json()) as { data?: DrillListItem[] };
          if (!cancelled) setDrills(Array.isArray(json.data) ? json.data : []);
        }
      } catch (e: any) {
        if (!cancelled) setStatus(String(e?.message ?? e ?? "Unknown error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aiUrl]);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your daily loop: learn → practice → stay current."
      actions={
        <Link className="rounded-xl bg-text px-4 py-2 text-sm font-medium text-bg shadow-soft" href="/practice">
          Start a drill
        </Link>
      }
    >
      {loading ? <div className="text-sm text-muted">Loading…</div> : null}
      {status ? <div className="text-sm text-red-600">{status}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-1">
          <div className="text-xs font-medium text-muted">Today</div>
          <div className="mt-2 text-lg font-semibold tracking-tight">Pick one high-signal action.</div>
          <div className="mt-4 grid gap-3">
            <Link className="rounded-xl border border-border bg-bg px-4 py-3 text-sm font-medium hover:bg-card" href="/brief">
              Read your brief
            </Link>
            <Link className="rounded-xl border border-border bg-bg px-4 py-3 text-sm font-medium hover:bg-card" href="/learning-path">
              Continue your learning path
            </Link>
            <Link className="rounded-xl border border-border bg-bg px-4 py-3 text-sm font-medium hover:bg-card" href="/practice">
              Practice a drill
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-muted">News</div>
              <div className="mt-1 text-sm font-medium">Latest</div>
            </div>
            <Link className="text-sm text-muted hover:text-text" href="/feed">
              Open feed
            </Link>
          </div>

          <div className="mt-4 grid gap-3">
            {feed.length === 0 ? <div className="text-sm text-muted">No feed cards yet.</div> : null}
            {feed.slice(0, 8).map((row) => (
              <div key={row.id} className="rounded-xl border border-border bg-bg p-4">
                <div className="text-xs font-medium text-muted">{row.category ?? ""}</div>
                <div className="mt-2 text-sm font-semibold tracking-tight">{row.card?.title ?? "Untitled"}</div>
                {row.card?.what_happened ? (
                  <div className="mt-2 text-sm leading-relaxed text-muted">
                    {String(row.card.what_happened).slice(0, 160)}
                    {String(row.card.what_happened).length > 160 ? "…" : ""}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted">Practice</div>
            <div className="mt-1 text-sm font-medium">Recent drills</div>
          </div>
          <Link className="text-sm text-muted hover:text-text" href="/practice/history">
            View history
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {drills.length === 0 ? <div className="text-sm text-muted">No drills yet.</div> : null}
          {drills.slice(0, 4).map((d) => (
            <Link
              key={d.id}
              href={`/practice?drill=${encodeURIComponent(d.id)}`}
              className="rounded-xl border border-border bg-bg p-4 hover:bg-card"
            >
              <div className="text-xs text-muted">{d.created_at ?? ""}</div>
              <div className="mt-1 text-sm font-semibold tracking-tight">
                {(d.setting ?? "") + (d.goal ? ` • ${d.goal}` : "")}
              </div>
              <div className="mt-2 text-sm text-muted">Status: {d.status ?? ""}</div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
