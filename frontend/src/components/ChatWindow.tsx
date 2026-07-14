import { useState } from "react";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  history: ChatEntry[];
  onSend: (message: string) => void;
  isSending: boolean;
}

export function ChatWindow({ history, onSend, isSending }: ChatWindowProps) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim() || isSending) return;
    onSend(draft.trim());
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-pm-sand bg-pm-cream p-4">
      <div className="flex flex-col gap-2 overflow-y-auto max-h-96">
        {history.map((entry, index) => (
          <div
            key={index}
            className={
              entry.role === "user"
                ? "self-end rounded-lg bg-pm-orange px-3 py-2 text-pm-cream"
                : "self-start rounded-lg bg-pm-sage px-3 py-2 text-pm-cream"
            }
          >
            {entry.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-pm-sand px-3 py-2"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Antwort eingeben…"
        />
        <button
          onClick={submit}
          disabled={isSending}
          className="rounded-md bg-pm-orange px-4 py-2 text-pm-cream disabled:opacity-50"
        >
          Senden
        </button>
      </div>
    </div>
  );
}
