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
  items: TripItem[];
}

export interface TripPlanRequest {
  conversation_id: string;
  keywords: string[];
  answers: Record<string, string>;
}
