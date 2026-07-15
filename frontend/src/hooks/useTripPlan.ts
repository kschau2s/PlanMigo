import { useMutation, useQuery } from "@tanstack/react-query";

import { createTripPlan, fetchMyTrips, getTripPlan } from "../api/trips";
import type { TripPlanRequest } from "../types/trip";

export function useCreateTripPlan() {
  return useMutation({
    mutationFn: (request: TripPlanRequest) => createTripPlan(request),
  });
}

export function useTripPlan(tripId: string | undefined) {
  return useQuery({
    queryKey: ["trip-plan", tripId],
    queryFn: () => getTripPlan(tripId!),
    enabled: Boolean(tripId),
  });
}

/** Persisted trip plans of the logged-in user; disabled for guests. */
export function useMyTrips(enabled: boolean) {
  return useQuery({
    queryKey: ["my-trips"],
    queryFn: fetchMyTrips,
    enabled,
  });
}
