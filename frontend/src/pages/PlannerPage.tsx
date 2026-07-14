import { useState } from "react";

import { ChatWindow } from "../components/ChatWindow";
import { KeywordPills } from "../components/KeywordPills";
import { Sidebar } from "../components/Sidebar";
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [chatPendingId, setChatPendingId] = useState<string | null>(null);
  const [chatErrorId, setChatErrorId] = useState<string | null>(null);
  const [planPendingId, setPlanPendingId] = useState<string | null>(null);
  const [planErrorId, setPlanErrorId] = useState<string | null>(null);

  const chat = useChat();
  const createTripPlan = useCreateTripPlan();

  const active = sessions.find((session) => session.id === activeId) ?? null;
  const inChat = active !== null;

  const updateSession = (id: string, updater: (session: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((session) => (session.id === id ? updater(session) : session)));
  };

  const startPlanFor = (sessionId: string, conversationId: string, sessionKeywords: string[]) => {
    setPlanPendingId(sessionId);
    setPlanErrorId((prev) => (prev === sessionId ? null : prev));
    createTripPlan.mutate(
      { conversation_id: conversationId, keywords: sessionKeywords, answers: {} },
      {
        onSuccess: (plan) => updateSession(sessionId, (s) => ({ ...s, plan })),
        onError: () => setPlanErrorId(sessionId),
        onSettled: () => setPlanPendingId((prev) => (prev === sessionId ? null : prev)),
      },
    );
  };

  const sendTurnFor = (session: ChatSession, message: string) => {
    setChatPendingId(session.id);
    setChatErrorId((prev) => (prev === session.id ? null : prev));
    updateSession(session.id, (s) => ({ ...s, lastMessage: message }));
    chat.mutate(
      { conversation_id: session.conversationId, keywords: session.keywords, message },
      {
        onSuccess: (response) => {
          updateSession(session.id, (s) => ({
            ...s,
            conversationId: response.conversation_id,
            history: [...s.history, { role: "assistant", content: response.reply }],
          }));
          if (response.ready_to_plan) {
            startPlanFor(session.id, response.conversation_id, session.keywords);
          }
        },
        onError: () => setChatErrorId(session.id),
        onSettled: () => setChatPendingId((prev) => (prev === session.id ? null : prev)),
      },
    );
  };

  const handleAddKeyword = () => {
    addKeyword(keywordDraft);
    setKeywordDraft("");
  };

  const handleStart = () => {
    if (keywords.length === 0) return;
    const session: ChatSession = {
      id: crypto.randomUUID(),
      keywords: [...keywords],
      conversationId: null,
      history: [],
      plan: null,
      lastMessage: "",
    };
    setSessions((prev) => [session, ...prev]);
    setActiveId(session.id);
    clearKeywords();
    setKeywordDraft("");
    sendTurnFor(session, "");
  };

  const handleSend = (message: string) => {
    if (!active) return;
    updateSession(active.id, (s) => ({
      ...s,
      history: [...s.history, { role: "user", content: message }],
    }));
    sendTurnFor(active, message);
  };

  const handleNewChat = () => {
    setActiveId(null);
    setSidebarOpen(false);
  };

  const handleSelectChat = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  };

  const chatPending = active !== null && chatPendingId === active.id;
  const chatError = active !== null && chatErrorId === active.id;
  const planPending = active !== null && planPendingId === active.id;
  const planError = active !== null && planErrorId === active.id;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={handleSelectChat}
        onNewChat={handleNewChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-4 pt-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl bg-pm-cream/20 px-3 py-2 text-pm-cream"
            aria-label="Menü öffnen"
          >
            ☰
          </button>
          <p className="text-lg font-extrabold text-pm-cream">
            Plan<span className="text-pm-sand">Migo</span>
          </p>
        </div>

        <div className="overflow-x-clip">
          <div
            className={`flex w-[200%] transition-transform duration-500 ease-in-out ${
              inChat ? "-translate-x-1/2" : "translate-x-0"
            }`}
          >
            {/* Panel 1 — Stichwort-Anfrage */}
            <section
              aria-hidden={inChat}
              className="flex w-1/2 flex-col items-center justify-center gap-8 px-4 py-10 text-center md:min-h-screen"
            >
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-pm-cream sm:text-4xl">
                  Wohin geht’s als Nächstes?
                </h1>
                <p className="mx-auto mt-3 max-w-md text-pm-cream/90">
                  Gib ein paar Schlagwörter ein — Migo stellt dir ein paar Fragen und baut daraus
                  deinen kompletten Reiseplan.
                </p>
              </div>

              <div className="w-full max-w-lg rounded-2xl bg-pm-cream p-5 shadow-xl">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-full border border-pm-sand bg-pm-cream px-4 py-2.5 text-sm outline-none placeholder:text-pm-greenDark/50 focus:border-pm-sage"
                    value={keywordDraft}
                    onChange={(e) => setKeywordDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                    placeholder="z.B. Berge, ruhig, September …"
                    aria-label="Schlagwort"
                    disabled={inChat}
                  />
                  <button
                    onClick={handleAddKeyword}
                    disabled={!keywordDraft.trim()}
                    className="rounded-full bg-pm-sage px-5 py-2.5 text-sm font-semibold text-pm-cream shadow-sm transition hover:bg-pm-sage/90 disabled:opacity-40"
                  >
                    Hinzufügen
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTED_KEYWORDS.filter((s) => !keywords.includes(s)).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => addKeyword(suggestion)}
                      className="rounded-full border border-pm-sand px-3 py-1 text-xs text-pm-greenDark/80 transition hover:border-pm-sage hover:text-pm-sage"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>

                {keywords.length > 0 && (
                  <div className="mt-4 flex justify-center border-t border-pm-sand pt-4">
                    <KeywordPills keywords={keywords} onRemove={removeKeyword} />
                  </div>
                )}
              </div>

              <button
                onClick={handleStart}
                disabled={keywords.length === 0}
                className="rounded-full bg-pm-cream px-8 py-3 text-base font-bold text-pm-orange shadow-md transition hover:bg-pm-sand disabled:opacity-40"
              >
                Planung starten →
              </button>
            </section>

            {/* Panel 2 — Chat mit Migo */}
            <section
              aria-hidden={!inChat}
              className="flex w-1/2 flex-col gap-4 px-4 py-6 sm:px-8"
            >
              {active && (
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                  <KeywordPills keywords={active.keywords} />

                  <ChatWindow
                    history={active.history}
                    onSend={handleSend}
                    isSending={chatPending}
                    disabled={planPending || active.plan !== null}
                  />

                  {chatError && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-pm-cream px-4 py-3 text-sm shadow-sm">
                      <span>Migo ist gerade nicht erreichbar. Bitte versuche es noch einmal.</span>
                      <button
                        onClick={() => sendTurnFor(active, active.lastMessage)}
                        className="shrink-0 rounded-full bg-pm-orange px-4 py-1.5 text-xs font-semibold text-pm-cream hover:bg-pm-orange/90"
                      >
                        Erneut versuchen
                      </button>
                    </div>
                  )}

                  {planPending && (
                    <div className="flex items-center gap-3 rounded-2xl bg-pm-cream px-5 py-4 shadow-sm">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-pm-sage border-t-pm-cream" />
                      <p className="text-sm font-medium">
                        Migo stellt deinen Reiseplan zusammen — das kann ein paar Minuten dauern … 🧳
                      </p>
                    </div>
                  )}

                  {planError && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-pm-cream px-4 py-3 text-sm shadow-sm">
                      <span>Der Reiseplan konnte nicht erstellt werden.</span>
                      <button
                        onClick={() =>
                          active.conversationId &&
                          startPlanFor(active.id, active.conversationId, active.keywords)
                        }
                        className="shrink-0 rounded-full bg-pm-orange px-4 py-1.5 text-xs font-semibold text-pm-cream hover:bg-pm-orange/90"
                      >
                        Erneut versuchen
                      </button>
                    </div>
                  )}

                  {active.plan && <TripCard plan={active.plan} />}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
