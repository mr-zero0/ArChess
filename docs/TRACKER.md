# ArChess — Product, Engineering & Verification Tracker

**Repository:** `mr-zero0/ArChess`  
**Current Development Mode:** 2D Tactical & 3D Isometric Hybrid Physical Chess  
**Standard Logging Policy:** `Logs/YYYY/MMM/DD_Logs/RunXX/app.log` (1 application process = 1 `RunXX`)  
**Architecture Policy:** Bare-minimum root files (`run.py`, `requirements.txt`, `README.md`, `.gitignore`), modular subdirectories (`backend/`, `data/`, `docs/`, `templates/`, `static/`).

---

## 📊 1. Progress Dashboard

### Status Summary
- **Overall Completion:** 100%
- **Backend Services:** Operational (Flask, SQLite, FIDE Elo Formula, Session Auth, REST APIs, Tracker Logging)
- **Frontend Pages:** Fully Styled & Modularized (Landing, Tactical Arena, Piece Codex, Rankings Ladder)
- **Gameplay Engine:** 32-Piece Physics, 6 Codex Signature Abilities, Autonomous Bot AI, Victory Settlement Modal

| Feature / Milestone | Category | Status | Verification Snapshot |
| :--- | :--- | :--- | :--- |
| **Clean Root Architecture** | Engineering | ✅ COMPLETE | Root has only 4 files; all code in `backend/`, `static/`, `templates/`, `data/` |
| **Comprehensive Docs Suite** | Documentation | ✅ COMPLETE | `docs/TRACKER.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md` maintained |
| **Multi-Design System (v2.9.0)** | UI / Design Systems | ✅ COMPLETE | 6 switchable UI design languages (`glassmorphism`, `neobrutalism`, `minimal`, `ios-native`, `material3`, `dark-premium`) with `localStorage` persistence & pre-hydration |
| **Bento Grid Architecture (v2.9.0)** | UI / Layout | ✅ COMPLETE | Apple-style modular card layouts integrated across Landing (`#bentoShowcaseSection`), Piece Codex (Bento Hero & specs), and Leaderboard (Top 3 Podium) |
| **Global Design Picker Modal (v2.9.0)** | UI / UX | ✅ COMPLETE | Interactive `#designPickerModal`, nav toggle button, drawer integration, and Grandmaster Atelier customizer on `/play` |
| **Full Subpage CSS Coverage** | Design System | ✅ COMPLETE | Zero missing selectors across `play.html`, `arsenal.html`, and `leaderboard.html` |
| **Full-Width Video Hero** | UI / Media | ✅ COMPLETE | Embedded `Chess_pieces_colliding_on_boad.mp4`, full width, vignette overlay |
| **Side Expansion Drawer** | Navigation | ✅ COMPLETE | `#sideExpansionDrawer` with `#sideMenuToggleBtn`, smooth slide-out & backdrop blur |
| **Dedicated Theme Showcase** | UI / Gameplay | ✅ COMPLETE | `#themesSection` featuring Midnight, Woodland, Ivory with mini-board previews |
| **Theme Parameter Engine** | Gameplay | ✅ COMPLETE | `play.html?theme=woodland` auto-activates board theme & persists in `localStorage` |
| **Autonomous Bot AI** | AI Engine | ✅ COMPLETE | Tactical vector targeting (King/Queen priority) with animated aim preview |
| **6 Signature Piece Abilities** | Physics Engine | ✅ COMPLETE | Shockwave, Siege Breaker, Prism Surge, Supernova, Bastion Aura, Coordinated Deflection |
| **Unified React Chessboard 2D System** | UI / Gameplay | ✅ COMPLETE | Both **2D Arena** (ArChess combat variant with piece HP, tactical strikes, floating damage numbers, and abilities) and **2D Classic** (standard FIDE rules) operate seamlessly on the exact same `react-chessboard` theme and piece set |
| **3-Way View Selector** | UI / Gameplay | ✅ COMPLETE | Seamless 3-way toggle between **3D Arena** (isometric tabletop combat), **2D Arena** (ArChess combat variant on React Chessboard), and **2D Classic** (traditional FIDE chess on React Chessboard) |
| **react-chessboard 2D Full Playability**| UI / Gameplay | ✅ COMPLETE | Migrated to `react-chessboard@5` `options` object API with `onPieceDrop`, `onSquareClick`, `canDragPiece`, responsive sizing, sound FX, Bot AI moves, and casualties sync |
| **3D Arena Natural Tabletop Overhaul** | Physics / UI | ✅ COMPLETE | Increased pitch from flat `0.58` to natural `0.68`, centered board offset, refined shadow ellipses, and removed 16 duplicate top/right coordinate labels |
| **UI Streamlining & Redundancy Removal**| UI / UX | ✅ COMPLETE | Removed redundant piece style pill picker from toolbar; removed redundant kinetic special abilities static card from sidebar; harmonized layout |
| **Staunton Vector Pieces** | UI / Gameplay | ✅ COMPLETE | Authentic handcrafted vector pieces (King, Queen, Rook, Bishop, Knight, Pawn) with specular highlights |
| **Square Board Geometry** | UI / Gameplay | ✅ COMPLETE | True 1:1 square ratio, beveled luxury frame, 3D extruded physical slab, and A-H / 1-8 coordinates |
| **Casualties Graveyard** | UI / Gameplay | ✅ COMPLETE | Removed move log UI; added real-time fallen pieces rack & material advantage balance |
| **Automated Log Cleanup** | Observability | ✅ COMPLETE | Automated log retention engine in `logger.py` with daily run caps and size limits |
| **Git Exclusion for Logs** | Security / VCS | ✅ COMPLETE | `Logs/` and `logs/` added to `.gitignore` to prevent committing execution logs |
| **Victory Settlement Loop** | Gameplay | ✅ COMPLETE | Game over freeze, victory modal, and live FIDE Elo settlement via `/api/matches/record` |
| **Structured Logging Standard** | Observability | ✅ COMPLETE | Process-cached `RunXX` discovery with dynamic ISO-8601 timestamps |
| **Audio Shatter Synthesis** | Sound FX | ✅ COMPLETE | Procedural marble shatter burst upon piece elimination + mute persistence |
| **Global Widescreen Sizing System** | Design System | ✅ COMPLETE | Scaled arena from 720px to 960px/1040px with responsive board zoom controls (70%-130%) |
| **Insufficient Material / Draw Engine**| Gameplay Engine | ✅ COMPLETE | Deadlock detection when all non-King pieces fall; records official draws with 0 Elo delta |
| **Single-Sided Depletion Auto-Pass** | Gameplay Engine | ✅ COMPLETE | Auto-passes turn when one player has 0 mobile pieces, allowing enemy siege to conclude |
| **2D React Chessboard Modal Parity** | UI / Gameplay | ✅ COMPLETE | Aligned victory/stalemate modal IDs and dynamic user session mapping for 2D Arena/Classic |
| **Live Commander Profile Sync** | UI / Auth | ✅ COMPLETE | Seamless navbar and match card commander name/ELO sync upon login and logout |
| **Leaderboard Draw Ledger & Win Rate**| UI / Rankings | ✅ COMPLETE | Win rate calculated against `matches_played` with full W/L/D match record display |
| **AAA Commercial Design System** | UI / Design | ✅ COMPLETE | Cinzel & Space Grotesk typography, surface-0-3 tokens, specular highlights, glass scrollbars |
| **Tactical Arena HUD Ergonomics** | HUD / Gameplay | ✅ COMPLETE | Animated marching-dash slingshot vector, floating tactical piece inspection HUD, radial turn timer |
| **Grouped Casualty Chips** | UI / Battle | ✅ COMPLETE | Stacked casualty chips (`♟ ×4`, `♞ ×2`) with gold/crimson specular borders |
| **Post-Match Analytics & MVP** | Victory Debrief| ✅ COMPLETE | Match MVP spotlight card, kinetic force output split bar, rolling ELO ticker, one-click match copy |
| **Global Toast & Audio Modulation**| UI / Soundscape | ✅ COMPLETE | Sonner-style frosted glass toast system, organic pitch-modulated procedural audio, skeleton shimmer |
| **7 Synchronized Board Themes** | Gameplay / Themes| ✅ COMPLETE | Midnight, Woodland, Ivory, Tournament Emerald, Cyberpunk Neon, Imperial Bloodstone, Oceanic Abyss |
| **5 Bespoke Piece Sets** | Art / Gameplay | ✅ COMPLETE | Staunton Prestige, Neo Modernist, Cyberpunk Neon, Frosted Crystal, Tournament Mono |
| **Grandmaster Atelier Customizer** | UI / Customization| ✅ COMPLETE | `#appearanceModalBackdrop` with mini-checker swatches, piece glyph cards, cross-mode event bus & storage |
| **Sovereign Awakening & Sudden Death** | Gameplay / Mechanics| ✅ COMPLETE | King becomes mobile with Sovereign Strike when vanguard is depleted; Sudden Death 1v1 replaces stalemates |
| **Slingshot Vector Alignment (v2.7.3)**| Physics / Mechanics| ✅ COMPLETE | Fixed inverted impulse vector in `launchPiece()`; dragging back launches forward toward enemy in 2D & 3D |
| **Dynamic Soundscape Controls (v2.8.0)** | Audio / Soundscape | ✅ COMPLETE | Multi-harmonic marble clacks, cushion boundary thuds, slingshot tension audio, 3 sound profiles, volume slider |
| **Toolbar DOM Hierarchy Fix (v2.8.0)** | UI / Architecture | ✅ COMPLETE | Fixed unclosed `.play-arena-toolbar` div, isolating toolbar from turn indicator and main grid |

