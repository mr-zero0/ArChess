# ArChess — Product Design Tracker

**Repository:** `mr-zero0/ArChess`  
**Stack:** Python + Flask + HTML/CSS/JS + Three.js  
**Platform:** Browser / PWA  
**Current code release:** `v0.5.2`  
**Current engineering focus:** authoritative multiplayer + client reconciliation

> ArChess is a turn-based physics combat game played with chess armies: pull a piece back, launch it across the board, ricochet into enemy formations, create chain reactions, and destroy the enemy King.

## 1. Frozen Product Rules

- 8×8 board using normal chess opening arrangement.
- The chess piece itself is the projectile.
- Friendly fire is enabled.
- No check/checkmate/castling/en-passant/traditional chess movement restrictions.
- Win condition: opposing King HP reaches 0.
- Physics simulation is logically 2D; presentation is 3D.
- Competitive multiplayer must be server-authoritative.
- Competitive stats cannot be changed by cosmetics.
- Development target remains strict $0 until traction/budget justifies a cost gate.

## 2. Definition of Done

A feature is only ✅ when implementation exists, normal-use errors are addressed, reset/resize/input behavior is safe, regression coverage exists where practical, and browser verification is completed for user-facing behavior.

## 3. Status Legend

| Status | Meaning |
|---|---|
| ✅ DONE | Implemented and verified |
| 🟡 PARTIAL | Implemented but one or more acceptance checks remain |
| 🔵 NEXT | Immediate engineering priority |
| ⬜ TODO | Not started |
| ⛔ COST GATE | Requires paid platform/service or later budget |

## 4. Roadmap Dashboard

| Step | Area | Current status |
|---:|---|---|
| 0 | Product identity & rules | 🟡 8/12 |
| 1 | Repository & engineering baseline | 🟡 10/10 implementation; release-hygiene verification ongoing |
| 2 | Core physics & damage stabilization | 🟡 9/10 verified, multi-impact coverage added and awaiting CI execution |
| 3 | True 3D chess presentation | ✅ 8/8 |
| 4 | Board, camera, resize, themes | ✅ 5/5 |
| 5 | Audio, effects, haptics | ✅ 7/7 |
| 6 | Combat roles, balance, combos | ✅ 16/16 |
| 7 | UX, tutorial, accessibility | ✅ 18/18 |
| 8 | Local modes, challenges, replay | ✅ 7/7 |
| 9 | Automated testing, QA, performance | 🟡 implementation complete; fresh CI execution pending |
| 10 | Production-ready Flask | ✅ 12/12 |
| 11 | Accounts, profiles, persistence | 🟡 6/10 |
| 12 | Private online multiplayer MVP | 🟡 API foundation complete; browser end-to-end integration pending |
| 13 | Authoritative simulation, anti-cheat | 🟡 8/10 core items complete; client reconciliation/hash verification pending |
| 14 | Public matchmaking, ranked | ⬜ 0/15 |
| 15 | Progression, cosmetics | ✅ implementation exists; needs product-surface integration |
| 16 | Analytics, telemetry, balance dashboard | ⬜ 0/3 |
| 17 | Security, privacy, legal, licensing | 🟡 several controls already implemented; formal checklist remains |
| 18 | Zero-cost alpha distribution | ⬜ 0/12 |
| 19 | Closed alpha → beta → PMF | ⬜ 0/4 |
| 20 | Strict $0 public launch | ⬜ 0/3 |
| 21 | Paid platform gates | ⛔ COST GATE |
| 22 | Market-ready v1 | ⬜ 0/25 |

## 5. Completed Local Game Work

### STEP 0 — Product Identity

✅ Core slingshot-combat loop  
✅ King HP win condition  
✅ Friendly fire  
✅ HP/Power baselines  
✅ Piece-as-projectile rule  
✅ Wood/Dark/Light direction  
✅ Product positioned as physics combat  
✅ Tracker established

