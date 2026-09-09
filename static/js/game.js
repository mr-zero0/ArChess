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
    this.currentTurn = 'white'; // 'white' or 'black'

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
    this.height = rect.height || 600;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
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
    const sqW = (this.width - 80) / 8;
    const sqH = (this.height - 80) / 8;
    const marginX = 40;
    const marginY = 40;

    const backRankOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    const glyphs = {
      white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };

    const pieceArchetypes = {
      pawn:   { mass: 1.0, speed: 1.1, bounce: 0.72, hp: 45,  radius: 17 },
      knight: { mass: 1.3, speed: 1.38, bounce: 0.9, hp: 75,  radius: 20 },
      bishop: { mass: 1.0, speed: 1.48, bounce: 0.95, hp: 65, radius: 19 },
      rook:   { mass: 2.3, speed: 0.92, bounce: 0.55, hp: 95, radius: 22 },
      queen:  { mass: 1.7, speed: 1.42, bounce: 0.82, hp: 120, radius: 24 },
      king:   { mass: 2.6, speed: 0.78, bounce: 0.65, hp: 160, radius: 25 }
    };

    // Helper to spawn a piece
    const spawnPiece = (team, type, col, row, id) => {
      const arch = pieceArchetypes[type];
      const x = marginX + col * sqW + sqW / 2;
      const y = marginY + row * sqH + sqH / 2;

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

  resetBoard() {
    this.init32Pieces();
    this.particles = [];
    this.damageNumbers = [];
    this.currentTurn = 'white';
    this.selectedPiece = null;
    this.whiteDamage = 0;
    this.blackDamage = 0;
    this.updateHUD();
    this.logTelemetry('RESET', 'Board reset to standard 32-piece tournament arrangement.');
  }

  /* -------------------------------------------------------------
     Coordinate Mapping (2D vs 3D Isometric Projection)
  ------------------------------------------------------------- */
  toScreen(x, y, elevation = 0) {
    if (this.renderMode === '2d') {
      return { x: x, y: y - elevation };
    }

    // 3D Isometric perspective transform
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const nx = (x - centerX) / (this.width / 2);
    const ny = (y - centerY) / (this.height / 2);

    const pitch = 0.58; // Vertical perspective compression
    const sx = centerX + nx * (this.width * 0.44);
    const sy = centerY + ny * (this.height * 0.38) * pitch + 25 - elevation;

    return { x: sx, y: sy };
  }

  fromScreen(sx, sy) {
    if (this.renderMode === '2d') {
      return { x: sx, y: sy };
    }

    // Inverse of 3D projection
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const pitch = 0.58;

    const nx = (sx - centerX) / (this.width * 0.44);
    const ny = (sy - centerY - 25) / ((this.height * 0.38) * pitch);

    const bx = centerX + nx * (this.width / 2);
    const by = centerY + ny * (this.height / 2);
    return { x: bx, y: by };
  }

  /* -------------------------------------------------------------
     User Interaction Listeners (Mouse, Touch, Keyboard)
  ------------------------------------------------------------- */
  setupListeners() {
    window.addEventListener('resize', () => {
      this.initCanvasSize();
    });

    const getBoardPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return this.fromScreen(sx, sy);
    };

    const handlePointerDown = (e) => {
      this.audio.init();
      const pos = getBoardPos(e);

      // Check if clicking an eligible piece on current turn
      const eligiblePieces = this.pieces.filter(p => !p.dead && p.team === this.currentTurn);
      let target = null;
      for (const p of eligiblePieces) {
        const dist = Math.hypot(pos.x - p.x, pos.y - p.y);
        if (dist < p.radius * 1.5) {
          target = p;
          break;
        }
      }

      if (target) {
        this.selectedPiece = target;
        this.isDragging = true;
        this.dragStart = { x: target.x, y: target.y };
        this.dragCurrent = { x: pos.x, y: pos.y };
        this.logTelemetry('PIECE_SELECTED', `Selected ${target.team.toUpperCase()} ${target.type.toUpperCase()} at [${Math.round(target.x)}, ${Math.round(target.y)}]`);
        if (e.cancelable) e.preventDefault();
      }
    };

    const handlePointerMove = (e) => {
      const pos = getBoardPos(e);
      if (this.isDragging && this.selectedPiece) {
        this.dragCurrent = pos;
        if (e.cancelable) e.preventDefault();
      }
    };

    const handlePointerUp = () => {
      if (!this.isDragging || !this.selectedPiece) return;
      this.isDragging = false;

      const pullX = this.dragStart.x - this.dragCurrent.x;
      const pullY = this.dragStart.y - this.dragCurrent.y;
      const pullDist = Math.hypot(pullX, pullY);

      if (pullDist > 15) {
        this.launchPiece(this.selectedPiece, pullX, pullY, pullDist);
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
    const margin = 35;
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

        // Arena Wall Collisions
        if (p.x - p.radius < margin) {
          p.x = margin + p.radius;
          p.vx = -p.vx * p.bounce;
          this.audio.playBounce();
        } else if (p.x + p.radius > this.width - margin) {
          p.x = this.width - margin - p.radius;
          p.vx = -p.vx * p.bounce;
          this.audio.playBounce();
        }

        if (p.y - p.radius < margin) {
          p.y = margin + p.radius;
          p.vy = -p.vy * p.bounce;
          this.audio.playBounce();
        } else if (p.y + p.radius > this.height - margin) {
          p.y = this.height - margin - p.radius;
          p.vy = -p.vy * p.bounce;
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
              const isCritical = relativeSpeed > 9;
              const damage = Math.round(relativeSpeed * 2.8 * Math.max(p1.mass, p2.mass));

              // Damage opposing team
              if (p1.team !== p2.team) {
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
                    this.logTelemetry('ELIMINATION', `[!] ${p.team.toUpperCase()} ${p.type.toUpperCase()} shattered and removed from board.`);
                    if (p.type === 'king') {
                      this.audio.playVictory();
                      this.logTelemetry('VICTORY', `CHECKMATE! ${p.team === 'white' ? 'BLACK' : 'WHITE'} WINS THE MATCH!`);
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
      this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
      this.updateHUD();
      this.logTelemetry('SETTLEMENT', `Board settled at rest. Turn passed to ${this.currentTurn.toUpperCase()}.`);
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
     Rendering (Board, Squares, Pieces, 3D Elevation, Trajectory)
  ------------------------------------------------------------- */
  renderBoard() {
    const ctx = this.ctx;
    const margin = 35;
    const boardW = this.width - margin * 2;
    const boardH = this.height - margin * 2;

    // Theme Palettes
    const palettes = {
      midnight: {
        darkSq: 'rgba(15, 19, 29, 0.85)',
        lightSq: 'rgba(28, 35, 52, 0.55)',
        border: 'rgba(212, 175, 55, 0.45)',
        grid: 'rgba(212, 175, 55, 0.08)'
      },
      woodland: {
        darkSq: 'rgba(65, 42, 25, 0.9)',
        lightSq: 'rgba(195, 155, 110, 0.85)',
        border: 'rgba(218, 165, 32, 0.55)',
        grid: 'rgba(0, 0, 0, 0.15)'
      },
      ivory: {
        darkSq: 'rgba(24, 28, 36, 0.92)',
        lightSq: 'rgba(235, 230, 218, 0.9)',
        border: 'rgba(200, 205, 215, 0.5)',
        grid: 'rgba(0, 0, 0, 0.1)'
      }
    };
    const pal = palettes[this.boardTheme] || palettes.midnight;

    // Base background
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, this.width, this.height);

    // 8x8 squares
    const sqW = boardW / 8;
    const sqH = boardH / 8;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isDark = (r + c) % 2 === 1;
        const color = isDark ? pal.darkSq : pal.lightSq;

        if (this.renderMode === '2d') {
          ctx.fillStyle = color;
          ctx.fillRect(margin + c * sqW, margin + r * sqH, sqW, sqH);
          ctx.strokeStyle = pal.grid;
          ctx.lineWidth = 1;
          ctx.strokeRect(margin + c * sqW, margin + r * sqH, sqW, sqH);
        } else {
          // 3D Quad Projection for each square
          const p1 = this.toScreen(margin + c * sqW, margin + r * sqH);
          const p2 = this.toScreen(margin + (c + 1) * sqW, margin + r * sqH);
          const p3 = this.toScreen(margin + (c + 1) * sqW, margin + (r + 1) * sqH);
          const p4 = this.toScreen(margin + c * sqW, margin + (r + 1) * sqH);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();

          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = pal.grid;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Outer Perimeter Cushion Border
    if (this.renderMode === '2d') {
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 3;
      ctx.strokeRect(margin, margin, boardW, boardH);
    } else {
      const b1 = this.toScreen(margin, margin);
      const b2 = this.toScreen(this.width - margin, margin);
      const b3 = this.toScreen(this.width - margin, this.height - margin);
      const b4 = this.toScreen(margin, this.height - margin);

      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(b3.x, b3.y);
      ctx.lineTo(b4.x, b4.y);
      ctx.closePath();
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  renderTrajectory() {
    let sourcePiece = this.selectedPiece;
    let pullX = 0;
    let pullY = 0;
    let dist = 0;

    if (this.isDragging && sourcePiece) {
      pullX = this.dragStart.x - this.dragCurrent.x;
      pullY = this.dragStart.y - this.dragCurrent.y;
      dist = Math.hypot(pullX, pullY);
    } else if (this.keyboardAiming && sourcePiece) {
      dist = this.keyboardAimPower * this.maxPullDistance;
      pullX = Math.cos(this.keyboardAimAngle) * dist;
      pullY = Math.sin(this.keyboardAimAngle) * dist;
    } else {
      return;
    }

    if (dist < 8) return;

    const clampedDist = Math.min(dist, this.maxPullDistance);
    const powerRatio = clampedDist / this.maxPullDistance;
    const angle = Math.atan2(pullY, pullX);
    const aimLen = 140 + powerRatio * 160;

    const start = this.toScreen(sourcePiece.x, sourcePiece.y, this.renderMode === '3d' ? 12 : 0);
    const end = this.toScreen(
      sourcePiece.x + Math.cos(angle) * aimLen,
      sourcePiece.y + Math.sin(angle) * aimLen,
      this.renderMode === '3d' ? 12 : 0
    );

    const ctx = this.ctx;
    ctx.save();

    // Dotted Aim Vector
    ctx.beginPath();
    ctx.setLineDash([5, 7]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = powerRatio > 0.85 ? '#ff3b4e' : '#ffd700';
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Power Ring around piece
    ctx.beginPath();
    ctx.arc(start.x, start.y, sourcePiece.radius + 10, 0, Math.PI * 2 * powerRatio);
    ctx.strokeStyle = powerRatio > 0.85 ? '#ff3b4e' : '#f5df88';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  renderPiece(p) {
    if (p.dead) return;
    const ctx = this.ctx;
    const isWhite = p.team === 'white';
    const isSelected = p === this.selectedPiece;

    // 3D elevation height
    const elevation = this.renderMode === '3d' ? 10 : 0;
    const basePos = this.toScreen(p.x, p.y, 0);
    const screenPos = this.toScreen(p.x, p.y, elevation);

    ctx.save();

    // 3D Cast Shadow on board
    if (this.renderMode === '3d') {
      ctx.beginPath();
      ctx.ellipse(basePos.x, basePos.y + 2, p.radius * 1.1, p.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fill();
    }

    ctx.translate(screenPos.x, screenPos.y);

    // Selection Halo
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Hit Flash
    if (p.hitFlash > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 50, 50, ${p.hitFlash * 0.5})`;
      ctx.fill();
    }

    // Piece Presentation Themes
    if (this.pieceTheme === 'classic') {
      // Shaded 3D Disc
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-p.radius * 0.3, -p.radius * 0.3, 2, 0, 0, p.radius);
      if (isWhite) {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.6, '#f3e1a0');
        grad.addColorStop(1, '#9b7920');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
        ctx.shadowBlur = 10;
      } else {
        grad.addColorStop(0, '#323746');
        grad.addColorStop(0.6, '#131620');
        grad.addColorStop(1, '#080a0e');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 8;
      }
      ctx.fill();
      ctx.strokeStyle = isWhite ? '#ffd700' : '#4e5a77';
      ctx.lineWidth = 2;
      ctx.stroke();

    } else if (this.pieceTheme === 'outline') {
      // Glowing Neon Wireframe
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = isWhite ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255, 70, 85, 0.08)';
      ctx.fill();
      ctx.strokeStyle = isWhite ? '#ffd700' : '#ff4655';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isWhite ? '#ffd700' : '#ff4655';
      ctx.shadowBlur = 12;
      ctx.stroke();

    } else { // 'mono'
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = isWhite ? '#ffffff' : '#11141c';
      ctx.fill();
      ctx.strokeStyle = isWhite ? '#000000' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Piece Glyph
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.round(p.radius * 1.25)}px Outfit, sans-serif`;
    ctx.fillStyle = isWhite ? '#0a0c12' : '#f0f3fa';
    if (this.pieceTheme === 'outline') {
      ctx.fillStyle = isWhite ? '#ffd700' : '#ff4655';
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.glyph, 0, 1);

    // Mini Health Bar
    if (p.hp < p.maxHp) {
      const barW = p.radius * 2;
      const barH = 4;
      const barY = -p.radius - 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(-barW / 2, barY, barW, barH);
      const hpRatio = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = isWhite ? '#ffd700' : '#ff3b4e';
      ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
    }

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

    // Sort pieces by Y for proper 3D depth layering
    const sortedPieces = [...this.pieces].sort((a, b) => a.y - b.y);
    sortedPieces.forEach(p => this.renderPiece(p));

    this.renderVFX();
    this.ctx.restore();

    requestAnimationFrame(this.loop.bind(this));
  }
}

// Global expose
window.ArchessArena = ArchessArena;
