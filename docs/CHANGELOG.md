# ARCHESS — Changelog & Iteration History

All notable changes, architectural pivots, bugfixes, and refactorings across **ArChess** are documented in this file.

---

## [2.5.0] - 2026-09-11

### 📐 Global Widescreen UI & Cinema-Scale Arena Overhaul
- **Widescreen Layout Expansion**: Expanded `--container-max` to `min(1540px, 94vw)` and `--container-wide` to `min(1680px, 96vw)`, utilizing modern high-resolution displays.
- **Cinema-Scale Canvas Stage**: Increased `.arena-canvas-stage` from 720px to `min(960px, calc(100vh - 210px))` with support for 1040px on widescreen monitors.
- **Dynamic Board Zoom Controls**: Added responsive zoom controls (70% - 130%) on `/play`, instantly dispatching resize synchronization to both 2D and 3D engines.
- **Expanded Match Sidebar & Typography**: Scaled sidebar to 380px with larger player avatar discs (44px), casualties racks, preview boards, and responsive typography across landing, arsenal, and leaderboard pages.

### ⚖️ Insufficient Material & Draw Engine (King Deadlock Resolution)
- **Dual King Deadlock Resolution**: When all vanguard pieces are eliminated and only Kings remain, `handleDraw('INSUFFICIENT_MATERIAL')` is automatically triggered. Records an official draw via `/api/matches/record` with `+0 ELO`.
- **Single-Sided Vanguard Depletion Auto-Pass**: In `settleTurn`, if the active turn player has 0 mobile pieces but the opponent has remaining pieces, the turn is automatically passed to the opponent so the siege against the Citadel King can conclude without freezing.
- **Turn HUD Synchronization**: `updateHUD()` now reflects match draws and game over states rather than defaulting to active turn prompts.

### ♟️ 2D React Chessboard Modal & Victory Settlement Fixes
- **Modal ID Alignment**: Updated `triggerArchessVictory` in `frontend/src/Archess2DChess.jsx` to target correct victory modal element IDs (`victoryBadge`, `victoryTitle`, `victorySub`, `statTurns`, `statDuration`, `statEloChange`).
- **Arena Strike Draw Determination**: Corrected `executeArenaStrike` game-over logic to distinguish between true checkmates and stalemates/insufficient material draws.
- **Rematch View-Mode Support**: Fixed "Play Again" button in `static/js/main.js` to reset matches in `'2d-arena'` and `'2d-classic'` modes.
- **Typo Fix & Production Build**: Fixed `"ARCHEES BOT"` → `"ARCHESS BOT"` in turn label and rebuilt `static/js/react-chessboard-bundle.js`.

### 👤 Live Commander Profile & Leaderboard Accuracy
- **Live Commander Card Sync**: `renderUserBadge()` and `renderAuthButtons()` in `static/js/auth.js` dynamically sync player name and ELO onto `/play` player cards upon login, registration, and logout without page refresh.
- **Leaderboard Win Rate & Draw Ledger**: Updated win rate formula to divide against `matches_played` rather than `wins + losses`, and added draw tally display (`W / L / D`).

---

## [2.4.0] - 2026-09-10

### ⚔️ 3-Way Mode Architecture: Physics Drag & Launch vs FIDE Classic
- **2D Arena Drag & Launch Physics**: Configured `2D Arena` on the 2D top-down physical canvas engine with full slingshot drag-and-launch, trajectory aim vectoring, rebound cushion collisions, always-visible piece health bars, and numeric durability badges.
- **3D Arena Drag & Launch Physics**: Maintained `3D Arena` on the 3D isometric physical canvas with natural tabletop perspective, elevation hit-testing, and slingshot launch mechanics.
- **2D Classic FIDE Chess**: Dedicated `2D Classic` to `react-chessboard@5.12.1` and `chess.js` for pure, tournament-grade official FIDE chess rules with standard tile movements.
- **Unified Aesthetic Theme**: Harmonized board palettes (Midnight `#1e2632`, Woodland `#8b5a2b`, Ivory `#4f5d75`) and border styling across both canvas physics and React Chessboard engines.

