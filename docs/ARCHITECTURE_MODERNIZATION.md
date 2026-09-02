# ArChess Modern Client Architecture

The modern client is now served by the Flask application. The legacy browser runtime remains available only as compatibility code while remaining parity work is completed.

## Stack

- React + TypeScript: application shell, HUD, settings, menus, profile/lobby surfaces.
- Phaser 4: interactive 2D arena, game loop, pointer/touch input, rendering and client presentation physics.
- Tailwind CSS 4: responsive design system.
- Motion for React: DOM/UI transitions and gesture animation, never authoritative game physics.
- Flask: HTTP/WebSocket service boundary and application entry point.
- Existing Python game authority: source of truth for authoritative simulation and persistence.

Phaser is intentionally isolated from the React render cycle. React consumes coarse game snapshots/events; the Phaser scene owns the frame loop. Tailwind styles the application shell and Motion animates DOM surfaces. Flask serves the built client and owns the transport boundary, while authoritative outcomes remain server-owned.

## Gameplay state machine

```text
AIM
  ↓ pointer select/drag
AIMING
  ↓ release
PHYSICS
  ↓ all surviving pieces stationary for settle delay
AIM (opposite team)
  ↓ king destroyed
GAMEOVER
```

Settlement is a physical state transition based on movement/velocity. A transient collision list is not a permanent turn gate.

## Backend boundary

Flask exposes the modern contracts: health, version, room creation, room state, launch requests, and a WebSocket room channel. The legacy Flask routes remain available for compatibility until parity work is completed.

## Required migration order

1. Verify the modern client builds and starts.
2. Verify local collision/turn behavior in the browser.
3. Port authoritative API behavior and persistence.
4. Port ranked/auth/progression/replay/challenge contracts.
5. Add WebSocket synchronization and reconnect.
6. Run the browser matrix and full regression.
7. Remove legacy browser runtime only after documented parity.

## Observability

The existing logging contract remains authoritative: `Logs/YYYY/MMM/DD_Logs/RunXX/`, one application process per run, ten-day retention, and verbose function tracing only when explicitly enabled. Modern client events should preserve correlation identifiers and use stable domain names such as `SHOT_LAUNCHED`, `COLLISION_DETECTED`, `PIECE_DESTROYED`, `PHYSICS_SETTLED`, `TURN_CHANGED`, and `GAME_OVER`.

## Verification

Every phase follows:

`implement → add tests → run targeted test → inspect logs → run broader regression → update tracker → commit`.
