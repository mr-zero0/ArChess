# ArChess — Product Design Document & Zero-Budget Development Tracker

**Document type:** Living Game Design Document (GDD) + Product Roadmap + Completion Tracker  
**Project:** ArChess  
**Repository:** `mr-zero0/ArChess`  
**Primary platform:** Browser / PWA  
**Core stack:** Python + Flask + HTML/CSS + Vanilla JavaScript  
**Visual direction:** Physical 3D tabletop chess battle  
**Budget rule:** Development must use free/open-source tools and free service tiers wherever possible.

---

# 0. How to Use This Document

This file is the single source of truth for ArChess product development.

Every major milestone has:

- **Status**
- **Goal**
- **Scope**
- **Deliverables**
- **Acceptance criteria**
- **Free implementation path**
- **Dependencies**
- **Cost gate**, where applicable

## Status Legend

| Status | Meaning |
|---|---|
| ✅ DONE | Implemented and verified |
| 🟡 PARTIAL | Implemented partly or awaiting verification/polish |
| 🔵 NEXT | Immediate recommended priority |
| ⬜ TODO | Not started |
| ⛔ COST GATE | Cannot honestly be guaranteed at strict $0 |
| 🧪 EXPERIMENT | Prototype before committing to architecture |

## Zero-Budget Rule

ArChess should be built so that:

1. Development software costs **$0**.
2. Core libraries must be free/open-source or have a clearly compatible free commercial-use license.
3. Art/audio should be created in-house with free tools or use assets with commercial-safe licenses such as CC0.
4. Free cloud tiers may be used for prototypes and alpha testing, but **the product must not silently depend on a paid upgrade**.
5. Any platform, infrastructure, legal, or distribution item that eventually requires money must be explicitly marked **COST GATE**.
6. Paid features must never be required to complete the core game during development.
7. Do not add a paid SDK merely because it saves development time.
8. If a service changes its free tier, replace it or move that milestone behind a cost gate.

---

# 1. Product Definition

## Product Name

**ArChess**

Working expansion:

> **ArChess — Physics Chess Battle**

Final subtitle/tagline can change after market testing.

## Product Positioning

ArChess is **not ordinary chess with animations**.

It is a turn-based physics combat game played with chess armies.

### Core fantasy

> Pull back a physical chess piece, launch it across the board, ricochet into enemy formations, create chain reactions, damage pieces through impact, and destroy the enemy King.

### High-level comparison

ArChess combines:

- recognizable chess armies
- slingshot aiming
- billiards/carrom-style impact planning
- physics chain reactions
- HP-based tactical combat
- friendly fire
- turn-based PvP

The differentiator is not merely "physics chess." The intended identity is:

> **Competitive physics combat using chess pieces.**

---

# 2. Core Design Pillars

## Pillar A — Satisfying Physical Launches

Every shot must feel good before any progression system matters.

Aiming should be immediate, readable and predictable enough to reward skill.

## Pillar B — Tactical Chain Reactions

One launch may create multiple collisions, but chain reactions must remain understandable rather than random noise.

Players should be able to intentionally use:

- direct hits
- bank shots
- sacrificial hits
- friendly-fire manipulation
- domino collisions
- King setup shots

## Pillar C — Pieces Have Combat Identity

Chess pieces are not skins over identical discs.

Each piece must feel physically and strategically different through:

- HP
- Power
- mass
- radius/collision profile
- acceleration/launch response
- friction/slide characteristics where appropriate
- visual silhouette

## Pillar D — Physical Chess Set Presentation

The default game should resemble a premium physical chess board that has become a battlefield.

Default visual identity:

- real 3D chess-piece silhouettes
- wood board
- rosewood/mahogany side
- ebony/gunmetal side
- realistic shadows
- material highlights
- no coin-shaped bodies around pieces

Alternative themes:

- Wood
- Dark
- Light

## Pillar E — Easy to Learn, Difficult to Master

A new player should understand the controls in under one minute.

Long-term skill should come from:

- angle
- power
- collision prediction
- piece value
- positioning
- risk
- chain reactions
- defensive placement

## Pillar F — No Pay-to-Win

If ArChess is monetized later, competitive physics/statistics remain identical between cosmetic variants.

---

# 3. Canonical Game Rules

## Board

- 8 × 8 chessboard.
- Normal chess opening arrangement.
- Logical physics coordinates remain independent of screen resolution or board zoom.
- Board may be resized visually without changing gameplay physics.

## Starting Arrangement

```text
BLACK
R N B Q K B N R
P P P P P P P P
. . . . . . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
P P P P P P P P
R N B Q K B N R
WHITE
```

## Turn Flow

```text
WHITE
  ↓
Select living White piece
  ↓
Drag backward
  ↓
Aim + set power
  ↓
Release
  ↓
Piece launches
  ↓
Physics / impacts / damage / destruction
  ↓
Wait until all active physics settles
  ↓
BLACK
  ↓
repeat
```

## Selection

Only the current player's living pieces are selectable.

Dead pieces:

- cannot be selected
- cannot collide
- are removed from active physics after destruction presentation completes

## Launch

The **chess piece itself** is the projectile.

Do not spawn a ball, puck, coin or separate projectile.

Launch direction:

```text
dx = piece.x - pointer.x
dy = piece.y - pointer.y

vx = dx * launchStrength
vy = dy * launchStrength
```

Launch speed must be clamped.

Zero-distance drag does not launch.

## Collision

Pieces collide as physical bodies.

Initial gameplay physics may use circle/capsule-like logical collision shapes even while visuals are 3D.

Collision sequence:

1. Detect overlap.
2. Determine collision normal.
3. Determine relative normal velocity.
4. Calculate impact intensity.
5. Apply damage to both pieces.
6. Resolve overlap.
7. Apply impulse/bounce.
8. Trigger feedback.
9. Prevent duplicate damage from the same continuous contact.
10. Continue simulation for resulting collisions.

## Friendly Fire

**Enabled.**

An allied piece can damage another allied piece.

This is a core strategic feature, not a bug.

## Win Condition

There is:

- no check
- no checkmate
- no castling
- no en passant
- no traditional capture
- no conventional chess movement restriction after launch

A player wins when the opposing King reaches:

```text
HP <= 0
```

---

# 4. Canonical Piece Statistics

| Piece | HP | Power | Combat Concept |
|---|---:|---:|---|
| Pawn | 30 | 10 | expendable setup / light projectile |
| Knight | 50 | 30 | mobile trick-shot piece |
| Bishop | 40 | 25 | precision / long-slide concept |
| Rook | 80 | 40 | heavy battering ram |
| Queen | 90 | 70 | high-value offensive piece |
| King | 120 | 100 | objective + dangerous heavy piece |

These HP/Power values are the current baseline, not permanent balance law.

## Future Physical Parameters

Do not finalize these before playtesting:

| Parameter | Pawn | Knight | Bishop | Rook | Queen | King |
|---|---|---|---|---|---|---|
| Mass | TBD | TBD | TBD | TBD | TBD | TBD |
| Radius | TBD | TBD | TBD | TBD | TBD | TBD |
| Launch response | TBD | TBD | TBD | TBD | TBD | TBD |
| Friction modifier | TBD | TBD | TBD | TBD | TBD | TBD |
| Restitution modifier | TBD | TBD | TBD | TBD | TBD | TBD |

