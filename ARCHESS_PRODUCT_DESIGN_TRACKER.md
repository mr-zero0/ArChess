# ArChess — Product Design & Engineering Tracker

**Repository:** `mr-zero0/ArChess`  
**Stack:** Python + Flask + HTML/CSS/JS + Three.js  
**Platform:** Browser / PWA  
**Current release:** `v0.5.2`  
**Current focus:** Step 14 public matchmaking/ranked

## How to read this tracker

Every roadmap area is tracked as:

- **Main Task** — the product/engineering outcome.
- **Subtasks** — concrete deliverables required for that outcome.
- **Done / Total** — completed subtasks divided by the subtasks currently defined for that area.
- **Verification** — what evidence is required before a subtask is treated as complete.

A subtask is counted as **DONE** only when implementation exists and the applicable regression/browser/CI verification has passed. Product decisions, legal work, launch work, and cost-gated work are tracked separately rather than being counted as implemented just because engineering scaffolding exists.

## Overall Progress

### Current normalized tracker score

**139 / 217 subtasks complete ≈ 64%**

This is an **approximate roadmap completion figure**, not a code-quality score. It includes product, engineering, QA, security, launch, and market-readiness tasks currently defined in this tracker. Cost-gated items are excluded from the denominator because they are not engineering work that should be marked complete under the current $0 constraint.

### Practical interpretation

- **Core game + production foundation:** largely complete.
- **Private authoritative multiplayer:** complete and verified.
- **Public competitive infrastructure:** next major gap.
- **Accounts/profile depth, security/legal, analytics, distribution, growth, and market-ready launch:** still materially incomplete.

For that reason, ArChess is much further along as an **engineered playable product** than as a **fully market-ready live service**.

## Roadmap Dashboard

| Step | Main Task | Done / Total | Status |
|---:|---|---:|---|
| 0 | Product identity & frozen rules | 8 / 12 | PARTIAL |
| 1 | Repository & engineering baseline | 10 / 10 | DONE |
| 2 | Core physics & damage | 10 / 10 | DONE |
| 3 | 3D chess presentation | 8 / 8 | DONE |
| 4 | Board, camera, resize & themes | 5 / 5 | DONE |
| 5 | Audio, effects, haptics | 7 / 7 | DONE |
| 6 | Combat roles, balance & combos | 16 / 16 | DONE |
| 7 | UX, tutorial & accessibility | 18 / 18 | DONE |
| 8 | Local modes, challenges & replay | 8 / 8 | DONE |
| 9 | QA, automated testing & performance | 8 / 8 | DONE |
| 10 | Production Flask backend | 12 / 12 | DONE |
| 11 | Accounts, profiles & persistence | 6 / 10 | PARTIAL |
| 12 | Private multiplayer MVP | 15 / 15 | DONE |
| 13 | Authoritative simulation & anti-cheat | 10 / 10 | DONE |
| 14 | Public matchmaking & ranked | 0 / 15 | NEXT |
| 15 | Progression & cosmetics | 4 / 6 | PARTIAL |
| 16 | Analytics & telemetry | 0 / 5 | TODO |
| 17 | Security, privacy, legal & licensing | 6 / 10 | PARTIAL |
| 18 | Zero-cost alpha distribution | 0 / 12 | TODO |
| 19 | Closed alpha → beta → PMF | 0 / 4 | TODO |
| 20 | Strict $0 public launch | 0 / 3 | TODO |
| 21 | Paid platform/service gates | 0 / 0 | COST GATE / EXCLUDED |
| 22 | Market-ready v1 | 0 / 25 | TODO |

---

# Detailed Work Breakdown

## STEP 0 — Product Identity & Frozen Rules

**Main Task:** Freeze the product definition so engineering, multiplayer, monetization, and launch decisions use one consistent rule set.

**Done / Total:** 8 / 12

### Subtasks

