# ArChess — Product Design Tracker

**Repository:** `mr-zero0/ArChess` · **Stack:** Python + Flask + HTML/CSS/JS (Three.js) · **Platform:** Browser / PWA

ArChess is **not ordinary chess with animations**. It is a turn-based physics combat game played with chess armies: pull a piece back, launch it across the board, ricochet into enemy formations, create chain reactions, and destroy the enemy King.

> **Guiding question for every feature:** *Does this make ArChess a better competitive physics chess battle game?*

---

## 1. Overview

### 1.1 Project Summary

- 1.1.1 — 8×8 board, chess opening arrangement, physics-based slingshot combat.
- 1.1.2 — Win when the opposing King HP ≤ 0 (no check/checkmate/castling/en passant).
- 1.1.3 — Friendly fire enabled; chain reactions are the core fantasy.
- 1.1.4 — Status: **pre-alpha local game**; online multiplayer not yet built.

### 1.2 Legend & Rules of Use

| Status | Meaning |
|---|---|
| ✅ DONE | Implemented and verified |
| 🟡 PARTIAL | Implemented partly or awaiting verification/polish |
| 🔵 NEXT | Immediate recommended priority |
| ⬜ TODO | Not started |
| ⛔ COST GATE | Cannot honestly be guaranteed at strict $0 |

- 1.2.1 — **Zero-Budget Rule:** development software costs $0; libraries must be free/open-source or commercially safe; art/audio created in-house or CC0; free cloud tiers only for prototype/alpha; paid items explicitly marked COST GATE; paid features never required to complete core game.
- 1.2.2 — **Definition of Done (per feature):** implemented; no known normal-use console error; works after reset, resize, mouse, and touch; does not break physics; documented; regression-tested when automatable; tested in Chromium + one other browser for user-facing features.
- 1.2.3 — **Tracker discipline:** work tracked as small subtasks; update this file as subtasks finish; commit to GitHub after each batch of ~5–10 finished subtasks; do NOT mark a subtask ✅ until its acceptance criterion is verified.

---

## 2. Core Design Pillars (Frozen)

- 2.1 — **A — Satisfying Physical Launches:** every shot feels good before progression matters. Aiming immediate, readable, predictable enough to reward skill.
- 2.2 — **B — Tactical Chain Reactions:** one launch may create multiple collisions, but chains must stay understandable. Enable intentional direct hits, bank shots, sacrificial hits, friendly-fire manipulation, dominoes, King setup shots.
- 2.3 — **C — Pieces Have Combat Identity:** pieces differ physically/strategically via HP, Power, mass, radius, launch response, friction, silhouette — not skins.
- 2.4 — **D — Physical Chess Set Presentation:** default resembles a premium wood chess board turned battlefield (real 3D silhouettes, wood board, rosewood vs ebony sides, shadows). Themes: Wood / Dark / Light.
- 2.5 — **E — Easy to Learn, Difficult to Master:** controls understood in under a minute; skill from angle, power, collision prediction, piece value, positioning, risk, chains, defense.
- 2.6 — **F — No Pay-to-Win:** competitive physics/stats identical across cosmetic variants.

---

## 3. Canonical Game Rules (Frozen)

- 3.1 — **Board:** 8×8, normal chess opening arrangement. Physics coordinates independent of screen resolution/zoom; resizing board never changes gameplay physics.
- 3.2 — **Turn flow:** current player selects a living piece → drag back → aim + power → release → launch → physics/impacts/settle → next player.
- 3.3 — **Selection:** only the current player's living pieces selectable. Dead pieces cannot select or collide.
- 3.4 — **Launch:** the chess piece itself is the projectile (no ball/puck/coin). `vx = (piece.x - pointer.x) * launchStrength`; speed clamped; zero-distance drag does not launch.
- 3.5 — **Collision:** pieces are physical bodies (circle/capsule-like logical shapes). Detect overlap → normal → relative normal velocity → impact intensity → damage both → resolve overlap → impulse/bounce → feedback → prevent duplicate damage from same contact → continue chain.
- 3.6 — **Friendly fire: enabled** — allied pieces can damage allies; core strategy, not a bug.
- 3.7 — **Win condition:** no check/checkmate/castling/en passant/traditional capture/movement restriction. **Win when opposing King HP ≤ 0.**
- 3.8 — **Chain reaction ideal:** spectacular multi-piece chains possible because the player created them, not because every ordinary launch destabilizes all 32 pieces.

---

