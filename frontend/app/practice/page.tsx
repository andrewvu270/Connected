"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../src/lib/supabaseClient";

type ChatMessage = {
  role: "user" | "coach";
  content: string;
};

export default function PracticePage() {
  const aiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";
  }, []);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const data = res?.data;
      if (!data.session) {
        window.location.href = "/login";
      }
    });
  }, []);

  async function start() {
    setStatus(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch(`${aiUrl}/coach/sessions/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mode: "coach" })
    });

    if (!res.ok) {
      setStatus(`Failed to start session: ${res.status}`);
      return;
    }

    const out = await res.json();
    setSessionId(out.session_id);
    setMessages([{ role: "coach", content: "Let’s practice. What situation are you preparing for today?" }]);
  }

  async function send() {
    if (!sessionId) {
      setStatus("Start a session first");
      return;
    }
    const text = input.trim();
    if (!text) return;

    setInput("");
    setMessages((m: ChatMessage[]) => [...m, { role: "user", content: text }]);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch(`${aiUrl}/coach/sessions/${sessionId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: text })
    });

    if (!res.ok) {
      setStatus(`Failed to send: ${res.status}`);
      return;
    }

    const out = await res.json();
    const coachText = out.coach_message?.content ?? "";
    setMessages((m: ChatMessage[]) => [...m, { role: "coach", content: coachText }]);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 680 }}>
      <h1 style={{ margin: 0 }}>Practice</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Text-first coach mode (MVP)
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={start} style={{ padding: "10px 12px" }}>
          Start session
        </button>
        <a href="/feed" style={{ alignSelf: "center" }}>
          Feed
        </a>
      </div>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}

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
