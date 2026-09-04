import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { usePrefs } from "../prefs";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { useTheme } from "../theme";

export type SettingsTab = "game" | "audio" | "motion" | "accessibility";

export function Settings({ activeTab, onChangeTab }: { activeTab: SettingsTab; onChangeTab: (tab: SettingsTab) => void }) {
  const { prefs, setPrefs } = usePrefs();
  const { theme, setTheme } = useTheme();

  const [turnTime, setTurnTime] = useState(prefs.turnTime ?? 0);
  const [gameMode, setGameMode] = useState(prefs.gameMode ?? "match");

  useEffect(() => {
    setPrefs({ ...prefs, turnTime, gameMode });
  }, [turnTime, gameMode, prefs, setPrefs]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {activeTab === "game" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm mb-4">
            <span style={{ color: "var(--text-muted)" }}>Theme</span>
            <div className="flex gap-2">
              <button onClick={() => setTheme("dark")} className={`px-3 py-1 rounded-lg ${theme === "dark" ? "ring-2 ring-[var(--accent)]" : ""}`} style={{ background: "var(--bg-card)" }}>Dark</button>
              <button onClick={() => setTheme("light")} className={`px-3 py-1 rounded-lg ${theme === "light" ? "ring-2 ring-[var(--accent)]" : ""}`} style={{ background: "var(--bg-card)" }}>Light</button>
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Match Controls</p>
        </div>
      )}
    </motion.div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("game");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--bg-modal)] p-6 rounded-2xl border" style={{ borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-6" style={{ color: "var(--text-main)" }}>Preferences</h2>
        <Settings activeTab={activeTab} onChangeTab={setActiveTab} />
        <div className="mt-6">
          <Button className="w-full" onClick={onClose}>Apply Settings</Button>
        </div>
      </div>
    </div>
  );
}