- [x] Define physics-combat/slingshot core loop.
- [x] Define King HP as the win condition.
- [x] Define friendly-fire behavior.
- [x] Define piece-as-projectile rule.
- [x] Define 8×8 board and standard opening arrangement.
- [x] Define 2D logical physics with 3D presentation.
- [x] Define server-authoritative competitive multiplayer requirement.
- [x] Define baseline piece HP/power/stat philosophy.
- [ ] Freeze final v1 rule sheet in repository docs.
- [ ] Freeze final competitive rules and exception cases.
- [ ] Finalize product tagline/brand language.
- [ ] Complete branding/trademark review.

**Verification:** product acceptance, documentation review, no unresolved rule contradictions.

---

## STEP 1 — Repository & Engineering Baseline

**Main Task:** Maintain a reproducible, maintainable, versioned engineering foundation.

**Done / Total:** 10 / 10

### Subtasks

- [x] Flask application/app factory.
- [x] Environment configuration separation.
- [x] Requirements/dependency manifest.
- [x] Pytest configuration and Python test structure.
- [x] `.gitignore` for secrets/cache/local DB artifacts.
- [x] `.env.example` and environment guidance.
- [x] README/contribution/changelog/license/asset documentation foundation.
- [x] GitHub issue templates/workflow foundation.
- [x] `/api/version` and release metadata.
- [x] CI workflow with Python, browser, and JavaScript verification.

**Verification:** repository checkout, clean install, CI green.

---

## STEP 2 — Core Physics & Damage

**Main Task:** Provide deterministic, stable physics with correct collisions, damage, destruction, and settling.

**Done / Total:** 10 / 10

### Subtasks

- [x] Collision cooldown.
- [x] Duplicate-damage prevention.
- [x] Mass/impulse propagation.
- [x] Impact threshold.
- [x] Damage clamping.
- [x] Radius-aware boundary collision.
- [x] Friction/integration and substeps.
- [x] Piece-piece collision resolution.
- [x] Destruction and King game-over handling.
- [x] Physics regression coverage and deterministic settlement coverage.

**Verification:** Python tests + JavaScript physics tests + browser verification + full CI.

---

## STEP 3 — 3D Chess Presentation

**Main Task:** Present the 2D physics model as a convincing 3D chess experience.

**Done / Total:** 8 / 8

### Subtasks

- [x] Three.js scene/bootstrap.
- [x] Procedural/visual chess pieces.
- [x] Board geometry/materials.
- [x] Lighting.
- [x] Shadows.
- [x] Piece placement/presentation.
- [x] Camera presentation.
- [x] Visual destruction/impact presentation.

**Verification:** normal browser use across supported viewports.

---

## STEP 4 — Board, Camera, Resize & Themes

**Main Task:** Make the board robust across screens, orientations, and presentation modes.

**Done / Total:** 5 / 5

### Subtasks

- [x] Responsive board sizing.
- [x] High-DPI handling.
- [x] Fullscreen behavior.
- [x] Camera/resize correction.
- [x] Light/Dark/Wood themes.

**Verification:** desktop/tablet/mobile browser matrix.

---

## STEP 5 — Audio, Effects & Haptics

**Main Task:** Provide feedback that makes launches, impacts, damage, and outcomes readable and satisfying.

**Done / Total:** 7 / 7

### Subtasks

- [x] Launch audio.
- [x] Collision/impact audio.
- [x] Destruction/game-over feedback.
- [x] Visual impact effects.
- [x] Combo feedback.
- [x] Haptic/touch feedback path.
- [x] Accessible feedback considerations.

**Verification:** normal gameplay and accessibility checks.

---

## STEP 6 — Combat Roles, Balance & Combos

**Main Task:** Ensure chess-piece identity translates into meaningful physics/combat roles.

**Done / Total:** 16 / 16

### Subtasks

- [x] Pawn tuning.
- [x] Knight tuning.
- [x] Bishop tuning.
- [x] Rook tuning.
- [x] Queen tuning.
- [x] King tuning.
- [x] Mass values.
- [x] HP values.
- [x] Power/speed baselines.
- [x] Restitution/friction behavior.
- [x] Collision-role differentiation.
- [x] Friendly-fire interaction.
- [x] Combo tracking.
- [x] Damage/impact feedback.
- [x] Balance-stat scaffolding.
- [x] Competitive cosmetics do not alter combat stats.

