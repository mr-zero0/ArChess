# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Stable branch:** `main`  
**Current development branch:** `feat/react-phaser-fastapi-migration`  
**Branch policy:** maintain exactly one active non-main development branch; modernization work stays on `feat/react-phaser-fastapi-migration`; only verified work is merged to `main`  
**Current product mode:** 2D only  
**3D:** DEFERRED — no 3D renderer or 2D/3D switch is part of the current product  
**Repository policy:** `main` remains the stable baseline

## Main comparison checkpoint

- `feat/react-phaser-fastapi-migration` is **153 commits ahead** of `main` and **1 commit behind** `main` at the comparison checkpoint.
- The single commit ahead on `main` is `refactor(backend): route API through room service`; it is semantically related to the current FastAPI room-service work and must be reconciled before final cutover rather than silently ignored.
- No new development branch should be created for that reconciliation.

## Current modernization verification snapshot

- Latest automated backend gate before the reconnect hardening: **11 passed**.
- Latest automated frontend gate before the reconnect hardening: **25 passed**.
- Latest local TypeScript check before the reconnect hardening: **passed**.
- Latest local production build before the reconnect hardening: **passed**, with the existing Vite/Rolldown large-chunk warning for the Phaser bundle.
- User-validated live core issue: drag/play became usable and collision distortion was corrected; the current priority is robustness around continued authoritative play.
- Current remediation baseline: **IMPLEMENTED — pending local verification** for the newest reconnect changes. Browser input uses captured native Pointer Events, explicit CSS-pixel-to-game-coordinate mapping, board-unit conversion, and safe post-settlement authority reconciliation.
- New hardening: authoritative WebSocket reconnect now uses bounded exponential backoff and performs an HTTP room-state resync after reconnect before declaring the session recovered.
- Browser E2E remains **PENDING**; do not mark browser parity green until the live migrated stack is exercised successfully after the latest batch.
- Generated local files such as `frontend/package-lock.json` and `frontend/tsconfig.tsbuildinfo` are not product changes and must not be committed unless intentionally adopted.

## Branch hygiene

- `feat/react-phaser-fastapi-migration` is the **only active non-main development branch**.
- `fix/observability-complete` is retired legacy verification work and should be deleted locally and remotely; no new commits belong there.

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
- [x] Canonicalized browser/server piece IDs for authoritative reconciliation.
- [x] Normalized drag vectors from render pixels to board-space physics units.
- [x] Replaced scene-only drag lifecycle with captured native canvas Pointer Events.
- [x] Deferred authoritative snapshot reconciliation until local physics settlement to avoid mid-flight visual distortion.
- [x] Added bounded authoritative WebSocket reconnect and room-state resynchronization.

### Gameplay parity — remaining

- [ ] Match the legacy board's exact piece stats and initial presentation.
- [ ] Verify real White → collision → settlement → Black flow in Chromium after latest changes.
- [ ] Verify Black → collision → settlement → White.
- [ ] Verify repeated collisions do not freeze the scene.
- [ ] Verify reconnect during and after a completed launch resynchronizes cleanly.
- [ ] Add full VFX/audio/replay/history/challenges parity.
- [ ] Add accessibility and keyboard/touch parity.
- [ ] Add browser matrix for the modern client.

### Backend parity — remaining

- [x] Port authoritative room lifecycle into the FastAPI room service.
- [x] Port authoritative launch validation and canonical state persistence into the FastAPI room service.
- [ ] Port ranked settlement/outcome hooks.
- [ ] Port authentication/social contracts.
- [x] Replace the FastAPI placeholder room state with the real authoritative simulation service.
- [ ] Verify WebSocket reconnect/resync behavior in a live browser session.

### Cutover — blocked until parity

- [ ] Reconcile the one `main` commit difference cleanly on the existing development branch.
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
