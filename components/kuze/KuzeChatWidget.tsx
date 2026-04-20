"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"

import { toast } from "@/components/ui/use-toast"

type ChatMode = "default" | "sales" | "ops" | "outreach" | "debrief"

type StreamEvent =
  | { type: "meta"; session_id: string }
  | { type: "text"; text: string }
  | { type: "error"; error: { code: string; message: string } }
  | { type: "done" }

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type KuzeChatWidgetProps = {
  accessToken?: string | null
  mode?: ChatMode
  contextOverride?: string
  appLabel?: string
}

const SESSION_STORAGE_KEY = "kuze_widget_session_id"

type ImportMetaEnvShape = {
  DEV?: boolean
  VITE_KUZE_URL?: string
}

function getImportMetaEnv(): ImportMetaEnvShape | undefined {
  try {
    return (import.meta as unknown as { env?: ImportMetaEnvShape }).env
  } catch {
    return undefined
  }
}

/** Works in Next.js and Vite. */
function getKuzeUrl(): string {
  const viteEnv = getImportMetaEnv()
  if (viteEnv?.DEV) return "/__kuze/api/chat"

  const nextBase = process.env.NEXT_PUBLIC_KUZE_URL?.trim().replace(/\/$/, "")
  if (nextBase) return `${nextBase}/api/chat`

  const viteBase = viteEnv?.VITE_KUZE_URL?.trim().replace(/\/$/, "")
  if (viteBase) return `${viteBase}/api/chat`

  const win = window as Window & { KUZE_URL?: string }
  if (typeof window !== "undefined" && win.KUZE_URL?.trim()) {
    return `${win.KUZE_URL.trim().replace(/\/$/, "")}/api/chat`
  }

  return "https://ai-twin-production.up.railway.app/api/chat"
}

async function streamChat(
  token: string,
  body: {
    session_id?: string
    mode: ChatMode
    user_message: string
    context_override?: string
  },
  onEvent: (e: StreamEvent) => void
) {
  const res = await fetch(getKuzeUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error((j as { error?: { message?: string } }).error?.message ?? res.statusText)
  }
  if (!res.body) throw new Error("No response body")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const line = block.split("\n").find((l) => l.startsWith("data: "))
      if (!line) continue
      const raw = line.slice(6).trim()
      if (!raw) continue
      try {
        onEvent(JSON.parse(raw) as StreamEvent)
      } catch {
        // ignore malformed events
      }
    }
  }
}

export default function KuzeChatWidget({
  accessToken,
  mode = "debrief",
  contextOverride,
  appLabel = "Crucible",
}: KuzeChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SESSION_STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [pulse, setPulse] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 3000)
    const t2 = setTimeout(() => setPulse(false), 5500)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
    }
  }, [])

  const send = useCallback(async () => {
    if (!accessToken || !input.trim() || streaming) return
    const text = input.trim()
    setInput("")
    setError(null)

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setStreaming(true)

    const assistantId = `a-${Date.now()}`
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

    try {
      await streamChat(
        accessToken,
        {
          session_id: sessionId ?? undefined,
          mode,
          user_message: text,
          context_override: contextOverride,
        },
        (event) => {
          if (event.type === "meta") {
            setSessionId(event.session_id)
            try {
              sessionStorage.setItem(SESSION_STORAGE_KEY, event.session_id)
            } catch {
              // ignore
            }
          } else if (event.type === "text") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.text } : m))
            )
          } else if (event.type === "error") {
            setError(event.error.message)
            toast({
              variant: "destructive",
              title: "Kuze error",
              description: event.error.message,
            })
          }
        }
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed"
      setError(msg)
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      toast({
        variant: "destructive",
        title: "Kuze unavailable",
        description: msg,
      })
    } finally {
      setStreaming(false)
    }
  }, [accessToken, contextOverride, input, mode, sessionId, streaming])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  const clearSession = () => {
    setMessages([])
    setSessionId(null)
    setError(null)
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // ignore
    }
    toast({
      title: "Kuze conversation cleared",
      description: "Started a fresh conversation for this session.",
    })
  }

  if (!accessToken) return null

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Kuze" : "Ask Kuze"}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          transition: "transform 0.2s, box-shadow 0.2s",
          transform: pulse && !open ? "scale(1.08)" : "scale(1)",
          outline: "none",
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            bottom: "88px",
            right: "24px",
            zIndex: 9998,
            width: "360px",
            maxWidth: "calc(100vw - 32px)",
            height: "520px",
            maxHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            background: "#0f1117",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "16px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            overflow: "hidden",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                K
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "white", lineHeight: 1.2 }}>
                  Kuze
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>
                  {appLabel}
                </div>
              </div>
            </div>
            <button
              onClick={clearSession}
              title="Clear conversation"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                borderRadius: "6px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  color: "rgba(255,255,255,0.3)",
                  textAlign: "center",
                  padding: "24px",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "4px" }}>⚡</div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                  Ask Kuze anything
                </div>
                <div style={{ fontSize: "12px", lineHeight: 1.5 }}>
                  Questions about {appLabel}, NEXUS, or your current workflow.
                </div>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 12px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background:
                      msg.role === "user" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.06)",
                    color: "white",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content || (
                    <span style={{ opacity: 0.4 }}>
                      <span style={{ animation: "blink 1s infinite" }}>●</span>
                      <span style={{ animation: "blink 1s infinite 0.2s", marginLeft: "3px" }}>●</span>
                      <span style={{ animation: "blink 1s infinite 0.4s", marginLeft: "3px" }}>●</span>
                    </span>
                  )}
                </div>
              </div>
            ))}

            {error ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div
            style={{
              padding: "12px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message Kuze..."
              rows={1}
              disabled={streaming}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "10px 12px",
                color: "white",
                fontSize: "13px",
                lineHeight: 1.5,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                maxHeight: "100px",
                overflowY: "auto",
              }}
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || streaming}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background:
                  !input.trim() || streaming ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                cursor: !input.trim() || streaming ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  )
}
