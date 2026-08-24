# ArChess — Step 16 Progress Tracker

**Main Task:** Analytics & Telemetry

**Implementation status:** 5 / 5 subtasks implemented, verification pending.

## Subtasks
- [x] Persistent telemetry event model.
- [x] Privacy-safe actor hashing.
- [x] Real queue/ranked/progression telemetry instrumentation.
- [x] Protected analytics summary endpoint.
- [x] Telemetry regression coverage.

## Acceptance Criteria
- Raw guest identifiers are never stored in telemetry.
- Analytics endpoint requires an explicit operator key.
- Queue, ranked-result and progression events are emitted from real server paths.
- Telemetry payloads remain structured JSON.
- Reporting is bounded to a configurable 1–90 day window.

## Verification Gate
Migration upgrade/downgrade → Python tests → API auth tests → production database smoke test.
