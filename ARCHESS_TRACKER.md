# ArChess — Product, Engineering & Verification Tracker

**Repository:** mr-zero0/ArChess  
**Branch:** main  
**Release candidate:** 0.5.2  
**Current focus:** post-baseline gameplay verification + UI/renderer hardening

> This tracker distinguishes **implemented**, **verified**, and **pending verification** work. Nothing is marked release-ready until the complete CI gate passes.

## Current Release Gate

| Gate | Status | Evidence / Acceptance |
|---|---|---|
| Python unit/API | VERIFIED | 101 passed in latest completed CI gate before final renderer-architecture changes |
| Browser regression | PENDING | Must pass gameplay, auth, 2D/3D, UI and responsive matrix |
| JavaScript suite | PENDING | Full 	ests/*.test.js run required |
| Positive gameplay cases | PENDING | Drag, launch, physics settle, White → Black → White |
| Negative gameplay cases | PENDING | Wrong team, invalid release, blocked unauthenticated play, invalid state |
| 2D renderer | IMPLEMENTED / PENDING VERIFY | Open-source Cburnett-derived SVG assets, local loading |
| 3D renderer | IMPLEMENTED / PENDING VERIFY | Three.js + Staunton assets, persistent scene |
| 2D ↔ 3D switch | IMPLEMENTED / PENDING VERIFY | Shared game state; synchronous mode change target <100 ms |
| Theme system | IMPLEMENTED / PENDING VERIFY | Single token bridge across shell, board and renderer |
| Board resize | IMPLEMENTED / PENDING VERIFY | Responsive viewport-aware square sizing |
| Focus/Theatre | IMPLEMENTED / PENDING VERIFY | Board-first presentation modes |
| Repository structure | VERIFIED | Root shims removed; final root audit complete |
| Tracker | UPDATED | This file is the source of release/verification status |
| README | VERIFIED | Root README added with setup and structure |

## Product Roadmap

| Step | Area | Status |
|---:|---|---|
| 0 | Product rules & identity | PARTIAL |
| 1 | Repository & engineering baseline | DONE |
| 2 | Core physics & damage | IMPLEMENTED / VERIFYING |
| 3 | 2D/3D presentation | IMPLEMENTED / VERIFYING |
| 4 | Board, camera, resize & themes | IMPLEMENTED / VERIFYING |
| 5 | Audio/effects/haptics | DONE |
| 6 | Combat roles/balance/combos | DONE |
| 7 | UX/tutorial/accessibility | IMPLEMENTED / VERIFYING |
| 8 | Local modes/challenges/replay | DONE |
| 9 | Automated QA/performance | IMPLEMENTED / VERIFYING |
| 10 | Production Flask backend | DONE |
| 11 | Accounts/profiles/persistence | PARTIAL |
| 12 | Private multiplayer | DONE |
| 13 | Authoritative simulation/anti-cheat | DONE |
| 14 | Matchmaking/ranked | DONE |
| 15 | Progression/cosmetics | DONE |
| 16 | Analytics/telemetry | IMPLEMENTED |
| 17 | Security/privacy/legal/licensing | PARTIAL |
| 18 | Zero-cost alpha distribution | PENDING |

## Detailed Checklist

### STEP 4 — Board, Camera, Resize & Themes
- ✓ Responsive board sizing architecture
- ✓ High-DPI handling
- ✓ Camera/resize correction
- ✓ Board scaling control
- ✓ Focus mode
- ✓ Theatre mode
- ✓ Four visual skins: Obsidian, Emerald, Walnut, Frost
- ✓ Theme stored through one UI theme state
- ✓ Theme propagation hooks for renderer layer
- ☐ Visual audit at 1440×900
- ☐ Visual audit at 1366×768
- ☐ Visual audit at 1280×720
- ☐ Visual audit at 1024×768
- ☐ Visual audit at 768×1024
- ☐ Visual audit at 390×844
- ☐ Visual audit at 360×800

### STEP 7 — UX, Tutorial & Accessibility
- ✓ Pointer/drag interaction
- ✓ Touch path
- ✓ Keyboard labels/accessibility foundations
- ✓ Turn feedback
- ✓ Timer feedback
- ✓ Game-over messaging
- ✓ Contextual selected-piece information
- ✓ Minimal-information principle for the primary game workspace
- ☐ Final focus order / keyboard traversal audit
- ☐ Contrast audit across all themes
- ☐ Reduced-motion regression

### STEP 9 — QA, Automated Testing & Performance
- **Python / API**
    - ✓ Python unit tests
    - ✓ API/integration tests
    - ✓ Auth positive/negative coverage
    - ✓ Authoritative simulation tests
- **Browser / Functional**
    - ✓ Chromium test infrastructure
    - ✓ Firefox test infrastructure
    - ✓ WebKit test infrastructure
    - ✓ Authenticated arena gate
    - ✓ Unauthenticated access blocking
    - ☐ Drag → release → physics → settle → alternate turn
    - ☐ White → Black → White two-turn flow
    - ☐ Wrong-team selection blocked
    - ☐ Invalid/near-zero release handled
    - ☐ Collision and destruction regression
    - ☐ 2D/3D toggle regression
    - ☐ Theme regression
    - ☐ Resize/focus/theatre regression
- **JavaScript**
    - ✓ Node test runner configured
    - ☐ Full JavaScript suite green on final candidate
- **Performance**
    - ✓ Persistent renderer architecture
    - ✓ Local 2D assets avoid runtime CDN dependency
    - ✓ Only active presentation path renders
    - ☐ Measure 2D → 3D → 2D switch <100 ms
    - ☐ Verify stable interaction at target FPS

### STEP 17 — Security / Privacy / Licensing
- ✓ Production secret requirement
- ✓ Request-size protection
- ✓ Rate limiting
- ✓ Security headers
- ✓ Server-authoritative state
- ✓ Client-authority write rejection
- ✓ Third-party notice document
- ☐ Final authentication/session security review
- ☐ Final retention policy sign-off
- ☐ Final asset/license audit for bundled visuals

### STEP 23 — UI Consolidation (COMPLETED)
- ✓ Professional shell integrated
- ✓ Legacy shims removed
- ✓ Renderer contract finalized

### STEP 24 — Observability (COMPLETED)
- ✓ Python structured logging
- ✓ 7-day log retention
- ✓ Global exception handler
- ✓ Frontend JS error bridge
