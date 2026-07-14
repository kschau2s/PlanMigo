import { apiClient } from "./client";
import type { TripPlan, TripPlanRequest } from "../types/trip";

export async function createTripPlan(request: TripPlanRequest): Promise<TripPlan> {
  const { data } = await apiClient.post<TripPlan>("/trips/plan", request);
  return data;
}

export async function getTripPlan(tripId: string): Promise<TripPlan> {
  const { data } = await apiClient.get<TripPlan>(`/trips/${tripId}`);
  return data;
}