Remaining: freeze repository v1 scope, GitHub milestones, final tagline, branding/trademark review.

### STEP 1 — Engineering Baseline

✅ README / gitignore / requirements / pytest config  
✅ Flask application + tests  
✅ secret/cache gitignore coverage  
✅ `.env.example`  
✅ contribution/changelog/license/asset docs  
✅ issue templates  
✅ `/api/version`  
✅ CI workflow  
✅ MIT source license  
✅ dependency manifest repaired and package version aligned to `0.5.2`

### STEP 2 — Core Physics

✅ collision cooldown  
✅ duplicate damage prevention  
✅ mass + impulse propagation  
✅ impact threshold + damage clamp  
✅ physics debug overlay  
✅ collision regression coverage  
✅ settle-state coverage  
✅ repeated wall-impact coverage  
🟡 simultaneous three-piece impact coverage added; fresh CI execution pending

### STEPs 3–8

✅ Three.js and procedural chess pieces  
✅ board, lighting, shadows, themes  
✅ resize/fullscreen/high-DPI support  
✅ audio, VFX, haptics/accessibility  
✅ per-piece combat roles and tuning  
✅ combo/stat tracking  
✅ tutorial, keyboard access, mobile targets  
✅ local Match and Practice modes  
✅ turn timer  
✅ challenges  
✅ replay capture + viewer  
✅ replay crash fix

## 6. STEP 9 — QA / Testing / Performance

Implemented:

✅ Python unit/integration test suite  
✅ JavaScript physics suite  
✅ Chromium / Firefox / WebKit browser matrix definitions  
✅ desktop/tablet/mobile viewport matrix  
✅ pointer/touch coverage  
✅ performance benchmark harness

Current acceptance gate:

🟡 Fresh GitHub Actions execution of the complete matrix must be observed before this section is promoted to fully verified DONE.

## 7. STEP 10 — Production Flask

✅ App factory  
✅ environment configs  
✅ structured logging  
✅ health endpoint  
✅ version endpoint  
✅ JSON request validation  
✅ JSON error handlers  
✅ 1 MiB request limit  
✅ Gunicorn configuration  
✅ security headers  
✅ rate-limit policy  
✅ production `SECRET_KEY` requirement

## 8. STEP 11 — Accounts / Persistence

✅ anonymous guest identity  
✅ registration/login deliberately deferred  
✅ persistent local settings  
✅ local match history  
✅ database migrations  
✅ local data export  
✅ minimal personal-data model

Still TODO:

⬜ password/auth strategy  
⬜ profile page  
⬜ account deletion

## 9. STEP 12 — Private Multiplayer

Implemented server API foundation:

✅ room creation  
✅ room join  
✅ team assignment  
✅ match start  
✅ server turn state  
✅ launch endpoint  
✅ state synchronization API  
✅ HP state API  
✅ destruction state API  
✅ game-over state API  
✅ reconnect  
✅ rematch  
✅ room lifecycle handling

Current gap:

🟡 Browser multiplayer client is not yet fully switched to consume the new authoritative server snapshot and server-issued piece IDs.

## 10. STEP 13 — Authoritative Simulation / Anti-Cheat

### ✅ Completed

- Canonical server match state.
- Launch validation: turn, ownership, existence, alive state, finite vector, speed limit.
- Deterministic fixed-step server physics.
- Boundary collision and friction.
- Piece-piece collision and mass-based impulse.
- Damage calculation, clamp, cooldown and destruction.
- Canonical snapshots + persisted HP state.
- Invalid-client-action logging.
- Flask-Limiter rate limiting.
- Server-generated game-over result flow.

### 🟡 Still open

- Client reconciliation must consume server snapshots in the browser multiplayer flow.
- Replay checksum is currently not a cryptographic/deterministic match hash.

### Explicit security rule

Client-submitted `/sync`, `/hp`, `/destruction`, and `/gameover` POSTs are rejected for authoritative play. They cannot overwrite canonical match state.

