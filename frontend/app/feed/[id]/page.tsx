"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Clock, TrendingUp } from "lucide-react";

import AppShell from "../../../src/components/AppShell";
import { Badge } from "../../../src/components/ui/Badge";
import { Button } from "../../../src/components/ui/Button";
import { Card, CardContent } from "../../../src/components/ui/Card";
import { CategoryLottie, getCategoryGradient } from "../../../src/components/CategoryLottie";
import { fetchAuthed, requireAuthOrRedirect } from "../../../src/lib/authClient";

type NewsDetail = {
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
  if (["tech", "business", "science"].includes(cat)) return "primary";
  if (["politics", "culture"].includes(cat)) return "accent";
  return "neutral";
}



export default function NewsDetailPage() {
  const params = useParams() as { id?: string };
  const id = params.id || "";
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001", []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await requireAuthOrRedirect("/login");

        // Backend doesn't have individual news endpoint, so fetch from feed list
        const res = await fetchAuthed(`${aiUrl}/news/feed?limit=50&diversify=true`, { cache: "no-store" });
        if (!res.ok) {
          setError(`Error: ${res.status}`);
          return;
        }

        const json = (await res.json()) as { data?: NewsDetail[] };
        if (cancelled) return;
        
        const feedData = Array.isArray(json.data) ? json.data : [];
        const newsItem = feedData.find(item => item.id === id);
        
        if (newsItem) {
          setNews(newsItem);
        } else {
          setError("Story not found");
        }
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
  }, [aiUrl, id]);

  if (loading) {
    return (
      <AppShell title="Loading..." subtitle="">
        <div className="mx-auto mt-xl max-w-4xl text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
          <p className="mt-lg text-body text-muted">Loading story...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !news) {
    return (
      <AppShell title="Error" subtitle="">
        <div className="mx-auto mt-xl max-w-4xl text-center">
          <p className="text-body text-error">{error || "Story not found"}</p>
          <Link href="/feed" className="mt-lg inline-block">
            <Button variant="secondary">Back to Feed</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const card = news.card;
  const categoryColor = getCategoryColor(news.category);

  return (
    <AppShell
      title={null}
      subtitle={null}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Page Actions */}
        <div className="mb-6 sm:mb-8">
          <Link href="/feed">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Feed
            </Button>
          </Link>
        </div>

        {/* Glassmorphism Hero Image */}
        <div className={`relative h-64 sm:h-80 w-full overflow-hidden rounded-2xl bg-gradient-to-br ${getCategoryGradient(news.category)} mb-2xl`}>
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/30 backdrop-blur-sm"></div>
          
          {/* Main Lottie icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <CategoryLottie category={news.category} size="xl" className="w-24 h-24 sm:w-32 sm:h-32" />
          </div>
          
          {/* Glassmorphism decorative elements */}
          <div className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"></div>
          <div className="absolute bottom-6 left-6 w-8 h-8 bg-white/15 backdrop-blur-sm rounded-full border border-white/20"></div>
          <div className="absolute top-1/2 left-8 w-6 h-6 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"></div>
          <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/15"></div>
          
          {/* Additional glassmorphism elements */}
          <div className="absolute top-1/4 right-1/3 w-5 h-5 bg-white/12 backdrop-blur-sm rounded-full border border-white/25"></div>
          <div className="absolute bottom-1/4 left-1/4 w-7 h-7 bg-white/8 backdrop-blur-sm rounded-full border border-white/20"></div>
          
          {/* Category overlay with glassmorphism */}
          <div className="absolute top-6 left-6">
            {news.category && (
              <Badge tone={categoryColor} className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-medium">
                {news.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="mb-4xl">
          <div className="flex flex-wrap items-center gap-md mb-lg">
            {news.created_at && (
              <div className="flex items-center gap-sm text-body-sm text-muted">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span className="break-words">
                  {new Date(news.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-display-2 text-text mb-lg leading-tight break-words">
            {card?.title || "Untitled"}
          </h1>
        </div>

        {/* Content */}
        <div className="space-y-2xl">
          {/* What Happened */}
          {card?.what_happened && (
            <Card variant="elevated">
              <CardContent className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                <h2 className="text-lg sm:text-title text-text mb-4 sm:mb-6">What Happened</h2>
                <p className="text-sm sm:text-body text-text-secondary leading-relaxed break-words">
                  {card.what_happened}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Why It Matters */}
          {card?.why_it_matters && card.why_it_matters.length > 0 && (
            <Card variant="elevated">
              <CardContent className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                <h2 className="text-lg sm:text-title text-text mb-4 sm:mb-6">Why It Matters</h2>
                <ul className="space-y-3 sm:space-y-4">
                  {card.why_it_matters.map((matter, idx) => (
                    <li key={idx} className="flex items-start gap-3 sm:gap-4">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-subtle flex-shrink-0 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      </div>
                      <p className="text-sm sm:text-body text-text-secondary leading-relaxed break-words flex-1">
                        {matter}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Talk Track */}
          {card?.talk_track && (
            <Card variant="elevated" className="border-l-4 border-l-primary">
              <CardContent className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                <h2 className="text-lg sm:text-title text-text mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
                  💬 Talk Track
                </h2>
                <p className="text-sm sm:text-body text-text-secondary leading-relaxed break-words italic">
                  "{card.talk_track}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* Smart Question */}
          {card?.smart_question && (
            <Card variant="elevated" className="border-l-4 border-l-accent">
              <CardContent className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                <h2 className="text-lg sm:text-title text-text mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
                  ❓ Smart Question
                </h2>
                <p className="text-sm sm:text-body text-accent font-medium leading-relaxed break-words">
                  {card.smart_question}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Source */}
          {card?.sources?.[0]?.url && (
            <Card variant="default">
              <CardContent className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                <h2 className="text-lg sm:text-title text-text mb-4 sm:mb-6">Read Original Source</h2>
                <a href={card.sources[0].url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="primary" className="w-full sm:w-auto">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open External Article
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}