Balance must be data-driven.

---

# 5. Damage Model

Baseline model:

```text
relativeVelocity
        ↓
normalizedImpact
        ↓
attackerPower × normalizedImpact × damageMultiplier
        ↓
clamp
        ↓
damage
```

Both participants may take damage based on the other's effective impact.

## Required Properties

- weak + slow = small damage
- strong + slow = moderate damage
- strong + fast = large damage
- damage is clamped
- stationary contact does not repeatedly drain HP
- one collision event should not be counted once per physics substep
- impacts below a minimum threshold may deal zero or negligible damage

## Collision Event Cooldown

A pair of pieces that remains touching must not repeatedly receive fresh impact damage until:

- they have separated sufficiently, and
- a new meaningful collision occurs

This is essential for stable combat.

---

# 6. Chain Reaction Philosophy

Chain reactions are a feature.

However, "one move makes the entire board explode every time" is not the intended balance target.

Use:

- impulse damping
- mass differences
- friction
- restitution tuning
- minimum damage velocity
- damage clamps
- collision cooldowns
- sensible maximum launch speed

The ideal result is:

> A spectacular multi-piece chain is possible because the player created it, not because every ordinary launch automatically destabilizes all 32 pieces.

---

# 7. Combo / Skill Feedback System

Potential combat callouts:

- DIRECT HIT
- BANK SHOT
- DOUBLE HIT
- TRIPLE HIT
- CHAIN REACTION
- DOMINO
- ROYAL STRIKE
- SACRIFICE
- FRIENDLY FIRE
- ENEMY FRATRICIDE
- KING BREAKER
- LAST STAND

Combos should initially be **presentation/scoring**, not stat buffs.

Do not let combo multipliers distort ranked physics until extensively tested.

---

# 8. Target Technical Architecture

## Browser Client

```text
HTML5
CSS3
Vanilla JavaScript modules
Three.js for real 3D presentation
HTML/CSS DOM for menus/HUD
Web Audio API for runtime audio
Pointer Events for mouse/touch
```

## Physics

Recommended:

> Keep the core gameplay physics logically 2D even after migrating visuals to actual 3D.

Reason:

- simpler deterministic simulation
- easier multiplayer synchronization
- easier balancing
- lower CPU usage
- easier mobile support
- visuals can still tumble/tilt in 3D independently

The existing custom physics system can evolve rather than immediately adopting a full 3D rigid-body engine.

## Backend

```text
Python 3
Flask
Flask-SocketIO or equivalent open WebSocket layer
Gunicorn/production WSGI server where appropriate
```

## Persistence

Development:

```text
JSON/config files
SQLite where persistence is useful
```

Online alpha/beta:

```text
PostgreSQL
free-tier hosted database while within limits
```

## Multiplayer Authority

Competitive multiplayer must eventually be server-authoritative.

Client sends **intent**:

```json
{
  "pieceId": "white_rook_1",
  "aimX": 0.74,
  "aimY": -0.31,
  "power": 0.82
}
```

Server validates:

- correct player
- correct turn
- piece exists
- piece alive
- piece belongs to player
- power within limits
- aim input valid
- match not over

The server then determines the canonical result.

---

# 9. Free Toolchain

| Area | Zero-cost choice | Notes |
|---|---|---|
| IDE | VS Code or another free editor | No paid extension required |
| Version control | Git | Free |
| Repository | GitHub Free | Existing repository |
| Backend | Python + Flask | Open-source |
| Frontend | HTML/CSS/JS | Native web platform |
| 3D rendering | Three.js | MIT-licensed |
| 3D modeling | Blender | Free/open-source; self-created artwork can be commercially used |
| 2D art | Krita | Free/open-source |
| Audio editing | Audacity | Free/open-source |
| Optional generic game assets | Kenney | CC0 assets available |
| Fonts | System fonts / appropriately licensed Google Fonts | Track font licenses |
| Browser testing | Playwright | Open-source browser automation |
| Web analytics | Cloudflare Web Analytics | Free option |
| Alpha backend host | Render free service | Testing/alpha only; not production-grade |
| Free DB prototype | Supabase Free | Quota-limited |
| Static frontend hosting | Cloudflare Pages | Free option |
| Browser/indie distribution | itch.io | Can publish without upfront platform fee |

## Asset License Rule

Create `ASSET_LICENSES.md`.

Every external asset must record:

```text
Asset name
Creator
Source
License
Commercial use allowed?
Attribution required?
Modified?
File(s) used
Date acquired
```

If the license is unclear, **do not use the asset**.

---

# 10. Zero-Cost Platform Strategy

## Strict $0 Launch Targets

Preferred:

1. Browser
2. PWA
3. itch.io browser build or downloadable wrapper if useful
4. GitHub repository for development/community visibility

## Cost-Gated Platforms

These are **not** part of the strict-zero-budget launch:

- Steam
- Apple App Store
- Google Play publishing
- paid custom domain
- paid production cloud capacity
- paid CDN/storage beyond free quotas
- paid legal counsel
- paid marketing/ads

They may be revisited only after traction/revenue or explicit budget approval.

---

# 11. Product Milestone Tracker

---

## Progress Log (Chronological)

Every completed deliverable, logged for traceability. Format: date — scope — version — commit — verification.

### v0.1.x — Core Prototype Baseline (prior session, pre-STEP 3)

- **STEP 0 (partial):** Product identity frozen — physics chess battle, King HP win condition, friendly fire, no check/checkmate, piece-as-projectile, Wood/Dark/Light direction, HP/Power baseline, physical projectile behavior. Tracker committed to repo.
- **STEP 1 (partial):** GitHub repo `mr-zero0/ArChess`, Flask project structure, README, modular JS (physics/render/input/UI), 8×8 board, 32-piece start, select → drag → launch loop, New Game/reset.
- **STEP 2 (core):** Delta-time motion, wall bouncing, friction, physics substeps, circle collisions, bilateral damage, friendly fire, tunable per-type mass, min impact threshold (`minDamageImpact`), max damage clamp (`maxCollisionDamage`), duplicate-damage prevention (`collisionCooldown`), impulse propagation, physics debug overlay (`D` key), collision settle logic.
- **Regression tests:** 18 Python pytest (`tests/test_game.py`) + 13 Node physics tests (`tests/physics.test.js`) — tunneling, simultaneous collision, wall-corner, overlap recovery, King-destroyed-during-chain, cooldown, settling termination.

### v0.4.0 — STEP 3: True 3D Chess Presentation (prior session — commit `ca4a2cb`)

- Vendored Three.js 0.185.1 locally (import map, no CDN).
- 6 procedural piece models (pawn/rook/bishop/knight/queen/king) via lathe/extrude; low-poly, shared geometries/materials, 32-instance friendly.
- Rosewood/ebony/ivory theme materials; board frame + 64 tiles.
- Key/fill/rim lights, PCFSoft 2048px shadows, contact blob shadows, velocity-stretched moving shadows.
- Velocity tilt, projectile tumble, upright rest pose, 0.5s destruction animation.
- Low-quality graphics mode (`▦` / `Q`, persisted in localStorage).
- Headless-Chromium verified: WebGL2, drag-launch physics, collisions/damage, game over, theme cycle, quality toggle, reset — zero console errors.

