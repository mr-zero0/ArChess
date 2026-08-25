# ArChess — Product Design & Engineering Tracker

**Repository:** `mr-zero0/ArChess`  
**Stack:** Python + Flask + HTML/CSS/JS + Three.js  
**Current release:** `v0.5.2`  
**Current focus:** Step 16 — Analytics and Telemetry

## Overall Progress
**Verified: 169 / 204 ≈ 83%**

## Roadmap Dashboard
| Step | Main Task | Status |
|---:|---|---|
| 0 | Product identity & frozen rules | PARTIAL |
| 1 | Repository & engineering baseline | DONE |
| 2 | Core physics & damage | DONE |
| 3 | 3D chess presentation | DONE |
| 4 | Board, camera, resize & themes | DONE |
| 5 | Audio, effects & haptics | DONE |
| 6 | Combat roles, balance & combos | DONE |
| 7 | UX, tutorial & accessibility | DONE |
| 8 | Local modes, challenges & replay | DONE |
| 9 | QA, automated testing & performance | DONE |
| 10 | Production Flask backend | DONE |
| 11 | Accounts, profiles & persistence | PARTIAL |
| 12 | Private multiplayer MVP | DONE |
| 13 | Authoritative simulation & anti-cheat | DONE |
| 14 | Public matchmaking & ranked | DONE |
| 15 | Progression & cosmetics | DONE |
| 16 | Analytics & telemetry | IMPLEMENTED |
| 17 | Security, privacy, legal & licensing | PARTIAL |

## STEP 0 — Product Identity & Frozen Rules
1. ✓ Physics/slingshot core loop.
2. ✓ King HP win condition.
3. ✓ Friendly-fire rule.
4. ✓ Piece-as-projectile rule.
5. ✓ 8×8 board/opening arrangement.
6. ✓ 2D logical physics + 3D presentation.
7. ✓ Server-authoritative competitive requirement.
8. ✓ Baseline HP/power/stat philosophy.
9.   Final v1 rule sheet.
10.  Competitive exception rules.
11.  Final product tagline/brand language.
12.  Branding/trademark review.

## STEP 1 — Repository & Engineering Baseline
1. ✓ Flask/app factory.
2. ✓ Environment configuration.
3. ✓ Dependency manifest.
4. ✓ Pytest/test structure.
5. ✓ Git ignore/secrets/cache coverage.
6. ✓ .env.example.
7. ✓ Core project documentation.
8. ✓ GitHub workflow/issue foundation.
9. ✓ Version/release metadata.
10. ✓ CI workflow.

## STEP 2 — Core Physics & Damage
1. ✓ Collision cooldown.
2. ✓ Duplicate-damage prevention.
3. ✓ Mass/impulse propagation.
4. ✓ Impact threshold.
5. ✓ Damage clamping.
6. ✓ Radius-aware boundaries.
7. ✓ Friction/substeps.
8. ✓ Piece collision resolution.
9. ✓ Destruction/King game-over.
10. ✓ Deterministic regression coverage.

| 18 | Zero-cost alpha distribution | IMPLEMENTED BASELINE |
| 19 | Closed alpha → beta → PMF | TODO |
| 20 | Strict $0 public launch | TODO |

## STEP 3 — 3D Chess Presentation
1. ✓ Three.js/bootstrap.
2. ✓ Chess-piece visuals.
3. ✓ Board geometry/materials.
4. ✓ Lighting.
5. ✓ Shadows.
6. ✓ Piece placement.
7. ✓ Camera presentation.
8. ✓ Impact/destruction visuals.

## STEP 4 — Board, Camera, Resize & Themes
1. ✓ Responsive sizing.
2. ✓ High-DPI handling.
3. ✓ Fullscreen.
4. ✓ Camera/resize correction.
5. ✓ Light/Dark/Wood themes.

