import { useCallback, useState } from "react";

export type Preferences = {
  turnTime: number; // 0 = off, otherwise seconds
  masterVolume: number; // 0-100
  effectsVolume: number; // 0-100
  musicVolume: number; // 0-100
  screenShake: boolean;
  reducedMotion: boolean;
  haptics: boolean;
  gameMode: "match" | "practice";
};

const DEFAULT_PREFS: Preferences = {
  turnTime: 0,
  masterVolume: 80,
  effectsVolume: 80,
  musicVolume: 50,
  screenShake: true,
  reducedMotion: false,
  haptics: true,
  gameMode: "match",
};

export function usePrefs() {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem("archess-prefs");
    if (saved) {
      try {
        return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_PREFS;
      }
    }
    return DEFAULT_PREFS;
  });

  // Save to localStorage whenever prefs change
  const savePrefs = useCallback(
    (newPrefs: Preferences) => {
      try {
        localStorage.setItem("archess-prefs", JSON.stringify(newPrefs));
      } catch {
        // Ignore save errors
      }
    },
    []
  );

  const updatePrefs = useCallback(
    (newPrefs: Partial<Preferences>) => {
      const updated = { ...prefs, ...newPrefs };
      setPrefs(updated);
      savePrefs(updated);
    },
    [prefs, savePrefs]
  );

  return { prefs, setPrefs: updatePrefs };
}