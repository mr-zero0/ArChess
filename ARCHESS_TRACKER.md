# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Stable branch:** `main`  
**Current development branch:** `main`
**Branch policy:** `main` is the only active branch and contains the current verified application
**Current product mode:** 2D only  
**3D:** DEFERRED — no 3D renderer or 2D/3D switch is part of the current product  
**Repository policy:** `main` remains the stable baseline

## Main comparison checkpoint

- The Flask/React/Phaser consolidation is committed on `main` and `main` is the only local branch.
- The latest frontend build is emitted to `static/app` and served by Flask on port 5000.

## Current modernization verification snapshot

- Latest user-run full gate before the current keyboard-gameplay batch: **backend 13/13 passed; frontend 43/43 passed; TypeScript passed; production build passed**. The build retains the known Phaser large-chunk warning.
- Added best-effort authoritative room-state resynchronization when a launch request fails after local prediction, preserving the local gameplay flow while recovering from transport/API failure.
- Added bounded frontend API request timeouts with caller-signal propagation and structured timeout telemetry so startup/network stalls cannot remain indefinite.
- Added focused regression coverage for launch-failure resynchronization and explicit failure telemetry.
- Added collision cooldown-state pruning so long sessions do not retain expired pair timestamps indefinitely.
- Added a physically valid cooldown-expiry regression that advances simulation time without contact, then verifies a fresh inbound impact is damageable again.
- Added keyboard gameplay parity to the Phaser arena using the existing launch path: focusable canvas, active-team piece cycling, Enter/Space selection and launch, WASD direction, and keyboard telemetry.
- Added focused keyboard gameplay regression coverage.
- Added bounded live board resizing plus midnight, woodland, and ivory board themes with classic, outline, and mono piece presentation themes.
- Preserved the project open-source asset direction through the documented Cburnett-derived chess artwork and Phaser-native theme registry.
- User-validated live core issue: drag/play became usable and collision distortion was corrected.
- Implemented: accessibility hardening, abortable arena bootstrap, reconnect-state hardening, shared HUD health rules, launch-failure resync, bounded API request duration, collision cooldown pruning, keyboard gameplay controls, and focused lifecycle/regression coverage.
- Browser input uses captured native Pointer Events, explicit CSS-pixel-to-game-coordinate mapping, board-unit conversion, and post-settlement authoritative reconciliation.
- Browser E2E remains **PENDING**; reconnect recovery remains **PENDING LIVE VERIFICATION**.
- Generated runtime logs and dependency directories are not product changes and must not be committed.

## Branch hygiene

- `main` is the only active branch. Retired branches and linked worktrees have been removed or detached.

## Modernization workstream

### Foundation — implemented, pending local verification