### v0.4.x — STEP 4: Board, Camera, Resize and Theme System (this session — commit `786407c`)

- Theme selector (Wood/Dark/Light) persisted in localStorage; Wood is default.
- Board-size selector 80–120% persisted; resize-safe (no piece reset/teleport), responsive mobile board, high-DPI (dpr ≤ 2), consistent hit-testing.
- Fullscreen board view (button + `F` key, `.board-frame:fullscreen`, `fullscreenchange`).
- Fixed real bug: `glCanvas` not hidden when WebGL2 unavailable (missing fallback branch).
- Headless-Chromium verified: theme/size persistence, fullscreen enter/exit, resize safety, zero console errors.

### v0.4.x — STEP 5: Game Feel — Audio, Effects and Haptics (this session — commits `e5fcc10`, `8e4145d`)

- `static/js/audio.js` — `window.AudioManager`: procedural Web Audio synthesis (click, select, pull/tension, launch, wood impact, heavy impact, wall, King hit, destruction, victory, defeat, ambient room tone). Impact volume/pitch scale with collision intensity. Lazy AudioContext + gesture unlock. Zero external audio assets ($0 budget).
- `static/js/prefs.js` — `window.PrefsManager`: master/effects/ambience volume, mute, ambient tone, screen shake, reduced motion, haptics toggles; persisted in `archess-audio` and `archess-motion`.
- Settings modal (gear button / `S` key / Escape) wired in `templates/index.html` + `static/css/style.css`.
- Renderer respects reduced motion (no trails/streaks/shake) and shake prefs.
- Haptics via `navigator.vibrate` where supported; toggle dimmed under reduced motion.
- King danger feedback: HUD player card danger state + pulsing red on-board ring below 35% King HP.
- UI button click sounds for all chrome buttons.
- Headless-Chromium verified: modal open/close (button/`S`/Escape), pref persistence across reload, AudioContext unlock on gesture, all audio paths, danger state, reduced-motion suppression — zero console errors.

### Verification Snapshot (current, v0.4.x)

- Python pytest: 18/18 pass.
- Node physics tests: 13/13 pass.
- Playwright headless: 25/25 (3D path) + 16/16 (2D flow) pass.
- Live preview served locally via the Flask dev server on port 5000 (temporary preview URL omitted here).
- Current HEAD: `90cc882` (4 commits ahead of `origin/main` at this writing; pushed together with this log).

### Pending From the Start (structured)

#### Housekeeping to close early steps

- **STEP 0:** Freeze v1 scope in repo; add GitHub milestones for roadmap steps; decide final public tagline; name/trademark conflict review before commercial branding.
- **STEP 1:** Verify `.gitignore`; add `.env.example`; ensure secrets can never be committed; add `CONTRIBUTING.md`, `CHANGELOG.md`, `ASSET_LICENSES.md`; add issue templates (bug/balance/feature); add `/api/version` endpoint + version in game UI; create Git tags from `v0.1.0`; add CI syntax/test workflow; decide source-code licensing.
- **STEP 2:** Acceptance-criteria audit — no unexplained energy gain, no continuous-contact HP drain, repeatable outcomes, normal shots do not auto-activate most pieces, intentional chain reactions remain possible, 32 active pieces stay performant.

#### Feature roadmap (next → later)

- **STEP 6** ⬜ — Combat roles, HP/Power balance, combo system. **← NEXT**
- **STEP 7** ⬜ — UX, tutorial, accessibility polish.
- **STEP 8** ⬜ — Local modes, challenges, replay foundation.
- **STEP 9** ⬜ — Automated testing, QA, performance.
- **STEP 10** ⬜ — Production-ready Flask architecture.
- **STEP 11** ⬜ — Accounts, profiles, persistence.
- **STEP 12** ⬜ — Private online multiplayer MVP.
- **STEP 13** ⬜ — Authoritative simulation, anti-cheat.
- **STEP 14** ⬜ — Public matchmaking, ranked.
- **STEP 15** ⬜ — Progression, cosmetics.
- **STEP 16** ⬜ — Analytics, telemetry, balance dashboard.
- **STEP 17** ⬜ — Security, privacy, legal, license hygiene.
- **STEP 18** ⬜ — Zero-cost alpha distribution.
- **STEP 19** ⬜ — Closed alpha → public beta → product-market fit.
- **STEP 20** ⬜ — Strict $0 public launch (conditional).
- **STEP 21** ⛔ — Paid platform gates, only after validation (cost gate).
- **STEP 22** ⬜ — Market-ready v1.

---

## STEP 0 — Freeze Product Identity and Rules

**Status:** 🟡 PARTIAL  
**Priority:** Immediate

### Goal

Prevent ArChess from drifting into "random chess features."

### Deliverables

- [x] Define core loop.
- [x] Define King HP win condition.
- [x] Define friendly fire.
- [x] Remove check/checkmate requirement.
- [x] Establish HP and Power baseline.
- [x] Define physical projectile behavior.
- [x] Define Wood / Dark / Light visual direction.
- [x] Define piece itself as projectile.
- [x] Position product as physics combat rather than ordinary chess.
- [ ] Freeze v1 scope in repository.
- [x] Create `ARCHESS_PRODUCT_DESIGN_TRACKER.md` in repo.
- [ ] Add GitHub milestones corresponding to roadmap steps.
- [ ] Decide final public tagline.
- [ ] Perform name/trademark conflict review before commercial branding.

### Acceptance Criteria

Step 0 is done when all future features can be judged against a frozen statement:

> Does this make ArChess a better competitive physics chess battle game?

### Cost

**$0**

---

## STEP 1 — Repository and Engineering Baseline

**Status:** 🟡 PARTIAL  
**Depends on:** Step 0

### Goal

Make the repository safe to evolve for a long project.

### Deliverables

- [x] GitHub repository exists.
- [x] Flask project structure exists.
- [x] README exists.
- [x] Modular JS exists for physics/render/input/UI.
- [ ] Verify `.gitignore`.
- [ ] Add `.env.example`.
- [ ] Ensure secrets can never be committed.
- [ ] Add `CONTRIBUTING.md`.
- [ ] Add `CHANGELOG.md`.
- [ ] Add `ASSET_LICENSES.md`.
- [ ] Add issue templates for bug / balance / feature.
- [ ] Add version number to game UI or `/api/version`.
- [ ] Add Git tags beginning with `v0.1.0`.
- [ ] Add CI syntax/test workflow.
- [ ] Decide source-code licensing strategy before adding a permissive license.

### Acceptance Criteria

A fresh clone can be installed and run using documented commands with no hidden local files.

### Cost

**$0**

---

## STEP 2 — Stabilize Core Physics and Damage

**Status:** 🟡 PARTIAL  
**Depends on:** Step 1

### Goal

Make every collision predictable enough for a competitive game.

### Deliverables

