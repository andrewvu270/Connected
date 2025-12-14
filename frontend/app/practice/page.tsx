"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  feedback?: string | null;
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

function extractVapiEndOfCallReport(events: any[] | null | undefined): any | null {
  if (!Array.isArray(events) || events.length === 0) return null;

  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (!ev || typeof ev !== "object") continue;

    const msgType = ev?.message?.type;
    if (msgType === "end-of-call-report" || msgType === "call-ended-report") {
      return ev;
    }

    if (ev?.type === "end-of-call-report" || ev?.type === "call-ended-report") {
      return ev;
    }
  }

  return null;
}

function extractVapiEndOfCallSummary(events: any[] | null | undefined): string | null {
  const report = extractVapiEndOfCallReport(events);
  if (!report) return null;

  const reportBody = report?.message?.analysis ?? report?.analysis ?? report;
  const summary =
    reportBody?.summary ??
    reportBody?.artifact?.summary ??
    reportBody?.artifact?.report ??
    reportBody?.report;
  if (typeof summary === "string" && summary.trim()) return summary.trim();
  return null;
}

type TranscriptMsg = { role: "user" | "coach"; content: string };

function normalizeTranscript(transcript: any): TranscriptMsg[] {
  if (!transcript) return [];

  const asText = (v: any): string => {
    if (typeof v === "string") return v;
    if (v == null) return "";
    return String(v);
  };

  const parseItem = (item: any): TranscriptMsg | null => {
    if (typeof item === "string") {
      const t = item.trim();
      if (!t) return null;
      return { role: "coach", content: t };
    }

    if (!item || typeof item !== "object") return null;

    const roleRaw = (
      item.role ??
      item.speaker ??
      item.from ??
      item.userRole ??
      item.type
    );
    const roleStr = asText(roleRaw).toLowerCase();
    const role: "user" | "coach" =
      roleStr === "assistant" || roleStr === "ai" || roleStr === "coach" ? "coach" : "user";

    const content =
      item.content ??
      item.text ??
      item.transcript ??
      item.message ??
      item.utterance;
    const t = asText(content).trim();
    if (!t) return null;
    return { role, content: t };
  };

  if (Array.isArray(transcript)) {
    return transcript.map(parseItem).filter(Boolean) as TranscriptMsg[];
  }

  if (typeof transcript === "object") {
    const maybeMessages =
      transcript.messages ?? transcript.turns ?? transcript.items ?? transcript.transcript;
    if (Array.isArray(maybeMessages)) {
      return maybeMessages.map(parseItem).filter(Boolean) as TranscriptMsg[];
    }
  }

  const t = asText(transcript).trim();
  return t ? [{ role: "coach", content: t }] : [];
}


