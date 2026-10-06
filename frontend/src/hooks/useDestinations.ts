import { useMutation } from "@tanstack/react-query";

import { suggestDestinations } from "../api/destinations";

export function useSuggestDestinations() {
  return useMutation({
    mutationFn: ({ conversationId, keywords }: { conversationId: string; keywords: string[] }) =>
      suggestDestinations(conversationId, keywords),
  });
}
