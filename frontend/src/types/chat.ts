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
