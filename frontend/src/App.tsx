console.log("APP MODULE EVALUATED");
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ArenaState, BoardTheme, PieceTheme } from "./game/ArenaScene";
import { createAuthoritativeSession } from "./game/authoritativeSession";
import type { AuthoritativeSnapshot } from "./api/client";
import { STARTING_TEAM_MAX_HP } from "./game/rules.ts";
import { FeatureRail } from "./components/FeatureRail";
import { FEATURES, type FeatureId } from "./features";

type ArenaBridge = {
  applyAuthoritativeSnapshot: (snapshot: AuthoritativeSnapshot) => ArenaState;
  setThemes?: (board: BoardTheme, pieces: PieceTheme) => void;
};
type Team = "white" | "black";
type ArenaStatus = "loading" | "ready" | "error";

function isArenaBridge(value: unknown): value is ArenaBridge {
  return value !== null && typeof value === "object" && "applyAuthoritativeSnapshot" in value && typeof value.applyAuthoritativeSnapshot === "function";
}

async function waitForArenaBridge(
  game: { scene: { getScene: (key: string) => unknown } },
  timeoutMs = 5000,
  signal?: AbortSignal,
): Promise<ArenaBridge> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error("Arena startup cancelled");
    const scene = game.scene.getScene("ArenaScene");
    if (isArenaBridge(scene)) return scene;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, 50);
      const abort = () => {
        window.clearTimeout(timer);
        reject(new Error("Arena startup cancelled"));
      };
      signal?.addEventListener("abort", abort, { once: true });
    });
  }
  throw new Error(`ArenaScene authoritative bridge unavailable after ${timeoutMs}ms`);
}

const initialState: ArenaState = {
  turn: "white", phase: "aim", whiteHp: 0, blackHp: 0, collisions: 0, winner: null, message: "White to move.", selectedPiece: null,
};

function HealthBar({ team, hp, maxHp }: { team: Team; hp: number; maxHp?: number }) {
  const percentage = Math.max(0, Math.min(100, (hp / (maxHp || STARTING_TEAM_MAX_HP)) * 100));
  const bgColor = team === "white" ? "from-blue-600/20 via-cyan-500/20 to-blue-600/20" : "from-red-600/20 via-rose-500/20 to-red-600/20";
  const barColor = team === "white" ? "from-blue-400 via-cyan-300 to-blue-300" : "from-red-400 via-rose-300 to-red-300";
  
  return (
    <div className={`relative h-8 rounded-full bg-gradient-to-r ${bgColor} border border-slate-700/50 overflow-hidden`}>
      <motion.div 
        className={`h-full bg-gradient-to-r ${barColor} rounded-full shadow-lg`} 
        animate={{ width: `${percentage}%` }} 
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {hp} / {maxHp || STARTING_TEAM_MAX_HP}
      </div>
    </div>
  );
}

