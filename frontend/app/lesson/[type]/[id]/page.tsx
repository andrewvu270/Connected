"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
      <div style={{ display: "grid", gap: 10 }}>
        {parts.map((p, i) => (
          <p key={i} style={{ margin: 0, lineHeight: 1.5 }}>
            {p}
          </p>
        ))}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
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
      <div style={{ display: "grid", gap: 12 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{k}</div>
            <ContentView value={v} />
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
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 860 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/learning-path">Back</Link>
        <Link href="/practice">Practice</Link>
        <Link href="/feed">Feed</Link>
      </div>

      {loading ? <div style={{ marginTop: 16, opacity: 0.8 }}>Loading…</div> : null}
      {error ? <div style={{ marginTop: 16, color: "#b00020" }}>{error}</div> : null}

      {!loading && lesson ? (
        <>
          <h1 style={{ marginTop: 16, marginBottom: 6 }}>{lesson.title}</h1>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            <span style={{ fontWeight: 600 }}>{type}</span>
            {"phase" in lesson && lesson.phase ? ` • ${lesson.phase}` : ""}
            {"domain" in lesson && lesson.domain ? ` • ${lesson.domain}` : ""}
            {"category" in lesson && lesson.category ? ` • ${lesson.category}` : ""}
            {lesson.read_time_minutes ? ` • ${lesson.read_time_minutes} min` : ""}
            {lesson.difficulty ? ` • ${lesson.difficulty}` : ""}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
            <button onClick={() => mark("started")} disabled={saving} style={{ padding: "10px 12px" }}>
              Mark started
            </button>
            <button onClick={() => mark("completed")} disabled={saving} style={{ padding: "10px 12px" }}>
              Mark completed
            </button>

            {progress?.status ? (
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Status: <span style={{ fontWeight: 600 }}>{progress.status}</span>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 18 }}>
            <ContentView value={lesson.content} />
          </div>
        </>
      ) : null}
    </main>
  );
}
