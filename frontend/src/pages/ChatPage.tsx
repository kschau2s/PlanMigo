import { Composer } from "../components/Chat";
import { ChatWindow } from "../components/ChatWindow";
import { TripCard } from "../components/TripCard";
import logo from "../assets/planmigo-logo.svg";
import type { PlannerSession } from "../hooks/usePlannerSession";

interface ChatPageProps {
  planner: PlannerSession;
  onOpenTrips: () => void;
}

const CHAT_SUGGESTIONS = [
  "Strand, Kultur, 1.500 € Budget",
  "Roadtrip durch Südfrankreich",
  "Wochenendtrip in die Berge",
];

export function ChatPage({ planner, onOpenTrips }: ChatPageProps) {
  const { session } = planner;

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
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {CHAT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => planner.startNew({ message: suggestion })}
                className="rounded-chip border border-hairline bg-surface-card px-4 py-2 text-caption text-content-body transition-colors duration-quick ease-brand hover:border-accent-secondary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const planReady = session.plan !== null;

  return (
    <section className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-6 pt-7">
        <div className="flex items-center justify-between gap-3 pb-4">
          {session.keywords.length > 0 ? (
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
          ) : (
            <span className="pm-eyebrow">Dein Reise-Chat</span>
          )}
          <button
            type="button"
            onClick={planner.reset}
            className="shrink-0 text-caption font-bold text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
          >
            ＋ Neue Reise
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <ChatWindow history={session.history} isSending={planner.chatPending} />

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
              <span className="text-content-body">Der Reiseplan konnte nicht erstellt werden.</span>
              <button
                type="button"
                onClick={planner.retryPlan}
                className="shrink-0 rounded-button bg-accent-primary px-4 py-1.5 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {session.plan && (
            <>
              <TripCard plan={session.plan} />
              <button
                type="button"
                onClick={onOpenTrips}
                className="self-start rounded-button bg-accent-primary px-6 py-2.5 text-body font-bold text-pm-white transition-colors duration-quick ease-brand hover:bg-pm-orangeDeep"
              >
                Zu deinen Reisen →
              </button>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-surface-page pb-6 pt-4">
          <Composer
            onSend={planner.send}
            disabled={planner.chatPending || planner.planPending || planReady}
          />
        </div>
      </div>
    </section>
  );
}