## 4. Piece Statistics & Damage Model (Frozen Baselines)

### 4.1 Canonical Stats

| Piece | HP | Power | Combat concept |
|---|---|---:|---:|---|
| Pawn | 30 | 10 | expendable setup / light projectile |
| Knight | 50 | 30 | mobile trick-shot piece |
| Bishop | 40 | 25 | precision / long-slide |
| Rook | 80 | 40 | heavy battering ram |
| Queen | 90 | 70 | high-value offensive piece |
| King | 120 | 100 | objective + dangerous heavy piece |

### 4.2 Damage Model

- 4.2.1 — Formula: `relativeVelocity → normalizedImpact → attackerPower × normalizedImpact × damageMultiplier → clamp → damage`.
- 4.2.2 — Both participants may take damage from the other's effective impact.
- 4.2.3 — Required properties: weak+slow = small damage; strong+fast = large damage; damage clamped; stationary contact never repeatedly drains HP; one event not counted once per substep; sub-threshold impacts deal ~zero.
- 4.2.4 — **Collision event cooldown:** a touching pair gets no fresh impact damage until separated and re-colliding meaningfully.

### 4.3 Combo / Skill Feedback

- 4.3.1 — Callouts (presentation/scoring first, never stat buffs): DIRECT HIT, BANK SHOT, DOUBLE/TRIPLE HIT, CHAIN REACTION, DOMINO, ROYAL STRIKE, SACRIFICE, FRIENDLY FIRE, KING BREAKER, LAST STAND.
- 4.3.2 — Do not let combo multipliers distort ranked physics until extensively tested.

---

## 5. Technical Architecture (Frozen)

- 5.1 — **Client:** HTML5, CSS3, Vanilla JS modules, Three.js for real 3D presentation, DOM for menus/HUD, Web Audio API for runtime audio, Pointer Events for mouse/touch.
- 5.2 — **Physics:** core gameplay physics logically **2D** even with 3D visuals (simpler deterministic sim, sync, balance, CPU, mobile; visuals tumble/tilt independently).
- 5.3 — **Backend:** Python 3 + Flask; Flask-SocketIO or equivalent WebSocket layer; Gunicorn for production.
- 5.4 — **Persistence:** dev = JSON/SQLite; online = PostgreSQL free tier within limits.
- 5.5 — **Multiplayer authority:** competitive MP server-authoritative. Client sends intent `{pieceId, aimX, aimY, power}`; server validates player/turn/piece/existence/ownership/power/aim/match-not-over, then determines canonical result.

### 5.6 Free Toolchain

| Area | Choice |
|---|---|
| IDE / VCS / Repo | VS Code · Git · GitHub Free |
| Backend / Frontend | Python + Flask · HTML/CSS/JS |
| 3D / modeling / 2D / audio | Three.js (MIT) · Blender · Krita · Audacity |
| Assets / fonts | Kenney CC0 · system fonts / licensed Google Fonts |
| Browser tests / analytics | Playwright · Cloudflare Web Analytics |
| Alpha host / DB / static | Render free · Supabase Free · Cloudflare Pages |
| Distribution | itch.io (no upfront fee) |

- 5.6.1 — **Asset License Rule:** maintain `ASSET_LICENSES.md` recording asset name, creator, source, license, commercial-use, attribution, modified, files, date. If unclear → do not use.

### 5.7 Strict $0 Launch Targets

- 5.7.1 — Browser → PWA → itch.io browser/wrapper → GitHub.
- 5.7.2 — **COST-GATED (only after traction/budget):** Steam, App Store, Google Play, paid domain/CDN/cloud, paid legal/marketing.

---

## 6. Roadmap — Status Dashboard

