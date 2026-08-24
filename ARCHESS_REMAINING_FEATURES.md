# ArChess — Remaining Feature / Release Status

This file supplements `ARCHESS_PRODUCT_DESIGN_TRACKER.md` with implementation status that is intentionally kept separate from the official verified score.

## Engineering implementation status

### Step 0 — Product rules
**Implemented:** final v1 physics/combat rules and competitive exceptions are frozen in `PRODUCT_RULES.md`.

### Step 11 — Accounts, profiles & persistence
**Implemented:** 7/10. Profile/stat presentation is implemented and verified by CI. Authenticated accounts, authenticated-session security, and true account deletion remain release gates because they require a selected identity provider and production data-deletion semantics.

### Step 14 — Public matchmaking & ranked
**Implemented:** 15/15. Queue lifecycle, pairing, recovery, MMR expansion, ranked settlement, placement, tiers, leaderboard APIs/UI, surrender/timeout/abandonment handling, persistence hardening, stress coverage and full CI verification are implemented.

### Step 15 — Progression & cosmetics
**Implemented:** 6/6. Server-owned XP, levels, unlock rules, ownership/equip APIs, persistence, ranked XP awards, progression payloads and UI are implemented and covered by tests/browser verification.

### Step 16 — Analytics & telemetry
**Implemented:** 5/5. Persistent telemetry, irreversible actor hashing, real gameplay/matchmaking/ranked/progression instrumentation, operator-key analytics summary and retention pruning are implemented. Production retention/database operations remain release gates.

### Step 17 — Security / privacy / legal
**Implemented/documented:** core backend controls, privacy notice, community rules and release checklist are in-repo. Authenticated-session security, vulnerability review, asset/license/trademark review and deployed-data legal review remain human gates.

### Step 18 — Deployment baseline
**Implemented:** Docker/Gunicorn image, healthcheck, compose baseline, environment requirements and deployment runbook. External host, HTTPS/domain, backup, rollback and monitoring verification remain environment-dependent release gates.

## What cannot honestly be completed inside the repository alone

- Selecting/provisioning an authentication provider and validating production session security.
- Deploying to a real public host and verifying HTTPS, backups, monitoring and rollback.
- Running a real external alpha cohort and collecting retention/PMF evidence.
- Completing human legal/trademark/asset sign-off.

These are not marked DONE merely because engineering scaffolding exists.

## Official score rule

Implemented-but-unverified or environment-dependent work does not increase the official verified completion percentage until its applicable test, browser, migration, security, legal, deployment, or external-product gate passes.
