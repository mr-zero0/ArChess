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

## Collision Settlement Regression

The first live collision could leave the game in the physics phase indefinitely. The corrective change in `static/js/physics.js` now separates overlapping bodies slightly beyond contact and excludes stationary positional cleanup from the active-collision settle gate. The separation tolerance is centralized as `collisionSeparationEpsilon` in `game/constants.py` and the focused regression is in `tests/collision_settlement.test.js`.

The code change is committed to `main`. **Live browser verification is intentionally still pending** because the previous user-visible symptom must be exercised locally after this exact build is pulled.

## Working-Baseline Rule

`main` is the only retained branch. Changes may be committed directly to `main` for this project, but unresolved verification gates must remain visible in this tracker.

After each gameplay change:

1. Update this tracker with the exact defect, fix and verification state.
2. Preserve positive, negative, function, responsive and regression coverage.
3. Do not reintroduce GitHub Actions unless explicitly requested.
4. Keep 3D deferred until the 2D product is stable.
5. Do not mark live browser gameplay green until it has actually been exercised.