- [x] Delta-time motion.
- [x] Wall bouncing.
- [x] Friction.
- [x] Physics substeps.
- [x] Circle collision baseline.
- [x] Bilateral damage.
- [x] Friendly fire.
- [x] Add explicit per-pair contact state — v0.2.0
- [x] Prevent repeat damage while pieces remain touching — v0.2.0
- [x] Tune impulse propagation so ordinary shots do not disturb the entire army — v0.2.0
- [x] Add minimum impact threshold — v0.1.x (minDamageImpact)
- [x] Add maximum impact/damage clamp — v0.1.x (maxCollisionDamage)
- [x] Add tunable mass per piece type — v0.1.x
- [x] Add collision test suite. — v0.3.x (13 Node tests in tests/physics.test.js)
- [x] Add high-speed tunneling test. — v0.3.x
- [x] Add simultaneous-collision test. — v0.3.x
- [x] Add wall-corner test. — v0.3.x
- [x] Add overlapping-piece recovery test. — v0.3.x
- [x] Add King-destroyed-during-chain test. — v0.3.x
- [x] Verify settling always terminates. — v0.3.x
- [x] Add physics debug overlay toggle.

### Required Debug Overlay

Display:

```text
FPS
delta time
substeps
active moving bodies
selected piece
piece velocity
collision count
contact pairs
settle timer
```

### Acceptance Criteria

- No piece gains unexplained energy.
- No continuous-contact HP drain.
- Same initial state + same shot produces acceptably repeatable outcome.
- Normal shot does not automatically activate most pieces.
- Intentional chain reactions remain possible.
- 32 active pieces stay performant.

### Cost

**$0**

---

## STEP 3 — True 3D Chess Presentation

**Status:** ✅ DONE  
**Depends on:** Step 2

### Current Situation

Current visual work can imitate dimensional chess pieces in Canvas, but the market target is **actual 3D geometry**.

### Verification (v0.4.0)

Headless-Chromium verified end-to-end: WebGL2 active, `glCanvas` stacked under `gameCanvas`, 32 pieces on the board, checkerboard tiles rendered in perspective, drag-launch runs the physics phase with collisions/damage, destruction triggers game over, theme cycle wood/dark/light updates the scene, `▦` quality toggle flips low/high and persists, New Game resets to 32 alive pieces, zero console errors.

### Architecture Note (v0.4.0)

Chose runtime procedural geometry (Three.js lathe/extrude) instead of Blender-exported `.glb` — zero external art assets, honoring the $0 budget and keeping the repo self-contained. Physics stays in 2D logical space; Three.js is purely the presentation layer under the existing 2D overlay canvas.

### Goal

Replace symbolic/2.5D pieces with true 3D chess models while keeping logical physics 2D.

### Recommended Rendering Architecture

```text
2D logical physics
        ↓
piece x/y state
        ↓
Three.js scene mapping
        ↓
3D model transform
        ↓
camera + lights + shadows
```

### Deliverables

- [x] Add Three.js — v0.4.0 (vendored locally `static/vendor/three.module.min.js`, three@0.185.1, MIT, served via import map; no CDN dependency).
- [x] Create 6 original piece models — v0.4.0 (procedural Three.js geometry instead of Blender: lathe profiles for pawn/rook/bishop/queen/king, extruded shape knight head, box merlons/cross/sphere crown; zero external art assets, honoring the $0 budget).
  - [x] Pawn
  - [x] Knight
  - [x] Bishop
  - [x] Rook
  - [x] Queen
  - [x] King
- [x] Keep mesh polycount suitable for 32 simultaneous pieces — v0.4.0 (low-poly lathe/extrude, shared geometries + materials per team; one draw call group per piece, 32 max instances).
- [x] Create rosewood material — v0.4.0 (`wood` theme palette: `0x8a4b34`/`0x1b1c1d` MeshStandard, low metalness).
- [x] Create ebony/gunmetal material — v0.4.0 (`dark` theme palette: `0xc8d6e0`/`0x20282e`, high metalness `0.4-0.5`).
- [x] Create ivory/light material — v0.4.0 (`light` theme palette: `0xf4f1ea`/`0x3a4146`).
- [x] Add physically convincing board material — v0.4.0 (rosewood frame box + 64 tile boxes, per-theme colors, roughness/metalness, receive shadows).
- [x] Add directional/key light — v0.4.0 (key `DirectionalLight` 2.6, casts 2048px PCFSoft shadows).
- [x] Add soft ambient/fill light — v0.4.0 (`HemisphereLight` fill + cool `DirectionalLight` rim).
- [x] Add contact shadows — v0.4.0 (opacity-adaptive ground blob shadow per piece + dynamic cast shadows from pieces onto board).
- [x] Add moving-piece shadow — v0.4.0 (shadow blob stretches opposite velocity and tracks board position).
- [x] Add velocity-based tilt — v0.4.0 (piece leans into travel direction, scaled by speed ratio; damped blend).
- [x] Add subtle projectile tumble — v0.4.0 (travel-rotation wobble + vertical bob while moving, seeded per piece).
- [x] Return to upright resting pose when settled — v0.4.0 (slow damp to identity when speed below minVelocity).
- [x] Add destruction animation — v0.4.0 (0.5s death anim: scale-out ease, spin tumble, lift, shadow fade).
- [x] Add low-quality graphics mode — v0.4.0 (`▦` button / `Q` shortcut, persisted in localStorage: pixelRatio capped at 1, shadows disabled).

### Selection Presentation

No large circle around the piece.

Use one or more of:

- subtle ground glow — v0.4.0 (additive pulsing ring glow under the selected piece, hidden otherwise)
- base illumination
- small chevron
- outline shader
- vertical marker

### Acceptance Criteria

At a glance, a screenshot should look like a physical chess set, not circular game tokens. — v0.4.0 (layered WebGL board under the 2D canvas preserves all game overlays; camera at `(5, 8, 9.5)` with ACES tone mapping)

### Cost

**$0**

Tools: Three.js + Blender.

---

## STEP 4 — Board, Camera, Resize and Theme System

**Status:** ✅ DONE  
**Depends on:** Step 3

### Goal

Make board presentation configurable without affecting physics.

### Themes

- [x] Wood — default
- [x] Dark
- [x] Light

### Board Resize

Target presentation settings:

```text
80%
90%
100%
110%
120%
```

Or equivalent responsive scaling.

### Rule

Board resize changes:

- camera
- DOM/container sizing
- viewport

Board resize must **not** modify:

- world coordinates
- piece mass
- velocity
- damage
- collision radii
- launch strength

### Deliverables

- [x] Theme selector.
- [x] Persist theme in `localStorage`.
- [x] Board-size selector.
- [x] Persist size preference.
- [x] Responsive mobile board.
- [x] Fullscreen option.
- [x] Window resize safety.
- [x] No piece reset/teleport on resize.
- [x] High-DPI rendering.
- [x] Consistent hit testing after resize.

### Verification (v0.4.x)

Headless-Chromium verified end-to-end: theme cycles WOOD → DARK → LIGHT → WOOD and persists; board size 80%–120% persists and resizes the canvas without resetting any piece state; fullscreen toggle (button / `F`) enters and exits the board view; pieces remain displaced after repeated resizing; high-DPI scaling (dpr ≤ 2) and pointer hit testing stay consistent; zero console errors.

### Acceptance Criteria

A match can be resized repeatedly while pieces are displaced without changing game state.

