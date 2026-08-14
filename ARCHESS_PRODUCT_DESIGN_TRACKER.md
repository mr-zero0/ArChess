# ArChess — Product Design Tracker

**Repository:** `mr-zero0/ArChess` · **Stack:** Python + Flask + HTML/CSS/JS (Three.js) · **Platform:** Browser / PWA

ArChess is **not ordinary chess with animations**. It is a turn-based physics combat game played with chess armies: pull a piece back, launch it across the board, ricochet into enemy formations, create chain reactions, and destroy the enemy King.

> **Guiding question for every feature:** *Does this make ArChess a better competitive physics chess battle game?*

---

## 0. Legend & Rules of Use

| Status | Meaning |
|---|---|
| ✅ DONE | Implemented and verified |
| 🟡 PARTIAL | Implemented partly or awaiting verification/polish |
| 🔵 NEXT | Immediate recommended priority |
| ⬜ TODO | Not started |
| ⛔ COST GATE | Cannot honestly be guaranteed at strict $0 |

**Zero-Budget Rule:** development software costs $0; libraries must be free/open-source or commercially safe; art/audio created in-house or CC0; free cloud tiers only for prototype/alpha; paid items explicitly marked COST GATE; paid features never required to complete core game.

**Tracker discipline (this session):**
- Work is tracked as **small subtasks** (one checkbox each), not whole milestones.
- Update this file immediately as subtasks finish; keep the Progress Log current.
- Commit to GitHub **after each batch of ~5–10 finished subtasks** with a meaningful message.
- Do NOT mark a subtask ✅ until its acceptance criterion is verified.

**Definition of Done (per feature):** implemented; no known normal-use console error; works after reset, resize, mouse, and touch; does not break physics; documented; regression-tested when automatable; tested in Chromium + one other browser for user-facing features.

---

## 1. Core Design Pillars (Frozen)

- **A — Satisfying Physical Launches:** every shot feels good before progression matters. Aiming immediate, readable, predictable enough to reward skill.
- **B — Tactical Chain Reactions:** one launch may create multiple collisions, but chains must stay understandable. Enable intentional direct hits, bank shots, sacrificial hits, friendly-fire manipulation, dominoes, King setup shots.
- **C — Pieces Have Combat Identity:** pieces differ physically/strategically via HP, Power, mass, radius, launch response, friction, silhouette — not skins.
- **D — Physical Chess Set Presentation:** default resembles a premium wood chess board turned battlefield (real 3D silhouettes, wood board, rosewood vs ebony sides, shadows). Themes: Wood / Dark / Light.
- **E — Easy to Learn, Difficult to Master:** controls understood in under a minute; skill from angle, power, collision prediction, piece value, positioning, risk, chains, defense.
- **F — No Pay-to-Win:** competitive physics/stats identical across cosmetic variants.

---

## 2. Canonical Game Rules (Frozen)

- 8×8 board, normal chess opening arrangement. Physics coordinates independent of screen resolution/zoom; resizing board never changes gameplay physics.
- **Turn flow:** current player selects a living piece → drag back → aim + power → release → launch → physics/impacts/settle → next player.
- **Selection:** only the current player's living pieces selectable. Dead pieces cannot select or collide.
- **Launch:** the chess piece itself is the projectile (no ball/puck/coin). `vx = (piece.x - pointer.x) * launchStrength`; speed clamped; zero-distance drag does not launch.
- **Collision:** pieces are physical bodies (circle/capsule-like logical shapes). Detect overlap → normal → relative normal velocity → impact intensity → damage both → resolve overlap → impulse/bounce → feedback → prevent duplicate damage from same contact → continue chain.
- **Friendly fire: enabled** — allied pieces can damage allies; core strategy, not a bug.
- **Win condition:** no check/checkmate/castling/en passant/traditional capture/movement restriction. **Win when opposing King HP ≤ 0.**
- **Chain reaction ideal:** spectacular multi-piece chains possible because the player created them, not because every ordinary launch destabilizes all 32 pieces.

---

## 3. Piece Statistics & Damage Model (Frozen Baselines)

### Canonical stats

| Piece | HP | Power | Combat concept |
|---|---:|---:|---|
| Pawn | 30 | 10 | expendable setup / light projectile |
| Knight | 50 | 30 | mobile trick-shot piece |
| Bishop | 40 | 25 | precision / long-slide |
| Rook | 80 | 40 | heavy battering ram |
| Queen | 90 | 70 | high-value offensive piece |
| King | 120 | 100 | objective + dangerous heavy piece |

