# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Branch:** `fix/gameplay-final`  
**Release candidate:** `v0.5.2`  
**Current focus:** gameplay stability + professional UI consolidation + final regression

> This tracker distinguishes **implemented**, **verified**, and **pending verification** work. Nothing is marked release-ready until the complete CI gate passes.

## Current Release Gate

| Gate | Status | Evidence / Acceptance |
|---|---|---|
| Python unit/API | VERIFIED | 101 passed in latest CI gate before UI/structure changes |
| Browser regression | PENDING | Must pass gameplay, auth, 2D/3D, UI and responsive matrix |
| JavaScript suite | PENDING | Runs only after browser gate succeeds |
| Positive gameplay cases | PENDING | Drag, launch, physics settle, White → Black → White |
| Negative gameplay cases | PENDING | Wrong team, invalid release, blocked unauthenticated play, invalid state |
| 2D renderer | IMPLEMENTED / PENDING VERIFY | Open-source Cburnett-derived SVG assets, local loading |
| 3D renderer | IMPLEMENTED / PENDING VERIFY | Three.js + Staunton assets, persistent scene |
| 2D ↔ 3D switch | IMPLEMENTED / PENDING VERIFY | Shared game state; synchronous mode change target <100 ms |
| Theme system | IMPLEMENTED / PENDING VERIFY | Single token bridge across shell, board and renderer |
| Board resize | IMPLEMENTED / PENDING VERIFY | Responsive viewport-aware square sizing |
| Focus/Theatre | IMPLEMENTED / PENDING VERIFY | Board-first presentation modes |
| Repository structure | IN PROGRESS | Redundant root shims removed; final root audit still required |
| Tracker | UPDATED | This file is the source of release/verification status |
| README | VERIFIED | Root README added with setup and structure |

## Repository Structure Contract

The root should contain only deliberate project-level files and entry/config/legal artifacts. Application logic belongs in named packages/directories.

```text
ArChess/
├─ game.py                 # Flask application entrypoint
├─ README.md               # Project overview and setup
├─ ARCHESS_TRACKER.md      # Product + engineering + QA tracker
├─ LICENSE
├─ THIRD_PARTY_NOTICES.md
├─ requirements.txt
├─ .env.example
├─ .gitignore
├─ .dockerignore
├─ .github/
├─ config/
├─ core/
├─ game/
├─ match_sessions/
├─ migrations/
├─ templates/
├─ static/
├─ tests/
├─ scripts/
├─ docs/
└─ deployment/
```

Redundant root shims such as `app.py` and `extensions.py` are intentionally removed; `game.py` is the single Flask entrypoint.

## Product Roadmap

| Step | Area | Status |
|---:|---|---|
| 0 | Product rules & identity | PARTIAL |
| 1 | Repository & engineering baseline | DONE |
| 2 | Core physics & damage | IMPLEMENTED / VERIFYING |
| 3 | 2D/3D presentation | IMPLEMENTED / VERIFYING |
| 4 | Board, camera, resize & themes | IMPLEMENTED / VERIFYING |
| 5 | Audio/effects/haptics | DONE |
| 6 | Combat roles/balance/combos | DONE |
| 7 | UX/tutorial/accessibility | IMPLEMENTED / VERIFYING |
| 8 | Local modes/challenges/replay | DONE |
| 9 | Automated QA/performance | IMPLEMENTED / VERIFYING |
| 10 | Production Flask backend | DONE |
| 11 | Accounts/profiles/persistence | PARTIAL |
| 12 | Private multiplayer | DONE |
| 13 | Authoritative simulation/anti-cheat | DONE |
| 14 | Matchmaking/ranked | DONE |
| 15 | Progression/cosmetics | DONE |
| 16 | Analytics/telemetry | IMPLEMENTED |
| 17 | Security/privacy/legal/licensing | PARTIAL |
| 18 | Zero-cost alpha distribution | PENDING |
| 19 | Closed alpha → beta → PMF | PENDING |
| 20 | Strict $0 public launch | PENDING |
| 21 | Paid platform/service gates | PENDING |
| 22 | Market-ready v1 | PENDING |
| 23 | UI consolidation & renderer architecture | ACTIVE |

## STEP 2 — Core Physics & Damage

- ✓ Collision cooldown and duplicate-damage protection
- ✓ Mass/impulse propagation
- ✓ Impact threshold and damage clamping
- ✓ Radius-aware board boundaries
- ✓ Friction and fixed physics substeps
- ✓ Piece collision resolution
- ✓ Destruction and King game-over
- ✓ Deterministic server simulation
- ☐ Browser proof that local physics always settles and alternates turns

## STEP 3 — 2D / 3D Chess Presentation

- ✓ Three.js bootstrap and persistent 3D scene
- ✓ Board geometry/material pipeline
- ✓ Lighting and shadows
- ✓ Piece placement
- ✓ Impact/destruction visuals
- ✓ Real 3D Staunton assets selected
- ✓ 2D local Cburnett-derived SVG assets integrated
- ✓ Shared logical/game state between renderers
- ☐ Browser verification of 2D appearance
- ☐ Browser verification of 3D appearance
- ☐ Mid-match renderer switch verification
- ☐ Verify switch does not reset turn, HP, piece position, velocity or selection

