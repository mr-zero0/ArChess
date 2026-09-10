/**
 * ARCHESS - Full 32-Piece Tactical Chessboard Engine
 * Supports 2D Orthographic & 3D Isometric Perspective Modes,
 * Board Themes (Midnight, Woodland, Ivory), Piece Styles (Classic, Outline, Mono),
 * Turn System, Keyboard Gameplay Parity, and Live Structured Telemetry.
 */

class ArchessAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playLaunch(powerRatio) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(540 * powerRatio + 120, now + 0.18);
      gain.gain.setValueAtTime(0.25 * powerRatio, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch(e) {}
  }

  playImpact(intensity = 1) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.16);
      const vol = Math.min(0.45 * intensity, 0.65);
      oscGain.gain.setValueAtTime(vol, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);

      // Noise crack for marble/wood collision
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(850, now);
      noiseFilter.Q.setValueAtTime(3, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch(e) {}
  }

  playBounce() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(290, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch(e) {}
  }

  playVictory() {
    if (this.muted || !this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, idx) => {
        const startTime = this.ctx.currentTime + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch(e) {}
  }

  playShatter() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.2);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch(e) {}
  }
}

class ArchessArena {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.audio = new ArchessAudio();

    // Mode States
    this.renderMode = '3d'; // '2d' or '3d'
    this.boardTheme = 'midnight'; // 'midnight', 'woodland', 'ivory'
    this.pieceTheme = 'classic'; // 'classic', 'outline', 'mono'
    this.gameMode = 'bot'; // 'bot' (vs AI) or 'pvp' (local pass & play)
    this.currentTurn = 'white'; // 'white' or 'black'

    // Match tracking
    this.turns = 0;
    this.matchStartTime = Date.now();
    this.isGameOver = false;
    this.winner = null;
    this.botThinking = false;
    this.botTimeout = null;

    // Physics constants
    this.friction = 0.985;
    this.elasticity = 0.78;
    this.maxPullDistance = 150;

    // Game state
    this.pieces = [];
    this.selectedPiece = null;
    this.hoveredPiece = null;
    this.keyboardTargetIndex = 0;
    this.keyboardAimAngle = -Math.PI / 2;
    this.keyboardAimPower = 0.5;
    this.keyboardAiming = false;

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.dragScreenAnchor = { x: 0, y: 0 };
    this.dragScreenCurrent = { x: 0, y: 0 };

    this.particles = [];
    this.damageNumbers = [];
    this.screenShake = 0;
    this.simulationSettling = false;
    this.totalImpacts = 0;
    this.whiteDamage = 0;
    this.blackDamage = 0;

    // Telemetry callback
    this.onTelemetry = null;

