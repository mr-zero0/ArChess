# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Active branch:** `main`  
**Target branch:** `main`  
**Branch policy:** single-branch repository; development branches are not retained  
**Current product mode:** 2D only  
**3D:** DEFERRED — no 3D renderer, camera, WebGL runtime or 2D/3D switch is active  
**GitHub Actions:** DISABLED — no workflow is present under `.github/workflows`  
**Promotion posture:** `main` is the current working baseline; this snapshot is **not release-ready** until the open browser/gameplay gates below are green.

> This tracker is the source of truth. It merges the original product tracker requirements with the current 2D migration so useful product, engineering, QA, security, accessibility and licensing requirements are not lost during cleanup.

## Current Gate

| Gate | Status | Evidence / acceptance |
|---|---|---|
| Core physics preservation | PARTIALLY VERIFIED | Existing physics/combat model remains authoritative; live browser verification of collision → next-turn behavior remains required |
| Root cause of black board | FIXED | Physics canvas is transparent and no longer hides the board surface |
| 2D board presentation | IMPLEMENTED | `gchessboard` 1.4.0 board surface with ArChess physics layer |
| 2D piece presentation | IMPLEMENTED | Cburnett-derived SVG piece assets rendered by the active 2D renderer |
| Professional application chrome | IMPLEMENTED | Bootstrap 5.3.8 + Bootstrap Icons 1.13.1 |
| Themes | IMPLEMENTED / VERIFY | Wood / Dark / Light; shared theme state across chrome, board and renderer |
| Board sizing / resize | IMPLEMENTED / VERIFY | Responsive square board, scaling controls and resize handling |
| High-DPI rendering | IMPLEMENTED / VERIFY | Canvas sizing path preserves device-pixel-ratio handling; visual audit remains open |
| Focus mode | PRESERVED / VERIFY | Original product requirement retained; final responsive/visual audit remains open |
| Theatre mode | PRESERVED / VERIFY | Original product requirement retained; final responsive/visual audit remains open |
| 3D runtime | DEFERRED | 3D assets/runtime/tests removed from active product path for this milestone |
| Legacy shell/runtime cleanup | IMPLEMENTED | Obsolete overlapping shell, router, stabilizer and renderer layers removed |
| Duplicate input/runtime cleanup | IMPLEMENTED | Superseded local input/turn/presentation shims removed |
| Function tracing shutdown regression | FIXED | Tracer is finalization-safe, application-scoped and non-fatal |
| Browser navigation harness | IMPLEMENTED / VERIFY | Deterministic browser readiness and diagnostics added |
| Local account gate | CHANGED BY DESIGN | Local 2D gameplay is playable without sign-in; account-dependent/competitive features remain preserved separately |
| First-collision settlement | FIXED IN PHYSICS / VERIFY | Collision recovery separates bodies with an epsilon and does not keep stationary cleanup in the active-collision settle gate |
| Collision → settle → next turn | **FIXED IN PHYSICS / VERIFY** | Sticky collision state is removed; live browser test must confirm White → collision → settle → Black |
| Python/API regression | PASSING BASELINE | 99 passed, 17 skipped, 61 warnings in latest confirmed local baseline |
| JavaScript regression | PASSING BASELINE | 18/18 Node tests passed in latest confirmed local baseline |
| Collision settlement regression | ADDED | Focused Node regression covers first collision settlement and stationary overlap recovery |
| Browser arena suite | PENDING | Live browser gameplay verification remains required |
| Multi-browser responsive matrix | PENDING | Chromium / Firefox / WebKit across desktop/tablet/mobile remains open |
| Positive gameplay tests | PENDING LIVE VERIFICATION | Drag → launch → collision → settle → Black → White remains open for browser execution |
| Negative gameplay tests | PENDING LIVE VERIFICATION | Wrong-team, zero-release, invalid-state and physics-lock checks remain open in live browser |
| Function-level test coverage | IMPLEMENTED / VERIFY | Critical controllers, tracer and browser diagnostics instrumented; complete execution still required |
| Server observability | IMPLEMENTED | Structured logs, request/error handling and safe tracer behavior |
| Security/privacy | PRESERVED / VERIFY | Existing rate limits, security headers, authoritative state, client-write rejection and session review remain in scope |
| Licensing / attribution | IMPLEMENTED / VERIFY | Bootstrap, Bootstrap Icons, gchessboard and Cburnett notices documented |
| Repository cleanup | IMPLEMENTED | Superseded 3D/professional/runtime/test assets removed from active branch; repository now uses one branch |
| Tracker | ACTIVE | Updated at every implementation milestone and before subsequent gameplay changes |

