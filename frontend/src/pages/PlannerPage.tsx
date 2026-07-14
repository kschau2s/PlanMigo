import { useRef, useState } from "react";

import { ChatWindow } from "../components/ChatWindow";
import { KeywordPills } from "../components/KeywordPills";
import { TripCard } from "../components/TripCard";
import { useChat } from "../hooks/useChat";
import { useKeywords } from "../hooks/useKeywords";
import { useCreateTripPlan } from "../hooks/useTripPlan";
import type { ChatEntry } from "../types/chat";

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

type Phase = "keywords" | "chat";

export function PlannerPage() {
  const { keywords, addKeyword, removeKeyword, clearKeywords } = useKeywords();
  const [keywordDraft, setKeywordDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("keywords");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const lastMessageRef = useRef("");

  const chat = useChat();
  const createTripPlan = useCreateTripPlan();

  const handleAddKeyword = () => {
    addKeyword(keywordDraft);
    setKeywordDraft("");
  };

  const startPlan = (id: string) => {
    createTripPlan.mutate({ conversation_id: id, keywords, answers: {} });
  };

  const sendTurn = (message: string) => {
    lastMessageRef.current = message;
    chat.mutate(
      { conversation_id: conversationId, keywords, message },
      {
        onSuccess: (response) => {
          setConversationId(response.conversation_id);
          setHistory((prev) => [...prev, { role: "assistant", content: response.reply }]);
          if (response.ready_to_plan) startPlan(response.conversation_id);
        },
      },
    );
  };

  const handleStart = () => {
    if (keywords.length === 0) return;
    setPhase("chat");
    sendTurn("");
  };

  const handleSend = (message: string) => {
    setHistory((prev) => [...prev, { role: "user", content: message }]);
    sendTurn(message);
  };

  const handleReset = () => {
    setPhase("keywords");
    setConversationId(null);
    setHistory([]);
    clearKeywords();
    chat.reset();
    createTripPlan.reset();
  };

  const planReady = createTripPlan.isSuccess;
  const planPending = createTripPlan.isPending;

  if (phase === "keywords") {
    return (
      <div className="flex flex-col items-center gap-8 py-10 text-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Wohin geht’s als Nächstes?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pm-greenDark/80">
            Gib ein paar Schlagwörter ein — <span className="font-semibold text-pm-sage">Migo</span>{" "}
            stellt dir ein paar Fragen und baut daraus deinen kompletten Reiseplan.
          </p>
        </div>

        <div className="w-full max-w-lg rounded-2xl border border-pm-sand bg-pm-cream p-5 shadow-sm">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-full border border-pm-sand bg-pm-cream px-4 py-2.5 text-sm outline-none placeholder:text-pm-greenDark/50 focus:border-pm-sage"
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
              placeholder="z.B. Berge, ruhig, September …"
              aria-label="Schlagwort"
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
          className="rounded-full bg-pm-orange px-8 py-3 text-base font-bold text-pm-cream shadow-md transition hover:bg-pm-orange/90 disabled:opacity-40"
        >
          Planung starten →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <KeywordPills keywords={keywords} />
        <button
          onClick={handleReset}
          className="rounded-full border border-pm-sand px-4 py-1.5 text-xs font-medium text-pm-greenDark/80 transition hover:border-pm-orange hover:text-pm-orange"
        >
          ↺ Neue Reise planen
        </button>
      </div>

      <ChatWindow
        history={history}
        onSend={handleSend}
        isSending={chat.isPending}
        disabled={planPending || planReady}
      />

      {chat.isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-pm-orange bg-pm-orange/10 px-4 py-3 text-sm">
          <span>Migo ist gerade nicht erreichbar. Bitte versuche es noch einmal.</span>
          <button
            onClick={() => sendTurn(lastMessageRef.current)}
            className="shrink-0 rounded-full bg-pm-orange px-4 py-1.5 text-xs font-semibold text-pm-cream hover:bg-pm-orange/90"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {planPending && (
        <div className="flex items-center gap-3 rounded-2xl border border-pm-sand bg-pm-sand/30 px-5 py-4">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-pm-sage border-t-pm-cream" />
          <p className="text-sm font-medium">
            Migo stellt deinen Reiseplan zusammen — einen Moment … 🧳
          </p>
        </div>
      )}

      {createTripPlan.isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-pm-orange bg-pm-orange/10 px-4 py-3 text-sm">
          <span>Der Reiseplan konnte nicht erstellt werden.</span>
          <button
            onClick={() => conversationId && startPlan(conversationId)}
            className="shrink-0 rounded-full bg-pm-orange px-4 py-1.5 text-xs font-semibold text-pm-cream hover:bg-pm-orange/90"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {createTripPlan.data && <TripCard plan={createTripPlan.data} />}
    </div>
  );
}
