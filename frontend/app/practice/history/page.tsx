"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { fetchAuthed, requireAuthOrRedirect } from "../../../src/lib/authClient";

type DrillListItem = {
  id: string;
  provider?: string | null;
  status?: string | null;
  setting?: string | null;
  goal?: string | null;
  person?: string | null;
  time_budget?: string | null;
  lesson_ids?: string[] | null;
  feedback?: string | null;
  created_at?: string | null;
};

type DrillListResponse = {
  items: DrillListItem[];
  limit: number;
  offset: number;
};

export default function PracticeHistoryPage() {
  const aiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";
  }, []);

  const [status, setStatus] = useState<string | null>(null);
  const [items, setItems] = useState<DrillListItem[]>([]);

  useEffect(() => {
    requireAuthOrRedirect("/login");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus(null);
      try {
        const res = await fetchAuthed(`${aiUrl}/drills?limit=25&offset=0`, { method: "GET" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) {
          setStatus(`Failed to load drills: ${res.status}`);
          return;
        }
        const json = (await res.json()) as DrillListResponse;
        if (!cancelled) setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message ?? "Unknown error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [aiUrl]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>Practice History</h1>
        <Link href="/practice">Back to practice</Link>
      </div>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No drills yet.</div>
        ) : (
          items.map((d) => {
            const preview = String(d.feedback ?? "").trim();
            const previewShort = preview.length > 180 ? preview.slice(0, 180) + "…" : preview;
            return (
              <div
                key={d.id}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 600 }}>
                    {d.setting ?? ""} • {d.goal ?? ""} • {d.status ?? ""}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{d.created_at ?? ""}</div>
                </div>

                {previewShort ? (
                  <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{previewShort}</div>
                ) : (
                  <div style={{ marginTop: 8, opacity: 0.7 }}>No feedback yet.</div>
                )}

                <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
                  <Link href={`/practice?drill=${encodeURIComponent(d.id)}`}>Open</Link>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>id: {d.id}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
