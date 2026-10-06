import { apiClient } from "./client";
import type { FlightOption } from "../types/flight";

export async function suggestFlights(keywords: string[]): Promise<FlightOption[]> {
  const { data } = await apiClient.post<{ flights: FlightOption[] }>("/flights/suggest", {
    keywords,
  });
  return data.flights;
}