    this.initCanvasSize();
    this.init32Pieces();
    this.setupListeners();
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));

    this.logTelemetry('SYSTEM', 'ArChess 32-Piece Physics Engine initialized. Board Mode: 3D Isometric.');
    this.logTelemetry('TURN_START', `Turn active: ${this.currentTurn.toUpperCase()} army ready.`);
  }

  initCanvasSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height || rect.width || 600;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    if (this.ctx.resetTransform) {
      this.ctx.resetTransform();
    } else {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.scale(this.dpr, this.dpr);
  }

  getBoardLayout() {
    const minDim = Math.min(this.width, this.height);
    const boardSize = Math.max(300, minDim - 36);
    const originX = (this.width - boardSize) / 2;
    const originY = (this.height - boardSize) / 2;
    const borderSize = Math.max(24, Math.round(boardSize * 0.052));
    const gridOriginX = originX + borderSize;
    const gridOriginY = originY + borderSize;
    const gridSize = boardSize - borderSize * 2;
    const sqSize = gridSize / 8;

    return {
      boardSize,
      originX,
      originY,
      borderSize,
      gridOriginX,
      gridOriginY,
      gridSize,
      sqSize
    };
  }

  getMaterialDiff() {
    const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
    let whiteMat = 0;
    let blackMat = 0;
    this.pieces.forEach(p => {
      if (!p.dead) {
        if (p.team === 'white') whiteMat += (values[p.type] || 0);
        else blackMat += (values[p.type] || 0);
      }
    });
    return whiteMat - blackMat;
  }

  logTelemetry(type, message) {
    if (this.onTelemetry) {
      this.onTelemetry({
        type: type,
        message: message,
        time: new Date().toLocaleTimeString()
      });
    }
  }

  /**
   * Spawns canonical 32 chess pieces on standard 8x8 coordinates
   */
  init32Pieces() {
    this.pieces = [];
    this.capturedPieces = { white: [], black: [] };
    const layout = this.getBoardLayout();
    const sqSize = layout.sqSize;

    const backRankOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    const glyphs = {
      white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };

    const pieceArchetypes = {
      pawn:   { mass: 1.0, speed: 1.1,  bounce: 0.72, hp: 45,  radius: Math.round(sqSize * 0.32) },
      knight: { mass: 1.3, speed: 1.38, bounce: 0.90, hp: 75,  radius: Math.round(sqSize * 0.36) },
      bishop: { mass: 1.0, speed: 1.48, bounce: 0.95, hp: 65,  radius: Math.round(sqSize * 0.35) },
      rook:   { mass: 2.3, speed: 0.92, bounce: 0.55, hp: 95,  radius: Math.round(sqSize * 0.37) },
      queen:  { mass: 1.7, speed: 1.42, bounce: 0.82, hp: 120, radius: Math.round(sqSize * 0.40) },
      king:   { mass: 2.6, speed: 0.78, bounce: 0.65, hp: 160, radius: Math.round(sqSize * 0.42) }
    };

    // Helper to spawn a piece
    const spawnPiece = (team, type, col, row, id) => {
      const arch = pieceArchetypes[type];
      const x = layout.gridOriginX + col * sqSize + sqSize / 2;
      const y = layout.gridOriginY + row * sqSize + sqSize / 2;

      this.pieces.push({
        id: id,
        team: team,
        type: type,
        x: x,
        y: y,
        originX: x,
        originY: y,
        vx: 0,
        vy: 0,
        radius: arch.radius,
        mass: arch.mass,
        bounce: arch.bounce,
        speedMulti: arch.speed,
        glyph: glyphs[team][type],
        hp: arch.hp,
        maxHp: arch.hp,
        dead: false,
        hitFlash: 0
      });
    };

    // Black Army (Rows 0 and 1)
    backRankOrder.forEach((type, col) => {
      spawnPiece('black', type, col, 0, `black_${type}_${col}`);
    });
    for (let col = 0; col < 8; col++) {
      spawnPiece('black', 'pawn', col, 1, `black_pawn_${col}`);
    }

    // White Army (Rows 7 and 6)
    for (let col = 0; col < 8; col++) {
      spawnPiece('white', 'pawn', col, 6, `white_pawn_${col}`);
    }
    backRankOrder.forEach((type, col) => {
      spawnPiece('white', type, col, 7, `white_${type}_${col}`);
    });

    this.updateHUD();
  }

  setRenderMode(mode) {
    this.renderMode = mode;
    this.initCanvasSize();
    this.logTelemetry('MODE_CHANGE', `Renderer set to ${mode.toUpperCase()} view.`);
  }

  setBoardTheme(theme) {
    this.boardTheme = theme;
    this.logTelemetry('THEME_CHANGE', `Board palette updated to ${theme.toUpperCase()}.`);
  }

  setPieceTheme(theme) {
    this.pieceTheme = theme;
    this.logTelemetry('THEME_CHANGE', `Piece style updated to ${theme.toUpperCase()}.`);
  }

  setGameMode(mode) {
    this.gameMode = mode;
    this.logTelemetry('MODE_CHANGE', `Match Mode set to: ${mode === 'bot' ? 'SOLO VS BOT AI' : 'LOCAL PASS & PLAY'}`);
    if (this.currentTurn === 'black' && this.gameMode === 'bot' && !this.isGameOver) {
      this.triggerBotTurn();
    }
  }

  triggerBotTurn() {
    if (this.gameMode !== 'bot' || this.currentTurn !== 'black' || this.isGameOver || this.botThinking) return;

    this.botThinking = true;
    this.logTelemetry('BOT_THINKING', 'ArChess Bot calculating tactical impulse trajectory...');

    clearTimeout(this.botTimeout);
    this.botTimeout = setTimeout(() => {
      this.executeBotTurn();
    }, 850);
  }

  executeBotTurn() {
    this.botThinking = false;
    if (this.currentTurn !== 'black' || this.isGameOver) return;

    const blackPieces = this.pieces.filter(p => !p.dead && p.team === 'black');
    const whitePieces = this.pieces.filter(p => !p.dead && p.team === 'white');

    if (blackPieces.length === 0 || whitePieces.length === 0) return;

    const targetWeights = { king: 200, queen: 100, rook: 65, bishop: 55, knight: 50, pawn: 25 };

    // Select candidate shooters (prioritize offensive backline or nearest)
    const offensiveShooters = blackPieces.filter(p => ['queen', 'knight', 'bishop', 'rook'].includes(p.type));
    const candidateShooters = offensiveShooters.length > 0 ? offensiveShooters : blackPieces;

    let candidatePairs = [];
    candidateShooters.forEach(shooter => {
      whitePieces.forEach(target => {
        const dx = target.x - shooter.x;
        const dy = target.y - shooter.y;
        const d = Math.hypot(dx, dy);
        const score = (targetWeights[target.type] || 25) / (d + 60);
        candidatePairs.push({ shooter, target, d, score, dx, dy });
      });
    });

    candidatePairs.sort((a, b) => b.score - a.score);
    const chosen = candidatePairs[0] || { shooter: blackPieces[0], target: whitePieces[0], dx: 0, dy: 1, d: 100 };
    const shooter = chosen.shooter;
    const target = chosen.target;

    // Launch angle towards target
    const dx = target.x - shooter.x;
    const dy = target.y - shooter.y;
    let aimAngle = Math.atan2(dy, dx);
    aimAngle += (Math.random() - 0.5) * 0.08;

    // Pull distance in opposite direction for slingshot
    const desiredPower = Math.min(1.0, Math.max(0.48, chosen.d / (this.width * 0.7)));
    const pullDist = desiredPower * this.maxPullDistance;
    const pullX = Math.cos(aimAngle) * pullDist;
    const pullY = Math.sin(aimAngle) * pullDist;

    // Show visual aim preview briefly so user sees the bot aiming
    this.selectedPiece = shooter;
    this.keyboardAiming = true;
    this.keyboardAimAngle = aimAngle;
    this.keyboardAimPower = desiredPower;

    setTimeout(() => {
      if (this.currentTurn === 'black' && !this.isGameOver) {
        this.launchPiece(shooter, pullX, pullY, pullDist);
      }
      this.keyboardAiming = false;
      this.selectedPiece = null;
    }, 450);
  }

  handleKingElimination(king) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.winner = king.team === 'white' ? 'black' : 'white';

    this.audio.playVictory();
    this.logTelemetry('VICTORY', `CHECKMATE! ${this.winner.toUpperCase()} ARMY WINS THE MATCH!`);

    const durationSec = Math.max(1, Math.round((Date.now() - this.matchStartTime) / 1000));
    const whiteUser = (window.ArchessAuth && window.ArchessAuth.currentUser) ? window.ArchessAuth.currentUser.username : 'Player1';
    const blackUser = this.gameMode === 'bot' ? 'ArChess Bot' : 'Player2';

    const payload = {
      white_username: whiteUser,
      black_username: blackUser,
      winner: this.winner,
      white_damage: this.whiteDamage,
      black_damage: this.blackDamage,
      turns: this.turns,
      duration_sec: durationSec
    };

    fetch('/api/matches/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
      this.showVictoryModal(this.winner, payload, data.settlement);
    })
    .catch(() => {
      this.showVictoryModal(this.winner, payload, null);
    });

    // Telemetry event
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'MATCH_COMPLETED',
        payload: payload
      })
    }).catch(() => {});
  }

  showVictoryModal(winner, payload, settlement) {
    const modal = document.getElementById('victoryModal');
    if (!modal) return;

    const badge = document.getElementById('victoryBadge');
    const title = document.getElementById('victoryTitle');
    const sub = document.getElementById('victorySub');
    const statTurns = document.getElementById('statTurns');
    const statDuration = document.getElementById('statDuration');
    const statEloChange = document.getElementById('statEloChange');

    const isWhiteWin = winner === 'white';
    if (badge) {
      badge.className = `victory-banner-badge ${isWhiteWin ? 'white-win' : 'black-win'}`;
      badge.textContent = `${winner.toUpperCase()} ARMY VICTORIOUS`;
    }
    if (title) {
      title.textContent = isWhiteWin ? 'CHECKMATE — GLORY TO WHITE' : 'CHECKMATE — BLACK SUPREMACY';
    }
    if (sub) {
      sub.textContent = `The enemy King was shattered in turn ${payload.turns}. Match settled on the Grandmaster ladder.`;
    }
    if (statTurns) statTurns.textContent = payload.turns;
    if (statDuration) statDuration.textContent = `${payload.duration_sec}s`;
    if (statEloChange) {
      if (settlement) {
        const delta = isWhiteWin ? settlement.white_delta : settlement.black_delta;
        statEloChange.textContent = delta >= 0 ? `+${delta} ELO` : `${delta} ELO`;
      } else {
        statEloChange.textContent = isWhiteWin ? '+32 ELO' : '-16 ELO';
      }
    }

    setTimeout(() => {
      modal.classList.add('active');
    }, 1200);
  }

  resetBoard() {
    this.init32Pieces();
    this.capturedPieces = { white: [], black: [] };
    this.particles = [];
    this.damageNumbers = [];
    this.currentTurn = 'white';
    this.selectedPiece = null;
    this.whiteDamage = 0;
    this.blackDamage = 0;
    this.turns = 0;
    this.matchStartTime = Date.now();
    this.isGameOver = false;
    this.winner = null;
    this.simulationSettling = false;
    clearTimeout(this.botTimeout);
    this.botThinking = false;
    this.updateHUD();
    if (this.onResetArena) {
      this.onResetArena();
    }
    this.logTelemetry('RESET', 'Board reset to standard 32-piece tournament arrangement.');
  }

  /* -------------------------------------------------------------
     Coordinate Mapping (2D vs 3D Isometric Projection)
  ------------------------------------------------------------- */
  toScreen(x, y, elevation = 0) {
    if (this.renderMode === '2d') {
      return { x: x, y: y - elevation };
    }

    const layout = this.getBoardLayout();
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    const nx = (x - centerX) / (layout.boardSize / 2);
    const ny = (y - centerY) / (layout.boardSize / 2);

    const pitch = 0.68;
    const scale = 0.86;
    const depth = 1 + ny * 0.18;

    const sx = centerX + nx * (layout.boardSize / 2) * scale * depth;
    const sy = centerY + ny * (layout.boardSize / 2) * scale * pitch + 16 - elevation * depth;

    return { x: sx, y: sy };
  }

  fromScreen(sx, sy) {
    if (this.renderMode === '2d') {
      return { x: sx, y: sy };
    }

    const layout = this.getBoardLayout();
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const pitch = 0.68;
    const scale = 0.86;

    const ny = (sy - 16 - centerY) / ((layout.boardSize / 2) * scale * pitch);
    const depth = 1 + ny * 0.18;
    const nx = (sx - centerX) / ((layout.boardSize / 2) * scale * (depth || 1));

    const bx = centerX + nx * (layout.boardSize / 2);
    const by = centerY + ny * (layout.boardSize / 2);
    return { x: bx, y: by };
  }

  /* -------------------------------------------------------------
     User Interaction Listeners (Mouse, Touch, Keyboard)
  ------------------------------------------------------------- */
  setupListeners() {
    window.addEventListener('resize', () => {
      this.initCanvasSize();
    });

    const getPointerScreenPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
      const scaleX = this.width / (rect.width || 1);
      const scaleY = this.height / (rect.height || 1);
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const handlePointerDown = (e) => {
      if (this.isGameOver) return;
      if (this.gameMode === 'bot' && this.currentTurn === 'black') return;
      this.audio.init();

      const screenPos = getPointerScreenPos(e);

      // Check if clicking an eligible piece on current turn (hit-tested in visible screen space)
      const eligiblePieces = this.pieces.filter(p => !p.dead && p.team === this.currentTurn);
      let target = null;
      let bestDist = Infinity;

      for (const p of eligiblePieces) {
        const pElevation = (this.renderMode === '3d') ? 14 : 0;
        const pScreen = this.toScreen(p.x, p.y, pElevation);
        const hitCenterY = this.renderMode === '3d' ? (pScreen.y - p.radius * 0.3) : pScreen.y;
        const dist = Math.hypot(screenPos.x - pScreen.x, screenPos.y - hitCenterY);
        const hitRadius = p.radius * (this.renderMode === '3d' ? 1.85 : 1.5);

        if (dist <= hitRadius && dist < bestDist) {
          bestDist = dist;
          target = p;
        }
      }

      if (target) {
        this.selectedPiece = target;
        this.isDragging = true;
        const pElevation = (this.renderMode === '3d') ? 26 : 0;
        const pScreen = this.toScreen(target.x, target.y, pElevation);
        this.dragScreenAnchor = { x: pScreen.x, y: pScreen.y };
        this.dragScreenCurrent = { x: screenPos.x, y: screenPos.y };
        this.dragStart = { x: target.x, y: target.y };
        this.dragCurrent = { x: target.x, y: target.y };
        this.logTelemetry('PIECE_SELECTED', `Selected ${target.team.toUpperCase()} ${target.type.toUpperCase()} at [${Math.round(target.x)}, ${Math.round(target.y)}]`);
        if (e.cancelable) e.preventDefault();
      }
    };

    const handlePointerMove = (e) => {
      if (this.isDragging && this.selectedPiece) {
        const screenPos = getPointerScreenPos(e);
        this.dragScreenCurrent = screenPos;
        if (e.cancelable) e.preventDefault();
      }
    };

    const handlePointerUp = () => {
      if (!this.isDragging || !this.selectedPiece) return;
      this.isDragging = false;

      const pullScreenX = this.dragScreenAnchor.x - this.dragScreenCurrent.x;
      const pullScreenY = this.dragScreenAnchor.y - this.dragScreenCurrent.y;
      const screenDist = Math.hypot(pullScreenX, pullScreenY);

      if (screenDist > 14) {
        const clampedDist = Math.min(screenDist, this.maxPullDistance);
        if (this.renderMode === '2d') {
          this.launchPiece(this.selectedPiece, pullScreenX, pullScreenY, clampedDist);
        } else {
          // In 3D: Convert screen pull vector into board space isotropically
          const layout = this.getBoardLayout();
          const centerY = this.height / 2;
          const ny = (this.selectedPiece.y - centerY) / (layout.boardSize / 2);
          const depth = 1 + ny * 0.20;
          const pitch = 0.58;
          const scale = 0.86;

          const pullBoardX = (pullScreenX / screenDist) / (scale * depth) * clampedDist;
          const pullBoardY = (pullScreenY / screenDist) / (scale * pitch) * clampedDist;
          this.launchPiece(this.selectedPiece, pullBoardX, pullBoardY, clampedDist);
        }
      }
      this.selectedPiece = null;
    };

    this.canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    // Keyboard Gameplay Listeners (Tracker Parity)
    window.addEventListener('keydown', (e) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter', 'Escape'].includes(e.code)) {
        this.handleKeyboardControl(e);
      }
    });
  }

  handleKeyboardControl(e) {
    if (this.isGameOver) return;
    if (this.gameMode === 'bot' && this.currentTurn === 'black') return;
    const livingActivePieces = this.pieces.filter(p => !p.dead && p.team === this.currentTurn);
    if (livingActivePieces.length === 0) return;

    if (e.code === 'Tab') {
      e.preventDefault();
      this.keyboardTargetIndex = (this.keyboardTargetIndex + (e.shiftKey ? -1 : 1) + livingActivePieces.length) % livingActivePieces.length;
      this.selectedPiece = livingActivePieces[this.keyboardTargetIndex];
      this.keyboardAiming = true;
      this.logTelemetry('KBD_FOCUS', `Focused [${this.selectedPiece.type.toUpperCase()}] via keyboard`);
    } else if (this.keyboardAiming && this.selectedPiece) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.keyboardAimAngle -= 0.08;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keyboardAimAngle += 0.08;
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.keyboardAimPower = Math.min(1.0, this.keyboardAimPower + 0.08);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.keyboardAimPower = Math.max(0.15, this.keyboardAimPower - 0.08);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const dist = this.keyboardAimPower * this.maxPullDistance;
        const pullX = Math.cos(this.keyboardAimAngle) * dist;
        const pullY = Math.sin(this.keyboardAimAngle) * dist;
        this.launchPiece(this.selectedPiece, pullX, pullY, dist);
        this.keyboardAiming = false;
        this.selectedPiece = null;
      } else if (e.code === 'Escape') {
        this.keyboardAiming = false;
        this.selectedPiece = null;
      }
    }
  }

  launchPiece(piece, pullX, pullY, pullDist) {
    const clampedDist = Math.min(pullDist, this.maxPullDistance);
    const powerRatio = clampedDist / this.maxPullDistance;
    const impulse = clampedDist * 0.25 * piece.speedMulti;
    const angle = Math.atan2(pullY, pullX);

    piece.vx = Math.cos(angle) * impulse;
    piece.vy = Math.sin(angle) * impulse;
    piece.inMotion = true;

    this.audio.playLaunch(powerRatio);
    this.spawnLaunchSparks(piece.x, piece.y, angle);

    this.logTelemetry('LAUNCH', `Piece: ${piece.team.toUpperCase()}_${piece.type.toUpperCase()} | Power: ${Math.round(powerRatio * 100)}% | Angle: ${(angle * 180 / Math.PI).toFixed(1)}°`);
  }

  spawnLaunchSparks(x, y, angle) {
    for (let i = 0; i < 24; i++) {
      const spread = (Math.random() - 0.5) * 1.3;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: -Math.cos(angle + spread) * speed,
        vy: -Math.sin(angle + spread) * speed,
        radius: Math.random() * 3 + 1,
        color: '#ffd700',
        alpha: 1,
        life: 0.55
      });
    }
  }

  spawnImpactParticles(x, y, count = 20, isCritical = false) {
    const colors = isCritical 
      ? ['#ff3344', '#ffaa00', '#ffffff', '#ffd700'] 
      : ['#ffd700', '#f5df88', '#ff9900', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pSpeed = Math.random() * (isCritical ? 9 : 6) + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        radius: Math.random() * 3.5 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: Math.random() * 0.45 + 0.3
      });
    }
  }

  addDamageNumber(x, y, amount, isCritical = false) {
    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y - 18,
      text: isCritical ? `CRIT -${amount}!` : `-${amount}`,
      color: isCritical ? '#ff3b4e' : '#ffd700',
      size: isCritical ? 22 : 16,
      alpha: 1,
      vy: -1.6
    });
  }

  /* -------------------------------------------------------------
     Physics Update & Collision Solver
  ------------------------------------------------------------- */
  updatePhysics(dt) {
    const layout = this.getBoardLayout();
    const minX = layout.gridOriginX;
    const maxX = layout.gridOriginX + layout.gridSize;
    const minY = layout.gridOriginY;
    const maxY = layout.gridOriginY + layout.gridSize;
    let anyInMotion = false;

    // Movement & Wall bouncing
    this.pieces.forEach((p) => {
      if (p.dead) return;

      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 0.15) {
        anyInMotion = true;
        p.x += p.vx;
        p.y += p.vy;

        p.vx *= this.friction;
        p.vy *= this.friction;

        // Particle trail
        if (speed > 3 && Math.random() < 0.4) {
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            color: p.team === 'white' ? '#ffd700' : '#ff4655',
            alpha: 0.5,
            life: 0.35
          });
        }

        // Arena Wall Collisions (with Bishop Prism Surge)
        const isBishop = p.type === 'bishop';
        const bounceCoeff = isBishop ? Math.min(1.15, p.bounce * 1.15) : p.bounce;

        if (p.x - p.radius < minX) {
          p.x = minX + p.radius;
          p.vx = -p.vx * bounceCoeff;
          if (isBishop) {
            this.spawnImpactParticles(p.x, p.y, 8, false);
            this.logTelemetry('PRISM_SURGE', 'Bishop gained +15% Prism Surge on wall reflection!');
          }
          this.audio.playBounce();
        } else if (p.x + p.radius > maxX) {
          p.x = maxX - p.radius;
          p.vx = -p.vx * bounceCoeff;
          if (isBishop) {
            this.spawnImpactParticles(p.x, p.y, 8, false);
            this.logTelemetry('PRISM_SURGE', 'Bishop gained +15% Prism Surge on wall reflection!');
          }
          this.audio.playBounce();
        }

        if (p.y - p.radius < minY) {
          p.y = minY + p.radius;
          p.vy = -p.vy * bounceCoeff;
          if (isBishop) {
            this.spawnImpactParticles(p.x, p.y, 8, false);
            this.logTelemetry('PRISM_SURGE', 'Bishop gained +15% Prism Surge on wall reflection!');
          }
          this.audio.playBounce();
        } else if (p.y + p.radius > maxY) {
          p.y = maxY - p.radius;
          p.vy = -p.vy * bounceCoeff;
          if (isBishop) {
            this.spawnImpactParticles(p.x, p.y, 8, false);
            this.logTelemetry('PRISM_SURGE', 'Bishop gained +15% Prism Surge on wall reflection!');
          }
          this.audio.playBounce();
        }
      } else {
        p.vx = 0;
        p.vy = 0;
      }

      if (p.hitFlash > 0) p.hitFlash -= dt * 3;
    });

    // Pairwise Piece-to-Piece Collisions
    for (let i = 0; i < this.pieces.length; i++) {
      for (let j = i + 1; j < this.pieces.length; j++) {
        const p1 = this.pieces[i];
        const p2 = this.pieces[j];
        if (p1.dead || p2.dead) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Separation
          p1.x -= nx * overlap * 0.5;
          p1.y -= ny * overlap * 0.5;
          p2.x += nx * overlap * 0.5;
          p2.y += ny * overlap * 0.5;

          // Impulse transfer
          const rvx = p2.vx - p1.vx;
          const rvy = p2.vy - p1.vy;
          const velAlongNormal = rvx * nx + rvy * ny;

          if (velAlongNormal < 0) {
            const restitution = Math.min(p1.bounce, p2.bounce);
            const impulseScalar = -(1 + restitution) * velAlongNormal / (1 / p1.mass + 1 / p2.mass);

            p1.vx -= (impulseScalar / p1.mass) * nx;
            p1.vy -= (impulseScalar / p1.mass) * ny;
            p2.vx += (impulseScalar / p2.mass) * nx;
            p2.vy += (impulseScalar / p2.mass) * ny;

            const relativeSpeed = Math.hypot(rvx, rvy);
            if (relativeSpeed > 1.2) {
              // Damage opposing team
              if (p1.team !== p2.team) {
                // Rook Siege Breaker: 2.5x damage against lighter pieces
                let damageMulti = 1.0;
                if (p1.type === 'rook' && p2.mass < p1.mass) {
                  damageMulti = 2.5;
                  p1.vx *= 0.15;
                  p1.vy *= 0.15;
                } else if (p2.type === 'rook' && p1.mass < p2.mass) {
                  damageMulti = 2.5;
                  p2.vx *= 0.15;
                  p2.vy *= 0.15;
                }

                let damage = Math.round(relativeSpeed * 2.8 * Math.max(p1.mass, p2.mass) * damageMulti);

                // Queen Supernova Discharge on high velocity
                if ((p1.type === 'queen' || p2.type === 'queen') && relativeSpeed > 6.5) {
                  damage += 35;
                  this.screenShake = 12;
                  this.spawnImpactParticles((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 35, true);
                  this.logTelemetry('SUPERNOVA', 'Queen discharged Supernova blast on high-velocity strike!');
                }

                // King Bastion Aura: friendly pawns near King take 35% less damage
                [p1, p2].forEach(p => {
                  if (p.type === 'pawn') {
                    const friendlyKing = this.pieces.find(k => !k.dead && k.team === p.team && k.type === 'king');
                    if (friendlyKing && Math.hypot(friendlyKing.x - p.x, friendlyKing.y - p.y) < 85) {
                      damage = Math.round(damage * 0.65);
                      this.logTelemetry('BASTION_AURA', `${p.team.toUpperCase()} Pawn protected by King's Bastion Aura (-35% dmg)!`);
                    }
                  }
                });

                // Knight Shockwave
                if (p1.type === 'knight' || p2.type === 'knight') {
                  const knight = p1.type === 'knight' ? p1 : p2;
                  const other = p1.type === 'knight' ? p2 : p1;
                  const cx = (p1.x + p2.x) / 2;
                  const cy = (p1.y + p2.y) / 2;
                  let knockbackCount = 0;

                  this.pieces.forEach(target => {
                    if (!target.dead && target.team === other.team && target !== other) {
                      const tdx = target.x - cx;
                      const tdy = target.y - cy;
                      const dist = Math.hypot(tdx, tdy);
                      if (dist < 95 && dist > 1) {
                        const impulse = ((95 - dist) / 95) * 4.5;
                        target.vx += (tdx / dist) * impulse;
                        target.vy += (tdy / dist) * impulse;
                        knockbackCount++;
                      }
                    }
                  });

                  if (knockbackCount > 0) {
                    this.logTelemetry('SHOCKWAVE', `Knight triggered Shockwave! Knocks back ${knockbackCount} enemy units.`);
                    this.spawnImpactParticles(cx, cy, 18, false);
                  }
                }

                const isCritical = relativeSpeed > 8.5 || damageMulti > 1.5;
                p1.hp -= damage;
                p2.hp -= damage;
                p1.hitFlash = 1;
                p2.hitFlash = 1;

                if (p1.team === 'white') this.whiteDamage += damage;
                else this.blackDamage += damage;

                this.addDamageNumber(p2.x, p2.y, damage, isCritical);
                this.screenShake = isCritical ? 8 : 4;
                this.totalImpacts++;
                this.audio.playImpact(relativeSpeed / 8);

                this.logTelemetry('COLLISION', `${p1.team}_${p1.type} <-> ${p2.team}_${p2.type} | Dmg: -${damage} HP | Speed: ${relativeSpeed.toFixed(1)}`);

                // Death checks
                [p1, p2].forEach(p => {
                  if (p.hp <= 0 && !p.dead) {
                    p.dead = true;
                    p.hp = 0;
                    this.spawnImpactParticles(p.x, p.y, 35, true);
                    this.audio.playShatter();
                    if (!this.capturedPieces) this.capturedPieces = { white: [], black: [] };
                    this.capturedPieces[p.team].push(p.type);
                    if (this.onPieceCaptured) {
                      this.onPieceCaptured(p.team, p.type, this.getMaterialDiff());
                    }
                    this.logTelemetry('ELIMINATION', `[!] ${p.team.toUpperCase()} ${p.type.toUpperCase()} shattered and removed from board.`);
                    if (p.type === 'king') {
                      this.handleKingElimination(p);
                    }
                  }
                });
              }
            }
          }
        }
      }
    }

    // Settlement & Turn Transition
    if (this.simulationSettling && !anyInMotion) {
      this.simulationSettling = false;
      this.turns++;
      this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
      this.updateHUD();
      this.logTelemetry('SETTLEMENT', `Board settled at rest. Turn ${this.turns}: passed to ${this.currentTurn.toUpperCase()}.`);

      if (!this.isGameOver && this.currentTurn === 'black' && this.gameMode === 'bot') {
        this.triggerBotTurn();
      }
    } else if (anyInMotion) {
      this.simulationSettling = true;
    }

    // Particles & Damage text updates
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= dt / p.life;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.y += dn.vy;
      dn.alpha -= dt * 0.9;
      if (dn.alpha <= 0) this.damageNumbers.splice(i, 1);
    }

    if (this.screenShake > 0) {
      this.screenShake -= dt * 25;
      if (this.screenShake < 0) this.screenShake = 0;
    }
  }

  updateHUD() {
    const turnLabel = document.getElementById('arenaTurnLabel');
    const turnCircle = document.getElementById('arenaTurnCircle');
    if (turnLabel) {
      turnLabel.textContent = `${this.currentTurn.toUpperCase()}'S TURN — AIM & LAUNCH`;
    }
    if (turnCircle) {
      turnCircle.className = `turn-circle ${this.currentTurn === 'black' ? 'black-turn' : ''}`;
    }

    const whiteAlive = this.pieces.filter(p => !p.dead && p.team === 'white').length;
    const blackAlive = this.pieces.filter(p => !p.dead && p.team === 'black').length;

    const statsElem = document.getElementById('arenaPieceCounts');
    if (statsElem) {
      statsElem.innerHTML = `White: <strong>${whiteAlive}</strong> | Black: <strong>${blackAlive}</strong>`;
    }
  }

  /* -------------------------------------------------------------
     Rendering (Board, Squares, Staunton Vector Pieces, 3D Slab)
  ------------------------------------------------------------- */
  renderBoard() {
    const ctx = this.ctx;
    const layout = this.getBoardLayout();
    const { boardSize, originX, originY, borderSize, gridOriginX, gridOriginY, gridSize, sqSize } = layout;

    // Theme Palettes (Unified with React Chessboard theme)
    const palettes = {
      midnight: {
        darkSq: '#1e2632',
        lightSq: '#364353',
        borderBg: '#0f141c',
        borderColor: '#d4af37',
        inlayColor: 'rgba(212, 175, 55, 0.35)',
        gridLine: 'rgba(212, 175, 55, 0.10)',
        coordText: '#f5e29f',
        slabSide: '#080c14'
      },
      woodland: {
        darkSq: '#8b5a2b',
        lightSq: '#e0c9a6',
        borderBg: '#3d2514',
        borderColor: '#c68a4c',
        inlayColor: 'rgba(218, 165, 32, 0.40)',
        gridLine: 'rgba(0, 0, 0, 0.15)',
        coordText: '#f5dfb8',
        slabSide: '#201209'
      },
      ivory: {
        darkSq: '#4f5d75',
        lightSq: '#e8edf3',
        borderBg: '#1e2229',
        borderColor: '#98a6bd',
        inlayColor: 'rgba(200, 210, 225, 0.35)',
        gridLine: 'rgba(0, 0, 0, 0.12)',
        coordText: '#d8dee9',
        slabSide: '#11141a'
      }
    };
    const pal = palettes[this.boardTheme] || palettes.midnight;

    // 1. Stage background clear
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. In 3D mode: Draw Physical 3D Extruded Board Slab (thickness & bevels)
    if (this.renderMode === '3d') {
      const slabDepth = 20;
      // Bottom 4 corners of slab
      const b1 = this.toScreen(originX, originY, -slabDepth);
      const b2 = this.toScreen(originX + boardSize, originY, -slabDepth);
      const b3 = this.toScreen(originX + boardSize, originY + boardSize, -slabDepth);
      const b4 = this.toScreen(originX, originY + boardSize, -slabDepth);

      // Top 4 corners of slab
      const t1 = this.toScreen(originX, originY, 0);
      const t2 = this.toScreen(originX + boardSize, originY, 0);
      const t3 = this.toScreen(originX + boardSize, originY + boardSize, 0);
      const t4 = this.toScreen(originX, originY + boardSize, 0);

      // Deep ground contact shadow underneath slab
      ctx.beginPath();
      ctx.moveTo(b1.x - 14, b1.y + 8);
      ctx.lineTo(b2.x + 14, b2.y + 8);
      ctx.lineTo(b3.x + 20, b3.y + 12);
      ctx.lineTo(b4.x - 20, b4.y + 12);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fill();

      // Left Bevel Face (t1 -> t4 -> b4 -> b1)
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t4.x, t4.y);
      ctx.lineTo(b4.x, b4.y);
      ctx.lineTo(b1.x, b1.y);
      ctx.closePath();
      const leftGrad = ctx.createLinearGradient(t1.x, 0, t4.x, 0);
      leftGrad.addColorStop(0, pal.slabSide);
      leftGrad.addColorStop(1, pal.borderBg);
      ctx.fillStyle = leftGrad;
      ctx.fill();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Right Bevel Face (t2 -> t3 -> b3 -> b2)
      ctx.beginPath();
      ctx.moveTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(b3.x, b3.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.closePath();
      const rightGrad = ctx.createLinearGradient(t2.x, 0, t3.x, 0);
      rightGrad.addColorStop(0, pal.slabSide);
      rightGrad.addColorStop(1, pal.borderBg);
      ctx.fillStyle = rightGrad;
      ctx.fill();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Front Bevel Face (t4 -> t3 -> b3 -> b4)
      ctx.beginPath();
      ctx.moveTo(t4.x, t4.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(b3.x, b3.y);
      ctx.lineTo(b4.x, b4.y);
      ctx.closePath();
      const frontGrad = ctx.createLinearGradient(0, t4.y, 0, b4.y);
      frontGrad.addColorStop(0, pal.borderBg);
      frontGrad.addColorStop(1, pal.slabSide);
      ctx.fillStyle = frontGrad;
      ctx.fill();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // 3. Outer Frame (Wood/Obsidian Bevel)
    if (this.renderMode === '2d') {
      // Outer shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 25;
      ctx.fillStyle = pal.borderBg;
      ctx.fillRect(originX, originY, boardSize, boardSize);
      ctx.shadowBlur = 0;

      // Outer bezel stroke
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(originX, originY, boardSize, boardSize);

      // Inlay stringing
      ctx.strokeStyle = pal.inlayColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(originX + 5, originY + 5, boardSize - 10, boardSize - 10);
      ctx.strokeRect(gridOriginX - 3, gridOriginY - 3, gridSize + 6, gridSize + 6);
    } else {
      // 3D Top Frame Quad
      const t1 = this.toScreen(originX, originY);
      const t2 = this.toScreen(originX + boardSize, originY);
      const t3 = this.toScreen(originX + boardSize, originY + boardSize);
      const t4 = this.toScreen(originX, originY + boardSize);

      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(t4.x, t4.y);
      ctx.closePath();
      ctx.fillStyle = pal.borderBg;
      ctx.fill();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 4. 8x8 Board Squares
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isDark = (r + c) % 2 === 1;
        const color = isDark ? pal.darkSq : pal.lightSq;
        const sqX = gridOriginX + c * sqSize;
        const sqY = gridOriginY + r * sqSize;

        if (this.renderMode === '2d') {
          ctx.fillStyle = color;
          ctx.fillRect(sqX, sqY, sqSize, sqSize);
          ctx.strokeStyle = pal.gridLine;
          ctx.lineWidth = 0.8;
          ctx.strokeRect(sqX, sqY, sqSize, sqSize);
        } else {
          // 3D Quad Projection
          const p1 = this.toScreen(sqX, sqY);
          const p2 = this.toScreen(sqX + sqSize, sqY);
          const p3 = this.toScreen(sqX + sqSize, sqY + sqSize);
          const p4 = this.toScreen(sqX, sqY + sqSize);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = pal.gridLine;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // 5. Cushion Perimeter Border
    if (this.renderMode === '2d') {
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 2.2;
      ctx.strokeRect(gridOriginX, gridOriginY, gridSize, gridSize);
    } else {
      const g1 = this.toScreen(gridOriginX, gridOriginY);
      const g2 = this.toScreen(gridOriginX + gridSize, gridOriginY);
      const g3 = this.toScreen(gridOriginX + gridSize, gridOriginY + gridSize);
      const g4 = this.toScreen(gridOriginX, gridOriginY + gridSize);

      ctx.beginPath();
      ctx.moveTo(g1.x, g1.y);
      ctx.lineTo(g2.x, g2.y);
      ctx.lineTo(g3.x, g3.y);
      ctx.lineTo(g4.x, g4.y);
      ctx.closePath();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // 6. Alphanumeric Rank & File Coordinates (Standard Bottom a-h and Left 1-8 only)
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const coordFontSize = Math.max(10, Math.round(sqSize * (this.renderMode === '3d' ? 0.20 : 0.22)));
    ctx.font = `700 ${coordFontSize}px Outfit, sans-serif`;
    ctx.fillStyle = pal.coordText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const borderOffset = borderSize * 0.44;

    // File labels (standard bottom border only)
    for (let c = 0; c < 8; c++) {
      const fx = gridOriginX + c * sqSize + sqSize / 2;
      const btmPos = this.toScreen(fx, originY + boardSize - borderOffset);
      ctx.fillText(files[c], btmPos.x, btmPos.y);
    }

    // Rank labels (standard left border only)
    for (let r = 0; r < 8; r++) {
      const fy = gridOriginY + r * sqSize + sqSize / 2;
      const leftPos = this.toScreen(originX + borderOffset, fy);
      ctx.fillText(ranks[r], leftPos.x, leftPos.y);
    }
  }

  renderTrajectory() {
    const sourcePiece = this.selectedPiece;
    if (!sourcePiece) return;

    let dirScreenX = 0;
    let dirScreenY = 0;
    let powerRatio = 0;
    let active = false;

    if (this.isDragging) {
      const pullScreenX = this.dragScreenAnchor.x - this.dragScreenCurrent.x;
      const pullScreenY = this.dragScreenAnchor.y - this.dragScreenCurrent.y;
      const screenDist = Math.hypot(pullScreenX, pullScreenY);
      if (screenDist >= 10) {
        active = true;
        const clampedDist = Math.min(screenDist, this.maxPullDistance);
        powerRatio = clampedDist / this.maxPullDistance;
        dirScreenX = pullScreenX / screenDist;
        dirScreenY = pullScreenY / screenDist;
      }
    } else if (this.keyboardAiming) {
      active = true;
      powerRatio = this.keyboardAimPower;
      const boardDirX = Math.cos(this.keyboardAimAngle);
      const boardDirY = Math.sin(this.keyboardAimAngle);
      if (this.renderMode === '2d') {
        dirScreenX = boardDirX;
        dirScreenY = boardDirY;
      } else {
        const layout = this.getBoardLayout();
        const centerY = this.height / 2;
        const ny = (sourcePiece.y - centerY) / (layout.boardSize / 2);
        const depth = 1 + ny * 0.18;
        const pitch = 0.68;
        const scale = 0.86;
        const sx = boardDirX * scale * depth;
        const sy = boardDirY * scale * pitch;
        const sHypot = Math.hypot(sx, sy) || 1;
        dirScreenX = sx / sHypot;
        dirScreenY = sy / sHypot;
      }
    }

    if (!active) return;

    const ctx = this.ctx;
    ctx.save();

    const elevation = this.renderMode === '3d' ? (this.isDragging ? 26 : 14) : 0;
    const start = this.toScreen(sourcePiece.x, sourcePiece.y, elevation);
    const aimLen = 120 + powerRatio * 170;
    const end = {
      x: start.x + dirScreenX * aimLen,
      y: start.y + dirScreenY * aimLen
    };

    const isMaxPower = powerRatio > 0.85;
    const themeColor = isMaxPower ? '#ff3b4e' : '#ffd700';

    // 1. Dotted Aim Vector
    ctx.beginPath();
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = themeColor;
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 10;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 2. Trajectory Arrowhead
    const arrowAngle = Math.atan2(dirScreenY, dirScreenX);
    const arrowLen = 14;
    ctx.beginPath();
    ctx.fillStyle = themeColor;
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - arrowLen * Math.cos(arrowAngle - Math.PI / 6),
      end.y - arrowLen * Math.sin(arrowAngle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - arrowLen * Math.cos(arrowAngle + Math.PI / 6),
      end.y - arrowLen * Math.sin(arrowAngle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // 3. Power Reticle around piece
    const layout = this.getBoardLayout();
    const centerY = this.height / 2;
    const ny = (sourcePiece.y - centerY) / (layout.boardSize / 2);
    const depth = this.renderMode === '3d' ? (1 + ny * 0.18) : 1;
    const pitch = this.renderMode === '3d' ? 0.68 : 1;

    ctx.beginPath();
    const ringRadius = (sourcePiece.radius + 12) * depth;
    ctx.ellipse(start.x, start.y, ringRadius, ringRadius * pitch, 0, 0, Math.PI * 2 * powerRatio);
    ctx.strokeStyle = isMaxPower ? '#ff3b4e' : '#f5df88';
    ctx.lineWidth = 3;
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /* -------------------------------------------------------------
     Authentic Staunton Vector Piece Renderer
  ------------------------------------------------------------- */
  drawStauntonPiece(ctx, type, team, radius, theme) {
    const isWhite = team === 'white';
    const R = radius;

    let bodyGrad, strokeColor, detailColor, highlightColor;

    if (theme === 'classic') {
      if (isWhite) {
        // Luxury warm ivory & polished gold
        bodyGrad = ctx.createLinearGradient(-R * 0.4, -R, R * 0.4, R);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.35, '#faf6ea');
        bodyGrad.addColorStop(0.75, '#edd9a3');
        bodyGrad.addColorStop(1, '#bfa048');

        strokeColor = '#5c4815';
        detailColor = 'rgba(92, 72, 21, 0.45)';
        highlightColor = 'rgba(255, 255, 255, 0.75)';
      } else {
        // Polished obsidian onyx & anthracite with crimson rim
        bodyGrad = ctx.createLinearGradient(-R * 0.4, -R, R * 0.4, R);
        bodyGrad.addColorStop(0, '#363e52');
        bodyGrad.addColorStop(0.35, '#1e2330');
        bodyGrad.addColorStop(0.8, '#10131c');
        bodyGrad.addColorStop(1, '#07090e');

        strokeColor = '#ff4757';
        detailColor = 'rgba(255, 71, 87, 0.55)';
        highlightColor = 'rgba(255, 255, 255, 0.4)';
      }
    } else if (theme === 'outline') {
      const neonColor = isWhite ? '#ffd700' : '#ff4655';
      bodyGrad = isWhite ? 'rgba(255, 215, 0, 0.12)' : 'rgba(255, 70, 85, 0.12)';
      strokeColor = neonColor;
      detailColor = neonColor;
      highlightColor = 'transparent';
      ctx.shadowColor = neonColor;
      ctx.shadowBlur = 8;
    } else { // mono
      bodyGrad = isWhite ? '#ffffff' : '#10131c';
      strokeColor = isWhite ? '#080a10' : '#ffffff';
      detailColor = strokeColor;
      highlightColor = 'transparent';
    }

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(1.5, R * 0.08);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1. Multi-Tiered Pedestal Base
    ctx.beginPath();
    ctx.ellipse(0, R * 0.54, R * 0.70, R * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, R * 0.40, R * 0.54, R * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Specific Piece Body Geometry
    switch (type) {
      case 'pawn': {
        // Tapered body
        ctx.beginPath();
        ctx.moveTo(-R * 0.42, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.14, R * 0.10, -R * 0.20, -R * 0.10);
        ctx.lineTo(R * 0.20, -R * 0.10);
        ctx.quadraticCurveTo(R * 0.14, R * 0.10, R * 0.42, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Neck collar ring
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.10, R * 0.26, R * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spherical head
        ctx.beginPath();
        ctx.arc(0, -R * 0.46, R * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Specular gleam on head
        if (theme === 'classic') {
          ctx.beginPath();
          ctx.ellipse(-R * 0.10, -R * 0.56, R * 0.12, R * 0.07, -0.4, 0, Math.PI * 2);
          ctx.fillStyle = highlightColor;
          ctx.fill();
        }
        break;
      }

      case 'rook': {
        // Fortified tower body
        ctx.beginPath();
        ctx.moveTo(-R * 0.46, R * 0.40);
        ctx.lineTo(-R * 0.34, -R * 0.22);
        ctx.lineTo(R * 0.34, -R * 0.22);
        ctx.lineTo(R * 0.46, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cornice ledge
        ctx.beginPath();
        ctx.rect(-R * 0.44, -R * 0.30, R * 0.88, R * 0.08);
        ctx.fill();
        ctx.stroke();

        // Crenellated battlements (4 merlons, 3 embrasures)
        ctx.beginPath();
        ctx.moveTo(-R * 0.44, -R * 0.30);
        ctx.lineTo(-R * 0.44, -R * 0.64);
        ctx.lineTo(-R * 0.24, -R * 0.64);
        ctx.lineTo(-R * 0.24, -R * 0.48);
        ctx.lineTo(-R * 0.10, -R * 0.48);
        ctx.lineTo(-R * 0.10, -R * 0.64);
        ctx.lineTo(R * 0.10, -R * 0.64);
        ctx.lineTo(R * 0.10, -R * 0.48);
        ctx.lineTo(R * 0.24, -R * 0.48);
        ctx.lineTo(R * 0.24, -R * 0.64);
        ctx.lineTo(R * 0.44, -R * 0.64);
        ctx.lineTo(R * 0.44, -R * 0.30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tower arrow-slit window
        ctx.beginPath();
        ctx.rect(-R * 0.06, -R * 0.08, R * 0.12, R * 0.26);
        ctx.fillStyle = detailColor;
        ctx.fill();
        break;
      }

      case 'knight': {
        // Sculpted Staunton equine silhouette
        ctx.beginPath();
        ctx.moveTo(-R * 0.42, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.52, R * 0.05, -R * 0.40, -R * 0.30);
        ctx.lineTo(-R * 0.32, -R * 0.66);
        ctx.lineTo(-R * 0.18, -R * 0.48);
        ctx.quadraticCurveTo(-R * 0.02, -R * 0.62, R * 0.22, -R * 0.40);
        ctx.quadraticCurveTo(R * 0.48, -R * 0.22, R * 0.44, -R * 0.06);
        ctx.lineTo(R * 0.26, -R * 0.02);
        ctx.quadraticCurveTo(R * 0.34, R * 0.12, R * 0.14, R * 0.18);
        ctx.quadraticCurveTo(R * 0.04, R * 0.28, R * 0.38, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye detailing
        ctx.beginPath();
        ctx.arc(R * 0.08, -R * 0.30, R * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = detailColor;
        ctx.fill();

        // Mane notch lines
        ctx.beginPath();
        ctx.moveTo(-R * 0.38, -R * 0.18);
        ctx.lineTo(-R * 0.20, -R * 0.14);
        ctx.moveTo(-R * 0.42, 0);
        ctx.lineTo(-R * 0.24, 0.04);
        ctx.strokeStyle = detailColor;
        ctx.stroke();
        break;
      }

      case 'bishop': {
        // Flared body
        ctx.beginPath();
        ctx.moveTo(-R * 0.44, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.14, R * 0.12, -R * 0.22, -R * 0.08);
        ctx.lineTo(R * 0.22, -R * 0.08);
        ctx.quadraticCurveTo(R * 0.14, R * 0.12, R * 0.44, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Neck collar ring
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.08, R * 0.28, R * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mitre cap
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.44, R * 0.30, R * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mitre diagonal cross-cut notch
        ctx.beginPath();
        ctx.moveTo(R * 0.04, -R * 0.58);
        ctx.lineTo(R * 0.26, -R * 0.36);
        ctx.lineWidth = Math.max(1.8, R * 0.09);
        ctx.strokeStyle = detailColor;
        ctx.stroke();

        // Finial orb at apex
        ctx.beginPath();
        ctx.arc(0, -R * 0.82, R * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = isWhite ? '#ffd700' : '#ff4757';
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'queen': {
        // Elegant hourglass gown
        ctx.beginPath();
        ctx.moveTo(-R * 0.46, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.14, R * 0.12, -R * 0.24, -R * 0.10);
        ctx.lineTo(R * 0.24, -R * 0.10);
        ctx.quadraticCurveTo(R * 0.14, R * 0.12, R * 0.46, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Regal waist band
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.10, R * 0.30, R * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 5-Point Sovereign Coronet
        ctx.beginPath();
        ctx.moveTo(-R * 0.40, -R * 0.10);
        ctx.lineTo(-R * 0.46, -R * 0.54);
        ctx.lineTo(-R * 0.24, -R * 0.30);
        ctx.lineTo(-R * 0.16, -R * 0.64);
        ctx.lineTo(0, -R * 0.32);
        ctx.lineTo(0, -R * 0.72);
        ctx.lineTo(0, -R * 0.32);
        ctx.lineTo(R * 0.16, -R * 0.64);
        ctx.lineTo(R * 0.24, -R * 0.30);
        ctx.lineTo(R * 0.46, -R * 0.54);
        ctx.lineTo(R * 0.40, -R * 0.10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jewels on coronet points
        const pearls = [
          [-R * 0.46, -R * 0.54],
          [-R * 0.16, -R * 0.64],
          [0, -R * 0.72],
          [R * 0.16, -R * 0.64],
          [R * 0.46, -R * 0.54]
        ];
        pearls.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, R * 0.065, 0, Math.PI * 2);
          ctx.fillStyle = isWhite ? '#ffd700' : '#ff4757';
          ctx.fill();
          ctx.stroke();
        });
        break;
      }

      case 'king': {
        // Grand stately mantle
        ctx.beginPath();
        ctx.moveTo(-R * 0.50, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.18, R * 0.12, -R * 0.28, -R * 0.10);
        ctx.lineTo(R * 0.28, -R * 0.10);
        ctx.quadraticCurveTo(R * 0.18, R * 0.12, R * 0.50, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Regal collar
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.10, R * 0.34, R * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crown dome
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.38, R * 0.32, R * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crown arch rib lines
        ctx.beginPath();
        ctx.moveTo(-R * 0.22, -R * 0.38);
        ctx.quadraticCurveTo(0, -R * 0.58, R * 0.22, -R * 0.38);
        ctx.strokeStyle = detailColor;
        ctx.stroke();

        // Cross Pattée Finial
        ctx.fillStyle = isWhite ? '#ffd700' : '#ff4757';
        ctx.fillRect(-R * 0.05, -R * 0.88, R * 0.10, R * 0.26);
        ctx.fillRect(-R * 0.15, -R * 0.80, R * 0.30, R * 0.09);
        break;
      }
    }

    ctx.shadowBlur = 0;
  }

  renderPiece(p) {
    if (p.dead) return;
    const ctx = this.ctx;
    const isWhite = p.team === 'white';
    const isSelected = p === this.selectedPiece;

    // 3D elevation height: Lift piece higher when dragged for tactile feedback
    const elevation = this.renderMode === '3d' ? (isSelected && this.isDragging ? 26 : 14) : 0;
    const basePos = this.toScreen(p.x, p.y, 0);
    const screenPos = this.toScreen(p.x, p.y, elevation);

    // Perspective depth scaling in 3D
    const layout = this.getBoardLayout();
    const centerY = this.height / 2;
    const ny = (p.y - centerY) / (layout.boardSize / 2);
    const depthScale = this.renderMode === '3d' ? (1 + ny * 0.18) : 1;

    ctx.save();

    // 3D Cast Shadow on board ground surface
    if (this.renderMode === '3d') {
      ctx.beginPath();
      const shadowRadiusX = p.radius * (isSelected && this.isDragging ? 1.25 : 1.05) * depthScale;
      const shadowRadiusY = p.radius * (isSelected && this.isDragging ? 0.55 : 0.44) * depthScale;
      ctx.ellipse(basePos.x + 1, basePos.y + 3, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = isSelected && this.isDragging ? 'rgba(0, 0, 0, 0.40)' : 'rgba(0, 0, 0, 0.62)';
      ctx.fill();
    } else {
      // 2D subtle ambient contact shadow
      ctx.beginPath();
      ctx.ellipse(screenPos.x, screenPos.y + p.radius * 0.45, p.radius * 0.85, p.radius * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fill();
    }

    ctx.translate(screenPos.x, screenPos.y);
    if (depthScale !== 1) {
      ctx.scale(depthScale, depthScale);
    }

    // Selection Halo (Smooth Golden Pulse)
    if (isSelected) {
      ctx.beginPath();
      ctx.ellipse(0, p.radius * 0.48, p.radius * 1.05, p.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Hit Flash
    if (p.hitFlash > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 60, ${p.hitFlash * 0.5})`;
      ctx.fill();
    }

    // Draw the Master Staunton Vector Silhouette
    this.drawStauntonPiece(ctx, p.type, p.team, p.radius, this.pieceTheme);

    // Mini Health Bar & Numeric Durability Badge (Always shown in Arena mode)
    const barW = p.radius * 1.8;
    const barH = 4;
    const barY = -p.radius * 1.25;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    const hpRatio = Math.max(0, Math.min(1, p.hp / p.maxHp));
    ctx.fillStyle = hpRatio > 0.6 ? '#10b981' : (hpRatio > 0.25 ? '#f59e0b' : '#ff3b4e');
    ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-barW / 2, barY, barW, barH);

    // HP Numeric Pill at top-right of piece
    ctx.save();
    ctx.font = `800 ${Math.max(9, Math.round(p.radius * 0.42))}px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const hpText = `${Math.round(p.hp)}`;
    const textW = ctx.measureText(hpText).width;
    const pillX = p.radius * 0.95;
    const pillY = -p.radius * 1.15;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(pillX - textW - 4, pillY, textW + 4, 11);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(pillX - textW - 4, pillY, textW + 4, 11);
    ctx.fillStyle = hpRatio > 0.6 ? '#6ee7b7' : (hpRatio > 0.25 ? '#fcd34d' : '#fca5a5');
    ctx.fillText(hpText, pillX - 2, pillY + 1);
    ctx.restore();

    ctx.restore();
  }

  renderVFX() {
    const ctx = this.ctx;

    // Particles
    this.particles.forEach((p) => {
      const pos = this.toScreen(p.x, p.y, this.renderMode === '3d' ? 8 : 0);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Floating Damage Text
    this.damageNumbers.forEach((dn) => {
      const pos = this.toScreen(dn.x, dn.y, this.renderMode === '3d' ? 14 : 0);
      ctx.save();
      ctx.font = `800 ${dn.size}px Outfit, sans-serif`;
      ctx.fillStyle = dn.color;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, dn.alpha);
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(dn.text, pos.x, pos.y);
      ctx.restore();
    });
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    this.updatePhysics(dt);
    this.renderBoard();
    this.renderTrajectory();

    // Sort pieces by Y for proper 3D depth layering (dragged piece on top)
    const sortedPieces = [...this.pieces].sort((a, b) => {
      if (a === this.selectedPiece && this.isDragging) return 1;
      if (b === this.selectedPiece && this.isDragging) return -1;
      return a.y - b.y;
    });
    sortedPieces.forEach(p => this.renderPiece(p));

    this.renderVFX();
    this.ctx.restore();

    requestAnimationFrame(this.loop.bind(this));
  }
}

// Global expose
window.ArchessArena = ArchessArena;