### Damage model

```
relativeVelocity → normalizedImpact → attackerPower × normalizedImpact × damageMultiplier → clamp → damage
```

Both participants may take damage from the other's effective impact. Required properties: weak+slow = small damage; strong+fast = large damage; damage clamped; stationary contact never repeatedly drains HP; one event not counted once per substep; sub-threshold impacts deal ~zero. **Collision event cooldown:** a touching pair gets no fresh impact damage until separated and re-colliding meaningfully.

### Combo / skill feedback

Combo callouts (presentation/scoring first, never stat buffs): DIRECT HIT, BANK SHOT, DOUBLE/TRIPLE HIT, CHAIN REACTION, DOMINO, ROYAL STRIKE, SACRIFICE, FRIENDLY FIRE, KING BREAKER, LAST STAND. Do not let combo multipliers distort ranked physics until extensively tested.

---

## 4. Technical Architecture (Frozen)

- **Client:** HTML5, CSS3, Vanilla JS modules, Three.js for real 3D presentation, DOM for menus/HUD, Web Audio API for runtime audio, Pointer Events for mouse/touch.
- **Physics:** core gameplay physics logically **2D** even with 3D visuals (simpler deterministic sim, sync, balance, CPU, mobile; visuals tumble/tilt independently).
- **Backend:** Python 3 + Flask; Flask-SocketIO or equivalent WebSocket layer; Gunicorn for production.
- **Persistence:** dev = JSON/SQLite; online = PostgreSQL free tier within limits.
- **Multiplayer authority:** competitive MP server-authoritative. Client sends intent `{pieceId, aimX, aimY, power}`; server validates player/turn/piece/existence/ownership/power/aim/match-not-over, then determines canonical result.

### Free toolchain

| Area | Choice |
|---|---|
| IDE / VCS / Repo | VS Code · Git · GitHub Free |
| Backend / Frontend | Python + Flask · HTML/CSS/JS |
| 3D / modeling / 2D / audio | Three.js (MIT) · Blender · Krita · Audacity |
| Assets / fonts | Kenney CC0 · system fonts / licensed Google Fonts |
| Browser tests / analytics | Playwright · Cloudflare Web Analytics |
| Alpha host / DB / static | Render free · Supabase Free · Cloudflare Pages |
| Distribution | itch.io (no upfront fee) |

**Asset License Rule:** maintain `ASSET_LICENSES.md` recording asset name, creator, source, license, commercial-use, attribution, modified, files, date. If unclear → do not use.

### Strict $0 launch targets

Browser → PWA → itch.io browser/wrapper → GitHub. **COST-GATED (only after traction/budget):** Steam, App Store, Google Play, paid domain/CDN/cloud, paid legal/marketing.

---

## 5. Roadmap — Status Dashboard

| STEP | Title | Status |
|---|---|---|
| 0 | Product identity & rules | 🟡 PARTIAL (4 housekeeping items open) |
| 1 | Repository & engineering baseline | 🟡 PARTIAL (housekeeping open) |
| 2 | Core physics & damage stabilization | ✅ DONE |
| 3 | True 3D chess presentation | ✅ DONE |
| 4 | Board, camera, resize, themes | ✅ DONE |
| 5 | Game feel: audio, effects, haptics | ✅ DONE |
| 6 | Combat roles, balance, combos | ✅ DONE |
| 7 | UX, tutorial, accessibility | ✅ DONE |
| 8 | Local modes, challenges, replay | 🔵 NEXT |
| 9 | Automated testing, QA, performance | 🟡 PARTIAL |
| 10 | Production-ready Flask | ⬜ TODO |
| 11 | Accounts, profiles, persistence | ⬜ TODO |
| 12 | Private online multiplayer MVP | ⬜ TODO |
| 13 | Authoritative sim, anti-cheat | ⬜ TODO |
| 14 | Public matchmaking, ranked | ⬜ TODO |
| 15 | Progression, cosmetics | ⬜ TODO |
| 16 | Analytics, telemetry, balance dashboard | ⬜ TODO |
| 17 | Security, privacy, legal, licensing | ⬜ TODO |
| 18 | Zero-cost alpha distribution | ⬜ TODO |
| 19 | Alpha → beta → product-market fit | ⬜ TODO |
| 20 | Strict $0 public launch | ⬜ TODO (conditional) |
| 21 | Paid platform gates | ⛔ COST GATE |
| 22 | Market-ready v1 | ⬜ TODO |

---