| STEP | Title | Status | Progress |
|---|---|---|---|
| 0 | Product identity & rules | 🟡 PARTIAL | 8/12 done |
| 1 | Repository & engineering baseline | 🟡 PARTIAL | 4/10 done |
| 2 | Core physics & damage stabilization | ✅ DONE | 9/10 done (1 deferred) |
| 3 | True 3D chess presentation | ✅ DONE | 8/8 done |
| 4 | Board, camera, resize, themes | ✅ DONE | 5/5 done |
| 5 | Game feel: audio, effects, haptics | ✅ DONE | 7/7 done |
| 6 | Combat roles, balance, combos | ✅ DONE | 16/16 done |
| 7 | UX, tutorial, accessibility | ✅ DONE | 18/18 done |
| 8 | Local modes, challenges, replay | ✅ DONE | 7/7 done |
| 9 | Automated testing, QA, performance | 🔵 NEXT | 2/6 done |
| 10 | Production-ready Flask | ⬜ TODO | 0/12 done |
| 11 | Accounts, profiles, persistence | ⬜ TODO | 0/10 done |
| 12 | Private online multiplayer MVP | ⬜ TODO | 0/14 done |
| 13 | Authoritative sim, anti-cheat | ⬜ TODO | 0/10 done |
| 14 | Public matchmaking, ranked | ⬜ TODO | 0/15 done |
| 15 | Progression, cosmetics | ⬜ TODO | 0/4 done |
| 16 | Analytics, telemetry, balance dashboard | ⬜ TODO | 0/3 done |
| 17 | Security, privacy, legal, licensing | ⬜ TODO | 0/18 done |
| 18 | Zero-cost alpha distribution | ⬜ TODO | 0/12 done |
| 19 | Alpha → beta → product-market fit | ⬜ TODO | 0/4 done |
| 20 | Strict $0 public launch | ⬜ TODO (conditional) | 0/3 done |
| 21 | Paid platform gates | ⛔ COST GATE | gated |
| 22 | Market-ready v1 | ⬜ TODO | 0/25 done |

---

## 7. Work Breakdown — Steps & Subtasks

### 7.1 STEP 0 — Freeze Product Identity and Rules 🟡 PARTIAL (8/12)

- 7.1.1 ✅ Define core loop (slingshot chess-piece combat).
- 7.1.2 ✅ Define King HP win condition; remove check/checkmate.
- 7.1.3 ✅ Enable friendly fire.
- 7.1.4 ✅ Establish HP/Power baseline table.
- 7.1.5 ✅ Define physical projectile behavior (piece itself is projectile).
- 7.1.6 ✅ Define Wood / Dark / Light visual direction.
- 7.1.7 ✅ Position product as physics combat, not chess-with-animations.
- 7.1.8 ✅ Create tracker in repo.
- 7.1.9 ⬜ Freeze v1 scope in repository.
- 7.1.10 ⬜ Add GitHub milestones for roadmap steps.
- 7.1.11 ⬜ Decide final public tagline.
- 7.1.12 ⬜ Name/trademark conflict review before commercial branding.

### 7.2 STEP 1 — Repository and Engineering Baseline 🟡 PARTIAL (3/10)

- 7.2.1 ✅ README, .gitignore, requirements.txt, pyproject.toml, PATCH_NOTES.txt.
- 7.2.2 ✅ Flask app serving game; tests directory with Node + pytest harness.
- 7.2.3 ✅ Verified `.gitignore` covers caches/secrets.
- 7.2.4 ✅ Add `.env.example` and guarantee secrets can never be committed.
- 7.2.5 ⬜ Add `CONTRIBUTING.md`, `CHANGELOG.md`, `ASSET_LICENSES.md`.
- 7.2.6 ⬜ Add issue templates (bug / balance / feature).
- 7.2.7 🟡 `/api/version` endpoint exists (`app.py`); version shown in game UI not wired yet.
- 7.2.8 ⬜ Create Git tags from `v0.1.0` onward.
- 7.2.9 ⬜ Add CI syntax/test workflow.
- 7.2.10 ⬜ Decide source-code licensing.

### 7.3 STEP 2 — Stabilize Core Physics and Damage ✅ DONE (9/10; 1 deferred)

- 7.3.1 ✅ Collision cooldown (no continuous-contact HP drain) — v0.2.1.
- 7.3.2 ✅ Duplicate-damage prevention (`collisionCooldown`).
- 7.3.3 ✅ Impulse propagation (conservation of momentum).
- 7.3.4 ✅ Piece mass configuration.
- 7.3.5 ✅ Impact threshold (`minDamageImpact`) and damage clamp (`maxCollisionDamage`).
- 7.3.6 ✅ Physics debug overlay (Shortcut `D`).
- 7.3.7 ✅ Collision regression tests (18 config/launch/damage/turn tests).
- 7.3.8 ✅ Settle-state regression tests (13 Node tests: tunneling, simultaneous collision, wall-corner, overlap recovery, King-destroyed-during-chain, cooldown, settling termination, launch clamp, in-bounds recovery).
- 7.3.9 ✅ Rapid repeated wall impacts tested.
- 7.3.10 ⬜ Test simultaneous three-piece impact (deferred to QA step / STEP 9).

### 7.4 STEP 3 — True 3D Chess Presentation ✅ DONE (8/8; v0.4.0)

