"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import MascotCanvas from "./MascotCanvas";
import { supabase } from "../../src/lib/supabaseClient";

type MascotAdviseResponse = {
  input: Record<string, unknown>;
  recommendations: {
    lessons: any[];
    brief_topics: any[];
    conversation_kit: any;
  };
  citations: any[];
};

export default function MascotPage() {
  const aiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";
  }, []);

  const [setting, setSetting] = useState("networking");
  const [goal, setGoal] = useState("avoid_silence");
  const [person, setPerson] = useState("stranger");
  const [timeBudget, setTimeBudget] = useState("5min");
  const [topicText, setTopicText] = useState("");
  const [constraints, setConstraints] = useState("");
  const [maxLessons, setMaxLessons] = useState(5);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [out, setOut] = useState<MascotAdviseResponse | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const data = res?.data;
      if (!data.session) {
        window.location.href = "/login";
      }
    });
  }, []);

  async function run() {
    setStatus(null);
    setLoading(true);
    setOut(null);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`${aiUrl}/mascot/advise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          setting,
          goal,
          person,
          time_budget: timeBudget,
          topic_text: topicText.trim() ? topicText.trim() : null,
          constraints: constraints.trim() ? constraints.trim() : null,
          max_lessons: Math.max(0, Math.min(5, Number(maxLessons) || 5))
        })
      });

      if (!res.ok) {
        setStatus(`Failed to get advice: ${res.status}`);
        return;
      }

      const json = (await res.json()) as MascotAdviseResponse;
      setOut(json);
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1100 }}>
      <h1 style={{ margin: 0 }}>Mascot Advisor</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Tell the mascot your context. Get up to 5 lesson picks + a conversation kit.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
        <Link href="/practice">Practice</Link>
        <Link href="/learning-path">Learning Path</Link>
        <Link href="/feed">Feed</Link>
        <Link href="/brief">Brief</Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 18,
          marginTop: 16,
          alignItems: "start"
        }}
      >
        <section
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 16,
            padding: 14
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Context</div>

          <label style={{ display: "block", marginTop: 10 }}>
            Setting
            <input
              value={setting}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSetting(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              placeholder="networking"
            />
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Goal
            <input
              value={goal}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setGoal(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              placeholder="avoid_silence"
            />
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Person
            <input
              value={person}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPerson(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              placeholder="stranger"
            />
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Time budget
            <input
              value={timeBudget}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTimeBudget(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              placeholder="5min"
            />
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Topic (optional)
            <input
              value={topicText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTopicText(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              placeholder="e.g. executive presence"
            />
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Constraints (optional)
            <input
              value={constraints}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConstraints(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              placeholder="e.g. short attention span"
            />
          </label>

          <label style={{ display: "block", marginTop: 10 }}>
            Max lessons (0–5)
            <input
              value={String(maxLessons)}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxLessons(Number(e.target.value))}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              type="number"
              min={0}
              max={5}
            />
          </label>

          <button
            onClick={run}
            style={{ padding: "10px 12px", marginTop: 14, width: "100%" }}
            disabled={loading}
          >
            {loading ? "Thinking..." : "Get advice"}
          </button>

          {status ? <div style={{ marginTop: 12 }}>{status}</div> : null}
        </section>

        <section style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Mascot</div>

          <MascotCanvas />

          <div
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 16,
              padding: 14
            }}
          >
            <div style={{ fontWeight: 600 }}>Output</div>

            {!out ? <div style={{ marginTop: 10, opacity: 0.7 }}>Run the advisor to see recommendations.</div> : null}

            {out ? (
              <>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Recommended lessons</div>
                  <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                    {(out.recommendations?.lessons ?? []).map((l: any, idx: number) => (
                      <div
                        key={`${l.lesson_id ?? idx}`}
                        style={{
                          border: "1px solid rgba(0,0,0,0.12)",
                          borderRadius: 12,
                          padding: 12
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{l.title ?? "Untitled"}</div>
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                          {l.type ? `Type: ${l.type}` : ""}
                          {l.phase ? ` • Phase: ${l.phase}` : ""}
                          {l.domain ? ` • Domain: ${l.domain}` : ""}
                          {l.category ? ` • Category: ${l.category}` : ""}
                          {l.read_time_minutes ? ` • ${l.read_time_minutes} min` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Conversation kit</div>
                  <pre
                    style={{
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      overflowX: "auto",
                      background: "rgba(0,0,0,0.03)"
                    }}
                  >
                    {JSON.stringify(out.recommendations?.conversation_kit ?? {}, null, 2)}
                  </pre>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Citations</div>
                  <pre
                    style={{
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      overflowX: "auto",
                      background: "rgba(0,0,0,0.03)"
                    }}
                  >
                    {JSON.stringify(out.citations ?? [], null, 2)}
                  </pre>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
