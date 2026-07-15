// PlanMigo — Chat-Primitives
// Übersetzt aus dem Claude-Design-Export "Web-App" (Sidebar-Shell).
// Farben/Radien/Shadows ausschließlich über Tailwind-Tokens (pm-*, surface-*, content-*).

import { useState } from "react";
import { Send, UserRound } from "lucide-react";
import logo from "../assets/planmigo-logo.svg";

/* ───────────────────────────  Bubble  ─────────────────────────── */

interface BubbleProps {
  children: React.ReactNode;
  /** true = Nachricht des Nutzers (rechts, salbeigrün) */
  me?: boolean;
  /** Initial des angemeldeten Nutzers für den Avatar (null = Gast-Icon). */
  userInitial?: string | null;
}

export function Bubble({ children, me = false, userInitial = null }: BubbleProps) {
  if (me) {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[80%] rounded-card rounded-tr-[4px] bg-accent-secondary px-4 py-3 text-body text-pm-white shadow-soft">
          {children}
        </div>
        <span className="mt-0.5 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-pm-sand text-caption font-bold uppercase text-content-heading shadow-soft">
          {userInitial ? userInitial.charAt(0) : <UserRound size={16} strokeWidth={2.2} />}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <img src={logo} alt="PlanMigo" className="mt-0.5 h-[34px] w-[34px] shrink-0" />
      <div className="max-w-[80%] rounded-card rounded-tl-[4px] bg-surface-card px-4 py-3 text-body text-content-body shadow-soft">
        {children}
      </div>
    </div>
  );
}

/* ────────────────────────────  Chip  ──────────────────────────── */

interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function Chip({ label, active = false, onClick }: ChipProps) {
  const base =
    "whitespace-nowrap rounded-chip px-4 py-2 text-body transition-colors duration-quick ease-brand";
  const variant = active
    ? "border border-accent-secondary bg-surface-chipActive font-bold text-pm-white"
    : "border border-hairline bg-surface-chip text-content-body hover:border-accent-secondary";

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
  value?: string;
  onSelect?: (option: string) => void;
}

/** Rückfrage der KI mit Single-Select-Chips (Akinator-Flow). */
export function QuestionCard({ question, options, value, onSelect }: QuestionCardProps) {
  const [internal, setInternal] = useState<string | undefined>(value);
  const selected = value ?? internal;

  function handle(option: string) {
    setInternal(option);
    onSelect?.(option);
  }

  return (
    <div className="ml-11 max-w-[520px] rounded-card bg-surface-card p-4 shadow-soft">
      <b className="block text-body font-bold text-content-body">{question}</b>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o} label={o} active={selected === o} onClick={() => handle(o)} />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────  Composer  ───────────────────────── */

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({
  onSend,
  disabled = false,
  placeholder = "Nachricht an PlanMigo…",
}: ComposerProps) {
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  }

  return (
    <div className="flex items-center gap-2 rounded-button border border-card bg-surface-card p-2 pl-5 shadow-card">
      <input
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-body text-content-body outline-none placeholder:text-content-muted"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        aria-label="Senden"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-button bg-accent-secondary text-pm-white transition-colors duration-quick ease-brand hover:bg-pm-greenDark disabled:opacity-40"
      >
        <Send size={19} strokeWidth={2} />
      </button>
    </div>
  );
}
