import { useEffect, useRef } from "react";

import type { ChatEntry } from "../types/chat";
import { Bubble, Composer } from "./Chat";

interface ChatWindowProps {
  history: ChatEntry[];
  onSend: (message: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

function TypingIndicator() {
  return (
    <Bubble>
      <div className="flex gap-1 py-0.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent-secondary [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent-secondary [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent-secondary [animation-delay:300ms]" />
      </div>
    </Bubble>
  );
}

export function ChatWindow({ history, onSend, isSending, disabled = false }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, isSending]);

  return (
    <>
      {history.map((entry, index) => (
        <Bubble key={index} me={entry.role === "user"}>
          {entry.content}
        </Bubble>
      ))}
      {isSending && <TypingIndicator />}
      <div ref={bottomRef} />
      <Composer onSend={onSend} disabled={isSending || disabled} />
    </>
  );
}