- 7.4.1 ✅ Three.js integrated (vendored `three.module.min.js` + `three.core.min.js`, import map).
- 7.4.2 ✅ 6 procedural piece models (lathe profiles + extruded knight head; no external assets).
- 7.4.3 ✅ Board, lights, materials, shadows (rosewood/ebony/ivory palettes, key/fill/rim lights, PCF shadows, contact blobs).
- 7.4.4 ✅ Velocity tilt + tumble, upright rest pose.
- 7.4.5 ✅ Destruction animation (0.5s scale-out tumble, shadow fade).
- 7.4.6 ✅ Low-quality graphics mode (`▦` button / `Q`, persisted).
- 7.4.7 ✅ Headless browser verification (launch, collisions, game over, theme, quality, reset; zero console errors).
- 7.4.8 ✅ WebGL fallback path hides glCanvas cleanly.

### 7.5 STEP 4 — Board, Camera, Resize and Theme System ✅ DONE (5/5; v0.4.x)

- 7.5.1 ✅ Theme selector (Wood/Dark/Light, persisted).
- 7.5.2 ✅ Board-size selector (80–120%, persisted, resize-safe).
- 7.5.3 ✅ Responsive mobile board + high-DPI rendering.
- 7.5.4 ✅ Fullscreen board view (`#fullscreenBtn`, `F` key, `fullscreenchange`).
- 7.5.5 ✅ Headless browser verification (theme/size persistence, fullscreen, no piece reset on resize, zero console errors).

### 7.6 STEP 5 — Game Feel: Audio, Effects and Haptics ✅ DONE (7/7; v0.4.x)

- 7.6.1 ✅ Procedural Web Audio sounds — select, pull, launch, impact, wall, King hit, destruction, victory/defeat, ambient, UI click (`static/js/audio.js`).
- 7.6.2 ✅ Dynamic collision audio (volume/pitch scale with intensity).
- 7.6.3 ✅ Visual effects — trails, launch dust, collision sparks/dust, floating damage, impact flash, destruction fragments, screen shake.
- 7.6.4 ✅ King danger feedback (HUD card + pulsing on-board ring, <35% HP).
- 7.6.5 ✅ Accessibility settings — master/effects/ambience volume, mute, reduced motion, shake toggle, haptics toggle (`static/js/prefs.js`, persisted).
- 7.6.6 ✅ UI button click sounds via document-level listener.
- 7.6.7 ✅ Headless browser verification (modal open/close, pref persistence, AudioContext unlock, audio paths, reduced motion, danger state; zero console errors).

### 7.7 STEP 6 — Combat Roles, Balance and Combo System ✅ DONE (16/16; v0.4.1)

- 7.7.1 ✅ Per-piece mass/radius profile configuration.
- 7.7.2 ✅ Per-piece launch response (`launchMul`).
- 7.7.3 ✅ Per-piece damage multiplier (`damageMul`) and collision multiplier (`collisionMul`).
- 7.7.4 ✅ Per-piece bounce factor (`restitution`) and friction.
- 7.7.5 ✅ Combo detection (`comboWindow` 1.2s; chain per damaging impact).
- 7.7.6 ✅ Combo UI badge (shows max chain; resets on next launch).
- 7.7.7 ✅ King damage tracked separately.
- 7.7.8 ✅ Friendly-fire damage tracked.
- 7.7.9 ✅ Per-team match-level balance stats (launches, damage, friendlyDamage, kingDamage, destroyed, maxCombo).
- 7.7.10 ✅ Developer tuning panel (`static/js/tuning.js`; 13 global + 54 per-piece inputs; session-only; reset from `DEFAULT_CONFIG`).
- 7.7.11 ✅ JS tests +3 (16 pass) and Python tests +3 (21 pass).
- 7.7.12 ✅ Browser verification (tuning edits live, combo badge, stats, launch count; zero console errors).
- 7.7.13 ✅ Balance validation — role table reviewed; no piece obviously optimal for every turn (pawn=fast/weak, knight=neutral, bishop=long-slide, rook=slow battering ram, queen=strong/high-value, king=hardest hit but risky to launch).
- 7.7.14 ✅ Run full verifier suites against STEP 6 code (archess 25/25 + flow 16/16 pass).
- 7.7.15 ✅ Update tracker STEP 6 status and Progress Log.
- 7.7.16 ✅ Commit + push STEP 6 batch to GitHub.

