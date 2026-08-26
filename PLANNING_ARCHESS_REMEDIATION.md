# Archess Remediation Plan

## Goal
Transition Archess from "basic UI" to "Professional Shell" and verify renderer stability.

## Steps
1. [ ] Install JS dependencies and enable browser testing environment.
2. [ ] Run full browser-matrix test suite (RUN_BROWSER_MATRIX=1) to identify regressions.
3. [ ] Audit JS bootstrapping: Ensure `presentation_fix.js` and `render_router.js` correctly handle overlay logic.
4. [ ] Fix identified UI defects (responsive sizing, renderer visibility, input handling).
5. [ ] Perform final integrity check against CI gates (Step 23 of Tracker).
