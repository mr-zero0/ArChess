(() => {
  "use strict";
  if (window.__ArChessCburnettPieces) return;
  window.__ArChessCburnettPieces = true;

  const SVG = {
    pawn: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:miter"/></svg>',
    rook: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g style="fill:#fff;fill-rule:evenodd;stroke:#000;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" style="stroke-linecap:butt"/><path d="m34 14.3-3 3H14l-3-3M31 17v12.5H14V17M31 29.8l1.5 2.5h-20l1.5-2.5M11 14h23" style="fill:none;stroke:#000"/></g></svg>',
    knight: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g style="fill:none;fill-rule:evenodd;stroke:#000;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" style="fill:#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" style="fill:#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" style="fill:#000"/><path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" transform="rotate(30 13.94 15.65)" style="fill:#000"/></g></svg>',
    bishop: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g style="fill:none;fill-rule:evenodd;stroke:#000;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"><g style="fill:#fff;stroke:#000;stroke-linecap:butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-4-2.5-4-2 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" style="fill:none;stroke:#000;stroke-linejoin:miter"/></g></svg>',
    queen: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g style="fill:#fff;stroke:#000;stroke-width:1.5;stroke-linejoin:round"><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" style="fill:none"/><circle cx="6" cy="12" r="2"/><circle cx="14" cy="9" r="2"/><circle cx="22.5" cy="8" r="2"/><circle cx="31" cy="9" r="2"/><circle cx="39" cy="12" r="2"/></g></svg>',
    king: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g style="fill:none;fill-rule:evenodd;stroke:#000;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" style="fill:#fff;stroke-linecap:butt"/><path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" style="fill:#fff;stroke:#000"/><path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/></g></svg>'
  };

  window.ArChessPieceSvg = Object.freeze(SVG);

  const images = {};
  function getImage(type) {
    if (!images[type]) {
      const image = new Image();
      image.decoding = "async";
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG[type] || SVG.pawn)}`;
      images[type] = image;
    }
    return images[type];
  }

  function paintPiece(piece, ctx, r) {
    const image = getImage(piece.type);
    if (!image.complete || !image.naturalWidth) return false;
    const size = r * 2.35;
    ctx.save();
    ctx.drawImage(image, -size / 2, -size * 0.53, size, size);
    ctx.restore();
    return true;
  }

  const patch = () => {
    if (!window.GameRenderer?.prototype) return false;
    if (window.GameRenderer.prototype.__archessCburnettPatched) return true;
    window.GameRenderer.prototype.__archessCburnettPatched = true;
    window.GameRenderer.prototype.drawPieceSculpture = function drawCburnett(piece, r) {
      if (!paintPiece(piece, this.ctx, r)) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
        this.ctx.fillStyle = piece.team === "white" ? "#f2f2ed" : "#1f2429";
        this.ctx.fill();
      }
    };
    return true;
  };

  if (!patch()) {
    const timer = setInterval(() => { if (patch()) clearInterval(timer); }, 25);
  }
})();
