# ArChess

**ArChess** is a browser-based physics battle game that reimagines chess as a fast, projectile-driven arena.

Instead of moving pieces according to traditional chess rules, players select a piece, drag backward like a slingshot, aim, and release. Pieces launch across the board, bounce off walls, collide with other pieces, deal damage, and can eventually be destroyed.

The match ends when a player's **King reaches 0 HP**.

> Chess, except the pieces have momentum, health bars, and absolutely no respect for traditional movement rules.

---

## Overview

ArChess combines the visual structure of chess with lightweight 2D physics and turn-based combat.

The core gameplay loop is:

```text
Select
  ↓
Drag
  ↓
Aim
  ↓
Launch
  ↓
Physics
  ↓
Collision
  ↓
Damage
  ↓
Settle
  ↓
Next Turn
```

There is no check, checkmate, castling, en passant, or traditional piece movement after the game begins.

Victory is determined entirely by destroying the opposing King.

---

## Features

### Physics-Based Chess Combat

Every chess piece behaves as a physical projectile with:

- Position
- Velocity
- Radius
- Mass
- HP
- Attack power
- Collision response

Pieces can:

- Launch in any direction
- Bounce from board boundaries
- Collide with multiple pieces
- Damage allies and enemies
- Lose HP
- Be destroyed

---

### Slingshot Controls

Select one of your pieces and drag backward to prepare a launch.

Launch velocity is calculated from the drag direction:

```javascript
dx = piece.x - pointer.x;
dy = piece.y - pointer.y;

vx = dx * launchStrength;
vy = dy * launchStrength;
```

Launch power is clamped to prevent excessive projectile speeds.

While aiming, the game displays:

- Selected-piece glow
- Direction indicator
- Trajectory guide
- Power level

Mouse and touch input are supported through **Pointer Events**.

---

### Turn-Based Gameplay

ArChess currently supports local alternating turns:

```text
WHITE → BLACK → WHITE → BLACK
```

Only pieces belonging to the active player can be selected.

A turn changes only after the launched pieces and resulting collisions have settled.

This prevents players from launching new pieces while the board is still in motion.

---

### Collision & Damage System

Pieces use circular collision detection:

```text
distance(A, B) < radiusA + radiusB
```

When two pieces collide, ArChess:

1. Calculates the collision normal
2. Measures relative impact velocity
3. Calculates impact damage
4. Applies damage to both pieces
5. Resolves overlapping positions
6. Applies collision impulses
7. Generates visual impact effects

Damage depends on both:

- Piece attack power
- Collision speed

As a result:

```text
Weak piece + low speed    → low damage
Strong piece + low speed  → moderate damage
Strong piece + high speed → heavy damage
```

### Friendly Fire

Friendly fire is enabled.

Colliding with one of your own pieces can damage or destroy it, so positioning matters.

---

## Piece Statistics

| Piece | HP | Power |
|------|---:|------:|
| Pawn | 30 | 10 |
| Knight | 50 | 30 |
| Bishop | 40 | 25 |
| Rook | 80 | 40 |
| Queen | 90 | 70 |
| King | 120 | 100 |

The **King** is both the strongest piece and the primary objective.

Once a King's HP reaches zero, the match immediately ends.

---

## Win Condition

Traditional chess victory rules do not apply.

There is:

- No check
- No checkmate
- No stalemate
- No castling
- No promotion
- No traditional capturing

A player wins when the opposing King reaches:

```text
HP = 0
```

The game then displays either:

```text
WHITE WINS
```

or:

```text
BLACK WINS
```

A **New Game** button resets the entire match.

---

## Visual Effects

ArChess uses HTML5 Canvas for gameplay rendering and effects.

Current visual feedback includes:

### Launch Effects

- Motion trails
- Launch particles
- Selected-piece glow

### Collision Effects

- Particle bursts
- Impact flashes
- Floating damage numbers
- Screen shake on strong collisions

### Destruction Effects

- Particle/shatter effects
- Destruction animation
- Piece removal from active physics

### HUD

The interface displays:

- White King HP
- Black King HP
- Current turn
- Launch power
- Game status
- New Game control

---

## Tech Stack

ArChess deliberately keeps the technology lightweight.

### Backend

- Python 3
- Flask

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- HTML5 Canvas

### Physics

Custom lightweight 2D physics implemented directly in JavaScript.

No external physics engine is required.

---

## Project Structure

```text
ArChess/
├── app.py
├── requirements.txt
├── game/
│   ├── __init__.py
│   ├── constants.py
│   ├── models.py
│   └── game_state.py
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js
        ├── board.js
        ├── physics.js
        ├── pieces.js
        ├── input.js
        ├── renderer.js
        └── ui.js
```

The project separates input, rendering, physics, pieces, board logic, UI, and game state so the codebase can evolve without turning `main.js` into a thousand-line archaeological site.

---

## Architecture

ArChess separates server responsibilities from browser gameplay.

### Flask

Flask is responsible for:

- Serving the application
- Serving templates
- Serving static assets
- Providing game configuration where required

The backend intentionally does **not** control real-time physics.

### JavaScript

The browser handles:

- Game state
- Input
- Physics
- Animation
- Collision detection
- Damage
- Particle effects
- Rendering
- Turn transitions

This keeps gameplay responsive while leaving the Flask backend available for future multiplayer or server-authoritative functionality.

---

## Game Loop

The game runs using:

```javascript
requestAnimationFrame(gameLoop);
```

The general frame flow is:

