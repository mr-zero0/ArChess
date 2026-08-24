# ArChess — Product Design & Engineering Tracker

**Repository:** `mr-zero0/ArChess`  
**Stack:** Python + Flask + HTML/CSS/JS + Three.js  
**Current release:** `v0.5.2`  
**Current focus:** Step 16 — Analytics & Telemetry

## Tracking Rules

Every roadmap area is tracked as **Main Task → Subtasks → Verified Done / Total → Verification Gate**.

A subtask is **DONE** only after implementation exists and the applicable regression/browser/CI verification passes. Implemented work awaiting an external production, legal, privacy, deployment, or authenticated-session gate is tracked separately and does not increase the official completion score.

The normalized score excludes Step 21 (cost-gated paid services) and Step 22 (market-ready roll-up, which would double-count Steps 0–20).

## Overall Progress

**Verified: 169 / 204 ≈ 83%**

**Implementation pending beyond verified score:** Steps 11, 16, 17 and 18 still contain release/environment-dependent gates.

The verified percentage is the official progress number. Implementation-only work is tracked separately and does not inflate the score.

## Roadmap Dashboard

| Step | Main Task | Verified Done / Total | Status |
|---:|---|---:|---|
| 0 | Product identity & frozen rules | 8 / 12 | PARTIAL |
| 1 | Repository & engineering baseline | 10 / 10 | DONE |
| 2 | Core physics & damage | 10 / 10 | DONE |
| 3 | 3D chess presentation | 8 / 8 | DONE |
| 4 | Board, camera, resize & themes | 5 / 5 | DONE |
| 5 | Audio, effects & haptics | 7 / 7 | DONE |
| 6 | Combat roles, balance & combos | 16 / 16 | DONE |
| 7 | UX, tutorial & accessibility | 18 / 18 | DONE |
| 8 | Local modes, challenges & replay | 8 / 8 | DONE |
| 9 | QA, automated testing & performance | 8 / 8 | DONE |
| 10 | Production Flask backend | 12 / 12 | DONE |
| 11 | Accounts, profiles & persistence | 7 / 10 | PARTIAL |
| 12 | Private multiplayer MVP | 15 / 15 | DONE |
| 13 | Authoritative simulation & anti-cheat | 10 / 10 | DONE |
| 14 | Public matchmaking & ranked | 15 / 15 | DONE |
| 15 | Progression & cosmetics | 6 / 6 | DONE |
| 16 | Analytics & telemetry | 0 / 5 | IMPLEMENTED / RELEASE GATE PENDING |
| 17 | Security, privacy, legal & licensing | 6 / 10 | PARTIAL / HUMAN GATES PENDING |
| 18 | Zero-cost alpha distribution | 0 / 12 | IMPLEMENTED BASELINE / EXTERNAL DEPLOYMENT PENDING |
| 19 | Closed alpha → beta → PMF | 0 / 4 | TODO |
| 20 | Strict $0 public launch | 0 / 3 | TODO |
| 21 | Paid platform/service gates | 0 / 0 | COST GATE / EXCLUDED |
| 22 | Market-ready v1 | 0 / 25 | ROLL-UP / EXCLUDED |

---

## Verification Summary Since Previous Baseline

- Step 14: full Python/API/browser/JavaScript CI passed for the final ranked implementation batch. Verified 15/15.
- Step 15: full Python/API/browser/JavaScript CI passed for the final progression/cosmetics batch. Verified 6/6.
- Step 11: profile/stat presentation implementation and CI verified; authenticated accounts and account deletion remain pending. Verified 7/10.
- Step 16: telemetry implementation and instrumentation exist, but production retention/database verification remains pending.
- Step 17: privacy/community-rule documentation and backend hardening are implemented, but authenticated-session security and human legal/asset review remain pending.
- Step 18: Docker/Gunicorn deployment baseline is implemented, but real provider/HTTPS/domain/backup/rollback/monitoring verification remains pending.

## STEP 0 — Product Identity & Frozen Rules

**Main Task:** Freeze game rules, competitive exceptions, product identity and launch constraints.  
**Verified Done / Total:** 8 / 12

### Subtasks
- [x] Physics/slingshot core loop.
- [x] King HP win condition.
- [x] Friendly-fire rule.
- [x] Piece-as-projectile rule.
- [x] 8×8 board/opening arrangement.
- [x] 2D logical physics + 3D presentation.
- [x] Server-authoritative competitive requirement.
- [x] Baseline HP/power/stat philosophy.
- [ ] Final v1 rule sheet.
- [ ] Competitive exception rules.
- [ ] Final product tagline/brand language.
- [ ] Branding/trademark review.

