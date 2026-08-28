import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { ArenaScene, ArenaState } from "./game/ArenaScene";

type Team = "white" | "black";
const initialState: ArenaState = { turn: "white", phase: "aim", whiteHp: 0, blackHp: 0, collisions: 0, winner: null, message: "White to move." };

function StatCard({ team, hp }: { team: Team; hp: number }) {
  const label = team === "white" ? "WHITE CORE" : "BLACK CORE";
  const total = 8 * 45 + 120 + 75 + 80 + 65 + 70;
  const value = Math.max(0, Math.min(100, total ? (hp / total) * 100 : 100));
  return <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl">
    <div className="flex items-center justify-between"><span className="text-xs font-semibold tracking-[0.24em] text-slate-500">{label}</span><span className="text-sm font-bold">{hp} HP</span></div>
    <div className="mt-4 h-2 rounded-full bg-slate-800"><motion.div className={`h-2 rounded-full ${team === "white" ? "bg-cyan-300" : "bg-rose-400"}`} animate={{ width: `${value}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div>
  </div>;
}

export function App() {
  const mount = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(initialState);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!mount.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 640,
      height: 640,
      parent: mount.current,
      transparent: true,
      scene: [],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 640,
        height: 640,
      },
      input: {
        activePointers: 2,
        windowEvents: true,
      },
    });
    game.scene.add("ArenaScene", ArenaScene, true, { onState: setState });
    return () => game.destroy(true);
  }, []);

  return <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
    <header className="mx-auto mb-6 flex max-w-7xl flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300/70">ArChess</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Launch. Collide. Survive.</h1></div>
      <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity }} className="rounded-full border border-slate-700 bg-slate-900/85 px-4 py-2 text-sm font-bold shadow-xl">React · Phaser · 2D</motion.div>
    </header>

    <section className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[250px_minmax(640px,1fr)_250px]">
      <div className="space-y-4"><StatCard team="white" hp={state.whiteHp}/><div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Battle State</p><div className="mt-3 flex justify-between border-b border-slate-800 py-3 text-sm"><span className="text-slate-400">Turn</span><strong>{state.turn.toUpperCase()}</strong></div><div className="flex justify-between py-3 text-sm"><span className="text-slate-400">Phase</span><strong>{state.phase.toUpperCase()}</strong></div><div className="flex justify-between py-3 text-sm"><span className="text-slate-400">Collisions</span><strong>{state.collisions}</strong></div><button type="button" onClick={() => setShowHelp(true)} className="mt-4 w-full rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold hover:border-slate-500">How to play</button></div></div>
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-3 shadow-[0_30px_110px_rgba(0,0,0,.55)]"><div ref={mount} className="phaser-host aspect-square w-full overflow-hidden rounded-[1.5rem] border border-slate-700 bg-[radial-gradient(circle_at_50%_25%,#1e2a3b,#0b111a_55%,#05080d)]" aria-label="ArChess Phaser arena" /></section>
      <div className="space-y-4"><StatCard team="black" hp={state.blackHp}/><div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Combat Feed</p><div className="mt-3 min-h-20 text-sm leading-6 text-slate-300">{state.message || "Ready."}</div><div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-500">Phaser owns the game loop and browser input.</div></div></div>
    </section>

    <AnimatePresence>{showHelp && <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHelp(false)}><motion.div className="max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-7 shadow-2xl" initial={{ scale: .97, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, y: 12 }} onClick={(event) => event.stopPropagation()}><div className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300/70">Controls</div><h2 className="mt-2 text-2xl font-black">Drag backward, then release.</h2><p className="mt-3 text-sm leading-6 text-slate-400">Only the active team's living pieces can launch. Phaser owns the game loop, pointer lifecycle, scaling and collision state; React renders the surrounding application UI.</p><button type="button" onClick={() => setShowHelp(false)} className="mt-5 rounded-xl bg-white px-4 py-2 font-bold text-slate-950">Close</button></motion.div></motion.div>}</AnimatePresence>
  </main>;
}