### 🛡️ Security Hardening & Zero-Vulnerability Verification
- **Automated Dependency Auditing**: Passed `npm audit` (0 vulnerabilities) and `pip-audit` (0 known vulnerabilities).
- **SAST Security Scanning**: Passed `bandit` static security analysis across Python backend with 0 issues identified.
- **Interface Binding Hardening**: Bound `run.py` to `127.0.0.1` by default for secure local development while supporting `HOST` environment override.
- **Exception Granularity**: Refined log cleanup handlers in `backend/logger.py` to catch specific `OSError` / `ValueError` rather than broad exceptions.

---

## [2.3.1] - 2026-09-10

### ♟️ 2D Chess Playability Fix (`react-chessboard` v5 API)
- **Migrated to v5 Options Object API**: Fully refactored `<Chessboard options={{ ... }} />` invocation in `frontend/src/Archess2DChess.jsx` to pass props under the `options` key as mandated by `react-chessboard@5.12.1`.
- **Event Signatures Updated**: Converted `onPieceDrop` to destructure `({ piece, sourceSquare, targetSquare })` returning a strict boolean for move validity, and `onSquareClick` to destructure `({ piece, square })`.
- **Drag Permissibility**: Added `canDragPiece` handler allowing players to drag pieces only on their legal turn (`piece.pieceType[0] === game.turn()`) while locking bot turns and game over states.
- **Rebuilt Bundle**: Recompiled `static/js/react-chessboard-bundle.js` with zero errors.

### 🧊 3D Arena Board & Tabletop Perspective Overhaul
- **Spacious Tabletop Pitch (0.68)**: Increased 3D projection pitch from flat `0.58` to natural tabletop `0.68`, eliminating square squashing and piece row occlusion.
- **Single-Border Coordinate Clarity**: Removed the 16 duplicate file/rank labels on the top and right borders; retained standard tournament coordinates (Files `a-h` on bottom border, Ranks `1-8` on left border).
- **Refined Shadow Ellipses**: Adjusted 3D piece contact shadows to `1.05 / 0.44` radii aligned directly at piece bases.

### 🧹 UI Streamlining & 3-Way Arena View Selector
- **Unified React Chessboard 2D System**:
  - **`2D Arena`**: Operates on the exact same `react-chessboard` theme, introducing the ArChess Combat Variant with tactical piece HP (Pawn 45 to King 160), tactical strikes with kinetic abilities (Knight Shockwave, Rook Siege Juggernaut), floating combat damage numbers, and King HP checkmate.
  - **`2D Classic`**: Operates on the exact same `react-chessboard` theme, running traditional standard FIDE chess rules via `chess.js`.
  - **`3D Arena`**: Isometric tabletop physics arena with slingshot vector launching, velocity collisions, HP damage, and abilities.
- **Dynamic Control Hints**: Keyboard and mouse guidance banner dynamically switches between physics slingshot controls and FIDE drag-and-drop / click-to-move based on active mode.
- **Streamlined Arena Toolbar**: Removed redundant Piece Theme pill picker (`Classic / Outline / Mono`) to eliminate toolbar wrapping.
- **De-cluttered Arena Sidebar**: Removed redundant static codex summary card, balancing sidebar height with the board.
- **Cleaned Up Obsolete Selectors & Scripts**: Purged unused `.sidebar-codex-card` CSS rules and obsolete event listeners in `static/js/main.js`.

---

## [2.3.0] - 2026-09-10

### ♟️ Official react-chessboard Integration for 2D Chess
- **react-chessboard & chess.js Integration**: Embedded the official `react-chessboard` (Clariity) and `chess.js` bundled via `esbuild` into `static/js/react-chessboard-bundle.js` for the 2D chess experience.
- **Fluid Drag & Drop and Move Validation**: Standard chess rules, pawn promotions, castling, en passant, and check/checkmate detection with `@dnd-kit` drag-and-drop.
- **Visual Enhancements**: Legal move target dots, last move square highlights in gold, check state in crimson glow, and responsive resizing from 320px to 720px.
- **Bot AI & Pass & Play Synchronization**: Integrated with ArChess's match mode toggle (Solo vs Bot AI / Local Pass & Play) and board themes (Midnight, Woodland, Ivory).
- **Casualty & Settlement Sync**: Synchronized captures with the arena's battle casualties racks (`#whiteCasualtyRack`, `#blackCasualtyRack`), material advantage badge, and victory settlement modal (`/api/matches/record`).
- **Seamless 2D/3D Hybrid Toggle**: Instant switching between 2D Chess (`react-chessboard`) and 3D Isometric (physics battle arena).

