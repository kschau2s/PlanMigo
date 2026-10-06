export interface FlightOption {
  id: string;
  airline: string;
  destination: string;
  depart_month: string | null;
  duration: string | null;
  stops: string | null;
  price: number;
  note: string | null;
}
