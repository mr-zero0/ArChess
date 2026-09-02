import { motion } from "motion/react";
import { FEATURES, type FeatureId } from "../features";

type Props = {
  active: FeatureId;
  onSelect: (id: FeatureId) => void;
};

const ICONS: Record<FeatureId, string> = {
  arena: "♞",
  matchmaking: "⚔",
  ranked: "♜",
  challenges: "✦",
  history: "◷",
  profile: "◉",
  settings: "⚙",
};

export function FeatureRail({ active, onSelect }: Props) {
  return (
    <nav aria-label="ArChess features" className="overflow-x-auto">
      <div className="flex min-w-max gap-3 pb-2">
        {FEATURES.map((feature) => {
          const selected = feature.id === active;
          return (
            <button
              key={feature.id}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelect(feature.id)}
              className={`relative rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                selected
                  ? "bg-gradient-to-r from-cyan-600/80 to-blue-600/80 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/50"
                  : "bg-gradient-to-br from-slate-900/60 to-slate-950/40 text-slate-400 hover:text-slate-300 border border-slate-800/50 hover:border-slate-700/80"
              }`}
              title={feature.description}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base">{ICONS[feature.id]}</span>
                {feature.label}
                {feature.status === "migration" && (
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300 font-semibold">
                    Soon
                  </span>
                )}
              </span>
              {selected && (
                <motion.div
                  layoutId="active-feature-bg"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 -z-10"
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
