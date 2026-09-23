/**
 * ARCHESS - Realistic 3D WebGL Game Engine
 * Powered by Three.js
 * 
 * Features:
 * - Realistic PBR (Physically-Based Rendering) materials for Board & Pieces
 * - Handcrafted procedural 3D Staunton piece geometries (King, Queen, Rook, Bishop, Knight, Pawn)
 * - Dynamic studio lighting: Soft directional key light, ambient fill, dramatic center spotlight
 * - Real-time soft contact shadows (PCFSoftShadowMap)
 * - 3D Slingshot Aiming: Illuminated trajectory ribbon, pulsating power reticle, piece elevation
 * - Dynamic 3D Piece Physics: Velocity-based tilt/inertia, sliding friction, 3D collision sparks
 * - Crystalline 3D King Citadel Wall & Radiant Sovereign Awakening Vortex
 * - Interactive Orbit Camera with smooth damping & cinematic angle presets
 */

(function(window) {
  'use strict';

  class Archess3DEngine {
    constructor(arena, containerId) {
      this.arena = arena;
      this.container = document.getElementById(containerId);
      if (!this.container || !window.THREE) {
        console.warn('[Archess3D] Three.js or container not available');
        return;
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.lights = {};
      this.boardGroup = null;
      this.piecesGroup = null;
      this.vfxGroup = null;

      // Piece mesh mapping: piece.id -> THREE.Group
      this.pieceMeshes = new Map();

      // Slingshot Aiming 3D Objects
      this.aimTrajectoryMesh = null;
      this.aimReticleMesh = null;
      this.aimArrowMesh = null;

      // Citadel Barrier 3D Meshes: team -> THREE.Mesh
      this.citadelBarriers = {};

      // 3D Particles
      this.particles3D = [];

      // Camera preset targets
      // Camera preset targets (Refined for real 3D perspective depth)
      this.cameraPresets = {
        tabletop: { pos: new THREE.Vector3(0, 24, 25), look: new THREE.Vector3(0, 0, -0.6) },
        cinematic: { pos: new THREE.Vector3(0, 13, 20), look: new THREE.Vector3(0, 1.2, 0) },
        tactical: { pos: new THREE.Vector3(0, 34, 5), look: new THREE.Vector3(0, 0, 0) }
      };
      this.activePreset = 'tabletop';
      this._targetCamPos = null;
      this._targetCamLook = null;

      // Raycaster for mouse/touch interactions
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y = 0 plane

      // Geometries and Materials Cache
      this.materials = {};
      this.geometries = {};

      this.init();
    }

    init() {
      const width = this.container.clientWidth || 960;
      const height = this.container.clientHeight || 720;

      // 1. Scene setup
      this.scene = new THREE.Scene();
      this.scene.background = null; // Transparent background to blend with page theme

      // 2. Camera setup (FOV 40 for realistic perspective depth without wide-angle fish-eye)
      this.camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 200);
      const defaultPreset = this.cameraPresets.tabletop;
      this.camera.position.copy(defaultPreset.pos);
      this.camera.lookAt(defaultPreset.look);

      // 3. WebGL Renderer with High Precision & Soft Shadows
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;

      this.renderer.domElement.id = 'archess3DCanvas';
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      this.renderer.domElement.style.outline = 'none';

      // Clear container and append canvas (preserve or restore threePieceHoverBadge)
      let hoverBadge = document.getElementById('threePieceHoverBadge');
      if (hoverBadge && hoverBadge.parentElement === this.container) {
        this.container.removeChild(hoverBadge);
      }
      this.container.innerHTML = '';
      this.renderer.domElement.style.touchAction = 'none';
      this.container.appendChild(this.renderer.domElement);

      if (!hoverBadge) {
        hoverBadge = document.createElement('div');
        hoverBadge.id = 'threePieceHoverBadge';
        hoverBadge.className = 'three-piece-hover-badge';
        hoverBadge.style.display = 'none';
      }
      this.container.appendChild(hoverBadge);

      // 4. OrbitControls
      if (THREE.OrbitControls) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.15; // Don't allow dipping below the table
        this.controls.minDistance = 18;
        this.controls.maxDistance = 55;
        this.controls.target.set(0, 0, 0);
        this.controls.enabled = true; // Enabled for right-click and middle-wheel; LEFT is disabled below

        // Map mouse buttons: LEFT is disabled (-1) so OrbitControls NEVER intercepts or steals slingshot drag!
        this.controls.mouseButtons = {
          LEFT: -1,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE
        };
      }

      // 5. Build Material & Geometry Library
      this.initMaterials();

      // 6. Build Scene Hierarchy
      this.boardGroup = new THREE.Group();
      this.piecesGroup = new THREE.Group();
      this.vfxGroup = new THREE.Group();

      this.scene.add(this.boardGroup);
      this.scene.add(this.piecesGroup);
      this.scene.add(this.vfxGroup);

      // 7. Lighting
      this.setupLights();

      // 8. Build 3D Board & Frame
      this.buildBoard();

      // 9. Build Aiming Trajectory Meshes
      this.setupAimMeshes();

      // 10. Sync Initial Pieces
      this.syncPieces();

      // 11. Wire Input Events
      this.setupInteractionListeners();

      // 12. Apply Active Board & Piece Themes
      try {
        const savedTheme = localStorage.getItem('archess_board_theme') || 'midnight';
        this.setBoardTheme(savedTheme);
        const savedPieceTheme = localStorage.getItem('archess_piece_theme') || 'classic';
        this.setPieceTheme(savedPieceTheme);
      } catch (e) {}

      console.log('[Archess3D] Realistic 3D WebGL Game Engine initialized successfully.');
    }

    /* -------------------------------------------------------------
       Materials & Textures Library (PBR Physically-Based Rendering)
    ------------------------------------------------------------- */
    initMaterials() {
      // 1. Procedural Noise / Wood / Marble Textures via Canvas
      const darkWoodTex = this.createWoodTexture('#382518', '#22150c', 256, 256);
      const lightWoodTex = this.createWoodTexture('#cfc1a8', '#b8a88d', 256, 256);
      const frameWoodTex = this.createWoodTexture('#24150c', '#150c07', 512, 512);
      const marbleTex = this.createMarbleTexture(256, 256);

      // 2. Board Frame (Polished Dark Walnut / Mahogany with warm gold trim)
      this.materials.boardFrame = new THREE.MeshStandardMaterial({
        color: 0x24150c,
        map: frameWoodTex,
        roughness: 0.38,
        metalness: 0.10
      });

      this.materials.brassTrim = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.28,
        metalness: 0.85
      });

      this.materials.cushionRail = new THREE.MeshStandardMaterial({
        color: 0x141c2b,
        roughness: 0.55,
        metalness: 0.15
      });

      // 3. Board Tiles (Warm maple/birch cream vs rich walnut espresso - high contrast without glare)
      this.materials.tileLight = new THREE.MeshStandardMaterial({
        color: 0xdcd0bb,
        map: lightWoodTex,
        roughness: 0.44,
        metalness: 0.02
      });

      this.materials.tileDark = new THREE.MeshStandardMaterial({
        color: 0x483526,
        map: darkWoodTex,
        roughness: 0.46,
        metalness: 0.04
      });

      // 4. White Army: Polished Alabaster Ivory (Clear visible contours and bevels)
      this.materials.pieceWhite = new THREE.MeshStandardMaterial({
        color: 0xede6d8,
        roughness: 0.16,
        metalness: 0.06,
        envMapIntensity: 1.15
      });

      this.materials.pieceWhiteAccent = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Burnished imperial gold finials
        roughness: 0.12,
        metalness: 0.94,
        envMapIntensity: 1.6
      });

      // 5. Black Army: Polished Obsidian Onyx (Clear form, satin sheen, deep contrast)
      this.materials.pieceBlack = new THREE.MeshStandardMaterial({
        color: 0x181e26,
        roughness: 0.18,
        metalness: 0.25,
        envMapIntensity: 1.2
      });

      this.materials.pieceBlackAccent = new THREE.MeshStandardMaterial({
        color: 0xe11d48, // Radiant ruby crimson crest
        roughness: 0.14,
        metalness: 0.90,
        envMapIntensity: 1.5
      });

      // 6. Contact Shadows beneath pieces
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 64;
      shadowCanvas.height = 64;
      const sctx = shadowCanvas.getContext('2d');
      const grad = sctx.createRadialGradient(32, 32, 4, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,0.65)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 64, 64);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);

      this.materials.contactShadow = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      });
    }

    setBoardTheme(themeKey) {
      const themes = {
        midnight:   { light: 0x3a485a, dark: 0x1b232e, frame: 0x0f141c, trim: 0xd4af37 },
        woodland:   { light: 0xdcd0bb, dark: 0x483526, frame: 0x24150c, trim: 0xc68a4c },
        ivory:      { light: 0xd4dae2, dark: 0x455268, frame: 0x1a1e26, trim: 0x98a6bd },
        emerald:    { light: 0xd4cba9, dark: 0x235235, frame: 0x0f2617, trim: 0x73b088 },
        cyberpunk:  { light: 0x2a144e, dark: 0x120826, frame: 0x070212, trim: 0x00f3ff },
        bloodstone: { light: 0x3d2028, dark: 0x4a0e19, frame: 0x180307, trim: 0xe84158 },
        oceanic:    { light: 0x5a85a4, dark: 0x163450, frame: 0x091726, trim: 0x38d9a9 }
      };
      const t = themes[themeKey] || themes.midnight;
      if (this.materials.tileLight) this.materials.tileLight.color.setHex(t.light);
      if (this.materials.tileDark) this.materials.tileDark.color.setHex(t.dark);
      if (this.materials.boardFrame) this.materials.boardFrame.color.setHex(t.frame);
      if (this.materials.brassTrim) this.materials.brassTrim.color.setHex(t.trim);
    }

    setPieceTheme(themeKey) {
      const pKey = (themeKey || 'classic').toLowerCase();
      const styles = {
        classic: {
          white: { color: 0xe8e2d5, roughness: 0.30, metalness: 0.06, emissive: 0x000000, emissiveIntensity: 0 },
          whiteAccent: { color: 0xd4af37, roughness: 0.26, metalness: 0.88, emissive: 0x000000, emissiveIntensity: 0 },
          black: { color: 0x222a36, roughness: 0.32, metalness: 0.24, emissive: 0x000000, emissiveIntensity: 0 },
          blackAccent: { color: 0xe11d48, roughness: 0.24, metalness: 0.85, emissive: 0x000000, emissiveIntensity: 0 }
        },
        staunton: {
          white: { color: 0xe8e2d5, roughness: 0.30, metalness: 0.06, emissive: 0x000000, emissiveIntensity: 0 },
          whiteAccent: { color: 0xd4af37, roughness: 0.26, metalness: 0.88, emissive: 0x000000, emissiveIntensity: 0 },
          black: { color: 0x222a36, roughness: 0.32, metalness: 0.24, emissive: 0x000000, emissiveIntensity: 0 },
          blackAccent: { color: 0xe11d48, roughness: 0.24, metalness: 0.85, emissive: 0x000000, emissiveIntensity: 0 }
        },
        neo: {
          white: { color: 0xffffff, roughness: 0.18, metalness: 0.04, emissive: 0x111111, emissiveIntensity: 0.08 },
          whiteAccent: { color: 0x0f172a, roughness: 0.22, metalness: 0.85, emissive: 0x000000, emissiveIntensity: 0 },
          black: { color: 0x1e293b, roughness: 0.38, metalness: 0.18, emissive: 0x000000, emissiveIntensity: 0 },
          blackAccent: { color: 0xf59e0b, roughness: 0.20, metalness: 0.88, emissive: 0x332200, emissiveIntensity: 0.15 }
        },
        cyber: {
          white: { color: 0x00f3ff, roughness: 0.22, metalness: 0.75, emissive: 0x00f3ff, emissiveIntensity: 0.45 },
          whiteAccent: { color: 0x38bdf8, roughness: 0.15, metalness: 0.92, emissive: 0x0099ff, emissiveIntensity: 0.30 },
          black: { color: 0xff007f, roughness: 0.22, metalness: 0.75, emissive: 0xff007f, emissiveIntensity: 0.50 },
          blackAccent: { color: 0xff3366, roughness: 0.15, metalness: 0.92, emissive: 0xff0055, emissiveIntensity: 0.35 }
        },
        crystal: {
          white: { color: 0xdbeafe, roughness: 0.10, metalness: 0.14, emissive: 0x38bdf8, emissiveIntensity: 0.28 },
          whiteAccent: { color: 0x60a5fa, roughness: 0.12, metalness: 0.45, emissive: 0x0284c7, emissiveIntensity: 0.20 },
          black: { color: 0x4c1d95, roughness: 0.12, metalness: 0.20, emissive: 0x7c3aed, emissiveIntensity: 0.32 },
          blackAccent: { color: 0xa855f7, roughness: 0.14, metalness: 0.55, emissive: 0x9333ea, emissiveIntensity: 0.25 }
        },
        mono: {
          white: { color: 0xf8fafc, roughness: 0.48, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
          whiteAccent: { color: 0x94a3b8, roughness: 0.40, metalness: 0.10, emissive: 0x000000, emissiveIntensity: 0 },
          black: { color: 0x09090b, roughness: 0.52, metalness: 0.04, emissive: 0x000000, emissiveIntensity: 0 },
          blackAccent: { color: 0x27272a, roughness: 0.40, metalness: 0.10, emissive: 0x000000, emissiveIntensity: 0 }
        }
      };

      const s = styles[pKey] || styles.classic;

      const applyMat = (mat, cfg) => {
        if (!mat) return;
        if (cfg.color !== undefined) mat.color.setHex(cfg.color);
        if (cfg.roughness !== undefined) mat.roughness = cfg.roughness;
        if (cfg.metalness !== undefined) mat.metalness = cfg.metalness;
        if (mat.emissive) {
          mat.emissive.setHex(cfg.emissive || 0x000000);
          mat.emissiveIntensity = cfg.emissiveIntensity || 0;
        }
        mat.needsUpdate = true;
      };

      applyMat(this.materials.pieceWhite, s.white);
      applyMat(this.materials.pieceWhiteAccent, s.whiteAccent);
      applyMat(this.materials.pieceBlack, s.black);
      applyMat(this.materials.pieceBlackAccent, s.blackAccent);
    }

    createWoodTexture(col1, col2, w, h) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = col1;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = col2;
      for (let i = 0; i < 40; i++) {
        const y = Math.random() * h;
        const thickness = Math.random() * 3 + 1;
        ctx.globalAlpha = Math.random() * 0.25 + 0.08;
        ctx.fillRect(0, y, w, thickness);
      }
      ctx.globalAlpha = 1.0;
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    createMarbleTexture(w, h) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(210, 220, 230, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, 0);
        ctx.bezierCurveTo(Math.random() * w, h * 0.3, Math.random() * w, h * 0.7, Math.random() * w, h);
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    }

    /* -------------------------------------------------------------
       Studio Lighting (Key Light, Fill Light, Rear Rim Light, Spotlight & Environment)
    ------------------------------------------------------------- */
    setupEnvironment() {
      // Procedural studio environment map for physically-based reflections on lacquered pieces & brass
      const envCanvas = document.createElement('canvas');
      envCanvas.width = 512;
      envCanvas.height = 256;
      const ctx = envCanvas.getContext('2d');

      const bgGrad = ctx.createLinearGradient(0, 0, 0, 256);
      bgGrad.addColorStop(0, '#1c2638');
      bgGrad.addColorStop(0.45, '#0e1522');
      bgGrad.addColorStop(1, '#070b12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 512, 256);

      const softbox1 = ctx.createRadialGradient(160, 60, 5, 160, 60, 95);
      softbox1.addColorStop(0, 'rgba(255, 252, 245, 0.95)');
      softbox1.addColorStop(0.5, 'rgba(255, 242, 225, 0.35)');
      softbox1.addColorStop(1, 'rgba(255, 242, 225, 0.0)');
      ctx.fillStyle = softbox1;
      ctx.fillRect(70, 0, 180, 130);

      const softbox2 = ctx.createRadialGradient(380, 80, 5, 380, 80, 110);
      softbox2.addColorStop(0, 'rgba(215, 235, 255, 0.80)');
      softbox2.addColorStop(0.5, 'rgba(190, 220, 255, 0.25)');
      softbox2.addColorStop(1, 'rgba(190, 220, 255, 0.0)');
      ctx.fillStyle = softbox2;
      ctx.fillRect(270, 0, 220, 150);

      const envTexture = new THREE.CanvasTexture(envCanvas);
      envTexture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = envTexture;
    }

    setupLights() {
      this.setupEnvironment();

      // 1. Soft Warm Ambient Light
      const ambientLight = new THREE.AmbientLight(0xfff6ea, 0.48);
      this.scene.add(ambientLight);
      this.lights.ambient = ambientLight;

      // 2. Main Key Directional Light (Warm sunlight, crisp realistic soft shadows)
      const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.15);
      keyLight.position.set(16, 32, 20);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 75;
      const d = 17;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0003;
      keyLight.shadow.radius = 2.2;
      this.scene.add(keyLight);
      this.lights.key = keyLight;

      // 3. Cool Accent Fill Light
      const fillLight = new THREE.DirectionalLight(0xdbe4ee, 0.42);
      fillLight.position.set(-20, 18, -16);
      this.scene.add(fillLight);
      this.lights.fill = fillLight;

      // 4. Rear Rim Light (Crisp rim definition to piece silhouettes & crowns)
      const rimLight = new THREE.DirectionalLight(0xa5c4f2, 0.65);
      rimLight.position.set(0, 24, -24);
      this.scene.add(rimLight);
      this.lights.rim = rimLight;

      // 5. Warm Front Fill Light
      const frontFill = new THREE.DirectionalLight(0xfef3c7, 0.35);
      frontFill.position.set(0, 12, 24);
      this.scene.add(frontFill);
      this.lights.front = frontFill;

      // 6. Broad Center Spotlight
      const spotLight = new THREE.SpotLight(0xfffaec, 0.50, 60, Math.PI / 3.0, 0.45, 1.0);
      spotLight.position.set(0, 30, 0);
      spotLight.target.position.set(0, 0, 0);
      this.scene.add(spotLight);
      this.scene.add(spotLight.target);
      this.lights.spot = spotLight;
    }

    /* -------------------------------------------------------------
       3D Chessboard Construction
    ------------------------------------------------------------- */
    buildBoard() {
      this.boardGroup.clear();

      const BOARD_EXT_SIZE = 24.0; // Outer slab size
      const GRID_SIZE = 20.0;      // 8x8 squares area
      const TILE_SIZE = GRID_SIZE / 8; // 2.5 units per square
      const SLAB_THICKNESS = 1.6;

      // 1. Main Beveled Outer Wooden Slab
      const frameGeo = new THREE.BoxGeometry(BOARD_EXT_SIZE, SLAB_THICKNESS, BOARD_EXT_SIZE);
      const frameMesh = new THREE.Mesh(frameGeo, this.materials.boardFrame);
      frameMesh.position.y = -SLAB_THICKNESS / 2;
      frameMesh.receiveShadow = true;
      frameMesh.castShadow = true;
      this.boardGroup.add(frameMesh);

      // 2. Brass Inlay Perimeter Border
      const trimWidth = 0.22;
      const trimGeoH = new THREE.BoxGeometry(GRID_SIZE + trimWidth * 2, 0.06, trimWidth);
      const trimGeoV = new THREE.BoxGeometry(trimWidth, 0.06, GRID_SIZE + trimWidth * 2);

      const tTop = new THREE.Mesh(trimGeoH, this.materials.brassTrim);
      tTop.position.set(0, 0.03, -GRID_SIZE / 2 - trimWidth / 2);
      const tBtm = new THREE.Mesh(trimGeoH, this.materials.brassTrim);
      tBtm.position.set(0, 0.03, GRID_SIZE / 2 + trimWidth / 2);
      const tLeft = new THREE.Mesh(trimGeoV, this.materials.brassTrim);
      tLeft.position.set(-GRID_SIZE / 2 - trimWidth / 2, 0.03, 0);
      const tRight = new THREE.Mesh(trimGeoV, this.materials.brassTrim);
      tRight.position.set(GRID_SIZE / 2 + trimWidth / 2, 0.03, 0);

      this.boardGroup.add(tTop, tBtm, tLeft, tRight);

      // 3. 3D Cushion Perimeter Rails (Tactical boundary pieces bounce off)
      const railH = 0.55;
      const railThick = 0.45;
      const railGeoH = new THREE.BoxGeometry(GRID_SIZE + 0.8, railH, railThick);
      const railGeoV = new THREE.BoxGeometry(railThick, railH, GRID_SIZE + 0.8);

      const rNorth = new THREE.Mesh(railGeoH, this.materials.cushionRail);
      rNorth.position.set(0, railH / 2, -GRID_SIZE / 2 - railThick / 2 - 0.2);
      rNorth.castShadow = true;
      const rSouth = new THREE.Mesh(railGeoH, this.materials.cushionRail);
      rSouth.position.set(0, railH / 2, GRID_SIZE / 2 + railThick / 2 + 0.2);
      rSouth.castShadow = true;
      const rWest = new THREE.Mesh(railGeoV, this.materials.cushionRail);
      rWest.position.set(-GRID_SIZE / 2 - railThick / 2 - 0.2, railH / 2, 0);
      rWest.castShadow = true;
      const rEast = new THREE.Mesh(railGeoV, this.materials.cushionRail);
      rEast.position.set(GRID_SIZE / 2 + railThick / 2 + 0.2, railH / 2, 0);
      rEast.castShadow = true;

      this.boardGroup.add(rNorth, rSouth, rWest, rEast);

      // 4. Inset 64 Playing Squares (Rank 1-8, File A-H)
      const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.985, 0.08, TILE_SIZE * 0.985);

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isDark = (r + c) % 2 === 1;
          const mat = isDark ? this.materials.tileDark : this.materials.tileLight;
          const tile = new THREE.Mesh(tileGeo, mat);

          // Center squares from -GRID_SIZE/2 to +GRID_SIZE/2
          const posX = -GRID_SIZE / 2 + (c + 0.5) * TILE_SIZE;
          const posZ = -GRID_SIZE / 2 + (r + 0.5) * TILE_SIZE;
          tile.position.set(posX, 0.04, posZ);
          tile.receiveShadow = true;
          this.boardGroup.add(tile);
        }
      }

      // 5. Grand Parlor Table underneath the board slab
      const tableGeo = new THREE.CylinderGeometry(23.5, 24.2, 1.4, 64);
      const tableWoodTex = this.createWoodTexture('#1c1108', '#0f0804', 512, 512);
      const tableMat = new THREE.MeshStandardMaterial({
        color: 0x160e07,
        map: tableWoodTex,
        roughness: 0.32,
        metalness: 0.08
      });
      const tableMesh = new THREE.Mesh(tableGeo, tableMat);
      tableMesh.position.y = -SLAB_THICKNESS - 0.7;
      tableMesh.receiveShadow = true;
      this.boardGroup.add(tableMesh);

      // Tabletop Outer Brass Bevel Trim
      const tableTrimGeo = new THREE.TorusGeometry(23.8, 0.16, 16, 64);
      tableTrimGeo.rotateX(Math.PI / 2);
      const tableTrim = new THREE.Mesh(tableTrimGeo, this.materials.brassTrim);
      tableTrim.position.y = -SLAB_THICKNESS - 0.02;
      this.boardGroup.add(tableTrim);

      // Shadow catcher plane on tabletop
      const shadowPlaneGeo = new THREE.PlaneGeometry(38, 38);
      const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.55 });
      const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -SLAB_THICKNESS + 0.01;
      shadowPlane.receiveShadow = true;
      this.boardGroup.add(shadowPlane);

      // 6. Algebraic Rank & File Notation on Outer Frame
      const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

      const makeCharMesh = (char) => {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 48;
        const cx = c.getContext('2d');
        cx.font = 'bold 30px serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillStyle = 'rgba(212, 175, 55, 0.72)';
        cx.fillText(char, 24, 24);
        const tex = new THREE.CanvasTexture(c);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), mat);
        plane.rotation.x = -Math.PI / 2;
        return plane;
      };

      for (let i = 0; i < 8; i++) {
        const pos = -GRID_SIZE / 2 + (i + 0.5) * TILE_SIZE;
        const sFile = makeCharMesh(files[i]);
        sFile.position.set(pos, 0.04, GRID_SIZE / 2 + 1.1);
        const nFile = makeCharMesh(files[i]);
        nFile.position.set(pos, 0.04, -GRID_SIZE / 2 - 1.1);
        nFile.rotation.z = Math.PI;

        const wRank = makeCharMesh(ranks[i]);
        wRank.position.set(-GRID_SIZE / 2 - 1.1, 0.04, pos);
        const eRank = makeCharMesh(ranks[i]);
        eRank.position.set(GRID_SIZE / 2 + 1.1, 0.04, pos);

        this.boardGroup.add(sFile, nFile, wRank, eRank);
      }

      // Store board layout scale metrics for coordinate conversions
      this.gridSize3D = GRID_SIZE;
      this.tileSize3D = TILE_SIZE;
    }

    /* -------------------------------------------------------------
       Procedural 3D Staunton Piece Geometries
    ------------------------------------------------------------- */
    createPieceGeometry(type) {
      if (this.geometries[type]) return this.geometries[type];

      const pieceGroup = new THREE.Group();
      const R = 0.92; // Base scale unit

      // Standard Multi-Tiered Pedestal Base (Common to Staunton pieces)
      const base1 = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 1.05, 0.35, 32));
      base1.position.y = 0.175;
      base1.castShadow = true;
      base1.receiveShadow = true;

      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(R * 0.90, 0.08, 16, 32));
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 0.36;

      const base2 = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.70, R * 0.88, 0.32, 32));
      base2.position.y = 0.52;
      base2.castShadow = true;

      pieceGroup.add(base1, baseRing, base2);

      switch (type) {
        case 'pawn': {
          // Tapered concave stem
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.34, R * 0.68, 0.90, 32));
          stem.position.y = 1.13;
          stem.castShadow = true;

          // Collar ring
          const collar = new THREE.Mesh(new THREE.TorusGeometry(R * 0.44, 0.09, 16, 32));
          collar.rotation.x = Math.PI / 2;
          collar.position.y = 1.58;

          // Spherical head
          const head = new THREE.Mesh(new THREE.SphereGeometry(R * 0.48, 32, 32));
          head.position.y = 2.02;
          head.castShadow = true;

          pieceGroup.add(stem, collar, head);
          break;
        }

        case 'rook': {
          // Broad cylindrical fortified tower
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.65, R * 0.78, 1.25, 32));
          tower.position.y = 1.30;
          tower.castShadow = true;

          // Cornice ledge
          const cornice = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.82, R * 0.68, 0.28, 32));
          cornice.position.y = 2.06;
          cornice.castShadow = true;

          // Crenellated Battlements (Castle merlons)
          const battlements = new THREE.Group();
          const merlonCount = 4;
          for (let m = 0; m < merlonCount; m++) {
            const angle = (m / merlonCount) * Math.PI * 2 + Math.PI / 4;
            const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.24));
            merlon.position.set(Math.cos(angle) * 0.62, 2.38, Math.sin(angle) * 0.62);
            merlon.rotation.y = -angle + Math.PI / 2;
            merlon.castShadow = true;
            battlements.add(merlon);
          }
          pieceGroup.add(tower, cornice, battlements);
          break;
        }

        case 'knight': {
          // Horse neck riser
          const neckBase = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.52, R * 0.72, 0.60, 24));
          neckBase.position.y = 0.98;
          neckBase.castShadow = true;

          // Sculpted Equestrian Bust
          const horseBust = new THREE.Group();

          // Main head volume (angled forward)
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.15, 0.95));
          head.position.set(0, 1.65, 0.12);
          head.rotation.x = -0.32;
          head.castShadow = true;

          // Snout / Muzzle
          const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.65, 16));
          muzzle.rotation.x = Math.PI / 2.6;
          muzzle.position.set(0, 1.55, 0.68);
          muzzle.castShadow = true;

          // Arched Mane Crest
          const mane = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.95, 0.45));
          mane.position.set(0, 1.85, -0.36);
          mane.rotation.x = 0.22;
          mane.castShadow = true;

          // Ears
          const earGeo = new THREE.ConeGeometry(0.12, 0.32, 8);
          const earLeft = new THREE.Mesh(earGeo);
          earLeft.position.set(-0.24, 2.22, -0.06);
          earLeft.rotation.z = -0.15;
          const earRight = new THREE.Mesh(earGeo);
          earRight.position.set(0.24, 2.22, -0.06);
          earRight.rotation.z = 0.15;

          horseBust.add(head, muzzle, mane, earLeft, earRight);
          pieceGroup.add(neckBase, horseBust);
          break;
        }

        case 'bishop': {
          // Slender concave stem
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.38, R * 0.70, 1.20, 32));
          stem.position.y = 1.28;
          stem.castShadow = true;

          // Dual collar rings
          const collar1 = new THREE.Mesh(new THREE.TorusGeometry(R * 0.48, 0.08, 16, 32));
          collar1.rotation.x = Math.PI / 2;
          collar1.position.y = 1.88;

          // Elongated Mitre Cap
          const mitre = new THREE.Mesh(new THREE.SphereGeometry(R * 0.50, 32, 32));
          mitre.scale.set(1.0, 1.45, 1.0);
          mitre.position.y = 2.45;
          mitre.castShadow = true;

          // Apex Finial Orb
          const finial = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 16, 16));
          finial.position.y = 3.25;
          finial.name = 'metallic_accent';

          pieceGroup.add(stem, collar1, mitre, finial);
          break;
        }

        case 'queen': {
          // Flowing flared gown
          const gown = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.42, R * 0.72, 1.55, 32));
          gown.position.y = 1.45;
          gown.castShadow = true;

          // Regal waist ring
          const waistRing = new THREE.Mesh(new THREE.TorusGeometry(R * 0.50, 0.09, 16, 32));
          waistRing.rotation.x = Math.PI / 2;
          waistRing.position.y = 2.22;

          // Fluted Coronet Head
          const coronetBase = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.68, R * 0.44, 0.65, 32));
          coronetBase.position.y = 2.60;
          coronetBase.castShadow = true;

          // Coronet Jewels (8 points with spherical pearls)
          const jewels = new THREE.Group();
          for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2;
            const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12));
            pearl.position.set(Math.cos(angle) * 0.68, 2.96, Math.sin(angle) * 0.68);
            pearl.name = 'metallic_accent';
            jewels.add(pearl);
          }

          // Apex Sovereign Orb
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16));
          orb.position.y = 3.02;
          orb.name = 'metallic_accent';

          pieceGroup.add(gown, waistRing, coronetBase, jewels, orb);
          break;
        }

        case 'king': {
          // Colossus majestic body
          const mantle = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.48, R * 0.78, 1.70, 32));
          mantle.position.y = 1.52;
          mantle.castShadow = true;

          // Stepped capital
          const capital = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.68, R * 0.52, 0.45, 32));
          capital.position.y = 2.50;
          capital.castShadow = true;

          // Imperial Crown Base
          const crown = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 32, 32));
          crown.scale.set(1.0, 0.85, 1.0);
          crown.position.y = 2.92;
          crown.castShadow = true;

          // Sovereign Cross Finial at summit
          const crossGroup = new THREE.Group();
          const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18));
          crossV.position.y = 3.58;
          const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.18));
          crossH.position.y = 3.68;
          crossV.name = 'metallic_accent';
          crossH.name = 'metallic_accent';
          crossGroup.add(crossV, crossH);

          pieceGroup.add(mantle, capital, crown, crossGroup);
          break;
        }
      }

      this.geometries[type] = pieceGroup;
      return pieceGroup;
    }

    /* -------------------------------------------------------------
       Sync Authoritative Physics Pieces to 3D Scene
    ------------------------------------------------------------- */
    syncPieces() {
      if (!this.arena || !this.arena.pieces) return;

      const activeIds = new Set();
      const now = performance.now();

      this.arena.pieces.forEach(p => {
        activeIds.add(p.id);
        let meshGroup = this.pieceMeshes.get(p.id);

        // Check if piece changed type (e.g. Pawn promoted to Queen!)
        if (meshGroup && meshGroup.userData.pieceType !== p.type) {
          this.piecesGroup.remove(meshGroup);
          this.pieceMeshes.delete(p.id);
          meshGroup = null;
        }

        if (!meshGroup) {
          meshGroup = this.buildPieceMesh(p);
          this.piecesGroup.add(meshGroup);
          this.pieceMeshes.set(p.id, meshGroup);
        }

        // Convert 2D Arena Board Space (x, y) to 3D World Space (X, Z)
        const pos3D = this.boardToWorld(p.x, p.y);
        
        // Handle Elevation: drag lift + Knight aerial vault leap
        const isSelected = this.arena.selectedPiece === p;
        const dragElev = (isSelected && this.arena.isDragging) ? 1.6 : 0;

        let leapHeight = 0;
        if (p.type === 'knight' && p.isLeaping) {
          const progress = Math.min(1.0, (p.leapDistTraveled || 0) / (p.leapMaxDist || 140));
          leapHeight = Math.sin(progress * Math.PI) * 3.2;
          meshGroup.rotation.x -= Math.sin(progress * Math.PI) * 0.28;
        }

        const targetElev = dragElev + leapHeight;
        meshGroup.position.x = pos3D.x;
        meshGroup.position.z = pos3D.z;
        meshGroup.position.y = THREE.MathUtils.lerp(meshGroup.position.y, targetElev, 0.35);

        // Contact shadow position & opacity tracking height
        const shadowMesh = meshGroup.userData.shadowMesh;
        if (shadowMesh) {
          shadowMesh.position.y = 0.045 - meshGroup.position.y;
          const heightRatio = meshGroup.position.y / 4.0;
          shadowMesh.material.opacity = Math.max(0.15, 0.70 - heightRatio * 0.50);
          const shadowScale = 1.0 + heightRatio * 0.40;
          shadowMesh.scale.set(shadowScale, shadowScale, 1);
        }

        // Visibility & Death
        if (p.dead) {
          meshGroup.visible = false;
        } else {
          meshGroup.visible = true;

          // Velocity-based dynamic tilt / inertia or slingshot drag tension tilt
          const speed = Math.hypot(p.vx || 0, p.vy || 0);
          if (isSelected && this.arena.isDragging) {
            let pullX = this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x;
            let pullY = this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y;
            if (typeof this.arena.clampLaunchVector === 'function') {
              const clamped = this.arena.clampLaunchVector(p, pullX, pullY);
              pullX = clamped.pullX;
              pullY = clamped.pullY;
            }
            const dist = Math.hypot(pullX, pullY);
            const angle = Math.atan2(pullY, pullX);
            const tiltAmount = Math.min(0.35, (dist / this.arena.maxPullDistance) * 0.35);
            meshGroup.rotation.x = THREE.MathUtils.lerp(meshGroup.rotation.x, -Math.sin(angle) * tiltAmount, 0.25);
            meshGroup.rotation.z = THREE.MathUtils.lerp(meshGroup.rotation.z, Math.cos(angle) * tiltAmount, 0.25);
          } else if (speed > 0.4) {
            const tiltMax = 0.22;
            const angle = Math.atan2(p.vy, p.vx);
            meshGroup.rotation.z = THREE.MathUtils.lerp(meshGroup.rotation.z, -Math.cos(angle) * Math.min(tiltMax, speed * 0.025), 0.2);
            meshGroup.rotation.x = THREE.MathUtils.lerp(meshGroup.rotation.x, Math.sin(angle) * Math.min(tiltMax, speed * 0.025), 0.2);
          } else {
            meshGroup.rotation.z = THREE.MathUtils.lerp(meshGroup.rotation.z, 0, 0.2);
            meshGroup.rotation.x = THREE.MathUtils.lerp(meshGroup.rotation.x, 0, 0.2);
          }

          // Dynamic Collision Impact Flash in 3D
          if (p.hitFlash && p.hitFlash > 0) {
            meshGroup.traverse(child => {
              if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setHex(0xff3333);
                child.material.emissiveIntensity = p.hitFlash * 0.85;
              }
            });
          } else {
            meshGroup.traverse(child => {
              if (child.isMesh && child.material && child.material.emissive && child.name !== 'veteran_star_mesh') {
                child.material.emissiveIntensity = 0;
              }
            });
          }

          // Veteran Pawn 3D Golden Star
          const star = meshGroup.getObjectByName('veteran_star');
          if (star) {
            if (p.type === 'pawn' && !p.promoted && p.killedNonPawn) {
              star.visible = true;
              star.rotation.y += 0.035;
              star.position.y = 2.85 + Math.sin(now / 240) * 0.12;
            } else {
              star.visible = false;
            }
          }

          // Braced / Phalanx 3D Defense Glyph
          const phalanxRing = meshGroup.getObjectByName('phalanx_ring');
          if (phalanxRing) {
            if (p.isBraced && !p.inMotion && p.type !== 'king') {
              phalanxRing.visible = true;
              phalanxRing.rotation.y += 0.015;
              phalanxRing.position.y = 0.05 - meshGroup.position.y;
              phalanxRing.material.opacity = 0.45 + Math.sin(now / 280) * 0.25;
            } else {
              phalanxRing.visible = false;
            }
          }
        }

        // King Citadel Wall 3D Visualization
        if (p.type === 'king') {
          this.updateCitadelBarrier(p, pos3D);
        }
      });

      // Cleanup removed pieces
      for (const [id, mesh] of this.pieceMeshes.entries()) {
        if (!activeIds.has(id)) {
          this.piecesGroup.remove(mesh);
          this.pieceMeshes.delete(id);
        }
      }
    }

    buildPieceMesh(piece) {
      const group = new THREE.Group();

      // Clone procedural geometry
      const proto = this.createPieceGeometry(piece.type);
      const pieceModel = proto.clone();

      const isWhite = piece.team === 'white';
      const bodyMat = isWhite ? this.materials.pieceWhite : this.materials.pieceBlack;
      const accentMat = isWhite ? this.materials.pieceWhiteAccent : this.materials.pieceBlackAccent;

      // Apply PBR materials across parts
      pieceModel.traverse(child => {
        if (child.isMesh) {
          if (child.name === 'metallic_accent') {
            child.material = accentMat;
          } else {
            child.material = bodyMat;
          }
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Scale piece appropriately to chessboard square dimensions
      const scaleFactor = 0.88;
      pieceModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Contact shadow beneath piece
      const shadowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        this.materials.contactShadow
      );
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.045; // Just above tile surface
      group.add(shadowMesh);

      // Precision Raycast Hit Cylinder
      const hH = piece.type === 'pawn' ? 2.0 : (piece.type === 'king' || piece.type === 'queen' ? 3.0 : 2.5);
      const hitRadiusTop = piece.type === 'pawn' ? 0.80 : 0.88;
      const hitRadiusBottom = piece.type === 'pawn' ? 0.90 : 0.98;
      const hitGeo = new THREE.CylinderGeometry(hitRadiusTop, hitRadiusBottom, hH, 16);
      const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = hH / 2;
      hitMesh.userData = { pieceId: piece.id, piece: piece };
      group.add(hitMesh);

      // Veteran Golden Star 3D Finial
      const starGroup = new THREE.Group();
      starGroup.name = 'veteran_star';
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffb700,
        emissiveIntensity: 0.50,
        roughness: 0.18,
        metalness: 0.92
      });
      const starGeom = new THREE.OctahedronGeometry(0.38, 0);
      starGeom.scale(1.0, 1.45, 0.45);
      const starMesh = new THREE.Mesh(starGeom, starMat);
      starMesh.name = 'veteran_star_mesh';
      starGroup.add(starMesh);
      starGroup.position.y = 2.85;
      starGroup.visible = false;
      group.add(starGroup);

      // Braced Phalanx Defensive Floor Ring
      const phalanxRingGeo = new THREE.RingGeometry(1.22, 1.38, 32);
      phalanxRingGeo.rotateX(-Math.PI / 2);
      const phalanxMat = new THREE.MeshBasicMaterial({
        color: 0x00e1d9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });
      const phalanxMesh = new THREE.Mesh(phalanxRingGeo, phalanxMat);
      phalanxMesh.name = 'phalanx_ring';
      phalanxMesh.position.y = 0.05;
      phalanxMesh.visible = false;
      group.add(phalanxMesh);

      group.add(pieceModel);
      group.userData = { pieceId: piece.id, pieceType: piece.type, piece: piece, shadowMesh };
      return group;
    }

    /* -------------------------------------------------------------
       King Citadel Wall 3D Forcefield Barrier
    ------------------------------------------------------------- */
    updateCitadelBarrier(kingPiece, pos3D) {
      let barrier = this.citadelBarriers[kingPiece.team];

      if (!barrier) {
        barrier = new THREE.Group();

        // 4 Corner Bastion Pylons
        const pylonGeo = new THREE.CylinderGeometry(0.18, 0.24, 2.6, 16);
        const pylonMat = new THREE.MeshStandardMaterial({
          color: kingPiece.team === 'white' ? 0xd4af37 : 0x7f1d1d,
          roughness: 0.25,
          metalness: 0.85
        });

        const corners = [
          [-1.25, -1.25], [1.25, -1.25],
          [1.25, 1.25], [-1.25, 1.25]
        ];
        corners.forEach(([cx, cz]) => {
          const pylon = new THREE.Mesh(pylonGeo, pylonMat);
          pylon.position.set(cx, 1.3, cz);
          pylon.castShadow = true;
          barrier.add(pylon);

          const crystalGeo = new THREE.OctahedronGeometry(0.16, 0);
          const crystalMat = new THREE.MeshBasicMaterial({
            color: kingPiece.team === 'white' ? 0x00f3ff : 0xff3b4e
          });
          const crystal = new THREE.Mesh(crystalGeo, crystalMat);
          crystal.position.set(cx, 2.7, cz);
          barrier.add(crystal);
        });

        // 4 Fortress Energy Bulkhead Panels
        const panelMat = new THREE.MeshPhysicalMaterial({
          color: kingPiece.team === 'white' ? 0x00e1d9 : 0xff2a48,
          transparent: true,
          opacity: 0.45,
          roughness: 0.12,
          transmission: 0.70,
          emissive: kingPiece.team === 'white' ? 0x00e1d9 : 0xff2a48,
          emissiveIntensity: 0.40,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        const pNorth = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 0.10), panelMat);
        pNorth.position.set(0, 1.2, -1.25);
        const pSouth = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 0.10), panelMat);
        pSouth.position.set(0, 1.2, 1.25);
        const pWest = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.2, 2.5), panelMat);
        pWest.position.set(-1.25, 1.2, 0);
        const pEast = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.2, 2.5), panelMat);
        pEast.position.set(1.25, 1.2, 0);

        barrier.add(pNorth, pSouth, pWest, pEast);
        barrier.userData = { panelMat };

        this.vfxGroup.add(barrier);
        this.citadelBarriers[kingPiece.team] = barrier;
      }

      if (kingPiece.wallActive && kingPiece.wallHp > 0 && !kingPiece.dead) {
        barrier.visible = true;
        barrier.position.set(pos3D.x, 0, pos3D.z);
        const hpRatio = kingPiece.wallHp / kingPiece.maxWallHp;
        const panelMat = barrier.userData.panelMat;
        if (panelMat) {
          if (kingPiece.wallHitFlash > 0) {
            panelMat.emissive.setHex(0xffffff);
            panelMat.emissiveIntensity = 1.0;
            panelMat.opacity = 0.85;
          } else {
            panelMat.emissive.setHex(kingPiece.team === 'white' ? 0x00e1d9 : 0xff2a48);
            panelMat.emissiveIntensity = 0.25 + hpRatio * 0.35;
            panelMat.opacity = 0.20 + hpRatio * 0.40;
          }
        }
      } else {
        barrier.visible = false;
      }
    }

    /* -------------------------------------------------------------
       3D Slingshot Aiming Trajectory, Elastic Tension Band & Power Ring
    ------------------------------------------------------------- */
    setupAimMeshes() {
      // 1. Aim Trajectory Ribbon (Parabolic 3D Projectile Arc)
      const ARC_COUNT = 24;
      const lineGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(ARC_COUNT * 3);
      lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const lineMat = new THREE.LineDashedMaterial({
        color: 0xffd700,
        dashSize: 0.5,
        gapSize: 0.3,
        linewidth: 3
      });
      this.aimTrajectoryMesh = new THREE.Line(lineGeo, lineMat);
      this.aimTrajectoryMesh.visible = false;
      this.scene.add(this.aimTrajectoryMesh);

      // 2. Aim Tension Elastic Cord (Stretching from anchor tile to pulled piece)
      const bandGeo = new THREE.BufferGeometry();
      const bandPositions = new Float32Array(2 * 3);
      bandGeo.setAttribute('position', new THREE.BufferAttribute(bandPositions, 3));
      const bandMat = new THREE.LineBasicMaterial({
        color: 0x00e1d9,
        linewidth: 3,
        transparent: true,
        opacity: 0.85
      });
      this.aimBandMesh = new THREE.Line(bandGeo, bandMat);
      this.aimBandMesh.visible = false;
      this.scene.add(this.aimBandMesh);

      // 3. Aim Arrowhead Marker
      const arrowGeo = new THREE.ConeGeometry(0.38, 0.85, 16);
      arrowGeo.rotateX(Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      this.aimArrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      this.aimArrowMesh.visible = false;
      this.scene.add(this.aimArrowMesh);

      // 4. Power Reticle around Piece Anchor
      const ringGeo = new THREE.RingGeometry(1.15, 1.32, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      this.aimReticleMesh = new THREE.Mesh(ringGeo, ringMat);
      this.aimReticleMesh.visible = false;
      this.scene.add(this.aimReticleMesh);
    }

    updateAimVisuals() {
      const selPiece = this.arena.selectedPiece;

      let active = false;
      let power = 0;
      let angle = 0;

      if (this.arena.isDragging && selPiece) {
        let pullX = this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x;
        let pullY = this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y;
        if (typeof this.arena.clampLaunchVector === 'function') {
          const clamped = this.arena.clampLaunchVector(selPiece, pullX, pullY);
          pullX = clamped.pullX;
          pullY = clamped.pullY;
        }
        const screenDist = Math.hypot(pullX, pullY);

        if (screenDist >= 10) {
          const clamped = Math.min(screenDist, this.arena.maxPullDistance);
          power = clamped / this.arena.maxPullDistance;
          angle = Math.atan2(pullY, pullX);
          active = true;
        }
      } else if (this.arena.keyboardAiming && selPiece) {
        active = true;
        power = this.arena.keyboardAimPower || 0.75;
        angle = this.arena.keyboardAimAngle || 0;
      } else if (this.arena.opponentAim && selPiece) {
        active = true;
        power = this.arena.opponentAim.powerRatio || 0.75;
        angle = Math.atan2(this.arena.opponentAim.vy || 0, this.arena.opponentAim.vx || 1);
      }

      if (active && selPiece) {
        const startPos = this.boardToWorld(selPiece.x, selPiece.y);
        const aimLen = 3.5 + power * 9.5; // World units

        // Derive angle in world space (aim forward toward enemy lines)
        const dirX = Math.cos(angle);
        const dirZ = Math.sin(angle);

        const endX = startPos.x + dirX * aimLen;
        const endZ = startPos.z + dirZ * aimLen;

        const isMaxPower = power > 0.85;
        const aimColor = isMaxPower ? 0xff3b4e : 0xffd700;

        // Build smooth 3D parabolic trajectory arc
        const posAttr = this.aimTrajectoryMesh.geometry.attributes.position;
        const ARC_COUNT = 24;
        const apexHeight = 0.5 + power * 1.8;
        for (let i = 0; i < ARC_COUNT; i++) {
          const t = i / (ARC_COUNT - 1);
          const px = THREE.MathUtils.lerp(startPos.x, endX, t);
          const pz = THREE.MathUtils.lerp(startPos.z, endZ, t);
          const py = 0.35 + Math.sin(t * Math.PI) * apexHeight;
          posAttr.setXYZ(i, px, py, pz);
        }
        posAttr.needsUpdate = true;
        this.aimTrajectoryMesh.material.color.setHex(aimColor);
        this.aimTrajectoryMesh.computeLineDistances();
        this.aimTrajectoryMesh.visible = true;

        // Update Tension Band stretching from anchor to lifted piece
        if (this.aimBandMesh) {
          const meshGroup = this.pieceMeshes.get(selPiece.id);
          const pieceY = meshGroup ? meshGroup.position.y : 1.4;
          const bandAttr = this.aimBandMesh.geometry.attributes.position;
          bandAttr.setXYZ(0, startPos.x, 0.08, startPos.z);
          bandAttr.setXYZ(1, startPos.x, pieceY, startPos.z);
          bandAttr.needsUpdate = true;
          this.aimBandMesh.material.color.setHex(isMaxPower ? 0xff3b4e : 0x00e1d9);
          this.aimBandMesh.visible = true;
        }

        // Update Arrowhead
        this.aimArrowMesh.position.set(endX, 0.4, endZ);
        this.aimArrowMesh.lookAt(endX + dirX, 0.4, endZ + dirZ);
        this.aimArrowMesh.material.color.setHex(aimColor);
        this.aimArrowMesh.visible = true;

        // Update Reticle
        this.aimReticleMesh.position.set(startPos.x, 0.06, startPos.z);
        this.aimReticleMesh.rotation.y += 0.04;
        this.aimReticleMesh.scale.set(1 + power * 0.3, 1 + power * 0.3, 1);
        this.aimReticleMesh.material.color.setHex(aimColor);
        this.aimReticleMesh.visible = true;
        return;
      }

      this.aimTrajectoryMesh.visible = false;
      if (this.aimBandMesh) this.aimBandMesh.visible = false;
      this.aimArrowMesh.visible = false;
      this.aimReticleMesh.visible = false;
    }

    /* -------------------------------------------------------------
       Coordinate Conversions: 2D Board Space <-> 3D World Space
    ------------------------------------------------------------- */
    boardToWorld(bx, by) {
      const layout = this.arena.getBoardLayout();
      const originX = layout.gridOriginX;
      const originY = layout.gridOriginY;
      const size = layout.gridSize;

      // Normalize to -1 to +1
      const nx = ((bx - originX) / size) * 2 - 1;
      const ny = ((by - originY) / size) * 2 - 1;

      // Scale to 3D grid dimensions
      const half3D = this.gridSize3D / 2;
      return {
        x: nx * half3D,
        z: ny * half3D
      };
    }

    worldToBoard(wx, wz) {
      const layout = this.arena.getBoardLayout();
      const half3D = this.gridSize3D / 2;
      const nx = (wx / half3D + 1) / 2;
      const ny = (wz / half3D + 1) / 2;

      return {
        x: layout.gridOriginX + nx * layout.gridSize,
        y: layout.gridOriginY + ny * layout.gridSize
      };
    }

    /* -------------------------------------------------------------
       Mouse & Touch Interaction Handlers on 3D Canvas
    ------------------------------------------------------------- */
    setupInteractionListeners() {
      const dom = this.renderer.domElement;
      this._lastTensionTime = 0;
      this._capturedPointerId = undefined;
      const boardPlanePt = new THREE.Vector3();

      const getNormalizedMouse = (e) => {
        const rect = dom.getBoundingClientRect();
        const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.clientX !== undefined ? e.clientX : 0);
        const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : (e.clientY !== undefined ? e.clientY : 0);
        return {
          x: ((clientX - rect.left) / (rect.width || 1)) * 2 - 1,
          y: -((clientY - rect.top) / (rect.height || 1)) * 2 + 1,
          screenX: clientX - rect.left,
          screenY: clientY - rect.top
        };
      };

      const findPieceAtPointer = (m) => {
        this.mouse.x = m.x;
        this.mouse.y = m.y;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.piecesGroup.children, true);
        let eligibleMobilePiece = null;
        let anchoredKing = null;
        let hoveredOther = null;

        // 1. Direct 3D mesh raycast: scan hits with smart priority
        for (const hit of intersects) {
          let target = hit.object;
          let piece = null;
          while (target && target !== this.piecesGroup && target !== this.scene) {
            if (target.userData && target.userData.piece) {
              piece = target.userData.piece;
              break;
            }
            target = target.parent;
          }
          if (!piece || piece.dead) continue;

          if (piece.team === this.arena.currentTurn) {
            if (!piece.immovable && (piece.type !== 'king' || piece.awakened)) {
              eligibleMobilePiece = piece;
              break; // Found top eligible movable vanguard piece
            } else if (piece.type === 'king' && !piece.awakened) {
              if (!anchoredKing) anchoredKing = piece;
            }
          } else if (!hoveredOther) {
            hoveredOther = piece;
          }
        }

        if (eligibleMobilePiece) {
          return { piece: eligibleMobilePiece, isAnchoredKing: false };
        }

        // 2. Proximity Fallback: Intersect ray with board plane (Y = 0)
        // Snaps to the nearest eligible piece if user clicks near piece base or on tile
        const planeHit = this.raycaster.ray.intersectPlane(this.boardPlane, boardPlanePt);
        if (planeHit && this.arena.pieces) {
          let closestPiece = null;
          let minDistance = Infinity;
          const maxSnapDistance = (this.tileSize3D || 2.5) * 1.35; // Generous square radius

          for (const p of this.arena.pieces) {
            if (p.dead || p.team !== this.arena.currentTurn || p.immovable) continue;
            if (p.type === 'king' && !p.awakened) continue;

            const pos3D = this.boardToWorld(p.x, p.y);
            const dist = Math.hypot(boardPlanePt.x - pos3D.x, boardPlanePt.z - pos3D.z);
            if (dist <= maxSnapDistance && dist < minDistance) {
              minDistance = dist;
              closestPiece = p;
            }
          }

          if (closestPiece) {
            return { piece: closestPiece, isAnchoredKing: false };
          }
        }

        if (anchoredKing) {
          return { piece: anchoredKing, isAnchoredKing: true };
        }

        return { piece: hoveredOther, isAnchoredKing: false };
      };

      const handlePointerDown = (e) => {
        // Right-click or middle-click: reserved for OrbitControls camera pan/rotate
        if (e.button === 2 || e.button === 1) return;

        if (this.arena.isGameOver) return;
        if (this.arena.gameMode === 'bot' && this.arena.currentTurn === 'black') return;
        if (this.arena.gameMode === 'ai-vs-ai') return;
        if (this.arena.multiplayerMode) {
          if (this.arena.playerRole === 'spectator') return;
          if (this.arena.playerRole && this.arena.playerRole !== this.arena.currentTurn) {
            if (window.ArchessToast) window.ArchessToast.show("Waiting for opponent's turn", 'warning', 1800, 'MULTIPLAYER');
            return;
          }
        }

        const m = getNormalizedMouse(e);
        const { piece, isAnchoredKing } = findPieceAtPointer(m);

        if (piece && !isAnchoredKing && piece.team === this.arena.currentTurn && !piece.immovable && (piece.type !== 'king' || piece.awakened)) {
          this.arena.selectedPiece = piece;
          this.arena.isDragging = true;
          this.arena.dragScreenAnchor = { x: m.screenX, y: m.screenY };
          this.arena.dragScreenCurrent = { x: m.screenX, y: m.screenY };
          this.arena.dragStart = { x: piece.x, y: piece.y };
          this.arena.dragCurrent = { x: piece.x, y: piece.y };
          this.arena.audio.init();

          // Set pointer capture so dragging stays locked to canvas even outside viewport
          if (dom.setPointerCapture && e.pointerId !== undefined) {
            try {
              dom.setPointerCapture(e.pointerId);
              this._capturedPointerId = e.pointerId;
            } catch (err) {}
          }

          this.arena.logTelemetry('PIECE_SELECTED', `3D Selected ${piece.team.toUpperCase()} ${piece.type.toUpperCase()} at [${Math.round(piece.x)}, ${Math.round(piece.y)}]`);
          if (e.cancelable) e.preventDefault();
        } else if (isAnchoredKing) {
          this.arena.logTelemetry('CITADEL_STATIONARY', 'The King is anchored as Citadel until vanguard falls. Sling vanguard pieces.');
          if (this.arena.addDamageNumber) {
            this.arena.addDamageNumber(piece.x, piece.y - piece.radius * 1.5, 0, false, '#ffd700', 'ANCHORED CITADEL');
          }
        }
      };

      const handlePointerMove = (e) => {
        const m = getNormalizedMouse(e);

        if (this.arena.isDragging && this.arena.selectedPiece) {
          this.arena.dragScreenCurrent = { x: m.screenX, y: m.screenY };
          const pullX = this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x;
          const pullY = this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y;
          const dist = Math.hypot(pullX, pullY);
          const powerRatio = Math.min(dist, this.arena.maxPullDistance) / this.arena.maxPullDistance;
          const now = performance.now();

          if (now - this._lastTensionTime > 90) {
            this.arena.audio.playTension(powerRatio);
            this._lastTensionTime = now;
          }

          // Multiplayer aim synchronization
          if (this.arena.multiplayerMode && typeof this.arena.onAimUpdate === 'function') {
            if (!this._lastAimEmit || now - this._lastAimEmit > 33) {
              this._lastAimEmit = now;
              this.arena.onAimUpdate({
                pieceId: this.arena.selectedPiece.id,
                pullScreenX: pullX,
                pullScreenY: pullY,
                powerRatio
              });
            }
          }

          if (e.cancelable) e.preventDefault();
        } else {
          const { piece } = findPieceAtPointer(m);
          this.arena.hoveredPiece = piece;
        }
      };

      const handlePointerUp = (e) => {
        // Release pointer capture cleanly
        if (dom.releasePointerCapture && this._capturedPointerId !== undefined) {
          try {
            if (dom.hasPointerCapture && dom.hasPointerCapture(this._capturedPointerId)) {
              dom.releasePointerCapture(this._capturedPointerId);
            }
          } catch (err) {}
          this._capturedPointerId = undefined;
        }

        if (this.arena.isDragging && this.arena.selectedPiece) {
          const pullX = this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x;
          const pullY = this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y;
          const dist = Math.hypot(pullX, pullY);

          if (dist >= 14) {
            let clampedDist = Math.min(dist, this.arena.maxPullDistance);
            const pieceToLaunch = this.arena.selectedPiece;

            if (typeof this.arena.clampLaunchVector === 'function') {
              const clamped = this.arena.clampLaunchVector(pieceToLaunch, pullX, pullY);
              pullX = clamped.pullX;
              pullY = clamped.pullY;
            }

            this.arena.launchPiece(pieceToLaunch, pullX, pullY, clampedDist);

            if (this.arena.multiplayerMode && typeof this.arena.onPieceLaunchBroadcast === 'function') {
              const impulse = clampedDist * 0.15 * pieceToLaunch.speedMulti;
              const angle = Math.atan2(pullY, pullX);
              this.arena.onPieceLaunchBroadcast({
                pieceId: pieceToLaunch.id,
                vx: Math.cos(angle) * impulse,
                vy: Math.sin(angle) * impulse,
                dist: clampedDist,
                powerRatio: clampedDist / this.arena.maxPullDistance
              });
            }
          } else {
            if (this.arena.multiplayerMode && typeof this.arena.onAimCancel === 'function') {
              this.arena.onAimCancel();
            }
          }

          this.arena.isDragging = false;
          this.arena.selectedPiece = null;
        }

        if (this.aimTrajectoryMesh) this.aimTrajectoryMesh.visible = false;
        if (this.aimBandMesh) this.aimBandMesh.visible = false;
        if (this.aimArrowMesh) this.aimArrowMesh.visible = false;
        if (this.aimReticleMesh) this.aimReticleMesh.visible = false;
      };

      const handlePointerCancel = () => {
        if (dom.releasePointerCapture && this._capturedPointerId !== undefined) {
          try {
            if (dom.hasPointerCapture && dom.hasPointerCapture(this._capturedPointerId)) {
              dom.releasePointerCapture(this._capturedPointerId);
            }
          } catch (err) {}
          this._capturedPointerId = undefined;
        }
        if (this.arena.isDragging) {
          if (this.arena.multiplayerMode && typeof this.arena.onAimCancel === 'function') {
            this.arena.onAimCancel();
          }
          this.arena.isDragging = false;
          this.arena.selectedPiece = null;
        }
        if (this.aimTrajectoryMesh) this.aimTrajectoryMesh.visible = false;
        if (this.aimBandMesh) this.aimBandMesh.visible = false;
        if (this.aimArrowMesh) this.aimArrowMesh.visible = false;
        if (this.aimReticleMesh) this.aimReticleMesh.visible = false;
      };

      // Pointer event bindings with tracked listener registry
      this._listeners = [];
      const addTrackedListener = (target, evt, handler, opts = false) => {
        target.addEventListener(evt, handler, opts);
        this._listeners.push({ target, evt, handler, opts });
      };

      addTrackedListener(dom, 'pointerdown', handlePointerDown);
      addTrackedListener(dom, 'pointermove', handlePointerMove);
      addTrackedListener(window, 'pointermove', handlePointerMove);
      addTrackedListener(dom, 'pointerup', handlePointerUp);
      addTrackedListener(window, 'pointerup', handlePointerUp);
      addTrackedListener(dom, 'pointercancel', handlePointerCancel);
      addTrackedListener(window, 'pointercancel', handlePointerCancel);

      // Touch fallbacks
      addTrackedListener(dom, 'touchstart', handlePointerDown, { passive: false });
      addTrackedListener(window, 'touchmove', handlePointerMove, { passive: false });
      addTrackedListener(window, 'touchend', handlePointerUp);
    }

    /* -------------------------------------------------------------
       Camera Presets & View Controls with Smooth Interpolation
    ------------------------------------------------------------- */
    setCameraPreset(presetName) {
      if (this.cameraPresets[presetName]) {
        this.activePreset = presetName;
        const target = this.cameraPresets[presetName];
        this._targetCamPos = target.pos.clone();
        this._targetCamLook = target.look.clone();
      }
    }

    resetCamera() {
      this.setCameraPreset('tabletop');
    }

    /* -------------------------------------------------------------
       Hover HP Display in 3D Space (Only on Hover!)
    ------------------------------------------------------------- */
    updateHoverVisuals() {
      const badge = document.getElementById('threePieceHoverBadge');
      const hPiece = this.arena.hoveredPiece || (this.arena.isDragging ? this.arena.selectedPiece : null);

      if (hPiece && !hPiece.dead && badge && this.container) {
        const pos3D = this.boardToWorld(hPiece.x, hPiece.y);
        const screenV = new THREE.Vector3(pos3D.x, 3.2, pos3D.z).project(this.camera);
        const rect = this.renderer.domElement.getBoundingClientRect();
        const screenX = (screenV.x * 0.5 + 0.5) * rect.width;
        const screenY = (-screenV.y * 0.5 + 0.5) * rect.height;

        badge.style.left = screenX + 'px';
        badge.style.top = screenY + 'px';
        const teamCap = hPiece.team.toUpperCase();
        const typeCap = hPiece.type.toUpperCase();
        const hpVal = Math.round(hPiece.hp);
        badge.innerHTML = `<span class="hover-name">${teamCap} ${typeCap}</span><span class="hover-hp">${hpVal}/${hPiece.maxHp} HP</span>`;
        badge.style.display = 'block';
      } else if (badge) {
        badge.style.display = 'none';
      }
    }

    /* -------------------------------------------------------------
       Main 3D Animation & Render Loop
    ------------------------------------------------------------- */
    update(dt) {
      // 0. Smooth Camera Preset Interpolation
      if (this._targetCamPos) {
        this.camera.position.lerp(this._targetCamPos, 0.09);
        if (this.controls) {
          this.controls.target.lerp(this._targetCamLook, 0.09);
          this.controls.update();
        }
        if (this.camera.position.distanceTo(this._targetCamPos) < 0.04) {
          this.camera.position.copy(this._targetCamPos);
          if (this.controls) this.controls.target.copy(this._targetCamLook);
          this._targetCamPos = null;
          this._targetCamLook = null;
        }
      }

      // 1. Sync 3D Pieces with 2D Physics state
      this.syncPieces();

      // 2. Update Slingshot Aim Visuals
      this.updateAimVisuals();

      // 3. Update Hover HP Visuals in 3D (Only on hover!)
      this.updateHoverVisuals();

      // 4. Update Orbit Controls Damping
      if (this.controls && !this._targetCamPos) {
        this.controls.update();
      }
    }

    render() {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }

    resize(width, height) {
      if (!this.renderer || !this.camera) return;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    destroy() {
      if (this._listeners && Array.isArray(this._listeners)) {
        for (const item of this._listeners) {
          try {
            item.target.removeEventListener(item.evt, item.handler, item.opts);
          } catch (_) {}
        }
        this._listeners = [];
      }
      if (this.controls && typeof this.controls.dispose === 'function') {
        try {
          this.controls.dispose();
        } catch (_) {}
      }
      if (this.renderer) {
        try {
          if (typeof this.renderer.dispose === 'function') {
            this.renderer.dispose();
          }
          if (this.renderer.domElement && this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
          }
        } catch (_) {}
      }
    }
  }

  // Export to global window scope
  window.Archess3DEngine = Archess3DEngine;

})(window);
