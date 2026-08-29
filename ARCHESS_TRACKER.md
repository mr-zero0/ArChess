# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Stable branch:** `main`  
**Current development branch:** `feat/react-phaser-fastapi-migration`  
**Legacy verification branch:** `fix/observability-complete`  
**Branch policy:** development work stays on dedicated branches; only verified work is merged to `main`  
**Current product mode:** 2D only  
**3D:** DEFERRED — no 3D renderer or 2D/3D switch is part of the current product  
**Repository policy:** `main` remains the stable baseline

## Current modernization verification snapshot

- Latest local backend gate: **11 passed**.
- Latest local frontend gate before the drag remediation: **25 passed**.
- Latest local TypeScript check: **passed**.
- Latest local production build: **passed**, with the existing Vite/Rolldown large-chunk warning for the Phaser bundle.
- User-reported live issue: initial White-piece drag was not reliably interactive in the browser.
- Drag remediation: **IMPLEMENTED — pending local browser verification**. Arena pointer input now uses explicit camera-space conversion, a stable hit radius, explicit drag cancellation, and safer invalid-launch recovery.
- Regression contract updated to require camera-space pointer conversion and drag-cancel handling.
- Browser E2E remains **PENDING**; do not mark browser parity green until the live migrated stack is exercised successfully.
- Generated local files such as `frontend/package-lock.json` and `frontend/tsconfig.tsbuildinfo` are not product changes and must not be committed unless intentionally adopted.

## Latest verified legacy baseline

- Full Python regression: **125 passed, 17 skipped, 61 warnings** before the modernization branch was created.
- Logging/retention targeted suite: **17 passed**.
- Targeted observability/authoritative suite: **24 passed**.
- Collision/runtime JavaScript regression: **7 passed**.
- Live legacy browser gameplay: **BLOCKED** by the known first-collision freeze; this is the primary reason for modernizing the browser game runtime instead of continuing to patch the legacy loop.

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
- [x] FastAPI service package with health, version, room, launch and WebSocket foundation.
- [x] Frontend architecture contract tests.
- [x] FastAPI service contract tests.
- [x] Executable TypeScript physics runtime tests.
- [x] Removed redundant source-regex collision/activation tests after equivalent behavioral coverage was established.
- [x] Dedicated authoritative room service with per-room serialization and WebSocket fan-out.
- [x] FastAPI routes wired to authoritative room state and launch processing.
- [x] Rejected launches return authoritative snapshots for client reconciliation.
- [x] Hardened arena pointer drag handling after live browser feedback.

### Gameplay parity — remaining

- [ ] Match the legacy board's exact piece stats and initial presentation.
- [ ] Verify real White → collision → settlement → Black flow in Chromium.
- [ ] Verify Black → collision → settlement → White.
- [ ] Verify repeated collisions do not freeze the scene.
- [ ] Add full VFX/audio/replay/history/challenges parity.
- [ ] Add accessibility and keyboard/touch parity.
- [ ] Add browser matrix for the modern client.

### Backend parity — remaining

- [x] Port authoritative room lifecycle into the FastAPI room service.
- [x] Port authoritative launch validation and canonical state persistence into the FastAPI room service.
- [ ] Port ranked settlement/outcome hooks.
- [ ] Port authentication/social contracts.
- [x] Replace the FastAPI placeholder room state with the real authoritative simulation service.
- [ ] Verify WebSocket reconnect/resync behavior.

### Cutover — blocked until parity

- [ ] Dual-run modern client against verified backend.
- [ ] Full application regression after integration.
- [ ] Modern browser matrix green.
- [ ] Manual gameplay green for multiple consecutive collisions.
- [ ] Performance/bundle audit.
- [ ] Documentation/tracker reconciliation.
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

The modern client must continue emitting meaningful domain events and must preserve correlation context when communicating with the backend.

## Verification policy

For every meaningful change:

`change → add/update tests → targeted verification → inspect failures/logs → relevant regression → tracker update → commit`.

Generated logs are never committed as application data. `main` is not modified by modernization work until the complete applicable gate set is green.
