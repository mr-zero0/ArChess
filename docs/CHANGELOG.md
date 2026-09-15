# ARCHESS — Changelog & Iteration History

All notable changes, architectural pivots, bugfixes, and refactorings across **ArChess** are documented in this file.

## [3.6.0] - 2026-09-15

### 🎮 Realistic 3D WebGL Game Engine & Immersive Visual Overhaul
- **Realistic 3D WebGL Engine (`static/js/engine3d.js` & Three.js v0.186.0)**:
  - Bundled modern Three.js and OrbitControls locally into `static/js/three.min.js` (zero external CDN dependencies).
  - Procedurally modeled all 6 official Staunton chess piece geometries (King with Imperial Crown & Sovereign Cross, Queen with 10-point Coronet & Royal Orb, Rook with 4-Crenelated Ramparts, Bishop with Slotted Mitre, Knight with Horsehead & Mane, Pawn with Spherical Head).
  - Physically-Based Rendering (PBR) materials with Alabaster Ivory & Polished Maple (White Army), High-Gloss Obsidian Onyx & Smoked Ebony (Black Army), Burnished Gold accents (`roughness: 0.20, metalness: 0.92`), and Crimson metal highlights.
  - Multi-tier wooden chessboard slab with Mahogany outer frame, Brass inlay perimeter border, and dark/light procedural wood grain textures.
  - Cushion perimeter rails providing authentic visual boundaries for kinetic piece bounces.
- **Studio Lighting & Soft Contact Shadows**:
  - Main Key Directional Light (`1.4x` intensity) with `PCFSoftShadowMap` rendering soft realistic shadows beneath pieces and rails.
  - Warm Ambient Fill Light (`0.75x`) and Cool Accent Fill Light (`0.55x`) preventing flat dark areas.
  - Dramatic overhead spotlight focusing on the active combat grid.
- **Dynamic 3D Slingshot Aiming & Interaction**:
  - Raycaster-based 3D piece picking with smooth vertical lift on drag.
  - Illuminated golden marching-dash trajectory ribbon, directional arrowhead cone, and rotating power reticle that shifts to radiant red at peak impulse.
  - Velocity-based dynamic piece tilting and inertia along the velocity vector during slides and collisions.
- **3D King Citadel Forcefield & Sovereign Awakening**:
  - Hexagonal crystalline forcefield barrier surrounding the King while Citadel HP remains active, with dynamic opacity scaling to reflect remaining barrier integrity.
- **Interactive Orbit Camera with Presets**:
  - Integrated `OrbitControls` with smooth damping and table tilt limits (right-click or middle-click drag to orbit freely without interfering with left-click slingshot drag).
  - Preset camera angles accessible via header toolbar: **Tabletop**, **Cinematic**, and **Overhead (Tactical)** with one-click **↺ Reset**.
- **2D Aesthetic Enhancements**:
  - Added contact drop shadow ellipses beneath pieces in 2D Arena mode for improved depth.
- **Automated Verification**:
  - 100% test pass rate across all 84 test cases with 100% statement and branch coverage strictly maintained.

---

## [3.5.1] - 2026-09-15

### 🧪 100% Test Coverage & Authoritative Engine Hardening
- **Comprehensive Automated Test Coverage**:
  - Achieved **100% statement coverage** (1,176 / 1,176 statements) and **100% branch coverage** (374 / 374 branches) across all backend modules and application entrypoints:
    - `backend/__init__.py`: 100%
    - `backend/achievements.py`: 100%
    - `backend/app.py`: 100%
    - `backend/database.py`: 100%
    - `backend/logger.py`: 100%
    - `backend/multiplayer.py`: 100%
    - `backend/notation.py`: 100%
    - `backend/tournament.py`: 100%
    - `run.py`: 100%
  - Total **84 automated test cases** passing with 0 failures, 0 skipped.
- **WebSocket Route Binding Rectification (`backend/app.py`)**:
  - Addressed `flask-sock`'s `@sock.route` decorator behavior which returned `None` in the module namespace, ensuring `ws_combat` remains callable and directly testable while properly registering the `/ws/combat/<room_id>` WebSocket route.
- **Arena Physics & Combat Hardening (`static/js/game.js`)**:
  - Clamped piece and wall collision recoil damage with `Math.max(0, ...)` preventing negative HP under extreme kinetic strikes.
  - Optimized pairwise collision loops to immediately skip eliminated pieces.
