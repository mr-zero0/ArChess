# ArChess — Final UI Modernization Tracker

**Main Task:** Replace the legacy room-centric gameplay shell with a polished, social-first, board-centric product interface while preserving the authoritative physics engine.

**Branch:** `feature/final-ui`
**Verification:** GitHub Actions run #197 — green.
**Official roadmap score:** unchanged at **169 / 204 (~83%)**. This UI modernization is treated as a refinement/release-gate batch and does not inflate the normalized roadmap score.

## Subtasks

| Subtask | Status | Evidence |
|---|---|---|
| Cinematic/dynamic visual shell | DONE | `static/css/final_ui.css` + browser matrix |
| Board-first gameplay layout | DONE | Board retained; legacy side panels hidden |
| Social-first navigation | DONE | Play / Friends / Challenges / Leaderboard / Profile |
| Account-aware header | DONE | `/api/auth/me` integration |
| Profile/rank quick view | DONE | `/api/profile/me` integration + MMR graph |
| Friends search/add flow | DONE | Friends API wiring |
| Direct friend challenge flow | DONE | Challenge API wiring |
| Ranked queue CTA | DONE | `/api/matchmaking/join` wiring |
| Casual play CTA | DONE | Existing `NEW GAME` retained as engine entry |
| Player-facing room-code UI removed | DONE | Legacy side panels hidden from final shell |
| Responsive mobile navigation | DONE | Mobile CSS + browser matrix |
| Reduced-motion support | DONE | `prefers-reduced-motion` styling |
| Final UI regression test | DONE | `tests/test_final_ui.py` |
| Full Python test suite | VERIFIED | CI green |
| Chromium / Firefox / WebKit | VERIFIED | CI green |
| JavaScript tests | VERIFIED | CI green |

## Product UX

The intended player flow is now:

`Sign in / Guest → Play → Ranked or Casual → Friends → Challenge → Play → Profile → History / Stats / Progression`

The internal `Room` entity remains an authoritative simulation/session mechanism. Players should not need to think in terms of room codes.

## Remaining External Gates

These are intentionally outside this UI batch:

- Google OAuth production client/redirect configuration.
- Production email verification/reset provider.
- Persistent uploaded-avatar storage/CDN.
- Production account deletion/anonymization review.
