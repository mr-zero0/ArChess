import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { SettingsModal } from "./components/settings";
import { ArenaScene } from "./game/ArenaScene";
import type { ArenaState, ArenaCallbacks } from "./game/ArenaScene";
import Phaser from "phaser";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [combatMessage, setCombatMessage] = useState<string>("Battle events appear here...");
  const [arenaState, setArenaState] = useState<ArenaState | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Callback from ArenaScene to update combat message and state
  const handleArenaState: ArenaCallbacks = (state) => {
    setArenaState(state);
    if (state.message) {
      setCombatMessage(state.message);
    }
  };

  useEffect(() => {
    const container = document.getElementById("phaser-game-container");
    if (!container) {
      console.error("Phaser container not found");
      return;
    }

    const config = {
      type: Phaser.CANVAS, // Force Canvas renderer for crisp pixel art
      parent: container,
      width: "100%", // Fill parent width
      height: "100%", // Fill parent height
      backgroundColor: "#05080d",
      scene: [ArenaScene],
      scale: {
        mode: Phaser.Scale.NONE, // No scaling, we control size via width/height percentages
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Pass the callback and canvas size to the scene
    const scene = game.scene.getScene("ArenaScene") as ArenaScene;
    if (scene) {
      scene.init({
        onState: handleArenaState,
        canvasWidth: game.scale.width,
        canvasHeight: game.scale.height,
      });
    }

    return () => {
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-[#05080d] text-[#edf4ff]">
      <header className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold">ArChess</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700">Settings</button>
          <button onClick={() => setShowHelp(true)} className="px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700">Help</button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 p-4 overflow-hidden">
        <aside className="md:col-span-3 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Stats</h2>
            <p className="text-sm text-slate-500">Sidebar content...</p>
          </div>
        </aside>

        <section className="md:col-span-6 flex flex-col items-center justify-center">
          <div id="phaser-game-container" className="w-full aspect-square bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl relative" />
        </section>

        <aside className="md:col-span-3 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 h-full">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Combat Feed</h2>
            <div className="text-sm text-slate-400">{combatMessage}</div>
            {arenaState && (
              <div className="mt-2 text-xs text-slate-500">
                Turn: {arenaState.turn} | Phase: {arenaState.phase} | White HP: {arenaState.whiteHp} | Black HP: {arenaState.blackHp}
              </div>
            )}
          </div>
        </aside>
      </main>

      <AnimatePresence>
        {showSettings && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <div className="bg-[#101826] p-6 rounded-2xl border border-cyan-400/25" onClick={(e) => e.stopPropagation()}>
              <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}