**Verification:** regression tests + gameplay validation.

---

## STEP 7 — UX, Tutorial & Accessibility

**Main Task:** Make the game understandable and usable without requiring prior knowledge.

**Done / Total:** 18 / 18

### Subtasks

- [x] Core controls guidance.
- [x] Slingshot/drag tutorial.
- [x] Turn feedback.
- [x] Timer feedback.
- [x] Keyboard access.
- [x] Pointer controls.
- [x] Touch controls.
- [x] Responsive mobile layout.
- [x] Fullscreen entry/exit.
- [x] Reset/restart handling.
- [x] Destruction/game-over messaging.
- [x] Challenge discoverability.
- [x] Replay entry point.
- [x] Accessible labels/text feedback.
- [x] Error messaging.
- [x] Modal/panel interaction safety.
- [x] Input state cleanup.
- [x] Browser interaction verification.

**Verification:** browser matrix and normal-use flows.

---

## STEP 8 — Local Modes, Challenges & Replay

**Main Task:** Make the local game complete enough to play, practice, challenge, and review matches.

**Done / Total:** 8 / 8

### Subtasks

- [x] Match mode.
- [x] Practice mode.
- [x] Turn timer.
- [x] Challenge framework.
- [x] Replay capture.
- [x] Replay viewer.
- [x] Replay playback/reset stability.
- [x] Replay integrity records and viewer verification state.

**Verification:** JavaScript/replay tests + browser validation.

---

## STEP 9 — QA, Automated Testing & Performance

**Main Task:** Prevent regressions across Python, JavaScript, browsers, and responsive layouts.

**Done / Total:** 8 / 8

### Subtasks

- [x] Python unit tests.
- [x] Python integration/API tests.
- [x] JavaScript physics tests.
- [x] Replay regression tests.
- [x] Chromium browser coverage.
- [x] Firefox browser coverage.
- [x] WebKit browser coverage.
- [x] Desktop/tablet/mobile multiplayer verification matrix.

**Verification:** full GitHub Actions run is green.

---

## STEP 10 — Production Flask Backend

**Main Task:** Keep the backend deployable, safe, observable, and predictable.

**Done / Total:** 12 / 12

### Subtasks

- [x] App factory/configuration.
- [x] Health endpoint.
- [x] Version endpoint.
- [x] Structured logging.
- [x] JSON request validation.
- [x] JSON error handlers.
- [x] Request-size limit.
- [x] Security headers.
- [x] Rate limiting.
- [x] Production secret requirement.
- [x] Gunicorn configuration.
- [x] Timezone-aware model timestamps.

**Verification:** backend/API test suite and CI.

---

## STEP 11 — Accounts, Profiles & Persistence

**Main Task:** Move from anonymous/guest gameplay toward persistent player identity and profile management.

**Done / Total:** 6 / 10

### Subtasks

- [x] Anonymous guest identity.
- [x] Persistent user record.
- [x] Persistent local settings/data foundation.
- [x] Match persistence/history foundation.
- [x] Database migrations foundation.
- [x] Minimal personal-data model.
- [ ] Authenticated account strategy.
- [ ] Profile surface/UI.
- [ ] Account deletion/data removal flow.
- [ ] Expanded profile/stat presentation.

**Verification:** account/profile integration tests + privacy review.

---

## STEP 12 — Private Multiplayer MVP

**Main Task:** Deliver a complete two-player private multiplayer match where the server is authoritative.

**Done / Total:** 15 / 15

### Subtasks

- [x] Room creation.
- [x] Room joining.
- [x] Team assignment.
- [x] Match start.
- [x] Server turn state.
- [x] Authoritative launch endpoint.
- [x] Server-side launch intent validation.
- [x] Canonical state persistence.
- [x] Server-generated HP state.
- [x] Server-generated destruction state.
- [x] Server-generated game-over state.
- [x] Reconnect flow.
- [x] Rematch flow.
- [x] Room lifecycle handling.
- [x] Two-client browser create → join → start → launch → reconnect verification.