- **Dependency & Build Pipeline**:
  - Added `coverage>=7.6.0` and `pytest-cov>=6.0.0` to `requirements.txt`.
  - Added `.coverage` and `htmlcov/` to `.gitignore`.

---

## [2.9.0] - 2026-09-13

### 🎨 Multi-Design Systems & Bento Grid Architecture
- **6 Bespoke UI Design Languages (`data-ui-design`)**:
  - 🔮 **Glassmorphism**: Frosted glass effects, deep `backdrop-filter: blur(16px)`, translucent surfaces (`rgba(15, 23, 42, 0.45)`), and luminous 1px perimeter borders (`rgba(255, 255, 255, 0.18)`).
  - 💥 **Neobrutalism**: Thick 3px solid borders (`#000`), hard 5px offset drop shadows (`5px 5px 0px #000`), high-contrast cyber pop accents (electric yellow, cyan, hot magenta), and a raw, confident retro feel.
  - 🕊️ **Minimal with Generous Whitespace**: High-end editorial aesthetic with doubled padding, spacious gaps, crisp hairline dividers, quiet typography, and zero visual clutter.
  - 🍏 **iOS Native**: Adheres to Apple's Human Interface Guidelines (HIG) with San Francisco font styling, 24px squircle card radii, segmented pill switches, subtle vibrancy, and system blue accents.
  - 📱 **Material Design 3 (MD3)**: Google Material You dynamic color scheme, tonal surface containers (`#1d1b20`, `#2b2930`), 28px pill contours, and tactile state layers.
  - 👑 **Dark Premium**: Deep obsidian noir canvas (`#050811`), subtle radial vignette gradients, metallic gold and silver foil accents, and Cinzel serif typography.
- **🍱 Apple-Style Bento Grid Architecture**:
  - Engineered modular CSS Bento Grid layout engine (`.bento-grid`, `.bento-card`, `.bento-col-12` through `.bento-col-3`, `.bento-row-2`, `.bento-stat-cluster`, `.bento-badge-row`).
  - **Landing Page (`templates/index.html`)**: Replaced basic tactical section with `#bentoShowcaseSection`, presenting asymmetric modular cards, kinetic ability badges, live preview board, and tactical telemetry.
  - **Piece Codex (`templates/arsenal.html`)**: Upgraded piece inspector into a responsive Bento Grid layout featuring Bento Hero showcase, vector kinetic metrics, and deployment tactics.
  - **Rankings Ladder (`templates/leaderboard.html`)**: Added Top 3 Grandmasters Podium Bento Grid (Gold, Silver, Bronze) highlighting commander avatars, win rates, and Elo ratings.
- **🎛️ Universal Design Switcher Modal & Controls**:
  - Added global Design Picker Modal (`#designPickerModal`) with interactive design cards, live color swatch strips, and instant preview.
  - Added navigation header switcher button (`#navDesignToggleBtn`) and side expansion drawer UI Design section across all pages.
  - Added dedicated UI Design Language customizer panel in Grandmaster Atelier modal on `/play`.
  - Added zero-flash pre-hydration script in `<head>` to immediately apply saved preference before render.
  - Persisted user preference via `localStorage('archess_ui_design')` and Sonner toast confirmations.
- **🧪 Automated Verification**:
  - Added `test_ui_design_systems_and_bento_grid` in `tests/test_archess.py`.
  - 100% test pass rate across 15 automated test cases.

---

## [2.8.0] - 2026-09-12

### 🎵 Dynamic Soundscape Engine & Grandmaster Acoustic Customizer
- **Physical Web Audio Synthesis (`ArchessAudio`)**:
  - Overhauled procedural audio architecture with a dedicated `masterGainNode` connected to `AudioContext.destination` enabling real-time volume modulation.
  - **Multi-Harmonic Marble Clack (`playImpact`)**: Synthesized authentic physical collision acoustic modeling combining a 3.6kHz piezo transient impact click with dual-resonant ceramic body overtones (640Hz fundamental + 1380Hz harmonic overtone with Q=4.5) scaled dynamically by collision velocity and piece momentum.
  - **Cushion Rail Boundary Thud (`playBounce`)**: Engineered low-frequency acoustic perimeter dampening (135Hz exponential drop to 45Hz) with a 260Hz low-pass cushion compression puff simulating elastic rail absorption.
  - **Slingshot Drag Tension (`playTension`)**: Added tactile power strain feedback audio that smoothly rises in pitch as the player pulls back the slingshot band during aiming.
  - **Slingshot Impulse Snap (`playLaunch`)**: Authentic mechanical elastic snap and piece slide whoosh.
  - **Sovereign King Awakening (`playAwakening`)**: Regal multi-part fanfare chord (G3, D4, G4, B4) with shimmering harmonic decay when the Citadel King awakens into mobile combat.