## STEP 4 — Board, Camera, Resize & Themes

- ✓ Responsive board sizing architecture
- ✓ High-DPI handling
- ✓ Camera/resize correction
- ✓ Board scaling control
- ✓ Focus mode
- ✓ Theatre mode
- ✓ Four visual skins: Obsidian, Emerald, Walnut, Frost
- ✓ Theme stored through one UI theme state
- ✓ Theme propagation hooks for renderer layer
- ☐ Visual audit at 1440×900
- ☐ Visual audit at 1366×768
- ☐ Visual audit at 1280×720
- ☐ Visual audit at 1024×768
- ☐ Visual audit at 768×1024
- ☐ Visual audit at 390×844
- ☐ Visual audit at 360×800

## STEP 7 — UX, Tutorial & Accessibility

- ✓ Pointer/drag interaction
- ✓ Touch path
- ✓ Keyboard labels/accessibility foundations
- ✓ Turn feedback
- ✓ Timer feedback
- ✓ Game-over messaging
- ✓ Contextual selected-piece information
- ✓ Minimal-information principle for the primary game workspace
- ☐ Final focus order / keyboard traversal audit
- ☐ Contrast audit across all themes
- ☐ Reduced-motion regression

## STEP 9 — QA, Automated Testing & Performance

### Python / API
- ✓ Python unit tests
- ✓ API/integration tests
- ✓ Auth positive/negative coverage
- ✓ Authoritative simulation tests

### Browser / Functional
- ✓ Chromium test infrastructure
- ✓ Firefox test infrastructure
- ✓ WebKit test infrastructure
- ✓ Authenticated arena gate
- ✓ Unauthenticated access blocking
- ☐ Drag → release → physics → settle → alternate turn
- ☐ White → Black → White two-turn flow
- ☐ Wrong-team selection blocked
- ☐ Invalid/near-zero release handled
- ☐ Collision and destruction regression
- ☐ 2D/3D toggle regression
- ☐ Theme regression
- ☐ Resize/focus/theatre regression

### JavaScript
- ✓ Node test runner configured
- ☐ Full JavaScript suite green on final candidate

### Performance
- ✓ Persistent renderer architecture
- ✓ Local 2D assets avoid runtime CDN dependency for chess pieces
- ✓ Only active presentation path should render each frame
- ☐ Measure 2D → 3D → 2D switch <100 ms
- ☐ Verify stable interaction at target FPS on browser matrix

## STEP 17 — Security / Privacy / Licensing

- ✓ Production secret requirement
- ✓ Request-size protection
- ✓ Rate limiting
- ✓ Security headers
- ✓ Server-authoritative state
- ✓ Client-authority write rejection
- ✓ Third-party notice document
- ☐ Final authentication/session security review
- ☐ Final retention policy sign-off
- ☐ Final asset/license audit for every bundled visual asset

## STEP 23 — UI Consolidation & Renderer Architecture (ACTIVE)

### A. Single-shell principle
- ✓ One professional shell is the intended presentation layer
- ✓ Legacy `final_ui`, `professional_ui`, `presentation_fix`, `render_router`, local input and projectile shims removed from page bootstrap
- ✓ Actual board hosted inside the professional workspace
- ☐ Browser proof that no legacy presentation script is loaded

### B. Abstraction principle
The UI should expose only the information needed for the current decision.

**Default information hierarchy:**
1. Board
2. Current player / turn
3. Selected piece / launch power when relevant
4. Essential HP/context
5. Secondary controls only when requested

- ☐ Confirm no redundant cards/duplicate status regions remain
- ☐ Confirm contextual panel changes with selection state
- ☐ Confirm mobile hides secondary information before shrinking the board excessively

### C. Renderer contract

```text
Shared GameState
    ├─ 2D Renderer
    └─ 3D Renderer
```

Both renderers must consume the same state and never own authoritative gameplay state.

### D. Theme contract

```text
ArChess Theme
 ├─ App background/surfaces
 ├─ Board light/dark squares
 ├─ Piece materials/assets
 ├─ Accent/selection/danger/success
 ├─ Controls
 └─ Renderer lighting/effects
```

No component may introduce a private competing theme palette.

### E. Release acceptance

The branch is **NOT release-ready** until:

- Python suite is green.
- Browser suite is green.
- JavaScript suite is green.
- Positive and negative gameplay cases pass.
- White/Black turns alternate deterministically.
- Drag/trajectory/release works.
- Physics always settles.
- 2D and 3D both render real pieces correctly.
- 2D ↔ 3D preserves game state and is perceptually instant.
- Themes are consistent across the full UI and board.
- Board fills the available viewport appropriately without large dead areas.
- Focus/Theatre/mobile layouts are verified.
- Root repository structure matches the structure contract.
- This tracker matches the actual implementation state.

## CI / Branch Policy

- `main` must remain untouched during verification work.
- `fix/gameplay-final` is the sole verification branch.
- Do not merge PR #14 until the complete release gate is green.
- Do not mark a feature `DONE` solely because code exists; it must have corresponding automated or explicit verification evidence.