**Verification:** product acceptance/document review.

## STEP 1 — Repository & Engineering Baseline

**Main Task:** Maintain a reproducible, maintainable and versioned engineering foundation.  
**Verified Done / Total:** 10 / 10

### Subtasks
- [x] Flask/app factory.
- [x] Environment configuration.
- [x] Dependency manifest.
- [x] Pytest/test structure.
- [x] Git ignore/secrets/cache coverage.
- [x] `.env.example`.
- [x] Core project documentation.
- [x] GitHub workflow/issue foundation.
- [x] Version/release metadata.
- [x] CI workflow.

**Verification:** clean install + CI.

## STEP 2 — Core Physics & Damage

**Main Task:** Provide deterministic collision, damage, destruction and settling.  
**Verified Done / Total:** 10 / 10

### Subtasks
- [x] Collision cooldown.
- [x] Duplicate-damage prevention.
- [x] Mass/impulse propagation.
- [x] Impact threshold.
- [x] Damage clamping.
- [x] Radius-aware boundaries.
- [x] Friction/substeps.
- [x] Piece collision resolution.
- [x] Destruction/King game-over.
- [x] Deterministic regression coverage.

**Verification:** Python + JS + browser + full CI.

## STEP 3 — 3D Chess Presentation

**Main Task:** Deliver convincing 3D chess presentation over the logical physics model.  
**Verified Done / Total:** 8 / 8

### Subtasks
- [x] Three.js/bootstrap.
- [x] Chess-piece visuals.
- [x] Board geometry/materials.
- [x] Lighting.
- [x] Shadows.
- [x] Piece placement.
- [x] Camera presentation.
- [x] Impact/destruction visuals.

**Verification:** supported browsers/viewports.

## STEP 4 — Board, Camera, Resize & Themes

**Main Task:** Make the board responsive and presentation-stable.  
**Verified Done / Total:** 5 / 5

### Subtasks
- [x] Responsive sizing.
- [x] High-DPI handling.
- [x] Fullscreen.
- [x] Camera/resize correction.
- [x] Light/Dark/Wood themes.

**Verification:** desktop/tablet/mobile matrix.

## STEP 5 — Audio, Effects & Haptics

**Main Task:** Make launches, impacts and outcomes readable and satisfying.  
**Verified Done / Total:** 7 / 7

### Subtasks
- [x] Launch audio.
- [x] Collision audio.
- [x] Destruction/game-over feedback.
- [x] Visual impact effects.
- [x] Combo feedback.
- [x] Haptic/touch path.
- [x] Accessible feedback.

**Verification:** gameplay + accessibility checks.

## STEP 6 — Combat Roles, Balance & Combos

**Main Task:** Preserve differentiated chess-piece combat identity without pay-to-win stats.  
**Verified Done / Total:** 16 / 16

### Subtasks
- [x] Pawn tuning.
- [x] Knight tuning.
- [x] Bishop tuning.
- [x] Rook tuning.
- [x] Queen tuning.
- [x] King tuning.
- [x] Mass values.
- [x] HP values.
- [x] Speed/power baselines.
- [x] Restitution/friction behavior.
- [x] Collision-role differentiation.
- [x] Friendly-fire interaction.
- [x] Combo tracking.
- [x] Damage/impact feedback.
- [x] Balance-stat scaffolding.
- [x] Cosmetic/stat parity rule.

**Verification:** regression + gameplay validation.

## STEP 7 — UX, Tutorial & Accessibility

**Main Task:** Make the game understandable and usable without prior knowledge.  
**Verified Done / Total:** 18 / 18

### Subtasks
- [x] Core controls.
- [x] Slingshot/drag tutorial.
- [x] Turn feedback.
- [x] Timer feedback.
- [x] Keyboard access.
- [x] Pointer controls.
- [x] Touch controls.
- [x] Responsive mobile UI.
- [x] Fullscreen flow.
- [x] Reset/restart.
- [x] Destruction/game-over messaging.
- [x] Challenge discoverability.
- [x] Replay entry point.
- [x] Accessible labels/text.
- [x] Error messaging.
- [x] Modal safety.
- [x] Input cleanup.
- [x] Browser interaction verification.

