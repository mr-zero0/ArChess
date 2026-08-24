# ArChess — Step 15 Progress Tracker

**Main Task:** Progression & Cosmetics

**Implementation status:** 6 / 6 subtasks implemented, verification pending.

**Official verified roadmap:** 151 / 204 ≈ 74% (unchanged until this batch passes CI/browser verification).

## Subtasks

- [x] XP progression engine with server-owned XP awards.
- [x] Level calculation and level-up detection.
- [x] Cosmetic catalog with level-based unlock rules.
- [x] Cosmetic ownership normalization with backward-compatible legacy list support.
- [x] Inventory/equip API with locked/unknown cosmetic validation.
- [x] Progression + cosmetics UI integrated into the existing Ranked panel.

## Acceptance Criteria

- Competitive piece statistics remain unchanged by progression.
- XP is awarded only from server-side ranked outcomes.
- Winners receive more XP than losses/abandonments.
- Level-ups automatically unlock eligible cosmetics.
- Locked cosmetics cannot be equipped.
- Equipped cosmetic persists through the existing User JSON field.
- Profile/leaderboard payload exposes level, XP, unlocks and equipped cosmetic.
- Browser UI can view progression and equip an owned cosmetic.

## Verification Gate

Python progression tests → ranked outcome regression → browser panel/equip flow → full CI → persistence verification.

## Next

After verification, fold Step 15 into `ARCHESS_PRODUCT_DESIGN_TRACKER.md`, recalculate the official verified percentage, then proceed to Step 16 Analytics & Telemetry.