---

## 📝 2. Modification Ledger: What Was Modified & Why

| Target File | Modification Details | Engineering Rationale |
| :--- | :--- | :--- |
| **Multi-Design Systems & Bento Grid Architecture (`v2.9.0`)** | • Implemented 6 distinct, switchable UI design languages (`dark-premium`, `glassmorphism`, `neobrutalism`, `minimal`, `ios-native`, `material3`) on `[data-ui-design]` attribute.<br>• Engineered full Bento Grid layout system (`.bento-grid`, `.bento-card`, `.bento-col-12`–`.bento-col-3`, responsive breakpoints) inspired by Apple product marketing.<br>• Replaced basic landing tactical section with high-impact `#bentoShowcaseSection` featuring asymmetrical modular cards, live previews, and kinetic badge pills.<br>• Refactored Piece Codex (`templates/arsenal.html`) with Bento Hero card, telemetry spec matrix, and dynamic 3D kinetic showcase.<br>• Upgraded Rankings Ladder (`templates/leaderboard.html`) with Top 3 Grandmasters Podium Bento Grid (Gold, Silver, Bronze) above the leaderboard table.<br>• Added interactive `#designPickerModal` accessible from navbar (`#navDesignToggleBtn`), side expansion drawer, and Atelier customizer on `/play`.<br>• Added zero-flash pre-hydration script in `<head>` and `localStorage('archess_ui_design')` persistence across all views.<br>• Added `test_ui_design_systems_and_bento_grid` and validated 15/15 unit tests. | • Fulfills user requirements for Glassmorphism, Neobrutalism, Minimal whitespace, iOS native, Material Design 3, Dark premium, and Bento Grid.<br>• Eliminates basic and generic UI aesthetics in favor of a cutting-edge, versatile visual design architecture. |
| **Dynamic Soundscape Engine (`v2.8.0`)** | • Overhauled `ArchessAudio` with Web Audio API master gain node and dynamic volume control (0%–100%).<br>• Synthesized multi-harmonic marble-on-hardwood collision clack (`playImpact`) with piezo transient and dual resonance.<br>• Synthesized low-frequency cushion absorption thud (`playBounce`) with bandpass noise damping.<br>• Added slingshot aiming tension audio (`playTension`) and release snap (`playLaunch`).<br>• Implemented 3 bespoke sound profiles: Grandmaster Marble & Wood, Cybernetic Synthwave, Tournament Classic.<br>• Added master volume slider and acoustic customizer cards to `#appearanceModalBackdrop`.<br>• Fixed unclosed `<div class="play-arena-toolbar">` nesting bug in `templates/play.html`.<br>• Added `test_html_tag_balance` and `test_soundscape_ui_and_audio_elements` to test suite. | • Fulfills roadmap milestone 2: "Dynamic Soundscape Controls".<br>• Eliminates arcade-like synthetic bleeps in favor of authentic tactile physics acoustics.<br>• Restores strict HTML semantic structure across all viewport sizes. |
| **Slingshot Launch Vector (`v2.7.3`)** | • Corrected `piece.vx = Math.cos(angle) * impulse` and `piece.vy = Math.sin(angle) * impulse` in `launchPiece()` in `game.js`.<br>• Removed stray negative signs that inverted velocity by 180° upon release.<br>• Aligned physical velocity vector with visual aiming trajectory line rendered in `drawTrajectory()`.<br>• Bumped client script version in `play.html` to `?v=2.7.3`.<br>• Verified forward trajectory in both 2D and 3D modes via automated headless Chrome CDP tests. | • Resolves user report: "pieces are moving and hitting in opposite direction when dragged and launched hitting self pieces".<br>• Ensures slingshot controls are intuitive and physically accurate across all game modes. |
| **`react-chessboard` Bundle & Component** | • Integrated `react-chessboard` (Clariity) and `chess.js` bundled via `esbuild` into `static/js/react-chessboard-bundle.js`.<br>• Provided responsive sizing, legal move drag-and-drop, valid move indicators, check highlights, Bot AI, and casualty rack sync.<br>• Fixed modal element ID targets and dynamic user session mapping for 2D Arena/Classic victory settlement.<br>• Corrected strike game-over winner calculation to identify draws when insufficient material remains. | • Satisfies user request: "Use this for 2 D chess - https://www.npmjs.com/package/react-chessboard".<br>• Delivers authentic grandmaster-grade 2D chess.<br>• Prevents modal breakage and misattributed victories in 2D mode. |
| **`game.js` &rarr; `static/js/game.js`** | • Overhauled 3D mode: screen-space piece hit-testing eliminates missed clicks on elevated pieces.<br>• Fixed phantom 27px click launches by tracking drag anchors in screen coordinates.<br>• Replaced skewed board-space dragging with isotropic screen aiming & trajectory arrowhead.<br>• Added true 3D perspective depth scaling (`depth = 1 + ny * 0.20`) and elevated dragging (`elevation = 26px`) with dynamic ground shadows.<br>• Added `getBoardLayout()` to enforce strict 1:1 square chessboard geometry.<br>• Replaced unicode glyph emojis with `drawStauntonPiece()` handcrafted vector silhouettes.<br>• Added A-H and 1-8 border coordinates & full 3D beveled slab pedestal.<br>• Added `handleDraw('INSUFFICIENT_MATERIAL')` when non-King vanguard pieces are eliminated on both sides.<br>• Added auto-pass turn transfer when one player has 0 mobile pieces, resolving match deadlock.<br>• Synchronized `updateHUD()` to reflect draw/stalemate and victory banners accurately. | • Resolves user report of "3D mode not working properly".<br>• Fixes distorted rectangular squares and amateur unicode text icons.<br>• Delivers museum-grade luxury Staunton chess aesthetics.<br>• Maintains physical arena boundaries accurately.<br>• Completely eliminates king-only deadlocks. |
| **`style.css` &rarr; `static/css/style.css`** | • Removed obsolete `.telemetry-panel` and `.telemetry-stream` CSS.<br>• Expanded container max-width to `min(1540px, 94vw)` and wide container to `min(1680px, 96vw)`.<br>• Scaled `.arena-canvas-stage` up to `min(960px, calc(100vh - 210px))` with support for 1040px on high-res displays.<br>• Widened match sidebar to 380px.<br>• Scaled preview boards, typography, piece cards, and leaderboard tables for true widescreen presentation.<br>• Added styling for `.victory-banner-badge.draw`. | • Replaces intrusive move log with clean, high-end match status & fallen piece display.<br>• Delivers immersive wide-canvas battlefield.<br>• Supports high-DPI displays. |
| **`play.html` &rarr; `templates/play.html`** | • Completely removed `#telemetryStream` and the live telemetry move log box.<br>• Embedded `#whiteCasualtyRack`, `#blackCasualtyRack`, and `#materialAdvantageBadge`.<br>• Added interactive board zoom controls (70% - 130%) that dynamically resize 2D and 3D engines.<br>• Added player strip IDs (`#whitePlayerName`, `#whitePlayerSub`, `#blackPlayerName`, `#blackPlayerSub`) for live state synchronization. | • Satisfies user requirement to remove move log completely.<br>• Upgrades player ergonomics with real-time material balance and custom zoom. |
| **`auth.js` &rarr; `static/js/auth.js`** | • Added live DOM sync in `renderUserBadge()` and `renderAuthButtons()` to update player cards on `/play`. | • Seamlessly reflects player commander username and Elo rating without page refresh. |
| **`leaderboard.html` &rarr; `templates/leaderboard.html`** | • Updated win rate formula to measure against `matches_played` rather than `wins + losses`.<br>• Added draw match ledger representation (`W / L / D`). | • Ensures draws do not distort player win percentages. |
| **`main.js` &rarr; `static/js/main.js`** | • Replaced `telemetryStream` listener with `arena.onPieceCaptured` and `arena.onResetArena` handlers.<br>• Dynamically populates casualty racks and updates material advantage badge.<br>• Fixed line 398 view-mode check to support resetting 2D matches from victory modal rematch button.<br>• Dynamic black player card label sync between AI and local guest. | • Smooth real-time feedback when pieces are shattered from the board.<br>• Rematch button functions across all 3 view modes. |
| **`logger.py` &rarr; `backend/logger.py`** | • Implemented `cleanup_old_logs(base_logs_dir, retention_days=7, max_runs_per_day=15, max_total_size_mb=30)`.<br>• Integrated automatic cleanup into `setup_logging()`.<br>• Prunes empty parent directories. | • Guarantees run logs cannot accumulate unboundedly on disk. |
| **`.gitignore`** | • Added `Logs/` and `logs/` directory exclusion rules. | • Guarantees local application run logs are never pushed to GitHub. |
| **`tests/test_archess.py`** | • Added unit test `test_cleanup_old_logs_retention` validating log retention, daily run capping, and active run preservation. | • 100% test pass rate across 11 automated test cases. |
| **`style.css` &rarr; `static/css/style.css` (Initial)** | • Closed unclosed `body::after` brace at line 85.<br>• Fixed `#bgMotionCanvas` positioning to `fixed; inset: 0; z-index: 0;`.<br>• Added `.btn-audio-toggle` disc styling & `#navAuthContainer` flex layout.<br>• Added `white-space: nowrap` to `.btn-gold` / `.btn-ghost`.<br>• Centered `.hero-content-layer` flex column. | • Restored entire broken stylesheet cascade that previously broke all containers.<br>• Removed 100vh gap above `<main>`.<br>• Eliminated button text wrapping and misaligned controls. |
| **`index.html` &rarr; `templates/index.html`** | • Embedded user video `Chess_pieces_colliding_on_boad.mp4`.<br>• Added `#sideMenuToggleBtn` and `#sideExpansionDrawer`.<br>• Added dedicated `#themesSection` with 3 chess theme cards.<br>• Removed home leaderboard table.<br>• Relocated asset paths to `/static/...`. | • Satisfies direct user request for custom video and side expansion menu.<br>• De-clutters landing page into a minimalist high-end chess showcase.<br>• Aligns with modular `/templates/` structure. |
| **`app.py` &rarr; `backend/app.py`** | • Configured `template_folder="../templates"` and `static_folder="../static"`.<br>• Added backward-compatible routes for `/style.css`, `/main.js`, `/assets/...`.<br>• Added correlation IDs and structured JSON logging. | • Adheres to bare-minimum root directory policy.<br>• Guarantees zero 404s for any legacy or cached URLs. |
| **`database.py` &rarr; `backend/database.py`** | • Updated `DB_PATH` to `data/archess.db`.<br>• Auto-creates `data/` directory on boot.<br>• Seeded 6 Grandmaster test accounts. | • Separates persistent database storage from application source code. |
| **`run.py`** | • Created minimalist root entrypoint (20 lines). | • Allows running `python run.py` directly from project root. |
| **`game.js` & `play.html` (SVG Fix & Render Loop)** | • Replaced `ring.className = ...` with `ring.setAttribute('class', ...)` on SVG `#turnTimerRing` element in `resetBoard()` and `loop()`.<br>• Guarded `loop()` with `try/catch` and safe `dt` calculation to ensure `requestAnimationFrame` never permanently terminates.<br>• Bumped script query versions in `play.html` from `?v=2.2.0` to `?v=2.6.2` to bust browser caches.<br>• Resolved issue where 2D Arena and 3D Arena boards/pieces were invisible due to SVG className TypeError halting canvas loop. | • Fixes modern browser `TypeError: Cannot set property className of #<SVGElement> which has only a getter`.<br>• Guarantees 100% board and piece visibility in both 3D Arena and 2D Arena modes on initial load and view switching. |
| **Grandmaster Atelier Customizer (`v2.7.0`)** | • Added 7 synchronized board themes (Midnight, Woodland, Ivory, Emerald, Cyberpunk, Bloodstone, Oceanic) to Canvas & React Chessboard.<br>• Added 5 piece sets (Staunton Prestige, Neo Modernist, Cyberpunk Neon, Frosted Crystal, Tournament Mono).<br>• Added `#appearanceModalBackdrop` with mini-checker swatches and piece cards.<br>• Built custom SVG piece renderers and recompiled React Chessboard bundle (`react-chessboard-bundle.js`).<br>• Linked live cross-mode synchronization via `archess_appearance_change` and `localStorage` persistence. | • Fulfills user request for better chess pieces, boards, and diverse themes with open-source options for varied player experiences.<br>• Guarantees seamless real-time visual parity across 3D Arena, 2D Arena, and 2D Classic modes. |
| **Hover HUD Removal (`v2.7.1`)** | • Completely removed `#tacticalPieceHoverHUD` and all mousemove piece distance calculation loops.<br>• Purged `.tactical-piece-hud` styles from `style.css` and bumped asset version to `?v=2.7.1`.<br>• Verified clean board view with zero hover popups via headless CDP tests. | • Eliminates intrusive 270×170px floating card that was obscuring chessboard squares and pieces when hovering.<br>• Improves rendering performance and preserves pristine board view. |
| **Sovereign Awakening (`v2.7.2`)** | • Added dynamic King Awakening when vanguard is depleted (`speedMulti = 1.35`, `mass = 2.6`, glowing aura).<br>• Rebalanced Fortress Wall from 500 to 280 HP and reduced recoil from 25% to 12%.<br>• Replaced `INSUFFICIENT_MATERIAL` automatic draws with sudden death mobile King duels.<br>• Integrated Bot AI support and updated control hints to `(King: Citadel • 👑 Awakens When Alone)`. | • Fulfills user request to prevent stalemate traps and give both players realistic, equal chances in endgames. |
| **`README.md` & `requirements.txt`** | • Created professional project documentation and dependency manifest. | • Standard open-source onboarding. |

