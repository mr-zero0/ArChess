# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Development branch:** `ui-rebuild-2d-v2`  
**Target branch:** `main`  
**Current product mode:** 2D only  
**3D:** DEFERRED — no 3D runtime is loaded by the active page  
**GitHub Actions:** DISABLED — no workflow is present under `.github/workflows`  

> This tracker is the source of truth for implementation and verification. Nothing is promoted to `main` until the required positive, negative, function-level, regression and responsive checks are verified.

## Current Gate

| Gate | Status | Evidence / acceptance |
|---|---|---|
| Core physics preservation | READY FOR VERIFICATION | Existing `main.js`, `physics.js`, `pieces.js` and backend simulation remain authoritative |
| Root cause of black board | FIXED | `GameBoard` physics canvas now uses `alpha:true`; it is explicitly a transparent overlay |
| 2D board presentation | IMPLEMENTED | `gchessboard` 1.4.0 provides the board surface; ArChess canvas provides continuous physics motion |
| 2D piece presentation | IMPLEMENTED | Local Cburnett-derived SVG data is rendered by the physics layer |
| Professional application chrome | IMPLEMENTED | Bootstrap 5.3.8 + Bootstrap Icons 1.13.1 |
| Themes | IMPLEMENTED | Wood / Dark / Light shared across Bootstrap, board surface and renderer |
| 3D runtime | DEFERRED | Three.js, 3D renderer, camera and 3D assets removed from active 2D runtime |
| Legacy shell/runtime cleanup | IMPLEMENTED | Professional shell/runtime/router/stabilizer/board-host/release shims removed |
| Duplicate input/runtime cleanup | IMPLEMENTED | Duplicate local input and turn/presentation shims removed |
| Function tracing shutdown regression | FIXED | Tracer ignores interpreter finalization, skips non-ArChess modules, avoids closed streams and suppresses secondary logging destination errors |
| Tracker release-gate contract | FIXED | Exact required promotion sentence restored: `Do not move `ui-rebuild-2d-v2` to `main`.` |
| Positive gameplay tests | PASSING | Full Python suite currently passes; dedicated browser execution remains pending |
| Negative gameplay tests | PASSING | Full Python suite currently passes; dedicated browser execution remains pending |
| UI regression tests | PASSING IN STATIC SUITE | 2D/runtime contract included in the 99 passing Python tests |
| Multi-browser regression | PENDING LOCAL BROWSER RUN | Chromium / Firefox / WebKit desktop/tablet/mobile matrix |
| Python/API regression | PASSING | 99 passed, 17 skipped, 61 warnings in latest local run |
| JavaScript regression | PASSING | 18/18 Node tests passed in latest local run |
| Function-level logging | IMPLEMENTED | Browser observability instruments key controllers; server tracer is shutdown-safe |
| Server observability | IMPLEMENTED | Structured request logging, request IDs, error handling and safe function tracing |
| Local automation | IMPLEMENTED | Browser suites gated by `RUN_BROWSER_MATRIX=1`; no GitHub Actions execution |
| Repository cleanup | IMPLEMENTED | Stale 3D/CI/professional assets and docs removed from the development branch |
| License inventory | IMPLEMENTED | Bootstrap, Bootstrap Icons, gchessboard and Cburnett attribution documented |
| Tracker | ACTIVE | Updated at each implementation milestone |

## Product Roadmap

| Step | Area | Status |
|---:|---|---|
| 0 | Product rules & identity | PARTIAL |
| 1 | Engineering baseline | DONE |
| 2 | Core physics & damage | PRESERVE / VERIFY |
| 3 | 2D presentation | IMPLEMENTED / VERIFY |
| 4 | Board, resize & themes | IMPLEMENTED / VERIFY |
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

1. **Game state and physics are authoritative.** UI code does not determine collision, damage, turn resolution or win conditions.
2. **`gchessboard` is presentation-only.** Its board stays visually underneath the transparent physics layer because ArChess pieces move continuously rather than square-to-square.
3. **Bootstrap is the application chrome foundation.** Custom CSS is restricted to ArChess-specific theme/composition requirements.
4. **2D is the only active renderer.** There is no 3D toggle, WebGL renderer, camera, routing layer or 3D asset loader.
5. **One boot path.** The template loads the active native modules and then `main.js`; legacy shell/runtime loaders are not part of the page.
6. **External libraries are pinned.** Bootstrap 5.3.8, Bootstrap Icons 1.13.1 and gchessboard 1.4.0 are explicitly versioned.
7. **Observability is non-fatal.** Logging/tracing must never be allowed to break application shutdown or request execution.

## Root Cause Fixed

The blank/black board screenshot was caused by the ArChess physics canvas being created with `getContext("2d", { alpha:false })`. That made the supposed transparent overlay opaque. It is now created with `alpha:true` so the gchessboard surface below remains visible.

## Logging Regression Fixed

The function tracer was tracing standard-library shutdown code such as `tempfile`, then trying to emit log records after Python had already closed its logging stream. That produced repeated `ValueError: I/O operation on closed file` errors and a secondary `NoneType.startswith` failure during handler cleanup.

The tracer now:

- exits immediately during `sys.is_finalizing()`;
- traces only ArChess application modules;
- checks for closed logger streams;
- prevents recursive tracer logging;
- treats tracing/logging failures as non-fatal; and
- disables logging exception propagation with `logging.raiseExceptions = False`.

## Latest Verification Result

Latest local run:

- **Python:** 99 passed, 17 skipped, 61 warnings.
- **JavaScript:** 18 passed, 0 failed.
- The only prior Python failure was the tracker release-gate wording; that contract has now been corrected on the development branch.
- Warnings are currently SQLAlchemy warnings in existing database teardown/telemetry code and do not fail the suite.
- Browser end-to-end/multi-browser verification is still pending because it requires the local Flask server plus installed Playwright browsers.

