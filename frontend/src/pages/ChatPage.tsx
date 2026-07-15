import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

import { Composer } from "../components/Chat";
import { ChatWindow } from "../components/ChatWindow";
import { ProposalCard } from "../components/ProposalCard";
import { TripCard } from "../components/TripCard";
import { TripMap, type MapMarker } from "../components/TripMap";
import logo from "../assets/planmigo-logo.svg";
import type { PlannerSession } from "../hooks/usePlannerSession";
import { usePhoto } from "../hooks/usePhoto";

interface ChatPageProps {
  planner: PlannerSession;
  onOpenTrips: () => void;
  /** Initial of the logged-in user (null = guest). */
  userInitial: string | null;
}

const CHAT_SUGGESTIONS = [
  { label: "Strand & Kultur, 1.500 € Budget", query: "tropical beach temple" },
  { label: "Roadtrip durch Südfrankreich", query: "provence south france" },
  { label: "Wochenendtrip in die Berge", query: "alps mountain lake" },
];

function SuggestionCard({
  label,
  query,
  onStart,
}: {
  label: string;
  query: string;
  onStart: (message: string) => void;
}) {
  const photo = usePhoto(query);
  return (
    <button
      type="button"
      onClick={() => onStart(label)}
      className="group flex w-full items-center gap-3 rounded-card border border-card bg-surface-card p-2 pr-4 text-left shadow-soft transition-all duration-quick ease-brand hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-image bg-pm-sandLight">
        {photo.data && (
          <img
            src={photo.data.thumb_url}
            alt={photo.data.alt}
            title={`Foto: ${photo.data.author} / Unsplash`}
            className="h-full w-full object-cover transition-transform duration-base ease-brand group-hover:scale-105"
          />
        )}
      </span>
      <span className="text-body font-medium text-content-body">{label}</span>
    </button>
  );
}

function asCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function ChatPage({ planner, onOpenTrips, userInitial }: ChatPageProps) {
  const { session } = planner;
  const [planOpen, setPlanOpen] = useState(true);

  // Stable marker list so the map only flies when targets actually change.
  const markers = useMemo<MapMarker[]>(() => {
    const result: MapMarker[] = [];
    if (session?.plan) {
      if (session.plan.lat !== null && session.plan.lon !== null) {
        result.push({
          lat: session.plan.lat,
          lon: session.plan.lon,
          label: session.plan.destination,
          primary: true,
        });
      }
      for (const item of session.plan.items) {
        const lat = asCoordinate(item.payload.lat);
        const lon = asCoordinate(item.payload.lon);
        const title = typeof item.payload.title === "string" ? item.payload.title : null;
        if (lat !== null && lon !== null && title) {
          result.push({ lat, lon, label: title });
        }
      }
    } else if (session?.proposals) {
      for (const proposal of session.proposals) {
        if (proposal.lat !== null && proposal.lon !== null) {
          result.push({
            lat: proposal.lat,
            lon: proposal.lon,
            label: proposal.destination,
            primary: true,
          });
        }
      }
    }
    return result;
  }, [session?.plan, session?.proposals]);

  if (!session) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-[560px] text-center">
          <img src={logo} alt="" className="mx-auto h-14 w-14" />
          <h1 className="mt-5 font-serif text-h1 font-bold tracking-headline text-content-heading">
            Wovon träumst du?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-body text-content-muted">
            Beschreibe deine Wunschreise — Migo stellt dir ein paar Rückfragen und baut daraus
            deinen fertigen Reiseplan.
          </p>
          <div className="mt-6 text-left">
            <Composer
              onSend={(message) => planner.startNew({ message })}
              placeholder="z. B. Eine Woche Strand und Kultur für 1.500 € …"
            />
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {CHAT_SUGGESTIONS.map((suggestion) => (
              <SuggestionCard
                key={suggestion.label}
                label={suggestion.label}
                query={suggestion.query}
                onStart={(message) => planner.startNew({ message })}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const planReady = session.plan !== null;
  const showProposals = session.proposals !== null && !planReady && !planner.planPending;

  return (
    <section className="mx-auto flex w-full max-w-[1240px] flex-1 justify-center gap-6 px-6 py-6">
      {/* Chat als Fenster: Kopfleiste, scrollender Verlauf, Eingabeleiste */}
      <div className="flex h-[calc(100vh-48px)] w-full min-w-0 max-w-[760px] flex-col overflow-hidden rounded-card border-2 border-hairline bg-surface-card shadow-card">
        <header className="flex items-center justify-between gap-3 border-b border-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="" className="h-[32px] w-[32px] shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <b className="font-serif text-body font-bold text-content-heading">Migo</b>
                <span className="h-2 w-2 rounded-full bg-pm-greenDark" aria-hidden="true" />
              </div>
              <p className="truncate text-caption text-content-muted">Dein KI-Reiseplaner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={planner.reset}
            className="shrink-0 rounded-chip border border-hairline px-3.5 py-1.5 text-caption font-bold text-content-body transition-colors duration-quick ease-brand hover:border-accent-secondary"
          >
            ＋ Neue Reise
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-surface-page px-5 py-5">
          <div className="flex flex-col gap-4">
            {session.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {session.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-chip bg-pm-sand px-3.5 py-1 text-caption font-medium text-content-body"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            <ChatWindow
              history={session.history}
              isSending={planner.chatPending}
              userInitial={userInitial}
            />

            {planner.chatError && (
              <div className="flex items-center justify-between gap-3 rounded-card bg-surface-card px-4 py-3 text-body shadow-soft">
                <span className="text-content-body">
                  Migo ist gerade nicht erreichbar. Bitte versuche es noch einmal.
                </span>
                <button
                  type="button"
                  onClick={planner.retryChat}
                  className="shrink-0 rounded-button bg-accent-primary px-4 py-1.5 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            {planner.proposalsPending && (
              <div className="flex items-center gap-3 rounded-card bg-surface-card px-5 py-4 shadow-soft">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
                <p className="text-body font-medium text-content-body">
                  Migo sammelt Reiseideen für dich … 🌍
                </p>
              </div>
            )}

            {planner.proposalsError && (
              <div className="flex items-center justify-between gap-3 rounded-card bg-surface-card px-4 py-3 text-body shadow-soft">
                <span className="text-content-body">
                  Die Reisevorschläge konnten nicht geladen werden.
                </span>
                <button
                  type="button"
                  onClick={planner.retryProposals}
                  className="shrink-0 rounded-button bg-accent-primary px-4 py-1.5 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            {showProposals && session.proposals && (
              <div className="flex flex-col gap-4">
                {session.proposals.map((proposal, index) => (
                  <ProposalCard
                    key={`${proposal.destination}-${index}`}
                    proposal={proposal}
                    index={index}
                    disabled={planner.planPending}
                    onChoose={planner.choosePlan}
                  />
                ))}
              </div>
            )}

            {planner.planPending && (
              <div className="flex items-center gap-3 rounded-card bg-surface-card px-5 py-4 shadow-soft">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
                <p className="text-body font-medium text-content-body">
                  Migo stellt deinen Reiseplan zusammen — das kann ein paar Minuten dauern … 🧳
                </p>
              </div>
            )}

            {planner.planError && (
              <div className="flex items-center justify-between gap-3 rounded-card bg-surface-card px-4 py-3 text-body shadow-soft">
                <span className="text-content-body">
                  Der Reiseplan konnte nicht erstellt werden.
                </span>
                <button
                  type="button"
                  onClick={planner.retryPlan}
                  className="shrink-0 rounded-button bg-accent-primary px-4 py-1.5 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            {planner.revisePending && (
              <div className="flex items-center gap-3 rounded-card bg-surface-card px-5 py-4 shadow-soft">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
                <p className="text-body font-medium text-content-body">
                  Migo überarbeitet deinen Reiseplan — einen Moment … ✏️
                </p>
              </div>
            )}

            {planner.reviseError && (
              <div className="flex items-center justify-between gap-3 rounded-card bg-surface-card px-4 py-3 text-body shadow-soft">
                <span className="text-content-body">
                  Die Änderung konnte nicht übernommen werden.
                </span>
                <button
                  type="button"
                  onClick={planner.retryRevise}
                  className="shrink-0 rounded-button bg-accent-primary px-4 py-1.5 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
                >
                  Erneut versuchen
                </button>
              </div>
            )}

            {session.plan && (
              <>
                <button
                  type="button"
                  onClick={() => setPlanOpen((open) => !open)}
                  className="flex items-center gap-2 self-start rounded-chip border border-hairline bg-surface-card px-4 py-2 text-body font-bold text-content-heading transition-colors duration-quick ease-brand hover:border-accent-secondary"
                >
                  <BookOpen size={17} strokeWidth={2} className="text-accent-secondary" />
                  {planOpen ? "Reiseplan zuklappen" : "Reiseplan aufklappen"}
                </button>
                {planOpen && (
                  <div className="pm-book-open">
                    <TripCard plan={session.plan} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenTrips}
                    className="rounded-button bg-accent-primary px-6 py-2.5 text-body font-bold text-pm-white transition-colors duration-quick ease-brand hover:bg-pm-orangeDeep"
                  >
                    Zu deinen Reisen →
                  </button>
                  <span className="text-caption text-content-muted">
                    Nicht ganz passend? Schreib Migo, was er ändern soll.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-card bg-surface-card p-3">
          <Composer
            onSend={planReady ? planner.revise : planner.send}
            placeholder={planReady ? "Was soll Migo am Plan ändern?" : "Nachricht an PlanMigo…"}
            disabled={
              planner.chatPending ||
              planner.planPending ||
              planner.revisePending ||
              planner.proposalsPending ||
              (showProposals && !planReady)
            }
          />
        </div>
      </div>

      <aside className="hidden w-[380px] shrink-0 xl:block">
        <div className="sticky top-6 flex flex-col gap-2">
          <div className="pm-eyebrow">Deine Ziele auf der Karte</div>
          <TripMap markers={markers} />
          {markers.length === 0 && (
            <p className="text-caption text-content-muted">
              Sobald Migo Ziele vorschlägt, erscheinen hier die Pins.
            </p>
          )}
        </div>
      </aside>
    </section>
  );
}
