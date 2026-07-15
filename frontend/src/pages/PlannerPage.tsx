import { useState } from "react";

import { ChatLayout, Nav } from "../components/Chat";
import { ChatWindow } from "../components/ChatWindow";
import { KeywordPills } from "../components/KeywordPills";
import { TripCard } from "../components/TripCard";
import { useChat } from "../hooks/useChat";
import { useKeywords } from "../hooks/useKeywords";
import { useCreateTripPlan } from "../hooks/useTripPlan";
import type { ChatSession } from "../types/chat";

const SUGGESTED_KEYWORDS = [
  "Berge",
  "Strand",
  "Städtetrip",
  "ruhig",
  "Abenteuer",
  "Kulinarik",
  "September",
  "Familie",
];

export function PlannerPage() {
  const { keywords, addKeyword, removeKeyword, clearKeywords } = useKeywords();
  const [keywordDraft, setKeywordDraft] = useState("");
  const [session, setSession] = useState<ChatSession | null>(null);

  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState(false);
  const [planPending, setPlanPending] = useState(false);
  const [planError, setPlanError] = useState(false);

  const chat = useChat();
  const createTripPlan = useCreateTripPlan();

  const startPlan = (conversationId: string, sessionKeywords: string[]) => {
    setPlanPending(true);
    setPlanError(false);
    createTripPlan.mutate(
      { conversation_id: conversationId, keywords: sessionKeywords, answers: {} },
      {
        onSuccess: (plan) => setSession((s) => (s ? { ...s, plan } : s)),
        onError: () => setPlanError(true),
        onSettled: () => setPlanPending(false),
      },
    );
  };

  const sendTurn = (current: ChatSession, message: string) => {
    setChatPending(true);
    setChatError(false);
    setSession((s) => (s ? { ...s, lastMessage: message } : s));
    chat.mutate(
      { conversation_id: current.conversationId, keywords: current.keywords, message },
      {
        onSuccess: (response) => {
          setSession((s) =>
            s
              ? {
                  ...s,
                  conversationId: response.conversation_id,
                  history: [...s.history, { role: "assistant", content: response.reply }],
                }
              : s,
          );
          if (response.ready_to_plan) {
            startPlan(response.conversation_id, current.keywords);
          }
        },
        onError: () => setChatError(true),
        onSettled: () => setChatPending(false),
      },
    );
  };

  const handleAddKeyword = () => {
    addKeyword(keywordDraft);
    setKeywordDraft("");
  };

  const handleStart = () => {
    if (keywords.length === 0) return;
    const next: ChatSession = {
      id: crypto.randomUUID(),
      keywords: [...keywords],
      conversationId: null,
      history: [],
      plan: null,
      lastMessage: "",
    };
    setSession(next);
    clearKeywords();
    setKeywordDraft("");
    sendTurn(next, "");
  };

  const handleSend = (message: string) => {
    if (!session) return;
    const updated: ChatSession = {
      ...session,
      history: [...session.history, { role: "user", content: message }],
    };
    setSession(updated);
    sendTurn(updated, message);
  };

  const handleReset = () => {
    setSession(null);
    setChatPending(false);
    setChatError(false);
    setPlanPending(false);
    setPlanError(false);
  };

  return (
    <div className="min-h-screen">
      <Nav />

      {!session ? (
        <section className="mx-auto flex max-w-[1200px] flex-col items-center gap-8 px-6 py-16 text-center">
          <div>
            <h1 className="font-serif text-h1 font-bold tracking-headline text-content-heading">
              Wohin geht’s als Nächstes?
            </h1>
            <p className="mx-auto mt-3 max-w-md text-content-muted">
              Gib ein paar Schlagwörter ein — Migo stellt dir ein paar Fragen und baut daraus
              deinen kompletten Reiseplan.
            </p>
          </div>

          <div className="w-full max-w-lg rounded-card bg-surface-card p-card shadow-card">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-button border border-card bg-surface-card px-4 py-2.5 text-body text-content-body outline-none placeholder:text-content-muted focus:border-accent-secondary"
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                placeholder="z.B. Berge, ruhig, September …"
                aria-label="Schlagwort"
              />
              <button
                onClick={handleAddKeyword}
                disabled={!keywordDraft.trim()}
                className="rounded-button bg-accent-secondary px-5 py-2.5 text-body font-semibold text-pm-white shadow-soft transition-opacity duration-quick ease-brand hover:opacity-90 disabled:opacity-40"
              >
                Hinzufügen
              </button>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTED_KEYWORDS.filter((s) => !keywords.includes(s)).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => addKeyword(suggestion)}
                  className="rounded-chip border border-card px-3 py-1 text-caption text-content-muted transition-colors duration-quick ease-brand hover:border-accent-secondary hover:text-accent-secondary"
                >
                  + {suggestion}
                </button>
              ))}
            </div>

            {keywords.length > 0 && (
              <div className="mt-4 flex justify-center border-t border-hairline pt-4">
                <KeywordPills keywords={keywords} onRemove={removeKeyword} />
              </div>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={keywords.length === 0}
            className="rounded-button bg-accent-primary px-8 py-3 text-body font-bold text-pm-white shadow-card transition-opacity duration-quick ease-brand hover:opacity-90 disabled:opacity-40"
          >
            Planung starten →
          </button>
        </section>
      ) : (
        <ChatLayout
          chat={
            <>
              <div className="flex items-center justify-between">
                <KeywordPills keywords={session.keywords} />
                <button
                  onClick={handleReset}
                  className="shrink-0 text-caption font-semibold text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
                >
                  ← Neue Reise
                </button>
              </div>

              <ChatWindow
                history={session.history}
                onSend={handleSend}
                isSending={chatPending}
                disabled={planPending || session.plan !== null}
              />

              {chatError && (
                <div className="flex items-center justify-between gap-3 rounded-card bg-surface-card px-4 py-3 text-body shadow-soft">
                  <span className="text-content-body">
                    Migo ist gerade nicht erreichbar. Bitte versuche es noch einmal.
                  </span>
                  <button
                    onClick={() => sendTurn(session, session.lastMessage)}
                    className="shrink-0 rounded-button bg-accent-primary px-4 py-1.5 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
                  >
                    Erneut versuchen
                  </button>
                </div>
              )}

              {planPending && (
                <div className="flex items-center gap-3 rounded-card bg-surface-card px-5 py-4 shadow-soft">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
                  <p className="text-body font-medium text-content-body">
                    Migo stellt deinen Reiseplan zusammen — das kann ein paar Minuten dauern … 🧳
                  </p>
                </div>
              )}

              {planError && (
                <div className="flex items-center justify-between gap-3 rounded-card bg-surface-card px-4 py-3 text-body shadow-soft">
                  <span className="text-content-body">Der Reiseplan konnte nicht erstellt werden.</span>
                  <button
                    onClick={() => session.conversationId && startPlan(session.conversationId, session.keywords)}
                    className="shrink-0 rounded-button bg-accent-primary px-4 py-1.5 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
                  >
                    Erneut versuchen
                  </button>
                </div>
              )}
            </>
          }
          panel={
            session.plan ? (
              <TripCard plan={session.plan} />
            ) : (
              <div className="rounded-card border border-card bg-surface-card p-card text-center shadow-card">
                <div className="pm-eyebrow">Dein Vorschlag</div>
                <p className="mt-3 text-body text-content-muted">
                  Sobald Migo genug weiß, erscheint hier dein Reiseplan.
                </p>
              </div>
            )
          }
        />
      )}
    </div>
  );
}