## Product Roadmap

| Step | Area | Status |
|---:|---|---|
| 0 | Product rules & identity | PARTIAL |
| 1 | Repository & engineering baseline | DONE |
| 2 | Core physics & damage | PRESERVE / VERIFY |
| 3 | 2D presentation | IMPLEMENTED / VERIFY |
| 4 | Board, resize & themes | IMPLEMENTED / VERIFY |
| 5 | Audio/effects/haptics | PRESERVE |
| 6 | Combat roles/balance/combos | PRESERVE |
| 7 | UX/tutorial/accessibility | IMPLEMENTED / VERIFY |
| 8 | Local modes/challenges/replay | PRESERVE |
| 9 | QA / regression / performance | IN PROGRESS |
| 10 | Flask backend | PRESERVE |
| 11 | Accounts/profiles/persistence | PRESERVE |
| 12 | Private multiplayer | PRESERVE |
| 13 | Authoritative simulation/anti-cheat | PRESERVE |
| 14 | Ranked/matchmaking | PRESERVE |
| 15 | Progression/cosmetics | PRESERVE |
| 16 | Analytics/telemetry | PRESERVE |
| 17 | Security/privacy/licensing | IN PROGRESS |
| 18 | 3D presentation | DEFERRED |

## Architecture Decisions

1. **Game state and physics remain authoritative.** UI code must not decide collision, damage, win state or competitive outcomes.
2. **`gchessboard` is presentation-only.** Its board is the visual surface under the transparent physics layer because ArChess pieces move continuously.
3. **Bootstrap is the application chrome foundation.** Custom CSS is limited to ArChess-specific composition and theme requirements.
4. **2D is the only active renderer.** No 3D renderer, camera, WebGL layer or 2D/3D switch is active in this milestone.
5. **One browser boot path.** The active template loads the current 2D modules and `main.js`; removed legacy loaders are not part of runtime.
6. **Pinned open-source libraries.** Bootstrap 5.3.8, Bootstrap Icons 1.13.1 and gchessboard 1.4.0 are version-pinned in the active page.
7. **Observability is non-fatal.** Logging failures must never break requests, gameplay or shutdown.
8. **Local 2D matches are directly playable.** Authentication remains available for account/competitive flows but does not block the basic local arena.
9. **Collision settlement has one owner.** `main.js -> settle()` owns turn settlement; the local compatibility physics file must not wrap `Physics.step()`.
10. **Collision recovery separates bodies beyond the contact threshold.** Positional correction includes a small configured/fallback epsilon so floating-point contact does not keep the settle gate active.
11. **The original UX requirements are retained.** Resize, high-DPI behavior, Focus/Theatre, accessibility, themes, replay, challenges, security and licensing remain tracked even when verification is pending.
12. **Single-branch repository.** `main` is the active working branch; stale development branches are removed rather than carried forward.

## Logging Regression

The function tracer previously entered Python shutdown internals and attempted to emit records after its output stream had closed. That produced cascaded `ValueError: I/O operation on closed file` and handler cleanup failures.

The tracer now avoids interpreter-finalization paths, scopes tracing to ArChess application modules, avoids self-tracing, handles closed streams and treats logging destination errors as non-fatal.

## Browser Harness Regression

The browser suite first failed because Flask was not running, then because navigation waited too long on page lifecycle/resource completion. The harness was changed to deterministic application readiness with bounded timeouts, diagnostics and optional headed execution.

The harness is infrastructure only; it does not substitute for live gameplay verification.

## Collision Settlement Regression

The first live collision could leave the game in the physics phase indefinitely. The root cause was the interaction between exact positional separation and the `activeCollisions`-based settle gate: tiny floating-point overlap could make the same pair remain an active collision even after useful motion had stopped.

The physics layer now:

- records whether either body was actively moving before collision recovery;
- separates overlapping bodies slightly beyond the physical contact distance;
- treats stationary positional recovery as passive rather than as an active collision; and
- preserves the existing restitution, impact, damage and destruction calculations.

A focused Node regression covers first-collision settlement and stationary-overlap recovery.

## Positive Test Matrix