## STEP 5 — Audio, Effects & Haptics
1. ✓ Launch audio.
2. ✓ Collision audio.
3. ✓ Destruction/game-over feedback.
4. ✓ Visual impact effects.
5. ✓ Combo feedback.
6. ✓ Haptic/touch path.
7. ✓ Accessible feedback.


## STEP 6 — Combat Roles, Balance & Combos
1. ✓ Pawn tuning.
2. ✓ Knight tuning.
3. ✓ Bishop tuning.
4. ✓ Rook tuning.
5. ✓ Queen tuning.
6. ✓ King tuning.
7. ✓ Mass values.
8. ✓ HP values.
9. ✓ Speed/power baselines.
10. ✓ Restitution/friction behavior.
11. ✓ Collision-role differentiation.
12. ✓ Friendly-fire interaction.
13. ✓ Combo tracking.
14. ✓ Damage/impact feedback.
15. ✓ Balance-stat scaffolding.
16. ✓ Cosmetic/stat parity rule.

## STEP 7 — UX, Tutorial & Accessibility
1. ✓ Core controls.
2. ✓ Slingshot/drag tutorial.
3. ✓ Turn feedback.
4. ✓ Timer feedback.
5. ✓ Keyboard access.
6. ✓ Pointer controls.
7. ✓ Touch controls.
8. ✓ Responsive mobile UI.
9. ✓ Fullscreen flow.
10. ✓ Reset/restart.
11. ✓ Destruction/game-over messaging.
12. ✓ Challenge discoverability.
13. ✓ Replay entry point.
14. ✓ Accessible labels/text.
15. ✓ Error messaging.
16. ✓ Modal safety.
17. ✓ Input cleanup.
18. ✓ Browser interaction verification.


## STEP 8 — Local Modes, Challenges & Replay
1. ✓ Match mode.
2. ✓ Practice mode.
3. ✓ Turn timer.
4. ✓ Challenge framework.
5. ✓ Replay capture.
6. ✓ Replay viewer.
7. ✓ Playback/reset stability.
8. ✓ Replay integrity records/viewer state.

## STEP 9 — QA, Automated Testing & Performance
1. ✓ Python unit tests.
2. ✓ Python API/integration tests.
3. ✓ JS physics tests.
4. ✓ Replay tests.
5. ✓ Chromium.
6. ✓ Firefox.

## STEP 10 — Production Flask Backend
1. ✓ App factory/config.
2. ✓ Health API.
3. ✓ Version API.
4. ✓ Structured logging.
5. ✓ JSON validation.
6. ✓ JSON errors.
7. ✓ Request-size limit.
8. ✓ Security headers.
9. ✓ Rate limiting.
10. ✓ Production secret requirement.
11. ✓ Gunicorn configuration.
12. ✓ Timezone-aware timestamps.

## STEP 11 — Accounts, Profiles & Persistence
1. ✓ Guest identity.
2. ✓ Persistent user record.
3. ✓ Local settings/data foundation.
4. ✓ Match history foundation.
5. ✓ Migration foundation.
6. ✓ Minimal personal-data model.
7. ✓ Expanded profile/stat presentation.
8.   Authenticated account strategy.
9.   Profile/account security hardening.
10.  Account deletion/data removal.

## STEP 12 — Private Multiplayer MVP
1. ✓ Room creation.
2. ✓ Room joining.
3. ✓ Team assignment.
4. ✓ Match start.
5. ✓ Server turn state.
6. ✓ Authoritative launch endpoint.
7. ✓ Launch-intent validation.
8. ✓ Canonical persistence.
9. ✓ Server HP state.
10. ✓ Server destruction state.
11. ✓ Server game-over state.
12. ✓ Reconnect.
13. ✓ Rematch.
14. ✓ Room lifecycle.
15. ✓ Two-client browser create → join → start → launch → reconnect flow.

7. ✓ WebKit.
8. ✓ Responsive multiplayer matrix.




