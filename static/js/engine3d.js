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

      // Tactical Deployables 3D Meshes: id -> THREE.Group
      this.deployableMeshes = new Map();
      this.deployPreviewMesh = null;

      // 3D Particles & Kinetic Ground Dust Puffs
      this.particles3D = [];
      this.landingDustParticles = [];

      // Tumbling pieces on defeat / capture
      this.tumblingPieces = [];

      // Realistic 3D Camera Action Dynamics
      this.baseFov = 40;
      this.camAimZoom = 0;       // Smooth aim tension zoom interpolator (0 to 1)
      this.camZoomPunch = 0;     // Impact zoom punch
      this.camShake = { intensity: 0 };
      this.isSloMoActive = false;

      // Camera preset targets
      // Camera preset targets (Refined for real 3D perspective depth)
      this.cameraPresets = {
        tabletop: { pos: new THREE.Vector3(0, 24, 25), look: new THREE.Vector3(0, 0, -0.6) },
        cinematic: { pos: new THREE.Vector3(0, 13, 20), look: new THREE.Vector3(0, 1.2, 0) },
        tactical: { pos: new THREE.Vector3(0, 34, 5), look: new THREE.Vector3(0, 0, 0) },
        flipped: { pos: new THREE.Vector3(0, 24, -25), look: new THREE.Vector3(0, 0, 0.6) }
      };
      this.activePreset = 'tabletop';
      this._targetCamPos = null;
      this._targetCamLook = null;

      // Raycaster for mouse/touch interactions
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08); // Tile surface at Y = 0.08

      // Dimensions
      this.gridSize3D = 20.0;
      this.tileSize3D = 2.5;

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
      this.renderer.toneMappingExposure = 1.12;
      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ('outputEncoding' in this.renderer && THREE.sRGBEncoding) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }

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

        // Touch: Single finger drag is reserved for slingshot launching; two fingers for dolly/pan
        this.controls.touches = {
          ONE: -1,
          TWO: THREE.TOUCH.DOLLY_PAN
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

      // 4. White Army: Polished Alabaster Ivory (Clearcoat gloss, subsurface softness, warm tone)
      this.materials.pieceWhite = new THREE.MeshPhysicalMaterial({
        color: 0xf4eee2,
        roughness: 0.14,
        metalness: 0.04,
        clearcoat: 0.72,
        clearcoatRoughness: 0.12,
        reflectivity: 0.65,
        envMapIntensity: 1.35
      });

      this.materials.pieceWhiteAccent = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Burnished imperial gold finials
        roughness: 0.14,
        metalness: 0.95,
        envMapIntensity: 1.7
      });

      this.materials.pieceWhiteFelt = new THREE.MeshStandardMaterial({
        color: 0x14402a, // Deep tournament emerald baize felt
        roughness: 0.92,
        metalness: 0.02
      });

      // 5. Black Army: Polished Obsidian / Ebony Onyx (Piano-lacquered clearcoat gloss)
      this.materials.pieceBlack = new THREE.MeshPhysicalMaterial({
        color: 0x161a22,
        roughness: 0.16,
        metalness: 0.18,
        clearcoat: 0.85,
        clearcoatRoughness: 0.10,
        reflectivity: 0.82,
        envMapIntensity: 1.45
      });

      this.materials.pieceBlackAccent = new THREE.MeshStandardMaterial({
        color: 0xe11d48, // Radiant ruby crimson crest
        roughness: 0.14,
        metalness: 0.92,
        envMapIntensity: 1.6
      });

      this.materials.pieceBlackFelt = new THREE.MeshStandardMaterial({
        color: 0x4a0e17, // Rich royal burgundy velvet baize felt
        roughness: 0.92,
        metalness: 0.02
      });

      // 5b. Citadel Bastion Fortress Masonry & Battlements
      this.materials.citadelStoneWhite = new THREE.MeshStandardMaterial({
        color: 0xe5e0d5, // Carved white marble / limestone masonry
        roughness: 0.42,
        metalness: 0.12
      });
      this.materials.citadelStoneBlack = new THREE.MeshStandardMaterial({
        color: 0x1e2430, // Forged dark basalt / obsidian stone
        roughness: 0.38,
        metalness: 0.22
      });
      this.materials.citadelTrimWhite = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Imperial brass / gold parapet trims
        roughness: 0.22,
        metalness: 0.88
      });
      this.materials.citadelTrimBlack = new THREE.MeshStandardMaterial({
        color: 0x881337, // Burnished crimson alloy battlements
        roughness: 0.24,
        metalness: 0.85
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
      this.tileMeshList = [];

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
          tile.userData = { isBoardTile: true, col: c, row: r };
          this.tileMeshList.push(tile);
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

      // Helper to generate smoothly normal-computed revolved LatheGeometry
      const createLathe = (pts, segments = 36) => {
        const v2s = pts.map(([r, y]) => new THREE.Vector2(r, y));
        const geo = new THREE.LatheGeometry(v2s, segments);
        geo.computeVertexNormals();
        return geo;
      };

      // Classic Staunton tournament multi-tiered pedestal base curve (r, y)
      const getBaseProfile = (scale = 1.0) => [
        [0.0, 0.0],
        [0.94 * scale, 0.0],
        [0.94 * scale, 0.08],
        [0.90 * scale, 0.16],
        [0.85 * scale, 0.28],
        [0.87 * scale, 0.36],
        [0.83 * scale, 0.44],
        [0.72 * scale, 0.55],
        [0.66 * scale, 0.64],
        [0.64 * scale, 0.70]
      ];

      // Tournament Baize Felt Ring underneath the base
      const feltGeo = new THREE.CylinderGeometry(0.90, 0.92, 0.04, 32);
      const feltMesh = new THREE.Mesh(feltGeo);
      feltMesh.name = 'felt_base';
      feltMesh.position.y = 0.02;
      pieceGroup.add(feltMesh);

      switch (type) {
        case 'pawn': {
          const pawnPts = [
            ...getBaseProfile(0.88),
            // Slender concave stem
            [0.50, 0.84],
            [0.36, 1.08],
            [0.28, 1.32],
            [0.24, 1.50],
            // Toroidal collar bead
            [0.32, 1.56],
            [0.40, 1.62],
            [0.32, 1.68],
            [0.24, 1.72],
            // Head sphere profile
            [0.32, 1.78],
            [0.40, 1.88],
            [0.44, 2.00],
            [0.42, 2.12],
            [0.34, 2.22],
            [0.20, 2.30],
            [0.0, 2.34]
          ];
          const pawnMesh = new THREE.Mesh(createLathe(pawnPts));
          pawnMesh.castShadow = true;
          pawnMesh.receiveShadow = true;
          pieceGroup.add(pawnMesh);
          break;
        }

        case 'rook': {
          const rookPts = [
            ...getBaseProfile(0.96),
            // Fortified tower body
            [0.62, 0.85],
            [0.59, 1.25],
            [0.58, 1.65],
            // Cornice ledge molding
            [0.64, 1.75],
            [0.74, 1.85],
            [0.78, 1.95],
            [0.76, 2.02],
            // Parapet rim and depressed basin
            [0.74, 2.08],
            [0.54, 2.08],
            [0.54, 1.90],
            [0.0, 1.90]
          ];
          const rookMesh = new THREE.Mesh(createLathe(rookPts));
          rookMesh.castShadow = true;
          rookMesh.receiveShadow = true;

          // 4 Crenellated Battlements (Castle merlons)
          const battlements = new THREE.Group();
          const merlonCount = 4;
          for (let m = 0; m < merlonCount; m++) {
            const angle = (m / merlonCount) * Math.PI * 2 + Math.PI / 4;
            const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.22));
            merlon.position.set(Math.cos(angle) * 0.64, 2.24, Math.sin(angle) * 0.64);
            merlon.rotation.y = -angle + Math.PI / 2;
            merlon.castShadow = true;
            battlements.add(merlon);
          }
          pieceGroup.add(rookMesh, battlements);
          break;
        }

        case 'knight': {
          // Revolved pedestal base
          const knightBaseGeo = createLathe(getBaseProfile(0.94));
          const knightBase = new THREE.Mesh(knightBaseGeo);
          knightBase.castShadow = true;
          knightBase.receiveShadow = true;

          // Sculpted Equestrian Bust
          const horseBust = new THREE.Group();

          // Swept muscular neck (angled forward)
          const neckGeo = new THREE.BoxGeometry(0.56, 1.15, 0.72);
          const neck = new THREE.Mesh(neckGeo);
          neck.position.set(0, 1.16, 0.08);
          neck.rotation.x = -0.32;
          neck.castShadow = true;

          // Arched mane spine (swept back with crest ridges)
          const maneGroup = new THREE.Group();
          const maneSpine = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.10, 0.35));
          maneSpine.position.set(0, 1.34, -0.32);
          maneSpine.rotation.x = 0.28;
          maneGroup.add(maneSpine);
          for (let i = 0; i < 3; i++) {
            const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.18));
            tuft.position.set(0, 1.05 + i * 0.30, -0.40 - i * 0.06);
            tuft.rotation.x = 0.35;
            maneGroup.add(tuft);
          }

          // Equestrian head volume
          const headGeo = new THREE.BoxGeometry(0.64, 0.68, 0.85);
          const head = new THREE.Mesh(headGeo);
          head.position.set(0, 1.82, 0.24);
          head.rotation.x = -0.42;
          head.castShadow = true;

          // Tapered muzzle / snout
          const snoutGeo = new THREE.CylinderGeometry(0.20, 0.32, 0.60, 16);
          const snout = new THREE.Mesh(snoutGeo);
          snout.rotation.x = Math.PI / 2.3;
          snout.position.set(0, 1.62, 0.72);
          snout.castShadow = true;

          // Cheek / jaw flare
          const jawGeo = new THREE.SphereGeometry(0.32, 16, 16);
          const jaw = new THREE.Mesh(jawGeo);
          jaw.scale.set(0.95, 0.80, 1.15);
          jaw.position.set(0, 1.68, 0.14);

          // Alert equine ears
          const earGeo = new THREE.ConeGeometry(0.11, 0.34, 8);
          const earL = new THREE.Mesh(earGeo);
          earL.position.set(-0.20, 2.24, 0.06);
          earL.rotation.set(-0.20, 0, -0.22);
          const earR = new THREE.Mesh(earGeo);
          earR.position.set(0.20, 2.24, 0.06);
          earR.rotation.set(-0.20, 0, 0.22);

          horseBust.add(neck, maneGroup, head, snout, jaw, earL, earR);
          pieceGroup.add(knightBase, horseBust);
          break;
        }

        case 'bishop': {
          const bishopPts = [
            ...getBaseProfile(0.92),
            // Slender waist
            [0.54, 0.85],
            [0.38, 1.15],
            [0.32, 1.48],
            // Lower collar bead
            [0.40, 1.56],
            [0.46, 1.62],
            [0.38, 1.68],
            // Upper collar bead
            [0.44, 1.74],
            [0.48, 1.80],
            [0.38, 1.86],
            // Mitre oval cap
            [0.42, 1.94],
            [0.50, 2.10],
            [0.52, 2.30],
            [0.48, 2.52],
            [0.38, 2.72],
            [0.24, 2.88],
            [0.12, 2.98],
            [0.0, 3.02]
          ];
          const bishopMesh = new THREE.Mesh(createLathe(bishopPts));
          bishopMesh.castShadow = true;
          bishopMesh.receiveShadow = true;

          // Iconic diagonal notch cut (mitre slit)
          const notch = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.36, 0.60));
          notch.position.set(0.18, 2.52, 0);
          notch.rotation.z = Math.PI / 4.5;
          notch.name = 'mitre_slit';

          // Apex Finial Orb
          const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16));
          finial.position.y = 3.16;
          finial.name = 'metallic_accent';

          pieceGroup.add(bishopMesh, notch, finial);
          break;
        }

        case 'queen': {
          const queenPts = [
            ...getBaseProfile(0.96),
            // Flowing gown
            [0.56, 0.85],
            [0.44, 1.25],
            [0.38, 1.65],
            [0.36, 1.95],
            // Waist cord
            [0.44, 2.02],
            [0.48, 2.08],
            [0.42, 2.14],
            // Flared coronet
            [0.44, 2.25],
            [0.54, 2.45],
            [0.64, 2.68],
            [0.68, 2.82],
            [0.56, 2.82],
            [0.48, 2.65],
            [0.0, 2.65]
          ];
          const queenMesh = new THREE.Mesh(createLathe(queenPts));
          queenMesh.castShadow = true;
          queenMesh.receiveShadow = true;

          // 8 Coronet Pearls
          const pearls = new THREE.Group();
          for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2;
            const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12));
            pearl.position.set(Math.cos(angle) * 0.68, 2.92, Math.sin(angle) * 0.68);
            pearl.name = 'metallic_accent';
            pearls.add(pearl);
          }

          // Apex Sovereign Orb
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 16));
          orb.position.y = 2.96;
          orb.name = 'metallic_accent';

          pieceGroup.add(queenMesh, pearls, orb);
          break;
        }

        case 'king': {
          const kingPts = [
            ...getBaseProfile(1.02),
            // Stately mantle column
            [0.62, 0.88],
            [0.52, 1.35],
            [0.46, 1.80],
            [0.44, 2.10],
            // Capital molding
            [0.52, 2.20],
            [0.64, 2.32],
            [0.68, 2.44],
            [0.56, 2.50],
            // Imperial crown dome
            [0.58, 2.60],
            [0.66, 2.80],
            [0.68, 3.02],
            [0.62, 3.22],
            [0.48, 3.38],
            [0.26, 3.48],
            [0.0, 3.52]
          ];
          const kingMesh = new THREE.Mesh(createLathe(kingPts));
          kingMesh.castShadow = true;
          kingMesh.receiveShadow = true;

          // Sovereign Latin Cross finial at summit
          const crossGroup = new THREE.Group();
          const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16));
          crossV.position.y = 3.86;
          const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.16, 0.16));
          crossH.position.y = 3.96;
          crossV.name = 'metallic_accent';
          crossH.name = 'metallic_accent';

          const centerJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.10, 0));
          centerJewel.position.y = 3.96;
          centerJewel.name = 'metallic_accent';
          crossGroup.add(crossV, crossH, centerJewel);

          pieceGroup.add(kingMesh, crossGroup);
          break;
        }
      }

      this.geometries[type] = pieceGroup;
      return pieceGroup;
    }

    /* -------------------------------------------------------------
       Sync Authoritative Physics Pieces to 3D Scene
       Features:
       - Continuous kinetic hop arc based on movement speed
       - Knight aerial vault trajectory & high-impact landing
       - Dynamic squash & stretch on impact / touchdown
       - Damped harmonic wobble & rocking settle on sudden stops / hits
       - Realistic 3D defeat tumble knockdown & ground dust puffs
    ------------------------------------------------------------- */
    syncPieces(dt = 0.016) {
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

        // Check if piece is defeated (trigger dramatic 3D tumble knockdown)
        if (p.dead) {
          if (!meshGroup.userData.isTumbling) {
            this.startPieceTumble(p, meshGroup);
          }
          return;
        }

        // Convert 2D Arena Board Space (x, y) to 3D World Space (X, Z)
        let pos3D;
        const speed = Math.hypot(p.vx || 0, p.vy || 0);
        const inMotion = (speed > 0.35 || p.inMotion || p.isLeaping);

        // Sanitize piece 2D coordinates if NaN or invalid
        if (!isFinite(p.x) || !isFinite(p.y)) {
          const layout = this.arena.getBoardLayout();
          if (layout && layout.gridSize > 0) {
            const c = (p.col !== undefined && p.col >= 0 && p.col < 8) ? p.col : 0;
            const r = (p.row !== undefined && p.row >= 0 && p.row < 8) ? p.row : 0;
            p.x = layout.gridOriginX + (c + 0.5) * layout.sqSize;
            p.y = layout.gridOriginY + (r + 0.5) * layout.sqSize;
            p.originX = p.x;
            p.originY = p.y;
            p.vx = 0;
            p.vy = 0;
          }
        }

        if (!inMotion && p.col !== undefined && p.row !== undefined && !p.hasMoved) {
          // Stationary unmoved piece: ALWAYS place precisely at canonical tile coordinates
          pos3D = this.tileToWorld(p.col, p.row);
        } else if (isFinite(p.x) && isFinite(p.y)) {
          pos3D = this.boardToWorld(p.x, p.y);
        } else if (p.col !== undefined && p.row !== undefined) {
          pos3D = this.tileToWorld(p.col, p.row);
        } else {
          pos3D = { x: 0, z: 0 };
        }

        const isSelected = this.arena.selectedPiece === p;
        const dragElev = (isSelected && this.arena.isDragging) ? 1.6 : 0;

        // 1. Continuous Realistic Kinetic Hop (Parabolic arc during sliding locomotion)
        let hopElev = 0;
        let hopTiltX = 0;
        let hopTiltZ = 0;
        let leapHeight = 0;

        if (p.type === 'knight' && p.isLeaping) {
          // Special high-arc vaulting leap for knights
          const progress = Math.min(1.0, (p.leapDistTraveled || 0) / (p.leapMaxDist || 140));
          leapHeight = Math.sin(progress * Math.PI) * 3.4;
          meshGroup.rotation.x -= Math.sin(progress * Math.PI) * 0.32;

          // Knight touchdown impact
          if (progress > 0.90 && meshGroup.userData.wasAirborne) {
            meshGroup.userData.squash = 0.74;
            meshGroup.userData.wobbleAmp = 0.22;
            meshGroup.userData.wobblePhase = 0;
            this.spawnLandingDust(pos3D.x, pos3D.z, 1.6);
            this.triggerZoomPunch(0.85);
            meshGroup.userData.wasAirborne = false;
          } else if (progress < 0.85) {
            meshGroup.userData.wasAirborne = true;
          }
        } else if (inMotion) {
          // All other units take realistic kinetic hops scaled with velocity
          meshGroup.userData.hopPhase = (meshGroup.userData.hopPhase || 0) + dt * Math.min(speed, 14) * 3.4;
          const maxHop = Math.min(1.35, Math.pow(speed / 8.5, 0.82) * 1.15);
          hopElev = Math.abs(Math.sin(meshGroup.userData.hopPhase)) * maxHop;

          // Subtle pitch/roll along the hop trajectory
          if (speed > 0.8) {
            const angle = Math.atan2(p.vy, p.vx);
            const hopWave = Math.cos(meshGroup.userData.hopPhase * 2) * 0.09 * Math.min(1.0, speed / 5);
            hopTiltZ = -Math.cos(angle) * hopWave;
            hopTiltX = Math.sin(angle) * hopWave;
          }

          // Hop touchdown detection
          if (meshGroup.userData.wasAirborne && hopElev < 0.08) {
            meshGroup.userData.squash = Math.max(0.78, 1.0 - (speed / 14) * 0.26);
            this.spawnLandingDust(pos3D.x, pos3D.z, Math.min(1.3, 0.6 + speed / 8));
            meshGroup.userData.wasAirborne = false;
          } else if (hopElev >= 0.18) {
            meshGroup.userData.wasAirborne = true;
          }
        } else {
          meshGroup.userData.hopPhase = 0;
          meshGroup.userData.wasAirborne = false;
        }

        // 2. Sudden Deceleration Landing Squash & Ground Dust
        if ((meshGroup.userData.prevSpeed || 0) > 2.2 && speed <= 0.35) {
          meshGroup.userData.squash = Math.max(0.78, 1.0 - ((meshGroup.userData.prevSpeed || 0) / 12) * 0.25);
          meshGroup.userData.wobbleAmp = Math.min(0.26, (meshGroup.userData.prevSpeed || 0) * 0.04);
          meshGroup.userData.wobblePhase = 0;
          this.spawnLandingDust(pos3D.x, pos3D.z, Math.min(1.4, (meshGroup.userData.prevSpeed || 0) / 7));
        }
        meshGroup.userData.prevSpeed = speed;

        // 3. Collision Impact Wobble & Micro-Squash on Hit Flash
        if (p.hitFlash && p.hitFlash > 0.1 && (meshGroup.userData.prevHitFlash || 0) <= 0.1) {
          meshGroup.userData.wobbleAmp = Math.min(0.34, (meshGroup.userData.wobbleAmp || 0) + 0.18 + speed * 0.03);
          meshGroup.userData.wobblePhase = 0;
          meshGroup.userData.squash = 0.82;
          this.triggerZoomPunch(0.85);
        }
        meshGroup.userData.prevHitFlash = p.hitFlash || 0;

        // 4. Elastic Squash & Stretch Recovery
        meshGroup.userData.squash = meshGroup.userData.squash || 1.0;
        meshGroup.userData.squash += (1.0 - meshGroup.userData.squash) * Math.min(1.0, dt * 16.0);

        const pieceModel = meshGroup.userData.pieceModel;
        const baseScale = meshGroup.userData.baseScale || 0.88;
        if (pieceModel) {
          const sY = meshGroup.userData.squash * baseScale;
          const sXZ = (2.0 - meshGroup.userData.squash) * baseScale;
          pieceModel.scale.set(sXZ, sY, sXZ);
        }

        // 5. Decaying Harmonic Wobble
        let wobbleX = 0;
        let wobbleZ = 0;
        if (meshGroup.userData.wobbleAmp > 0.005) {
          meshGroup.userData.wobblePhase = (meshGroup.userData.wobblePhase || 0) + dt * 26.0;
          meshGroup.userData.wobbleAmp *= Math.exp(-dt * 8.0);
          wobbleX = Math.sin(meshGroup.userData.wobblePhase) * meshGroup.userData.wobbleAmp;
          wobbleZ = Math.cos(meshGroup.userData.wobblePhase * 0.85) * meshGroup.userData.wobbleAmp;
        }

        // 6. 3D Elevation & Grounding
        const BASE_ELEVATION = 0.08;
        const targetElev = BASE_ELEVATION + dragElev + leapHeight + hopElev;
        meshGroup.position.x = pos3D.x;
        meshGroup.position.z = pos3D.z;
        meshGroup.position.y = THREE.MathUtils.lerp(meshGroup.position.y, targetElev, 0.42);

        // Contact shadow position & opacity tracking height
        const shadowMesh = meshGroup.userData.shadowMesh;
        if (shadowMesh) {
          shadowMesh.position.y = 0.085 - meshGroup.position.y;
          const heightRatio = Math.max(0, meshGroup.position.y - BASE_ELEVATION) / 3.5;
          shadowMesh.material.opacity = Math.max(0.10, 0.70 - heightRatio * 0.52);
          const shadowScale = 1.0 + heightRatio * 0.45;
          shadowMesh.scale.set(shadowScale, shadowScale, 1);
        }

        meshGroup.visible = true;

        // 7. Velocity-based dynamic tilt / inertia or slingshot drag tension tilt
        if (isSelected && this.arena.isDragging) {
          const aimVec = (typeof this.arena.getAimVector === 'function')
            ? this.arena.getAimVector(p)
            : { pullX: this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x, pullY: this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y, dist: 0, angle: 0 };
          let pullX = aimVec.pullX;
          let pullY = aimVec.pullY;
          const dist = aimVec.dist || Math.hypot(pullX, pullY);
          const angle = aimVec.angle !== undefined ? aimVec.angle : Math.atan2(pullY, pullX);
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

        // Layer in the hop tilt and decaying wobble
        meshGroup.rotation.x += hopTiltX + wobbleX;
        meshGroup.rotation.z += hopTiltZ + wobbleZ;

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
          } else if (child.name === 'felt_base') {
            child.material = isWhite ? this.materials.pieceWhiteFelt : this.materials.pieceBlackFelt;
          } else if (child.name === 'mitre_slit') {
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

      // Orient knights with authentic tournament inward angle (facing toward center squares)
      if (piece.type === 'knight') {
        const isQueenside = (piece.col !== undefined ? piece.col : 1) <= 3;
        if (piece.team === 'white') {
          pieceModel.rotation.y = isQueenside ? (Math.PI * 0.75) : (-Math.PI * 0.75);
        } else {
          pieceModel.rotation.y = isQueenside ? (Math.PI * 0.25) : (-Math.PI * 0.25);
        }
      }

      // Contact shadow beneath piece
      const shadowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        this.materials.contactShadow
      );
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.005;
      shadowMesh.name = 'contact_shadow';
      shadowMesh.raycast = () => {}; // Prevent shadow from intercepting raycasts
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
      phalanxMesh.raycast = () => {};
      group.add(phalanxMesh);

      group.add(pieceModel);
      group.userData = {
        pieceId: piece.id,
        pieceType: piece.type,
        piece: piece,
        shadowMesh,
        pieceModel,
        baseScale: scaleFactor,
        squash: 1.0,
        hopPhase: 0,
        wasAirborne: false,
        wobbleAmp: 0,
        wobblePhase: 0,
        prevSpeed: 0,
        prevHitFlash: 0
      };
      return group;
    }

    /* -------------------------------------------------------------
       King Citadel Wall 3D Fortress Bastion Keep
    ------------------------------------------------------------- */
    updateCitadelBarrier(kingPiece, pos3D) {
      let barrier = this.citadelBarriers[kingPiece.team];
      const isWhite = kingPiece.team === 'white';

      if (!barrier) {
        barrier = new THREE.Group();

        const stoneMat = isWhite ? this.materials.citadelStoneWhite : this.materials.citadelStoneBlack;
        const trimMat = isWhite ? this.materials.citadelTrimWhite : this.materials.citadelTrimBlack;
        const beaconColor = isWhite ? 0x00f3ff : 0xff1744;

        // 1. Heavy Foundation Stone Plinth (rests directly on tile surface, preventing hover gaps)
        const plinthGeo = new THREE.BoxGeometry(2.38, 0.10, 2.38);
        const plinth = new THREE.Mesh(plinthGeo, stoneMat);
        plinth.position.y = 0.05;
        plinth.receiveShadow = true;
        barrier.add(plinth);

        // 2. 4 Sturdy Corner Bastion Towers
        const towerGeo = new THREE.BoxGeometry(0.36, 1.40, 0.36);
        const towerCapGeo = new THREE.BoxGeometry(0.44, 0.16, 0.44);
        const beaconGeo = new THREE.OctahedronGeometry(0.12, 0);
        const beaconMat = new THREE.MeshBasicMaterial({ color: beaconColor });

        const beaconMeshes = [];
        const corners = [
          [-1.02, -1.02], [1.02, -1.02],
          [1.02, 1.02], [-1.02, 1.02]
        ];

        corners.forEach(([cx, cz]) => {
          // Stone column shaft
          const col = new THREE.Mesh(towerGeo, stoneMat);
          col.position.set(cx, 0.70, cz);
          col.castShadow = true;
          col.receiveShadow = true;

          // Machicolated turret cap
          const cap = new THREE.Mesh(towerCapGeo, trimMat);
          cap.position.set(cx, 1.46, cz);
          cap.castShadow = true;

          // Glowing energy power beacon crystal
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(cx, 1.66, cz);
          beaconMeshes.push(beacon);

          barrier.add(col, cap, beacon);
        });

        // 3. 4 Crenellated Rampart Curtain Walls (North, South, East, West)
        const wallGeoH = new THREE.BoxGeometry(1.68, 1.05, 0.16);
        const wallGeoV = new THREE.BoxGeometry(0.16, 1.05, 1.68);
        const merlonGeoH = new THREE.BoxGeometry(0.44, 0.24, 0.18);
        const merlonGeoV = new THREE.BoxGeometry(0.18, 0.24, 0.44);

        const walls = [
          { geo: wallGeoH, mGeo: merlonGeoH, pos: [0, 0.58, -1.02], mOffsets: [[-0.45, 1.18, -1.02], [0.45, 1.18, -1.02]] },
          { geo: wallGeoH, mGeo: merlonGeoH, pos: [0, 0.58, 1.02],  mOffsets: [[-0.45, 1.18, 1.02], [0.45, 1.18, 1.02]] },
          { geo: wallGeoV, mGeo: merlonGeoV, pos: [-1.02, 0.58, 0], mOffsets: [[-1.02, 1.18, -0.45], [-1.02, 1.18, 0.45]] },
          { geo: wallGeoV, mGeo: merlonGeoV, pos: [1.02, 0.58, 0],  mOffsets: [[1.02, 1.18, -0.45], [1.02, 1.18, 0.45]] }
        ];

        walls.forEach(w => {
          const wMesh = new THREE.Mesh(w.geo, stoneMat);
          wMesh.position.set(...w.pos);
          wMesh.castShadow = true;
          wMesh.receiveShadow = true;
          barrier.add(wMesh);

          w.mOffsets.forEach(mo => {
            const merlon = new THREE.Mesh(w.mGeo, trimMat);
            merlon.position.set(...mo);
            merlon.castShadow = true;
            barrier.add(merlon);
          });
        });

        // 4. Shimmering Inner Aegis Forcefield Shield Panels
        const panelMat = new THREE.MeshPhysicalMaterial({
          color: beaconColor,
          transparent: true,
          opacity: 0.26,
          roughness: 0.10,
          transmission: 0.78,
          emissive: beaconColor,
          emissiveIntensity: 0.35,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        const sNorth = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.30, 0.04), panelMat);
        sNorth.position.set(0, 0.75, -0.96);
        const sSouth = new THREE.Mesh(new THREE.BoxGeometry(1.68, 1.30, 0.04), panelMat);
        sSouth.position.set(0, 0.75, 0.96);
        const sWest = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.30, 1.68), panelMat);
        sWest.position.set(-0.96, 0.75, 0);
        const sEast = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.30, 1.68), panelMat);
        sEast.position.set(0.96, 0.75, 0);

        barrier.add(sNorth, sSouth, sWest, sEast);
        barrier.userData = { panelMat, beaconMat, beaconMeshes, beaconColor };

        this.vfxGroup.add(barrier);
        this.citadelBarriers[kingPiece.team] = barrier;
      }

      if (kingPiece.wallActive && kingPiece.wallHp > 0 && !kingPiece.dead) {
        barrier.visible = true;
        const kingPos3D = (!kingPiece.inMotion && kingPiece.col !== undefined && kingPiece.row !== undefined)
          ? this.tileToWorld(kingPiece.col, kingPiece.row)
          : pos3D;
        barrier.position.set(kingPos3D.x, 0.08, kingPos3D.z);
        const hpRatio = kingPiece.wallHp / kingPiece.maxWallHp;
        const panelMat = barrier.userData.panelMat;
        const beaconMat = barrier.userData.beaconMat;
        const baseColor = barrier.userData.beaconColor;

        // Subtle idle pulse for beacon crystals
        const now = performance.now();
        if (barrier.userData.beaconMeshes) {
          barrier.userData.beaconMeshes.forEach(b => {
            b.rotation.y += 0.025;
            b.position.y = 1.66 + Math.sin(now / 350) * 0.04;
          });
        }

        if (panelMat) {
          if (kingPiece.wallHitFlash > 0) {
            panelMat.emissive.setHex(0xffffff);
            panelMat.emissiveIntensity = 1.35;
            panelMat.opacity = 0.85;
            if (beaconMat) beaconMat.color.setHex(0xffffff);
          } else {
            panelMat.emissive.setHex(baseColor);
            panelMat.emissiveIntensity = 0.20 + hpRatio * 0.35 + Math.sin(now / 400) * 0.10;
            panelMat.opacity = 0.18 + hpRatio * 0.25;
            if (beaconMat) beaconMat.color.setHex(baseColor);
          }
        }
      } else {
        barrier.visible = false;
      }
    }

    /* -------------------------------------------------------------
       Tactical Deployables 3D Models (Indestructible Walls & Landmines)
    ------------------------------------------------------------- */
    syncDeployables() {
      if (!this.arena.deployables || !this.piecesGroup) return;

      // 1. Remove meshes for deployables that are no longer active
      for (const [id, mesh] of this.deployableMeshes.entries()) {
        const d = this.arena.deployables.find(item => item.id === id);
        if (!d || (!d.active && d.type === 'mine')) {
          if (mesh.parent) mesh.parent.remove(mesh);
          this.deployableMeshes.delete(id);
        }
      }

      // 2. Add or update meshes for active deployables
      this.arena.deployables.forEach(d => {
        if (!d.active && d.type === 'mine') return;
        let mesh = this.deployableMeshes.get(d.id);

        if (!mesh) {
          mesh = this.createDeployableMesh(d);
          this.piecesGroup.add(mesh);
          this.deployableMeshes.set(d.id, mesh);
        }

        const pos3D = (d.col !== undefined && d.row !== undefined && isFinite(d.col) && isFinite(d.row))
          ? this.tileToWorld(d.col, d.row)
          : this.boardToWorld(d.x, d.y);
        mesh.position.set(pos3D.x, 0.08, pos3D.z);

        // Update animation ticks (e.g. mine LED blink, proximity pulse)
        if (d.type === 'mine' && mesh.userData) {
          const time = performance.now() * 0.001;
          if (mesh.userData.beaconMat) {
            const blink = Math.sin(time * 6) > 0 ? 1.0 : 0.15;
            mesh.userData.beaconMat.emissiveIntensity = blink * 1.5;
          }
          if (mesh.userData.proximityMat) {
            mesh.userData.proximityMat.opacity = 0.25 + 0.20 * Math.sin(time * 4);
          }
        }
      });
    }

    createDeployableMesh(deployable) {
      const group = new THREE.Group();
      group.userData = { deployable };

      if (deployable.type === 'wall') {
        // --- Indestructible Fortress Barrier Block ---
        // Main reinforced block
        const blockGeo = new THREE.BoxGeometry(2.32, 1.45, 2.32);
        const blockMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.32,
          metalness: 0.88
        });
        const blockMesh = new THREE.Mesh(blockGeo, blockMat);
        blockMesh.position.y = 0.725;
        blockMesh.castShadow = true;
        blockMesh.receiveShadow = true;
        group.add(blockMesh);

        const teamColor = deployable.team === 'white' ? 0x00f3ff : 0xe11d48;
        const teamEmissive = deployable.team === 'white' ? 0x0284c7 : 0x9f1239;

        // 4 Corner Bastion Stanchions
        const pylonGeo = new THREE.CylinderGeometry(0.16, 0.20, 1.6, 12);
        const pylonMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          roughness: 0.25,
          metalness: 0.95
        });
        const corners = [[-1.12, -1.12], [1.12, -1.12], [1.12, 1.12], [-1.12, 1.12]];
        corners.forEach(([cx, cz]) => {
          const p = new THREE.Mesh(pylonGeo, pylonMat);
          p.position.set(cx, 0.8, cz);
          p.castShadow = true;
          group.add(p);

          // Stanchion glowing cap
          const capGeo = new THREE.SphereGeometry(0.12, 8, 8);
          const capMat = new THREE.MeshBasicMaterial({ color: teamColor });
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.set(cx, 1.65, cz);
          group.add(cap);
        });

        // Top Shield Rune / Emblem
        const shieldGeo = new THREE.OctahedronGeometry(0.36, 0);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: teamColor,
          emissive: teamEmissive,
          emissiveIntensity: 0.6,
          roughness: 0.2,
          metalness: 0.8
        });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.set(0, 1.58, 0);
        shield.rotation.y = Math.PI / 4;
        group.add(shield);

        // Neon outline trim on top edge
        const trimGeo = new THREE.RingGeometry(0.85, 0.98, 4);
        const trimMat = new THREE.MeshBasicMaterial({
          color: teamColor,
          side: THREE.DoubleSide
        });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.set(0, 1.46, 0);
        trim.rotation.x = -Math.PI / 2;
        trim.rotation.z = Math.PI / 4;
        group.add(trim);

      } else if (deployable.type === 'mine') {
        // --- Tactical Landmine Disc ---
        // Base disc
        const baseGeo = new THREE.CylinderGeometry(0.85, 0.96, 0.22, 24);
        const baseMat = new THREE.MeshStandardMaterial({
          color: 0x1f242d,
          roughness: 0.45,
          metalness: 0.85
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = 0.11;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);

        // Warning Hazard Collar (Black & Yellow/Red)
        const collarGeo = new THREE.CylinderGeometry(0.86, 0.86, 0.08, 24);
        const collarMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          roughness: 0.35,
          metalness: 0.5
        });
        const collarMesh = new THREE.Mesh(collarGeo, collarMat);
        collarMesh.position.y = 0.18;
        group.add(collarMesh);

        // Central Trigger Button
        const trigGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.14, 16);
        const trigMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.3,
          metalness: 0.9
        });
        const trigMesh = new THREE.Mesh(trigGeo, trigMat);
        trigMesh.position.y = 0.24;
        group.add(trigMesh);

        // Pulsing LED Hazard Beacon
        const beaconGeo = new THREE.SphereGeometry(0.14, 12, 12);
        const beaconMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 1.0,
          roughness: 0.1
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 0.34;
        group.add(beacon);

        // Holographic Proximity Danger Ring on floor
        const proxGeo = new THREE.RingGeometry(1.05, 1.25, 32);
        const proxMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        });
        const proxRing = new THREE.Mesh(proxGeo, proxMat);
        proxRing.rotation.x = -Math.PI / 2;
        proxRing.position.y = 0.02;
        group.add(proxRing);

        group.userData = { beaconMat, proximityMat: proxMat };
      }

      return group;
    }

    updateDeployPreview() {
      if (!this.arena.deployMode || !this.arena.deployHoverTile) {
        if (this.deployPreviewMesh) this.deployPreviewMesh.visible = false;
        return;
      }

      const { col, row } = this.arena.deployHoverTile;
      if (col < 0 || col > 7 || row < 0 || row > 7) {
        if (this.deployPreviewMesh) this.deployPreviewMesh.visible = false;
        return;
      }

      const isValid = this.arena.canDeployAt(col, row, this.arena.deployMode);
      const hexColor = isValid ? 0x10b981 : 0xef4444;

      if (!this.deployPreviewMesh) {
        const previewGroup = new THREE.Group();

        // Hologram tile floor box
        const boxGeo = new THREE.BoxGeometry(2.35, 0.05, 2.35);
        const boxMat = new THREE.MeshBasicMaterial({
          color: hexColor,
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide
        });
        const boxMesh = new THREE.Mesh(boxGeo, boxMat);
        boxMesh.position.y = 0.03;
        previewGroup.add(boxMesh);

        // Ghost structure
        const ghostGeo = new THREE.BoxGeometry(2.2, 1.4, 2.2);
        const ghostMat = new THREE.MeshStandardMaterial({
          color: hexColor,
          emissive: hexColor,
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.30,
          roughness: 0.2
        });
        const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
        ghostMesh.position.y = 0.7;
        previewGroup.add(ghostMesh);

        previewGroup.userData = { boxMat, ghostMat };
        this.scene.add(previewGroup);
        this.deployPreviewMesh = previewGroup;
      }

      const layout = this.arena.getBoardLayout();
      const sqSize = layout.sqSize;
      const bx = layout.gridOriginX + (col + 0.5) * sqSize;
      const by = layout.gridOriginY + (row + 0.5) * sqSize;
      const pos3D = this.boardToWorld(bx, by);

      this.deployPreviewMesh.position.set(pos3D.x, 0, pos3D.z);
      this.deployPreviewMesh.visible = true;

      if (this.deployPreviewMesh.userData) {
        const { boxMat, ghostMat } = this.deployPreviewMesh.userData;
        if (boxMat) boxMat.color.setHex(hexColor);
        if (ghostMat) {
          ghostMat.color.setHex(hexColor);
          ghostMat.emissive.setHex(hexColor);
        }
      }
    }

    onMineDetonated(mine) {
      const mesh = this.deployableMeshes.get(mine.id);
      if (mesh) {
        if (mesh.parent) mesh.parent.remove(mesh);
        this.deployableMeshes.delete(mine.id);
      }

      if (!this.vfxGroup) return;
      const pos3D = this.boardToWorld(mine.x, mine.y);

      // Spawn 3D Fireball Explosion
      const blastGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const blastMat = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.95
      });
      const fireball = new THREE.Mesh(blastGeo, blastMat);
      fireball.position.set(pos3D.x, 0.8, pos3D.z);
      this.vfxGroup.add(fireball);

      // Spawn 3D Shockwave Ring
      const ringGeo = new THREE.RingGeometry(0.4, 0.9, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffa500,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos3D.x, 0.05, pos3D.z);
      this.vfxGroup.add(ring);

      // Animate explosion burst
      let elapsed = 0;
      const animInterval = setInterval(() => {
        elapsed += 0.033;
        if (fireball) {
          fireball.scale.addScalar(0.18);
          blastMat.opacity = Math.max(0, 0.95 - elapsed * 2.8);
        }
        if (ring) {
          ring.scale.addScalar(0.24);
          ringMat.opacity = Math.max(0, 0.85 - elapsed * 2.5);
        }
        if (elapsed > 0.42) {
          clearInterval(animInterval);
          if (fireball && fireball.parent) fireball.parent.remove(fireball);
          if (ring && ring.parent) ring.parent.remove(ring);
        }
      }, 33);
    }

    resetDeployables() {
      for (const [id, mesh] of this.deployableMeshes.entries()) {
        if (mesh.parent) mesh.parent.remove(mesh);
      }
      this.deployableMeshes.clear();
      if (this.deployPreviewMesh) {
        this.deployPreviewMesh.visible = false;
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
        const aimVec = (typeof this.arena.getAimVector === 'function')
          ? this.arena.getAimVector(selPiece)
          : { pullX: this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x, pullY: this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y, dist: 0, angle: 0 };
        const pullX = aimVec.pullX;
        const pullY = aimVec.pullY;
        const screenDist = aimVec.dist || Math.hypot(pullX, pullY);

        if (screenDist >= 8) {
          const clamped = Math.min(screenDist, this.arena.maxPullDistance);
          power = clamped / this.arena.maxPullDistance;
          angle = aimVec.angle !== undefined ? aimVec.angle : Math.atan2(pullY, pullX);
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

    tileToWorld(col, row) {
      const half3D = (this.gridSize3D || 20.0) / 2;
      const tileSize = (this.gridSize3D || 20.0) / 8;
      const c = Math.max(0, Math.min(7, col !== undefined ? col : 0));
      const r = Math.max(0, Math.min(7, row !== undefined ? row : 0));
      return {
        x: -half3D + (c + 0.5) * tileSize,
        z: -half3D + (r + 0.5) * tileSize
      };
    }

    /* -------------------------------------------------------------
       Coordinate Conversions: 2D Board Space <-> 3D World Space
    ------------------------------------------------------------- */
    boardToWorld(bx, by) {
      const layout = this.arena.getBoardLayout();
      const originX = (layout && layout.gridOriginX !== undefined) ? layout.gridOriginX : 0;
      const originY = (layout && layout.gridOriginY !== undefined) ? layout.gridOriginY : 0;
      const size = (layout && layout.gridSize > 0) ? layout.gridSize : 600;

      // Normalize to -1 to +1
      const nx = ((bx - originX) / size) * 2 - 1;
      const ny = ((by - originY) / size) * 2 - 1;

      // Scale to 3D grid dimensions
      const half3D = (this.gridSize3D || 20.0) / 2;
      return {
        x: nx * half3D,
        z: ny * half3D
      };
    }

    worldToBoard(wx, wz) {
      const layout = this.arena.getBoardLayout();
      const originX = (layout && layout.gridOriginX !== undefined) ? layout.gridOriginX : 0;
      const originY = (layout && layout.gridOriginY !== undefined) ? layout.gridOriginY : 0;
      const size = (layout && layout.gridSize > 0) ? layout.gridSize : 600;
      const half3D = (this.gridSize3D || 20.0) / 2;
      const nx = (wx / half3D + 1) / 2;
      const ny = (wz / half3D + 1) / 2;

      return {
        x: originX + nx * size,
        y: originY + ny * size
      };
    }

    /**
     * Resolves exact board square (col, row) directly from 3D raycast
     * Checks tile meshes, piece positions, and mathematical plane fallback
     */
    getSquareAtPointer(m) {
      this.mouse.x = m.x;
      this.mouse.y = m.y;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // 1. Raycast against tile meshes in 3D board
      if (this.tileMeshList && this.tileMeshList.length > 0) {
        const hits = this.raycaster.intersectObjects(this.tileMeshList, false);
        if (hits.length > 0) {
          const u = hits[0].object.userData;
          if (u && u.col !== undefined && u.row !== undefined) {
            return { col: u.col, row: u.row };
          }
        }
      }

      // 2. Raycast against 3D piece meshes
      const pieceTargets = [];
      if (this.pieceMeshes) {
        this.pieceMeshes.forEach(mesh => pieceTargets.push(mesh));
      }
      if (pieceTargets.length > 0) {
        const hits = this.raycaster.intersectObjects(pieceTargets, true);
        if (hits.length > 0) {
          let topObj = hits[0].object;
          while (topObj && !topObj.userData?.piece && topObj.parent) {
            topObj = topObj.parent;
          }
          if (topObj && topObj.userData?.piece) {
            const p = topObj.userData.piece;
            if (p && !p.dead) {
              const layout = this.arena.getBoardLayout();
              const sqSize = layout ? layout.sqSize : 64;
              const originX = layout ? layout.gridOriginX : 0;
              const originY = layout ? layout.gridOriginY : 0;
              const pCol = Math.floor((p.x - originX) / sqSize);
              const pRow = Math.floor((p.y - originY) / sqSize);
              return { col: pCol, row: pRow };
            }
          }
        }
      }

      // 3. Mathematical fallback from 3D board plane
      const boardPlanePt = new THREE.Vector3();
      const planeHit = this.raycaster.ray.intersectPlane(this.boardPlane, boardPlanePt);
      if (planeHit) {
        const half = (this.gridSize3D || 20.0) / 2;
        const tile = (this.gridSize3D || 20.0) / 8;
        const col = Math.floor((planeHit.x + half) / tile);
        const row = Math.floor((planeHit.z + half) / tile);
        if (col >= 0 && col < 8 && row >= 0 && row < 8) {
          return { col, row };
        }
      }

      return null;
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
          if (target.name === 'contact_shadow' || target.name === 'phalanx_ring') continue;
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
        // Snaps to the nearest eligible piece only if clicking immediately at piece base
        const planeHit = this.raycaster.ray.intersectPlane(this.boardPlane, boardPlanePt);
        if (planeHit && this.arena.pieces) {
          let closestPiece = null;
          let minDistance = Infinity;
          const maxSnapDistance = (this.tileSize3D || 2.5) * 0.40; // Tight piece base radius

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
        if (this.arena.turnHasMoved || this.arena.simulationSettling) return;
        const anyMoving = (this.arena.pieces || []).some(p => !p.dead && (Math.hypot(p.vx, p.vy) > 0.15 || p.inMotion));
        if (anyMoving) return;
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
        this._pointerDownClient = { x: e.clientX, y: e.clientY };
        this._pointerDownTime = performance.now();

        // Check if Tactical Deploy Mode is active (Placing Landmine or Indestructible Wall in 3D)
        if (this.arena.deployMode) {
          const sq = this.getSquareAtPointer(m);
          if (sq) {
            if (this.arena.canDeployAt(sq.col, sq.row, this.arena.deployMode)) {
              this._pointerDownWasDeploy = true;
              this.arena.deployTacticalItem(this.arena.currentTurn, this.arena.deployMode, sq.col, sq.row);
            } else {
              if (this.arena.audio) this.arena.audio.playImpact(0.4);
              if (window.ArchessToast) window.ArchessToast.show('Square occupied or invalid for deployment', 'warning', 1800, 'DEPLOY');
            }
          }
          if (e.cancelable) e.preventDefault();
          return;
        }

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

        if (this.arena.deployMode) {
          const sq = this.getSquareAtPointer(m);
          this.arena.deployHoverTile = sq ? { col: sq.col, row: sq.row } : null;
          return;
        }

        if (this.arena.isDragging && this.arena.selectedPiece) {
          this.arena.dragScreenCurrent = { x: m.screenX, y: m.screenY };
          const aimVec = (typeof this.arena.getAimVector === 'function')
            ? this.arena.getAimVector(this.arena.selectedPiece)
            : { pullX: this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x, pullY: this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y, dist: 0 };
          const pullX = aimVec.pullX;
          const pullY = aimVec.pullY;
          const dist = aimVec.dist || Math.hypot(pullX, pullY);
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

        if (this._pointerDownWasDeploy) {
          this._pointerDownWasDeploy = false;
          this.arena.isDragging = false;
          this.arena.selectedPiece = null;
          return;
        }

        const SLINGSHOT_DRAG_THRESHOLD = 8;
        const clientX = e.clientX !== undefined ? e.clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
        const clientY = e.clientY !== undefined ? e.clientY : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0);
        const distMoved = this._pointerDownClient
          ? Math.hypot(clientX - this._pointerDownClient.x, clientY - this._pointerDownClient.y)
          : 0;

        // If user tapped/clicked without substantial drag and not in active deploy button mode
        if (distMoved < SLINGSHOT_DRAG_THRESHOLD && !this.arena.deployMode && !this.arena.isGameOver) {
          this.arena.isDragging = false;
          this.arena.selectedPiece = null;

          if (!this.arena.turnHasMoved && !this.arena.simulationSettling) {
            const anyMoving = (this.arena.pieces || []).some(p => !p.dead && (Math.hypot(p.vx, p.vy) > 0.15 || p.inMotion));
            if (!anyMoving) {
              const m = getNormalizedMouse(e);
              const sq = this.getSquareAtPointer(m);
              if (sq) {
                this._lastSquareTapTime = performance.now();
                if (typeof this.arena.onSquareClick === 'function') {
                  this.arena.onSquareClick(sq.col, sq.row);
                }
              }
            }
          }
        }

        if (this.arena.isDragging && this.arena.selectedPiece) {
          const pieceToLaunch = this.arena.selectedPiece;
          const aimVec = (typeof this.arena.getAimVector === 'function')
            ? this.arena.getAimVector(pieceToLaunch)
            : { pullX: this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x, pullY: this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y, dist: 0 };
          let pullX = aimVec.pullX;
          let pullY = aimVec.pullY;
          const dist = aimVec.dist || Math.hypot(pullX, pullY);

          if (dist >= SLINGSHOT_DRAG_THRESHOLD && !this.arena.turnHasMoved && !this.arena.simulationSettling) {
            const anyMoving = (this.arena.pieces || []).some(p => !p.dead && (Math.hypot(p.vx, p.vy) > 0.15 || p.inMotion));
            if (!anyMoving) {
              this._lastLaunchTime = performance.now();
              let clampedDist = Math.min(dist, this.arena.maxPullDistance);

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

      const handleWindowPointerMove = (e) => {
        if (!this.arena.isDragging) return;
        handlePointerMove(e);
      };

      addTrackedListener(dom, 'pointerdown', handlePointerDown);
      addTrackedListener(dom, 'pointermove', handlePointerMove);
      addTrackedListener(window, 'pointermove', handleWindowPointerMove);
      addTrackedListener(window, 'pointerup', handlePointerUp);
      addTrackedListener(dom, 'pointercancel', handlePointerCancel);
      addTrackedListener(window, 'pointercancel', handlePointerCancel);

      // Direct Click Listener on 3D canvas (handles single, double, and triple clicks cleanly)
      addTrackedListener(dom, 'click', (e) => {
        if (e.button === 2 || e.button === 1) return;
        if (this._pointerDownWasDeploy) {
          this._pointerDownWasDeploy = false;
          return;
        }
        if (this.arena.isGameOver) return;
        if (this.arena.gameMode === 'bot' && this.arena.currentTurn === 'black') return;
        if (this.arena.gameMode === 'ai-vs-ai') return;
        if (this.arena.deployMode) return;
        if (this.arena.turnHasMoved || this.arena.simulationSettling) return;
        const anyMoving = (this.arena.pieces || []).some(p => !p.dead && (Math.hypot(p.vx, p.vy) > 0.15 || p.inMotion));
        if (anyMoving) return;
        if (this._lastSquareTapTime && (performance.now() - this._lastSquareTapTime < 250)) return;
        if (this._lastLaunchTime && performance.now() - this._lastLaunchTime < 350) return;

        const m = getNormalizedMouse(e);
        const sq = this.getSquareAtPointer(m);
        if (sq) {
          if (typeof this.arena.onSquareClick === 'function') {
            this.arena.onSquareClick(sq.col, sq.row);
          }
        }
      });

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

    toggleFlip() {
      if (this.activePreset === 'flipped') {
        this.setCameraPreset('tabletop');
      } else {
        this.setCameraPreset('flipped');
      }
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
       Realistic 3D Defeat Knockdown & Tumble Physics
    ------------------------------------------------------------- */
    startPieceTumble(piece, meshGroup) {
      if (meshGroup.userData.isTumbling) return;
      meshGroup.userData.isTumbling = true;
      this.pieceMeshes.delete(piece.id);

      // Determine topple vector from piece's last velocity or impact angle
      let vx = piece.vx || (Math.random() - 0.5) * 1.5;
      let vy = piece.vy || (Math.random() - 0.5) * 1.5;
      const speed = Math.hypot(vx, vy);
      let dirX = (speed > 0.05) ? (vx / speed) : (Math.random() - 0.5);
      let dirZ = (speed > 0.05) ? (vy / speed) : (Math.random() - 0.5);

      // Topple axis is perpendicular to knockback vector
      const rotAxis = new THREE.Vector3(-dirZ, 0, dirX).normalize();

      this.tumblingPieces.push({
        meshGroup,
        piece,
        rotAxis,
        fallAngle: 0,
        targetAngle: Math.PI * 0.48, // ~86 degrees: resting flat on its side
        fallSpeed: Math.min(7.5, 3.8 + speed * 0.45),
        bounceY: 0.35 + Math.min(0.5, speed * 0.05),
        bounceVy: 2.2,
        y: meshGroup.position.y,
        life: 0,
        maxLife: 1.2
      });

      this.spawnLandingDust(meshGroup.position.x, meshGroup.position.z, 1.4);
      this.triggerZoomPunch(0.75);
    }

    updateTumbles(dt) {
      for (let i = this.tumblingPieces.length - 1; i >= 0; i--) {
        const item = this.tumblingPieces[i];
        item.life += dt;

        // 1. Angular topple onto side
        if (item.fallAngle < item.targetAngle) {
          const deltaAngle = item.fallSpeed * dt;
          item.fallAngle = Math.min(item.targetAngle, item.fallAngle + deltaAngle);
          item.meshGroup.rotateOnAxis(item.rotAxis, deltaAngle);
        }

        // 2. Vertical bounce & settle on board plinth
        if (item.bounceY > 0) {
          item.y += item.bounceVy * dt;
          item.bounceVy -= 14.0 * dt;
          if (item.y <= 0.08) {
            item.y = 0.08;
            item.bounceVy = -item.bounceVy * 0.35;
            if (Math.abs(item.bounceVy) < 0.25) {
              item.bounceVy = 0;
              item.bounceY = 0;
            }
          }
          item.meshGroup.position.y = item.y;
        }

        // 3. Smooth dissolve fade out in the final 50% of tumble
        if (item.life > item.maxLife * 0.50) {
          const fadeProgress = (item.life - item.maxLife * 0.50) / (item.maxLife * 0.50);
          const opacity = Math.max(0, 1.0 - fadeProgress);
          item.meshGroup.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = opacity;
            }
          });
        }

        // 4. Remove completely after maxLife
        if (item.life >= item.maxLife) {
          if (item.meshGroup.parent) {
            item.meshGroup.parent.remove(item.meshGroup);
          }
          this.tumblingPieces.splice(i, 1);
        }
      }
    }

    resetTumbles() {
      for (const item of this.tumblingPieces) {
        if (item.meshGroup && item.meshGroup.parent) {
          item.meshGroup.parent.remove(item.meshGroup);
        }
      }
      this.tumblingPieces = [];
      for (const p of this.landingDustParticles) {
        if (p.mesh && p.mesh.parent) {
          p.mesh.parent.remove(p.mesh);
        }
        if (p.mesh && p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mat) p.mat.dispose();
      }
      this.landingDustParticles = [];
    }

    /* -------------------------------------------------------------
       3D Ground Landing Dust Rings & Impact Shockwaves
    ------------------------------------------------------------- */
    spawnLandingDust(x, z, intensity = 1.0) {
      if (!this.vfxGroup) return;
      const ringGeo = new THREE.RingGeometry(0.28 * intensity, 0.72 * intensity, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xdfd7ca,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.086, z);
      this.vfxGroup.add(ring);

      this.landingDustParticles.push({
        mesh: ring,
        mat: ringMat,
        scaleSpeed: 2.4 * intensity,
        opacity: 0.55,
        fadeSpeed: 2.6
      });
    }

    updateLandingDust(dt) {
      for (let i = this.landingDustParticles.length - 1; i >= 0; i--) {
        const p = this.landingDustParticles[i];
        p.mesh.scale.addScalar(p.scaleSpeed * dt);
        p.opacity -= p.fadeSpeed * dt;
        p.mat.opacity = Math.max(0, p.opacity);
        if (p.opacity <= 0) {
          if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
          if (p.mesh.geometry) p.mesh.geometry.dispose();
          if (p.mat) p.mat.dispose();
          this.landingDustParticles.splice(i, 1);
        }
      }
    }

    /* -------------------------------------------------------------
       Dynamic Camera Zooming Effects (Action Cam, Zoom Punch & Shake)
    ------------------------------------------------------------- */
    triggerZoomPunch(intensity = 1.0) {
      this.camZoomPunch = Math.min(0.28, (this.camZoomPunch || 0) + 0.09 * intensity);
      if (this.arena && this.arena.screenShake) {
        this.camShake.intensity = Math.max(this.camShake.intensity, this.arena.screenShake * 0.08);
      }
    }

    updateCamera(dt) {
      if (!this.camera) return;

      // 1. Aim Tension Zoom (Cinematic Action Cam while pulling slingshot)
      const isAiming = Boolean(this.arena && this.arena.isDragging && this.arena.selectedPiece);
      const targetAimZoom = isAiming ? 1.0 : 0.0;
      this.camAimZoom = THREE.MathUtils.lerp(this.camAimZoom || 0, targetAimZoom, Math.min(1.0, dt * 6.5));

      // 2. Impact Zoom Punch decay
      if (this.camZoomPunch > 0.001) {
        this.camZoomPunch *= Math.exp(-dt * 13.0);
      } else {
        this.camZoomPunch = 0;
      }

      // 3. Dynamic FOV calculation (Normal 40deg -> tight 32.5deg on aim -> sudden zoom-in punch on impact)
      const aimFovDelta = this.camAimZoom * 7.5;
      const punchFovDelta = this.camZoomPunch * 20.0;
      const targetFov = Math.max(24, Math.min(50, this.baseFov - aimFovDelta - punchFovDelta));
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }

      // 4. Slingshot Aim Camera Focus Drift (gently frames the piece being aimed)
      if (isAiming && this.arena.selectedPiece && !this._targetCamPos) {
        const selPos = this.boardToWorld(this.arena.selectedPiece.x, this.arena.selectedPiece.y);
        if (this.controls) {
          const aimLookTarget = new THREE.Vector3(selPos.x * 0.35, 0.2, selPos.z * 0.35);
          this.controls.target.lerp(aimLookTarget, Math.min(1.0, dt * 4.0));
        }
      } else if (!this._targetCamPos && this.controls) {
        // Return look target to center
        const defaultLook = (this.cameraPresets[this.activePreset] || this.cameraPresets.tabletop).look;
        this.controls.target.lerp(defaultLook, Math.min(1.0, dt * 5.0));
      }

      // 5. 3D Camera Shake from impacts & arena screenShake
      if (this.arena && this.arena.screenShake > 0) {
        this.camShake.intensity = Math.max(this.camShake.intensity, this.arena.screenShake * 0.07);
      }
      if (this.camShake.intensity > 0.002) {
        const shake = this.camShake.intensity;
        this.camera.position.x += (Math.random() - 0.5) * shake;
        this.camera.position.y += (Math.random() - 0.5) * shake * 0.6;
        this.camera.position.z += (Math.random() - 0.5) * shake;
        this.camShake.intensity *= Math.exp(-dt * 9.5);
      } else {
        this.camShake.intensity = 0;
      }
    }

    onSloMo(active) {
      this.isSloMoActive = active;
      if (this.container) {
        if (active) {
          this.container.classList.add('archess-slomo-active');
        } else {
          this.container.classList.remove('archess-slomo-active');
        }
      }
      if (this.renderer) {
        this.renderer.toneMappingExposure = active ? 1.25 : 1.12;
      }
      if (active) {
        this.triggerZoomPunch(1.1);
      }
    }

    /* -------------------------------------------------------------
       Main 3D Animation & Render Loop
    ------------------------------------------------------------- */
    update(dt = 0.016) {
      // 0. Smooth Camera Preset Interpolation & Action Cam / Aim Zoom / Zoom Punch / 3D Shake
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

      this.updateCamera(dt);

      // 1. Sync 3D Pieces with 2D Physics state (Hops, Squash & Stretch, Wobble)
      this.syncPieces(dt);

      // 1b. Update Tumbling Pieces on Defeat / Knockdown
      this.updateTumbles(dt);

      // 1c. Update 3D Landing Dust & Impact Sparks
      this.updateLandingDust(dt);

      // 1d. Sync Tactical Deployables (Indestructible Walls & Landmines)
      this.syncDeployables();

      // 1e. Update Holographic Deploy Preview on hovered square
      this.updateDeployPreview();

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
      this.resetTumbles();
      this.resetDeployables();
      if (this.deployPreviewMesh) {
        if (this.deployPreviewMesh.parent) this.deployPreviewMesh.parent.remove(this.deployPreviewMesh);
        this.deployPreviewMesh = null;
      }
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
