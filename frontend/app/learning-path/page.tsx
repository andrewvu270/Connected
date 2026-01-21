"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { BookOpen, GraduationCap, ChevronDown, Clock, BarChart, CheckCircle, Circle } from "lucide-react";

import AppShell from "../../src/components/AppShell";
import { Badge } from "../../src/components/ui/Badge";
import { Button } from "../../src/components/ui/Button";
import { Card, CardContent } from "../../src/components/ui/Card";
import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type SkillLessonSummary = {
  lesson_id: string;
  title: string;
  phase?: string | null;
  domain?: string | null;
  tier?: number | null;
  difficulty?: string | null;
  read_time_minutes?: number | null;
};

type KnowledgeLessonSummary = {
  lesson_id: string;
  title: string;
  category?: string | null;
  difficulty?: string | null;
  read_time_minutes?: number | null;
};

type ProgressRow = {
  user_id: string;
  lesson_type: string;
  lesson_id: string;
  status: "started" | "completed";
};

export default function LearningPathPage() {
  const aiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001";
  }, []);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillLessonSummary[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeLessonSummary[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const skillCardsRef = useRef<HTMLDivElement>(null);
  const knowledgeCardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requireAuthOrRedirect("/login");
  }, []);

  const refresh = useCallback(async () => {
    setStatus(null);
    setLoading(true);
    try {
      const pageSize = 200;

      async function fetchAll<T>(path: string): Promise<T[]> {
        const out: T[] = [];
        for (let page = 0; page < 10; page++) {
          const offset = page * pageSize;
          const res = await fetchAuthed(`${aiUrl}${path}${path.includes("?") ? "&" : "?"}limit=${pageSize}&offset=${offset}`, {
            method: "GET",
            headers: {},
          });

          if (res.status === 401) {
            window.location.href = "/login";
            return [];
          }

          if (!res.ok) {
            throw new Error(`Failed to load ${path}: ${res.status}`);
          }

          const chunk = (await res.json()) as T[];
          if (!Array.isArray(chunk) || chunk.length === 0) break;
          out.push(...chunk);
          if (chunk.length < pageSize) break;
        }
        return out;
      }

      const [skillsRows, knowledgeRows] = await Promise.all([
        fetchAll<SkillLessonSummary>("/lessons"),
        fetchAll<KnowledgeLessonSummary>("/knowledge_lessons"),
      ]);

      setSkills(Array.isArray(skillsRows) ? skillsRows : []);
      setKnowledge(Array.isArray(knowledgeRows) ? knowledgeRows : []);

      // Fetch progress separately and handle errors gracefully
      try {
        const progressRows = await fetchAll<ProgressRow>("/progress/lessons");
        setProgress(Array.isArray(progressRows) ? progressRows : []);
      } catch (progressError) {
        console.warn("Failed to load progress data:", progressError);
        setProgress([]); // Continue without progress data
      }
    } catch (e: any) {
      setStatus(String(e?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [aiUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Helper function to get lesson progress status
  const getLessonProgress = useCallback((lessonType: "skill" | "knowledge", lessonId: string) => {
    return progress.find(p => p.lesson_type === lessonType && p.lesson_id === lessonId);
  }, [progress]);

  async function markLesson(lessonType: "skill" | "knowledge", lessonId: string, statusValue: "started" | "completed") {
    setStatus(null);
    try {
      const res = await fetchAuthed(`${aiUrl}/progress/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson_type: lessonType,
          lesson_id: lessonId,
          status: statusValue
        })
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        setStatus(`Failed to update progress: ${res.status}`);
        return;
      }
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown error");
    }
  }

  const skillGroups = useMemo(() => {
    const byPhase: Record<string, SkillLessonSummary[]> = {};
    for (const l of skills) {
      const phase = String(l.phase ?? "Other").trim() || "Other";
      (byPhase[phase] ||= []).push(l);
    }
    return Object.keys(byPhase)
      .sort((a, b) => a.localeCompare(b))
      .map((phase) => ({
        phase,
        lessons: (byPhase[phase] || []).sort((a, b) => {
          // First sort by domain, then by title within domain
          const domainA = String(a.domain ?? "").trim() || "ZZZ"; // Put empty domains at end
          const domainB = String(b.domain ?? "").trim() || "ZZZ";
          const domainCompare = domainA.localeCompare(domainB);
          if (domainCompare !== 0) return domainCompare;
          return a.title.localeCompare(b.title);
        })
      }));
  }, [skills]);

  const knowledgeGroups = useMemo(() => {
    const byCat: Record<string, KnowledgeLessonSummary[]> = {};
    for (const l of knowledge) {
      const cat = String(l.category ?? "General").trim() || "General";
      (byCat[cat] ||= []).push(l);
    }
    return Object.keys(byCat)
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({
        category,
        lessons: (byCat[category] || []).sort((a, b) => a.title.localeCompare(b.title))
      }));
  }, [knowledge]);

  function toggleGroup(groupId: string, cardsContainer: HTMLElement | null) {
    const isExpanded = expandedGroups.has(groupId);
    const newExpanded = new Set(expandedGroups);

    if (isExpanded) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);

      // Animate cards entrance when expanding
      if (cardsContainer) {
        setTimeout(() => {
          const cards = cardsContainer.querySelectorAll('.lesson-card');
          gsap.from(cards, {
            opacity: 0,
            y: 10,
            duration: 0.4,
            stagger: 0.06,
            ease: 'power2.out'
          });
        }, 50);
      }
    }

    setExpandedGroups(newExpanded);

    // Rotate caret
    const caret = document.querySelector(`[data-caret="${groupId}"]`);
    if (caret) {
      gsap.to(caret, {
        rotation: newExpanded.has(groupId) ? 180 : 0,
        duration: 0.25,
        ease: 'power2.out'
      });
    }
  }

  return (
    <AppShell
      title="Learning Path"
      subtitle="Skill lessons and knowledge by category"
    >
      {/* Page Actions */}
      <div className="mb-6 sm:mb-8 flex justify-end">
        <Button onClick={refresh} variant="secondary" size="sm" disabled={loading}>
          <Clock className="mr-2 h-4 w-4" />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {status && <div className="text-body-sm text-warning mb-6">{status}</div>}

      <div className="grid gap-xl lg:grid-cols-2">
        {/* Skill Lessons */}
        <div>
          <div className="mb-lg flex items-center gap-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-title">Skill Lessons</h2>
              <p className="text-body-sm text-muted">{skills.length} lessons</p>
            </div>
          </div>

          {loading && <p className="text-body-sm text-muted">Loading lessons...</p>}

          {!loading && skills.length === 0 && (
            <Card>
              <CardContent className="p-xl text-center">
                <p className="text-body-sm text-muted">No skill lessons found.</p>
              </CardContent>
            </Card>
          )}

          <div ref={skillCardsRef} className="space-y-md">
            {skillGroups.map((group) => {
              const groupId = `skill-${group.phase}`;
              const isExpanded = expandedGroups.has(groupId);

              return (
                <Card key={groupId}>
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleGroup(groupId, document.getElementById(`cards-${groupId}`))}
                      className="flex w-full items-center justify-between p-lg text-left transition-colors hover:bg-surface"
                    >
                      <div>
                        <h3 className="text-body font-medium">{group.phase}</h3>
                        <p className="text-label uppercase text-muted">{group.lessons.length} lessons</p>
                      </div>
                      <ChevronDown
                        data-caret={groupId}
                        className="h-5 w-5 text-muted transition-transform"
                      />
                    </button>

                    {isExpanded && (
                      <div id={`cards-${groupId}`} className="space-y-sm border-t border-border p-lg">
                        {group.lessons.map((lesson) => {
                          const lessonProgress = getLessonProgress("skill", lesson.lesson_id);
                          const isCompleted = lessonProgress?.status === "completed";
                          const isStarted = lessonProgress?.status === "started";
                          
                          return (
                            <div
                              key={lesson.lesson_id}
                              className={`lesson-card rounded-xl border p-md transition-all hover:shadow-soft ${
                                isCompleted 
                                  ? "border-success bg-success-subtle/20 hover:bg-success-subtle/30" 
                                  : isStarted
                                  ? "border-primary bg-primary-subtle/20 hover:bg-primary-subtle/30"
                                  : "border-border bg-surface hover:bg-bg"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-md">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Link
                                      href={`/lesson/skill/${encodeURIComponent(lesson.lesson_id)}`}
                                      className="text-body-sm font-medium hover:text-primary"
                                    >
                                      {lesson.title}
                                    </Link>
                                    {isCompleted && (
                                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                                    )}
                                    {isStarted && !isCompleted && (
                                      <Circle className="h-4 w-4 text-primary flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="mt-sm flex flex-wrap gap-xs">
                                    {lessonProgress && (
                                      <Badge tone="primary" className="text-xs">
                                        {isCompleted ? "Completed" : "Started"}
                                      </Badge>
                                    )}
                                    {lesson.read_time_minutes && (
                                      <Badge tone="neutral">
                                        <Clock className="mr-1 inline-block h-3 w-3" />
                                        {lesson.read_time_minutes} min
                                      </Badge>
                                    )}
                                    {lesson.difficulty && (
                                      <Badge tone="accent">
                                        <BarChart className="mr-1 inline-block h-3 w-3" />
                                        {lesson.difficulty}
                                      </Badge>
                                    )}
                                    {lesson.domain && (
                                      <Badge tone="neutral">{lesson.domain}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Knowledge Lessons */}
        <div>
          <div className="mb-lg flex items-center gap-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-title">Knowledge</h2>
              <p className="text-body-sm text-muted">{knowledge.length} lessons</p>
            </div>
          </div>

          {loading && <p className="text-body-sm text-muted">Loading lessons...</p>}

          {!loading && knowledge.length === 0 && (
            <Card>
              <CardContent className="p-xl text-center">
                <p className="text-body-sm text-muted">No knowledge lessons found.</p>
              </CardContent>
            </Card>
          )}

          <div ref={knowledgeCardsRef} className="space-y-md">
            {knowledgeGroups.map((group) => {
              const groupId = `knowledge-${group.category}`;
              const isExpanded = expandedGroups.has(groupId);

              return (
                <Card key={groupId}>
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleGroup(groupId, document.getElementById(`cards-${groupId}`))}
                      className="flex w-full items-center justify-between p-lg text-left transition-colors hover:bg-surface"
                    >
                      <div>
                        <h3 className="text-body font-medium">{group.category}</h3>
                        <p className="text-label uppercase text-muted">{group.lessons.length} lessons</p>
                      </div>
                      <ChevronDown
                        data-caret={groupId}
                        className="h-5 w-5 text-muted transition-transform"
                      />
                    </button>

                    {isExpanded && (
                      <div id={`cards-${groupId}`} className="space-y-sm border-t border-border p-lg">
                        {group.lessons.map((lesson) => {
                          const lessonProgress = getLessonProgress("knowledge", lesson.lesson_id);
                          const isCompleted = lessonProgress?.status === "completed";
                          const isStarted = lessonProgress?.status === "started";
                          
                          return (
                            <div
                              key={lesson.lesson_id}
                              className={`lesson-card rounded-xl border p-md transition-all hover:shadow-soft ${
                                isCompleted 
                                  ? "border-success bg-success-subtle/20 hover:bg-success-subtle/30" 
                                  : isStarted
                                  ? "border-primary bg-primary-subtle/20 hover:bg-primary-subtle/30"
                                  : "border-border bg-surface hover:bg-bg"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-md">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Link
                                      href={`/lesson/knowledge/${encodeURIComponent(lesson.lesson_id)}`}
                                      className="text-body-sm font-medium hover:text-primary"
                                    >
                                      {lesson.title}
                                    </Link>
                                    {isCompleted && (
                                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                                    )}
                                    {isStarted && !isCompleted && (
                                      <Circle className="h-4 w-4 text-primary flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="mt-sm flex flex-wrap gap-xs">
                                    {lessonProgress && (
                                      <Badge tone="primary" className="text-xs">
                                        {isCompleted ? "Completed" : "Started"}
                                      </Badge>
                                    )}
                                    {lesson.read_time_minutes && (
                                      <Badge tone="neutral">
                                        <Clock className="mr-1 inline-block h-3 w-3" />
                                        {lesson.read_time_minutes} min
                                      </Badge>
                                    )}
                                    {lesson.difficulty && (
                                      <Badge tone="accent">
                                        <BarChart className="mr-1 inline-block h-3 w-3" />
                                        {lesson.difficulty}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
