# ArChess Product Rules — v1 Baseline

## Core rule set

- Board is 8×8 with standard chess opening placement.
- The game uses slingshot/drag-and-release launching rather than legal chess movement after launch.
- Every living piece is a physical projectile.
- Friendly fire is enabled; allied pieces can damage one another.
- King HP reaching 0 ends a match.
- Physics is simulated in 2D logical space and rendered in 3D.
- Competitive multiplayer uses server-authoritative state and physics.
- Competitive cosmetics never change piece HP, power, mass, speed, radius, restitution, friction, or damage.

## Competitive exceptions

- There is no check/checkmate state.
- There is no castling, en passant, or post-launch piece movement rule.
- A valid competitive launch is generated from player intent; clients never submit authoritative velocity or state.
- Disconnect, surrender, timeout, and abandonment are explicit ranked outcomes.
- Ranked ratings are server-calculated and idempotently recorded.
