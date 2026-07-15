import type { TripPlan, TripProposal } from "./trip";

export interface ChatRequest {
  conversation_id: string | null;
  keywords: string[];
  /** Empty string starts the conversation: Migo asks the first question. */
  message: string;
}

export interface ChatResponse {
  conversation_id: string;
  reply: string;
  ready_to_plan: boolean;
}

export interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

/** Client-side chat session shown in the sidebar (no backend listing endpoint yet). */
export interface ChatSession {
  id: string;
  keywords: string[];
  conversationId: string | null;
  history: ChatEntry[];
  /** Compact destination proposals shown after the clarify loop. */
  proposals: TripProposal[] | null;
  plan: TripPlan | null;
  lastMessage: string;
}
