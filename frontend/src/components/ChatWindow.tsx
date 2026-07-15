import { useEffect, useRef } from "react";

import type { ChatEntry } from "../types/chat";
import { Bubble } from "./Chat";

interface ChatWindowProps {
  history: ChatEntry[];
  isSending: boolean;
  /** Initial of the logged-in user for the avatar next to own messages. */
  userInitial?: string | null;
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

/** Message thread with auto-scroll inside the chat window's scroll container. */
export function ChatWindow({ history, isSending, userInitial = null }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // block "nearest" keeps the outer page still and scrolls only the window.
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history, isSending]);

  return (
    <>
      {history.map((entry, index) => (
        <Bubble key={index} me={entry.role === "user"} userInitial={userInitial}>
          {entry.content}
        </Bubble>
      ))}
      {isSending && <TypingIndicator />}
      <div ref={bottomRef} />
    </>
  );
}
