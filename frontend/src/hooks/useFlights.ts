import { useMutation } from "@tanstack/react-query";

import { suggestFlights } from "../api/flights";

export function useSuggestFlights() {
  return useMutation({
    mutationFn: (keywords: string[]) => suggestFlights(keywords),
  });
}
