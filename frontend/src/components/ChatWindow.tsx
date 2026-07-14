import { useEffect, useRef, useState } from "react";

import type { ChatEntry } from "../types/chat";

interface ChatWindowProps {
  history: ChatEntry[];
  onSend: (message: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

function MigoAvatar() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pm-sage text-sm font-bold text-pm-cream shadow-sm">
      M
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <MigoAvatar />
      <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-pm-sage/20 px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-pm-sage"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChatWindow({ history, onSend, isSending, disabled = false }: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, isSending]);

  useEffect(() => {
    if (!isSending && !disabled) inputRef.current?.focus();
  }, [isSending, disabled]);

  const submit = () => {
    const message = draft.trim();
    if (!message || isSending || disabled) return;
    onSend(message);
    setDraft("");
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-pm-sand bg-pm-cream shadow-sm">
      <div className="flex items-center gap-2 border-b border-pm-sand bg-pm-sand/30 px-4 py-2.5">
        <MigoAvatar />
        <div>
          <p className="text-sm font-semibold">Migo</p>
          <p className="text-xs text-pm-greenDark/70">
            {isSending ? "tippt …" : "dein Reisebegleiter"}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex h-96 flex-col gap-3 overflow-y-auto p-4">
        {history.map((entry, index) =>
          entry.role === "assistant" ? (
            <div key={index} className="flex max-w-[85%] items-end gap-2 self-start">
              <MigoAvatar />
              <div className="rounded-2xl rounded-bl-sm bg-pm-sage px-4 py-2.5 text-sm leading-relaxed text-pm-cream shadow-sm">
                {entry.content}
              </div>
            </div>
          ) : (
            <div
              key={index}
              className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-pm-orange px-4 py-2.5 text-sm leading-relaxed text-pm-cream shadow-sm"
            >
              {entry.content}
            </div>
          ),
        )}
        {isSending && <TypingIndicator />}
      </div>

      <div className="flex gap-2 border-t border-pm-sand p-3">
        <input
          ref={inputRef}
          className="flex-1 rounded-full border border-pm-sand bg-pm-cream px-4 py-2.5 text-sm outline-none placeholder:text-pm-greenDark/50 focus:border-pm-sage"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Antworte Migo …"
          disabled={disabled}
          aria-label="Chat-Nachricht"
        />
        <button
          onClick={submit}
          disabled={isSending || disabled || !draft.trim()}
          className="rounded-full bg-pm-orange px-5 py-2.5 text-sm font-semibold text-pm-cream shadow-sm transition hover:bg-pm-orange/90 disabled:opacity-40"
        >
          Senden
        </button>
      </div>
    </section>
  );
}
