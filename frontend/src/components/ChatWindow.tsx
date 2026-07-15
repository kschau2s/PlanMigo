import { useEffect, useRef } from "react";

import type { ChatEntry } from "../types/chat";
import { Bubble } from "./Chat";

interface ChatWindowProps {
  history: ChatEntry[];
  isSending: boolean;
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

/** Message thread with auto-scroll. The composer is placed by the page below. */
export function ChatWindow({ history, isSending }: ChatWindowProps) {
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
    </>
  );
}