### Cost

**$0**

---

## STEP 5 — Game Feel: Audio, Effects and Haptics

**Status:** ✅ DONE  
**Depends on:** Step 3

### Goal

Make launches and impacts emotionally satisfying.

### Audio

- [x] UI hover/click.
- [x] Piece selection.
- [x] Pull/tension feedback.
- [x] Launch.
- [x] Wood impact.
- [x] Heavy impact.
- [x] Wall impact.
- [x] Critical King hit.
- [x] Piece destruction.
- [x] Victory.
- [x] Defeat.
- [x] Ambient board/room option.

### Dynamic Collision Audio

Impact volume/pitch should reflect collision intensity.

All sounds are synthesized in-browser with the Web Audio API (`static/js/audio.js`); no external audio assets. Impact volume and pitch scale with collision intensity. Master/effects/ambience volumes, mute, and haptics are user-controllable.

### Visual Effects

- [x] Motion trails.
- [x] Launch dust.
- [x] Collision sparks/dust.
- [x] Floating damage.
- [x] Strong-impact flash.
- [x] Destruction fragments.
- [x] Subtle screen shake.
- [x] King danger feedback.

### Accessibility Settings

- [x] Master volume.
- [x] Effects volume.
- [x] Music/ambience volume.
- [x] Mute.
- [x] Reduced motion.
- [x] Screen shake toggle.
- [x] Haptics toggle where supported.

All settings persist in `localStorage` (`archess-audio`, `archess-motion`). Reduced motion disables trails, streaks and screen shake but keeps the game fully playable. Haptics use `navigator.vibrate` where supported.

### Free Creation Path

- Audacity for editing.
- Self-recorded/custom-created sounds.
- CC0 audio only when externally sourced.
- Web Audio API for playback.

### Acceptance Criteria

A player can understand impact strength from sound/visual feedback even without reading the damage number.

### Verification (v0.4.x)

Headless-Chromium verified end-to-end: settings modal opens via button and `S` key, closes via `S` and Escape; volume/mute/motion preferences persist across reloads; AudioContext initializes on first user gesture and click/select/pull/launch/impact/king-hit/destruction/game-over paths all fire without page or console errors; reduced-motion toggling suppresses shake; the HUD card gains the danger state when a King is below 35% HP and a pulsing ring renders around it; zero console errors.

### Cost

**$0**

---

## STEP 6 — Combat Roles, Balance and Combo System

**Status:** ⬜ TODO  
**Depends on:** Step 2 + Step 5

### Goal

Make the choice of projectile strategically meaningful.

### Initial Role Direction

**Pawn**
- light
- cheap setup piece
- lower durability
- useful for sacrifices

**Knight**
- responsive
- useful for trick/bank shots
- medium durability

**Bishop**
- precision-oriented
- low-drag/long-slide candidate

**Rook**
- heavy
- high momentum
- battering ram

**Queen**
- dangerous
- high offensive value
- costly to expose

**King**
- heaviest/highest-value piece
- dangerous to launch
- defeat condition

### Deliverables

- [ ] Add mass configuration.
- [ ] Add radius profile configuration.
- [ ] Add launch response configuration.
- [ ] Balance damage multiplier.
- [ ] Balance bounce factor.
- [ ] Balance friction.
- [ ] Implement combo detection.
- [ ] Add combo UI.
- [ ] Track King damage separately.
- [ ] Track friendly-fire damage.
- [ ] Record match-level balance stats.
- [ ] Build developer tuning panel.

### Developer Tuning Panel

Allow live edits to:

```text
HP
Power
Mass
Radius
Launch strength
Max velocity
Friction
Restitution
Damage multiplier
Collision multiplier
Impact threshold
Settle velocity
```

### Acceptance Criteria

No piece is obviously optimal for nearly every turn.

### Cost

**$0**

---

## STEP 7 — UX, Tutorial and Accessibility

**Status:** ⬜ TODO  
**Depends on:** Step 4 + Step 6

### Goal

A completely new player should understand the game quickly.

### First-Time Tutorial

```text
1. Select your piece
2. Pull backward
3. Aim
4. Release
5. Watch collisions
6. Reduce the enemy King to 0 HP
7. Friendly fire is real
```

### Deliverables

- [ ] First-time interactive tutorial.
- [ ] Tutorial replay in Help.
- [ ] Aim direction clearly visible.
- [ ] Power clearly visible.
- [ ] Cancel drag.
- [ ] Invalid-piece feedback.
- [ ] Current turn unmistakable.
- [ ] Physics-in-progress lock feedback.
- [ ] King HP always readable.
- [ ] Game-over overlay.
- [ ] Rematch/new game.
- [ ] Keyboard-accessible menus.
- [ ] Team distinction not based on color alone.
- [ ] Reduced-motion mode.
- [ ] Text scaling tolerance.
- [ ] Mobile touch targets.

### Acceptance Criteria

A user can finish their first match without external instructions.

### Cost

**$0**

---

## STEP 8 — Local Modes, Challenges and Replay Foundation

**Status:** ⬜ TODO  
**Depends on:** Step 7

### Modes

- [ ] Local Pass & Play
- [ ] Practice / Sandbox
- [ ] Trick Shot Challenges
- [ ] Optional turn timer
- [ ] Replay Viewer

### Challenge Examples

- Destroy King in two shots.
- Damage three pieces with one launch.
- Hit King after a wall ricochet.
- Destroy a Queen using only Pawns.
- Cause an enemy piece to damage its own King.
- Win with your Queen destroyed.

### Replay Architecture

Store:

```text
game version
physics config version
initial seed/state
turn number
piece ID
aim vector
power
result checksum/snapshot
```

Do not initially store video.

### Acceptance Criteria

A complete match can be reconstructed from its action log.

### Cost

**$0**

---

## STEP 9 — Automated Testing, QA and Performance

**Status:** ⬜ TODO  
**Depends on:** Step 2 onward

### Unit Tests

- [ ] launch vector
- [ ] speed clamp
- [ ] friction
- [ ] wall bounce
- [ ] overlap resolution
- [ ] collision impulse
- [ ] damage calculation
- [ ] collision cooldown
- [ ] piece death
- [ ] King death
- [ ] turn switch
- [ ] game reset
- [ ] theme persistence
- [ ] board resize state safety

### Browser Tests

Use Playwright.

Test:

- [ ] Chromium
- [ ] Firefox
- [ ] WebKit
- [ ] desktop viewport
- [ ] tablet viewport
- [ ] mobile viewport
- [ ] pointer/touch input

### Performance Targets

Target:

- 60 FPS on typical desktop hardware.
- Smooth play with 32 pieces active.
- No unbounded effect arrays.
- No repeated DOM creation per particle.
- No memory growth after multiple New Games.
- Graceful quality reduction on weaker mobile hardware.

### Acceptance Criteria

Automated tests run from one command and CI catches regression before merge.

### Cost

**$0**

---

## STEP 10 — Production-Ready Flask Architecture

**Status:** ⬜ TODO  
**Depends on:** Step 9

### Goal

Prepare Flask for networked game services without coupling browser rendering to backend code.

### Recommended Structure

