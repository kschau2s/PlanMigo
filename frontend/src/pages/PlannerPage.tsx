import { ArrowRight, Check, Link as LinkIcon, MapPinned, Plane } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Composer, Nav } from "../components/Chat";
import { ChatMessages } from "../components/ChatWindow";
import { DestinationMap } from "../components/DestinationMap";
import { KeywordPills } from "../components/KeywordPills";
import { PhoneFrame } from "../components/PhoneFrame";
import { PlaceImage } from "../components/PlaceImage";
import { TripPlanView } from "../components/TripPlanView";
import { useChat } from "../hooks/useChat";
import { useSuggestDestinations } from "../hooks/useDestinations";
import { useSuggestFlights } from "../hooks/useFlights";
import { useKeywords } from "../hooks/useKeywords";
import { useCreateTripPlan } from "../hooks/useTripPlan";
import type { ChatSession } from "../types/chat";
import type { DestinationCandidate } from "../types/destination";
import type { FlightOption } from "../types/flight";
import type { TripPlan } from "../types/trip";

function mergeDestinations(
  previous: DestinationCandidate[],
  incoming: DestinationCandidate[],
): DestinationCandidate[] {
  const seen = new Set(previous.map((d) => `${d.name.toLowerCase()}|${d.country.toLowerCase()}`));
  const additions = incoming.filter(
    (d) => !seen.has(`${d.name.toLowerCase()}|${d.country.toLowerCase()}`),
  );
  return additions.length > 0 ? [...previous, ...additions] : previous;
}

const SUGGESTED_KEYWORDS: { label: string; imageQuery: string }[] = [
  { label: "Berge", imageQuery: "Tre Cime di Lavaredo" },
  { label: "Strand", imageQuery: "Mallorca Strand Cala" },
  { label: "Städtetrip", imageQuery: "Prag Karlsbrücke" },
  { label: "ruhig", imageQuery: "Lago di Braies" },
  { label: "Abenteuer", imageQuery: "Wandern Gipfel Alpen" },
  { label: "Kulinarik", imageQuery: "Pizza Napoletana" },
  { label: "September", imageQuery: "Weinberg Herbst" },
  { label: "Familie", imageQuery: "Ostsee Strandkorb" },
];

