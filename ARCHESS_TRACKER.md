# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Development branch:** `ui-rebuild-2d-v2`  
**Target branch:** `main`  
**Current product mode:** 2D only  
**3D:** deferred; no 3D runtime is loaded  
**GitHub Actions:** disabled; workflow file removed  

> This tracker is the source of truth for implementation and verification. A change is not considered release-ready until its required positive, negative, regression and function-level checks are verified. No merge/push to `main` is allowed while required checks remain pending.

## Current Gate

| Gate | Status | Evidence / acceptance |
|---|---|---|
| Core physics preservation | IMPLEMENTED / VERIFY | Existing physics engine retained; renderer/UI changes are adapters/presentation only |
| 2D board | IMPLEMENTED / VERIFY | `gchessboard` 1.4.0 board surface + ArChess 2D physics overlay |
| 2D piece presentation | IMPLEMENTED / VERIFY | Local Cburnett-derived SVG art exposed through existing asset module |
| Professional UI | IMPLEMENTED / VERIFY | Bootstrap 5.3.8 + Bootstrap Icons + focused ArChess arena presentation CSS |
| 3D runtime | DEFERRED | Three.js renderer/camera/presentation layers removed from active 2D branch |
| Gameplay positive tests | ADDED / PENDING RUN | Select → drag → release → physics settle → alternate turn |
| Gameplay negative tests | ADDED / PENDING RUN | Wrong-team selection, zero-distance release, invalid interaction paths |
| UI regression tests | ADDED / PENDING RUN | 2D-only DOM, responsive sizing, theme and runtime-layer checks |
| Python/API regression | EXISTING / PENDING RUN | Existing suite retained; no CI execution requested |
| JavaScript regression | PENDING RUN | Existing Node suite must be reviewed for removed 3D/legacy assumptions |
| Function/error logging | IMPLEMENTED | Browser observability + server structured logging retained |
| Automation tests | IMPLEMENTED / PENDING RUN | Test harness remains available; GitHub Actions intentionally disabled |
| Repository cleanup | IN PROGRESS | Legacy shell/3D/runtime shims being removed from the execution tree |
| Tracker | UPDATED | This file is updated during each implementation milestone |

## Product Roadmap

| Step | Area | Status |
|---:|---|---|
| 0 | Product rules & identity | PARTIAL |
| 1 | Engineering baseline | DONE |
| 2 | Core physics & damage | PRESERVE / VERIFY |
| 3 | 2D presentation | IN PROGRESS |
| 4 | Board, resize & themes | IN PROGRESS |
| 5 | Audio/effects/haptics | PRESERVE |
| 6 | Combat roles/balance/combos | PRESERVE |
| 7 | UX/tutorial/accessibility | IN PROGRESS |
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

## UI / Architecture Decisions

1. **Game state and physics remain authoritative.** The UI never decides collision, damage, turn resolution or win conditions.
2. **`gchessboard` is a presentation board only.** ArChess uses its responsive SVG board surface and keeps physics motion in the transparent ArChess canvas overlay.
3. **Bootstrap is the application chrome foundation.** Custom CSS is limited to ArChess composition, theme tokens, board framing and physics-specific presentation.
4. **2D is the only active render mode.** There is no 3D toggle, renderer, camera, router or 3D asset loader in the 2D branch.
5. **One boot path.** The page loads the explicit native module list and then `main.js`; legacy boot shims are not used.

## Positive Test Matrix

| Area | Required cases |
|---|---|
| Boot | Page loads, game state exists, 32 pieces initialized, phase=`aim`, player=`white` |
| Board | Chess board element appears, board is square, size fits viewport |
| Selection | White piece can be selected on White turn |
| Drag | Pointer drag sets `dragging=true` and increases `powerRatio` |
| Launch | Release with meaningful drag clears drag state and launches |
| Physics | Physics settles and returns phase to `aim` |
| Turns | White → Black → White works |
| Theme | Theme button cycles valid ArChess themes and Bootstrap mode follows |
| Responsive | Desktop and mobile board remain inside viewport |
| Logging | Observability object exists and records runtime events |
| New battle | New battle resets state without duplicate runtime instances |

## Negative Test Matrix

| Area | Required cases |
|---|---|
| Wrong team | Black piece selection during White turn is rejected |
| Empty release | Pointer down/up with no meaningful drag does not launch |
| Outside board | Pointer interactions outside board do not select a piece |
| Double release | Second release while not dragging is harmless |
| Physics lock | Input during physics does not create another launch |
| Invalid state | Missing/invalid piece state is logged and handled safely |
| Broken library | gchessboard load/init failure falls back to ArChess canvas board |
| Theme storage | Unavailable/corrupt localStorage does not break theme changes |
| Renderer | Frame rendering errors are logged without killing the app loop |
| API failure | Failed API/fetch calls surface structured browser logs |

## Function-Level Coverage

Critical functions that must be covered by unit, integration or browser checks:

- `GameBoard.resize`, coordinate conversion and bounds checks
- piece creation / cloning / placement
- pointer start / move / release
- game selection and turn validation
- physics launch / step / collision / damage / settle
- turn transition and game-over resolution
- renderer initialization / draw / effect rendering
- UI state update / battle log / armory
- settings persistence / theme changes / board sizing
- replay and challenge entry points
- browser error / rejection / fetch logging
- Flask request lifecycle / unexpected error handling

## Regression Suites

### Browser

- `tests/test_2d_arena_ui.py` — new 2D positive/negative/UI regression coverage
- `tests/test_local_gameplay_browser.py` — existing end-to-end two-turn gameplay regression, updated for 2D-only
- auth/browser suites — preserve existing authentication behaviour

### Python

Existing API, authoritative simulation, security and backend test suites remain part of the release gate.

### JavaScript

Existing Node tests remain part of the gate. Any test that asserts 3D or legacy shell behaviour must be removed or rewritten before release.

## Cleanup Targets

Removed from the active 2D architecture on this branch:

- legacy professional shell/runtime
- legacy release/bootstrap shims
- legacy render router
- legacy runtime stabilizer
- legacy board host
- duplicate local input controllers
- obsolete presentation fixes
- deferred 3D renderer/camera/presentation code
- obsolete professional/final UI browser tests
- superseded large `renderer.js`
- old WebAwesome-oriented styling replaced by Bootstrap/gchessboard presentation

## Dependencies / Licensing

- Bootstrap 5.3.8 — MIT
- Bootstrap Icons 1.13.1 — MIT
- gchessboard 1.4.0 — MIT
- gchessboard bundled Cburnett-derived chess art — CC BY-SA 3.0
- ArChess-specific code remains under its existing project terms

## Verification Record

**Current branch head:** latest commit on `ui-rebuild-2d-v2` after 2D UI reconstruction.  
**Last verified:** not yet fully verified in a real Flask browser session.  
**Why:** GitHub connector can inspect/modify repository contents but cannot drive the user's local Flask browser. Static/repository checks can be performed here; final browser regression must be executed locally before promoting to `main`.

### Promotion Rule

Do not move `ui-rebuild-2d-v2` to `main` until:

1. Python tests pass.
2. New 2D browser tests pass.
3. Existing gameplay regression passes.
4. JavaScript tests pass after legacy-test cleanup.
5. Positive and negative gameplay cases pass.
6. No forbidden 3D/legacy runtime is referenced by the template.
7. UI is verified at desktop and mobile sizes.
8. The tracker is updated with the exact verified commit.
9. No GitHub Actions workflow has been reintroduced.