```text
archess/
├── app.py
├── config.py
├── game/
│   ├── constants.py
│   ├── rules.py
│   ├── physics_server.py
│   ├── match.py
│   └── serialization.py
├── api/
│   ├── routes.py
│   └── schemas.py
├── multiplayer/
│   ├── rooms.py
│   ├── socket_handlers.py
│   └── matchmaking.py
├── templates/
├── static/
└── tests/
```

### Deliverables

- [ ] Flask app factory.
- [ ] development/test/production config.
- [ ] structured logging.
- [ ] health endpoint.
- [ ] version endpoint.
- [ ] input validation.
- [ ] error handlers.
- [ ] request size limits.
- [ ] production server configuration.
- [ ] security headers.
- [ ] rate-limit design.
- [ ] no secrets in source.
- [ ] no debug mode in production.

### Acceptance Criteria

Backend can be deployed independently of local development settings.

### Cost

**$0 locally**

Hosted production reliability is a later infrastructure gate.

---

## STEP 11 — Accounts, Profiles and Persistence

**Status:** ⬜ TODO  
**Depends on:** Step 10

### Principle

Do not require an account just to understand the game.

Start with:

```text
Guest
→ Play
→ Optional account for persistent stats / ranked
```

### Profile Data

- username
- avatar
- settings
- matches played
- wins
- losses
- rating
- damage dealt
- King damage
- pieces destroyed
- best chain
- favorite piece
- cosmetics/unlocks later

### Deliverables

- [ ] Guest identity.
- [ ] Account registration/login only when needed.
- [ ] Password/auth strategy.
- [ ] Profile page.
- [ ] Persistent settings.
- [ ] Match history.
- [ ] Database migrations.
- [ ] Account deletion.
- [ ] Data export strategy.
- [ ] Minimal personal-data collection.

### Free Prototype Path

Use:

- SQLite locally.
- Supabase Free or another acceptable free Postgres/auth tier for small alpha/beta, while within quota.

### Acceptance Criteria

Account deletion removes/appropriately anonymizes user-linked personal data according to the product policy.

### Cost

**$0 during prototype/free-tier limits**

Scale may trigger a future cost gate.

---

## STEP 12 — Private Online Multiplayer MVP

**Status:** ⬜ TODO  
**Depends on:** Step 10

### Goal

Two players on different computers can complete a full match.

### UX

```text
MULTIPLAYER

Create Room
Join Room

Room code:
ARCH-7K2P
```

### Deliverables

- [ ] Create room.
- [ ] Join room.
- [ ] Player assignment.
- [ ] Match start handshake.
- [ ] Turn synchronization.
- [ ] Validated launch action.
- [ ] Physics-result synchronization.
- [ ] HP synchronization.
- [ ] destruction synchronization.
- [ ] game-over synchronization.
- [ ] reconnect.
- [ ] rematch.
- [ ] room timeout.
- [ ] graceful disconnect handling.

### Free Alpha Hosting

A free host may be used for alpha testing.

Important:

> Free host sleep, quotas and availability are acceptable during alpha but not a market-ready reliability guarantee.

### Acceptance Criteria

Two remote browsers can play ten consecutive matches without desynchronizing.

### Cost

**$0 alpha target**

Reliable production hosting at scale is a future cost gate.

---

## STEP 13 — Authoritative Simulation and Anti-Cheat

**Status:** ⬜ TODO  
**Depends on:** Step 12  
**Required before:** Ranked

### Goal

Do not trust clients to decide legal competitive outcomes.

### Server Owns

- current player
- piece alive/dead
- HP
- piece positions
- legal power range
- physics config version
- winner
- turn transitions

### Client Owns

- rendering
- animation interpolation
- local aiming preview
- particles
- sound
- non-authoritative visual effects

### Deliverables

- [ ] canonical server state.
- [ ] shot validation.
- [ ] server physics simulation.
- [ ] state snapshots.
- [ ] client reconciliation.
- [ ] physics config versioning.
- [ ] replay checksum.
- [ ] invalid-client-action logging.
- [ ] rate limits.
- [ ] tamper-resistant match result flow.

### Acceptance Criteria

Editing browser JavaScript cannot grant a player extra HP, illegal power or an out-of-turn launch in an authoritative match.

### Cost

Code: **$0**

Production server capacity: potential future cost gate.

---

## STEP 14 — Public Matchmaking and Ranked

**Status:** ⬜ TODO  
**Depends on:** Step 13

### Casual Matchmaking

- [ ] join queue
- [ ] leave queue
- [ ] region/ping consideration later
- [ ] match found
- [ ] reconnect
- [ ] surrender
- [ ] turn timer
- [ ] disconnect timeout

### Ranked

- [ ] hidden MMR.
- [ ] visible divisions.
- [ ] placement logic.
- [ ] win/loss rating update.
- [ ] abandonment handling.
- [ ] seasonal reset strategy only if useful.
- [ ] leaderboard.

Possible visible divisions:

```text
Bronze
Silver
Gold
Platinum
Diamond
Master
Grandmaster
```

Do not add fake progression merely to inflate playtime.

### Acceptance Criteria

A ranked result cannot be submitted solely by the winning client's browser.

### Cost

**$0 during small beta if free-tier capacity allows**

⛔ **COST GATE at scale**

---

## STEP 15 — Progression and Cosmetics

**Status:** ⬜ TODO  
**Depends on:** Stable gameplay, not required for early alpha

### Rule

No cosmetic changes:

- HP
- Power
- mass
- hitbox
- radius
- launch strength
- friction
- bounce
- damage

### Cosmetic Categories

- piece sets
- board sets
- materials
- trails
- impact effects
- destruction effects
- King defeat animations
- banners
- avatars
- profile frames

### Example Sets

- Classic Wood
- Ebony & Ivory
- Marble
- Crystal
- Medieval
- Samurai-inspired
- Steampunk
- Cyber
- Ice
- Lava

All assets must be original or properly licensed.

### Free Progression First

Before monetization:

- achievements
- challenge unlocks
- match milestones
- cosmetic rewards

### Cost

**$0 to build**

Payment processing/marketplace systems are deferred.

---

## STEP 16 — Analytics, Telemetry and Balance Dashboard

**Status:** ⬜ TODO  
**Depends on:** Step 9

### Product Metrics

Track only what helps improve the game.

Recommended:

- match started
- match completed
- rematch
- average turns
- match duration
- White win %
- Black win %
- damage by piece type
- launches by piece type
- King damage by piece
- self/friendly-fire damage
- chain length
- surrender
- disconnect
- tutorial completion
- challenge completion

### Do Not Collect by Default

- unnecessary location
- contact list
- device identifiers not needed by the game
- invasive ad-tracking data

### Free Path

- Cloudflare Web Analytics for web traffic.
- Internal game event aggregation into the existing backend/database within free-tier limits.
- Local Python notebooks/scripts for balance analysis.

### Acceptance Criteria

A balance change can be evaluated from data instead of intuition alone.

### Cost

**$0 within free-tier limits**

---

## STEP 17 — Security, Privacy, Legal and License Hygiene

**Status:** ⬜ TODO  
**Depends on:** Before public account-based beta

### Security

