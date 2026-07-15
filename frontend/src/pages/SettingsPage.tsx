import type { AppSettings } from "../hooks/useSettings";

interface SettingsPageProps {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onResetLocal: () => void;
}

function Toggle({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-[28px] w-[48px] shrink-0 rounded-chip transition-colors duration-quick ease-brand ${
        on ? "bg-accent-secondary" : "bg-pm-sand"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-pm-white transition-all duration-quick ease-brand ${
          on ? "left-[23px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-card py-4 last:border-b-0 last:pb-0 first:pt-0">
      <div>
        <b className="text-body font-bold text-content-body">{title}</b>
        <p className="mt-0.5 text-caption text-content-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

const SELECT_CLASSES =
  "rounded-chip border border-hairline bg-surface-card px-4 py-2 text-body text-content-body outline-none";

export function SettingsPage({ settings, onUpdate, onResetLocal }: SettingsPageProps) {
  const confirmReset = () => {
    if (window.confirm("Lokale Daten wirklich zurücksetzen? Die aktuelle Planung geht verloren.")) {
      onResetLocal();
    }
  };

  return (
    <section className="w-full max-w-[860px] px-7 py-7">
      <div className="pm-eyebrow">App</div>
      <h1 className="mt-2 font-serif text-h1 font-bold tracking-headline text-content-heading">
        Einstellungen
      </h1>

      <div className="mt-6 rounded-card border border-card bg-surface-card p-card shadow-soft">
        <SettingRow title="Benachrichtigungen" hint="Preisalarme und Reise-Updates per E-Mail">
          <Toggle
            on={settings.notifications}
            label="Benachrichtigungen umschalten"
            onToggle={() => onUpdate({ notifications: !settings.notifications })}
          />
        </SettingRow>
        <SettingRow title="Preisalarm" hint="Melden, wenn deine geplanten Reisen günstiger werden">
          <Toggle
            on={settings.priceAlert}
            label="Preisalarm umschalten"
            onToggle={() => onUpdate({ priceAlert: !settings.priceAlert })}
          />
        </SettingRow>
        <SettingRow
          title="KI-Personalisierung"
          hint="Vorlieben aus früheren Chats für Vorschläge nutzen"
        >
          <Toggle
            on={settings.personalization}
            label="Personalisierung umschalten"
            onToggle={() => onUpdate({ personalization: !settings.personalization })}
          />
        </SettingRow>
        <SettingRow title="Sprache" hint="Sprache der App und der KI-Antworten">
          <select
            value={settings.language}
            aria-label="Sprache"
            onChange={(e) => onUpdate({ language: e.target.value as AppSettings["language"] })}
            className={SELECT_CLASSES}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </SettingRow>
        <SettingRow title="Währung" hint="Anzeige von Preisen">
          <select
            value={settings.currency}
            aria-label="Währung"
            onChange={(e) => onUpdate({ currency: e.target.value as AppSettings["currency"] })}
            className={SELECT_CLASSES}
          >
            <option value="EUR">EUR €</option>
            <option value="CHF">CHF</option>
            <option value="USD">USD $</option>
          </select>
        </SettingRow>
      </div>

      <p className="mt-3 text-caption text-content-muted">
        Diese Einstellungen werden nur lokal in deinem Browser gespeichert — ein Konto-System
        folgt.
      </p>

      <div className="mt-5 rounded-card border border-card bg-surface-card p-card shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <b className="text-body font-bold text-content-body">Lokale Daten zurücksetzen</b>
            <p className="mt-0.5 text-caption text-content-muted">
              Entfernt Einstellungen und die aktuelle Planung aus diesem Browser und meldet dich ab.
            </p>
          </div>
          <button
            type="button"
            onClick={confirmReset}
            className="shrink-0 rounded-chip border border-pm-orangeDeep px-4 py-2 text-body font-medium text-pm-orangeDeep transition-colors duration-quick ease-brand hover:bg-pm-paper"
          >
            Zurücksetzen…
          </button>
        </div>
      </div>
    </section>
  );
}