function generateDrillFeedback(drill: DrillSession | null): string | null {
  if (!drill) return null;
  const s = (drill.status ?? "").toLowerCase();
  if (s !== "completed" && s !== "failed") return null;

  const prompt = drill.prompt ?? {};
  const objective = typeof prompt.objective === "string" ? prompt.objective : "";
  const rubric = Array.isArray(prompt.rubric) ? (prompt.rubric as any[]) : [];
  const setting = typeof drill.setting === "string" ? drill.setting : "";
  const goalLabel = typeof drill.goal === "string" ? drill.goal : "";

  const msgs = normalizeTranscript(drill.transcript);
  const userMsgs = msgs.filter((m) => m.role === "user");
  const userTextRaw = userMsgs.map((m) => m.content).join("\n");
  const userText = userTextRaw.toLowerCase();

  const questionCount = (userText.match(/\?/g) ?? []).length;
  const openEndedCount = (userText.match(/\b(what|how|why|tell me|describe|when|where)\b[^\n\?]*\?/g) ?? []).length;
  const hasFollowUp = /\b(tell me more|what about|how about|can you elaborate|say more|why)\b/.test(userText);
  const sharedDetail = /\b(i\b|i'm\b|im\b|i’ve\b|i've\b|my\b|me\b)\b/.test(userText) && userText.replace(/\s+/g, " ").length >= 40;

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (openEndedCount >= 2) strengths.push("You asked multiple open-ended questions, which kept the conversation moving.");
  else improvements.push("Ask more open-ended questions (start with 'what', 'how', 'why') to keep it flowing.");

  if (hasFollowUp || questionCount >= 3) strengths.push("You used follow-up questions instead of switching topics too quickly.");
  else improvements.push("Add at least one follow-up (e.g. 'What got you into that?' / 'Tell me more about…').");

  if (sharedDetail) strengths.push("You shared a bit about yourself, which helps build rapport.");
  else improvements.push("Share one short relevant detail about yourself to build connection.");

  const goal = String(drill.goal ?? "").toLowerCase();
  if (goal.includes("avoid") || goal.includes("silence") || goal.includes("flow")) {
    if (questionCount >= 2) strengths.push("Your questions helped prevent awkward pauses.");
    else improvements.push("When it feels like it might stall, ask a simple next question to keep momentum.");
  }

  const summary = extractVapiEndOfCallSummary(drill.events);

  const lessonRefs = Array.isArray(prompt.lesson_refs) ? (prompt.lesson_refs as any[]) : [];
  const lessonTitles = lessonRefs
    .map((r) => (r && typeof r === "object" ? r.title : null))
    .filter((t) => typeof t === "string" && t.trim())
    .map((t) => String(t).trim());
  const lessonIds = Array.isArray(drill.lesson_ids) ? drill.lesson_ids.filter(Boolean) : [];
  const lessonLine = lessonTitles.length
    ? `\n\nLessons to apply next time: ${lessonTitles.join(", ")}`
    : lessonIds.length
      ? `\n\nLessons to apply next time: ${lessonIds.join(", ")}`
      : "";

  const strengthsText = strengths.length ? strengths.slice(0, 3).join(" ") : "You stayed engaged and kept participating.";
  const improvementsText = improvements.length ? improvements.slice(0, 3).join(" ") : "Keep doing the same structure: open-ended question → follow-up → share a small detail.";

  const nextStep = rubric.length
    ? `Next time, focus on: ${String(rubric[0] ?? "Ask one strong open-ended question").trim()}`
    : "Next time, focus on asking one strong open-ended question and one follow-up.";

  const headerBits: string[] = [];
  if (setting) headerBits.push(`Setting: ${setting}`);
  if (goalLabel) headerBits.push(`Goal: ${goalLabel}`);
  if (objective) headerBits.push(`Objective: ${objective}`);
  const objectiveLine = headerBits.length ? `${headerBits.join(" • ")}\n\n` : "";
  const vapiLine = summary ? `\n\nCall summary: ${summary}` : "";

  return (
    `${objectiveLine}` +
    `What you did well: ${strengthsText}\n\n` +
    `What to improve: ${improvementsText}\n\n` +
    `Next step: ${nextStep}` +
    `${lessonLine}` +
    `${vapiLine}`
  ).trim();
}

export default function PracticePage() {
  const searchParams = useSearchParams();
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
    try {
      const fromQuery = (searchParams?.get("drill") || "").trim();
      if (fromQuery) {
        setDrillSessionId(fromQuery);
        window.localStorage.setItem("lastDrillSessionId", fromQuery);
        return;
      }
      const saved = window.localStorage.getItem("lastDrillSessionId");
      if (saved && !drillSessionId) {
        setDrillSessionId(saved);
      }
    } catch {
      // ignore
    }
  }, [drillSessionId, searchParams]);

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

    try {
      window.localStorage.removeItem("lastDrillSessionId");
    } catch {
      // ignore
    }

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
    try {
      if (out.drill_session_id) {
        window.localStorage.setItem("lastDrillSessionId", String(out.drill_session_id));
      }
    } catch {
      // ignore
    }
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
    try {
      if (out.drill_session_id) {
        window.localStorage.setItem("lastDrillSessionId", String(out.drill_session_id));
      }
    } catch {
      // ignore
    }

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

  function clearDrill() {
    setVapiConfig(null);
    setDrill(null);
    setDrillSessionId(null);
    setPolling(false);
    try {
      window.localStorage.removeItem("lastDrillSessionId");
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!drillSessionId) return;

    const drillId = drillSessionId;

    let cancelled = false;
    let timer: any = null;
    let completedNoFeedbackTicks = 0;

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
          if (json?.feedback && String(json.feedback).trim()) {
            if (!cancelled) setPolling(false);
            return;
          }
          completedNoFeedbackTicks += 1;
          if (completedNoFeedbackTicks >= 12) {
            if (!cancelled) setPolling(false);
            return;
          }
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
          onClick={clearDrill}
          disabled={!drillSessionId}
          style={{ padding: "10px 12px" }}
        >
          Clear drill
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
          <Link href="/practice/history">History</Link>
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

          {(() => {
            const feedback = (drill.feedback && String(drill.feedback).trim()) ? String(drill.feedback).trim() : generateDrillFeedback(drill);
            if (!feedback) return null;
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Feedback</div>
                <div
                  style={{
                    marginTop: 6,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(0,0,0,0.03)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {feedback}
                </div>
              </div>
            );
          })()}
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
