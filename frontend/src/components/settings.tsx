import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { usePrefs } from "../prefs";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

export type SettingsTab = "game" | "audio" | "motion" | "accessibility";

export function Settings({ activeTab, onChangeTab }: { activeTab: SettingsTab; onChangeTab: (tab: SettingsTab) => void }) {
  const { prefs, setPrefs } = usePrefs();

  const [turnTime, setTurnTime] = useState(prefs.turnTime ?? 0);
  const [masterVolume, setMasterVolume] = useState(prefs.masterVolume ?? 80);
  const [effectsVolume, setEffectsVolume] = useState(prefs.effectsVolume ?? 80);
  const [musicVolume, setMusicVolume] = useState(prefs.musicVolume ?? 50);
  const [screenShake, setScreenShake] = useState(prefs.screenShake ?? true);
  const [reducedMotion, setReducedMotion] = useState(prefs.reducedMotion ?? false);
  const [haptics, setHaptics] = useState(prefs.haptics ?? true);
  const [gameMode, setGameMode] = useState(prefs.gameMode ?? "match");

  useEffect(() => {
    setPrefs({
      ...prefs,
      turnTime,
      masterVolume,
      effectsVolume,
      musicVolume,
      screenShake,
      reducedMotion,
      haptics,
      gameMode,
    });
  }, [turnTime, masterVolume, effectsVolume, musicVolume, screenShake, reducedMotion, haptics, gameMode, prefs, setPrefs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {activeTab === "game" && (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Match Controls</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Game Mode</span>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-slate-700/50 px-3 py-1 text-slate-300 hover:bg-slate-800/20 transition-colors cursor-pointer" onClick={() => setGameMode("match")}>
                  <input type="radio" name="gameMode" value="match" checked={gameMode === "match"} readOnly className="hidden" />
                  Match
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-700/50 px-3 py-1 text-slate-300 hover:bg-slate-800/20 transition-colors cursor-pointer" onClick={() => setGameMode("practice")}>
                  <input type="radio" name="gameMode" value="practice" checked={gameMode === "practice"} readOnly className="hidden" />
                  Practice
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 mb-1">Turn Timer</span>
              <div className="flex items-center gap-3">
                <select
                  value={turnTime.toString()}
                  onChange={(e) => setTurnTime(parseInt(e.target.value))}
                  className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="0">Off</option>
                  <option value="20">20 seconds</option>
                  <option value="45">45 seconds</option>
                  <option value="90">90 seconds</option>
                </select>
                <span className="text-xs text-slate-400">{turnTime > 0 ? `${turnTime}s` : "Off"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs will go here */}
      {activeTab === "audio" && (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Audio Settings</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Master Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-slate-400">{masterVolume}%</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Effects Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                value={effectsVolume}
                onChange={(e) => setEffectsVolume(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-slate-400">{effectsVolume}%</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Music Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-slate-400">{musicVolume}%</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "motion" && (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Motion Settings</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Screen Shake</span>
              <Button
                variant={screenShake ? "primary" : "secondary"}
                onClick={() => setScreenShake(!screenShake)}
                className="px-3 py-1 text-xs"
              >
                {screenShake ? "On" : "Off"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Reduced Motion</span>
              <Button
                variant={reducedMotion ? "primary" : "secondary"}
                onClick={() => setReducedMotion(!reducedMotion)}
                className="px-3 py-1 text-xs"
              >
                {reducedMotion ? "On" : "Off"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Haptics</span>
              <Button
                variant={haptics ? "primary" : "secondary"}
                onClick={() => setHaptics(!haptics)}
                className="px-3 py-1 text-xs"
              >
                {haptics ? "On" : "Off"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "accessibility" && (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Accessibility</p>
          <p className="text-sm text-slate-400">More accessibility options coming soon.</p>
        </div>
      )}
    </motion.div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("game");

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(event) => event.stopPropagation()}
      >
        <Card>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Settings</p>
              <h2 id="settings-title" className="mt-2 text-2xl font-black text-white">Preferences</h2>
            </div>
            <Button variant="icon" onClick={onClose} aria-label="Close settings">×</Button>
          </div>

          <div className="flex gap-4 mb-6">
            {[
              { id: "game", label: "Game", icon: "⚙️" },
              { id: "audio", label: "Audio", icon: "🔊" },
              { id: "motion", label: "Motion", icon: "🎥" },
              { id: "accessibility", label: "Accessibility", icon: "♿" }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "primary" : "secondary"}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className="flex-1 px-2 text-xs"
              >
                <span className="flex items-center justify-center gap-1">
                  <span aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </span>
              </Button>
            ))}
          </div>

          <div className="h-px my-6 bg-gradient-to-r from-slate-900/50 via-slate-800 to-slate-900/50"></div>

          <Settings activeTab={activeTab} onChangeTab={setActiveTab} />

          <div className="mt-6">
            <Button className="w-full" onClick={onClose}>Apply Settings</Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}