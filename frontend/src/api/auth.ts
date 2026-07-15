import { apiClient } from "./client";
import type { AuthCredentials, AuthResponse, AuthUser } from "../types/auth";

export async function registerUser(credentials: AuthCredentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", credentials);
  return data;
}

export async function loginUser(credentials: AuthCredentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", credentials);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me");
  return data;
}