- [ ] HTTPS on deployed services.
- [ ] secure cookies.
- [ ] CSRF strategy where relevant.
- [ ] rate limits.
- [ ] authentication abuse handling.
- [ ] input/schema validation.
- [ ] dependency update process.
- [ ] secret scanning.
- [ ] no client-authoritative ranked results.
- [ ] backup/restore process.

### Privacy

- [ ] privacy policy.
- [ ] data inventory.
- [ ] account deletion.
- [ ] retention rules.
- [ ] minimal collection.
- [ ] analytics disclosure.
- [ ] cookie/storage disclosure where legally required.

### Licensing

- [ ] `ASSET_LICENSES.md`.
- [ ] dependency license inventory.
- [ ] font license inventory.
- [ ] audio license inventory.
- [ ] model/texture license inventory.
- [ ] retain required third-party notices.

### Branding

- [ ] search name conflicts.
- [ ] search app/game store conflicts.
- [ ] assess trademark risk before spending on branding.
- [ ] do not copy competitor screenshots, UI, models or marketing text.

### Legal Reality

Templates and self-research can keep early development at $0.

Professional legal advice cannot honestly be guaranteed at $0 and becomes a **COST GATE** if/when risk or revenue justifies it.

---

## STEP 18 — Zero-Cost Alpha Distribution

**Status:** ⬜ TODO  
**Depends on:** Steps 7–12 minimum

### Target

Release a playable alpha without paying a platform listing fee.

### Preferred Routes

- browser URL
- PWA
- itch.io page
- GitHub development repository if remaining public

### Alpha Checklist

- [ ] tutorial.
- [ ] complete local match.
- [ ] private multiplayer if ready.
- [ ] feedback form.
- [ ] version displayed.
- [ ] changelog.
- [ ] known issues.
- [ ] privacy notice if telemetry/accounts exist.
- [ ] no paid dependency required to play.
- [ ] no copyrighted placeholder assets.
- [ ] crash-free first session target.
- [ ] replayable/rematch loop.

### Acceptance Criteria

A new tester can discover, launch, understand and complete a match from a public link.

### Cost

**$0 target**

---

## STEP 19 — Closed Alpha → Public Beta → Product-Market Fit

**Status:** ⬜ TODO  
**Depends on:** Step 18

### Phase A — Small Closed Alpha

Target:

- friends / invited testers
- 20+ testers
- 100+ complete matches

Measure:

- tutorial confusion
- collision feel
- average match length
- rematch behavior
- favorite pieces
- rage points
- technical failures

### Phase B — Wider Alpha

Target:

- 50–100+ testers
- enough matches to identify balance outliers

### Phase C — Public Beta

Do not declare market readiness based on downloads alone.

Track:

- match completion %
- rematch %
- return rate
- average sessions
- disconnect rate
- crash/error rate
- White/Black balance
- piece usage
- longest common match length
- tutorial completion

### Go / No-Go Question

> Do people voluntarily play a second match?

If not, do not build a giant store, battle pass or clan system.

### Cost

**$0 target until service quotas require scaling**

---

## STEP 20 — Strict $0 Public Launch

**Status:** ⬜ TODO / ⛔ CONDITIONAL  
**Depends on:** Step 19

### What a True $0 Launch Can Mean

A realistic zero-upfront-cost launch can use:

- web/PWA distribution
- itch.io
- free subdomains
- free/open-source tools
- free hosting tiers while within limits

### What It Cannot Promise

Strict $0 cannot honestly guarantee forever:

- unlimited multiplayer concurrency
- unlimited database storage
- unlimited bandwidth
- 24/7 production SLA
- professional legal counsel
- paid storefront publishing
- custom domain ownership
- paid customer support tooling
- commercial ad campaigns

### Rule

When a free tier becomes insufficient:

1. Do not silently enable billing.
2. Measure actual usage.
3. Decide whether revenue/traction justifies the cost.
4. Prefer paying only for the bottleneck.
5. Keep the game playable locally where possible.

---

## STEP 21 — Paid Platform Gates, Only After Validation

**Status:** ⛔ COST GATE  
**Depends on:** Strong beta evidence

### Steam

Not part of the strict $0 plan because Steam Direct requires an upfront product fee.

### Apple App Store

Not part of the strict $0 plan because standard Apple Developer Program distribution has a membership fee.

### Google Play

Not part of the strict $0 plan because publishing requires a developer registration/payment process.

### Recommendation

Do not pay these costs until ArChess demonstrates:

- stable retention
- reliable multiplayer
- clear audience
- enough polish for store screenshots/trailer
- a launch plan

---

## STEP 22 — Market-Ready v1

**Status:** ⬜ TODO

ArChess v1 should not mean "we added everything imaginable."

### Minimum Market-Ready v1

- [ ] polished physical 3D board and pieces.
- [ ] Wood/Dark/Light themes.
- [ ] board/camera sizing.
- [ ] satisfying audio/impact feedback.
- [ ] stable deterministic-enough physics.
- [ ] intentional chain reactions.
- [ ] balanced piece roles.
- [ ] tutorial.
- [ ] accessibility settings.
- [ ] local play.
- [ ] practice/challenges.
- [ ] replay foundation.
- [ ] private online matches.
- [ ] reconnect.
- [ ] production-safe backend.
- [ ] server-authoritative competitive outcomes.
- [ ] accounts only where useful.
- [ ] match history.
- [ ] public matchmaking.
- [ ] ranked if infrastructure is ready.
- [ ] telemetry.
- [ ] privacy/license documentation.
- [ ] automated tests.
- [ ] performance target met.
- [ ] no pay-to-win.

---

# 12. Features Explicitly Deferred

Do **not** build these before core retention is proven:

- AI opponent
- battle pass
- clans/guilds
- tournaments
- spectator servers
- voice chat
- global chat
- loot boxes
- NFT/blockchain features
- complex economy
- dozens of currencies
- elaborate story campaign
- user-generated 3D models
- advanced board editor
- marketplace
- esports tooling
- native mobile app
- Steam-specific integration

They may be revisited later.

---

# 13. Recommended Immediate Execution Order

Current recommended sequence:

```text
STEP 0
Product definition freeze
        ↓
STEP 1
Repository baseline
        ↓
STEP 2
Physics stabilization
        ↓
STEP 3
True Three.js 3D pieces
        ↓
STEP 4
Board/themes/resize
        ↓
STEP 5
Audio/game feel
        ↓
STEP 6
Balance/piece roles/combos
        ↓
STEP 7
Tutorial/accessibility
        ↓
STEP 8
Local modes/replays
        ↓
STEP 9
Automated QA/performance
        ↓
STEP 10
Backend hardening
        ↓
STEP 12
Private multiplayer
        ↓
STEP 13
Server authority
        ↓
STEP 11
Accounts/persistence as needed
        ↓
STEP 14
Matchmaking/ranked
        ↓
STEP 16
Telemetry/balance
        ↓
STEP 17
Security/legal/privacy
        ↓
STEP 18
Zero-cost alpha
        ↓
STEP 19
Product-market validation
        ↓
STEP 20
Zero-cost public web launch
        ↓
STEP 21
Paid platforms only if justified
```

Note: Step numbers represent product areas, not an absolute prohibition on parallel work.

---

# 14. Current Project Snapshot

Based on the current development conversation:

## Confirmed / Existing

