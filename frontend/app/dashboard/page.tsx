"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ArrowRight, Calendar, Clock, Sparkles, TrendingUp, FileText, MessageCircle, Target, BookOpen, Zap } from "lucide-react";

import AppShell from "../../src/components/AppShell";
import { Button } from "../../src/components/ui/Button";
import { Card, CardContent } from "../../src/components/ui/Card";
import { Badge } from "../../src/components/ui/Badge";
import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type BriefRow = {
  id: string;
  created_at?: string | null;
  card?: {
    title?: string | null;
    what_happened?: string | null;
    why_it_matters?: string[] | null;
    talk_track?: string | null;
    smart_question?: string | null;
  } | null;
  category?: string | null;
};

export default function DashboardPage() {
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001", []);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefRow[]>([]);

  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        await requireAuthOrRedirect("/login");

        // Fetch brief data
        const briefRes = await fetchAuthed(`${aiUrl}/news/brief?limit=5`, { cache: "no-store" });
        
        if (!briefRes.ok) {
          setStatus(`Failed to load brief: ${briefRes.status}`);
        } else {
          const json = (await briefRes.json()) as { data?: BriefRow[] };
          if (!cancelled) setBrief(Array.isArray(json.data) ? json.data : []);
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

  // Animate dashboard cards on load
  useEffect(() => {
    if (!loading && cardsRef.current) {
      const cards = cardsRef.current.children;
      gsap.from(cards, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      });
    }
  }, [loading]);

  return (
    <AppShell
      title="Daily Brief"
      subtitle="Stay informed and conversation-ready with today's curated topics"
    >
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
          <p className="mt-4 text-body text-muted">Loading your daily brief...</p>
        </div>
      )}
      
      {status && (
        <div className="rounded-2xl border border-error/20 bg-error-subtle p-6 mb-8">
          <p className="text-body text-error">{status}</p>
        </div>
      )}

      {!loading && (
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-subtle to-primary-muted shadow-sm">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-text">Today's Brief</h1>
                  <p className="text-muted text-sm">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              
              {/* Stats */}
              <div className="hidden sm:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{brief.length}</div>
                  <div className="text-xs text-muted uppercase tracking-wide">Topics</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">5-10</div>
                  <div className="text-xs text-muted uppercase tracking-wide">Min Read</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Link href="/practice">
                <Button variant="secondary" size="sm" className="group">
                  <Target className="h-4 w-4 mr-2" />
                  Practice Topics
                  <ArrowRight className="h-3 w-3 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/feed">
                <Button variant="secondary" size="sm" className="group">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Full Feed
                  <ArrowRight className="h-3 w-3 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Brief Content */}
          <div ref={cardsRef} className="space-y-8">
            {brief.length === 0 && (
              <Card variant="elevated" className="text-center py-16">
                <CardContent>
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/10 mx-auto mb-6">
                    <FileText className="h-8 w-8 text-muted opacity-60" />
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-2">No brief available yet</h3>
                  <p className="text-muted mb-6">Check back soon for today's curated conversation topics.</p>
                  <Link href="/feed">
                    <Button variant="secondary">
                      Explore News Feed
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            
            {brief.slice(0, 5).map((row, index) => {
              const card = row.card;
              
              return (
                <Card key={row.id} variant="elevated" className="group hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {row.category && (
                            <Badge tone="primary" className="mb-3 text-xs font-medium">
                              {row.category}
                            </Badge>
                          )}
                          <h2 className="text-xl font-semibold text-text leading-tight mb-2 group-hover:text-primary transition-colors">
                            {card?.title || "Untitled"}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted bg-surface-elevated px-3 py-1.5 rounded-full">
                          <TrendingUp className="h-3 w-3" />
                          Topic #{index + 1}
                        </div>
                      </div>

                      {/* What Happened */}
                      {card?.what_happened && (
                        <div className="bg-surface-elevated rounded-xl p-6 border border-border-subtle">
                          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            What Happened
                          </h3>
                          <p className="text-text-secondary leading-relaxed">
                            {card.what_happened}
                          </p>
                        </div>
                      )}

                      {/* Why It Matters */}
                      {card?.why_it_matters && card.why_it_matters.length > 0 && (
                        <div className="bg-surface-elevated rounded-xl p-6 border border-border-subtle">
                          <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-success rounded-full"></div>
                            Why It Matters
                          </h3>
                          <div className="space-y-3">
                            {card.why_it_matters.slice(0, 3).map((matter, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success-subtle flex-shrink-0 mt-0.5">
                                  <div className="h-2 w-2 rounded-full bg-success"></div>
                                </div>
                                <p className="text-text-secondary leading-relaxed flex-1">
                                  {matter}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Talk Track - Enhanced */}
                      {card?.talk_track && (
                        <div className="bg-gradient-to-r from-primary-subtle/20 to-accent-subtle/20 rounded-xl p-6 border border-primary/20">
                          <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-primary" />
                            Conversation Starter
                          </h3>
                          <div className="bg-surface/80 rounded-lg p-4 border border-border-subtle">
                            <p className="text-text-secondary leading-relaxed italic">
                              "{card.talk_track}"
                            </p>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                            <Sparkles className="h-3 w-3" />
                            <span>Use this to naturally bring up the topic in conversations</span>
                          </div>
                        </div>
                      )}

                      {/* Smart Question */}
                      {card?.smart_question && (
                        <div className="bg-gradient-to-r from-accent-subtle/20 to-warning-subtle/20 rounded-xl p-6 border border-accent/20">
                          <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-accent" />
                            Smart Question
                          </h3>
                          <div className="bg-surface/80 rounded-lg p-4 border border-border-subtle">
                            <p className="text-text-secondary leading-relaxed">
                              {card.smart_question}
                            </p>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                            <TrendingUp className="h-3 w-3" />
                            <span>Ask this to deepen the conversation and show engagement</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer CTA */}
          {brief.length > 0 && (
            <div className="mt-12 text-center">
              <Card variant="elevated" className="bg-gradient-to-r from-primary-subtle/10 to-accent-subtle/10">
                <CardContent className="py-8">
                  <h3 className="text-lg font-semibold text-text mb-2">Ready to practice?</h3>
                  <p className="text-muted mb-6">Use these topics with Croco to build your conversation confidence</p>
                  <Link href="/practice">
                    <Button variant="primary" className="shadow-lg hover:shadow-xl">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start Practicing
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}