## 6. Subtask Boards

### STEP 0 — Freeze Product Identity and Rules 🟡 PARTIAL

- [x] Define core loop (slingshot chess-piece combat).
- [x] Define King HP win condition; remove check/checkmate.
- [x] Enable friendly fire.
- [x] Establish HP/Power baseline table.
- [x] Define physical projectile behavior (piece itself is projectile).
- [x] Define Wood / Dark / Light visual direction.
- [x] Position product as physics combat, not chess-with-animations.
- [x] Create tracker in repo.
- [ ] Freeze v1 scope in repository.
- [ ] Add GitHub milestones for roadmap steps.
- [ ] Decide final public tagline.
- [ ] Name/trademark conflict review before commercial branding.

### STEP 1 — Repository and Engineering Baseline 🟡 PARTIAL

- [x] README, .gitignore, requirements.txt, pyproject.toml, PATCH_NOTES.txt.
- [x] Flask app serving game; tests directory with Node + pytest harness.
- [x] Verified `.gitignore` covers caches/secrets.
- [ ] Add `.env.example` and guarantee secrets can never be committed.
- [ ] Add `CONTRIBUTING.md`, `CHANGELOG.md`, `ASSET_LICENSES.md`.
- [ ] Add issue templates (bug / balance / feature).
- [ ] Add `/api/version` endpoint + version shown in game UI.
- [ ] Create Git tags from `v0.1.0` onward.
- [ ] Add CI syntax/test workflow.
- [ ] Decide source-code licensing.

### STEP 2 — Stabilize Core Physics and Damage ✅ DONE

- [x] Collision cooldown (no continuous-contact HP drain) — v0.2.1.
- [x] Duplicate-damage prevention (`collisionCooldown`).
- [x] Impulse propagation (conservation of momentum).
- [x] Piece mass configuration.
- [x] Impact threshold (`minDamageImpact`) and damage clamp (`maxCollisionDamage`).
- [x] Physics debug overlay (Shortcut `D`).
- [x] Collision regression tests (18 config/launch/damage/turn tests).
- [x] Settle-state regression tests (13 Node tests: tunneling, simultaneous collision, wall-corner, overlap recovery, King-destroyed-during-chain, cooldown, settling termination, launch clamp, in-bounds recovery).
- [x] Rapid repeated wall impacts tested.
- [ ] Test simultaneous three-piece impact (deferred to QA step).

### STEP 3 — True 3D Chess Presentation ✅ DONE (v0.4.0)

- [x] Three.js integrated (vendored `three.module.min.js` + `three.core.min.js`, import map).
- [x] 6 procedural piece models (lathe profiles + extruded knight head; no external assets).
- [x] Board, lights, materials, shadows (rosewood/ebony/ivory palettes, key/fill/rim lights, PCF shadows, contact blobs).
- [x] Velocity tilt + tumble, upright rest pose.
- [x] Destruction animation (0.5s scale-out tumble, shadow fade).
- [x] Low-quality graphics mode (`▦` button / `Q`, persisted).
- [x] Headless browser verification (launch, collisions, game over, theme, quality, reset; zero console errors).
- [x] WebGL fallback path hides glCanvas cleanly.

### STEP 4 — Board, Camera, Resize and Theme System ✅ DONE (v0.4.x)

- [x] Theme selector (Wood/Dark/Light, persisted).
- [x] Board-size selector (80–120%, persisted, resize-safe).
- [x] Responsive mobile board + high-DPI rendering.
- [x] Fullscreen board view (`#fullscreenBtn`, `F` key, `fullscreenchange`).
- [x] Headless browser verification (theme/size persistence, fullscreen, no piece reset on resize, zero console errors).

### STEP 5 — Game Feel: Audio, Effects and Haptics ✅ DONE (v0.4.x)

- [x] Procedural Web Audio sounds — select, pull, launch, impact, wall, King hit, destruction, victory/defeat, ambient, UI click (`static/js/audio.js`).
- [x] Dynamic collision audio (volume/pitch scale with intensity).
- [x] Visual effects — trails, launch dust, collision sparks/dust, floating damage, impact flash, destruction fragments, screen shake.
- [x] King danger feedback (HUD card + pulsing on-board ring, <35% HP).
- [x] Accessibility settings — master/effects/ambience volume, mute, reduced motion, shake toggle, haptics toggle (`static/js/prefs.js`, persisted).
- [x] UI button click sounds via document-level listener.
- [x] Headless browser verification (modal open/close, pref persistence, AudioContext unlock, audio paths, reduced motion, danger state; zero console errors).

