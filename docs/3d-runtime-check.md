# ArChess 3D runtime compatibility

The presentation layer prefers the native Three.js WebGL renderer. When the browser does not expose the WebGL2 API, the rendering layer switches to the CSS 3D compatibility presentation so the existing game canvas remains interactive while the game state continues to drive the visuals.

This document is presentation-only; physics, turn handling, and move validation remain unchanged.
