"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "../../src/lib/supabaseClient";

type PhaseProgress = {
  phase: string;
  completed: number;
  total: number;
};

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

type LearningPathResponse = {
  suggested_phase?: string | null;
  phase_progress: PhaseProgress[];
  recommendations: {
    skills: SkillLessonSummary[];
    knowledge: KnowledgeLessonSummary[];
  };
};

export default function LearningPathPage() {
  const aiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";
  }, []);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [data, setData] = useState<LearningPathResponse | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const s = res?.data?.session;
      if (!s) {
        window.location.href = "/login";
      }
    });
  }, []);

  const refresh = useCallback(async () => {
    setStatus(null);
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getSession();
      const token = auth.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`${aiUrl}/learning_path/recommendations?skills_limit=5&knowledge_limit=2`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        setStatus(`Failed to load learning path: ${res.status}`);
        return;
      }

      const out = (await res.json()) as LearningPathResponse;
      setData(out);
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown error");
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
      const { data: auth } = await supabase.auth.getSession();
      const token = auth.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`${aiUrl}/progress/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lesson_type: lessonType,
          lesson_id: lessonId,
          status: statusValue
        })
      });

      if (!res.ok) {
        setStatus(`Failed to update progress: ${res.status}`);
        return;
      }

      await refresh();
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown error");
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 760 }}>
      <h1 style={{ margin: 0 }}>Learning Path</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Recommended next lessons (not locked — you can do anything).
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
        <button onClick={refresh} style={{ padding: "10px 12px" }} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <Link href="/mascot">Mascot</Link>
        <Link href="/practice">Practice</Link>
        <Link href="/feed">Feed</Link>
        <Link href="/brief">Brief</Link>
      </div>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}

      {data ? (
        <>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Suggested phase</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {data.suggested_phase ?? "(none)"}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Progress by phase</div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {(data.phase_progress ?? []).map((p: PhaseProgress) => (
                <div
                  key={p.phase}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{p.phase}</div>
                  <div style={{ opacity: 0.8 }}>
                    {p.completed}/{p.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Recommended skills</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {(data.recommendations?.skills ?? []).map((l: SkillLessonSummary) => (
                <div
                  key={l.lesson_id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: 12
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{l.title}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {l.phase ? `Phase: ${l.phase}` : ""}
                    {l.domain ? ` • Domain: ${l.domain}` : ""}
                    {l.read_time_minutes ? ` • ${l.read_time_minutes} min` : ""}
                    {l.difficulty ? ` • ${l.difficulty}` : ""}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                      onClick={() => markLesson("skill", l.lesson_id, "started")}
                      style={{ padding: "8px 10px" }}
                    >
                      Mark started
                    </button>
                    <button
                      onClick={() => markLesson("skill", l.lesson_id, "completed")}
                      style={{ padding: "8px 10px" }}
                    >
                      Mark completed
                    </button>
                  </div>
                </div>
              ))}

              {(data.recommendations?.skills ?? []).length === 0 ? (
                <div style={{ opacity: 0.7 }}>No skill recommendations found.</div>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Recommended knowledge</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {(data.recommendations?.knowledge ?? []).map((l: KnowledgeLessonSummary) => (
                <div
                  key={l.lesson_id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: 12
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{l.title}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {l.category ? `Category: ${l.category}` : ""}
                    {l.read_time_minutes ? ` • ${l.read_time_minutes} min` : ""}
                    {l.difficulty ? ` • ${l.difficulty}` : ""}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                      onClick={() => markLesson("knowledge", l.lesson_id, "started")}
                      style={{ padding: "8px 10px" }}
                    >
                      Mark started
                    </button>
                    <button
                      onClick={() => markLesson("knowledge", l.lesson_id, "completed")}
                      style={{ padding: "8px 10px" }}
                    >
                      Mark completed
                    </button>
                  </div>
                </div>
              ))}

              {(data.recommendations?.knowledge ?? []).length === 0 ? (
                <div style={{ opacity: 0.7 }}>No knowledge recommendations found.</div>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 16, opacity: 0.7 }}>Loading...</div>
      )}
    </main>
  );
}