- **3 Bespoke Soundscape Profiles**:
  - 🏛️ **Grandmaster Marble & Wood**: Polished heavyweight marble piece collisions with dense felt-backed hardwood cushion dampening (default).
  - ⚡ **Cybernetic Synthwave**: Frequency-modulated (FM) carrier synthesizer, resonant deflector shield pings, and neon impulse surges.
  - 🏆 **Tournament Classic**: Crisp, dry mechanical Staunton wood piece taps and subtle tournament boundary knocks.
- **Grandmaster Atelier Soundscape Controls**:
  - Embedded **Tactical Soundscape & Physical Acoustics** panel into `#appearanceModalBackdrop`.
  - Added interactive gold Master Acoustic Volume slider (`0%` to `100%`) with real-time numeric badge feedback and `localStorage` persistence.
  - Added soundscape profile switcher cards with one-click **Test Clack** and **Test Cushion** preview buttons.
  - Synchronized mute toggle (`#audioToggleBtn`) and volume controls with both Canvas Arena and React Chessboard.

### 🛡️ Template Architecture: Toolbar DOM Hierarchy Bugfix
- **Isolated Toolbar Element**: Resolved a critical layout nesting bug in `templates/play.html` where `<div class="play-arena-toolbar">` lacked a closing tag, accidentally trapping the turn indicator bar, board resize strip, and the main canvas arena stage inside the flexbox toolbar.
- **Automated HTML Tag Validation**: Added `test_html_tag_balance` in `tests/test_archess.py` ensuring zero unclosed or mismatched tags across all templates (`templates/*.html`).
- **Cache Busting**: Bumped all frontend script query strings in `templates/play.html` to `?v=2.8.0`.

---

## [2.7.3] - 2026-09-11

### 🎯 Physics Engine: Slingshot Impulse Vector & Forward Trajectory Alignment
- **Fixed Inverted Launch Impulse**:
  - Corrected `piece.vx` and `piece.vy` in `launchPiece()` in `static/js/game.js`:
    ```javascript
    // Restored forward impulse vector matching aim line
    piece.vx = Math.cos(angle) * impulse;
    piece.vy = Math.sin(angle) * impulse;
    ```
  - Previously, stray negative signs (`-Math.cos(angle)`, `-Math.sin(angle)`) inverted the 180° trajectory upon release, causing pieces to shoot backward into self pieces instead of launching forward toward the enemy.
- **100% Vector Alignment in 2D & 3D**:
  - Aligned physical launch impulse with visual aiming dotted line rendered in `drawTrajectory()`.
  - In both 2D and 3D isometric perspectives, dragging backward now pulls the slingshot band and launches the piece forward across the board into enemy lines.
- **Automated Physical Trajectory Verification**:
  - Validated with Chrome headless CDP automated tests simulating user drag-and-release on pawn e2 in both 2D Arena and 3D Arena modes, confirming `vy < 0` (forward trajectory toward Black) and `movingTowardsEnemy: true`.
- **Cache Busting**:
  - Bumped client asset query string in `templates/play.html` to `?v=2.7.3`.

---

## [2.7.2] - 2026-09-11

### 👑 The Sovereign Awakens: Dynamic King Mobility & Sudden Death Duels
- **King Awakening Mechanic**:
  - When all vanguard (non-King) pieces of a side are eliminated, that side's King immediately **AWAKENS** (`awakened = true`, `immovable = false`).
  - The King's stationary anchor is released, and its Fortress Wall dissolves into pure combat energy.
  - An Awakened King becomes fully mobile with enhanced agility (`speedMulti = 1.35`), heavy colossus mass (`mass = 2.6`), and a pulsating radiant aura ring (gold for White, crimson for Black).
- **Sovereign Strike Combat Power**:
  - Awakened Kings deal crushing physical collision damage (`Math.max(35, primaryDamage * 1.5)`) with momentum-scaled screen shake and concussive particle bursts, enabling solo Kings to fight back and clutch out comebacks against enemy remnants.
