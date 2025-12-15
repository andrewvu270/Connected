"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppShell from "../../../../src/components/AppShell";
import { fetchAuthed, requireAuthOrRedirect } from "../../../../src/lib/authClient";

type LessonType = "skill" | "knowledge";

type LessonBase = {
  lesson_id: string;
  title: string;
  difficulty?: string | null;
  read_time_minutes?: number | null;
  tags?: string[] | null;
  content?: any;
};

type SkillLessonDetail = LessonBase & {
  phase?: string | null;
  domain?: string | null;
  tier?: number | null;
};

type KnowledgeLessonDetail = LessonBase & {
  category?: string | null;
};

type LessonDetail = SkillLessonDetail | KnowledgeLessonDetail;

type ProgressRow = {
  user_id: string;
  lesson_type: string;
  lesson_id: string;
  status: "started" | "completed";
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function ContentView({ value }: { value: any }) {
  if (value == null) return null;

  if (typeof value === "string") {
    const parts = value.split("\n").map((p) => p.trim()).filter(Boolean);
    return (
      <div className="grid gap-3">
        {parts.map((p, i) => (
          <p key={i} className="m-0 text-sm leading-relaxed text-text">
            {p}
          </p>
        ))}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <ul className="m-0 grid gap-2 pl-5 text-sm text-text">
        {value.map((item, i) => (
          <li key={i}>
            <ContentView value={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, any>);
    return (
      <div className="grid gap-5">
        {entries.map(([k, v]) => (
          <div key={k} className="border-t border-border pt-4">
            <div className="text-sm font-semibold tracking-tight">{k}</div>
            <div className="mt-2">
            <ContentView value={v} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <div>{String(value)}</div>;
}

export default function LessonDetailPage() {
  const params = useParams() as { type?: string; id?: string };
  const type = (params.type || "").toLowerCase() as LessonType;
  const id = params.id || "";

  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000", []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [progress, setProgress] = useState<ProgressRow | null>(null);

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
      title={lesson?.title ?? "Lesson"}
      subtitle={null}
      actions={
        <Link className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium" href="/learning-path">
          Back
        </Link>
      }
    >
      {loading ? <div className="text-sm text-muted">Loading…</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!loading && lesson ? (
        <div className="grid gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="text-xs text-muted">
              <span className="font-medium text-text">{type}</span>
              {"phase" in lesson && lesson.phase ? ` • ${lesson.phase}` : ""}
              {"domain" in lesson && lesson.domain ? ` • ${lesson.domain}` : ""}
              {"category" in lesson && lesson.category ? ` • ${lesson.category}` : ""}
              {lesson.read_time_minutes ? ` • ${lesson.read_time_minutes} min` : ""}
              {lesson.difficulty ? ` • ${lesson.difficulty}` : ""}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => mark("started")}
                disabled={saving}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Mark started
              </button>
              <button
                onClick={() => mark("completed")}
                disabled={saving}
                className="rounded-xl bg-text px-4 py-2 text-sm font-medium text-bg disabled:opacity-60"
              >
                Mark completed
              </button>

              {progress?.status ? (
                <div className="text-sm text-muted">
                  Status: <span className="font-medium text-text">{progress.status}</span>
                </div>
              ) : null}

              <div className="ml-auto flex flex-wrap gap-4 text-sm text-muted">
                <Link className="hover:text-text" href="/practice">
                  Practice
                </Link>
                <Link className="hover:text-text" href="/feed">
                  Feed
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <ContentView value={lesson.content} />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
