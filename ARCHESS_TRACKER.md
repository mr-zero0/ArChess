# ArChess Development Tracker

## Current Product Mode: 2D only

## Active branch: `main`

This is a single-branch repository.

## ✅ Completed Features

### Core Gameplay
- [x] Game initialization with proper piece setup
- [x] Piece movement and physics simulation
- [x] Turn-based system (White/Black alternating)
- [x] Collision detection and resolution
- [x] Damage application on collision
- [x] Piece destruction when HP reaches 0
- [x] Victory condition (eliminate all opponent pieces)
- [x] Collision → settle → next turn sequence

### Physics & Simulation
- [x] Authoritative server-client architecture
- [x] Phaser 4 game engine integration
- [x] Cell-based coordinate system
- [x] Proper settling logic (fixed was_active calculation)
- [x] Correct collision event naming (COLLISION_DAMAGE_APPLIED)
- [x] Physics substep processing
- [x] Velocity-based movement with friction/restitution

### Frontend & UI
- [x] React + TypeScript frontend with Vite
- [x] Responsive design implementation
- [x] Fixed piece clipping issue (removed overflow-hidden)
- [x] Fixed text flowing outside board boundaries
- [x] Proper piece positioning with CELL/2 offsets
- [x] Correct HP label and damage text positioning
- [x] Board scale controls moved to left sidebar
- [x] Board scale buttons full-width (w-full)
- [x] Pixel dimension display: {Math.round(640 * boardScale / 100)}×{Math.round(640 * boardScale / 100)}px
- [x] Theme controls full-width (w-full)
- [x] Board theme options: Midnight, Woodland, Ivory, Outline, Mono
- [x] Piece theme options: Classic, Outline, Mono

### Testing & Quality
- [x] Backend tests: 125 passed, 0 failed, 17 skipped
- [x] Frontend tests: 49 passed, 0 failed
- [x] Test fixes:
  - Fixed test assertions in test_game_state_observability.py
  - Added database initialization in conftest.py
  - Fixed JSX syntax errors in App.tsx
  - Fixed theme control options completeness

### Code Quality & Maintenance
- [x] Fixed settling logic in game/physics/authoritative.py
- [x] Fixed was_active calculation using GAME_CONFIG["minVelocity"]
- [x] Fixed collision event name from "COLLISION_DAMAGE" to "COLLISION_DAMAGE_APPLIED"
- [x] Fixed test assertion patterns (event_args, event_kwargs)
- [x] Resolved JSX syntax errors preventing dev server startup
- [x] Cleaned up duplicate and incomplete theme controls
- [x] Verified all backend (125/125) and frontend (49/49) tests pass

## 🚧 In Progress
- None - all requested features implemented and verified

## 📋 Verification Summary
✅ All backend tests pass (125/125)
✅ All frontend tests pass (49/49)
✅ Development server starts successfully
✅ UI issues resolved:
   - Pieces no longer clipped in boxed area
   - Responsiveness fixed - text no longer flowing outside board boundaries
   - Board scale controls properly positioned in sidebar
   - Theme controls have all required options
   - Proper cell-centered coordinate system for piece positioning
- [x] UI/UX Refactor:
   - Created reusable UI components (Button, Card) in `frontend/src/components/ui/`
   - Refactored `SettingsModal` to use standardized UI components
   - Fixed structural nesting issues in `App.tsx` (fixed AnimatePresence/modal rendering)
   - Cleaned up global CSS in `styles.css` and began migration to modular Tailwind components
