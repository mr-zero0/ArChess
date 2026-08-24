# ArChess — Step 11 Progress Tracker

**Main Task:** Accounts, Profiles & Persistence

**Implementation status:** 7 / 10 implemented; verification pending.

## Subtasks
- [x] Guest identity.
- [x] Persistent user record.
- [x] Local settings/data foundation.
- [x] Match history foundation.
- [x] Migration foundation.
- [x] Minimal personal-data model.
- [x] Expanded profile/stat presentation through ranked + progression profile APIs/UI.
- [ ] Authenticated account strategy.
- [ ] Account deletion/data removal.
- [ ] Full authenticated profile UI.

## Notes
Guest identity remains intentionally unauthenticated. Authenticated accounts and deletion are not marked complete because they require a real authentication/session boundary rather than a client-supplied guest ID.

## Verification Gate
Profile API/browser tests → authenticated-session design review → privacy/data-deletion review.