## STEP 13 — Authoritative Simulation & Anti-Cheat
1. ✓ Canonical server state.
2. ✓ Turn validation.
3. ✓ Ownership validation.
4. ✓ Alive/dead validation.
5. ✓ Finite/speed validation.
6. ✓ Server-calculated launch velocity.
7. ✓ Deterministic physics/damage/destruction.
8. ✓ Canonical state/shot hashing.
9. ✓ Reconnect hash reconciliation.
10. ✓ Replay integrity capture/verification.

## STEP 14 — Public Matchmaking & Ranked
1. ✓ Queue join endpoint/state machine.
2. ✓ Queue leave/cancel endpoint.
3. ✓ Atomic pairing transaction.
4. ✓ Match-found polling endpoint.
5. ✓ Automatic waiting-room creation.
6. ✓ Player-to-room assignment.
7. ✓ Queue reconnect/recovery.
8. ✓ Surrender action.
9. ✓ Turn timeout handling.
10. ✓ Disconnect/abandonment handling.
11. ✓ Production MMR search expansion.
12. ✓ Placement/provisional rating logic.
13. ✓ Elo/rating integration.
14. ✓ Division/tier presentation.
15. ✓ Leaderboard foundation.

## STEP 15 — Progression & Cosmetics
1. ✓ XP model.
2. ✓ Level model.
3. ✓ Cosmetic ownership schema.
4. ✓ Competitive stat parity.
5. ✓ Progression UI.
6. ✓ Inventory/equip flow.

## STEP 16 — Analytics & Telemetry
1. ✓ Persistent match/gameplay telemetry event model.
2. ✓ Matchmaking/ranked/progression instrumentation.
3. ✓ Error/performance telemetry hooks.
4. ✓ Privacy-safe irreversible actor hashing.
5. ✓ Operator-key-protected analytics summary endpoint.
6.   Production retention policy/database verification.

## STEP 17 — Security, Privacy, Legal & Licensing
1. ✓ Production secret requirement.
2. ✓ Request-size protection.
3. ✓ Rate limiting.
4. ✓ Security headers.
5. ✓ Server-authoritative state.
6. ✓ Client-authority write rejection.
7.   Authentication/session security review.
8.   Privacy/data-retention policy sign-off.
9.   Terms/community rules legal sign-off.
10.  Asset/license/trademark audit.

## STEP 18 — Zero-Cost Alpha Distribution
1. ✓ Docker/Gunicorn application container.
2. ✓ Container healthcheck.
3. ✓ Reproducible deployment documentation.
4.   Zero-cost hosting provider selected.
5.   Production environment/secrets configured.
6.   Durable database deployed.
7.   HTTPS/domain verified.
8.   Static asset delivery verified.
9.   Monitoring/health checks verified externally.
10.  Backup/recovery verified.
11.  Rollback procedure tested.
12.  Alpha onboarding.
13.  Tester feedback path.
14.  Capacity validation.
15.  Public smoke test.

## STEP 19 — Closed Alpha → Beta → PMF
1.   Closed-alpha cohort plan.
2.   Feedback/triage loop.
3.   Beta readiness criteria.
4.   PMF metrics/decision framework.

## STEP 20 — Strict $0 Public Launch
1.   Free-tier capacity validation.
2.   Cost monitoring/kill switches.
3.   Public-launch readiness.

## STEP 21 — Paid Platform / Service Gates
1.   Excluded from normalized completion until budget is approved.

## STEP 22 — Market-Ready v1
1.   Rules frozen.
2.   Public matchmaking stable.
3.   Ranked ratings stable.
4.   Accounts/profile complete.
5.   Progression/cosmetics surfaced.
6.   Analytics operational.
7.   Security/privacy/legal complete.
8.   Reconnect/abandonment battle-tested.
9.   Browser/mobile compatibility verified.
10.  Performance budget met.
11.  Production deployment stable.
12.  Monitoring/backup/rollback operational.
13.  Alpha/beta/PMF gates satisfied.
14.  Public onboarding/support ready.
15.  Release/update process documented.

