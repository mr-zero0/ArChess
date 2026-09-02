import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { FeatureId } from "../features";
import { usePrefs } from "../prefs";

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

      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Audio</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-500 mb-1">Master Volume</span>
            <div className="flex items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="ml-3 text-xs text-slate-400 min-w-[3ch]">{masterVolume}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-500 mb-1">Effects Volume</span>
            <div className="flex items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={effectsVolume}
                onChange={(e) => setEffectsVolume(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="ml-3 text-xs text-slate-400 min-w-[3ch]">{effectsVolume}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-500 mb-1">Ambience Volume</span>
            <div className="flex items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="ml-3 text-xs text-slate-400 min-w-[3ch]">{musicVolume}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Motion</p>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={screenShake}
              onChange={(e) => setScreenShake(e.target.checked)}
              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-700 rounded"
            />
            <span className="ml-3 text-sm text-slate-300">Screen shake</span>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-700 rounded"
            />
            <span className="ml-3 text-sm text-slate-300">Reduced motion</span>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={haptics}
              onChange={(e) => setHaptics(e.target.checked)}
              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-700 rounded"
            />
            <span className="ml-3 text-sm text-slate-300">Haptics feedback</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Accessibility</p>
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Reduce motion preference is respected from system settings when enabled.
          </p>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-slate-700 rounded"
            />
            <span className="ml-3 text-sm text-slate-300">Follow system reduce motion setting</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("game");

  if (!open) {
    return null;
  }

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
        className="w-full max-w-md rounded-2xl border border-cyan-400/25 bg-[#101826] p-6 shadow-2xl shadow-cyan-950/40"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Settings</p>
            <h2 id="settings-title" className="mt-2 text-2xl font-black text-white">Preferences</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close settings">
            ×
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          {[
            { id: "game", label: "Game", icon: "⚙️" },
            { id: "audio", label: "Audio", icon: "🔊" },
            { id: "motion", label: "Motion", icon: "🎥" },
            { id: "accessibility", label: "Accessibility", icon: "♿" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-cyan-600/80 to-blue-600/80 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/50"
                  : "bg-gradient-to-br from-slate-900/60 to-slate-950/40 text-slate-400 hover:text-slate-300 border border-slate-800/50 hover:border-slate-700/80"
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <div className="divider h-px my-6 bg-gradient-to-r from-slate-900/50 via-slate-800 to-slate-900/50"></div>

        <Settings activeTab={activeTab as SettingsTab} onChangeTab={setActiveTab} />

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-cyan-500/30"
          >
            Apply Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}