**Verification:** browser matrix + normal-use flows.

## STEP 8 — Local Modes, Challenges & Replay

**Main Task:** Make local play, practice, challenges and replay usable.  
**Verified Done / Total:** 8 / 8

### Subtasks
- [x] Match mode.
- [x] Practice mode.
- [x] Turn timer.
- [x] Challenge framework.
- [x] Replay capture.
- [x] Replay viewer.
- [x] Playback/reset stability.
- [x] Replay integrity records/viewer state.

**Verification:** JS/replay tests + browser validation.

## STEP 9 — QA, Automated Testing & Performance

**Main Task:** Keep all supported environments regression-safe.  
**Verified Done / Total:** 8 / 8

### Subtasks
- [x] Python unit tests.
- [x] Python API/integration tests.
- [x] JS physics tests.
- [x] Replay tests.
- [x] Chromium.
- [x] Firefox.
- [x] WebKit.
- [x] Responsive multiplayer matrix.

**Verification:** full CI green.

## STEP 10 — Production Flask Backend

**Main Task:** Maintain a deployable, safe and predictable backend.  
**Verified Done / Total:** 12 / 12

### Subtasks
- [x] App factory/config.
- [x] Health API.
- [x] Version API.
- [x] Structured logging.
- [x] JSON validation.
- [x] JSON errors.
- [x] Request-size limit.
- [x] Security headers.
- [x] Rate limiting.
- [x] Production secret requirement.
- [x] Gunicorn configuration.
- [x] Timezone-aware timestamps.

**Verification:** backend/API tests + CI.

## STEP 11 — Accounts, Profiles & Persistence

**Main Task:** Move from guest play toward persistent identity and profiles.  
**Verified Done / Total:** 7 / 10

### Subtasks
- [x] Guest identity.
- [x] Persistent user record.
- [x] Local settings/data foundation.
- [x] Match history foundation.
- [x] Migration foundation.
- [x] Minimal personal-data model.
- [x] Expanded profile/stat presentation.
- [ ] Authenticated account strategy.
- [ ] Profile/account security hardening.
- [ ] Account deletion/data removal.

**Verification:** profile integration + CI. Remaining account items require a real authentication boundary and privacy/deletion review.

## STEP 12 — Private Multiplayer MVP

**Main Task:** Deliver a complete two-player private room using server-authoritative state.  
**Verified Done / Total:** 15 / 15

### Subtasks
- [x] Room creation.
- [x] Room joining.
- [x] Team assignment.
- [x] Match start.
- [x] Server turn state.
- [x] Authoritative launch endpoint.
- [x] Launch-intent validation.
- [x] Canonical persistence.
- [x] Server HP state.
- [x] Server destruction state.
- [x] Server game-over state.
- [x] Reconnect.
- [x] Rematch.
- [x] Room lifecycle.
- [x] Two-client browser create → join → start → launch → reconnect flow.

**Verification:** API + browser matrix green.

## STEP 13 — Authoritative Simulation & Anti-Cheat

**Main Task:** Never trust client-supplied competitive physics/state.  
**Verified Done / Total:** 10 / 10

### Subtasks
- [x] Canonical server state.
- [x] Turn validation.
- [x] Ownership validation.
- [x] Alive/dead validation.
- [x] Finite/speed validation.
- [x] Server-calculated launch velocity.
- [x] Deterministic physics/damage/destruction.
- [x] Canonical state/shot hashing.
- [x] Reconnect hash reconciliation.
- [x] Replay integrity capture/verification.

**Verification:** API + Python + browser multi-client + replay + CI.

## STEP 14 — Public Matchmaking & Ranked

**Main Task:** Turn private multiplayer into a production-oriented competitive queue and rating system.  
**Verified Done / Total:** 15 / 15

### Subtasks
- [x] Queue join endpoint/state machine.
- [x] Queue leave/cancel endpoint.
- [x] Atomic pairing transaction.
- [x] Match-found polling endpoint.
- [x] Automatic waiting-room creation.
- [x] Player-to-room assignment.
- [x] Queue reconnect/recovery.
- [x] Surrender action.
- [x] Turn timeout handling.
- [x] Disconnect/abandonment handling.
- [x] Production MMR search expansion.
- [x] Placement/provisional rating logic.
- [x] Elo/rating integration.
- [x] Division/tier presentation.
- [x] Leaderboard foundation.

