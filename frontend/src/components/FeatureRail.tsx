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
    <nav aria-label="ArChess features" className="mb-5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/75 p-2 shadow-xl">
      <div className="flex min-w-max gap-2">
        {FEATURES.map((feature) => {
          const selected = feature.id === active;
          return (
            <button
              key={feature.id}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelect(feature.id)}
              className={`relative rounded-xl px-3 py-2 text-left transition ${selected ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}
              title={feature.description}
            >
              {selected && <motion.span layoutId="active-feature" className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-cyan-300" />}
              <span className="flex items-center gap-2 text-sm font-bold">
                <span aria-hidden="true">{ICONS[feature.id]}</span>
                {feature.label}
                {feature.status === "migration" && <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300">Soon</span>}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
