/**
 * Kein Foto-API-Vertrag im Backend vorhanden (travel_api.py liefert aktuell keine Bild-URLs).
 * Picsum liefert pro Seed ein stabiles, aber beliebiges Foto ohne API-Key — dient als
 * Fallback, wenn für einen Ort kein passendes Foto gefunden wird.
 */
export function seededImage(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CACHE_PREFIX = "pm-place-image:";
const MAX_CONCURRENT_REQUESTS = 3;

// Commons drosselt viele parallele anonyme Anfragen — daher max. 3 gleichzeitig.
let activeRequests = 0;
const waiting: (() => void)[] = [];

async function withRequestSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  activeRequests += 1;
  try {
    return await task();
  } finally {
    activeRequests -= 1;
    waiting.shift()?.();
  }
}

/** Suchbegriff für ein freies Reiseziel (z. B. aus einem Reiseplan) — "Rom" allein findet sonst Museen o. Ä. */
export function destinationQuery(destination: string): string {
  return `${destination} Panorama`;
}

interface CommonsResponse {
  query?: {
    pages?: Record<string, { index: number; imageinfo?: { thumburl?: string }[] }>;
  };
}

/**
 * Sucht auf Wikimedia Commons ein frei lizenziertes Foto passend zum Suchbegriff
 * (z. B. "Lissabon Tram"). Ohne API-Key, CORS via `origin=*`. `index` wählt den n-ten
 * Treffer — für Galerien mit mehreren unterschiedlichen Fotos desselben Ortes.
 * Ergebnisse werden in localStorage gecacht, damit Commons nicht bei jedem Laden gefragt wird.
 */
export async function fetchPlaceImage(query: string, index = 0, width = 960): Promise<string | null> {
  const cacheKey = `${CACHE_PREFIX}${query}|${index}|${width}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached !== null) return cached || null;
  } catch {
    // localStorage nicht verfügbar — einfach ohne Cache weiter.
  }

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `${query} filemime:image/jpeg -map -flag -coat -logo -diagram`,
    gsrnamespace: "6",
    gsrlimit: String(index + 1),
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: String(width),
  });

  const data = await withRequestSlot(async () => {
    const response = await fetch(`${COMMONS_API}?${params}`);
    if (!response.ok) throw new Error(`Commons ${response.status}`);
    return (await response.json()) as CommonsResponse;
  });
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  const url = pages[index]?.imageinfo?.[0]?.thumburl ?? pages[0]?.imageinfo?.[0]?.thumburl ?? null;

  try {
    localStorage.setItem(cacheKey, url ?? "");
  } catch {
    // Cache voll oder gesperrt — egal.
  }
  return url;
}
