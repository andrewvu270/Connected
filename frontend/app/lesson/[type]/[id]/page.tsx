"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { Clock, CheckCircle, ArrowLeft, MessageCircle } from "lucide-react";

import AppShell from "../../../../src/components/AppShell";
import { Button } from "../../../../src/components/ui/Button";
import { Card, CardContent } from "../../../../src/components/ui/Card";
import { Badge } from "../../../../src/components/ui/Badge";
import { CategoryLottie } from "../../../../src/components/CategoryLottie";
import { fetchAuthed, requireAuthOrRedirect } from "../../../../src/lib/authClient";

type LessonType = "skill" | "knowledge";

type LessonDetail = {
  lesson_id: string;
  title: string;
  read_time_minutes?: number | null;
  content?: {
    micro_topics?: Array<{
      title: string;
      content: string;
      conversation_tip?: string;
      example_questions?: string[];
    }>;
    conversation_tip?: string;
    example_questions?: string[];
  };
};

type ProgressRow = {
  user_id: string;
  lesson_type: string;
  lesson_id: string;
  status: "started" | "completed";
};

export default function LessonDetailPage() {
  const params = useParams() as { type?: string; id?: string };
  const type = (params.type || "").toLowerCase() as LessonType;
  const id = params.id || "";

  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001", []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [progress, setProgress] = useState<ProgressRow | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const topicsRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await requireAuthOrRedirect("/login");

      const endpoint = type === "knowledge" ? "knowledge_lessons" : "lessons";
      const res = await fetchAuthed(`${aiUrl}/${endpoint}/${encodeURIComponent(id)}`, { method: "GET" });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setError(`Failed to load lesson: ${res.status}`);
        return;
      }

      const json = (await res.json()) as LessonDetail;
      setLesson(json);
    } catch (e: any) {
      setError(String(e?.message ?? e ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [aiUrl, id, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subtle animations
  useEffect(() => {
    if (!loading && lesson) {
      const ctx = gsap.context(() => {
        if (headerRef.current) {
          gsap.from(headerRef.current, {
            opacity: 0,
            y: 20,
            duration: 0.6,
            ease: "power2.out"
          });
        }

        if (topicsRef.current) {
          gsap.from(topicsRef.current.children, {
            opacity: 0,
            y: 15,
            duration: 0.5,
            stagger: 0.1,
            delay: 0.2,
            ease: "power2.out"
          });
        }

        if (tipRef.current) {
          gsap.from(tipRef.current, {
            opacity: 0,
            y: 15,
            duration: 0.5,
            delay: 0.4,
            ease: "power2.out"
          });
        }

        if (questionsRef.current) {
          gsap.from(questionsRef.current.children, {
            opacity: 0,
            y: 15,
            duration: 0.5,
            stagger: 0.08,
            delay: 0.5,
            ease: "power2.out"
          });
        }
      });

      return () => ctx.revert();
    }
  }, [loading, lesson]);

  async function mark(status: "started" | "completed") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetchAuthed(`${aiUrl}/progress/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_type: type, lesson_id: id, status }),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const json = (await res.json()) as ProgressRow;
      if (!res.ok) {
        setError(`Failed to update progress: ${res.status}`);
        return;
      }
      setProgress(json);
    } catch (e: any) {
      setError(String(e?.message ?? e ?? "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title={null}
      subtitle={null}
    >
      {/* Page Actions */}
      <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/learning-path">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learning Path
          </Button>
        </Link>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
          <Clock className="mr-2 h-4 w-4" />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {loading && (
        <div className="text-center py-4xl">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
          <p className="mt-lg text-body text-muted">Loading lesson...</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-error/20 bg-error-subtle p-xl mb-2xl">
          <p className="text-body text-error">{error}</p>
        </div>
      )}

      {!loading && lesson && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Glassmorphism Hero Section */}
          <div ref={headerRef} className={`relative h-64 sm:h-80 w-full overflow-hidden rounded-2xl mb-8 sm:mb-12 ${type === 'skill' ? 'bg-gradient-to-br from-slate-600 to-slate-700' : 'bg-gradient-to-br from-blue-600 to-blue-700'}`}>
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/30 backdrop-blur-sm"></div>
            
            {/* Main Lottie icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <CategoryLottie category={type === 'skill' ? 'skills' : 'knowledge'} size="xl" className="w-24 h-24 sm:w-32 sm:h-32" />
            </div>
            
            {/* Glassmorphism decorative elements */}
            <div className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"></div>
            <div className="absolute bottom-6 left-6 w-8 h-8 bg-white/15 backdrop-blur-sm rounded-full border border-white/20"></div>
            <div className="absolute top-1/2 left-8 w-6 h-6 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"></div>
            <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-white/10 backdrop-blur-sm rounded-full border border-white/15"></div>
            
            {/* Additional glassmorphism elements */}
            <div className="absolute top-1/4 right-1/3 w-5 h-5 bg-white/12 backdrop-blur-sm rounded-full border border-white/25"></div>
            <div className="absolute bottom-1/4 left-1/4 w-7 h-7 bg-white/8 backdrop-blur-sm rounded-full border border-white/20"></div>
            
            {/* Lesson type badge with glassmorphism */}
            <div className="absolute top-6 left-6">
              <Badge tone="neutral" className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-medium capitalize">
                {type} Lesson
              </Badge>
            </div>
          </div>

          {/* Header Content */}
          <div className="mb-8 sm:mb-12">
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {lesson.read_time_minutes && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                  <Clock className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">{lesson.read_time_minutes} min read</span>
                </div>
              )}
              {progress?.status && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full border border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 capitalize">{progress.status}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full border border-blue-200">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Interactive Lesson</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-text mb-4 leading-tight">
              {lesson.title}
            </h1>
            
            {/* Subtitle */}
            <p className="text-base sm:text-lg text-muted max-w-3xl leading-relaxed">
              Master this skill through structured learning and practical exercises designed to boost your conversation confidence.
            </p>
          </div>

          {/* Learning Modules */}
          {lesson.content?.micro_topics && lesson.content.micro_topics.length > 0 && (
            <div className="mb-16">
              {/* Section Header */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-2">Learning Modules</h2>
                <p className="text-sm sm:text-base text-muted">Break down complex concepts into digestible parts</p>
              </div>

              <div ref={topicsRef} className="space-y-6 sm:space-y-8">
                {lesson.content.micro_topics.map((topic, idx) => (
                  <div key={idx} className="group">
                    {/* Module Number */}
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-600 text-white font-bold shadow-lg text-sm sm:text-base">
                        {idx + 1}
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-300 via-slate-200 to-transparent"></div>
                    </div>

                    {/* Topic Content Card */}
                    <Card variant="elevated" className="group-hover:shadow-xl transition-all duration-300 mb-4 sm:mb-6 bg-surface border-l-4 border-l-slate-400 shadow-md hover:shadow-lg">
                      <CardContent className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                        <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-slate-800 leading-tight">{topic.title}</h3>
                        <div className="prose prose-gray max-w-none">
                          {topic.content.split("\n").map((line, i) => (
                            line.trim() && (
                              <p key={i} className="text-sm sm:text-base text-text-secondary leading-relaxed mb-3 sm:mb-4 last:mb-0">
                                {line.trim()}
                              </p>
                            )
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Interactive Elements */}
                    {(topic.conversation_tip || (topic.example_questions && topic.example_questions.length > 0)) && (
                      <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                        {/* Conversation Tip */}
                        {topic.conversation_tip && (
                          <Card variant="elevated" className="border-l-4 border-l-blue-400 group-hover:shadow-lg transition-all duration-300 bg-blue-50 border border-blue-200">
                            <CardContent className="p-4 sm:p-6 pt-6 sm:pt-8">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-800 text-sm sm:text-base">
                                  Conversation Tip
                                </h4>
                                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                                  {topic.conversation_tip}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Practice Questions */}
                        {topic.example_questions && topic.example_questions.length > 0 && (
                          <Card variant="elevated" className="border-l-4 border-l-emerald-400 group-hover:shadow-lg transition-all duration-300 bg-emerald-50 border border-emerald-200">
                            <CardContent className="p-4 sm:p-6 pt-6 sm:pt-8">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold mb-3 sm:mb-4 text-emerald-800 text-sm sm:text-base">Practice Questions</h4>
                                <div className="space-y-2 sm:space-y-3">
                                  {topic.example_questions.slice(0, 3).map((question, qIdx) => (
                                    <div key={qIdx} className="bg-slate-50 rounded-lg p-2.5 sm:p-3 border border-slate-200 hover:border-slate-300 transition-colors">
                                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                                        <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-emerald-600 text-white text-xs font-bold rounded-full mr-2 shadow-sm flex-shrink-0">
                                          {qIdx + 1}
                                        </span>
                                        {question}
                                      </p>
                                    </div>
                                  ))}
                                  {topic.example_questions.length > 3 && (
                                    <p className="text-xs text-muted text-center pt-2">
                                      +{topic.example_questions.length - 3} more questions
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaways Section */}
          {(lesson.content?.conversation_tip || (lesson.content?.example_questions && lesson.content.example_questions.length > 0)) && (
            <div ref={tipRef} className="mb-16">
              {/* Section Header */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-2">Key Takeaways</h2>
                <p className="text-sm sm:text-base text-muted">Essential insights and practice opportunities</p>
              </div>

              <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
                {/* Main Conversation Tip */}
                {lesson.content?.conversation_tip && (
                  <Card variant="elevated" className="relative overflow-hidden border-l-4 border-l-primary hover:shadow-xl transition-all duration-300 bg-primary-subtle/8 border border-primary/20">
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-primary/5 rounded-bl-full"></div>
                    <CardContent className="relative p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                          Master Tip
                        </h3>
                        <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                          {lesson.content.conversation_tip}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Main Practice Questions */}
                {lesson.content?.example_questions && lesson.content.example_questions.length > 0 && (
                  <Card variant="elevated" className="relative overflow-hidden border-l-4 border-l-success hover:shadow-xl transition-all duration-300 bg-success-subtle/8 border border-success/20">
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-success/5 rounded-bl-full"></div>
                    <CardContent className="relative p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 bg-gradient-to-r from-success to-success-hover bg-clip-text text-transparent">
                          Practice Questions
                        </h3>
                        <div className="space-y-3 sm:space-y-4">
                          {lesson.content.example_questions.slice(0, 4).map((question, idx) => (
                            <div key={idx} className="group">
                              <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 pt-4 sm:pt-5 bg-surface-elevated rounded-xl border border-success/30 hover:border-success/50 hover:shadow-sm transition-all duration-200">
                                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-success to-success-hover text-white text-xs sm:text-sm font-bold rounded-full flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </div>
                                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed flex-1">
                                  {question}
                                </p>
                              </div>
                            </div>
                          ))}
                          {lesson.content.example_questions.length > 4 && (
                            <p className="text-xs text-muted text-center pt-2">
                              +{lesson.content.example_questions.length - 4} more questions available
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Action Section */}
          <div className="relative">
            <Card variant="elevated" className="border border-border-subtle shadow-xl bg-surface">
              <CardContent className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 lg:pt-10">
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-semibold text-text mb-2">Complete Your Learning</h3>
                  <p className="text-sm sm:text-base text-muted">
                    {progress?.status ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-success-subtle rounded-full text-success font-medium text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Marked as {progress.status}
                      </span>
                    ) : (
                      "Track your progress and continue your learning journey"
                    )}
                  </p>
                </div>

                {/* Progress Actions */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
                  <Button 
                    variant="secondary"
                    onClick={() => mark("started")} 
                    disabled={saving}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
                  >
                    {saving ? "Saving..." : "Mark Started"}
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={() => mark("completed")} 
                    disabled={saving}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 shadow-lg hover:shadow-xl text-sm sm:text-base"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Mark Completed"}
                  </Button>
                </div>

                {/* Next Steps */}
                <div className="border-t border-border-subtle pt-4 sm:pt-6">
                  <h4 className="font-semibold text-text mb-3 sm:mb-4 text-center text-sm sm:text-base">What's Next?</h4>
                  <div className="space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                    <Link href="/practice" className="group">
                      <div className="flex items-center gap-3 p-3 sm:p-4 pt-4 sm:pt-5 bg-surface-elevated rounded-xl border border-primary/30 hover:border-primary/50 hover:shadow-md transition-all duration-200">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-subtle to-primary-muted group-hover:from-primary group-hover:to-primary-hover group-hover:text-white transition-all duration-200 flex-shrink-0">
                          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-text group-hover:text-primary transition-colors text-sm sm:text-base">Practice with Sage</div>
                          <div className="text-xs sm:text-sm text-muted">Apply what you learned</div>
                        </div>
                      </div>
                    </Link>
                    
                    <Link href="/feed" className="group">
                      <div className="flex items-center gap-3 p-3 sm:p-4 pt-4 sm:pt-5 bg-surface-elevated rounded-xl border border-accent/30 hover:border-accent/50 hover:shadow-md transition-all duration-200">
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-subtle to-accent-muted group-hover:from-accent group-hover:to-accent-hover group-hover:text-white transition-all duration-200 flex-shrink-0">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-text group-hover:text-accent transition-colors text-sm sm:text-base">Explore News</div>
                          <div className="text-xs sm:text-sm text-muted">Find conversation topics</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}