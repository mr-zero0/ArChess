# ArChess — Remaining Feature Status

This file supplements `ARCHESS_PRODUCT_DESIGN_TRACKER.md` with implementation status that is intentionally kept separate from the official verified score.

## Current implementation batches

### Step 11 — Accounts, Profiles & Persistence
**Implemented:** 7/10

Profile/stat presentation now has server APIs and client UI. Authenticated accounts, authenticated-session security, and account deletion remain pending because they require a real authentication boundary and deletion semantics.

### Step 14 — Public Matchmaking & Ranked
**Implemented:** 15/15

Queue lifecycle, pairing, recovery, MMR expansion, ranked settlement, placement, tiers, leaderboard APIs/UI, surrender/timeout/abandonment handling, persistence hardening and regression/stress coverage are implemented. Full verification remains a separate gate.

### Step 15 — Progression & Cosmetics
**Implemented:** 6/6

Server-owned XP, levels, unlock rules, cosmetic ownership/equip APIs, persistence, ranked XP awards, progression profile payloads and a client progression/equip panel are implemented. Competitive piece statistics remain untouched.

### Step 16 — Analytics & Telemetry
**Implemented:** 5/5

Persistent telemetry events, irreversible actor hashing, real matchmaking/ranked/progression instrumentation and an operator-key-protected summary endpoint are implemented. Production retention and database verification remain pending.

### Step 17 — Security / Privacy / Legal
**Implemented/documented:** 9/10

Core backend hardening plus privacy and community-rule baselines are implemented. Full authenticated-session security and legal/asset review remain human/release gates.

### Step 18 — Deployment Baseline
**Implemented:** Docker/Gunicorn production baseline.

External host selection, HTTPS/domain, backups, monitoring, rollback and actual zero-cost deployment remain environment-dependent release gates.

## Official score rule

Implemented-but-unverified work does **not** increase the official verified completion percentage until its applicable test, browser, migration, security or production gate passes.
