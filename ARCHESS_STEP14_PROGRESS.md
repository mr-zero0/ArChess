# ArChess — Step 14 Progress Snapshot

**Branch:** `feature/step14-ranked-matchmaking`
**Official verified roadmap:** **151 / 204 ≈ 74%**

## Step 14 status

**Implementation: 15 / 15 complete**

**Verification: pending final gate**

Implemented:
- Queue join/leave and idempotent queue state.
- Closest-MMR pairing with time-based search expansion.
- Automatic waiting-room creation and player assignment.
- Match-found polling and stale-match recovery.
- Ranked Elo/MMR settlement with provisional placement logic.
- MMR tiers and bounded leaderboard/profile APIs.
- Ranked result lifecycle integration for King destruction.
- Surrender, timeout and abandonment result reasons through shared settlement.
- Ranked standings/tier UI.
- 80-player queue churn/stress regression coverage.

## Verified checks already green

The latest completed GitHub Actions run before the stress-test commit passed Python, Chromium, Firefox, WebKit, and JavaScript.

## Final verification gate

- Full CI on the current head.
- Queue browser flow with ranked panel.
- Persistence/migration behavior.
- Pairing/idempotency review.
- Production load/soak remains a deployment-stage gate; the current stress test is bounded regression coverage.

## Promotion rule

Do not increase the official verified roadmap percentage or merge the complete Step 14 batch into `main` until the final CI/browser/persistence gate is green.
