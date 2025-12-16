"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Vapi from "@vapi-ai/web";
import { Send, Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

import AppShell from "../../src/components/AppShell";
import { Button } from "../../src/components/ui/Button";
import { Card, CardContent } from "../../src/components/ui/Card";
import { Input } from "../../src/components/ui/Input";
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

type ChatMessage = {
  role: "user" | "coach";
  content: string;
};

export default function PracticePage() {
  const searchParams = useSearchParams();
  const aiUrl = useMemo(() => process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8001", []);
  const vapiPublicKey = useMemo(() => process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "", []);
  const vapiAssistantId = useMemo(() => process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "", []);

  const vapiRef = useRef<any>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [drillSessionId, setDrillSessionId] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [voiceActive, setVoiceActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");

  const [context, setContext] = useState("");

  const lastCoachMessage = messages.find(m => m.role === "coach")?.content || "";

  // Initialize Vapi
  useEffect(() => {
    if (!vapiPublicKey || !vapiAssistantId) {
      console.warn("Vapi not configured - voice mode will be disabled");
      return;
    }

    try {
      const vapi = new Vapi(vapiPublicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setVoiceActive(true);
        setMode("voice");
      });

      vapi.on("call-end", () => {
        setVoiceActive(false);
      });

      vapi.on("message", (msg: any) => {
        if (msg.type === "transcript" && msg.transcript) {
          const role = msg.role === "user" ? "user" : "coach";
          setMessages(prev => [...prev, { role, content: msg.transcript }]);
        }
      });

      vapi.on("error", (error: any) => {
        console.error("Vapi error event:", {
          type: error?.type,
          stage: error?.stage,
          message: error?.error?.message,
          details: error?.error,
          fullError: error,
        });
        setStatus(`Voice error: ${error?.message || "Unknown error"}`);
        setMode("text");
      });

      return () => {
        vapi.stop();
      };
    } catch (e) {
      console.error("Failed to initialize Vapi:", e);
    }
  }, [vapiPublicKey, vapiAssistantId]);

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
          constraints: context.trim(),
          lesson_ids: [],
        }),
      });

      if (!res.ok) {
        setStatus(`Failed to start drill: ${res.status}`);
        return;
      }

      const data = (await res.json()) as any;
      const drillId = data.id || data.drill_session_id;
      console.log("Drill started:", {
        drillId,
        provider: data.provider,
        hasVapiConfig: !!data.vapi,
        vapiConfig: data.vapi,
        context: context.trim(),
      });
      
      const normalizedDrill: DrillSession = {
        ...data,
        id: drillId,
      };
      
      setDrill(normalizedDrill);
      setDrillSessionId(drillId);
      setMessages([]);
    } catch (e: any) {
      setStatus(String(e?.message ?? e ?? "Unknown error"));
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !sessionId) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetchAuthed(`${aiUrl}/coach/sessions/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        setStatus(`Failed to send message: ${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.coach_message) {
        setMessages(prev => [...prev, { role: "coach", content: data.coach_message }]);
      }
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
      
      const callConfig: any = {
        assistantId: vapiAssistantId,
      };

      if (systemPrompt && systemPrompt.trim()) {
        const contextualPrompt = `${systemPrompt}\n\nUser Context: ${context.trim()}`;
        callConfig.assistantOverrides = {
          systemPrompt: contextualPrompt,
        };
      } else if (context.trim()) {
        callConfig.assistantOverrides = {
          systemPrompt: `You are Sage, a friendly conversation coach. Help the user practice conversation skills based on this context: ${context.trim()}`,
        };
      }

      console.log("Vapi call config:", callConfig);
      
      const startPromise = vapiRef.current.start(callConfig);
      await startPromise;
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
      setMode("text");
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
      subtitle="Provide context for your conversation practice and start talking with your AI coach"
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
            {/* Context Input - Hidden when drill is active */}
            {!drill && (
              <Card variant="elevated" className="border-0 shadow-lg bg-gradient-to-br from-surface to-surface-elevated">
                <CardContent className="p-4 sm:p-6 pt-8 sm:pt-10">
                  <div className="space-y-4 sm:space-y-5">
                    <label className="text-sm sm:text-base font-semibold text-text block">
                      What would you like to practice?
                    </label>

                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="Describe your conversation scenario: networking event, job interview, difficult conversation, etc."
                      className="w-full h-28 sm:h-32 rounded-xl border border-border-subtle bg-surface px-3 sm:px-4 py-3 text-sm sm:text-base text-text placeholder-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                      maxLength={500}
                    />
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                      <p className="text-xs sm:text-sm text-muted">
                        {context.trim() ? "Sage will tailor the practice to your scenario" : "Optional: Skip to start an open conversation"}
                      </p>
                      <span className="text-xs text-muted font-mono self-end sm:self-auto">
                        {context.length}/500
                      </span>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {status && (
                        <div className="rounded-xl border border-error/20 bg-error-subtle/50 p-4 sm:p-5 pt-5 sm:pt-6">
                          <p className="text-sm text-error font-medium">{status}</p>
                        </div>
                      )}

                      <Button 
                        variant="primary" 
                        size="md" 
                        onClick={startDrill} 
                        className="w-full py-3 sm:py-4 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        Start Practice
                      </Button>
                      
                      {!context.trim() && (
                        <p className="text-xs sm:text-sm text-center text-muted bg-surface-elevated rounded-lg p-4 pt-5 border border-border-subtle">
                          💡 You can explain your scenario during the conversation with Sage
                        </p>
                      )}
                    </div>
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
                  
                  {/* Mode Selector */}
                  <div className="flex gap-1 sm:gap-2 p-1 bg-surface-elevated rounded-xl border border-border-subtle">
                    <Button
                      variant={mode === "text" ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setMode("text")}
                      className="flex-1 rounded-lg text-xs sm:text-sm py-2 sm:py-2.5"
                    >
                      Text Chat
                    </Button>
                    <Button
                      variant={mode === "voice" ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setMode("voice")}
                      className="flex-1 rounded-lg text-xs sm:text-sm py-2 sm:py-2.5"
                      disabled={!vapiPublicKey || !vapiAssistantId}
                      title={!vapiPublicKey || !vapiAssistantId ? "Voice calling not configured" : ""}
                    >
                      Voice Call
                    </Button>
                  </div>
                </div>

                {/* Chat Messages */}
                <Card variant="elevated" className="h-80 sm:h-96 lg:h-[500px] border-0 shadow-xl bg-gradient-to-b from-surface to-surface-elevated">
                  <CardContent className="p-3 sm:p-4 lg:p-6 h-full flex flex-col pt-6 sm:pt-8 lg:pt-10">
                    <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 sm:pr-2">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center space-y-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-subtle to-primary-muted rounded-full flex items-center justify-center mx-auto">
                              <span className="text-primary text-lg sm:text-xl">💬</span>
                            </div>
                            <p className="text-xs sm:text-sm text-muted px-4">
                              {mode === "voice" ? "Click 'Start Call' to begin speaking with Sage" : "Type a message to start your conversation with Sage"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] sm:max-w-[80%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                              <div
                                className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 break-words ${
                                  msg.role === "user"
                                    ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg"
                                    : "bg-surface-elevated text-text border border-border-subtle shadow-sm"
                                }`}
                              >
                                <p className="text-xs sm:text-sm leading-relaxed break-words">{msg.content}</p>
                              </div>
                              <p className={`text-xs text-muted mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                                {msg.role === "user" ? "You" : "Sage"}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Input/Controls */}
                {mode === "text" ? (
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex gap-2 sm:gap-3">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type your message to Sage..."
                        className="flex-1 rounded-xl border-border-subtle focus:border-primary/50 focus:ring-primary/20 text-sm sm:text-base py-2.5 sm:py-3"
                      />
                      <Button 
                        variant="primary" 
                        size="md" 
                        onClick={sendMessage}
                        className="px-4 sm:px-6 rounded-xl shadow-lg hover:shadow-xl text-sm sm:text-base"
                        disabled={!input.trim()}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-5">
                    {voiceActive ? (
                      <Button
                        variant="secondary"
                        size="lg"
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
                        size="lg"
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
                )}

                {/* View History Link */}
                <div className="pt-2 sm:pt-3">
                  <Link href="/practice/history">
                    <Button variant="secondary" size="md" className="w-full rounded-xl text-sm sm:text-base py-2.5 sm:py-3">
                      View Practice History
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}