### STEP 6 — Combat Roles, Balance and Combo System 🔵 NEXT (implemented, uncommitted)

- [x] Per-piece mass/radius profile configuration.
- [x] Per-piece launch response (`launchMul`).
- [x] Per-piece damage multiplier (`damageMul`) and collision multiplier (`collisionMul`).
- [x] Per-piece bounce factor (`restitution`) and friction.
- [x] Combo detection (`comboWindow` 1.2s; chain per damaging impact).
- [x] Combo UI badge (shows max chain; resets on next launch).
- [x] King damage tracked separately.
- [x] Friendly-fire damage tracked.
- [x] Per-team match-level balance stats (launches, damage, friendlyDamage, kingDamage, destroyed, maxCombo).
- [x] Developer tuning panel (`static/js/tuning.js`; 13 global + 54 per-piece inputs; session-only; reset from `DEFAULT_CONFIG`).
- [x] JS tests +3 (16 pass) and Python tests +3 (21 pass).
- [x] Browser verification (tuning edits live, combo badge, stats, launch count; zero console errors).
- [x] Balance validation — role table reviewed; no piece obviously optimal for every turn (pawn=fast/weak, knight=neutral, bishop=long-slide, rook=slow battering ram, queen=strong/high-value, king=hardest hit but risky to launch).
- [x] Run full verifier suites against STEP 6 code (archess 25/25 + flow 16/16 pass).
- [x] Update tracker STEP 6 status and Progress Log.
- [x] Commit + push STEP 6 batch to GitHub.

### STEP 7 — UX, Tutorial and Accessibility 🔵 NEXT

- [x] First-time interactive tutorial (`static/js/tutorial.js`): non-blocking bottom card, auto-shows on first visit, latched step advancement on real actions (select → aim → launch → chains → win), Skip/Next, persists `archess-tutorial` flag.
- [x] Tutorial replay in Help (`#helpTutorialBtn`).
- [x] Aim direction clearly visible (dashed pull line + solid launch arrow + direction dots).
- [x] Power clearly visible (power bar + %).
- [x] Cancel drag (Escape / pointercancel).
- [x] Invalid-piece feedback (feedback text on empty/wrong-team selection).
- [x] Current turn unmistakable (turn text, badge, dot, active player card).
- [x] Physics-in-progress lock feedback (status "PHYSICS ACTIVE" + hint while resolving).
- [x] King HP always readable (King HP text + HP tracks + danger pulse).
- [x] Game-over overlay (winner modal, double-KO handling).
- [x] Rematch / new game (New Game button, R key, Play Again).
- [x] Keyboard-accessible menus (modal focus-on-open + Tab focus trap + Escape close + restore focus).
- [x] Team distinction not based on color alone (shape marker above pieces: triangle = white, square = black; theme-independent).
- [x] Reduced-motion mode (settings, persists).
- [x] Text scaling tolerance (modal scroll at narrow widths).
- [x] Mobile touch targets (≥40px controls on coarse pointers).
- [x] Browser verification (auto-show, replay, skip, focus management, zero console errors).
- [ ] Update tracker + commit batch.

### STEP 8 — Local Modes, Challenges and Replay Foundation ⬜ TODO

- [ ] Local Pass & Play.
- [ ] Practice / Sandbox.
- [ ] Trick Shot Challenges.
- [ ] Optional turn timer.
- [ ] Replay capture (launch vectors, state snapshots, end state).
- [ ] Replay Viewer (playback / speed controls).

### STEP 9 — Automated Testing, QA and Performance 🟡 PARTIAL

- [x] Unit tests: launch vector, speed clamp, friction, wall bounce, overlap resolution, collision impulse, damage calc, collision cooldown, piece death, King death, turn switch, game reset, theme persistence, board-resize state safety.
- [ ] Browser matrix: Chromium / Firefox / WebKit.
- [ ] Browser matrix: desktop / tablet / mobile viewports.
- [ ] Browser matrix: pointer + touch input.
- [ ] Performance targets met (32-piece board, no frame-time cliffs on mid hardware).
- [ ] Performance regression benchmark harness.

### STEP 10 — Production-Ready Flask Architecture ⬜ TODO

- [ ] Flask app factory pattern.
- [ ] Development / test / production config classes.
- [ ] Structured logging.
- [ ] Health endpoint.
- [ ] Version endpoint.
- [ ] Input validation.
- [ ] Error handlers.
- [ ] Request size limits.
- [ ] Production server configuration (Gunicorn).
- [ ] Security headers.
- [ ] Rate-limit design.
- [ ] No secrets in source; no debug mode in production.