### 7.8 STEP 7 — UX, Tutorial and Accessibility ✅ DONE (18/18; v0.5.x)

- 7.8.1 ✅ First-time interactive tutorial (`static/js/tutorial.js`): non-blocking bottom card, auto-shows on first visit, latched step advancement on real actions (select → aim → launch → chains → win), Skip/Next, persists `archess-tutorial-v2` flag.
- 7.8.2 ✅ Tutorial replay in Help (`#helpTutorialBtn`).
- 7.8.3 ✅ Aim direction clearly visible (dashed pull line + solid launch arrow + direction dots).
- 7.8.4 ✅ Power clearly visible (power bar + %).
- 7.8.5 ✅ Cancel drag (Escape / pointercancel).
- 7.8.6 ✅ Invalid-piece feedback (feedback text on empty/wrong-team selection).
- 7.8.7 ✅ Current turn unmistakable (turn text, badge, dot, active player card).
- 7.8.8 ✅ Physics-in-progress lock feedback (status "PHYSICS ACTIVE" + hint while resolving).
- 7.8.9 ✅ King HP always readable (King HP text + HP tracks + danger pulse).
- 7.8.10 ✅ Game-over overlay (winner modal, double-KO handling).
- 7.8.11 ✅ Rematch / new game (New Game button, R key, Play Again).
- 7.8.12 ✅ Keyboard-accessible menus (modal focus-on-open + Tab focus trap + Escape close + restore focus).
- 7.8.13 ✅ Team distinction not based on color alone (shape marker above pieces: triangle = white, square = black; theme-independent).
- 7.8.14 ✅ Reduced-motion mode (settings, persists).
- 7.8.15 ✅ Text scaling tolerance (modal scroll at narrow widths).
- 7.8.16 ✅ Mobile touch targets (≥40px controls on coarse pointers).
- 7.8.17 ✅ Browser verification (auto-show, replay, skip, focus management, zero console errors).
- 7.8.18 ✅ Update tracker + commit batch.

### 7.9 STEP 8 — Local Modes, Challenges and Replay Foundation ✅ DONE (7/7; v0.5.x)

- 7.9.1 ✅ Local Pass & Play (default hotseat, both sides on one screen; formalized as the default "Match" mode).
- 7.9.2 ✅ Practice / Sandbox (mode selector in settings; no win condition, keep playing after King destruction).
- 7.9.3 ✅ Optional turn timer (settings selector, live countdown badge, auto turn-switch on expiry, persisted; Off / 20s / 45s / 90s).
- 7.9.4 ✅ Trick Shot Challenges — pre-made board scenarios published as `static/js/challenges.js`.
- 7.9.5 ✅ Replay capture (launch vectors, state snapshots, end state) — implemented in `static/js/replay.js`.
- 7.9.6 ✅ Replay Viewer (playback / speed controls) — implemented in `static/js/replay.js`.
- 7.9.7 ✅ Replay Viewer playback crash fix (`turnInfo`/`scrubber` strict-mode ReferenceError in `animateNext`) — v0.5.2; speed ×1–×5 now advances playback.

### 7.10 STEP 9 — Automated Testing, QA and Performance 🔵 NEXT (2/6)

- 7.10.1 ✅ Unit tests: launch vector, speed clamp, friction, wall bounce, overlap resolution, collision impulse, damage calc, collision cooldown, piece death, King death, turn switch, game reset, theme persistence, board-resize state safety.
- 7.10.2 ⬜ Browser matrix: Chromium / Firefox / WebKit (scaffold exists in `tests/test_browser_matrix.py`; Playwright not installed — 3 tests skip).
- 7.10.3 ⬜ Browser matrix: desktop / tablet / mobile viewports.
- 7.10.4 ⬜ Browser matrix: pointer + touch input.
- 7.10.5 ⬜ Performance targets met (32-piece board, no frame-time cliffs on mid hardware).
- 7.10.6 ✅ Performance regression benchmark harness (`performance_benchmark.py`); verified with a 50-frame, 32-piece run and no threshold violations.

### 7.11 STEP 10 — Production-Ready Flask Architecture ⬜ TODO (0/12)

- 7.11.1 ⬜ Flask app factory pattern.
- 7.11.2 ⬜ Development / test / production config classes.
- 7.11.3 ⬜ Structured logging.
- 7.11.4 ⬜ Health endpoint.
- 7.11.5 ⬜ Version endpoint.
- 7.11.6 ⬜ Input validation.
- 7.11.7 ⬜ Error handlers.
- 7.11.8 ⬜ Request size limits.
- 7.11.9 ⬜ Production server configuration (Gunicorn).
- 7.11.10 ⬜ Security headers.
- 7.11.11 ⬜ Rate-limit design.
- 7.11.12 ⬜ No secrets in source; no debug mode in production.

