import axios from "axios";

// Default is same-origin: Vite (dev) and nginx (Docker) proxy /api to the backend.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
});