- **Sudden Death Sovereign Showdown (Zero Stalemate Trap)**:
  - Completely replaced the automatic `INSUFFICIENT_MATERIAL` stalemate trap with an epic **Sudden Death Duel** when both armies have 0 vanguard pieces remaining.
  - Both Kings duel across the open arena with equal realistic chances, taking turns to aim, bank shots off cushions, and strike until one King triumphs.
- **Fortress Wall & Recoil Rebalance**:
  - Rebalanced King Fortress Wall HP from **500** down to **280** HP, allowing offensive pieces to breach the citadel in 2-3 solid strikes.
  - Reduced attacker recoil self-damage formula from 25% + 1.6× to 12% + 0.5×, preventing attacking pieces from suiciding prematurely against stone walls.
- **Bot AI & Control Hints Integration**:
  - Upgraded Bot AI in `executeBotTurn()` to recognize and launch with its Awakened King.
  - Updated arena HUD prompt to display `👑 SOVEREIGN STRIKE!` and `⚡ SUDDEN DEATH DUEL!`.
  - Updated control badge in `templates/play.html` and `static/js/main.js` to `(King: Citadel • 👑 Awakens When Alone)`.

---

## [2.7.1] - 2026-09-11

### 🧹 UI Ergonomics: Complete Removal of Floating Piece Hover HUD
- **Removed Hover Popup**: Completely removed `#tacticalPieceHoverHUD` and all mousemove hover inspection tracking across the canvas, preventing floating 270×170px tooltips from obstructing the chessboard and pieces.
- **Enhanced Canvas Performance**: Eliminated frame-by-frame distance calculations across all 32 pieces during idle mouse movement, reducing CPU overhead during aiming.
- **Cleaned Styles & Assets**: Purged `.tactical-piece-hud` styles and child selectors from `static/css/style.css`, and bumped script query strings in `templates/play.html` to `?v=2.7.1`.
- **Verified Clean Board View**: Validated through headless Chrome CDP tests that hovering over rank 1-8 produces no DOM elements or visual popups, leaving the board 100% clean and unobstructed.

---

## [2.7.0] - 2026-09-11

### 🎨 Grandmaster Atelier Customizer: 7 Board Themes & 5 Piece Sets
- **7 Synchronized Board Themes**:
  - `Midnight Obsidian`: Slate-indigo luxury with gold inlay (default).
  - `Woodland Walnut`: Traditional polished walnut and warm maple grain.
  - `Ivory & Steel`: Neoclassical platinum marble with cool titanium borders.
  - `Tournament Emerald`: Official USCF/FIDE green & buff vinyl tournament standard.
  - `Cyberpunk Neon`: Synthwave dark abyss with electric cyan & magenta laser grid.
  - `Imperial Bloodstone`: Velvet crimson & garnet obsidian with burnished brass accents.
  - `Oceanic Abyss`: Deep navy & seafoam pearl with bioluminescent aqua borders.
- **5 Bespoke Piece Sets**:
  - `Staunton Prestige`: Mastercrafted vector silhouettes with specular crowns (open-source Colin M.L. Burnett inspired).
  - `Neo Modernist`: Minimalist high-contrast geometric silhouettes for maximum competitive clarity.
  - `Cyberpunk Neon`: Dual-stroke illuminated energy wireframes with neon glow filters.
  - `Frosted Crystal`: Translucent glass aesthetic with caustic highlights and rim lighting.
  - `Tournament Mono`: Stark high-contrast monochrome silhouettes (Lichess/FIDE style).
- **Grandmaster Atelier Customizer Modal**:
  - Added `#appearanceModalBackdrop` with live mini-checker swatches and piece glyph cards.
  - Added `btn-customizer-trigger` (`[+ More]`) to the tactical arena toolbar.
  - Live cross-mode synchronization across **3D Arena**, **2D Arena**, and **2D Classic** (React Chessboard).
  - Full persistence via `localStorage` keys `archess_board_theme` and `archess_piece_theme`.
- **Landing Page Showcase**:
  - Expanded `#themesSection` from 3 to 6 rich showcase cards featuring live mini-board previews with piece glyphs.
- **Rebuilt React Chessboard Production Bundle**:
  - Updated `Archess2DChess.jsx` with custom piece SVGs, new color palettes, and `archess_appearance_change` event bus listener; recompiled `static/js/react-chessboard-bundle.js`.

