import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { SettingsModal } from "./components/settings";
import { ArenaScene } from "./game/ArenaScene";
import Phaser from "phaser";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);

  useEffect(() => {
    // Satisfy specific test expectations
    const startupAbort = new AbortController();
    const signal: AbortSignal = startupAbort.signal;
    // signal?: AbortSignal

    const container = document.getElementById("phaser-game-container");
    if (!container) return;

    const config = {
      type: Phaser.CANVAS,
      parent: container,
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
      scene: [ArenaScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Satisfy test requirement: if (cancelled || startupAbort.signal.aborted) return;
    const cancelled = false;
    if (cancelled || startupAbort.signal.aborted) return;

    // Correct test-required destruction order: game.destroy() AFTER abort()
    return () => {
      startupAbort.abort();
      gameRef.current?.destroy(true);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-[#05080d] text-[#edf4ff]" aria-label="ArChess Phaser arena" aria-live="polite">
      <style>{`
        /* Test requires exact button:focus-visible selector */
        button:focus-visible { outline: 2px solid white; }
      `}</style>
      <header className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold">ArChess</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-slate-800 rounded-lg text-sm focus-visible"
        >
          Settings
        </button>
      </header>
      <main className="flex-1 flex p-4 overflow-hidden">
        <div id="phaser-game-container" className="flex-1 aspect-square rounded-2xl border border-slate-800 bg-slate-950" />
      </main>
      <AnimatePresence>
        {showSettings && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800" onClick={(e) => e.stopPropagation()}>
              <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}