## 11. Immediate Execution Queue

### 🔵 A — Finish multiplayer authority integration

1. Browser receives canonical state and server piece IDs at match start.
2. Browser sends only launch intent.
3. Browser applies returned canonical snapshot/events.
4. Reconnect restores canonical state.
5. Client-side drift triggers reconciliation from the server snapshot.

### 🔵 B — Finish verification

1. Execute complete pytest suite.
2. Execute Node physics suite.
3. Execute browser matrix across Chromium/Firefox/WebKit.
4. Execute performance benchmark.
5. Review CI results before promoting tracker items to ✅.

### 🔵 C — Finish anti-cheat integrity

1. Replace checksum placeholder with deterministic state hashing.
2. Hash shot intent + canonical pre/post state.
3. Add replay-integrity regression tests.

## 12. Later Roadmap

### STEP 14 — Public Matchmaking / Ranked

⬜ queue join/leave  
⬜ match found flow  
⬜ reconnect  
⬜ surrender  
⬜ timeout handling  
⬜ hidden MMR  
⬜ divisions  
⬜ placement  
⬜ rating updates  
⬜ abandonment handling  
⬜ leaderboard  

### STEP 15 — Progression / Cosmetics

✅ XP/level model exists  
✅ cosmetic schema exists  
✅ competitive stat parity preserved  
✅ no stat-boosting purchase policy

### STEP 16 — Analytics

⬜ product metrics  
⬜ explicit data-minimization policy tied to telemetry  
⬜ free telemetry path

### STEP 17 — Security / Privacy / Legal

⬜ deployment HTTPS  
⬜ secure cookies where applicable  
⬜ CSRF strategy where applicable  
⬜ authentication abuse controls  
⬜ dependency update process  
⬜ secret scanning  
⬜ backups  
⬜ privacy policy  
⬜ data inventory  
⬜ retention rules  
⬜ full third-party license inventory  
⬜ trademark/branding review

### STEPs 18–20 — Alpha / Launch

⬜ feedback loop  
⬜ known-issues process  
⬜ alpha distribution  
⬜ broader alpha  
⬜ public beta  
⬜ retention/engagement decision gates  
⬜ strict $0 browser/PWA/itch.io launch

### STEP 21 — Paid Platforms

⛔ Steam  
⛔ Apple App Store  
⛔ Google Play

### STEP 22 — Market-ready v1

⬜ product-wide acceptance pass after multiplayer, security, distribution and telemetry gates are complete.

## 13. Current Verification Snapshot

| Check | State |
|---|---|
| `requirements.txt` encoding/dependencies | ✅ repaired |
| Python test definitions | ✅ present |
| JavaScript physics tests | ✅ present |
| Browser matrix workflow | ✅ configured |
| Authoritative simulation module | ✅ present |
| Authoritative API integration | ✅ present |
| Authoritative API regression tests | ✅ present |
| Fresh CI execution after latest authority changes | 🟡 pending observation |
| Browser multiplayer end-to-end | 🟡 pending |
| Replay integrity checksum | 🟡 pending |

## 14. Recent Implementation Commits

- `984b6de` — repaired Python dependency manifest.
- `d26694d` — strengthened deterministic authoritative physics.
- `d4087f1` — routed multiplayer through authoritative server simulation.
- `9534018` — added authoritative multiplayer API regression tests.
- `a863809` — aligned Node package version to `0.5.2`.
- `0f4afce` — added tracker verification record.

## 15. Rules for Future Updates

- Do not mark code merely because it exists; verify its acceptance criterion.
- Update this tracker after each verified batch of roughly 5–10 subtasks.
- Keep security-sensitive multiplayer state server-authoritative.
- Do not introduce paid dependencies into the core free game.
- Keep advanced features such as AI, tournaments, clans, loot boxes, blockchain, voice chat, UGC marketplace and native mobile outside the current core roadmap unless deliberately re-scoped.
