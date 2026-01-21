"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ExternalLink, Sparkles, TrendingUp } from "lucide-react";

import AppShell from "../../src/components/AppShell";
import { Badge } from "../../src/components/ui/Badge";
import { Button } from "../../src/components/ui/Button";
import { Card, CardContent } from "../../src/components/ui/Card";
import { CategoryLottie, getCategoryGradient } from "../../src/components/CategoryLottie";
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
    image_url?: string | null;
  } | null;
};

function getCategoryColor(category: string | null): "primary" | "accent" | "neutral" {
  const cat = category?.toLowerCase() || "tech";
  // Map categories to badge tones
  if (["tech", "business", "science"].includes(cat)) return "primary";
  if (["politics", "culture"].includes(cat)) return "accent";
  return "neutral";
}



export default function FeedPage() {
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001", []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FeedRow[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const cardsRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const prevVisibleCountRef = useRef(0);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await requireAuthOrRedirect("/login");

      const res = await fetchAuthed(`${aiUrl}/news/feed?limit=50&diversify=true`, { cache: "no-store" });
      if (!res.ok) {
        setError(`Error: ${res.status}`);
        return;
      }

      const json = (await res.json()) as { data?: FeedRow[] };
      setData(Array.isArray(json.data) ? json.data : []);
      setVisibleCount(10);
      prevVisibleCountRef.current = 0;
    } catch (e: any) {
      setError(String(e?.message ?? e ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [aiUrl]);

  // Animate cards on data load
  useEffect(() => {
    if (!loading && data.length > 0 && cardsRef.current) {
      const children = Array.from(cardsRef.current.children);
      const startIdx = Math.max(0, Math.min(prevVisibleCountRef.current, children.length));
      const newCards = children.slice(startIdx);
      if (newCards.length === 0) {
        prevVisibleCountRef.current = visibleCount;
        return;
      }
      gsap.from(newCards, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
      });
      prevVisibleCountRef.current = visibleCount;
    }
  }, [loading, data.length, visibleCount]);

  useEffect(() => {
    if (loading) return;
    if (!loadMoreRef.current) return;
    if (visibleCount >= data.length) return;

    const el = loadMoreRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        setVisibleCount((v) => Math.min(v + 10, data.length));
      },
      { root: null, rootMargin: "600px", threshold: 0 },
    );

    obs.observe(el);
    return () => {
      obs.disconnect();
    };
  }, [loading, data.length, visibleCount]);

  // Empty state
  if (!loading && !error && data.length === 0) {
    return (
      <AppShell title="News Feed" subtitle="Stay current with curated stories">
        <div className="mx-auto mt-4xl max-w-2xl text-center">
          <div className="mb-lg flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary-subtle">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-sm text-title text-text">No stories yet</h3>
          <p className="text-body text-muted max-w-md mx-auto">
            We're curating high-signal stories across tech, business, and culture. Check back soon.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="News Feed" subtitle="Curated stories with conversation starters">
      {/* Page Actions */}
      <div className="mb-6 sm:mb-8 flex justify-end">
        <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
          <TrendingUp className="mr-2 h-4 w-4" />
          {loading ? "Refreshing..." : "Refresh Feed"}
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mx-auto mt-xl max-w-4xl text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
          <p className="mt-lg text-body text-muted">Loading stories...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border border-error/20 bg-error-subtle p-xl mb-2xl">
          <p className="text-body text-error">{error}</p>
        </div>
      )}

      {/* Feed Grid */}
      {!loading && data.length > 0 && (
        <>
          <div ref={cardsRef} className="grid gap-lg sm:gap-2xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto px-2 sm:px-0">
            {data.slice(0, visibleCount).map((row) => {
            const card = row.card;
            const categoryColor = getCategoryColor(row.category);

            return (
              <div key={row.id} className="group">
                <Card variant="elevated" className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer">
                  <Link href={`/feed/${row.id}`} className="flex flex-col h-full">
                    {/* Glassmorphism Image */}
                    <div className={`relative h-40 sm:h-48 w-full overflow-hidden bg-gradient-to-br ${getCategoryGradient(row.category)}`}>
                      {/* Glassmorphism overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 backdrop-blur-sm"></div>
                      
                      {/* Main icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CategoryLottie category={row.category} size="xl" />
                      </div>
                      
                      {/* Glassmorphism decorative elements */}
                      <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"></div>
                      <div className="absolute bottom-4 left-4 w-6 h-6 bg-white/15 backdrop-blur-sm rounded-full border border-white/20"></div>
                      <div className="absolute top-1/2 left-6 w-4 h-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"></div>
                      
                      {/* Additional glassmorphism elements */}
                      <div className="absolute top-6 left-1/3 w-3 h-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"></div>
                      <div className="absolute bottom-8 right-1/4 w-5 h-5 bg-white/15 backdrop-blur-sm rounded-full border border-white/25"></div>
                    </div>

                    <CardContent className="p-lg sm:p-2xl flex-1 flex flex-col min-w-0">
                      {/* Category Badge */}
                      {row.category && (
                        <Badge tone={categoryColor} className="mb-lg w-fit flex-shrink-0 text-xs">
                          {row.category}
                        </Badge>
                      )}

                      {/* Title */}
                      <h3 className="text-base sm:text-title text-text mb-lg leading-snug line-clamp-3 group-hover:text-primary transition-colors break-words">
                        {card?.title || "Untitled"}
                      </h3>

                      {/* Summary */}
                      {card?.what_happened && (
                        <p className="text-xs sm:text-body-sm text-muted leading-relaxed mb-lg line-clamp-2 flex-1 break-words">
                          {String(card.what_happened).slice(0, 150)}...
                        </p>
                      )}

                      {/* Talk Track Preview */}
                      {card?.talk_track && (
                        <div className="mb-lg p-lg rounded-xl bg-surface-elevated border border-border-subtle min-w-0">
                          <p className="text-xs sm:text-body-sm text-text-secondary italic break-words">
                            💬 "{String(card.talk_track).slice(0, 80)}..."
                          </p>
                        </div>
                      )}

                      {/* Smart Question */}
                      {card?.smart_question && (
                        <div className="mb-lg p-lg rounded-xl bg-primary-subtle border border-primary-muted/20 min-w-0">
                          <p className="text-xs sm:text-body-sm text-primary font-medium break-words">
                            ❓ {String(card.smart_question).slice(0, 80)}
                          </p>
                        </div>
                      )}

                      {/* Read More Indicator */}
                      <div className="mt-auto pt-lg border-t border-border-subtle">
                        <div className="text-xs sm:text-body-sm text-primary font-medium">
                          Click to read full story →
                        </div>
                      </div>
                    </CardContent>
                  </Link>

                  {/* External Source Button - Outside the main link */}
                  {card?.sources?.[0]?.url && (
                    <CardContent className="p-lg sm:p-2xl pt-0">
                      <a 
                        href={card.sources[0].url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="secondary" size="sm" className="w-full group/btn">
                          Read Original Source
                          <ExternalLink className="ml-2 h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                        </Button>
                      </a>
                    </CardContent>
                  )}
                </Card>
              </div>
            );
            })}
          </div>

          {visibleCount < data.length && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setVisibleCount((v) => Math.min(v + 10, data.length))}
              >
                Load more
              </Button>
              <div ref={loadMoreRef} className="h-1 w-full" />
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