### 7.12 STEP 11 — Accounts, Profiles and Persistence ⬜ TODO (0/10)

- 7.12.1 ⬜ Guest identity.
- 7.12.2 ⬜ Registration/login only when needed.
- 7.12.3 ⬜ Password/auth strategy (hashing, sessions).
- 7.12.4 ⬜ Profile page.
- 7.12.5 ⬜ Persistent settings.
- 7.12.6 ⬜ Match history.
- 7.12.7 ⬜ Database migrations.
- 7.12.8 ⬜ Account deletion.
- 7.12.9 ⬜ Data export strategy.
- 7.12.10 ⬜ Minimal personal-data collection.

### 7.13 STEP 12 — Private Online Multiplayer MVP ⬜ TODO (0/14)

- 7.13.1 ⬜ Create room.
- 7.13.2 ⬜ Join room.
- 7.13.3 ⬜ Player assignment.
- 7.13.4 ⬜ Match start handshake.
- 7.13.5 ⬜ Turn synchronization.
- 7.13.6 ⬜ Validated launch action.
- 7.13.7 ⬜ Physics-result synchronization.
- 7.13.8 ⬜ HP synchronization.
- 7.13.9 ⬜ Destruction synchronization.
- 7.13.10 ⬜ Game-over synchronization.
- 7.13.11 ⬜ Reconnect.
- 7.13.12 ⬜ Rematch.
- 7.13.13 ⬜ Room timeout.
- 7.13.14 ⬜ Graceful disconnect handling.

### 7.14 STEP 13 — Authoritative Simulation and Anti-Cheat ⬜ TODO (0/10)

- 7.14.1 ⬜ Canonical server state.
- 7.14.2 ⬜ Shot validation.
- 7.14.3 ⬜ Server physics simulation.
- 7.14.4 ⬜ State snapshots.
- 7.14.5 ⬜ Client reconciliation.
- 7.14.6 ⬜ Physics config versioning.
- 7.14.7 ⬜ Replay checksum.
- 7.14.8 ⬜ Invalid-client-action logging.
- 7.14.9 ⬜ Rate limits.
- 7.14.10 ⬜ Tamper-resistant match result flow.

### 7.15 STEP 14 — Public Matchmaking and Ranked ⬜ TODO (0/15)

- 7.15.1 ⬜ Join queue.
- 7.15.2 ⬜ Leave queue.
- 7.15.3 ⬜ Region/ping consideration (later).
- 7.15.4 ⬜ Match found flow.
- 7.15.5 ⬜ Reconnect.
- 7.15.6 ⬜ Surrender.
- 7.15.7 ⬜ Turn timer.
- 7.15.8 ⬜ Disconnect timeout.
- 7.15.9 ⬜ Hidden MMR.
- 7.15.10 ⬜ Visible divisions.
- 7.15.11 ⬜ Placement logic.
- 7.15.12 ⬜ Win/loss rating update.
- 7.15.13 ⬜ Abandonment handling.
- 7.15.14 ⬜ Seasonal reset strategy (only if useful).
- 7.15.15 ⬜ Leaderboard.

### 7.16 STEP 15 — Progression and Cosmetics ⬜ TODO (0/4)

- 7.16.1 ⬜ Free progression first.
- 7.16.2 ⬜ Cosmetic-only categories (boards, trails, skins).
- 7.16.3 ⬜ No pay-to-win (competitive stats identical across cosmetics).
- 7.16.4 ⬜ No stat-boosting purchases.

### 7.17 STEP 16 — Analytics, Telemetry and Balance Dashboard ⬜ TODO (0/3)

- 7.17.1 ⬜ Product metrics (retention, win/loss, piece usage).
- 7.17.2 ⬜ Do-not-collect-by-default policy.
- 7.17.3 ⬜ Free telemetry path (Cloudflare Web Analytics or self-hosted).

### 7.18 STEP 17 — Security, Privacy, Legal and License Hygiene ⬜ TODO (0/18)

