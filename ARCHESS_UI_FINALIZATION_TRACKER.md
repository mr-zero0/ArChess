# ArChess — Final UI Modernization Tracker

**Main Task:** Replace the legacy room-centric gameplay shell with a polished, social-first, board-centric product interface while preserving the authoritative physics engine.

**Branch:** `main` (current verified presentation work)
**Official roadmap score:** unchanged at **169 / 204 (~83%)**. UI/3D rendering work is tracked as a release-gate refinement and does not inflate the normalized roadmap score.

## Main Task 1 — Product UI

| Subtask | Status | Evidence |
|---|---|---|
| Cinematic/dynamic visual shell | DONE | `static/css/final_ui.css` |
| Board-first gameplay layout | DONE | Board retained; legacy side panels hidden |
| Social-first navigation | DONE | Play / Friends / Challenges / Leaderboard / Profile |
| Account-aware header | DONE | `/api/auth/me` integration |
| Profile/rank quick view | DONE | `/api/profile/me` integration + MMR graph |
| Friends search/add flow | DONE | Friends API wiring |
| Direct friend challenge flow | DONE | Challenge API wiring |
| Ranked queue CTA | DONE | `/api/matchmaking/join` wiring |
| Casual play CTA | DONE | Existing engine entry |
| Player-facing room-code UI removed | DONE | Legacy online-match panel hidden |
| Responsive mobile navigation | DONE | Mobile CSS + browser matrix |
| Reduced-motion support | DONE | `prefers-reduced-motion` styling |
| Final UI regression test | DONE | `tests/test_final_ui.py` |

## Main Task 2 — 3D Presentation Layer

| Subtask | Status | Evidence |
|---|---|---|
| Three.js native renderer | IMPLEMENTED | `static/js/render3d.js` |
| PBR-style board materials | IMPLEMENTED | Board/frame materials in `render3d.js` |
| 3D piece geometry | IMPLEMENTED | Generated lathe / mesh geometry |
| Lighting + shadows | IMPLEMENTED | Key/fill/rim + shadow map |
| Broadcast / Top / Cinematic cameras | IMPLEMENTED | `camera_controls.js` |
| Camera flip / orbit / zoom | IMPLEMENTED | Camera control bridge |
| Existing game state → 3D presentation | IMPLEMENTED | `main.js` feeds `gameState` into 3D renderer |
| WebGL fallback presentation | IMPLEMENTED | `static/js/presentation_fallback3d.js` |
| Compatibility piece projection | FIXED | Physics coordinates mapped from 0.5..7.5 to 8×8 visual grid |
| Compatibility piece glyph visibility | FIXED | Explicit white/black glyphs + reliable shadow styling |
| Compatibility 3D movement projection | IMPLEMENTED | Velocity-driven lift/rotation |
| Startup WebGL-error suppression | PENDING | Native error/compatibility timing still needs final integrated browser verification |
| Native 3D runtime regression test | DONE | `tests/test_three_d_renderer_is_visible.py` |
| Compatibility piece projection regression | ADDED | `tests/test_compat_3d_projection.py` |

## Verification

- Existing Python suite: previously CI green.
- Browser matrix: previously CI green.
- JavaScript suite: previously CI green.
- Compatibility projection: isolated headless Chromium presentation test **PASS** — 32 living pieces mapped into the 8×8 board with correct coordinates and visible glyphs.

## Product UX

The intended player flow is:

`Sign in / Guest → Play → Ranked or Casual → Friends → Challenge → Play → Profile → History / Stats / Progression`

The internal `Room` entity remains an authoritative simulation/session mechanism. Players should not need to think in terms of room codes.

## Remaining External Gates

These remain separate from the visual layer:

- Google OAuth production client/redirect configuration.
- Production email verification/reset provider.
- Persistent uploaded-avatar storage/CDN.
- Production account deletion/anonymization review.
