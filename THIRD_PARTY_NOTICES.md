# ArChess third-party notices

ArChess uses a small set of open-source libraries and artwork for its 2D web UI. No 3D library or 3D asset is loaded by the current 2D runtime.

## Bootstrap 5.3.8

Source: https://github.com/twbs/bootstrap
License: MIT

Bootstrap supplies the application layout primitives, responsive grid, buttons, cards, forms and modal presentation used by the ArChess arena.

## Bootstrap Icons 1.13.1

Source: https://github.com/twbs/icons
License: MIT

Bootstrap Icons supply the compact navigation and action icons used throughout the ArChess UI.

## gchessboard 1.4.0

Source: https://github.com/mganjoo/gchessboard
License: MIT

ArChess uses gchessboard as the 2D chessboard presentation layer. The board is intentionally kept presentation-only: ArChess physics remains authoritative and its continuous piece motion is rendered through the transparent game canvas overlay.

The library is accessible and supports click, drag and keyboard interaction. Its visual configuration uses CSS custom properties for board squares, markers and other board details.

## Cburnett chess artwork

gchessboard bundles chess piece SVG artwork adapted from the Wikimedia Cburnett set.

Original artwork: User:Cburnett / Wikimedia Commons
License: CC BY-SA 3.0

ArChess also retains a local Cburnett-derived SVG integration for its physics piece presentation. The project does not claim the original artwork as its own.

## Deferred 3D dependencies

Three.js and the previous Staunton 3D assets were used by an earlier ArChess prototype. They are intentionally **not loaded or bundled by the current 2D runtime**. 3D presentation is deferred to a later product phase.

## Reference project

Python-Easy-Chess-GUI by fsmosca was used as a product/UX reference for board-first information architecture, real chess-piece presentation, board sizing and player/engine information.

Source: https://github.com/fsmosca/Python-Easy-Chess-GUI
License: LGPL-3.0

ArChess does not copy its desktop application code or bundle it.
