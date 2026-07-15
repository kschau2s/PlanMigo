// PlanMigo — Chat-Komponenten
// 1:1 aus dem Claude-Design-Export "Web-Dialog" übersetzt.
// Farben/Radien/Shadows ausschließlich über Tailwind-Tokens (pm-*, surface-*, content-*).

import { useState } from "react";
import { Send } from "lucide-react";
import logo from "../assets/planmigo-logo.svg";

/* ─────────────────────────────  Nav  ───────────────────────────── */

export function Nav() {
  return (
    <header className="border-b border-hairline bg-surface-page">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-6 py-4">
        <img src={logo} alt="" className="h-8 w-8" />
        <span className="font-serif text-cardTitle font-bold tracking-headline">
          <span className="text-pm-terracotta">Plan</span>
          <span className="text-pm-sage">Migo</span>
        </span>
      </div>
    </header>
  );
}

/* ───────────────────────────  Bubble  ─────────────────────────── */

interface BubbleProps {
  children: React.ReactNode;
  /** true = Nachricht des Nutzers (rechts, terrakotta) */
  me?: boolean;
}

export function Bubble({ children, me = false }: BubbleProps) {
  if (me) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-card bg-surface-inverse px-5 py-3 text-body text-content-onInverse shadow-soft">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <img src={logo} alt="PlanMigo" className="mt-1 h-7 w-7 shrink-0" />
      <div className="max-w-[80%] rounded-card border border-card bg-surface-card px-5 py-3 text-body text-content-body shadow-soft">
        {children}
      </div>
    </div>
  );
}

/* ────────────────────────────  Chip  ──────────────────────────── */

interface ChipProps {
  label: string;
  active?: boolean;
  /** dark = Terrakotta-Variante (z.B. Direkt / Stopover) */
  dark?: boolean;
  onClick?: () => void;
}

export function Chip({ label, active = false, dark = false, onClick }: ChipProps) {
  const base = "rounded-chip px-5 py-2.5 text-body transition-colors duration-quick ease-brand";

  const variant = active
    ? dark
      ? "bg-pm-terracotta text-content-onInverse"
      : "bg-surface-chipActive text-pm-white"
    : dark
      ? "border border-card bg-surface-chip text-pm-terracotta hover:bg-pm-paper"
      : "border border-card bg-surface-chip text-content-body hover:bg-pm-paper";

  return (
    <button type="button" onClick={onClick} className={`${base} ${variant}`}>
      {label}
    </button>
  );
}

/* ─────────────────────────  QuestionCard  ────────────────────── */

interface QuestionCardProps {
  question: string;
  options: string[];
  dark?: boolean;
  value?: string;
  onSelect?: (option: string) => void;
}

/** Rückfrage der KI mit Single-Select-Chips (Akinator-Flow). */
export function QuestionCard({
  question,
  options,
  dark = false,
  value,
  onSelect,
}: QuestionCardProps) {
  const [internal, setInternal] = useState<string | undefined>(value);
  const selected = value ?? internal;

  function handle(option: string) {
    setInternal(option);
    onSelect?.(option);
  }

  return (
    <div className="rounded-card border border-card bg-surface-card p-card shadow-soft">
      <b className="block font-serif text-cardTitle text-content-heading">{question}</b>
      <div className="mt-4 flex flex-wrap gap-3">
        {options.map((o) => (
          <Chip key={o} label={o} dark={dark} active={selected === o} onClick={() => handle(o)} />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────  Composer  ───────────────────────── */

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  }

  return (
    <div className="flex items-center gap-2 rounded-button border border-card bg-surface-card p-2 pl-5 shadow-soft">
      <input
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Nachricht an PlanMigo…"
        className="flex-1 bg-transparent text-body text-content-body outline-none placeholder:text-content-muted"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        aria-label="Senden"
        className="grid h-10 w-10 place-items-center rounded-button bg-accent-primary text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90 disabled:opacity-40"
      >
        <Send size={19} strokeWidth={2} />
      </button>
    </div>
  );
}

/* ─────────────────────────  TripPanel  ──────────────────────── */

interface TripStop {
  name: string;
  nights: string;
}

interface TripPanelProps {
  image: string;
  title: string;
  subtitle: string;
  stops: TripStop[];
  onOpen?: () => void;
}

/** Reisevorschlag-Karte (rechte Spalte). */
export function TripPanel({ image, title, subtitle, stops, onOpen }: TripPanelProps) {
  return (
    <div className="overflow-hidden rounded-card border border-card bg-surface-card shadow-card">
      <img src={image} alt={title} className="h-52 w-full object-cover" />

      <div className="p-card">
        <div className="pm-eyebrow">Dein Vorschlag</div>

        <h3 className="mt-2 text-h2">{title}</h3>
        <div className="mt-1 text-caption text-content-muted">{subtitle}</div>

        <div className="mt-4">
          {stops.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0"
            >
              <b className="font-serif text-body text-content-heading">{s.name}</b>
              <span className="text-caption text-content-muted">{s.nights}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-6 w-full rounded-button bg-accent-primary px-6 py-3 text-body font-bold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
        >
          Reise ansehen …
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────  ChatLayout  ─────────────────────── */

/** Zweispaltiges Layout: Dialog links, Reisevorschlag rechts. */
export function ChatLayout({
  chat,
  panel,
}: {
  chat: React.ReactNode;
  panel?: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-8 lg:grid-cols-[1fr_380px]">
      <main className="flex flex-col gap-5">{chat}</main>
      {panel && <aside className="lg:sticky lg:top-8 lg:self-start">{panel}</aside>}
    </div>
  );
}