## Positive Test Matrix

| Area | Required cases |
|---|---|
| Boot | HTTP 200, one game state, 32 pieces, `phase=aim`, White starts |
| Board | gchessboard component present, board is square, fits viewport |
| Pieces | All 32 live physics pieces render in initial arrangement |
| Selection | White living piece selects on White turn |
| Drag | Dragging state becomes active and power increases |
| Launch | Meaningful release clears dragging and enters physics |
| Physics | Simulation settles and returns to aim phase |
| Turns | White → Black → White works |
| Effects | launch / impact / damage / destruction effects render without exceptions |
| Theme | Theme changes work without resetting game state |
| Resize | Board remains square and usable after viewport changes |
| New battle | Full reset returns to 32 pieces and White turn |
| Replay | Existing replay controls continue to function |
| Logging | Runtime emits structured browser/server events without fatal logging errors |

## Negative Test Matrix

| Area | Required cases |
|---|---|
| Wrong team | Black selection during White turn is rejected |
| Empty click | No piece selected when clicking an empty square |
| Empty release | Pointer down/up without meaningful pull does not launch |
| Outside board | Input outside bounds does not create a launch |
| Double release | Release while not dragging is harmless |
| Physics lock | Input during physics cannot start a second shot |
| Dead piece | Dead piece cannot be selected/launched |
| Broken library | gchessboard failure falls back to canvas board without breaking game logic |
| Storage | Corrupt/unavailable localStorage does not crash theme/settings |
| Renderer | Frame exception is logged and the animation loop survives |
| API | Failed API request is logged and does not create an unhandled rejection |
| Shutdown | Python interpreter shutdown emits no logging traceback |

## Function-Level Coverage

Critical functions requiring direct or indirect coverage:

- `GameBoard.resize`, `toWorld`, `isInside`
- piece factory/setup/clone/placement
- input pointer down/move/up/cancel
- selection and turn validation
- launch vector/power validation
- physics stepping, collision, wall collision, damage and settle
- turn transition and game-over resolution
- `GameRenderer` initialization, draw, aim, piece/effect rendering
- UI update, log, armory and modal controls
- theme/settings persistence and resize controls
- replay/challenge entry points
- browser error/rejection/fetch instrumentation
- Flask request lifecycle, unexpected exception and thread error handling
- server function tracer startup/finalization paths

## Regression Suites

### Browser

- `tests/test_2d_runtime_contract.py` — static 2D/runtime/library/transparency contract
- `tests/test_2d_arena_ui.py` — positive/negative 2D UI and gameplay checks
- `tests/test_local_gameplay_browser.py` — authenticated two-turn local gameplay
- `tests/test_browser_matrix.py` — responsive multi-browser regression
- existing auth browser suites — preserve account/auth behaviour

### Python

Run the repository's existing backend/API/security/authoritative simulation suites locally. No CI workflow runs are used.

### JavaScript

Run the existing Node test suite. Obsolete 3D and professional-shell suites were removed because they tested deleted architecture.

### Logging

Manual shutdown regression: start `python game.py`, make a normal request, stop with Ctrl+C, and require zero `--- Logging error ---` traces.

## Cleanup Completed

Removed from the active branch/runtime:

- professional shell/runtime
- release boot chain
- render router
- runtime stabilizer
- board host shim
- duplicate local input controllers
- mode/presentation/turn guard shims
- 3D renderer and camera controls
- 3D presentation fallback
- Three.js vendor bundles
- superseded 930-line renderer
- obsolete professional/final UI stylesheets and UI suites
- obsolete WebGL verification docs/markers
- unused projectile visuals shim

## Dependencies / Licensing

- Bootstrap 5.3.8 — MIT
- Bootstrap Icons 1.13.1 — MIT
- gchessboard 1.4.0 — MIT
- gchessboard Cburnett-derived SVG artwork — CC BY-SA 3.0
- Python-Easy-Chess-GUI — UX reference only; its desktop application code is not bundled

See `THIRD_PARTY_NOTICES.md` and `docs/ASSET_LICENSES.md`.

## Verification Record

**Development branch head at tracker update:** after restoring the release-gate contract.  
**`main` remains unchanged:** `46165ca7f6f88386077aede8583b735597c3bc33`.  
**Actions state:** `.github/workflows` is absent on the development branch; Actions have not been reintroduced.  
**Latest local automated result:** 99 Python tests passed, 17 skipped, 61 warnings; 18 JavaScript tests passed.  
**Browser verification:** PENDING — local Playwright/browser execution remains required.  
**Logging shutdown regression:** FIXED IN CODE; local Ctrl+C verification remains required.  
**Promotion:** BLOCKED until browser/multi-browser/local shutdown checks are green.

## Promotion Rule

**Do not move `ui-rebuild-2d-v2` to `main`.** Promotion is allowed only after all required checks are green.

1. Python tests pass.
2. `tests/test_2d_runtime_contract.py` passes.
3. `tests/test_2d_arena_ui.py` passes with `RUN_BROWSER_MATRIX=1`.
4. `tests/test_local_gameplay_browser.py` passes with browser dependencies installed.
5. `tests/test_browser_matrix.py` passes for the installed browsers.
6. Existing JavaScript tests pass.
7. Positive and negative gameplay cases pass.
8. Desktop, tablet and mobile layouts are verified.
9. No forbidden 3D/legacy runtime is referenced by the active template.
10. The exact verified commit is recorded here.
11. `.github/workflows` remains absent unless intentionally reintroduced later.