- 7.18.1 ⬜ HTTPS on deployed services.
- 7.18.2 ⬜ Secure cookies.
- 7.18.3 ⬜ CSRF strategy where relevant.
- 7.18.4 ⬜ Rate limits.
- 7.18.5 ⬜ Authentication abuse handling.
- 7.18.6 ⬜ Input/schema validation.
- 7.18.7 ⬜ Dependency update process.
- 7.18.8 ⬜ Secret scanning.
- 7.18.9 ⬜ No client-authoritative ranked results.
- 7.18.10 ⬜ Backup/restore process.
- 7.18.11 ⬜ Privacy policy.
- 7.18.12 ⬜ Data inventory.
- 7.18.13 ⬜ Account deletion.
- 7.18.14 ⬜ Retention rules.
- 7.18.15 ⬜ Minimal collection; analytics disclosure; cookie/storage disclosure where legally required.
- 7.18.16 ⬜ `ASSET_LICENSES.md` + dependency/font/audio/model/texture license inventory.
- 7.18.17 ⬜ Retain required third-party notices.
- 7.18.18 ⬜ Trademark/branding conflict review (name, store searches; do not copy competitors).

### 7.19 STEP 18 — Zero-Cost Alpha Distribution ⬜ TODO (0/12)

- 7.19.1 ⬜ Tutorial.
- 7.19.2 ⬜ Complete local match.
- 7.19.3 ⬜ Private multiplayer if ready.
- 7.19.4 ⬜ Feedback form.
- 7.19.5 ⬜ Version displayed.
- 7.19.6 ⬜ Changelog.
- 7.19.7 ⬜ Known issues.
- 7.19.8 ⬜ Privacy notice if telemetry/accounts exist.
- 7.19.9 ⬜ No paid dependency required to play.
- 7.19.10 ⬜ No copyrighted placeholder assets.
- 7.19.11 ⬜ Crash-free first session target.
- 7.19.12 ⬜ Replayable / rematch loop.

### 7.20 STEP 19 — Closed Alpha → Public Beta → Product-Market Fit ⬜ TODO (0/4)

- 7.20.1 ⬜ Phase A — small closed alpha (feedback pipeline, metrics on).
- 7.20.2 ⬜ Phase B — wider alpha (bug bash, balance pass).
- 7.20.3 ⬜ Phase C — public beta (scale checks, moderation).
- 7.20.4 ⬜ Go / no-go decision against retention/engagement evidence.

### 7.21 STEP 20 — Strict $0 Public Launch ⬜ TODO (0/3; conditional)

- 7.21.1 ⬜ Launch on browser/PWA/itch.io/GitHub only.
- 7.21.2 ⬜ No silent paid dependency; honor zero-budget rule.
- 7.21.3 ⬜ Post-launch: version, changelog, known issues visible.

### 7.22 STEP 21 — Paid Platform Gates ⛔ COST GATE

- 7.22.1 ⛔ Steam — only after traction/revenue or budget approval.
- 7.22.2 ⛔ Apple App Store — same gate.
- 7.22.3 ⛔ Google Play — same gate.
- 7.22.4 ⛔ Never gate the core free experience behind payment.

### 7.23 STEP 22 — Market-Ready v1 ⬜ TODO (0/25)

- 7.23.1 ⬜ Polished physical 3D board and pieces.
- 7.23.2 ⬜ Wood / Dark / Light themes.
- 7.23.3 ⬜ Board/camera sizing.
- 7.23.4 ⬜ Satisfying audio/impact feedback.
- 7.23.5 ⬜ Stable deterministic-enough physics.
- 7.23.6 ⬜ Intentional chain reactions.
- 7.23.7 ⬜ Balanced piece roles.
- 7.23.8 ⬜ Tutorial.
- 7.23.9 ⬜ Accessibility settings.
- 7.23.10 ⬜ Local play.
- 7.23.11 ⬜ Practice/challenges.
- 7.23.12 ⬜ Replay foundation.
- 7.23.13 ⬜ Private online matches.
- 7.23.14 ⬜ Reconnect.
- 7.23.15 ⬜ Production-safe backend.
- 7.23.16 ⬜ Server-authoritative competitive outcomes.
- 7.23.17 ⬜ Accounts only where useful.
- 7.23.18 ⬜ Match history.
- 7.23.19 ⬜ Public matchmaking.
- 7.23.20 ⬜ Ranked if infrastructure is ready.
- 7.23.21 ⬜ Telemetry.
- 7.23.22 ⬜ Privacy/license documentation.
- 7.23.23 ⬜ Automated tests.
- 7.23.24 ⬜ Performance target met.
- 7.23.25 ⬜ No pay-to-win.

---

