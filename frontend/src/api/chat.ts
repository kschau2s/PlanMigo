import { apiClient } from "./client";
import type { ChatRequest, ChatResponse } from "../types/chat";

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>("/chat", request);
  return data;
}