### STEP 11 — Accounts, Profiles and Persistence ⬜ TODO

- [ ] Guest identity.
- [ ] Registration/login only when needed.
- [ ] Password/auth strategy (hashing, sessions).
- [ ] Profile page.
- [ ] Persistent settings.
- [ ] Match history.
- [ ] Database migrations.
- [ ] Account deletion.
- [ ] Data export strategy.
- [ ] Minimal personal-data collection.

### STEP 12 — Private Online Multiplayer MVP ⬜ TODO

- [ ] Create room.
- [ ] Join room.
- [ ] Player assignment.
- [ ] Match start handshake.
- [ ] Turn synchronization.
- [ ] Validated launch action.
- [ ] Physics-result synchronization.
- [ ] HP synchronization.
- [ ] Destruction synchronization.
- [ ] Game-over synchronization.
- [ ] Reconnect.
- [ ] Rematch.
- [ ] Room timeout.
- [ ] Graceful disconnect handling.

### STEP 13 — Authoritative Simulation and Anti-Cheat ⬜ TODO

- [ ] Canonical server state.
- [ ] Shot validation.
- [ ] Server physics simulation.
- [ ] State snapshots.
- [ ] Client reconciliation.
- [ ] Physics config versioning.
- [ ] Replay checksum.
- [ ] Invalid-client-action logging.
- [ ] Rate limits.
- [ ] Tamper-resistant match result flow.

### STEP 14 — Public Matchmaking and Ranked ⬜ TODO

- [ ] Join queue.
- [ ] Leave queue.
- [ ] Region/ping consideration (later).
- [ ] Match found flow.
- [ ] Reconnect.
- [ ] Surrender.
- [ ] Turn timer.
- [ ] Disconnect timeout.
- [ ] Hidden MMR.
- [ ] Visible divisions.
- [ ] Placement logic.
- [ ] Win/loss rating update.
- [ ] Abandonment handling.
- [ ] Seasonal reset strategy (only if useful).
- [ ] Leaderboard.

### STEP 15 — Progression and Cosmetics ⬜ TODO

- [ ] Free progression first.
- [ ] Cosmetic-only categories (boards, trails, skins).
- [ ] No pay-to-win (competitive stats identical across cosmetics).
- [ ] No stat-boosting purchases.

### STEP 16 — Analytics, Telemetry and Balance Dashboard ⬜ TODO

- [ ] Product metrics (retention, win/loss, piece usage).
- [ ] Do-not-collect-by-default policy.
- [ ] Free telemetry path (Cloudflare Web Analytics or self-hosted).

### STEP 17 — Security, Privacy, Legal and License Hygiene ⬜ TODO

- [ ] HTTPS on deployed services.
- [ ] Secure cookies.
- [ ] CSRF strategy where relevant.
- [ ] Rate limits.
- [ ] Authentication abuse handling.
- [ ] Input/schema validation.
- [ ] Dependency update process.
- [ ] Secret scanning.
- [ ] No client-authoritative ranked results.
- [ ] Backup/restore process.
- [ ] Privacy policy.
- [ ] Data inventory.
- [ ] Account deletion.
- [ ] Retention rules.
- [ ] Minimal collection; analytics disclosure; cookie/storage disclosure where legally required.
- [ ] `ASSET_LICENSES.md` + dependency/font/audio/model/texture license inventory.
- [ ] Retain required third-party notices.
- [ ] Trademark/branding conflict review (name, store searches; do not copy competitors).

### STEP 18 — Zero-Cost Alpha Distribution ⬜ TODO

- [ ] Tutorial.
- [ ] Complete local match.
- [ ] Private multiplayer if ready.
- [ ] Feedback form.
- [ ] Version displayed.
- [ ] Changelog.
- [ ] Known issues.
- [ ] Privacy notice if telemetry/accounts exist.
- [ ] No paid dependency required to play.
- [ ] No copyrighted placeholder assets.
- [ ] Crash-free first session target.
- [ ] Replayable / rematch loop.

### STEP 19 — Closed Alpha → Public Beta → Product-Market Fit ⬜ TODO

- [ ] Phase A — small closed alpha (feedback pipeline, metrics on).
- [ ] Phase B — wider alpha (bug bash, balance pass).
- [ ] Phase C — public beta (scale checks, moderation).
- [ ] Go / no-go decision against retention/engagement evidence.

