# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Active branch:** `fix/observability-complete`  
**Branch policy:** fixes are developed and verified on dedicated branches; only verified work is merged to `main`  
**Current product mode:** 2D only  
**3D:** DEFERRED — no 3D renderer, camera, WebGL runtime or 2D/3D switch is active  
**GitHub Actions:** DISABLED — no workflow is present under `.github/workflows`

## Current Gate

| Gate | Status |
|---|---|
| 2D board / professional UI | IMPLEMENTED / VERIFY |
| 2D pieces / open-source assets | IMPLEMENTED / VERIFY |
| Themes / resize / high-DPI | IMPLEMENTED / VERIFY |
| Logging / observability foundation | VERIFIED ON BRANCH — 11 observability tests passed |
| Complete executable-codebase observability coverage | IN PROGRESS |
| Local no-login gameplay | IMPLEMENTED |
| First-collision settlement | FIXED IN CODE / VERIFY |
| Collision → settle → next turn | FIXED IN CODE / VERIFY |
| Python/API regression | 99 passed, 17 skipped, 61 warnings (last recorded baseline) |
| JavaScript regression | 18 passed (last recorded baseline) |
| Settlement regression contract | ADDED |
| Live browser gameplay | PENDING |
| Responsive multi-browser matrix | PENDING |
| Accessibility / security / performance final audits | PENDING |
| 3D | DEFERRED |

## Observability Workstream

### Verified foundation

The observability foundation on `fix/observability-complete` has been verified locally with:

`python -m pytest -q tests/test_observability.py` → **11 passed**.

Verified behaviors include:

- Run-scoped log directory contract: `Logs/YYYY/MMM/DD_Logs/RunXX/`.
- Separate `application.log`, `error.log`, `audit.log`, and `browser.log` files.
- Structured JSON records with run/request/correlation context.
- Exact source metadata for logged events: module, file, function, and line.
- Exception type and stacktrace capture.
- Sensitive-key redaction.
- Browser/server correlation through request and correlation identifiers.
- Browser observer syntax and boot-order contract.
- Browser runtime module inventory coverage contract.
- Python application tracing surface coverage with logging internals excluded from recursive tracing.

### Required next coverage pass

The foundation is not yet considered complete. The remaining observability workstream must continue across the full executable surface, with domain-specific events added where generic function tracing is insufficient. Priority areas are:

1. Python application/domain modules: startup, auth, routes, database operations, rooms, matchmaking, ranked flows, telemetry, replay, progression, and any remaining executable package modules.
2. Browser modules: input, board, physics, pieces, renderer, UI, theme, preferences, audio, mode, history, challenges, replay, tutorial, identity/auth, progression/ranked UI, tuning, and any runtime module discovered during inventory.
3. Root-cause event chains for gameplay state transitions, especially `select → drag → launch → physics → collision → damage → settle → next turn`.
4. Negative/error paths for invalid input, rejected actions, missing state, API failures, storage failures, and unexpected exceptions.
5. Log-volume and performance review so observability is detailed but not noisy enough to impair gameplay.
6. Retention/cleanup validation for the `Logs/` hierarchy and generated runtime artifacts.

No item in this section is considered **DONE** until the corresponding tests pass and the generated run logs have been inspected.

## Collision Settlement Regression

The first live collision could leave the game in the physics phase indefinitely. The collision solver now separates overlapping bodies slightly beyond contact, while transient `activeCollisions` state is no longer allowed to block turn settlement. Settlement is based on the authoritative `moving` state of surviving pieces; once every surviving piece has stopped for the configured settle delay, the normal next-turn transition runs.

The contract regression in `tests/test_2d_runtime_contract.py` locks this ownership rule so a future change cannot reintroduce `activeCollisions` as a persistent settlement gate.

**Important:** the code fix is on `main`, but live browser verification is still required. The browser gate remains pending until the user's local game demonstrates first collision → full resolution → next player can launch.

## Preserved Requirements

The tracker retains the original product requirements for physics, damage, turn-based local play, responsive layout, themes, high-DPI rendering, Focus/Theatre, accessibility, security/privacy, licensing, replay, challenges, positive/negative tests, performance, and future 3D deferral.

## Verification Policy

For every meaningful implementation change on a development branch:

`change → update/add tests → run targeted verification → inspect failures/logs → run relevant regression → update tracker → commit`.

The tracker must describe verified reality, not merely intended code. `main` is only updated after the branch work is verified.

## Repository State

`main` remains the stable baseline and must not be modified during this workstream. `fix/observability-complete` is the active observability branch. GitHub Actions remain intentionally absent. Generated `Logs/` runtime output is ignored by Git and is never committed as application data.
