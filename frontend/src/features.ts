export type FeatureId =
  | "arena"
  | "matchmaking"
  | "ranked"
  | "challenges"
  | "history"
  | "profile"
  | "settings";

export type FeatureDefinition = {
  id: FeatureId;
  label: string;
  description: string;
  owner: "phaser" | "react" | "fastapi";
  status: "live" | "migration";
};

export const FEATURES: readonly FeatureDefinition[] = [
  { id: "arena", label: "Arena", description: "Local 2D physics match", owner: "phaser", status: "live" },
  { id: "matchmaking", label: "Matchmaking", description: "Queue and room discovery", owner: "fastapi", status: "migration" },
  { id: "ranked", label: "Ranked", description: "Competitive games and ELO", owner: "fastapi", status: "migration" },
  { id: "challenges", label: "Challenges", description: "Challenge and progression loop", owner: "react", status: "migration" },
  { id: "history", label: "History", description: "Completed matches and replay access", owner: "fastapi", status: "migration" },
  { id: "profile", label: "Profile", description: "Identity, progression and stats", owner: "fastapi", status: "migration" },
  { id: "settings", label: "Settings", description: "Theme, audio, input and accessibility", owner: "react", status: "live" },
] as const;

export const getFeature = (id: FeatureId) => FEATURES.find((feature) => feature.id === id) ?? FEATURES[0];