- [x] React application shell.
- [x] TypeScript configuration.
- [x] Vite development/build configuration.
- [x] Tailwind CSS 4 Vite integration.
- [x] Motion for React integration.
- [x] Phaser 4 arena runtime.
- [x] Deterministic 32-piece setup.
- [x] Phaser-owned game update loop.
- [x] Local collision/impact/damage/settlement model.
- [x] React HUD receives game-domain snapshots without driving physics frames.
- [x] Flask service with health, version, room, launch and WebSocket contracts.
- [x] Frontend architecture contract tests.
- [x] Flask service contract smoke coverage.
- [x] Executable TypeScript physics runtime tests.
- [x] Removed redundant source-regex collision/activation tests after equivalent behavioral coverage was established.
- [x] Dedicated authoritative room service with per-room serialization and WebSocket fan-out.
- [x] Flask routes wired to authoritative room state and launch processing.
- [x] Rejected launches return authoritative snapshots for client reconciliation.
- [x] Hardened arena pointer drag handling after live browser feedback.
- [x] Canonicalized browser/server piece IDs for authoritative reconciliation.
- [x] Normalized drag vectors from render pixels to board-space physics units.
- [x] Replaced scene-only drag lifecycle with captured native canvas Pointer Events.
- [x] Deferred authoritative snapshot reconciliation until local physics settlement to avoid mid-flight visual distortion.
- [x] Added bounded authoritative WebSocket reconnect and room-state resynchronization.
- [x] Added API-boundary validation for non-finite launch vectors.
- [x] Aligned authoritative physics substeps and settlement timing with the browser solver.
- [x] Aligned authoritative collision separation epsilon with the browser solver.
- [x] Expanded frontend collision regression coverage for canonical setup, separation stability, and chained collisions.
- [x] Restored team-specific white/black chess glyph rendering to match the legacy presentation contract.
- [x] Added strict TypeScript typing for room-state error responses.
- [x] Corrected API tests so non-finite validation is exercised at the FastAPI boundary.
- [x] Corrected FastAPI launch response handling so room-service tuples are never exposed as endpoint responses.
- [x] Made WebSocket connection ownership single-layered to prevent duplicate accept/send lifecycle failures.
- [x] Made validation-error serialization safe for exception objects and non-finite values.
- [x] Derived HUD team health scale from the canonical starting piece roster instead of duplicated magic totals.
- [x] Added a rules regression for the exact starting team health total.
- [x] Added accessibility presentation hardening for focus states, coarse-pointer targets, touch handling, and reduced motion.
- [x] Added an abortable arena bootstrap so unmounts cancel pending scene-bridge polling cleanly.
- [x] Added focused arena bootstrap lifecycle regression coverage.
- [x] Aligned the modern-stack regression with the current abortable bootstrap contract.
- [x] Hardened authoritative-session connection state to prevent reconnect scheduling races with gameplay launches.
- [x] Added focused reconnect-launch race regression coverage.
- [x] Aligned modern-stack tests with current feature-rail, same-origin API, and observability contracts.
- [x] Hardened transport assertions to verify endpoint construction semantics without coupling tests to template-literal formatting.
- [x] Removed the final WebSocket implementation-detail assertion from the modern-stack transport contract.
- [x] Added best-effort authoritative resynchronization after failed launch requests.
- [x] Added launch-failure resync regression coverage.
- [x] Added bounded frontend API request duration with caller-abort propagation and timeout telemetry.
- [x] Added collision cooldown-state pruning for long-session memory stability.
- [x] Added collision cooldown expiry regression coverage using a fresh post-cooldown impact.
- [x] Added keyboard gameplay parity using the existing drag launch path.
- [x] Added focused keyboard gameplay regression coverage.

### Gameplay parity — remaining

- [x] Match the legacy board's remaining exact presentation details.
- [x] Verify real White → collision → settlement → Black flow in Chromium after latest changes.
- [x] Verify Black → collision → settlement → White.
- [x] Verify repeated collisions do not freeze the scene.
- [x] Verify reconnect during and after a completed launch resynchronizes cleanly.
- [ ] Add full VFX/audio/replay/history/challenges parity.
- [ ] Verify keyboard gameplay in a real browser session.
- [ ] Verify board resizing and each presentation theme in a real browser session.
- [ ] Add browser matrix for the modern client.

### Backend parity — current

- [x] Port authoritative room lifecycle into the Flask room service.
- [x] Port authoritative launch validation and canonical state persistence into the Flask room service.
- [x] Port ranked settlement/outcome hooks.
- [x] Port authentication/social contracts.
- [x] Replace the duplicate FastAPI transport with the Flask transport.
- [x] Verify Flask serves the compiled React/Phaser application and modern room state flow.
- [ ] Verify WebSocket reconnect/resync behavior in a live browser session.

### Cutover — current

- [x] Reconcile the modernization work on `main`.
- [x] Run the modern client against the Flask backend.
- [ ] Full application regression after integration.
- [ ] Modern browser matrix green.
- [ ] Manual gameplay green for multiple consecutive collisions.
- [ ] Performance/bundle audit.
- [x] Documentation/tracker reconciliation.
- [ ] Remove the legacy client only after parity is demonstrated.
- [ ] Merge modernized branch to `main`.

## Observability

The established policy remains:

```text
Logs/YYYY/MMM/DD_Logs/RunXX/
1 application process = 1 RunXX
retain all runs for 10 days
verbose function enter/exit tracing is opt-in
```

The modern client emits structured domain events with a client correlation ID. API requests send `X-Request-ID` and `X-Correlation-ID`; Flask attaches those identifiers, plus room and game IDs when available, to the structured application logs.

## Verification policy

For every meaningful change:

`change → add/update tests → targeted verification → inspect failures/logs → relevant regression → tracker update → commit`.

Latest verified local checks: frontend tests **48/48 passed**, backend logging/observability tests **15/15 passed**, TypeScript and production build passed. The build retains the known Phaser large-chunk warning. Legacy database-dependent tests still require initialized test tables.

Generated logs are never committed as application data. `main` is not modified by modernization work until the complete applicable gate set is green.
