export type TripItemType = "flight" | "stay" | "activity" | "restaurant";

export interface TripItem {
  id: string;
  type: TripItemType;
  payload: Record<string, unknown>;
  day: number;
  order: number;
}

export interface TripPlan {
  id: string;
  conversation_id: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  summary: string | null;
  lat: number | null;
  lon: number | null;
  items: TripItem[];
}

export interface TripPlanRequest {
  conversation_id: string;
  keywords: string[];
  answers: Record<string, string>;
  /** Index into the proposals previously returned for this conversation. */
  proposal_index?: number | null;
}

export interface TripProposal {
  destination: string;
  timeframe: string | null;
  estimated_budget: number | null;
  highlights: string[];
  lat: number | null;
  lon: number | null;
  image_query: string | null;
}
