"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type BriefItem = {
  category?: string | null;
  title?: string | null;
  what_happened?: string | null;
  why_it_matters?: string[] | null;
  talk_track?: string | null;
};

type Brief = {
  audience?: string | null;
  date?: string | null;
  overview?: string | null;
  items?: BriefItem[] | null;
};

export default function BriefPage() {
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000", []);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);

  useEffect(() => {
    requireAuthOrRedirect("/login");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus(null);
      setLoading(true);
      try {
        const res = await fetchAuthed(`${aiUrl}/news/brief?audience=global`, {
          method: "GET",
          headers: {}
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          setStatus(`Failed to load brief: ${res.status}`);
          return;
        }

        const json = (await res.json()) as { brief?: Brief };
        if (!cancelled) setBrief(json?.brief ?? null);
      } catch (e: any) {
        setStatus(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [aiUrl]);

  const items = Array.isArray(brief?.items) ? brief!.items! : [];

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 760 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/learning-path">Learning Path</Link>
        <Link href="/feed">Feed</Link>
      </div>

      <h1 style={{ marginTop: 16, marginBottom: 0 }}>Today’s Brief</h1>

      {loading ? <div style={{ marginTop: 12, opacity: 0.8 }}>Loading…</div> : null}
      {status ? <div style={{ marginTop: 12, color: "#b00020" }}>{status}</div> : null}

      {brief?.overview ? (
        <p style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.5 }}>{brief.overview}</p>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {items.map((it: BriefItem, idx: number) => (
          <article
            key={idx}
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 12,
              padding: 12
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>{it.category ?? ""}</div>
            <div style={{ fontWeight: 600, marginTop: 6 }}>{it.title ?? ""}</div>
            {it.what_happened ? <div style={{ marginTop: 8, opacity: 0.9 }}>{it.what_happened}</div> : null}

            {Array.isArray(it.why_it_matters) && it.why_it_matters.length ? (
              <ul style={{ marginTop: 10, paddingLeft: 18, display: "grid", gap: 6 }}>
                {it.why_it_matters.map((b, i) => (
                  <li key={i} style={{ opacity: 0.9 }}>
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}

            {it.talk_track ? (
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                <span style={{ fontWeight: 600 }}>Talk track:</span> {it.talk_track}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
