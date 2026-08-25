import * as THREE from "three";

(() => {
  "use strict";
  if (window.__ArChessOSSAssets) return;
  window.__ArChessOSSAssets = true;

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/static/css/gameplay_polish.css?v=20260825-staunton";
  document.head.appendChild(css);

  // Open-source Staunton meshes from clarkerubber/Staunton-Pieces (MIT).
  // STL is intentionally loaded lazily after the first usable frame.
  const ROOT = "https://cdn.jsdelivr.net/gh/clarkerubber/Staunton-Pieces@master/Source/Staunton";
  const URLS = {
    pawn: `${ROOT}/Pawn/Pawn.STL`,
    knight: `${ROOT}/Knight/Knight.STL`,
    bishop: `${ROOT}/Bishop/Bishop.STL`,
    rook: `${ROOT}/Rook/Rook.STL`,
    queen: `${ROOT}/Queen/Queen.STL`,
    king: `${ROOT}/King/King.STL`,
  };
  const TARGET_HEIGHT = { pawn:0.68, knight:0.92, bishop:0.96, rook:0.84, queen:1.08, king:1.16 };

  const wait = (fn) => {
    let tries = 0;
    const timer = setInterval(() => {
      if (fn() || ++tries > 240) clearInterval(timer);
    }, 100);
  };

  async function load() {
    try {
      const { STLLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/loaders/STLLoader.js");
      const loader = new STLLoader();
      const geometries = {};
      await Promise.all(Object.entries(URLS).map(async ([type, url]) => {
        const geometry = await new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        geometries[type] = geometry;
      }));
      window.__ArChessOSSGeometries = geometries;
      apply(geometries);
      document.documentElement.dataset.ossPieces = "ready";
    } catch (error) {
      console.warn("ArChess Staunton asset pack unavailable; procedural 3D pieces remain active.", error);
      document.documentElement.dataset.ossPieces = "fallback";
    }
  }

  function normalizeGeometry(geometry, type) {
    const clone = geometry.clone();
    clone.computeBoundingBox();
    const box = clone.boundingBox;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.translate(-center.x, -center.y, -center.z);
    const currentHeight = Math.max(0.0001, size.y);
    const scale = TARGET_HEIGHT[type] / currentHeight;
    clone.scale(scale, scale, scale);
    clone.computeBoundingBox();
    clone.translate(0, -clone.boundingBox.min.y, 0);
    clone.computeVertexNormals();
    return clone;
  }

  function apply(geometries) {
    const scene = window.__ArChessThreeD;
    const state = window.gameState;
    if (!scene || !state || !scene.entries) return false;

    for (const entry of scene.entries.values()) {
      const geometry = geometries[entry.piece.type];
      if (!geometry || entry.__ossModel) continue;
      const normalized = normalizeGeometry(geometry, entry.piece.type);
      const material = scene.materials?.[entry.team]?.clone?.() || new THREE.MeshStandardMaterial({
        color: entry.team === "white" ? 0xf1eee7 : 0x25282c,
        roughness: 0.48,
        metalness: 0.08,
      });
      const model = new THREE.Mesh(normalized, material);
      model.castShadow = true;
      model.receiveShadow = true;
      for (const child of [...entry.group.children]) {
        if (child !== entry.shadow && child !== entry.glow) entry.group.remove(child);
      }
      entry.group.add(model);
      entry.__ossModel = model;
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
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
