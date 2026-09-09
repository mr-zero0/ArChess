# ARCHESS — Changelog & Iteration History

All notable changes, architectural pivots, bugfixes, and refactorings across **ArChess** are documented in this file.

---

## [2.1.0] - 2026-09-09

### 🎨 Complete Design System Coverage
- **Subpage CSS Coverage**: Added full styling suites to `static/css/style.css` for `templates/play.html` (toolbar, 2D/3D toggle, match strips, telemetry panel, responsive grid), `templates/arsenal.html` (piece tabs, stat tracks, ability boxes), and `templates/leaderboard.html` (table card, rank badges, division tiers).
- **Canonical Route Normalization**: Replaced relative `.html` links with canonical Flask routes (`/`, `/play`, `/arsenal`, `/leaderboard`).

### 🤖 Autonomous Bot AI & Single-Player Mode
- **Vector-Aiming AI**: Built autonomous Bot AI into `static/js/game.js` that evaluates target pieces by strategic value (King > Queen > Rook/Bishop/Knight > Pawn), computes impulse angles, introduces natural aim dispersion, and displays a visual aim preview before firing.
- **Match Mode Toggle**: Added "vs Bot AI" and "Pass & Play (2P)" mode switcher in the Tactical Arena toolbar.

### 🏆 Match Settlement & Victory Loop
- **Game Over Freeze & Victory Modal**: Halts physics simulation upon King elimination, displays animated match settlement modal with turns, duration, damage metrics, and Elo change.
- **FIDE Elo Calculation**: Upgraded `backend/database.py` from static $\pm16$ points to the standard FIDE Elo rating formula with $K=32$ and appropriate draw settlement.
- **Persistent Match Logging**: Client now automatically calls `POST /api/matches/record` and `POST /api/telemetry` to persist games and live stats into SQLite.

### ⚛️ Signature Piece Codex Abilities in Physics Solver
- **Knight (*Kinetic Shockwave*)**: Radial concussive knockback on nearby enemy pieces upon collision.
- **Rook (*Fortified Siege Breaker*)**: Deals 2.5x momentum-scaled damage to lighter pieces and resists reverse knockback.
- **Bishop (*Prism Velocity Surge*)**: Rebounds off perimeter cushions with a +15% velocity boost (capped at max speed).
- **Queen (*Supernova Discharge*)**: Extra explosive splash damage and gold particle blast on high-velocity collisions ($v > 6.5$).
- **King (*Bastion Aura*)**: Grants 35% damage mitigation to adjacent friendly pawns within 85px.
- **Pawn (*Coordinated Deflection*)**: Enhanced phalanx stability when grouped.

### 🔊 Audio & Persistence Enhancements
- **Procedural Shatter FX**: Added `playShatter()` Web Audio synthesis for piece eliminations.
- **LocalStorage Preferences**: Client persists game mode, board theme, piece theme, and audio mute settings across browser sessions.
- **Logger Deduplication**: Process-cached `RunXX` discovery in `backend/logger.py` to prevent redundant run folder proliferation during test runs, with dynamic ISO-8601 timestamps.

---

## [2.0.0] - 2026-09-09

### 🏛️ Professional Codebase Restructuring
- **Root Directory Cleanup**: Reduced root to the bare minimum 4 files (`run.py`, `requirements.txt`, `README.md`, `.gitignore`).
- **Directory Modularization**:
  - `backend/`: Application server, database queries, and tracker logger.
  - `data/`: Persistent storage (`data/archess.db`).
  - `docs/`: Comprehensive technical documentation (`TRACKER.md`, `ARCHITECTURE.md`, `CHANGELOG.md`).
  - `templates/`: Multi-page HTML templates (`index.html`, `play.html`, `arsenal.html`, `leaderboard.html`).
  - `static/`: Categorized static assets (`static/css/`, `static/js/`, `static/media/`).
- **Backward-Compatible Routing**: Configured fallback routes in `backend/app.py` for `/style.css`, `/main.js`, `/auth.js`, `/game.js`, and `/assets/...` to eliminate any 404 risk from cached client sessions.

### 🎬 Media & Video Integration
- **User Video Integration**: Replaced generic reference footage with the user's authentic video `"C:\Users\mohda\Python Codes\Archess\static\Chess_pieces_colliding_on_boad.mp4"`.
- **Widescreen Video Hero**: Embedded full-width video background (`1280x560`, H.264) with `82%` opacity, enhanced contrast, and a dark vignette gradient to ensure optimal foreground text legibility.
- **Video Pill Control**: Added a discrete glassmorphic button (`#videoControlBtn`) allowing users to pause and resume the background cinematic.

### 🛠️ Critical Bug Fixes
- **CSS Syntax & UI Realignment**:
  - *Root Cause*: An unclosed brace `}` in `style.css` on `body::after` at line 85 caused the browser parser to treat all subsequent rules as invalid nested elements inside a pseudo-element.
  - *Fix*: Closed `body::after` and validated that 100% of braces across the stylesheet are balanced.
- **Top Empty Space Elimination**:
  - *Root Cause*: `#bgMotionCanvas` lacked `position: fixed;` and had dynamic screen dimensions, causing it to sit in normal document flow and create a 100vh blank void above `<main>`.
  - *Fix*: Assigned `#bgMotionCanvas` to `position: fixed; inset: 0; pointer-events: none; z-index: 0;`.
- **Navbar Controls Alignment**:
  - Added `#navAuthContainer { display: flex; align-items: center; gap: 10px; }`.
  - Styled `.btn-audio-toggle` as a circular disc with hover animations.
  - Added `white-space: nowrap;` to `.btn-gold` and `.btn-ghost` to prevent text wrapping on smaller viewports.

### ♟️ Feature Enhancements
- **Side Expansion Menu Drawer**: Slide-out panel from the right with quick-links (`01 Tactical Arena`, `02 Chess Themes`, `03 Piece Codex`, `04 Rankings & Ladder`).
- **Dedicated Chess Themes Showcase**: Added `#themesSection` with visual 4x4 interactive chessboard previews for *Midnight Obsidian*, *Woodland Walnut*, and *Ivory Classical*.
- **Theme URL Parameter Engine**: Visiting `play.html?theme=woodland` auto-activates the Woodland board theme.
- **Homepage De-cluttering**: Completely removed the leaderboard table from `index.html` to maintain a minimalist, focus-driven presentation.

---

## [1.5.0] - 2026-09-09

### Added
- **Multi-Page Architecture**: Split the monolithic single page into dedicated views:
  - `play.html`: Focused 32-piece game arena.
  - `arsenal.html`: Interactive piece stat inspector.
  - `leaderboard.html`: Full global Grandmaster rankings ladder.
- **Flask REST API Server**: Added endpoints for `/api/health`, `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/leaderboard`, `/api/matches/record`, and `/api/telemetry`.
- **SQLite Database Layer**: Persistent storage for user accounts, password hashing, ELO tracking, and match logs.
- **Tracker-Compliant Logging Engine**: Automatic discovery of `Logs/YYYY/MMM/DD_Logs/RunXX/app.log`.

---

## [1.0.0] - 2026-09-09

### Added
- Initial project prototype featuring single-page physical chess variant demo with canvas-based piece launching.
