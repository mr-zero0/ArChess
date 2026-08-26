import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);
const ORIGIN = new THREE.Vector3(0, 0, 0);
const DEATH_DURATION = 0.5;

function buildLathe(profile, segments = 24) {
  const points = profile.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(points, segments);
}

function baseMaterial(color, rough = 0.62, metal = 0.08) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function profilePawn() {
  return [
    [0.28, 0.00], [0.28, 0.06], [0.24, 0.10], [0.22, 0.18], [0.16, 0.28], 
    [0.15, 0.38], [0.18, 0.42], [0.14, 0.46], [0.12, 0.52], [0.22, 0.58], 
    [0.18, 0.62], [0.10, 0.66], [0.00, 0.68],
  ];
}

function profileRook() {
  return [
    [0.30, 0.00], [0.30, 0.08], [0.26, 0.12], [0.24, 0.40], [0.28, 0.44], 
    [0.28, 0.58], [0.24, 0.62], [0.24, 0.66], [0.00, 0.66],
  ];
}

function profileBishop() {
  return [
    [0.28, 0.00], [0.28, 0.08], [0.22, 0.12], [0.20, 0.24], [0.16, 0.36], 
    [0.18, 0.40], [0.14, 0.44], [0.12, 0.56], [0.18, 0.64], [0.22, 0.70], 
    [0.16, 0.74], [0.00, 0.78],
  ];
}

function profileQueen() {
  return [
    [0.32, 0.00], [0.32, 0.08], [0.26, 0.12], [0.22, 0.22], [0.18, 0.34], 
    [0.20, 0.40], [0.16, 0.44], [0.16, 0.52], [0.24, 0.58], [0.22, 0.62], 
    [0.10, 0.64], [0.20, 0.70], [0.08, 0.72], [0.18, 0.76], [0.00, 0.78],
  ];
}

function profileKing() {
  return [
    [0.34, 0.00], [0.34, 0.08], [0.28, 0.12], [0.24, 0.22], [0.20, 0.34], 
    [0.24, 0.40], [0.18, 0.44], [0.18, 0.54], [0.22, 0.60], [0.20, 0.64], 
    [0.00, 0.68],
  ];
}

function profileKnightBase() {
  return [
    [0.32, 0.00], [0.32, 0.08], [0.24, 0.12], [0.20, 0.18], [0.18, 0.24], 
    [0.18, 0.32], [0.22, 0.36], [0.16, 0.38], [0.16, 0.42], [0.00, 0.42],
  ];
}

function knightHeadGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.00, 0.06);
  shape.lineTo(0.16, 0.14);
  shape.lineTo(0.30, 0.22);
  shape.lineTo(0.30, 0.32);
  shape.lineTo(0.20, 0.36);
  shape.lineTo(0.22, 0.44);
  shape.lineTo(0.14, 0.50);
  shape.lineTo(0.06, 0.54);
  shape.lineTo(0.02, 0.60);
  shape.lineTo(-0.04, 0.52);
  shape.lineTo(-0.08, 0.58);
  shape.lineTo(-0.12, 0.46);
  shape.lineTo(-0.10, 0.32);
  shape.lineTo(-0.04, 0.14);
  shape.lineTo(0.00, 0.06);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.10,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geometry.translate(0, 0, -0.07);
  return geometry;
}

function kingCrossGeometry() {
  const group = new THREE.Group();
  const bar = new THREE.BoxGeometry(0.10, 0.16, 0.07);
  const arm = new THREE.BoxGeometry(0.07, 0.06, 0.13);
  const v = new THREE.Mesh(bar);
  v.position.y = 0.05;
  const h = new THREE.Mesh(arm);
  h.position.y = 0.05;
  group.add(v, h);
  return group;
}

function rookMerlonGeometry() {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.07, 0.07, 0.07);
  for (let i = 0; i < 4; i += 1) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const mesh = new THREE.Mesh(geometry);
    mesh.position.set(Math.cos(angle) * 0.19, 0.63, Math.sin(angle) * 0.19);
    group.add(mesh);
  }
  return group;
}

