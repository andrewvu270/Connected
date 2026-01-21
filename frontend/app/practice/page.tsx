"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

import AppShell from "../../src/components/AppShell";
import { Button } from "../../src/components/ui/Button";
import { Card, CardContent } from "../../src/components/ui/Card";
import MascotCanvas from "../../src/components/MascotCanvas";
import { fetchAuthed, requireAuthOrRedirect } from "../../src/lib/authClient";

type DrillSession = {
  id: string;
  drill_session_id?: string;
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
  coach_session_id?: string | null;
  updated_at?: string | null;
  vapi?: {
    webhook_url?: string;
    metadata?: Record<string, any>;
    assistant?: {
      system_prompt?: string;
    };
  };
};

export default function PracticePage() {
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001", []);
  const vapiPublicKey = useMemo(() => process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "", []);
  const vapiAssistantId = useMemo(() => process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "", []);

  const vapiRef = useRef<any>(null);
  const activeDrillIdRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);

  const [drill, setDrill] = useState<DrillSession | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [coachComments, setCoachComments] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [voiceActive, setVoiceActive] = useState(false);

  const coachCommentsStatus = useMemo(() => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes("coach comments") || s.includes("generating coach comments")) return status;
    return null;
  }, [status]);

  const topStatus = useMemo(() => {
    if (!status) return null;
    return coachCommentsStatus ? null : status;
  }, [status, coachCommentsStatus]);

  const coachSections = useMemo(() => {
    if (!coachComments) return null;
    const cleaned = coachComments.replaceAll("**", "");
    const lines = cleaned.split(/\r?\n/).map(l => l.trim());
    const sections: Array<{ title: string; items: string[]; paragraphs: string[] }> = [];
    let current: { title: string; items: string[]; paragraphs: string[] } | null = null;

    for (const line of lines) {
      if (!line) continue;
      const isBullet = line.startsWith("- ");
      const isHeading = !isBullet && line.endsWith(":") && line.length <= 80;
      if (isHeading) {
        current = { title: line.slice(0, -1), items: [], paragraphs: [] };
        sections.push(current);
        continue;
      }
      if (!current) {
        current = { title: "Coach comments", items: [], paragraphs: [] };
        sections.push(current);
      }
      if (isBullet) {
        current.items.push(line.slice(2).trim());
      } else {
        current.paragraphs.push(line);
      }
    }

    return sections;
  }, [coachComments]);

  // Initialize Vapi
  useEffect(() => {
    if (!vapiPublicKey || !vapiAssistantId) {
      console.warn("Vapi not configured - voice mode will be disabled");
      return;
    }

    try {
      const vapi = new Vapi(vapiPublicKey);
      vapiRef.current = vapi;

      const fetchCoachCommentsAfterCall = async () => {
        const id = activeDrillIdRef.current;
        if (!id) return;

        setFeedbackLoading(true);
        setCoachComments(null);
        setStatus("Generating coach comments...");

        let lastStatus: string | null = null;
        let lastEventsCount: number | null = null;
        let foundFeedback = false;

        const startedAt = Date.now();
        while (Date.now() - startedAt < 45000) {
          try {
            const res = await fetchAuthed(`${aiUrl}/drills/${id}`, { method: "GET" });

            if (res.ok) {
              const row = (await res.json()) as any;
              if (row && typeof row === "object") {
                setDrill(row);
                lastStatus = typeof row.status === "string" ? row.status : null;
                lastEventsCount = Array.isArray(row.events) ? row.events.length : null;
                if (typeof row.feedback === "string" && row.feedback.trim()) {
                  foundFeedback = true;
                  setCoachComments(row.feedback.trim());
                  setStatus(null);
                  break;
                }
              }
            }

          } catch {
            // ignore and retry
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setFeedbackLoading(false);

        if (!foundFeedback) {
          const statusStr = lastStatus ? `Drill status: ${lastStatus}.` : "";
          const eventsStr = typeof lastEventsCount === "number" ? `Events: ${lastEventsCount}.` : "";
          const completed = (lastStatus || "").toLowerCase() === "completed";
          setStatus(
            completed
              ? `Coach comments are still generating. ${statusStr} ${eventsStr} Try again in a few seconds.`
              : `Coach comments are not ready yet. ${statusStr} ${eventsStr} This usually means the backend did not receive the Vapi end-of-call report (webhook). Check VAPI_WEBHOOK_URL and VAPI_WEBHOOK_SECRET, then end the call again.`,
          );
        }
      };

      vapi.on("call-start", () => {
        setVoiceActive(true);
        setStatus(null);
      });

      vapi.on("call-end", () => {
        setVoiceActive(false);
        void fetchCoachCommentsAfterCall();
      });

      vapi.on("error", (error: any) => {
        let errorJson: string | null = null;
        try {
          errorJson = JSON.stringify(error, null, 2);
        } catch {
          errorJson = null;
        }
        console.error("Vapi error event:", {
          type: error?.type,
          stage: error?.stage,
          message: error?.error?.message ?? error?.message,
          details: error?.error,
          fullError: error,
          errorJson,
        });
        const statusMessage = error?.error?.message ?? error?.message ?? "Unknown error";
        setStatus(`Voice error: ${statusMessage}`);
      });

      return () => {
        vapi.stop();
      };
    } catch (e) {
      console.error("Failed to initialize Vapi:", e);
    }
  }, [vapiPublicKey, vapiAssistantId, aiUrl]);

  useEffect(() => {
    if (drill) return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startDrill();
  }, [drill]);

  async function startDrill() {
    setStatus(null);
    try {
      await requireAuthOrRedirect("/login");

      const res = await fetchAuthed(`${aiUrl}/mascot/drill/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "vapi",
          setting: "custom",
          goal: "practice_conversation",
          person: "coach",
          time_budget: "10min",
          constraints: "",
          lesson_ids: [],
        }),
      });

      if (!res.ok) {
        setStatus(`Failed to start drill: ${res.status}`);
        return;
      }

      const data = (await res.json()) as any;
      const drillId = data.id || data.drill_session_id;
      activeDrillIdRef.current = drillId;
      console.log("Drill started:", {
        drillId,
        provider: data.provider,
        hasVapiConfig: !!data.vapi,
        vapiConfig: data.vapi,
      });

      const normalizedDrill: DrillSession = {
        ...data,
        id: drillId,
      };

      setDrill(normalizedDrill);
      setCoachComments(null);
      setFeedbackLoading(false);
      setStatus(null);
    } catch (e: any) {
      setStatus(String(e?.message ?? e ?? "Unknown error"));
    }
  }

  async function startVoiceCall() {
    if (!vapiRef.current || !drill) return;

    if (!vapiPublicKey || !vapiAssistantId) {
      setStatus("Voice calling is not configured. Please use text mode.");
      return;
    }

    try {
      console.log("Starting Vapi call with:", {
        assistantId: vapiAssistantId,
        publicKeyLength: vapiPublicKey?.length,
        drillId: drill.id,
      });

      const systemPrompt = drill.vapi?.assistant?.system_prompt || drill.prompt?.system_prompt || "";
      const contextualPrompt = systemPrompt && systemPrompt.trim()
        ? systemPrompt
        : "You are Sage, a friendly conversation coach. Help the user practice conversation skills.";

      const assistantOverrides: any = {
        clientMessages: ["transcript", "status-update", "assistant.started"],
        serverMessages: ["transcript", "status-update", "end-of-call-report", "assistant.started"],
      };

      if (drill.vapi?.webhook_url) {
        assistantOverrides.server = { url: drill.vapi.webhook_url };
      }

      if (drill.vapi?.metadata) {
        assistantOverrides.metadata = drill.vapi.metadata;
      } else if (drill.id) {
        assistantOverrides.metadata = { drill_session_id: drill.id };
      }

      console.log("Vapi call config:", {
        assistantId: vapiAssistantId,
        assistantOverrides,
      });

      const startPromise = vapiRef.current.start(vapiAssistantId, assistantOverrides);
      await startPromise;

      if (contextualPrompt && contextualPrompt.trim()) {
        vapiRef.current.send({
          type: "add-message",
          message: {
            role: "system",
            content: contextualPrompt,
          },
          triggerResponseEnabled: false,
        });
      }
    } catch (e: any) {
      console.error("Vapi call error caught:", {
        message: e?.message,
        type: e?.type,
        stage: e?.stage,
        errorMessage: e?.error?.message,
        errorCode: e?.error?.code,
        errorDetails: e?.error,
        statusCode: e?.statusCode,
        status: e?.status,
        response: e?.response,
        fullError: JSON.stringify(e, null, 2),
      });
      const errorMsg = e?.error?.message ?? e?.message ?? String(e) ?? "Failed to start call";
      setStatus(`Voice call error: ${errorMsg}. Try text mode instead.`);
    }
  }

  function stopVoiceCall() {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  }

  return (
    <AppShell 
      title="Practice with Sage" 
      subtitle="Start talking with your AI coach"
    >
      {/* Combined Practice Screen - SaaS Style */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-16 items-start">
          {/* Left: Sage Mascot */}
          <div className="flex justify-center lg:justify-end order-2 lg:order-1">
            <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
              <MascotCanvas height={400} />
            </div>
          </div>

          {/* Right: Chat Interface */}
          <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
            {!drill && (
              <Card variant="elevated" className="border-0 shadow-lg bg-gradient-to-br from-surface to-surface-elevated">
                <CardContent className="p-4 sm:p-6 pt-8 sm:pt-10">
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-sm text-muted">Preparing your practice session…</p>
                    {topStatus && (
                      <div className="rounded-xl border border-error/20 bg-error-subtle/50 p-4 sm:p-5 pt-5 sm:pt-6">
                        <p className="text-sm text-error font-medium">{topStatus}</p>
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={startDrill}
                      className="w-full py-3 sm:py-4 text-sm sm:text-base font-semibold"
                    >
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {drill && (
              <>
                {/* Header */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-text">Practice Session</h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-success-subtle/20 rounded-full border border-success/20 self-start sm:self-auto">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-success">Active</span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                {topStatus && (
                  <div className="rounded-xl border border-error/20 bg-error-subtle/50 p-4 sm:p-5">
                    <p className="text-sm text-error font-medium">{topStatus}</p>
                  </div>
                )}
                

                {/* Coach Comments (after call) */}
                <Card variant="elevated" className="h-80 sm:h-96 lg:h-[500px] border-0 shadow-xl bg-gradient-to-b from-surface to-surface-elevated">
                  <CardContent className="p-3 sm:p-4 lg:p-6 h-full flex flex-col pt-6 sm:pt-8 lg:pt-10">
                    <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 sm:pr-2">
                      {coachSections ? (
                        <div className="space-y-4">
                          {coachSections.map((sec, idx) => (
                            <div key={idx} className="space-y-2">
                              <p className="text-sm font-semibold text-text">{sec.title}</p>
                              {sec.paragraphs.length > 0 && (
                                <div className="space-y-2">
                                  {sec.paragraphs.map((p, pidx) => (
                                    <p key={pidx} className="text-sm leading-relaxed text-text">{p}</p>
                                  ))}
                                </div>
                              )}
                              {sec.items.length > 0 && (
                                <div className="rounded-2xl bg-surface-elevated text-text border border-border-subtle shadow-sm p-4">
                                  <ul className="space-y-2">
                                    {sec.items.map((item, iidx) => (
                                      <li key={iidx} className="text-sm leading-relaxed">- {item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center space-y-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-subtle to-primary-muted rounded-full flex items-center justify-center mx-auto">
                              <span className="text-primary text-lg sm:text-xl">🎧</span>
                            </div>
                            <p className="text-xs sm:text-sm text-muted px-4">
                              {voiceActive
                                ? "Call in progress. Speak naturally — coach comments will appear after you end the call."
                                : (coachCommentsStatus
                                  ? coachCommentsStatus
                                  : (feedbackLoading
                                    ? "Generating coach comments…"
                                    : "Start a voice call. Coach comments will appear here after the call ends."))}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Input/Controls */}
                <div className="space-y-4 sm:space-y-5">
                  {voiceActive ? (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={stopVoiceCall}
                      className="w-full py-3 sm:py-4 rounded-xl border-error/20 hover:bg-error-subtle/20 text-sm sm:text-base"
                    >
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-error rounded-full animate-pulse"></div>
                        <span>End Call</span>
                      </div>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={startVoiceCall}
                      className="w-full py-3 sm:py-4 rounded-xl shadow-lg hover:shadow-xl text-sm sm:text-base"
                    >
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                        <span>Start Voice Call</span>
                      </div>
                    </Button>
                  )}
                </div>

                {/* View History Link */}
                <div className="pt-2 sm:pt-3" />
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}