import { useQuery } from "@tanstack/react-query";

import { searchImage } from "../api/images";

/** Cached destination photo lookup; pass null/empty to disable. */
export function usePhoto(query: string | null) {
  const trimmed = query?.trim() ?? "";
  return useQuery({
    queryKey: ["photo", trimmed.toLowerCase()],
    queryFn: () => searchImage(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: Infinity,
    retry: 1,
  });
}
