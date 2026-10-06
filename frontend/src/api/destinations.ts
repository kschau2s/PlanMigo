import { apiClient } from "./client";
import type { DestinationCandidate } from "../types/destination";

export async function suggestDestinations(
  conversationId: string,
  keywords: string[],
): Promise<DestinationCandidate[]> {
  const { data } = await apiClient.post<{ destinations: DestinationCandidate[] }>(
    "/destinations/suggest",
    { conversation_id: conversationId, keywords },
  );
  return data.destinations;
}
