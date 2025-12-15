"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "../../src/components/AppShell";
import { Badge } from "../../src/components/ui/Badge";
import { Button } from "../../src/components/ui/Button";
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from "../../src/components/ui/Card";
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

type SkillGroup = {
  phase: string;
  domains: { domain: string; lessons: SkillLessonSummary[] }[];
};

export default function LearningPathPage() {
  const aiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";
  }, []);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillLessonSummary[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeLessonSummary[]>([]);

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
    } catch (e: any) {
      setStatus(String(e?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [aiUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const skillGroups = useMemo((): SkillGroup[] => {
    const byPhase: Record<string, SkillLessonSummary[]> = {};
    for (const l of skills) {
      const phase = String(l.phase ?? "Other").trim() || "Other";
      (byPhase[phase] ||= []).push(l);
    }

    const phases = Object.keys(byPhase).sort((a, b) => a.localeCompare(b));
    return phases.map((phase) => {
      const phaseLessons = byPhase[phase] || [];
      const byDomain: Record<string, SkillLessonSummary[]> = {};
      for (const l of phaseLessons) {
        const domain = String(l.domain ?? "General").trim() || "General";
        (byDomain[domain] ||= []).push(l);
      }
      const domains = Object.keys(byDomain)
        .sort((a, b) => a.localeCompare(b))
        .map((domain) => ({
          domain,
          lessons: (byDomain[domain] || []).slice().sort((a, b) => a.title.localeCompare(b.title)),
        }));
      return { phase, domains };
    });
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
        lessons: (byCat[category] || []).slice().sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [knowledge]);

  return (
    <AppShell
      title="Lessons"
      subtitle="Browse skills by phase and domain, plus knowledge lessons by category."
      actions={
        <div className="flex items-center gap-3">
          <Button onClick={refresh} variant="primary" disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Link className="text-sm text-muted hover:text-text" href="/practice">
            Practice
          </Link>
        </div>
      }
    >
      {status ? <div className="text-sm text-red-600">{status}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill lessons</CardTitle>
            <CardSubtitle>Expand a phase, then a domain, then pick a lesson.</CardSubtitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="text-sm text-muted">Loading…</div> : null}
            {!loading && skills.length === 0 ? <div className="text-sm text-muted">No skill lessons found.</div> : null}

            <div className="grid gap-3">
              {skillGroups.map((phase) => {
                const phaseCount = phase.domains.reduce((acc, d) => acc + d.lessons.length, 0);
                return (
                  <details key={phase.phase} className="rounded-2xl border border-border bg-bg">
                    <summary className="cursor-pointer select-none px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold tracking-tight">{phase.phase}</div>
                        <div className="text-xs text-muted">{phaseCount} lessons</div>
                      </div>
                    </summary>

                    <div className="grid gap-2 px-5 pb-5">
                      {phase.domains.map((domain) => (
                        <details key={`${phase.phase}__${domain.domain}`} className="rounded-xl border border-border bg-card">
                          <summary className="cursor-pointer select-none px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="text-sm font-medium">{domain.domain}</div>
                              <div className="text-xs text-muted">{domain.lessons.length}</div>
                            </div>
                          </summary>

                          <div className="grid gap-2 px-4 pb-4">
                            {domain.lessons.map((l) => (
                              <div key={l.lesson_id} className="rounded-xl border border-border bg-bg p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <Link className="text-sm font-semibold tracking-tight hover:underline" href={`/lesson/skill/${encodeURIComponent(l.lesson_id)}`}>
                                    {l.title}
                                  </Link>
                                  <div className="flex flex-wrap gap-2">
                                    {l.read_time_minutes ? <Badge>{l.read_time_minutes} min</Badge> : null}
                                    {l.difficulty ? <Badge tone="accent">{l.difficulty}</Badge> : null}
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3">
                                  <Link href={`/lesson/skill/${encodeURIComponent(l.lesson_id)}`}>
                                    <Button size="sm">Open</Button>
                                  </Link>
                                  <Button size="sm" onClick={() => markLesson("skill", l.lesson_id, "started")}>
                                    Mark started
                                  </Button>
                                  <Button variant="primary" size="sm" onClick={() => markLesson("skill", l.lesson_id, "completed")}>
                                    Mark completed
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge lessons</CardTitle>
            <CardSubtitle>Expand a category and pick a lesson.</CardSubtitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="text-sm text-muted">Loading…</div> : null}
            {!loading && knowledge.length === 0 ? <div className="text-sm text-muted">No knowledge lessons found.</div> : null}

            <div className="grid gap-3">
              {knowledgeGroups.map((cat) => (
                <details key={cat.category} className="rounded-2xl border border-border bg-bg">
                  <summary className="cursor-pointer select-none px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold tracking-tight">{cat.category}</div>
                      <div className="text-xs text-muted">{cat.lessons.length} lessons</div>
                    </div>
                  </summary>

                  <div className="grid gap-2 px-5 pb-5">
                    {cat.lessons.map((l) => (
                      <div key={l.lesson_id} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <Link className="text-sm font-semibold tracking-tight hover:underline" href={`/lesson/knowledge/${encodeURIComponent(l.lesson_id)}`}>
                            {l.title}
                          </Link>
                          <div className="flex flex-wrap gap-2">
                            {l.read_time_minutes ? <Badge>{l.read_time_minutes} min</Badge> : null}
                            {l.difficulty ? <Badge tone="accent">{l.difficulty}</Badge> : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Link href={`/lesson/knowledge/${encodeURIComponent(l.lesson_id)}`}>
                            <Button size="sm">Open</Button>
                          </Link>
                          <Button size="sm" onClick={() => markLesson("knowledge", l.lesson_id, "started")}>
                            Mark started
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => markLesson("knowledge", l.lesson_id, "completed")}>
                            Mark completed
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