## 8. Progress Log (Chronological)

| Version | Scope | Summary |
|---|---|---|
| v0.1.x | Core prototype | Pre-STEP-3 baseline: 2D canvas physics, slingshot, HP, friendly fire. |
| v0.2.x | Combat physics | Collision cooldown, impulse propagation, mass config, damage thresholds/clamps, settle-state fixes, debug overlay (`D`). |
| v0.3.x | 3D presentation (STEP 3) | Three.js integrated; 6 procedural models; board/lights/shadows; tilt/tumble/destruction; low-quality mode; WebGL fallback. |
| v0.4.0 | STEP 4 | Fullscreen board, themes, board-size selector, responsive/high-DPI, resize safety. |
| v0.4.x | STEP 5 | Procedural Web Audio, dynamic collision audio, VFX suite, King danger feedback, accessibility settings; King danger ring; UI click sounds; tracker Progress Log. |
| v0.4.x | Hygiene | Removed platform preview URL; full git history rewritten (author `mr-zero0`), force-pushed. |
| v0.4.1 | STEP 6 | Role-based physics multipliers, combo detection + UI, per-team balance stats, developer tuning panel, JS+Python tests. |
| v0.5.x | STEP 7 | First-time interactive tutorial + replay, keyboard-accessible modals (focus trap), non-color team markers, mobile touch targets, text-scaling tolerance. |
| v0.5.1 | STEP 8 (1/2) | Local modes: Match / Practice-Sandbox selector + optional persisted turn timer (live countdown, auto turn-switch), both surfaced in settings; regression suites pass. |
| v0.5.2 | STEP 8 (2/2) | Replay Viewer playback fix: replaced strict-mode `ReferenceError` (assignment to undeclared `turnInfo`/`scrubber` in `animateNext`) with declared element lookups; speed multiplier (×1–×5) now actually advances playback rate; turn counter/scrubber/prev/next states stay in sync. |

> **Note:** Git history was rewritten and force-pushed during hygiene (author `mr-zero0`); earlier SHAs are historical references only.

---

## 9. Verification Snapshot

- 9.1 — Python pytest: **25 passed, 3 skipped** (`test_game.py` 21 pass; `test_browser_matrix.py` 4 pass + 3 skip — Playwright not installed).
- 9.2 — Node physics tests: **16/16 pass** (includes STEP 6 multiplier tests).
- 9.3 — Playwright headless: **25/25 (3D path) + 16/16 (2D flow)** pass at STEP 6 (not re-run since Playwright was uninstalled).
- 9.4 — Performance: in-page frame times healthy (~14 ms avg); headless wall-clock variance is a container/SwiftShader artifact, not app code (reproduced on both old and new builds).
- 9.5 — Identity: `mr-zero0 <mr-zero0@users.noreply.github.com>`; GitHub remote = `https://github.com/mr-zero0/ArChess`.
- 9.6 — Performance benchmark: **PASS** (`performance_benchmark.py`, 50 frames / 32 pieces; 0 frames over threshold).

---

## 10. Features Explicitly Deferred

AI opponent · battle pass · clans/guilds · tournaments · spectator servers · voice chat · global chat · loot boxes · NFT/blockchain · complex economy · dozens of currencies · story campaign · UGC 3D models · advanced board editor · marketplace · esports tooling · native mobile app · Steam-specific integration.

---

## 11. Release Version Plan

```text
v0.1.x  core physics prototype
v0.2.x  stable combat physics
v0.3.x  true 3D presentation
v0.4.x  polished local game
v0.5.x  tutorial + challenges + replay
v0.6.x  private multiplayer
v0.7.x  authoritative online matches
v0.8.x  accounts + matchmaking
v0.9.x  public beta / balance
v1.0.0  market-ready release
```

- 11.1 — Do not rush v1.0 for cosmetic reasons.

---

## 12. Recommended Execution Order

STEP 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → **9 (current)** → 10 → 12 → 13 → 11 (as needed) → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 22 → 21 (cost-gated).

## 13. Overall Progress Summary

- **Local game (STEPs 0–8):** 7/9 steps fully done; STEP 0 partial (8/12), STEP 1 partial (4/10), STEP 2 done with 1 item deferred to STEP 9.
- **Next up:** STEP 9 — Automated Testing, QA and Performance (browser matrix, performance targets, benchmark harness).
- **Overall roadmap completion:** **84/233 subtasks done (~36%)** — everything done is in the local single-player game; all multiplayer/online/production steps are still TODO.
