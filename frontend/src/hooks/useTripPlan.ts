import { useMutation, useQuery } from "@tanstack/react-query";

import { createTripPlan, getTripPlan, listMyTrips } from "../api/trips";
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

export function useMyTrips(enabled: boolean) {
  return useQuery({
    queryKey: ["my-trips"],
    queryFn: listMyTrips,
    enabled,
  });
}