**Verification:** full API + browser matrix green.

---

## STEP 13 — Authoritative Simulation & Anti-Cheat

**Main Task:** Ensure competitive multiplayer cannot trust client-submitted physics/state.

**Done / Total:** 10 / 10

### Subtasks

- [x] Canonical server match state.
- [x] Turn validation.
- [x] Ownership validation.
- [x] Alive/dead validation.
- [x] Finite/speed validation.
- [x] Server-calculated launch velocity from drag intent.
- [x] Deterministic fixed-step simulation/collision/damage/destruction.
- [x] Canonical state and shot hashing.
- [x] Reconnect canonical-hash reconciliation.
- [x] Replay integrity capture and verification.

**Security rule:** client `/sync`, `/hp`, `/destruction`, and `/gameover` writes are rejected during authoritative play.

**Verification:** Python/API tests + browser multi-client verification + replay regression + full CI.

---

## STEP 14 — Public Matchmaking & Ranked

**Main Task:** Turn private room multiplayer into a production-oriented competitive queue and rating system.

**Done / Total:** 0 / 15

### Subtasks

- [ ] Queue join endpoint/state machine.
- [ ] Queue leave/cancel endpoint.
- [ ] Atomic match pairing.
- [ ] Match-found response/polling or push flow.
- [ ] Automatic room creation from a successful match.
- [ ] Player-to-room assignment from matchmaking.
- [ ] Queue reconnect/recovery.
- [ ] Surrender action.
- [ ] Turn timeout handling.
- [ ] Disconnect/abandonment handling.
- [ ] Hidden MMR search/matching rules.
- [ ] Placement/provisional rating logic.
- [ ] Elo/rating update integration.
- [ ] Division/tier presentation.
- [ ] Leaderboard foundation.

**Verification target:** multi-client queue tests, race-condition tests, reconnect tests, browser flow, persistence tests, and load/soak checks before marking production-ready.

---

## STEP 15 — Progression & Cosmetics

**Main Task:** Add non-pay-to-win progression without changing competitive combat stats.

**Done / Total:** 4 / 6

### Subtasks

- [x] XP model.
- [x] Level model.
- [x] Cosmetic ownership schema.
- [x] Competitive stat-parity rule.
- [ ] In-game profile/progression UI.
- [ ] Cosmetic inventory/equip flow.

**Verification:** progression persistence tests and competitive-stat regression tests.

---

## STEP 16 — Analytics & Telemetry

**Main Task:** Instrument the product so gameplay quality, retention, balance, and failures can be measured.

**Done / Total:** 0 / 5

### Subtasks

- [ ] Match lifecycle event model.
- [ ] Gameplay/physics telemetry.
- [ ] Matchmaking queue telemetry.
- [ ] Error/performance telemetry.
- [ ] Analytics dashboard/reporting foundation.

**Verification:** privacy review, event schema tests, production-safe logging checks.

---

## STEP 17 — Security, Privacy, Legal & Licensing

**Main Task:** Make the project safe to expose beyond private development.

**Done / Total:** 6 / 10

### Subtasks

- [x] Production secret requirement.
- [x] Request-size protection.
- [x] Rate limiting.
- [x] Security response headers.
- [x] Server-authoritative multiplayer state.
- [x] Client-authority write rejection.
- [ ] Authentication/session security review.
- [ ] Privacy/data-retention policy.
- [ ] Terms/community rules.
- [ ] Asset/license/trademark audit.

**Verification:** security checklist + deployment review + legal documentation review.

---

## STEP 18 — Zero-Cost Alpha Distribution

**Main Task:** Make an alpha build externally testable without introducing paid infrastructure prematurely.

**Done / Total:** 0 / 12

### Subtasks

- [ ] Choose zero-cost hosting strategy.
- [ ] Production deployment configuration.
- [ ] Environment/secret setup.
- [ ] Database deployment plan.
- [ ] Static asset delivery plan.
- [ ] Domain/subdomain decision.
- [ ] HTTPS verification.
- [ ] Monitoring/health checks.
- [ ] Rollback procedure.
- [ ] Backup/recovery procedure.
- [ ] Alpha onboarding instructions.
- [ ] Tester feedback/reporting path.

