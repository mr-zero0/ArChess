# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Active branch:** `main`  
**Branch policy:** single-branch repository; development branches are not retained  
**Current product mode:** 2D only  
**3D:** DEFERRED — no 3D renderer, camera, WebGL runtime or 2D/3D switch is active  
**GitHub Actions:** DISABLED — no workflow is present under `.github/workflows`

## Current Gate

| Gate | Status |
|---|---|
| 2D board / professional UI | IMPLEMENTED / VERIFY |
| 2D pieces / open-source assets | IMPLEMENTED / VERIFY |
| Themes / resize / high-DPI | IMPLEMENTED / VERIFY |
| Logging / observability | IMPLEMENTED |
| Local no-login gameplay | IMPLEMENTED |
| First-collision physics correction | FIXED IN CODE / VERIFY |
| Collision → settle → next turn | FIXED IN CODE / VERIFY |
| Python/API regression | 99 passed, 17 skipped, 61 warnings |
| JavaScript regression | 18 passed |
| Focused collision regression | ADDED |
| Live browser gameplay | PENDING |
| Responsive multi-browser matrix | PENDING |
| Accessibility / security / performance final audits | PENDING |
| 3D | DEFERRED |

## Collision Settlement Regression

The first live collision could leave the game in the physics phase indefinitely. The correction in `static/js/physics.js` separates overlapping bodies slightly beyond contact and excludes stationary positional cleanup from the active-collision settle gate. The tolerance is centralized as `collisionSeparationEpsilon` in `game/constants.py`.

A focused regression was added at `tests/collision_settlement.test.js` covering first-collision settlement and stationary-overlap recovery.

**Important:** live browser verification is still required after this build. The code fix is not being represented as a fully verified browser fix until the user's local game is exercised.

## Preserved Requirements

The tracker retains the original product requirements for physics, damage, turn-based local play, responsive layout, themes, high-DPI rendering, Focus/Theatre, accessibility, security/privacy, licensing, replay, challenges, positive/negative tests, performance, and future 3D deferral.

## Repository State

`main` is the only retained branch. GitHub Actions remain intentionally absent. The current repository is a working 2D baseline, not a release candidate.
