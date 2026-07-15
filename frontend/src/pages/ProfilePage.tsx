interface ProfilePageProps {
  plansCount: number;
  activePlanning: boolean;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-card border border-card bg-surface-card px-2 py-4 text-center">
      <b className="block font-serif text-h1 font-bold tracking-headline text-accent-primary">
        {value}
      </b>
      <span className="text-caption uppercase tracking-label text-content-muted">{label}</span>
    </div>
  );
}

export function ProfilePage({ plansCount, activePlanning }: ProfilePageProps) {
  return (
    <section className="w-full max-w-[860px] px-7 py-7">
      <div className="pm-eyebrow">Dein Konto</div>
      <h1 className="mt-2 font-serif text-h1 font-bold tracking-headline text-content-heading">
        Profil
      </h1>

      <div className="mt-6 rounded-card border border-card bg-surface-card p-card shadow-soft">
        <div className="flex items-center gap-5">
          <div className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full bg-accent-secondary font-serif text-h1 font-bold text-pm-white">
            G
          </div>
          <div>
            <div className="font-serif text-h2 font-bold text-content-heading">Gast</div>
            <p className="mt-1 text-body text-content-muted">
              Noch kein Konto — Anmeldung &amp; Profile folgen. Deine Planungen gelten für diese
              Browser-Sitzung.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Stat value={plansCount} label="Reisen geplant" />
          <Stat value={activePlanning ? 1 : 0} label="Aktive Planung" />
          <Stat value={0} label="Reisen gebucht" />
        </div>
      </div>

      <div className="mt-5 rounded-card border border-card bg-surface-card p-card shadow-soft">
        <b className="text-body font-bold text-content-body">Deine Reise-Vorlieben</b>
        <p className="mt-2 text-body text-content-muted">
          Sobald es Konten gibt, merkt sich Migo hier deinen Reisestil, dein Budget und deine
          liebste Reisedauer — auf Wunsch automatisch aus deinen Chats gelernt (siehe
          Einstellungen → KI-Personalisierung).
        </p>
      </div>
    </section>
  );
}