export function PlannerPage() {
  const [searchParams] = useSearchParams();
  const { keywords, addKeyword, removeKeyword, clearKeywords } = useKeywords(
    (searchParams.get("keywords") ?? "").split(",").map((k) => k.trim()).filter(Boolean),
  );
  const [keywordDraft, setKeywordDraft] = useState("");
  const [session, setSession] = useState<ChatSession | null>(null);
  const [completedPlan, setCompletedPlan] = useState<TripPlan | null>(null);

  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState(false);
  const [planPending, setPlanPending] = useState(false);
  const [planError, setPlanError] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [shared, setShared] = useState(false);
  const [destinations, setDestinations] = useState<DestinationCandidate[]>([]);

  const chat = useChat();
  const createTripPlan = useCreateTripPlan();
  const flightsMutation = useSuggestFlights();
  const destinationsMutation = useSuggestDestinations();

  const step: "keywords" | "chat" | "plan" = completedPlan ? "plan" : session ? "chat" : "keywords";

  const startPlan = (conversationId: string, sessionKeywords: string[]) => {
    setPlanPending(true);
    setPlanError(false);
    createTripPlan.mutate(
      {
        conversation_id: conversationId,
        keywords: sessionKeywords,
        answers: selectedFlight ? { selected_flight: JSON.stringify(selectedFlight) } : {},
      },
      {
        onSuccess: (plan) => setCompletedPlan(plan),
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
          } else {
            destinationsMutation.mutate(
              { conversationId: response.conversation_id, keywords: current.keywords },
              { onSuccess: (found) => setDestinations((prev) => mergeDestinations(prev, found)) },
            );
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
    setCompletedPlan(null);
    setChatPending(false);
    setChatError(false);
    setPlanPending(false);
    setPlanError(false);
    setSelectedFlight(null);
    flightsMutation.reset();
    setDestinations([]);
    destinationsMutation.reset();
  };

  const handleShare = async () => {
    if (!completedPlan) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/trip/${completedPlan.id}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard-API kann z.B. ohne HTTPS/Fokus fehlschlagen — Link bleibt über "Meine Reisen" erreichbar.
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <PhoneFrame
        header={
          <>
            <Nav />
            {step === "chat" && (
              <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2.5">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <KeywordPills keywords={session?.keywords ?? []} />
                </div>
                <button
                  onClick={handleReset}
                  className="shrink-0 text-[11px] font-semibold text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
                >
                  ← Neu
                </button>
              </div>
            )}
          </>
        }
        footer={
          step === "keywords" ? (
            <div className="p-4">
              <button
                onClick={handleStart}
                disabled={keywords.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-accent-primary px-6 py-3 text-body font-bold text-pm-white shadow-card transition-opacity duration-quick ease-brand hover:opacity-90 disabled:opacity-40"
              >
                Reise planen <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          ) : step === "chat" ? (
            <div className="p-3">
              <Composer onSend={handleSend} disabled={chatPending || planPending} />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 p-3">
              <button
                onClick={handleReset}
                className="shrink-0 text-caption font-semibold text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
              >
                ← Neue Reise
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-2 rounded-button bg-accent-primary px-4 py-2.5 text-caption font-bold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
              >
                {shared ? <Check size={15} /> : <LinkIcon size={15} />}
                {shared ? "Kopiert!" : "Reise teilen"}
              </button>
            </div>
          )
        }
      >
        {step === "keywords" && (
          <div>
          <div className="relative h-[180px] overflow-hidden">
            <PlaceImage query="Positano Amalfi" width={960} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-pm-espresso to-transparent opacity-90" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-eyebrow font-semibold uppercase tracking-eyebrow text-pm-sandLight">
                PlanMigo · AI Travel Planner
              </p>
              <h1 className="mt-1 font-serif text-h2 font-bold leading-tight text-pm-cream">
                Dein Urlaub. <span className="text-pm-sage">Einfach</span> geplant.
              </h1>
            </div>
          </div>
          <div className="p-4">
            <p className="text-caption text-content-muted">
              Wähle, worauf du Lust hast, oder tippe eigene Schlagwörter — Migo stellt dir ein paar
              Fragen und baut daraus deinen kompletten Reiseplan.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                className="flex-1 rounded-button border border-card bg-surface-card px-3 py-2 text-caption text-content-body outline-none placeholder:text-content-muted focus:border-accent-secondary"
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                placeholder="z.B. Berge, ruhig …"
                aria-label="Schlagwort"
              />
              <button
                onClick={handleAddKeyword}
                disabled={!keywordDraft.trim()}
                className="rounded-button bg-accent-secondary px-3.5 py-2 text-caption font-semibold text-pm-white shadow-soft transition-opacity duration-quick ease-brand hover:opacity-90 disabled:opacity-40"
              >
                +
              </button>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {SUGGESTED_KEYWORDS.map(({ label, imageQuery }) => {
                const isSelected = keywords.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => (isSelected ? removeKeyword(label) : addKeyword(label))}
                    aria-pressed={isSelected}
                    className={`group relative h-[64px] overflow-hidden rounded-button shadow-soft ring-2 transition-all duration-quick ease-brand ${
                      isSelected ? "ring-accent-primary" : "ring-transparent hover:ring-accent-secondary"
                    }`}
                  >
                    <PlaceImage
                      query={imageQuery}
                      width={330}
                      className="absolute inset-0 h-full w-full transition-transform duration-base ease-brand group-hover:scale-110"
                    />
                    <div
                      className={`absolute inset-0 bg-pm-espresso transition-opacity duration-quick ease-brand ${
                        isSelected ? "opacity-30" : "opacity-50"
                      }`}
                    />
                    {isSelected && (
                      <span className="absolute right-1 top-1 grid h-[16px] w-[16px] place-items-center rounded-full bg-accent-primary text-pm-white">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-1 text-center text-[11px] font-bold text-pm-cream">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {keywords.length > 0 && (
              <div className="mt-3 border-t border-hairline pt-3">
                <KeywordPills keywords={keywords} onRemove={removeKeyword} />
              </div>
            )}

            <div className="mt-4 border-t border-hairline pt-4">
              <button
                type="button"
                onClick={() => flightsMutation.mutate(keywords)}
                disabled={keywords.length === 0 || flightsMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-button border border-card px-3 py-2 text-[11px] font-semibold text-content-body transition-colors duration-quick ease-brand hover:border-accent-secondary hover:text-accent-secondary disabled:opacity-40"
              >
                <Plane size={13} />
                {flightsMutation.isPending
                  ? "Suche Flugpreise …"
                  : flightsMutation.data
                    ? "Flugpreise aktualisieren"
                    : "Flugpreise anzeigen (ca.)"}
              </button>

              {flightsMutation.isError && (
                <p className="mt-2 text-center text-[11px] text-pm-terracotta">
                  Flugpreise konnten nicht geladen werden.
                </p>
              )}

              {flightsMutation.data && flightsMutation.data.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {flightsMutation.data.map((flight) => {
                    const isSelected = selectedFlight?.id === flight.id;
                    return (
                      <button
                        key={flight.id}
                        type="button"
                        onClick={() => setSelectedFlight(isSelected ? null : flight)}
                        className={`flex items-center justify-between gap-2 rounded-button border px-2.5 py-2 text-left transition-colors duration-quick ease-brand ${
                          isSelected
                            ? "border-accent-secondary bg-pm-sand"
                            : "border-card hover:border-accent-secondary"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-content-heading">
                            {flight.airline} · {flight.destination}
                          </p>
                          <p className="truncate text-[10px] text-content-muted">
                            {[flight.stops, flight.duration].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <span className="shrink-0 text-caption font-bold text-accent-primary">
                          ca. {Math.round(flight.price)} €
                        </span>
                      </button>
                    );
                  })}
                  <p className="mt-0.5 text-[10px] text-content-muted">
                    Unverbindliche Richtpreise, fließen in den Reiseplan ein.
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {step === "chat" && session && (
          <>
            <ChatMessages history={session.history} isSending={chatPending} />

            {chatError && (
              <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-card bg-surface-card px-3 py-2.5 text-caption shadow-soft">
                <span className="text-content-body">Migo ist gerade nicht erreichbar.</span>
                <button
                  onClick={() => sendTurn(session, session.lastMessage)}
                  className="shrink-0 rounded-button bg-accent-primary px-3 py-1 text-[11px] font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
                >
                  Erneut
                </button>
              </div>
            )}

            {planPending && (
              <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-card bg-surface-card px-3 py-3 shadow-soft">
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
                <p className="text-caption font-medium text-content-body">
                  Migo stellt deinen Reiseplan zusammen — das kann ein paar Minuten dauern … 🧳
                </p>
              </div>
            )}

            {planError && (
              <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-card bg-surface-card px-3 py-2.5 text-caption shadow-soft">
                <span className="text-content-body">Plan konnte nicht erstellt werden.</span>
                <button
                  onClick={() => session.conversationId && startPlan(session.conversationId, session.keywords)}
                  className="shrink-0 rounded-button bg-accent-primary px-3 py-1 text-[11px] font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
                >
                  Erneut
                </button>
              </div>
            )}
          </>
        )}

        {step === "plan" && completedPlan && <TripPlanView plan={completedPlan} />}
      </PhoneFrame>

      {step === "chat" && (
        <PhoneFrame
          header={
            <div className="flex items-center gap-2 px-4 py-3">
              <MapPinned size={16} className="text-accent-secondary" />
              <span className="text-caption font-semibold text-content-heading">
                Mögliche Ziele
              </span>
            </div>
          }
        >
          <div className="relative h-full min-h-[300px] w-full">
            <DestinationMap destinations={destinations} />
            {destinations.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-card">
                <p className="max-w-[200px] text-center text-caption text-content-muted">
                  {destinationsMutation.isPending
                    ? "Migo sucht passende Ziele …"
                    : "Mögliche Ziele erscheinen hier, sobald du antwortest."}
                </p>
              </div>
            )}
          </div>
        </PhoneFrame>
      )}
    </div>
  );
}
