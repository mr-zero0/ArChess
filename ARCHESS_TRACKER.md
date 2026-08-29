# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Stable branch:** `main`  
**Current development branch:** `feat/react-phaser-fastapi-migration`  
**Branch policy:** maintain exactly one active non-main development branch; modernization work stays on `feat/react-phaser-fastapi-migration`; only verified work is merged to `main`  
**Current product mode:** 2D only  
**3D:** DEFERRED — no 3D renderer or 2D/3D switch is part of the current product  
**Repository policy:** `main` remains the stable baseline

## Main comparison checkpoint

- `feat/react-phaser-fastapi-migration` is now **171 commits ahead** of `main` and **1 commit behind** `main` at the latest comparison.
- The single commit ahead on `main` is `refactor(backend): route API through room service`; it is semantically related to the current FastAPI room-service work and must be reconciled before final cutover rather than silently ignored.
- No new development branch should be created for that reconciliation.

## Current modernization verification snapshot

- Latest user-run backend gate before the current fix: **6 passed, 8 failed**. Failures were caused by a response-shape regression in the FastAPI room endpoint, duplicate WebSocket acceptance/sending, and non-serializable validation-error context.
- Latest user-run frontend gate: **30 passed**.
- Latest user-run TypeScript/build gate: production build completed, but TypeScript had a `RoomState.error` mismatch; the type fix is now in the branch.
- Current remediation implemented and pending fresh local gate: correct room-service launch response unpacking, single-owner WebSocket acceptance/initial state send, and fully JSON-safe validation-error serialization including exception objects.
- API regression tests now cover these response/lifecycle contracts directly.
- Browser input uses captured native Pointer Events, explicit CSS-pixel-to-game-coordinate mapping, board-unit conversion, and post-settlement authoritative reconciliation.
- Browser E2E remains **PENDING**; reconnect recovery remains **PENDING LIVE VERIFICATION**.
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

### Gameplay parity — remaining

- [ ] Match the legacy board's remaining exact presentation details.
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
