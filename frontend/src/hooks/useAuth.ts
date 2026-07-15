import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { fetchCurrentUser, loginUser, registerUser } from "../api/auth";
import { clearAuthToken, getAuthToken, storeAuthToken } from "../api/client";
import type { AuthCredentials, AuthUser } from "../types/auth";

/** Login state for the whole app; the JWT lives in localStorage ("pm_token"). */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState<boolean>(() => getAuthToken() !== null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (getAuthToken() === null) return;
    fetchCurrentUser()
      .then(setUser)
      .catch(() => clearAuthToken())
      .finally(() => setChecking(false));
  }, []);

  const login = async (credentials: AuthCredentials) => {
    const response = await loginUser(credentials);
    storeAuthToken(response.access_token);
    setUser(response.user);
  };

  const register = async (credentials: AuthCredentials) => {
    const response = await registerUser(credentials);
    storeAuthToken(response.access_token);
    setUser(response.user);
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    queryClient.removeQueries({ queryKey: ["my-trips"] });
  };

  return { user, checking, login, register, logout };
}

export type Auth = ReturnType<typeof useAuth>;
