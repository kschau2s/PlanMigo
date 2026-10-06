import { useEffect, useRef } from "react";

import type { ChatEntry } from "../types/chat";
import { Bubble } from "./Chat";

interface ChatMessagesProps {
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

/** Scrollable message list — lives in a frame's body slot, Composer stays in its footer. */
export function ChatMessages({ history, isSending }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, isSending]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {history.map((entry, index) => (
        <Bubble key={index} me={entry.role === "user"}>
          {entry.content}
        </Bubble>
      ))}
      {isSending && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