---

## [2.2.1] - 2026-09-10

### 🧊 3D Mode Engine Overhaul & Trajectory Alignment
- **Screen-Space Piece Hit-Testing**: Eliminated 3D selection misses by hit-testing pointer events directly against visible elevated piece screen positions (`this.toScreen(p.x, p.y, elevation)`), ensuring instantaneous and 100% accurate piece selection.
- **Accidental Launch Elimination**: Replaced board-space drag tracking with screen-space drag anchors (`dragScreenAnchor`, `dragScreenCurrent`). Initial pointer down delta is exactly 0px, resolving phantom click fires.
- **Isotropic Slingshot Aiming**: Converted screen drag vectors into board space isotropically, ensuring dragging in any direction yields uniform impulse and identical trajectory vector alignment.
- **True 3D Perspective Depth & Slab Pedestal**: Introduced perspective tapering (`depth = 1 + ny * 0.20`), scaling distant pieces (rank 8) narrower and near pieces (rank 1) wider, complete with left, front, and right beveled slab faces with realistic gradient lighting and deep ground shadows.
- **Dynamic Elevated Dragging & Sorting**: Selected dragged pieces lift to `elevation = 26px` with an expanded, soft ground shadow, and are sorted to render above all other pieces on the board.
- **Trajectory Arrowhead & Elliptical Reticle**: Added a forward arrowhead to the aim vector and rendered targeting reticles as tilted perspective ellipses matching the board's 3D pitch.

---

## [2.2.0] - 2026-09-10

### 👑 Luxury Staunton Vector Pieces & Board Geometry Redesign
- **Staunton Vector Silhouette Engine**: Replaced basic unicode font characters with handcrafted, museum-grade Staunton vector paths for all 6 piece types (King, Queen, Rook, Bishop, Knight, Pawn) rendered in HTML5 Canvas with radial gradients, specular highlight arcs, and drop shadows.
- **1:1 Square Chessboard Geometry**: Eliminated rectangular board distortion by calculating dynamic square board dimensions (`boardSize = Math.min(width, height) - 40`) and aligning cell centers and physics collision boundaries.
- **Outer Beveled Frame & Coordinate Markings**: Added an inlaid obsidian/woodland/ivory frame with crisp alphanumeric rank (`1-8`) and file (`a-h`) coordinates along the perimeter.
- **Physical 3D Extruded Board Slab**: In 3D isometric mode, the board now features an extruded physical foundation slab with perspective depth and directional rim lighting.

### 🧹 Complete Move Log Removal & Battle Casualties Rack
- **Eliminated Move Log UI**: Completely removed `#telemetryStream` and the 480px telemetry log panel from `templates/play.html`.
- **Battle Casualties & Material Advantage**: Replaced the log with real-time white/black fallen pieces racks and dynamic material balance indicator (e.g. `+3 White Army`, `Balanced`).
- **Tactical Abilities Summary Card**: Added an in-arena quick reference card highlighting signature kinetic abilities with direct link to the Piece Codex (`/arsenal`).

### 🛡️ Automated Log Retention & Git Protection
- **Automated Disk Cleanup**: Added `cleanup_old_logs()` in `backend/logger.py` with multi-tier pruning: purges runs older than 7 days, caps runs per day to 15, limits total log directory size to 30MB, and prunes empty folders while strictly protecting active runs.
- **Git Protection**: Added `Logs/` and `logs/` to `.gitignore` to guarantee run logs are never tracked or pushed to remote repositories.
- **Automated Test Coverage**: Added `test_cleanup_old_logs_retention` to `tests/test_archess.py` (11/11 automated tests passing).

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
