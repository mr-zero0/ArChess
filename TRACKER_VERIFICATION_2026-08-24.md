# ArChess Tracker Verification — 2026-08-24

This file records the verified delta against `ARCHESS_PRODUCT_DESIGN_TRACKER.md` after auditing the current `main` branch.

## Verified completed work

### STEP 1 — Repository / engineering baseline
- `requirements.txt` repaired: removed corrupted NUL/UTF-16 bytes and restored `Flask-Limiter` as a valid dependency.
- `package.json` version aligned with the current application release: `0.5.2`.

### STEP 2 / STEP 9 — Physics QA
- Server-side simultaneous multi-piece collision coverage added in `tests/test_authoritative_simulation.py`.
- Collision cooldown and King-destruction regression coverage added.
- Existing browser/physics suites remain configured in `.github/workflows/tests.yml`.

### STEP 13 — Authoritative simulation / anti-cheat
- Canonical server state is initialized at match start and rematch.
- Launch requests are validated against the canonical server state, current turn, player ownership, piece liveness, finite velocity, and maximum speed.
- Server physics now runs the shot to settlement using deterministic fixed-step simulation.
- Server-generated snapshots, HP state, destruction events, and game-over results are persisted to the room.
- Client POSTs attempting to overwrite `/sync`, `/hp`, `/destruction`, or `/gameover` are rejected with HTTP 409.
- Invalid launch attempts are logged server-side.
- Reconnect returns the canonical server state.
- Rematch creates a fresh canonical server state.
- New API tests cover the authority boundary, canonical snapshot persistence, launch processing, and wrong-player rejection.

## Tracker correction required

The original tracker currently marks STEP 13 as fully complete, but the implementation before this update was only partially authoritative: client-provided state could still overwrite `canonical_state`, and `/launch` only validated a client-provided velocity without running the canonical server simulation.

After this update, the implementation supports the core authoritative match path. Replay/state hashing is still not a cryptographic checksum, and the browser multiplayer client has not yet been fully switched to consume the new authoritative launch response. Those items must remain open until verified.

## Current verified next work

1. Connect the browser multiplayer client to `/api/rooms/<room>/start`, `/launch`, `/sync`, and `/reconnect` so the UI consumes server IDs and canonical snapshots.
2. Add client reconciliation tests against server snapshots.
3. Replace the replay checksum placeholder with a real deterministic hash over canonical match state and shot inputs.
4. Run the full CI/browser matrix after these changes and only then promote the corresponding tracker items to DONE.

## Important status rule

Do not mark a tracker item DONE solely because code exists. The repository's own Definition of Done requires implementation, regression verification, reset/resize/input safety, and browser verification where applicable.