---

## 🔬 3. Verification Snapshot & Test Matrix

### Test Environment
- **Host OS:** Windows 11
- **Python Version:** 3.14.6 (`.venv`)
- **Web Framework:** Flask 3.1.3 / Werkzeug 3.1.8
- **Port:** 5000 (`http://localhost:5000`)

### Verification Matrix
| Test Case | Expected Result | Status | Verification Tool |
| :--- | :--- | :--- | :--- |
| **CSS Syntax Balance** | 0 unclosed braces across stylesheet | ✅ PASS | Python syntax validator |
| **JS Syntax Integrity** | 0 syntax errors across `game.js`, `main.js`, `auth.js` | ✅ PASS | Node `node -c` linter |
| **Log Auto-Pruning Engine** | Purges old runs, enforces daily run caps, protects active run | ✅ PASS | `pytest -k test_cleanup_old_logs_retention` |
| **Git Exclusion Verification** | `Logs/.../app.log` matches `.gitignore` rule | ✅ PASS | `git check-ignore -v Logs/...` |
| **Square Geometry & Vector Pieces** | 1:1 aspect ratio, Staunton vector silhouettes rendered | ✅ PASS | Canvas 2D projection validator |
| **Move Log Removal** | No `#telemetryStream` element in DOM | ✅ PASS | HTTP response inspection |
| **Root Cleanliness** | Exactly 4 files outside subdirectories | ✅ PASS | PowerShell `Get-ChildItem -File` |
| **HTTP Index Page** | Returns HTTP 200 with HTML | ✅ PASS | `curl -sI http://localhost:5000/` |
| **HTTP Video Stream** | Returns HTTP 200 with `video/mp4` | ✅ PASS | `curl -sI http://localhost:5000/static/media/...` |
| **Legacy Asset Fallback** | `/style.css` resolves to static CSS | ✅ PASS | `curl -sI http://localhost:5000/style.css` |
| **API Health Check** | Status `healthy`, version `2.0.0`, active run | ✅ PASS | `curl http://localhost:5000/api/health` |
| **API Leaderboard** | JSON list of Grandmasters sorted by ELO | ✅ PASS | `curl http://localhost:5000/api/leaderboard` |
| **Theme Parameter Hook** | `/play?theme=woodland` selects Woodland board | ✅ PASS | URLSearchParams verification |
| **Structured Logging** | Logs emitted to `Logs/YYYY/MMM/DD_Logs/RunXX/app.log` | ✅ PASS | Log file JSON parser |
| **HTML Tag Balance Validation** | 0 unclosed/mismatched HTML tags across all 4 templates | ✅ PASS | `pytest -k test_html_tag_balance` |
| **UI Design Systems & Bento Grid** | All 6 theme selectors, bento grid classes, nav toggle, and modal elements verified | ✅ PASS | `pytest -k test_ui_design_systems_and_bento_grid` |

---

## 🔮 4. Pending / Next Phase Roadmap

1. **Authoritative Socket Matchmaker (Phase 3)**:
   - WebSocket room clustering with ping-pong latency measurement.
   - Synchronized piece movement with client-side interpolation.
2. **Advanced Replay Viewer**:
   - Turn-by-turn trajectory vector replay with kinetic impulse metrics.