function queenCrownSpheres() {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.045, 10, 8);
  for (let i = 0; i < 3; i += 1) {
    const mesh = new THREE.Mesh(geometry);
    mesh.position.set((i - 1) * 0.11, 0.80, 0);
    group.add(mesh);
  }
  return group;
}

const THEME_PALETTES = {
  wood: {
    boardLight: 0xd7bd96,
    boardDark: 0x70513b,
    frame: 0x3a2417,
    background: 0x0a0805,
    white: 0x8a4b34,
    black: 0x1b1c1d,
    whiteMetal: 0.04,
    blackMetal: 0.32,
  },
  light: {
    boardLight: 0xe4edf1,
    boardDark: 0x9fb7c5,
    frame: 0xbfd0d9,
    background: 0xeef4f8,
    white: 0xf4f1ea,
    black: 0x3a4146,
    whiteMetal: 0.02,
    blackMetal: 0.4,
  },
  dark: {
    boardLight: 0x13283a,
    boardDark: 0x0a1927,
    frame: 0x060b11,
    background: 0x050a10,
    white: 0xc8d6e0,
    black: 0x20282e,
    whiteMetal: 0.05,
    blackMetal: 0.5,
  },
};

export class ThreeDScene {
  constructor(glCanvas) {
    this.canvas = glCanvas;
    this.theme = "wood";
    this.lowQuality = false;
    this.dying = [];
    this.entries = new Map();
    this.pieceGeometries = this.buildPieceGeometries();
    this.geometrySets = {};

    this.renderer = new THREE.WebGLRenderer({
      canvas: glCanvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
    this.camera.position.set(5, 8, 9.5);
    this.camera.lookAt(ORIGIN);

    this.buildLights();
    this.buildBoard();

    window.addEventListener("archess:themechange", (event) => {
      this.setTheme(event.detail.theme);
    });

    this.setTheme(document.documentElement.dataset.theme || "wood");
    this.resize();
  }

  buildLights() {
    this.keyLight = new THREE.DirectionalLight(0xfff2df, 2.6);
    this.keyLight.position.set(6, 10, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 6;
    this.keyLight.shadow.camera.bottom = -6;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 40;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.HemisphereLight(0xdfeaff, 0x33241a, 0.75);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0x6fd9ff, 0.5);
    this.rimLight.position.set(-6, 3, -6);
    this.scene.add(this.rimLight);
  }

  buildBoard() {
    const frameGeo = new THREE.BoxGeometry(9.4, 0.5, 9.4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2417, roughness: 0.85, metalness: 0.05 });
    this.frame = new THREE.Mesh(frameGeo, frameMat);
    this.frame.position.y = -0.25;
    this.frame.receiveShadow = true;
    this.scene.add(this.frame);

    const tileGeo = new THREE.BoxGeometry(0.96, 0.06, 0.96);
    this.tileMats = {
      light: new THREE.MeshStandardMaterial({ color: 0xd7bd96, roughness: 0.72, metalness: 0.04 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x70513b, roughness: 0.78, metalness: 0.05 }),
    };
    this.tiles = [];
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const light = (row + col) % 2 === 0;
        const tile = new THREE.Mesh(tileGeo, light ? this.tileMats.light : this.tileMats.dark);
        tile.position.set(col - 3.5, 0.03, row - 3.5);
        tile.receiveShadow = true;
        this.scene.add(tile);
        this.tiles.push(tile);
      }
    }
  }

  buildPieceGeometries() {
    return {
      pawn: buildLathe(profilePawn()),
      rook: buildLathe(profileRook()),
      bishop: buildLathe(profileBishop()),
      queen: buildLathe(profileQueen()),
      king: buildLathe(profileKing()),
      knight: buildLathe(profileKnightBase()),
    };
  }

  buildPieceMeshes(type, material) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(this.pieceGeometries[type], material);
    body.castShadow = true;
    group.add(body);

    if (type === "rook") {
      const merlons = rookMerlonGeometry();
      merlons.traverse((node) => {
        if (node.isMesh) {
          node.material = material;
          node.castShadow = true;
        }
      });
      group.add(merlons);
    } else if (type === "king") {
      const cross = kingCrossGeometry();
      cross.traverse((node) => {
        if (node.isMesh) {
          node.material = material;
          node.castShadow = true;
        }
      });
      group.add(cross);
    } else if (type === "queen") {
      const spheres = queenCrownSpheres();
      spheres.traverse((node) => {
        if (node.isMesh) {
          node.material = material;
          node.castShadow = true;
        }
      });
      group.add(spheres);
    } else if (type === "knight") {
      const head = new THREE.Mesh(knightHeadGeometry(), material);
      head.position.set(0, 0.34, 0.0);
      head.rotation.y = -0.45;
      head.rotation.x = 0.05;
      head.castShadow = true;
      group.add(head);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0b0c });
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
      eye.position.set(0.16, 0.52, -0.09);
      group.add(eye);
    }

    return group;
  }

  setTheme(theme) {
    const palette = THEME_PALETTES[theme] || THEME_PALETTES.wood;
    this.theme = theme;
    this.scene.background = new THREE.Color(palette.background);

    this.frame.material.color.setHex(palette.frame);
    this.tileMats.light.color.setHex(palette.boardLight);
    this.tileMats.dark.color.setHex(palette.boardDark);

    this.materials = {
      white: baseMaterial(palette.white, 0.62, palette.whiteMetal),
      black: baseMaterial(palette.black, 0.5, palette.blackMetal),
    };

    for (const entry of this.entries.values()) {
      entry.group.traverse((node) => {
        if (node.isMesh && node !== entry.shadow && node !== entry.glow) {
          node.material = this.materials[entry.team];
        }
      });
    }

    this.resize();
  }

  setQuality(low) {
    this.lowQuality = low;
    this.renderer.setPixelRatio(low ? 1 : Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = !low;
    this.keyLight.castShadow = !low;
    this.resize();
  }

  resize() {
    const width = this.canvas.clientWidth || 760;
    const height = this.canvas.clientHeight || width;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  reset(game) {
    for (const entry of this.entries.values()) {
      this.scene.remove(entry.group);
    }
    this.entries.clear();
    this.dying = [];
    this.syncPieces(game);
  }

  syncPieces(game) {
    const seen = new Set();
    for (const piece of game.pieces) {
      seen.add(piece.id);
      if (this.entries.has(piece.id)) continue;

      const scale = piece.radius / 0.30;
      const team = piece.team === "white" ? "white" : "black";
      const group = this.buildPieceMeshes(piece.type, this.materials[team]);
      group.scale.setScalar(scale);
      group.position.set(piece.x - 4, 0, piece.y - 4);

      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: themeOpacity(this.theme),
        depthWrite: false,
      });
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.012;
      shadow.renderOrder = 1;
      group.add(shadow);

      const glowMat = new THREE.MeshBasicMaterial({
        color: piece.team === "white" ? 0x78efff : 0xff7d8d,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.72, 28), glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.02;
      glow.renderOrder = 2;
      glow.visible = false;
      group.add(glow);

      const seed = pieceSeed(piece.id);
      this.entries.set(piece.id, {
        id: piece.id,
        team,
        piece,
        group,
        shadow,
        shadowMat,
        glow,
        seed,
        currentRotation: new THREE.Euler(0, 0, 0),
        dying: false,
        dyingTime: 0,
      });
      this.scene.add(group);
    }

    for (const [id, entry] of this.entries) {
      if (!seen.has(id) && !entry.dying) {
        this.scene.remove(entry.group);
        this.entries.delete(id);
      }
    }
  }

  updatePieces(game, deltaTime) {
    for (const entry of this.entries.values()) {
      const piece = entry.piece;

      if (!piece.alive && !entry.dying) {
        entry.dying = true;
        entry.dyingTime = 0;
      }

      if (entry.dying) {
        entry.dyingTime += deltaTime;
        const t = Math.min(1, entry.dyingTime / DEATH_DURATION);
        const ease = 1 - (1 - t) * (1 - t);
        entry.group.scale.setScalar((piece.radius / 0.30) * (1 - ease));
        entry.group.rotation.x += deltaTime * (8 + entry.seed * 4);
        entry.group.position.y = ease * 0.35;
        entry.shadowMat.opacity = themeOpacity(this.theme) * (1 - ease);
        if (t >= 1) {
          this.scene.remove(entry.group);
          this.dying.push(entry);
          this.entries.delete(entry.id);
        }
        continue;
      }

      const speed = Math.hypot(piece.vx, piece.vy);
      const ratio = Math.min(1, speed / GAME_CONFIG.maxLaunchSpeed);
      const moving = speed > GAME_CONFIG.minVelocity * 1.05;

      entry.group.position.set(piece.x - 4, 0, piece.y - 4);
      entry.group.scale.setScalar(piece.radius / 0.30);

      let targetX = 0;
      let targetZ = 0;
      let targetY = 0;
      if (moving) {
        const dx = speed > 0.001 ? piece.vx / speed : 0;
        const dy = speed > 0.001 ? piece.vy / speed : 0;
        const lean = ratio * 0.42;
        targetX = dy * lean;
        targetZ = dx * lean;
        targetY = Math.sin(game.simTime * (8 + speed * 0.5) + entry.seed) * ratio * 0.16;
      }

      const damp = moving ? 0.35 : 0.12;
      entry.currentRotation.x += (targetX - entry.currentRotation.x) * damp;
      entry.currentRotation.z += (targetZ - entry.currentRotation.z) * damp;
      entry.currentRotation.y += (targetY - entry.currentRotation.y) * damp;
      entry.group.rotation.copy(entry.currentRotation);

      const stretch = ratio * 0.55;
      const backX = speed > 0.001 ? (piece.vx / speed) * stretch : 0;
      const backZ = speed > 0.001 ? (piece.vy / speed) * stretch : 0;
      entry.shadow.position.set(-backX * 0.35, 0.012, -backZ * 0.35);
      entry.shadow.scale.set(1 + stretch * 0.5, 1 + stretch * 0.28, 1 + stretch * 0.5);
      entry.shadowMat.opacity = themeOpacity(this.theme) * (moving ? 1 : 0.85);

      const selected = game.selectedPiece && game.selectedPiece.id === entry.id && game.phase === "aim";
      entry.glow.visible = selected;
      if (selected) {
        const pulse = 1 + Math.sin(game.simTime * 6) * 0.06;
        entry.glow.scale.setScalar(pulse);
      }
    }

    if (this.dying.length) {
      const kept = [];
      for (const entry of this.dying) {
        if (entry.dyingTime < DEATH_DURATION) kept.push(entry);
      }
      this.dying = kept;
    }
  }

  render(game, deltaTime) {
    if (!game) return; // Guard against null game state
    if (!this.entries.size) this.syncPieces(game);
    this.syncPieces(game);
    this.updatePieces(game, deltaTime);
    this.renderer.render(this.scene, this.camera);
    
    // Explicitly signal readiness to the professional shell
    if (this.entries.size > 0 && !document.body.classList.contains("archess-3d-ready")) {
      document.body.classList.add("archess-3d-ready");
    }
    // Removed debug visual as 3D is clearly active
  }
}

function pieceSeed(id) {
  let seed = 0;
  for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) % 997;
  return (seed / 997) * Math.PI * 2;
}

function themeOpacity(theme) {
  return theme === "light" ? 0.22 : theme === "wood" ? 0.38 : 0.46;
}

window.ThreeDScene = ThreeDScene;
