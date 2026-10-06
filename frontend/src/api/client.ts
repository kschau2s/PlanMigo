import axios from "axios";

export const AUTH_TOKEN_STORAGE_KEY = "planmigo_token";

// Default is same-origin: Vite (dev) and nginx (Docker) proxy /api to the backend.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
