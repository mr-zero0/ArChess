import * as THREE from "three";

(() => {
  "use strict";
  if (window.__ArChessOSSAssets) return;
  window.__ArChessOSSAssets = true;

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/static/css/gameplay_polish.css?v=20260825-final";
  document.head.appendChild(css);

  // Open-source Staunton pieces from clarkerubber/Staunton-Pieces (MIT).
  // These are the same source family used by Lichess for its original 3D pieces.
  const ROOT = "https://raw.githubusercontent.com/clarkerubber/Staunton-Pieces/master/Source/Staunton";
  const URLS = {
    pawn: `${ROOT}/Pawn/Pawn.STL`,
    knight: `${ROOT}/Knight/Knight.STL`,
    bishop: `${ROOT}/Bishop/Bishop.STL`,
    rook: `${ROOT}/Rook/Rook.STL`,
    queen: `${ROOT}/Queen/Queen.STL`,
    king: `${ROOT}/King/King.STL`,
  };
  const TARGET_HEIGHT = { pawn:0.70, knight:0.92, bishop:0.96, rook:0.84, queen:1.08, king:1.16 };

  const wait = (fn) => {
    let tries = 0;
    const timer = setInterval(() => {
      if (fn() || ++tries > 300) clearInterval(timer);
    }, 100);
  };

  async function load() {
    try {
      const { STLLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/loaders/STLLoader.js");
      const loader = new STLLoader();
      const geometries = {};
      await Promise.all(Object.entries(URLS).map(async ([type, url]) => {
        geometries[type] = await new Promise((resolve, reject) => {
          loader.load(url, geometry => resolve(normalize(geometry, type)), undefined, reject);
        });
      }));
      window.__ArChessOSSGeometries = geometries;
      apply(geometries);
      document.documentElement.dataset.ossPieces = "ready";
    } catch (error) {
      console.warn("ArChess Staunton asset pack unavailable; procedural 3D pieces remain active.", error);
      document.documentElement.dataset.ossPieces = "fallback";
    }
  }

  function normalize(source, type) {
    const geometry = source.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    const scale = TARGET_HEIGHT[type] / Math.max(0.0001, size.y);
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingBox();
    geometry.translate(0, -geometry.boundingBox.min.y, 0);
    geometry.computeVertexNormals();
    return geometry;
  }

  function apply(geometries) {
    const scene = window.__ArChessThreeD;
    const game = window.gameState;
    if (!scene || !game || !scene.entries) return false;
    for (const entry of scene.entries.values()) {
      const geometry = geometries[entry.piece.type];
      if (!geometry || entry.__ossModel) continue;
      const material = scene.materials?.[entry.team]?.clone?.() || new THREE.MeshStandardMaterial({
        color: entry.team === "white" ? 0xf2eee7 : 0x22262b,
        roughness: 0.46,
        metalness: 0.06,
      });
      const mesh = new THREE.Mesh(geometry.clone(), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (const child of [...entry.group.children]) {
        if (child !== entry.shadow && child !== entry.glow) entry.group.remove(child);
      }
      entry.group.add(mesh);
      entry.__ossModel = mesh;
    }
    return true;
  }

  function boot() {
    wait(() => {
      const ready = Boolean(window.__ArChessThreeD && window.gameState);
      if (ready) apply(window.__ArChessOSSGeometries || {});
      return ready;
    });
    const start = () => load();
    if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1800 });
    else setTimeout(start, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
