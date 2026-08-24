# 3D visibility contract

The 3D scene is presentation-only. `presentation_fix.js` bridges the `ThreeDScene` prototype so the live instance is exposed before the first animation frame. The existing `gameCanvas` remains the input surface; only its visual opacity is changed after a confirmed 3D render instance exists.

Game rules, physics, state transitions, turn logic, and win conditions are not changed by this layer.
