"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { Newspaper, MessageSquare } from "lucide-react";

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

  const overviewRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

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

      // Cards stagger
      if (cardsRef.current) {
        const cards = cardsRef.current.children;
        gsap.from(cards, {
          opacity: 0,
          y: 15,
          duration: 0.6,
          stagger: 0.08,
          delay: 0.2,
          ease: "power2.out"
        });
      }
    }
  }, [loading, brief]);

  const items = Array.isArray(brief?.items) ? brief!.items! : [];

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
          {/* Overview */}
          {brief.overview && (
            <div ref={overviewRef}>
              <Card className="mt-xl">
                <CardContent className="p-xl">
                  <div className="mb-md flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle">
                    <Newspaper className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="mb-sm text-title">Overview</h2>
                  <p className="text-body text-muted leading-relaxed">{brief.overview}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Brief Items */}
          <div ref={cardsRef} className="mt-xl space-y-lg">
            {items.map((item: BriefItem, idx: number) => (
              <Card key={idx} className="transition-all hover:shadow-refined">
                <CardContent className="p-xl">
                  {/* Category Badge */}
                  {item.category && (
                    <Badge tone="neutral">{item.category}</Badge>
                  )}

                  {/* Title */}
                  <h3 className="mt-md text-title leading-snug">
                    {item.title ?? "Untitled"}
                  </h3>

                  {/* What Happened */}
                  {item.what_happened && (
                    <p className="mt-md text-body text-muted leading-relaxed">
                      {item.what_happened}
                    </p>
                  )}

                  {/* Why It Matters */}
                  {Array.isArray(item.why_it_matters) && item.why_it_matters.length > 0 && (
                    <div className="mt-lg">
                      <div className="mb-sm text-label uppercase text-muted">
                        Why it matters
                      </div>
                      <ul className="space-y-sm pl-5 text-body-sm text-muted list-disc">
                        {item.why_it_matters.map((point, i) => (
                          <li key={i} className="leading-relaxed">{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Talk Track - Highlighted */}
                  {item.talk_track && (
                    <div className="mt-lg rounded-xl border border-border bg-primary-subtle/30 p-lg shadow-sm">
                      <div className="mb-sm flex items-center gap-2 text-label uppercase text-primary">
                        <MessageSquare className="h-3 w-3" />
                        Talk track
                      </div>
                      <p className="text-body-sm leading-relaxed text-text">
                        "{item.talk_track}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