| Area | Required cases |
|---|---|
| Boot | HTTP 200, one game state, 32 pieces, `phase=aim`, White starts |
| Board | Board component present, square geometry, usable across required viewports |
| Pieces | All 32 living pieces render in initial arrangement |
| Selection | Correct-team living piece selects |
| Drag | Dragging state activates and launch power increases |
| Launch | Meaningful release enters physics |
| Collision | Impact separates/rebounds bodies and applies damage |
| Physics | Simulation settles without freezing |
| Turns | White → Black → White works in live browser |
| Effects | Launch / impact / damage / destruction effects render without exceptions |
| Theme | Theme changes do not reset state |
| Resize | Board remains square and usable after viewport changes |
| New battle | Reset returns to 32 pieces and White turn |
| Replay | Existing replay controls remain functional |
| Challenges | Existing challenge entry/result paths remain functional |
| Logging | Browser/server observability emits structured events without fatal errors |

## Negative Test Matrix

| Area | Required cases |
|---|---|
| Wrong team | Opponent piece cannot launch during current player's turn |
| Empty click | Empty-square input leaves selection clear |
| Empty release | Near-zero drag does not launch |
| Outside board | Out-of-bounds input cannot create a launch |
| Double release | Release without active drag is harmless |
| Physics lock | Second shot cannot begin while physics is resolving |
| Dead piece | Destroyed piece cannot be selected/launched |
| Library failure | Board-library failure falls back without breaking game rules |
| Storage failure | Theme/settings storage failure does not crash runtime |
| Renderer failure | A frame/render exception is logged without permanently killing the loop |
| API failure | Failed API requests produce handled errors/unhandled-rejection-free behavior |
| Shutdown | Ctrl+C/interpreter shutdown produces no logging traceback |

## Accessibility / UX Checklist

Retained from the original product tracker and to be verified before release readiness:

- Focus order / keyboard traversal audit
- Contrast audit across all themes
- Reduced-motion regression
- Pointer and touch path
- Clear turn/selection/launch feedback
- Game-over messaging
- Contextual selected-piece information
- Minimal-information principle for the primary workspace

## Security / Privacy / Legal Checklist

Retained from the original baseline:

- Production secret requirement
- Request-size protection
- Rate limiting
- Security headers
- Server-authoritative state
- Client-authority write rejection
- Authentication/session security review
- Retention policy review
- Asset/license audit

## Performance Checklist

- Persistent 2D renderer architecture
- Active presentation path only
- No active 3D runtime
- Browser interaction remains responsive at target FPS
- Final viewport/performance audit remains pending

## Cleanup Completed

Removed from the active 2D runtime:

- professional shell/runtime
- release boot chain
- render router
- runtime stabilizer
- board-host shim
- duplicate local input controllers
- duplicate presentation/turn guard shims
- 3D renderer/camera/runtime assets
- Three.js vendor bundles
- superseded large renderer
- obsolete professional/final UI stylesheets and test suites
- obsolete WebGL verification docs/markers
- unused projectile visual shim
- stale development branches from the remote repository

## Documentation / Licensing

Active documentation describes the **2D-only current state**. Historical 3D documents removed from the active branch are not considered current product requirements.

Open-source attributions remain documented in `THIRD_PARTY_NOTICES.md` and `docs/ASSET_LICENSES.md`.

## Verification Record

**Repository baseline:** original `main` commit `46165ca7f6f88386077aede8583b735597c3bc33` was reconciled into the current single-branch working baseline.

**Latest confirmed automated baseline before this gameplay fix:** 99 Python tests passed, 17 skipped, 61 warnings; 18 JavaScript tests passed.

**Current collision fix:** `static/js/physics.js` uses epsilon-separated recovery and excludes stationary overlap cleanup from the active-collision settle gate. `game/constants.py` centralizes the separation tolerance. `tests/collision_settlement.test.js` adds direct regression coverage.

**Live browser result before this fix:** page renders and local drag/launch works; the first collision could still stall the physics/turn transition. Fresh local browser verification is required after this fix.

**GitHub Actions:** `.github/workflows` remains absent; no Actions workflow is being introduced.

**Repository branch state:** `main` is the only branch.

**Current working baseline:** `main` contains the collision-settlement fix, focused regression coverage, and the reconciled tracker.

**Promotion posture:** this is a working baseline, not a release candidate. The next verification step is targeted live browser gameplay, followed by the full responsive and regression matrices.

## Working-Baseline Rule

`main` is the only retained branch. Changes may be committed directly to `main` for this project, but unresolved verification gates must remain visible in this tracker.

After each gameplay change:

1. Update this tracker with the exact defect, fix and verification state.
2. Preserve positive, negative, function, responsive and regression coverage.
3. Do not reintroduce GitHub Actions unless explicitly requested.
4. Keep 3D deferred until the 2D product is stable.
5. Do not mark live browser gameplay green until it has actually been exercised.
