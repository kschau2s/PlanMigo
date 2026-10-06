import { Check, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Nav } from "../components/Chat";
import { PhoneFrame } from "../components/PhoneFrame";
import { TripPlanView } from "../components/TripPlanView";
import { useTripPlan } from "../hooks/useTripPlan";

export function TripResultPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: plan, isLoading, isError } = useTripPlan(tripId);
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard-API kann z.B. ohne HTTPS/Fokus fehlschlagen — Link bleibt in der Adressleiste sichtbar.
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <PhoneFrame
        header={
          <>
            <Nav />
            <div className="border-t border-hairline px-4 py-2.5">
              <Link
                to="/"
                className="text-[11px] font-semibold text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
              >
                ← Neue Reise planen
              </Link>
            </div>
          </>
        }
        footer={
          plan && (
            <div className="p-3">
              <button
                type="button"
                onClick={handleShare}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-accent-primary px-4 py-2.5 text-caption font-bold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
              >
                {shared ? <Check size={15} /> : <LinkIcon size={15} />}
                {shared ? "Link kopiert!" : "Reise teilen"}
              </button>
            </div>
          )
        }
      >
        {isLoading && (
          <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
            <p className="text-caption text-content-muted">Reiseplan wird geladen …</p>
          </div>
        )}

        {(isError || (!isLoading && !plan)) && (
          <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
            <p className="text-caption text-content-body">
              Dieser Reiseplan konnte nicht gefunden werden.
            </p>
            <Link
              to="/"
              className="rounded-button bg-accent-primary px-4 py-2 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
            >
              ← Neue Reise planen
            </Link>
          </div>
        )}

        {plan && <TripPlanView plan={plan} />}
      </PhoneFrame>
    </div>
  );
}
