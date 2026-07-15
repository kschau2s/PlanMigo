import { useState } from "react";

export interface AppSettings {
  notifications: boolean;
  priceAlert: boolean;
  personalization: boolean;
  language: "de" | "en";
  currency: "EUR" | "CHF" | "USD";
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  priceAlert: true,
  personalization: false,
  language: "de",
  currency: "EUR",
};

const STORAGE_KEY = "pm_settings";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Local (browser-only) app settings — no account system exists yet. */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const update = (patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode etc.) — keep in-memory only.
      }
      return next;
    });
  };

  const resetLocalData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("pm_web_screen");
    } catch {
      // ignore
    }
    setSettings(DEFAULT_SETTINGS);
  };

  return { settings, update, resetLocalData };
}
