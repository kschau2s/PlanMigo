export interface DestinationCandidate {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  reason: string | null;
}