function StatCard({ team, hp }: { team: Team; hp: number }) {
  const label = team === "white" ? "WHITE TOTAL" : "BLACK TOTAL";
  const value = Math.max(0, Math.min(100, (hp / STARTING_TEAM_MAX_HP) * 100));
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl">
      <div className="flex items-center justify-between"><span className="text-xs font-semibold tracking-[0.24em] text-slate-500">{label}</span><span className="text-sm font-bold">{hp} HP</span></div>
      <div className="mt-4 h-2 rounded-full bg-slate-800"><motion.div className={`h-2 rounded-full ${team === "white" ? "bg-cyan-300" : "bg-rose-400"} `} animate={{ width: `${value}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div>
    </div>
  );
}

function BattleStateCard({ state, arenaStatus }: { state: ArenaState; arenaStatus: ArenaStatus }) {
  const phaseColors = {
    aim: "text-blue-300",
    launch: "text-cyan-300",
    collide: "text-yellow-300",
    resolve: "text-green-300",
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-950/40 p-6 shadow-2xl">
         <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-700/5 via-transparent to-transparent" />
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Battle Status</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
            <span className="text-slate-500">Current Turn</span>
            <span className={`font-bold uppercase px-3 py-1 rounded-lg ${state.turn === "white" ? "bg-blue-500/20 text-blue-300" : "bg-red-500/20 text-red-300"}`}>
              {state.turn}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
            <span className="text-slate-500">Phase</span>
            <span className={`font-bold uppercase px-3 py-1 rounded-lg ${phaseColors[state.phase as keyof typeof phaseColors]} bg-slate-800/50`}>
              {state.phase}
            </span>
          </div>
          <div className="flex items-center justify-between pb-3">
            <span className="text-slate-500">Collisions</span>
            <span className="font-bold text-amber-300 px-3 py-1 bg-amber-500/20 rounded-lg">{state.collisions}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800/50">
          <p className={`text-xs font-semibold px-2 py-1 rounded inline-block ${
            arenaStatus === "ready" ? "bg-green-500/20 text-green-300" :
            arenaStatus === "loading" ? "bg-blue-500/20 text-blue-300" :
            "bg-red-500/20 text-red-300"
          }`}>
            {arenaStatus === "ready" ? "✓ Arena Ready" : arenaStatus === "loading" ? "⟳ Connecting..." : "✕ Error"}
          </p>
        </div>
      </div>
    </div>
  );
}

function PieceInfoCard({ piece, team }: { piece: ArenaState["selectedPiece"]; team: Team }) {
  if (!piece) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="rounded-2xl overflow-hidden border border-cyan-500/50 bg-gradient-to-br from-cyan-950/60 via-slate-950/40 to-blue-950/40 p-6 shadow-2xl shadow-cyan-500/10"
    >
       <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-700/5 via-transparent to-transparent" />
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-4">📍 Selected Piece</p>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xl font-bold uppercase text-cyan-300">{piece.type}</span>
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-bold uppercase text-slate-300">{piece.team}</span>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-400">Health</span>
            <span className="font-bold text-cyan-300">{piece.hp} / {piece.maxHp}</span>
          </div>
          <HealthBar team={team} hp={piece.hp} maxHp={piece.maxHp} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div>ID: <span className="text-cyan-300 font-mono">{piece.id.slice(0, 6)}...</span></div>
        </div>
      </div>
    </motion.div>
  );
}

export function App() {
  const mount = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const sceneRef = useRef<ArenaBridge | null>(null);
  const sessionRef = useRef<ReturnType<typeof createAuthoritativeSession> | null>(null);
  const [state, setState] = useState(initialState);
  const [showHelp, setShowHelp] = useState(false);
  const [arenaStatus, setArenaStatus] = useState<ArenaStatus>("loading");
  const [arenaError, setArenaError] = useState("");
  const collisionsRef = useRef(0);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [activeFeature, setActiveFeature] = useState<FeatureId>("arena");
  const [boardScale, setBoardScale] = useState(100);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>("midnight");
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>("classic");

  const updateThemes = (nextBoardTheme: BoardTheme, nextPieceTheme: PieceTheme) => {
    setBoardTheme(nextBoardTheme);
    setPieceTheme(nextPieceTheme);
    sceneRef.current?.setThemes?.(nextBoardTheme, nextPieceTheme);
  };

  useEffect(() => {
    let cancelled = false;
    const startupAbort = new AbortController();
    const startArena = async () => {
      try {
        const session = createAuthoritativeSession(
          (snapshot) => {
            const next = sceneRef.current?.applyAuthoritativeSnapshot(snapshot);
            if (next) setState(next);
          },
          (event, detail) => console.debug(JSON.stringify({ scope: "app", event, ...detail })),
        );
        sessionRef.current = session;

        const [{ default: Phaser }, { ArenaScene }] = await Promise.all([import("phaser"), import("./game/ArenaScene")]);
        if (cancelled || startupAbort.signal.aborted || !mount.current) return;
        console.log("Mount div dimensions:", mount.current.getBoundingClientRect());
        const game = new Phaser.Game({ type: Phaser.AUTO, width: 640, height: 640, parent: mount.current, transparent: true, scene: [], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 640, height: 640 }, input: { activePointers: 2, windowEvents: true } });
        gameRef.current = game;
        game.scene.add("ArenaScene", ArenaScene, true, {
          onState: setState,
          onLaunch: (payload: { team: "white" | "black"; pieceId: string; dx: number; dy: number }) => session.launch(payload),
          boardTheme,
          pieceTheme,
        });
        sceneRef.current = await waitForArenaBridge(game, 5000, startupAbort.signal);
        if (cancelled || startupAbort.signal.aborted) return;
        console.log("AUTHORITATIVE SESSION ABOUT TO CONNECT");
        await session.connect();
        console.log("AUTHORITATIVE SESSION CONNECTED");
        if (!cancelled) setArenaStatus("ready");
      } catch (error) {
        sessionRef.current?.close();
        sessionRef.current = null;
        if (cancelled || startupAbort.signal.aborted) return;
        console.error("ARCHESS_ARENA_INIT_FAILED", error);
        setArenaStatus("error");
        setArenaError(error instanceof Error ? error.message : "Unknown arena initialization error");
      }
    };
    void startArena();
    return () => {
      cancelled = true;
      startupAbort.abort();
      sessionRef.current?.close();
      sessionRef.current = null;
      sceneRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setThemes?.(boardTheme, pieceTheme);
  }, [boardTheme, pieceTheme]);

  useEffect(() => {
    if (state.collisions > collisionsRef.current) {
      setFlash(true);
      setShake(true);
      collisionsRef.current = state.collisions;
      const timer = setTimeout(() => {
        setFlash(false);
        setShake(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.collisions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 text-slate-100">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-blob-2" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-blob-3" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-800/50 bg-gradient-to-b from-slate-900/40 via-slate-900/20 to-transparent backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-start justify-between">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="mb-2"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400/70 mb-2">⚡ Authoritative Chess Engine</p>
                  <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                    ArChess Arena
                  </h1>
                  <p className="text-sm text-slate-400 mt-2 font-semibold">Launch. Collide. Conquer.</p>
                </motion.div>
              </div>
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="px-4 py-2 rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 text-xs font-bold text-slate-300 uppercase tracking-wider"
                >
                  React · Phaser · Authority
                </motion.div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-cyan-500/30"
                >
                  New Game
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Feature Rail */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <FeatureRail active={activeFeature} onSelect={setActiveFeature} />
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] gap-6">
            {/* Left Sidebar */}
            <div className="space-y-6">
              <StatCard team="white" hp={state.whiteHp} />
              <AnimatePresence>
                {state.selectedPiece && <PieceInfoCard piece={state.selectedPiece} team={state.turn} />}
              </AnimatePresence>
              <BattleStateCard state={state} arenaStatus={arenaStatus} />
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/60 to-slate-950/40 hover:border-slate-600/80 hover:from-slate-900/80 hover:to-slate-950/60 text-sm font-bold uppercase tracking-wide transition-all text-slate-300"
              >
                📖 How to Play
              </button>
            </div>

            {/* Arena Center */}
            <div className="flex flex-col">
              <div className={`relative rounded-2xl overflow-hidden border-2 ${arenaStatus === "ready" ? "border-cyan-500/50" : "border-slate-700/50"} bg-gradient-to-b from-slate-900/50 via-slate-950/50 to-slate-950/50 shadow-2xl ${arenaStatus === "ready" ? "shadow-cyan-500/20" : "shadow-slate-950"} transition-all duration-500`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 px-5 py-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Board presentation</p>
                    <p className="text-sm font-semibold text-slate-300">{boardScale}% scale · {boardTheme} · {pieceTheme} pieces</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="icon-button" aria-label="Make board smaller" onClick={() => setBoardScale((value) => Math.max(70, value - 10))}>−</button>
                    <button type="button" className="icon-button" aria-label="Reset board size" onClick={() => setBoardScale(100)}>{boardScale}%</button>
                    <button type="button" className="icon-button" aria-label="Make board larger" onClick={() => setBoardScale((value) => Math.min(120, value + 10))}>+</button>
                    <label className="theme-control"><span>Board</span><select value={boardTheme} onChange={(event) => updateThemes(event.target.value as BoardTheme, pieceTheme)}><option value="midnight">Midnight</option><option value="woodland">Woodland</option><option value="ivory">Ivory</option></select></label>
                    <label className="theme-control"><span>Pieces</span><select value={pieceTheme} onChange={(event) => updateThemes(boardTheme, event.target.value as PieceTheme)}><option value="classic">Classic</option><option value="outline">Outline</option><option value="mono">Mono</option></select></label>
                  </div>
                </div>
                {arenaStatus === "loading" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
                  >
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center mb-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full"
                        />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">Connecting to Arena...</p>
                    </div>
                  </motion.div>
                )}
                {arenaStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
                  >
                    <div className="text-center p-8 max-w-md">
                      <p className="text-lg font-black uppercase tracking-[0.2em] text-rose-300 mb-3">⚠ Arena Error</p>
                      <p className="text-sm text-slate-300 leading-relaxed mb-6">{arenaError || "Unable to connect to the authoritative game service."}</p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm uppercase transition-all"
                      >
                        Reload Arena
                      </button>
                    </div>
                  </motion.div>
                )}
                <div
                  ref={mount}
                  style={{ width: `${boardScale}%`, alignSelf: "center" }}
                  className={`phaser-host aspect-square rounded-xl overflow-hidden bg-gradient-to-b from-blue-900/30 via-slate-900 to-slate-950 ${shake ? "animate-shake" : ""}`}
                  aria-label="ArChess Phaser arena"
                  aria-live="polite"
                />
              </div>
              {state.message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-lg bg-gradient-to-r from-slate-900/50 to-slate-950/50 border border-slate-800/50 text-center"
                >
                  <p className="text-sm font-semibold text-slate-300">{state.message}</p>
                </motion.div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              <StatCard team="black" hp={state.blackHp} />
              {state.winner && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/60 via-slate-950/40 to-slate-950/40 p-6 shadow-2xl shadow-amber-500/10 text-center"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">🏆 Game Over</p>
                  <p className="text-2xl font-black text-amber-300 mb-2">{state.winner.toUpperCase()} Wins!</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-sm uppercase transition-all"
                  >
                    Play Again
                  </button>
                </motion.div>
              )}
              <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-950/40 p-6 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">⚔ Combat Feed</p>
                <div className="text-sm text-slate-400 space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-slate-500">Battle events appear here...</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-title"
              className="w-full max-w-lg rounded-2xl border border-cyan-400/25 bg-[#101826] p-6 shadow-2xl shadow-cyan-950/40"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Arena briefing</p>
                  <h2 id="help-title" className="mt-2 text-2xl font-black text-white">How to play</h2>
                </div>
                <button type="button" onClick={() => setShowHelp(false)} className="icon-button" aria-label="Close help">×</button>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-slate-300">
                <p><strong className="text-white">Select:</strong> use the arrow keys to choose a piece.</p>
                <p><strong className="text-white">Aim:</strong> use W, A, S, and D to set direction.</p>
                <p><strong className="text-white">Launch:</strong> press Enter or Space to fire.</p>
              </div>
              <button type="button" onClick={() => setShowHelp(false)} className="primary-button mt-6 w-full">Back to arena</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