**Verification:** Python/API + browser matrix + migration/recovery + stress/regression + full CI.

## STEP 15 — Progression & Cosmetics

**Main Task:** Add non-pay-to-win progression and cosmetic ownership/equip behavior.  
**Verified Done / Total:** 6 / 6

### Subtasks
- [x] XP model.
- [x] Level model.
- [x] Cosmetic ownership schema.
- [x] Competitive stat parity.
- [x] Progression UI.
- [x] Inventory/equip flow.

**Verification:** progression tests + ranked outcome regression + browser matrix + full CI.

## STEP 16 — Analytics & Telemetry

**Main Task:** Measure gameplay quality, balance, retention and failures.  
**Verified Done / Total:** 0 / 5

### Implemented — Release Verification Pending
- [x] Persistent match/gameplay telemetry event model.
- [x] Matchmaking/ranked/progression instrumentation.
- [x] Error/performance telemetry hooks.
- [x] Privacy-safe irreversible actor hashing.
- [x] Operator-key-protected analytics summary endpoint.

### Subtasks requiring release verification
- [ ] Production retention policy/database verification.

**Verification:** schema/CI passes; production retention and operational review still required.

## STEP 17 — Security, Privacy, Legal & Licensing

**Main Task:** Make external exposure safe and documented.  
**Verified Done / Total:** 6 / 10

### Subtasks
- [x] Production secret requirement.
- [x] Request-size protection.
- [x] Rate limiting.
- [x] Security headers.
- [x] Server-authoritative state.
- [x] Client-authority write rejection.
- [ ] Authentication/session security review.
- [ ] Privacy/data-retention policy sign-off.
- [ ] Terms/community rules legal sign-off.
- [ ] Asset/license/trademark audit.

**Verification:** security + privacy + legal review.

## STEP 18 — Zero-Cost Alpha Distribution

**Main Task:** Produce an externally testable alpha without prematurely adding paid infrastructure.  
**Verified Done / Total:** 0 / 12

### Implemented baseline
- [x] Docker/Gunicorn application container.
- [x] Container healthcheck.
- [x] Reproducible deployment documentation.

### External release gates
- [ ] Zero-cost hosting provider selected.
- [ ] Production environment/secrets configured.
- [ ] Durable database deployed.
- [ ] HTTPS/domain verified.
- [ ] Static asset delivery verified.
- [ ] Monitoring/health checks verified externally.
- [ ] Backup/recovery verified.
- [ ] Rollback procedure tested.
- [ ] Alpha onboarding.
- [ ] Tester feedback path.
- [ ] Capacity validation.
- [ ] Public smoke test.

**Verification:** successful external deployment + smoke test.

## STEP 19 — Closed Alpha → Beta → PMF

**Main Task:** Establish a disciplined external validation loop.  
**Verified Done / Total:** 0 / 4

### Subtasks
- [ ] Closed-alpha cohort plan.
- [ ] Feedback/triage loop.
- [ ] Beta readiness criteria.
- [ ] PMF metrics/decision framework.

**Verification:** documented gates + measured feedback.

## STEP 20 — Strict $0 Public Launch

**Main Task:** Launch under the current no-budget constraint.  
**Verified Done / Total:** 0 / 3

### Subtasks
- [ ] Free-tier capacity validation.
- [ ] Cost monitoring/kill switches.
- [ ] Public-launch readiness.

**Verification:** deployment/cost review.

## STEP 21 — Paid Platform / Service Gates

**Main Task:** Track intentionally cost-gated platform/service decisions.  
**Status:** Excluded from normalized completion until budget is intentionally approved.

## STEP 22 — Market-Ready v1

**Main Task:** Final integrated release-readiness roll-up.  
**Status:** Excluded from normalized completion to avoid double counting Steps 0–20.

### Roll-up checks
- [ ] Rules frozen.
- [ ] Public matchmaking stable.
- [ ] Ranked ratings stable.
- [ ] Accounts/profile complete.
- [ ] Progression/cosmetics surfaced.
- [ ] Analytics operational.
- [ ] Security/privacy/legal complete.
- [ ] Reconnect/abandonment battle-tested.
- [ ] Browser/mobile compatibility verified.
- [ ] Performance budget met.
- [ ] Production deployment stable.
- [ ] Monitoring/backup/rollback operational.
- [ ] Alpha/beta/PMF gates satisfied.
- [ ] Public onboarding/support ready.
- [ ] Release/update process documented.