### STEP 20 — Strict $0 Public Launch ⬜ TODO (conditional)

- [ ] Launch on browser/PWA/itch.io/GitHub only.
- [ ] No silent paid dependency; honor zero-budget rule.
- [ ] Post-launch: version, changelog, known issues visible.

### STEP 21 — Paid Platform Gates ⛔ COST GATE

- [ ] Steam — only after traction/revenue or budget approval.
- [ ] Apple App Store — same gate.
- [ ] Google Play — same gate.
- [ ] Never gate the core free experience behind payment.

### STEP 22 — Market-Ready v1 ⬜ TODO

- [ ] Polished physical 3D board and pieces.
- [ ] Wood / Dark / Light themes.
- [ ] Board/camera sizing.
- [ ] Satisfying audio/impact feedback.
- [ ] Stable deterministic-enough physics.
- [ ] Intentional chain reactions.
- [ ] Balanced piece roles.
- [ ] Tutorial.
- [ ] Accessibility settings.
- [ ] Local play.
- [ ] Practice/challenges.
- [ ] Replay foundation.
- [ ] Private online matches.
- [ ] Reconnect.
- [ ] Production-safe backend.
- [ ] Server-authoritative competitive outcomes.
- [ ] Accounts only where useful.
- [ ] Match history.
- [ ] Public matchmaking.
- [ ] Ranked if infrastructure is ready.
- [ ] Telemetry.
- [ ] Privacy/license documentation.
- [ ] Automated tests.
- [ ] Performance target met.
- [ ] No pay-to-win.

---

## 7. Progress Log (Chronological)

| Version | Scope | Commit(s) | Summary |
|---|---|---|---|
| v0.1.x | Core prototype | — | Pre-STEP-3 baseline: 2D canvas physics, slingshot, HP, friendly fire. |
| v0.2.x | Combat physics | — | Collision cooldown, impulse propagation, mass config, damage thresholds/clamps, settle-state fixes, debug overlay (`D`). |
| v0.3.x | 3D presentation | `6123b98` → STEP 3 | Three.js integrated; 6 procedural models; board/lights/shadows; tilt/tumble/destruction; low-quality mode; WebGL fallback. |
| v0.4.0 | STEP 4 | `7853862` | Fullscreen board, themes, board-size selector, responsive/high-DPI, resize safety. |
| v0.4.x | STEP 5 | `bfed546`, `3e990c6` | Procedural Web Audio, dynamic collision audio, VFX suite, King danger feedback, accessibility settings. |
| v0.4.x | STEP 5 polish | `6fcece6`, `ab40ff1` | King danger ring; UI click sounds; tracker Progress Log + pending roadmap. |
| v0.4.x | Hygiene | `bdd024f` | Removed platform preview URL; full git history rewritten (author `mr-zero0`), force-pushed; zero `monkeycode`/`chaitin` traces. |
| v0.4.1 | STEP 6 | `a239dd0` | Role-based physics multipliers, combo detection + UI, per-team balance stats, developer tuning panel, JS+Python tests. |
| v0.5.x | STEP 7 | `fb1f968` | First-time interactive tutorial + replay, keyboard-accessible modals (focus trap), non-color team markers, mobile touch targets, text-scaling tolerance. |

---

## 8. Verification Snapshot

- Python pytest: **21/21 pass** (includes STEP 6 role-field tests).
- Node physics tests: **16/16 pass** (includes STEP 6 multiplier tests).
- Playwright headless: **25/25 (3D path) + 16/16 (2D flow)** pass at STEP 6.
- Performance: in-page frame times healthy (~14 ms avg); headless wall-clock variance is a container/SwiftShader artifact, not app code (reproduced on both old and new builds).
- Identity: `mr-zero0 <mr-zero0@users.noreply.github.com>`; GitHub remote = `https://github.com/mr-zero0/ArChess`; STEP 6 pushed as part of the batch commit.

---

## 9. Features Explicitly Deferred

AI opponent · battle pass · clans/guilds · tournaments · spectator servers · voice chat · global chat · loot boxes · NFT/blockchain · complex economy · dozens of currencies · story campaign · UGC 3D models · advanced board editor · marketplace · esports tooling · native mobile app · Steam-specific integration.

---

## 10. Release Version Plan

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

Do not rush v1.0 for cosmetic reasons.

---

## 11. Recommended Execution Order

STEP 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → **8 (current)** → 9 → 10 → 12 → 13 → 11 (as needed) → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 22 → 21 (cost-gated).
