"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { Newspaper } from "lucide-react";

import AppShell from "../../src/components/AppShell";
import { Card, CardContent } from "../../src/components/ui/Card";
import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type Brief = {
  audience?: string | null;
  date?: string | null;
  overview?: string | null;
};

type BriefResponse = {
  audience?: string;
  brief_date?: string;
  edition?: string | null;
  available_editions?: string[];
  latest_edition?: string | null;
  brief?: Brief | null;
};

export default function BriefPage() {
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001", []);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [edition, setEdition] = useState<"morning" | "midday" | "evening">("morning");
  const [availableEditions, setAvailableEditions] = useState<string[]>([]);
  const [latestEdition, setLatestEdition] = useState<string | null>(null);

  const overviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requireAuthOrRedirect("/login");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus(null);
      setLoading(true);
      try {
        const res = await fetchAuthed(`${aiUrl}/news/brief?audience=global&edition=${encodeURIComponent(edition)}`, {
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

        const json = (await res.json()) as BriefResponse;
        if (cancelled) return;
        setBrief(json?.brief ?? null);
        setAvailableEditions(Array.isArray(json?.available_editions) ? json.available_editions : []);
        setLatestEdition(typeof json?.latest_edition === "string" ? json.latest_edition : null);
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
  }, [aiUrl, edition]);

  // Animate overview and cards on load
  useEffect(() => {
    if (!loading && brief) {
      // Overview fade + slide
      if (overviewRef.current) {
        gsap.from(overviewRef.current, {
          opacity: 0,
          y: 10,
          duration: 0.5,
          ease: "power2.out"
        });
      }
    }
  }, [loading, brief]);

  // Empty state
  if (!loading && !brief) {
    return (
      <AppShell title="Today's Brief" subtitle="Your daily summary">
        <div className="mx-auto mt-4xl max-w-feed text-center">
          <div className="mb-lg flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-primary-subtle">
            <Newspaper className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-sm text-title text-muted">No brief available</h3>
          <p className="text-body-sm text-muted max-w-md mx-auto">
            Check back later for your daily summary of curated stories.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Today's Brief"
      subtitle="Your high-signal daily summary"
      actions={
        <Link href="/feed" className="text-body-sm text-primary hover:underline">
          View full feed
        </Link>
      }
    >
      {loading && <div className="text-body-sm text-muted">Loading brief...</div>}
      {status && <div className="text-body-sm text-warning">{status}</div>}

      {!loading && brief && (
        <div className="mx-auto max-w-feed">
          <div className="mt-xl flex flex-wrap items-center gap-3">
            <div className="text-body-sm text-muted">Edition:</div>
            {(["morning", "midday", "evening"] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEdition(e)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors " +
                  (edition === e
                    ? "bg-primary-subtle text-primary border-primary-muted/30"
                    : "bg-surface text-muted border-border-subtle hover:bg-surface-elevated")
                }
              >
                {e}
              </button>
            ))}
            {latestEdition ? (
              <div className="text-xs text-muted">Latest: {latestEdition}</div>
            ) : null}
            {availableEditions.length ? (
              <div className="text-xs text-muted">Available: {availableEditions.join(", ")}</div>
            ) : null}
          </div>

          {/* Overview */}
          {brief.overview && (
            <div ref={overviewRef}>
              <Card className="mt-xl">
                <CardContent className="p-xl">
                  <div className="mb-md flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle">
                    <Newspaper className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="mb-sm text-title">Overview</h2>
                  <p className="text-body text-muted leading-relaxed whitespace-pre-line">{brief.overview}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
