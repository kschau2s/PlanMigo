import { useMutation } from "@tanstack/react-query";

import { sendChatMessage } from "../api/chat";
import type { ChatRequest } from "../types/chat";

export function useChat() {
  return useMutation({
    mutationFn: (request: ChatRequest) => sendChatMessage(request),
  });
}