**Verification:** successful external deployment and smoke test.

---

## STEP 19 — Closed Alpha → Beta → PMF

**Main Task:** Establish a disciplined product-validation loop.

**Done / Total:** 0 / 4

### Subtasks

- [ ] Closed-alpha cohort plan.
- [ ] Feedback and issue triage loop.
- [ ] Beta readiness criteria.
- [ ] PMF metrics/decision framework.

**Verification:** documented milestone gates and measured tester feedback.

---

## STEP 20 — Strict $0 Public Launch

**Main Task:** Launch under the current strict no-budget constraint before introducing paid services.

**Done / Total:** 0 / 3

### Subtasks

- [ ] Validate free-tier capacity and limits.
- [ ] Validate cost monitoring/kill switches.
- [ ] Public-launch readiness decision.

**Verification:** deployment/cost review. This task must remain separate from future paid-platform options.

---

## STEP 21 — Paid Platform / Service Gates

**Main Task:** Track work that intentionally requires budget or a paid platform.

**Done / Total:** 0 / 0 — excluded from overall completion percentage.

### Subtasks

- Cost-gated infrastructure decisions are not counted as engineering completion until budget is intentionally approved.

**Examples:** paid hosting, paid observability, paid messaging, premium identity providers, commercial analytics.

---

## STEP 22 — Market-Ready v1

**Main Task:** Reach a complete product state suitable for broad external use.

**Done / Total:** 0 / 25

### Subtasks

- [ ] Core rules/product scope frozen.
- [ ] Public matchmaking stable.
- [ ] Ranked rating system stable.
- [ ] Accounts/profile complete.
- [ ] Progression/cosmetics surfaced in product.
- [ ] Analytics operational.
- [ ] Security checklist complete.
- [ ] Privacy/legal docs complete.
- [ ] Abuse/abandonment handling complete.
- [ ] Reconnect handling battle-tested.
- [ ] Browser compatibility verified.
- [ ] Mobile/touch production verified.
- [ ] Performance budget defined and met.
- [ ] Production deployment stable.
- [ ] Monitoring operational.
- [ ] Backup/recovery tested.
- [ ] Alpha feedback loop complete.
- [ ] Beta exit criteria satisfied.
- [ ] PMF measurement framework active.
- [ ] Cost controls validated.
- [ ] Public onboarding flow complete.
- [ ] Help/FAQ/support path complete.
- [ ] Release/update process documented.
- [ ] Rollback process tested.
- [ ] v1 launch decision approved.

**Verification:** integrated release-readiness review across product, engineering, QA, security, operations, and launch criteria.

---

# Current Priority Queue

## P0 — Step 14 Public Matchmaking / Ranked

The next engineering batch should focus on:

1. Queue join/leave state machine.
2. Atomic two-player pairing.
3. Automatic private-room creation from a match.
4. Match-found/reconnect behavior.
5. Surrender/timeout/abandonment outcomes.
6. MMR/rating updates.
7. Browser and race-condition tests.

## P1 — Accounts / Profile Gaps

After the queue foundation is stable:

1. Authentication strategy.
2. Profile UI.
3. Account deletion/data-removal behavior.
4. Expanded profile/stat display.

## P2 — Security / Launch Readiness

Then complete the formal security/privacy/legal checklist before exposing the service beyond controlled testing.

# Verification & Update Rule

1. Make several related code/test changes as one engineering batch.
2. Keep subtasks updated in this tracker as the batch progresses.
3. Do not mark a subtask DONE until its applicable verification is complete.
4. Run the complete relevant CI/browser checks before promoting a batch to DONE.
5. Update the Done / Total counts after verification.
6. Create one final squash commit for the completed batch.
7. Keep the main branch as the clean release baseline; unfinished feature work stays on feature branches.

**Last verified baseline on `main`:** authoritative multiplayer/physics/integrity batch merged and CI green.  
**Next baseline to update:** Step 14 ranked matchmaking.
