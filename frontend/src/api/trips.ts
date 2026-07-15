import { apiClient } from "./client";
import type { TripPlan, TripPlanRequest, TripProposal } from "../types/trip";

/** 2–3 compact destination proposals for a clarified conversation. */
export async function fetchTripProposals(conversationId: string): Promise<TripProposal[]> {
  const { data } = await apiClient.post<{ proposals: TripProposal[] }>("/trips/proposals", {
    conversation_id: conversationId,
  });
  return data.proposals;
}

export async function createTripPlan(request: TripPlanRequest): Promise<TripPlan> {
  const { data } = await apiClient.post<TripPlan>("/trips/plan", request);
  return data;
}

export async function getTripPlan(tripId: string): Promise<TripPlan> {
  const { data } = await apiClient.get<TripPlan>(`/trips/${tripId}`);
  return data;
}

/** Apply a free-text change request to an existing plan (LLM re-compose). */
export async function reviseTripPlan(tripId: string, message: string): Promise<TripPlan> {
  const { data } = await apiClient.post<TripPlan>(`/trips/${tripId}/revise`, { message });
  return data;
}

/** All trip plans of the logged-in user (requires auth). */
export async function fetchMyTrips(): Promise<TripPlan[]> {
  const { data } = await apiClient.get<TripPlan[]>("/trips");
  return data;
}
