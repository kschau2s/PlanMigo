import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchPlaceImage, seededImage } from "../lib/images";

interface PlaceImageProps {
  /** Suchbegriff für das Foto, z. B. "Lissabon Tram". */
  query: string;
  /** n-ter Suchtreffer — für mehrere verschiedene Fotos desselben Ortes. */
  index?: number;
  /** Gewünschte Bildbreite in px (Commons liefert die nächstgrößere Standardgröße). */
  width?: number;
  alt?: string;
  className?: string;
}

/**
 * Echtes Foto zum Ort (Wikimedia Commons), mit Picsum als Fallback, falls nichts gefunden
 * wird oder das Laden fehlschlägt. Zeigt bis dahin einen warmen Platzhalter, damit das
 * Layout nicht springt.
 */
export function PlaceImage({ query, index = 0, width = 960, alt = "", className = "" }: PlaceImageProps) {
  const [failed, setFailed] = useState(false);
  const { data: url, isPending } = useQuery({
    queryKey: ["place-image", query, index, width],
    queryFn: () => fetchPlaceImage(query, index, width),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  if (isPending) {
    return <div aria-hidden className={`animate-pulse bg-pm-paper ${className}`} />;
  }

  const src = url && !failed ? url : seededImage(`${query}-${index}`, width, Math.round(width * 0.66));

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