---

## [2.6.2] - 2026-09-11

### 🛡️ 3D & 2D Arena Canvas Rendering Loop Resilience & SVG Fix
- **Fixed SVG className Exception**: Resolved a critical modern browser issue where assigning `ring.className = ...` on the SVG `<circle id="turnTimerRing">` element threw `TypeError: Cannot set property className of #<SVGElement> which has only a getter`. Replaced with standard `ring.setAttribute('class', ...)` in both `loop()` and `resetBoard()`.
- **Render Loop Exception Resilience**: Wrapped the canvas drawing and physics loop in `try / catch` with safe `dt` guard (`if (!this.lastTime) this.lastTime = timestamp;`) ensuring transient rendering errors never permanently halt the `requestAnimationFrame` loop.
- **Cache-Busting Assets**: Bumped script query parameters in `templates/play.html` to `?v=2.6.2` to ensure client browsers immediately pull updated JavaScript bundles.
- **Verified Full Visual Parity**: Confirmed via Chrome headless CDP inspection and screenshots that **3D Arena** (isometric tabletop), **2D Arena** (kinetic combat top-down), and **2D Classic** (official FIDE rules) render all 32 pieces, boards, and UI elements with 100% fidelity.

---

## [2.6.0] - 2026-09-11

### 👑 AAA Commercial-Grade Design System & Typography Suite
- **Cinzel & Space Grotesk Font Suite**: Integrated Google Fonts (`Cinzel`, `Space Grotesk`, `Outfit`, `JetBrains Mono`) across all views (`index.html`, `play.html`, `arsenal.html`, `leaderboard.html`), elevating ArChess from a portfolio prototype to a commercial gaming portal.
- **Surface Elevation Hierarchy**: Added CSS tokens `--surface-0`, `--surface-1`, `--surface-2`, `--surface-3` with specular edge lighting (`--specular-edge`) and luxury metallic gradients (`--gold-metallic`, `--crimson-metallic`, `--silver-metallic`).
- **Glassmorphic Micro-Scrollbars**: Replaced standard browser scrollbars with custom 6px sleek translucent gold tracks and pill thumbs.

### 🎯 Tactical Arena Ergonomics & HUD
- **Animated Marching-Dash Trajectory**: Upgraded slingshot aiming with dynamic `lineDashOffset` marching animation and a pulsating kinetic beacon on high-power aim vectors.
- **Floating Tactical Inspection HUD**: Implemented `#tacticalPieceHoverHUD` rendering live archetype cards with animated durability health bars (color-coded green/amber/red), unit roles, and ability descriptions.
- **Radial Turn Pressure Timer**: Added `#turnTimerRing` SVG countdown circle in `.turn-indicator-bar`, dynamically depleting with warning and critical pulsation.
- **Grouped Casualty Chips**: Overhauled casualty racks to group fallen pieces into sleek chips (`♟ ×4`, `♞ ×2`) with gold/crimson specular borders.

### 🏆 Post-Match Analytics Debrief & Victory Experience
- **Match MVP Spotlight**: Implemented `getMatchMVP(winner)` attributing tactical score based on combat damage dealt and eliminations, featuring custom archetype lore and star badges.
- **Kinetic Force Output Split Bar**: Visual White vs. Black damage distribution chart with percentage breakdown and damage totals.
- **Rolling Animated ELO Odometer**: Dynamic ticker rolling from `+0 ELO` to match settlement delta.
- **One-Click Tournament Match Debrief Copy**: `#btnCopyMatchReport` copies structured ASCII match intelligence report to clipboard.

### 🔔 Game Juice, Procedural Audio & Global Toast System
- **Global Sonner-Style Toast System**: Created `window.ArchessToast` with frosted glass cards, type accents (gold/success/error), icon wrappers, and auto-draining progress bars, replacing raw `alert()` popups.
- **Organic Pitch Modulation**: Synthesized randomized pitch modulations (`±6%`) in Web Audio procedural sound effects (`playImpact()`, `playBounce()`, `playLaunch()`) and added an contemplative E minor 7 chord for stalemates.
- **Directional Screen Shake**: Added momentum-scaled camera shakes upon high-velocity strikes and Queen Supernova discharges.
- **Skeleton Shimmer Loading States**: Embedded shimmering placeholder rows on `/leaderboard` during live database fetches.

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
