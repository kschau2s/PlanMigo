import { useState } from "react";

import { ChatWindow } from "../components/ChatWindow";
import { KeywordPills } from "../components/KeywordPills";
import { TripCard } from "../components/TripCard";
import { useChat } from "../hooks/useChat";
import { useKeywords } from "../hooks/useKeywords";
import { useCreateTripPlan } from "../hooks/useTripPlan";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

export function PlannerPage() {
  const { keywords, addKeyword, removeKeyword } = useKeywords();
  const [keywordDraft, setKeywordDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatEntry[]>([]);

  const chat = useChat();
  const createTripPlan = useCreateTripPlan();

  const handleAddKeyword = () => {
    addKeyword(keywordDraft);
    setKeywordDraft("");
  };

  const handleSend = (message: string) => {
    setHistory((prev) => [...prev, { role: "user", content: message }]);
    chat.mutate(
      { conversation_id: conversationId, keywords, message },
      {
        onSuccess: (response) => {
          setConversationId(response.conversation_id);
          setHistory((prev) => [...prev, { role: "assistant", content: response.reply }]);
          if (response.ready_to_plan) {
            createTripPlan.mutate({
              conversation_id: response.conversation_id,
              keywords,
              answers: {},
            });
          }
        },
      },
    );
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-pm-orange">PlanMigo 🧭</h1>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-pm-sand px-3 py-2"
          value={keywordDraft}
          onChange={(e) => setKeywordDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
          placeholder="Schlagwort, z.B. Berge, ruhig, September"
        />
        <button
          onClick={handleAddKeyword}
          className="rounded-md bg-pm-sage px-4 py-2 text-pm-cream"
        >
          +
        </button>
      </div>
      <KeywordPills keywords={keywords} onRemove={removeKeyword} />

      <ChatWindow history={history} onSend={handleSend} isSending={chat.isPending} />

      {createTripPlan.data && <TripCard plan={createTripPlan.data} />}
    </div>
  );
}
