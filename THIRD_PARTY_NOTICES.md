# ArChess third-party notices

## 3D Staunton Pieces — clarkerubber/Staunton-Pieces

ArChess loads the Staunton 3D piece meshes from `clarkerubber/Staunton-Pieces` and normalizes them into the Three.js board coordinate system.

Source: https://github.com/clarkerubber/Staunton-Pieces
License: MIT
Copyright: clarkerubber

The repository provides the six core Staunton pieces as STL source assets. The browser loader fetches those assets lazily and applies ArChess materials, lighting, shadows and transforms.

## 2D Piece Art — mganjoo/gchessboard / Cburnett

ArChess vendors a small, local copy of the 12 Cburnett-derived SVG chess pieces distributed by `mganjoo/gchessboard`. The assets are embedded locally so the board does not wait on an external asset CDN during play.

Source: https://github.com/mganjoo/gchessboard
Library license: MIT
Piece-art license: CC BY-SA 3.0, as documented by the project README.
Original artwork attribution: User:Cburnett / Wikimedia Commons

The ArChess project does not claim the original artwork as its own. The local integration preserves the upstream attribution and license.

## Web Awesome

ArChess uses Web Awesome web components for the professional control surface, segmented renderer controls, dialogs and themed UI tokens.

Source: https://github.com/shoelace-style/webawesome
License: MIT

## Lucide

ArChess may use Lucide icons in UI surfaces where needed.

Source: https://github.com/lucide-icons/lucide
License: ISC
