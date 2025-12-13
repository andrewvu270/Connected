"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Vapi from "@vapi-ai/web";

import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type DrillSession = {
  id: string;
  provider?: string | null;
  status?: string | null;
  setting?: string | null;
  goal?: string | null;
  person?: string | null;
  time_budget?: string | null;
  lesson_ids?: string[] | null;
  prompt?: any;
  events?: any[] | null;
  transcript?: any;
  vapi_call_id?: string | null;
  updated_at?: string | null;
};

type ChatMessage = {
  role: "user" | "coach";
  content: string;
};

type VapiPayload = {
  webhook_url?: string;
  metadata?: Record<string, unknown>;
  assistant?: {
    system_prompt?: string;
  };
};

export default function PracticePage() {
  const aiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";
  }, []);

  const vapiPublicKey = useMemo(() => {
    return process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
  }, []);

  const vapiAssistantId = useMemo(() => {
    return process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "";
  }, []);

  const vapiRef = useRef<any>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [drillSessionId, setDrillSessionId] = useState<string | null>(null);
  const [vapiConfig, setVapiConfig] = useState<Record<string, unknown> | null>(null);
  const [drill, setDrill] = useState<DrillSession | null>(null);
  const [polling, setPolling] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [voiceActive, setVoiceActive] = useState(false);

  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [setting, setSetting] = useState("networking");
  const [goal, setGoal] = useState("avoid_silence");
  const [person, setPerson] = useState("stranger");
  const [timeBudget, setTimeBudget] = useState("5min");
  const [constraints, setConstraints] = useState("");
  const [lessonIdsText, setLessonIdsText] = useState("");

  const lastCoachMessage = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "coach") return messages[i].content;
    }
    return "";
  })();

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function speak(text: string) {
    const t = (text || "").trim();
    if (!t) return;

    setStatus(null);
    setSpeaking(true);
    try {
      const res = await fetchAuthed(`${aiUrl}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t })
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        setStatus(`TTS failed: ${res.status}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);

      const audio = new Audio(url);
      await audio.play();
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown error");
    } finally {
      setSpeaking(false);
    }
  }

  useEffect(() => {
    requireAuthOrRedirect("/login");
  }, []);

  useEffect(() => {
    if (!vapiPublicKey) return;
    if (vapiRef.current) return;

    const vapi = new (Vapi as any)(vapiPublicKey);
    vapiRef.current = vapi;

    const onCallStart = () => {
      setVoiceActive(true);
      setStatus(null);
    };
    const onCallEnd = () => {
      setVoiceActive(false);
    };
    const onError = (e: any) => {
      setStatus(e?.message ?? e?.error ?? "Vapi error");
      setVoiceActive(false);
    };
    const onMessage = (m: any) => {
      if (!m || typeof m !== "object") return;
      if (m.type === "transcript") {
        const role = (m.role || "").toLowerCase();
        const transcript = String(m.transcript || "").trim();
        if (!transcript) return;
        setMessages((prev) => [
          ...prev,
          {
            role: role === "assistant" ? "coach" : "user",
            content: transcript,
          },
        ]);
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("error", onError);
    vapi.on("message", onMessage);

    return () => {
      try {
        vapi.stop();
      } catch {
        // ignore
      }
      vapiRef.current = null;
    };
  }, [vapiPublicKey]);

  async function startCoachSession() {
    setStatus(null);
    setVapiConfig(null);
    setDrillSessionId(null);
    setDrill(null);

    const res = await fetchAuthed(`${aiUrl}/coach/sessions/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode: "coach" })
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      setStatus(`Failed to start session: ${res.status}`);
      return;
    }

    const out = await res.json();
    setSessionId(out.session_id);
    setMessages([{ role: "coach", content: "Let’s practice. What situation are you preparing for today?" }]);
  }

  async function startTextDrill() {
    setStatus(null);
    setVapiConfig(null);
    setDrill(null);

    const lesson_ids = lessonIdsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetchAuthed(`${aiUrl}/mascot/drill/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "text",
        setting,
        goal,
        person,
        time_budget: timeBudget,
        constraints: constraints.trim() ? constraints.trim() : null,
        lesson_ids
      })
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      setStatus(`Failed to start text drill: ${res.status}`);
      return;
    }

    const out = await res.json();
    setDrillSessionId(out.drill_session_id ?? null);
    setSessionId(out.coach_session_id ?? null);
    const opener = out.prompt?.opener ?? "Okay — let’s roleplay. What would you say next?";
    setMessages([{ role: "coach", content: String(opener) }]);

    if (autoSpeak) {
      await speak(String(opener));
    }
  }

  async function startVoiceDrill() {
    setStatus(null);
    setDrill(null);

    const lesson_ids = lessonIdsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetchAuthed(`${aiUrl}/mascot/drill/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "vapi",
        setting,
        goal,
        person,
        time_budget: timeBudget,
        constraints: constraints.trim() ? constraints.trim() : null,
        lesson_ids
      })
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      setStatus(`Failed to start voice drill: ${res.status}`);
      return;
    }

    const out = await res.json();
    setDrillSessionId(out.drill_session_id ?? null);

    const cfg = (out.vapi ?? null) as VapiPayload | null;
    setVapiConfig((cfg as any) ?? null);

    if (!cfg) {
      setStatus("Missing Vapi config from backend");
      return;
    }

    if (!vapiPublicKey) {
      setStatus("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY");
      return;
    }

    if (!vapiAssistantId) {
      setStatus("Missing NEXT_PUBLIC_VAPI_ASSISTANT_ID");
      return;
    }

    if (!vapiRef.current) {
      setStatus("Vapi not initialized");
      return;
    }

    try {
      const overrides: any = {
        metadata: cfg.metadata ?? {},
        serverUrl: cfg.webhook_url ?? "",
        server: cfg.webhook_url ? { url: cfg.webhook_url } : undefined,
      };

      await vapiRef.current.start(vapiAssistantId, overrides);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to start Vapi call");
    }
  }

  async function stopVoiceCall() {
    try {
      await vapiRef.current?.stop?.();
    } catch {
      // ignore
    } finally {
      setVoiceActive(false);
    }
  }

  useEffect(() => {
    if (!drillSessionId) return;

    const drillId = drillSessionId;

    let cancelled = false;
    let timer: any = null;

    async function tick() {
      try {
        const res = await fetchAuthed(`${aiUrl}/drills/${encodeURIComponent(drillId)}`, {
          method: "GET",
          headers: {}
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          if (!cancelled) setStatus(`Failed to load drill: ${res.status}`);
          return;
        }

        const json = (await res.json()) as DrillSession;
        if (!cancelled) setDrill(json);

        const s = (json?.status || "").toLowerCase();
        if (s === "completed" || s === "failed") {
          if (!cancelled) setPolling(false);
          return;
        }
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message ?? "Unknown error");
      }

      timer = setTimeout(tick, 1500);
    }

    setPolling(true);
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      setPolling(false);
    };
  }, [aiUrl, drillSessionId]);

  async function send() {
    if (!sessionId) {
      setStatus("Start a session first");
      return;
    }
    const text = input.trim();
    if (!text) return;

    setInput("");
    setMessages((m: ChatMessage[]) => [...m, { role: "user", content: text }]);

    const res = await fetchAuthed(`${aiUrl}/coach/sessions/${sessionId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: text })
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      setStatus(`Failed to send: ${res.status}`);
      return;
    }

    const out = await res.json();
    const coachText = out.coach_message?.content ?? "";
    setMessages((m: ChatMessage[]) => [...m, { role: "coach", content: coachText }]);

    if (autoSpeak && coachText) {
      await speak(String(coachText));
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 680 }}>
      <h1 style={{ margin: 0 }}>Practice</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Coach + roleplay drills (MVP)
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={setting}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSetting(e.target.value)}
            placeholder="setting (e.g. networking)"
            style={{ flex: 1, padding: 10 }}
          />
          <input
            value={goal}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setGoal(e.target.value)}
            placeholder="goal (e.g. avoid_silence)"
            style={{ flex: 1, padding: 10 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={person}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPerson(e.target.value)}
            placeholder="person (e.g. stranger)"
            style={{ flex: 1, padding: 10 }}
          />
          <input
            value={timeBudget}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTimeBudget(e.target.value)}
            placeholder="time budget (e.g. 5min)"
            style={{ flex: 1, padding: 10 }}
          />
        </div>

        <input
          value={constraints}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setConstraints(e.target.value)}
          placeholder="constraints (optional)"
          style={{ padding: 10 }}
        />
        <input
          value={lessonIdsText}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setLessonIdsText(e.target.value)}
          placeholder="lesson_ids (comma-separated, optional)"
          style={{ padding: 10 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={startCoachSession} style={{ padding: "10px 12px" }}>
          Start coach
        </button>
        <button onClick={startTextDrill} style={{ padding: "10px 12px" }}>
          Start text drill
        </button>
        <button onClick={startVoiceDrill} style={{ padding: "10px 12px" }}>
          Start voice drill
        </button>
        <button
          onClick={stopVoiceCall}
          disabled={!voiceActive}
          style={{ padding: "10px 12px" }}
        >
          Stop voice
        </button>
        <button
          onClick={() => speak(lastCoachMessage)}
          disabled={speaking || !lastCoachMessage}
          style={{ padding: "10px 12px" }}
        >
          {speaking ? "Speaking…" : "Speak last coach"}
        </button>
        <div style={{ alignSelf: "center", display: "flex", gap: 10 }}>
          <Link href="/learning-path">Learning Path</Link>
          <Link href="/mascot">Mascot</Link>
          <Link href="/feed">Feed</Link>
        </div>
      </div>

      <label style={{ display: "block", marginTop: 10, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={autoSpeak}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAutoSpeak(e.target.checked)}
          style={{ marginRight: 8 }}
        />
        Auto-speak coach replies (OpenAI TTS)
      </label>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}

      {drillSessionId ? (
        <p style={{ marginTop: 12, opacity: 0.8 }}>Drill session: {drillSessionId}</p>
      ) : null}

      {drill ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Drill status: <span style={{ fontWeight: 600 }}>{drill.status ?? ""}</span>
            {polling ? " (polling)" : ""}
            {drill.updated_at ? ` • updated ${drill.updated_at}` : ""}
          </div>

          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Events: {Array.isArray(drill.events) ? drill.events.length : 0}
            {drill.vapi_call_id ? ` • call_id: ${drill.vapi_call_id}` : ""}
          </div>

          {drill.transcript ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Transcript</div>
              <pre
                style={{
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  overflowX: "auto",
                  background: "rgba(0,0,0,0.03)"
                }}
              >
                {JSON.stringify(drill.transcript, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {vapiConfig ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>VAPI payload (hand this to your VAPI client)</div>
          <pre
            style={{
              marginTop: 6,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              overflowX: "auto",
              background: "rgba(0,0,0,0.03)"
            }}
          >
            {JSON.stringify(vapiConfig, null, 2)}
          </pre>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          padding: 12,
          minHeight: 240
        }}
      >
        {messages.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No messages yet.</div>
        ) : (
          messages.map((m: ChatMessage, idx: number) => (
            <div key={idx} style={{ marginTop: idx === 0 ? 0 : 10 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{m.role}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Type your reply..."
          style={{ flex: 1, padding: 10 }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              send();
            }
          }}
        />
        <button onClick={send} style={{ padding: "10px 12px" }}>
          Send
        </button>
      </div>
    </main>
  );
}