- GitHub repository.
- Python + Flask backend.
- HTML/CSS/Vanilla JS client.
- Canvas-based game prototype.
- 8×8 board.
- 32-piece starting position.
- select → drag → launch loop.
- friction.
- wall bouncing.
- collisions.
- HP/damage.
- friendly fire.
- King HP victory.
- local alternating turns.
- New Game/reset.
- visual effects baseline.
- professional README.
- Python regression tests (pytest, 18 tests).
- JS physics regression tests (Node, 13 tests: tunneling, simultaneous collision, wall-corner, overlap recovery, King-destroyed-during-chain, cooldown, settling termination).
- true 3D board + chess-piece presentation (Three.js).
- Wood/Dark/Light visual themes.
- Board-size selector with resize safety.
- Fullscreen board view.
- Procedural Web Audio sound (click, select, pull, launch, impact, wall, King hit, destruction, victory/defeat, ambient room tone).
- Accessibility settings (volumes, mute, reduced motion, screen shake, haptics).
- King danger feedback (HUD + on-board pulsing ring).

## Partial / Pending Verification

- projectile-piece visual tilt/tumble polish.
- finalized physics balance.
- collision-contact cooldown hardening.

## Major Missing Product Systems

- tutorial.
- automated browser tests checked into the repo.
- production backend.
- online multiplayer.
- accounts.
- authoritative simulation.
- matchmaking.
- ranked.
- telemetry.
- moderation/security hardening.
- public beta infrastructure.

---

# 15. Definition of Done Rules

A feature is not DONE merely because it appears once on one browser.

Mark a feature ✅ DONE only when:

1. It is implemented.
2. It has no known normal-use console error.
3. It works after New Game/reset.
4. It works after resize where relevant.
5. It works with mouse.
6. It works with touch where relevant.
7. It does not break current physics.
8. It is documented where necessary.
9. It has a regression test when reasonably automatable.
10. It has been manually tested in at least Chromium plus one other browser for user-facing features.

---

# 16. Release Version Plan

Suggested semantic progression:

```text
v0.1.x — core physics prototype
v0.2.x — stable combat physics
v0.3.x — true 3D presentation
v0.4.x — polished local game
v0.5.x — tutorial + challenges + replay
v0.6.x — private multiplayer
v0.7.x — authoritative online matches
v0.8.x — accounts + matchmaking
v0.9.x — public beta / balance
v1.0.0 — market-ready release
```

Do not rush version 1.0 for cosmetic reasons.

---

# 17. Free-First Development Principle

The goal is not to prove that every future infrastructure bill can be avoided forever.

The useful goal is:

> **Reach product-market validation without spending money unnecessarily.**

ArChess should spend $0 while:

- proving the mechanic
- improving game feel
- producing original 3D assets
- testing players
- validating multiplayer
- measuring retention

If the game eventually reaches enough players that a genuinely reliable server costs money, that is a success condition, not a design failure.

The project should then fund only infrastructure justified by actual usage.

---

# 18. Next Concrete Work Package

## DONE: STEP 2 — Physics Stabilization

Record of completed work before feature work continues:

- [x] contact-pair collision state (deferred — current time-cooldown hitPairs model active) — deferred per STEP 3 priority
- [x] duplicate-damage prevention — v0.1.x (collisionCooldown)
- [x] impulse propagation — v0.1.x (conservation of momentum)
- [x] piece mass configuration — v0.1.x
- [x] impact threshold — v0.1.x (minDamageImpact)
- [x] damage clamp — v0.1.x (maxCollisionDamage)
- [x] physics debug overlay — v0.3.x (Shortcut: D, toggles FPS/collision metrics HUD)
- [x] collision regression tests — v0.3.x (18 tests added: config validation, piece stats, launch/clamp/damage thresholds, piece creation/serialization, turn switch)
- [x] settle-state regression tests — v0.3.x (13 Node tests in tests/physics.test.js: tunneling, simultaneous collision, wall-corner, overlap recovery, King-destroyed-during-chain, cooldown, settling termination, launch clamp, in-bounds recovery)

Then move directly to:

## STEP 3 — True Three.js 3D Presentation

- [x] Three.js integrated — v0.4.0 (vendored `static/vendor/three.module.min.js` + `three.core.min.js`, import map, module scripts)
- [x] 6 procedural piece models — v0.4.0 (lathe profiles + extruded knight head; no external assets)
- [x] Board, lights, materials, shadows — v0.4.0 (rosewood/ebony/ivory palettes, key/fill/rim lights, PCF shadows, contact blobs)
- [x] Velocity tilt + tumble, upright rest pose — v0.4.0
- [x] Destruction animation — v0.4.0 (0.5s scale-out tumble with shadow fade)
- [x] Low-quality graphics mode — v0.4.0 (`▦` button / `Q`, persisted)
- [x] Headless browser verification — v0.4.0 (launch, collisions, game over, theme, quality, reset; zero console errors)

## STEP 4 — Board, Camera, Resize and Theme System

- [x] Theme selector (Wood/Dark/Light, persisted) — v0.4.x
- [x] Board-size selector (80–120%, persisted, resize-safe) — v0.4.x
- [x] Responsive mobile board + high-DPI rendering — v0.4.x
- [x] Fullscreen board view — v0.4.x (`#fullscreenBtn`, `F` key, `fullscreenchange`)
- [x] Headless browser verification — v0.4.x (theme/size persistence, fullscreen, no piece reset on resize, zero console errors)

## STEP 5 — Game Feel: Audio, Effects and Haptics

- [x] Procedural Web Audio sounds (select, pull, launch, impact, wall, King hit, destruction, victory/defeat, ambient, UI click) — v0.4.x (zero-budget; `static/js/audio.js`)
- [x] Dynamic collision audio (volume/pitch scale with intensity) — v0.4.x
- [x] Visual effects (trails, dust, sparks, damage numbers, impact flash, fragments, screen shake) — v0.4.x
- [x] King danger feedback (HUD card + pulsing on-board ring) — v0.4.x
- [x] Accessibility settings (master/effects/ambience volume, mute, reduced motion, shake, haptics) — v0.4.x (`static/js/prefs.js`, persisted)
- [x] Headless browser verification — v0.4.x (modal open/close, pref persistence, AudioContext unlock, audio paths, reduced motion, danger state; zero console errors)

This order protects the game from becoming beautiful but mechanically unreliable.

## NEXT: STEP 6 — Combat Roles, Balance and Combo System

Upcoming work package (detailed in the STEP 6 section above): assign per-piece combat roles (glass cannon, heavy tank, control, support), tune the HP/Power baseline for fair matchups, and design the combo system. This is the next milestone to start.

---

# 19. Tracker Update Convention

Whenever a development task is completed:

1. Change its checkbox from `[ ]` to `[x]`.
2. Change milestone status when appropriate.
3. Add the implementation version.
4. Add important balance decisions to the changelog.
5. Never mark a system DONE solely because a patch file was generated.

Example:

```text
- [x] Collision cooldown implemented — v0.2.1
- [x] Tested rapid repeated wall impacts — v0.2.1
- [ ] Test simultaneous three-piece impact
```

This document should evolve with the actual repository rather than becoming an optimistic museum exhibit.
