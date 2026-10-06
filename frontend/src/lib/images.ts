/**
 * Kein Foto-API-Vertrag im Backend vorhanden (travel_api.py liefert aktuell keine Bild-URLs).
 * Picsum liefert pro Seed ein stabiles, aber beliebiges Foto ohne API-Key — reicht als
 * visueller Platzhalter für den MVP, bis ein echter Bild-Provider angebunden ist.
 */
export function seededImage(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}
