"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppShell from "../../../src/components/AppShell";
import { Badge } from "../../../src/components/ui/Badge";
import { Button } from "../../../src/components/ui/Button";
import { Card, CardContent } from "../../../src/components/ui/Card";
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
    <AppShell
      title="Practice History"
      subtitle="Your recent drills and feedback."
      actions={
        <Link href="/practice">
          <Button>Back to practice</Button>
        </Link>
      }
    >
      {status ? <div className="text-sm text-red-600">{status}</div> : null}

      <div className="mt-6 grid gap-3">
        {items.length === 0 ? <div className="text-sm text-muted">No drills yet.</div> : null}

        {items.map((d) => {
          const preview = String(d.feedback ?? "").trim();
          const previewShort = preview.length > 220 ? preview.slice(0, 220) + "…" : preview;
          const title = [d.setting, d.goal, d.status].filter(Boolean).join(" • ");

          return (
            <Card key={d.id}>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-tight">{title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {d.provider ? <Badge>{d.provider}</Badge> : null}
                      {d.time_budget ? <Badge>{d.time_budget}</Badge> : null}
                    </div>
                  </div>
                  <div className="text-xs text-muted">{d.created_at ?? ""}</div>
                </div>

                {previewShort ? (
                  <div className="mt-4 whitespace-pre-wrap text-sm text-muted">{previewShort}</div>
                ) : (
                  <div className="mt-4 text-sm text-muted">No feedback yet.</div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={`/practice?drill=${encodeURIComponent(d.id)}`}>
                    <Button size="sm" >
                      Open
                    </Button>
                  </Link>
                  <span className="text-xs text-muted">id: {d.id}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
