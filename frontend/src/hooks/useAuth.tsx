import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import * as authApi from "../api/auth";
import { AUTH_TOKEN_STORAGE_KEY } from "../api/client";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await authApi.login(email, password);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, access_token);
    setUser(await authApi.getCurrentUser());
  };

  const register = async (email: string, password: string) => {
    const { access_token } = await authApi.register(email, password);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, access_token);
    setUser(await authApi.getCurrentUser());
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