```text
Input
  ↓
Physics
  ↓
Boundary Collisions
  ↓
Piece Collisions
  ↓
Damage
  ↓
Piece Destruction
  ↓
Effects
  ↓
Game Over Check
  ↓
Board Rendering
  ↓
Piece Rendering
  ↓
Effect Rendering
  ↓
UI Update
```

Physics calculations use delta time instead of relying on a fixed frame rate.

Multiple physics substeps are used to improve collision accuracy for fast-moving pieces.

---

## Physics Configuration

Core gameplay physics can be tuned through centralized configuration values such as:

```javascript
GAME_CONFIG = {
    maxLaunchSpeed: ...,
    friction: ...,
    bounceFactor: ...,
    collisionMultiplier: ...,
    damageMultiplier: ...,
    minVelocity: ...,
    physicsSubsteps: 3
};
```

These values control the overall feel of the game.

For example:

- `maxLaunchSpeed` controls maximum shot strength
- `friction` controls how quickly pieces slow down
- `bounceFactor` controls wall rebound strength
- `collisionMultiplier` affects impact calculations
- `damageMultiplier` controls overall damage scaling
- `minVelocity` determines when pieces are considered stopped
- `physicsSubsteps` improves collision accuracy

---

## Getting Started

### Requirements

Make sure you have:

- Python 3
- pip
- A modern web browser

---

### Clone the Repository

```bash
git clone https://github.com/mr-zero0/ArChess.git
cd ArChess
```

---

### Create a Virtual Environment

Recommended:

#### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

#### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

---

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

### Run ArChess

```bash
python app.py
```

Then open:

```text
http://localhost:5000
```

in your browser.

---

## How to Play

1. Start the Flask server.
2. Open ArChess in your browser.
3. White moves first.
4. Select any living piece belonging to the current player.
5. Drag backward from the piece.
6. The farther you drag, the stronger the launch.
7. Aim using the trajectory indicator.
8. Release the pointer.
9. The piece launches across the board.
10. Wait for all movement and collisions to settle.
11. The turn switches to the other player.
12. Continue until one King reaches 0 HP.

---

## Controls

| Action | Mouse | Touch |
|---|---|---|
| Select piece | Left click | Tap |
| Aim | Click + drag | Touch + drag |
| Increase power | Drag farther | Drag farther |
| Launch | Release mouse | Release touch |
| Restart match | New Game | New Game |

---

## Initial Board

Pieces begin in standard chess starting positions:

```text
8 | R N B Q K B N R | Black
7 | P P P P P P P P |
6 |                 |
5 |                 |
4 |                 |
3 |                 |
2 | P P P P P P P P |
1 | R N B Q K B N R | White
    A B C D E F G H
```

Their starting positions resemble chess.

Their behavior after launch very much does not.

---

## Responsive Design

The game board maintains a responsive **1:1 aspect ratio**.

ArChess supports:

- Desktop browsers
- Tablets
- Touch-enabled devices
- Mobile layouts

On smaller screens, status information is repositioned below the game board for improved usability.

---

## Performance

ArChess is designed to maintain smooth gameplay with all **32 pieces active**.

Performance decisions include:

- Canvas-based rendering
- `requestAnimationFrame`
- Delta-time physics
- Limited physics substeps
- Lightweight circle collisions
- Effect cleanup
- No DOM element per particle
- No heavy frontend frameworks

The target is approximately **60 FPS** on modern browsers.

---

## Current Scope

ArChess currently focuses on the core local physics battle experience.

Included:

- Physics-based movement
- Local two-player turns
- Collisions
- Damage
- Friendly fire
- Piece destruction
- King HP victory condition
- Particles and visual effects
- Responsive controls
- Mouse and touch support
- Complete match reset

Not currently implemented:

- AI opponents
- Online multiplayer
- Matchmaking
- User accounts
- Persistent game history
- Traditional chess rules
- Ranking systems

---

## Future Improvements

Potential future additions include:

- Online multiplayer using WebSockets or Socket.IO
- Server-authoritative match state
- Player matchmaking
- Private game rooms
- Spectator mode
- Sound effects
- Background music
- More advanced collision effects
- Piece abilities
- Alternative game modes
- Arena variations
- Match statistics
- Replays
- Mobile-focused UI improvements

The current architecture intentionally keeps Flask separate from browser physics so multiplayer can be introduced later without rewriting the entire gameplay system.

---

## Development Philosophy

The main priority of ArChess is:

> **Responsive and entertaining physics gameplay over traditional chess correctness.**

The game should feel satisfying to aim, launch, collide, and destroy pieces.

Traditional chess behavior is intentionally secondary to momentum, impact, positioning, and chaos.

---

## Repository

GitHub:

```text
https://github.com/mr-zero0/ArChess
```

---

## Contributing

Contributions, bug reports, and improvements are welcome.

A typical contribution workflow:

```bash
git checkout -b feature/your-feature
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

Then open a pull request against the main branch.

When contributing, keep the existing modular structure intact where possible:

- Physics belongs in physics modules
- Rendering belongs in rendering modules
- Input belongs in input modules
- Game state should remain centralized
- Flask should remain independent of real-time browser physics

---

## Author

Developed by **mr-zero0**

GitHub: [@mr-zero0](https://github.com/mr-zero0)

---

## Status

ArChess is currently in active development.

The core gameplay loop is implemented:

```text
Select → Drag → Aim → Launch → Bounce → Collide
→ Damage → Destroy → Change Turn → Destroy King → Win
```

Further development will focus on gameplay balancing, visual polish, sound, additional game modes, and eventually multiplayer support.