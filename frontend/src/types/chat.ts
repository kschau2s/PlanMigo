export interface ChatRequest {
  conversation_id: string | null;
  keywords: string[];
  message: string;
}

export interface ChatResponse {
  conversation_id: string;
  reply: string;
  ready_to_plan: boolean;
}
