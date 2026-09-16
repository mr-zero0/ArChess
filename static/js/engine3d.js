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
      this.cameraPresets = {
        tabletop: { pos: new THREE.Vector3(0, 26, 28), look: new THREE.Vector3(0, 0, 0) },
        cinematic: { pos: new THREE.Vector3(0, 16, 26), look: new THREE.Vector3(0, 1.5, 0) },
        tactical: { pos: new THREE.Vector3(0, 38, 4), look: new THREE.Vector3(0, 0, 0) }
      };
      this.activePreset = 'tabletop';

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

      // 2. Camera setup (FOV 42 for realistic perspective without wide-angle fish-eye)
      this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 200);
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
      this.renderer.toneMappingExposure = 1.42;

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

      console.log('[Archess3D] Realistic 3D WebGL Game Engine initialized successfully.');
    }

    /* -------------------------------------------------------------
       Materials & Textures Library (PBR Physically-Based Rendering)
    ------------------------------------------------------------- */
    initMaterials() {
      // 1. Procedural Noise / Wood / Marble Textures via Canvas
      const darkWoodTex = this.createWoodTexture('#4e3729', '#38251a', 256, 256);
      const lightWoodTex = this.createWoodTexture('#fdf8f0', '#ebdcc9', 256, 256);
      const frameWoodTex = this.createWoodTexture('#3a2418', '#22150e', 512, 512);
      const marbleTex = this.createMarbleTexture(256, 256);

      // 2. Board Frame (Polished Mahogany / Dark Walnut with warm gold trim)
      this.materials.boardFrame = new THREE.MeshStandardMaterial({
        color: 0x3a2418,
        map: frameWoodTex,
        roughness: 0.30,
        metalness: 0.12
      });

      this.materials.brassTrim = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.18,
        metalness: 0.95
      });

      this.materials.cushionRail = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.60,
        metalness: 0.18
      });

      // 3. Board Tiles (Clear contrast between warm cream ivory and rich walnut espresso)
      this.materials.tileLight = new THREE.MeshStandardMaterial({
        color: 0xfffaf2,
        map: lightWoodTex,
        roughness: 0.28,
        metalness: 0.04
      });

      this.materials.tileDark = new THREE.MeshStandardMaterial({
        color: 0x5a4436,
        map: darkWoodTex,
        roughness: 0.38,
        metalness: 0.06
      });

      // 4. White Army: Luminous Alabaster Ivory & Polished Maple
      this.materials.pieceWhite = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.20,
        metalness: 0.06
      });

      this.materials.pieceWhiteAccent = new THREE.MeshStandardMaterial({
        color: 0xfbbf24, // Burnished imperial gold finials
        roughness: 0.18,
        metalness: 0.92
      });

      // 5. Black Army: Polished Titanium Obsidian (Distinct form, contours & specular sheen)
      this.materials.pieceBlack = new THREE.MeshStandardMaterial({
        color: 0x3b4354,
        roughness: 0.22,
        metalness: 0.40
      });

      this.materials.pieceBlackAccent = new THREE.MeshStandardMaterial({
        color: 0xf43f5e, // Radiant ruby crimson crest
        roughness: 0.18,
        metalness: 0.88
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
       Studio Lighting (Key Light, Fill Light, Rear Rim Light, Spotlight)
    ------------------------------------------------------------- */
    setupLights() {
      // 1. Luminous Ambient Light (Illuminates shadow crevices across the entire board)
      const ambientLight = new THREE.AmbientLight(0xfffbf0, 1.40);
      this.scene.add(ambientLight);
      this.lights.ambient = ambientLight;

      // 2. Main Key Directional Light (Warm sunlight, casts crisp soft shadows)
      const keyLight = new THREE.DirectionalLight(0xfffaeb, 1.85);
      keyLight.position.set(18, 34, 22);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 75;
      const d = 16;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.radius = 2.0;
      this.scene.add(keyLight);
      this.lights.key = keyLight;

      // 3. Cool Accent Fill Light (Prevents flat shadows on opposite flank)
      const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.30);
      fillLight.position.set(-20, 18, -16);
      this.scene.add(fillLight);
      this.lights.fill = fillLight;

      // 4. Dedicated Rear Rim Light (Crucial: Highlights Black Army silhouettes, crowns & bevels)
      const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.85);
      rimLight.position.set(0, 26, -26);
      this.scene.add(rimLight);
      this.lights.rim = rimLight;

      // 5. Warm Front Fill Light (Enhances White Army specular depth)
      const frontFill = new THREE.DirectionalLight(0xfff3e0, 0.95);
      frontFill.position.set(0, 14, 26);
      this.scene.add(frontFill);
      this.lights.front = frontFill;

      // 6. Broad Center Spotlight (Even, dramatic illumination across active 64 tiles)
      const spotLight = new THREE.SpotLight(0xfff7ed, 1.6, 70, Math.PI / 3.0, 0.5, 1.0);
      spotLight.position.set(0, 32, 0);
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

      this.arena.pieces.forEach(p => {
        activeIds.add(p.id);
        let meshGroup = this.pieceMeshes.get(p.id);

        if (!meshGroup) {
          // Create new 3D Piece Mesh
          meshGroup = this.buildPieceMesh(p);
          this.piecesGroup.add(meshGroup);
          this.pieceMeshes.set(p.id, meshGroup);
        }

        // Convert 2D Arena Board Space (x, y) to 3D World Space (X, Z)
        const pos3D = this.boardToWorld(p.x, p.y);
        
        // Handle Elevation (when dragged, lifted off board)
        const isSelected = this.arena.selectedPiece === p;
        const targetElev = (isSelected && this.arena.isDragging) ? 1.4 : 0;
        meshGroup.position.x = pos3D.x;
        meshGroup.position.z = pos3D.z;
        meshGroup.position.y = THREE.MathUtils.lerp(meshGroup.position.y, targetElev, 0.25);

        // Visibility & Death
        if (p.dead) {
          meshGroup.visible = false;
        } else {
          meshGroup.visible = true;

          // Velocity-based dynamic tilt / inertia (piece tilts into its direction of motion)
          const speed = Math.hypot(p.vx || 0, p.vy || 0);
          if (speed > 0.4) {
            const tiltMax = 0.22;
            const angle = Math.atan2(p.vy, p.vx);
            meshGroup.rotation.z = THREE.MathUtils.lerp(meshGroup.rotation.z, -Math.cos(angle) * Math.min(tiltMax, speed * 0.025), 0.2);
            meshGroup.rotation.x = THREE.MathUtils.lerp(meshGroup.rotation.x, Math.sin(angle) * Math.min(tiltMax, speed * 0.025), 0.2);
          } else {
            meshGroup.rotation.z = THREE.MathUtils.lerp(meshGroup.rotation.z, 0, 0.2);
            meshGroup.rotation.x = THREE.MathUtils.lerp(meshGroup.rotation.x, 0, 0.2);
          }
          // Dynamic Collision Impact Flash in 3D (visual effect suggesting collision without text)
          if (p.hitFlash && p.hitFlash > 0) {
            meshGroup.traverse(child => {
              if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setHex(0xff3333);
                child.material.emissiveIntensity = p.hitFlash * 0.85;
              }
            });
          } else {
            meshGroup.traverse(child => {
              if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissiveIntensity = 0;
              }
            });
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
      group.userData = { pieceId: piece.id, piece: piece };

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

      // Precision Raycast Hit Cylinder: sized tailored to square bounds to ensure vanguard pawns are never blocked by back-rank pieces
      const hH = piece.type === 'pawn' ? 2.0 : (piece.type === 'king' || piece.type === 'queen' ? 3.0 : 2.5);
      const hitRadiusTop = piece.type === 'pawn' ? 0.80 : 0.88;
      const hitRadiusBottom = piece.type === 'pawn' ? 0.90 : 0.98;
      const hitGeo = new THREE.CylinderGeometry(hitRadiusTop, hitRadiusBottom, hH, 16);
      const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = hH / 2;
      hitMesh.userData = { pieceId: piece.id, piece: piece };
      group.add(hitMesh);

      group.add(pieceModel);
      return group;
    }

    /* -------------------------------------------------------------
       King Citadel Wall 3D Forcefield Barrier
    ------------------------------------------------------------- */
    updateCitadelBarrier(kingPiece, pos3D) {
      let barrier = this.citadelBarriers[kingPiece.team];

      if (!barrier) {
        // Build Hexagonal Crystalline Shield
        const shieldGeo = new THREE.CylinderGeometry(2.2, 2.2, 2.8, 6, 1, true);
        const shieldMat = new THREE.MeshPhysicalMaterial({
          color: kingPiece.team === 'white' ? 0x00f3ff : 0xff0055,
          transparent: true,
          opacity: 0.55,
          roughness: 0.1,
          transmission: 0.65,
          emissive: kingPiece.team === 'white' ? 0x00f3ff : 0xff0055,
          emissiveIntensity: 0.35,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        barrier = new THREE.Mesh(shieldGeo, shieldMat);
        this.vfxGroup.add(barrier);
        this.citadelBarriers[kingPiece.team] = barrier;
      }

      if (kingPiece.wallActive && kingPiece.wallHp > 0 && !kingPiece.dead) {
        barrier.visible = true;
        barrier.position.set(pos3D.x, 1.4, pos3D.z);
        barrier.rotation.y += 0.015; // Slow ambient rotation
        const hpRatio = kingPiece.wallHp / kingPiece.maxWallHp;
        barrier.material.opacity = 0.25 + hpRatio * 0.45;
      } else {
        barrier.visible = false;
      }
    }

    /* -------------------------------------------------------------
       3D Slingshot Aiming Trajectory & Power Ring
    ------------------------------------------------------------- */
    setupAimMeshes() {
      // 1. Aim Trajectory Tube / Ribbon
      const lineGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(2 * 3);
      lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const lineMat = new THREE.LineDashedMaterial({
        color: 0xffd700,
        dashSize: 0.6,
        gapSize: 0.4,
        linewidth: 3
      });
      this.aimTrajectoryMesh = new THREE.Line(lineGeo, lineMat);
      this.aimTrajectoryMesh.visible = false;
      this.scene.add(this.aimTrajectoryMesh);

      // 2. Aim Arrowhead Marker
      const arrowGeo = new THREE.ConeGeometry(0.42, 0.9, 16);
      arrowGeo.rotateX(Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      this.aimArrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      this.aimArrowMesh.visible = false;
      this.scene.add(this.aimArrowMesh);

      // 3. Power Reticle around Piece
      const ringGeo = new THREE.RingGeometry(1.2, 1.35, 32);
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

      if (this.arena.isDragging && selPiece) {
        const startPos = this.boardToWorld(selPiece.x, selPiece.y);
        const pullX = this.arena.dragScreenAnchor.x - this.arena.dragScreenCurrent.x;
        const pullY = this.arena.dragScreenAnchor.y - this.arena.dragScreenCurrent.y;
        const screenDist = Math.hypot(pullX, pullY);

        if (screenDist >= 10) {
          const clamped = Math.min(screenDist, this.arena.maxPullDistance);
          const power = clamped / this.arena.maxPullDistance;
          const aimLen = 3.5 + power * 9.5; // World units

          // Derive angle in world space (aim forward toward enemy lines)
          const angle = Math.atan2(pullY, pullX);
          const dirX = Math.cos(angle);
          const dirZ = Math.sin(angle);

          const endX = startPos.x + dirX * aimLen;
          const endZ = startPos.z + dirZ * aimLen;

          const isMaxPower = power > 0.85;
          const aimColor = isMaxPower ? 0xff3b4e : 0xffd700;

          // Update trajectory line
          const posAttr = this.aimTrajectoryMesh.geometry.attributes.position;
          posAttr.setXYZ(0, startPos.x, 0.4, startPos.z);
          posAttr.setXYZ(1, endX, 0.4, endZ);
          posAttr.needsUpdate = true;
          this.aimTrajectoryMesh.material.color.setHex(aimColor);
          this.aimTrajectoryMesh.computeLineDistances();
          this.aimTrajectoryMesh.visible = true;

          // Update Arrowhead
          this.aimArrowMesh.position.set(endX, 0.4, endZ);
          this.aimArrowMesh.lookAt(endX + dirX, 0.4, endZ + dirZ);
          this.aimArrowMesh.material.color.setHex(aimColor);
          this.aimArrowMesh.visible = true;

          // Update Reticle
          this.aimReticleMesh.position.set(startPos.x, 0.08, startPos.z);
          this.aimReticleMesh.rotation.y += 0.04;
          this.aimReticleMesh.material.color.setHex(aimColor);
          this.aimReticleMesh.visible = true;
          return;
        }
      }

      this.aimTrajectoryMesh.visible = false;
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
            const clampedDist = Math.min(dist, this.arena.maxPullDistance);
            const powerRatio = clampedDist / this.arena.maxPullDistance;
            const pieceToLaunch = this.arena.selectedPiece;

            this.arena.launchPiece(pieceToLaunch, pullX, pullY, clampedDist);

            if (this.arena.multiplayerMode && typeof this.arena.onPieceLaunchBroadcast === 'function') {
              const impulse = clampedDist * 0.15 * pieceToLaunch.speedMulti;
              const angle = Math.atan2(pullY, pullX);
              this.arena.onPieceLaunchBroadcast({
                pieceId: pieceToLaunch.id,
                vx: Math.cos(angle) * impulse,
                vy: Math.sin(angle) * impulse,
                dist: clampedDist,
                powerRatio
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
        if (this.aimArrowMesh) this.aimArrowMesh.visible = false;
        if (this.aimReticleMesh) this.aimReticleMesh.visible = false;
      };

      // Pointer event bindings
      dom.addEventListener('pointerdown', handlePointerDown);
      dom.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointermove', handlePointerMove);
      dom.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointerup', handlePointerUp);
      dom.addEventListener('pointercancel', handlePointerCancel);
      window.addEventListener('pointercancel', handlePointerCancel);

      // Touch fallbacks
      dom.addEventListener('touchstart', handlePointerDown, { passive: false });
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }

    /* -------------------------------------------------------------
       Camera Presets & View Controls
    ------------------------------------------------------------- */
    setCameraPreset(presetName) {
      if (this.cameraPresets[presetName]) {
        this.activePreset = presetName;
        const target = this.cameraPresets[presetName];
        this.camera.position.copy(target.pos);
        if (this.controls) {
          this.controls.target.copy(target.look);
          this.controls.update();
        }
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
      // 1. Sync 3D Pieces with 2D Physics state
      this.syncPieces();

      // 2. Update Slingshot Aim Visuals
      this.updateAimVisuals();

      // 3. Update Hover HP Visuals in 3D (Only on hover!)
      this.updateHoverVisuals();

      // 4. Update Orbit Controls Damping
      if (this.controls) {
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
  }

  // Export to global window scope
  window.Archess3DEngine = Archess3DEngine;

})(window);
