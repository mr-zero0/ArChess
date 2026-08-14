"use strict";

import { ThreeDScene } from "./render3d.js";

(() => {
  const canvas = document.getElementById("gameCanvas");
  const board = new GameBoard(canvas);
  const renderer = new GameRenderer(board);

  const glCanvas = document.getElementById("glCanvas");
  let threeDScene = null;
  if (glCanvas && typeof window.WebGL2RenderingContext !== "undefined") {
    try {
      threeDScene = new ThreeDScene(glCanvas);
    } catch (error) {
      console.warn("WebGL unavailable — falling back to 2D rendering.", error);
      glCanvas.style.display = "none";
      threeDScene = null;
    }
  } else if (glCanvas) {
    glCanvas.style.display = "none";
  }

  const gameState = {
    currentPlayer: "white",
    selectedPiece: null,
    dragging: false,
    gameOver: false,
    winner: null,
    mode: "match",
    turnTime: 0,
    turnTimeLeft: 0,
    pieces: [],
    effects: [],
    pointer: null,
    powerRatio: 0,
    phase: "aim",
    activeCollisions: new Set(),
    hitPairs: new Map(),
    history: [],
    simTime: 0,
    settledFor: 0,
    collisionCount: 0,
    debugOverlay: false,
    debugMetrics: null,
    feedback: null,
    screenShake: { time: 0, magnitude: 0 },
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    stats: null,
    onImpact: null,
    onWallImpact: null,
  };

  window.gameState = gameState;
  UI.init(gameState);
  if (window.TuningPanel) TuningPanel.init();
  if (window.TutorialManager) TutorialManager.init(gameState);
  if (window.GameModeManager) {
    GameModeManager.init();
    gameState.mode = GameModeManager.get().mode;
    gameState.turnTime = GameModeManager.get().turnTime;
    gameState.turnTimeLeft = gameState.turnTime;
    GameModeManager.setChangeHandler((prefs) => {
      gameState.mode = prefs.mode;
      gameState.turnTime = prefs.turnTime;
      gameState.turnTimeLeft = prefs.turnTime;
      if (prefs.turnTime > 0 && gameState.phase !== "aim") gameState.turnTimeLeft = prefs.turnTime;
      UI.update(true);
    });
  }

  function newStats() {
    const make = () => ({ launches: 0, damage: 0, friendlyDamage: 0, kingDamage: 0, destroyed: 0, maxCombo: 0 });
    return { white: make(), black: make() };
  }

  function resetGame() {
    input?.cancel();
    gameState.currentPlayer = "white";
    gameState.selectedPiece = null;
    gameState.dragging = false;
    gameState.gameOver = false;
    gameState.winner = null;
    if (window.GameModeManager) {
      const prefs = GameModeManager.get();
      gameState.mode = prefs.mode;
      gameState.turnTime = prefs.turnTime;
    }
    gameState.turnTimeLeft = gameState.turnTime;
    gameState.pieces = PieceFactory.setup();
    threeDScene?.reset(gameState);
    gameState.effects = [];
    gameState.pointer = null;
    gameState.powerRatio = 0;
    gameState.phase = "aim";
    gameState.activeCollisions.clear();
    gameState.hitPairs.clear();
    gameState.history = [];
    gameState.simTime = 0;
    gameState.settledFor = 0;
    gameState.collisionCount = 0;
    gameState.feedback = null;
    gameState.screenShake.time = 0;
    gameState.screenShake.magnitude = 0;
    gameState.combo = 0;
    gameState.comboTimer = 0;
    gameState.maxCombo = 0;
    gameState.stats = newStats();
    canvas.classList.remove("is-dragging");
    UI.modal("gameOverModal", false);
    UI.clearLog();
    addHistory("Battle initialized. White to move.");
    UI.update(true);
  }

  function findPiece(point) {
    let best = null;
    let bestDistance = Infinity;
    for (const piece of gameState.pieces) {
      if (!piece.alive) continue;
      const distance = Math.hypot(piece.x - point.x, piece.y - point.y);
      if (distance <= piece.radius * 1.35 && distance < bestDistance) {
        best = piece;
        bestDistance = distance;
      }
    }
    return best;
  }

  function setFeedback(text, life = 1.4) {
    gameState.feedback = { text, life };
  }

  function selectAt(point) {
    if (gameState.gameOver || gameState.phase !== "aim") return false;
    const piece = findPiece(point);
    if (!piece) {
      gameState.selectedPiece = null;
      gameState.dragging = false;
      setFeedback("No living piece selected.", 0.9);
      UI.update();
      return false;
    }
    if (piece.team !== gameState.currentPlayer) {
      setFeedback(`Only ${gameState.currentPlayer.toUpperCase()} pieces can launch this turn.`);
      gameState.selectedPiece = null;
      UI.update();
      return false;
    }

    gameState.selectedPiece = piece;
    gameState.dragging = true;
    gameState.pointer = point;
    gameState.powerRatio = 0;
    gameState.feedback = null;
    canvas.classList.add("is-dragging");
    AudioManager?.unlock();
    AudioManager?.select();
    UI.update();
    return true;
  }

  function updateDrag(point) {
    if (!gameState.dragging || !gameState.selectedPiece) return;
    gameState.pointer = point;
    const distance = Math.hypot(gameState.selectedPiece.x - point.x, gameState.selectedPiece.y - point.y);
    gameState.powerRatio = Math.min(1, distance / GAME_CONFIG.maxDragDistance);
    AudioManager?.pull(gameState.powerRatio);
    UI.update();
  }

  function releaseDrag(point) {
    if (!gameState.dragging || !gameState.selectedPiece) return;
    gameState.pointer = point;
    const piece = gameState.selectedPiece;
    const dx = piece.x - point.x;
    const dy = piece.y - point.y;
    const distance = Math.hypot(dx, dy);

    gameState.dragging = false;
    canvas.classList.remove("is-dragging");

    if (distance < GAME_CONFIG.minDragDistance || !Physics.launch(piece, dx, dy)) {
      gameState.selectedPiece = null;
      gameState.pointer = null;
      gameState.powerRatio = 0;
      setFeedback("Drag farther before releasing.", 1.0);
      UI.update();
      return;
    }

    spawnLaunchEffects(piece);
    addHistory(`${capitalize(piece.team)} ${PIECES[piece.type].name} launched.`);
    AudioManager?.launch(gameState.powerRatio);
    gameState.phase = "physics";
    gameState.settledFor = 0;
    gameState.selectedPiece = null;
    gameState.pointer = null;
    gameState.powerRatio = 0;
    gameState.feedback = null;
    gameState.combo = 0;
    gameState.comboTimer = 0;
    gameState.maxCombo = 0;
    if (gameState.stats && gameState.stats[piece.team]) {
      gameState.stats[piece.team].launches += 1;
    }
    UI.update();
  }

  function cancelDrag() {
    gameState.dragging = false;
    gameState.selectedPiece = null;
    gameState.pointer = null;
    gameState.powerRatio = 0;
    canvas.classList.remove("is-dragging");
    UI.update();
  }

  const input = new InputController(canvas, board, {
    pointerDown: (point) => selectAt(point),
    pointerMove: (point) => updateDrag(point),
    pointerUp: (point) => releaseDrag(point),
    pointerCancel: () => cancelDrag(),
  });

  function recordStat(team, target, damage) {
    const stats = gameState.stats && gameState.stats[team];
    if (!stats || damage <= 0) return;
    stats.damage += damage;
    if (target.team === team) stats.friendlyDamage += damage;
    if (target.type === "king") stats.kingDamage += damage;
  }

  gameState.onImpact = ({ a, b, impactSpeed, damageToA, damageToB, x, y }) => {
    if (!a.alive || !b.alive) return;
    gameState.collisionCount += 1;

    a.hp = Math.max(0, a.hp - damageToA);
    b.hp = Math.max(0, b.hp - damageToB);

    spawnImpactEffects(x, y, impactSpeed, Math.max(damageToA, damageToB));
    addHistory(`${PIECES[a.type].name} -${damageToA} HP · ${PIECES[b.type].name} -${damageToB} HP.`);

    if (a.type === "king" || b.type === "king") {
      AudioManager?.kingHit();
    } else {
      AudioManager?.impact(impactSpeed);
    }

    // Chain-combo: every damaging impact inside the window raises the counter.
    const damageDealt = Math.max(damageToA, damageToB);
    if (damageDealt > 0) {
      gameState.combo += 1;
      gameState.comboTimer = GAME_CONFIG.comboWindow;
      if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
        if (gameState.combo >= 2) setFeedback(`COMBO ×${gameState.combo}!`, 1.0);
      }
    }

    // Balance stats: damageToA was caused by b, damageToB by a.
    recordStat(b.team, a, damageToA);
    recordStat(a.team, b, damageToB);

    if (a.hp <= 0) destroyPiece(a, b.team);
    if (b.hp <= 0) destroyPiece(b, a.team);
  };

  gameState.onWallImpact = (piece, impact) => {
    gameState.collisionCount += 1;
    spawnWallEffects(piece.x, piece.y, piece.team, impact);
    AudioManager?.wall(impact);
  };

  function destroyPiece(piece, killerTeam) {
    if (!piece.alive) return;
    piece.alive = false;
    piece.moving = false;
    piece.vx = 0;
    piece.vy = 0;
    spawnDestructionEffects(piece);
    addHistory(`${capitalize(piece.team)} ${PIECES[piece.type].name} destroyed.`);
    AudioManager?.destroy(piece.type);
    if (gameState.stats && killerTeam && gameState.stats[killerTeam]) {
      gameState.stats[killerTeam].destroyed += 1;
    }
  }

  function addHistory(message) {
    gameState.history.push(message);
    UI.log(message);
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function spawnLaunchEffects(piece) {
    const speed = Math.hypot(piece.vx, piece.vy) || 1;
    const backX = -piece.vx / speed;
    const backY = -piece.vy / speed;
    const color = piece.team === "white" ? "#78efff" : "#ff7d8d";
    for (let i = 0; i < 8; i += 1) {
      const spread = (Math.random() - 0.5) * 1.6;
      pushParticle(piece.x, piece.y, backX * (1.4 + Math.random() * 2.2) + backY * spread, backY * (1.4 + Math.random() * 2.2) - backX * spread, 0.05 + Math.random() * 0.035, 0.25 + Math.random() * 0.22, color);
    }
    pushRing(piece.x, piece.y, piece.radius * 0.9, piece.radius * 1.4, 0.22, color);
  }

  function spawnImpactEffects(x, y, impact, amount) {
    const strong = impact > 6.2;
    const count = Math.min(22, 8 + Math.round(impact * 1.2));
    const colors = ["#76efff", "#ffd37b", "#ff7888"];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * Math.min(6.5, 1.2 + impact * 0.45);
      pushParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.035 + Math.random() * 0.045, 0.28 + Math.random() * 0.30, colors[i % colors.length]);
    }
    pushRing(x, y, 0.10, 0.55 + impact * 0.025, 0.28, "#fff0bd");
    pushFlash(x, y, 0.08, 0.18 + impact * 0.018, 0.12, "rgba(255, 238, 186, .78)");
    gameState.effects.push({ kind: "damage", x, y: y - 0.18, vx: 0, vy: -0.55, amount, color: "#ffb28f", life: 0.72, maxLife: 0.72 });
    if (strong) {
      gameState.screenShake.time = Math.max(gameState.screenShake.time, 0.16);
      gameState.screenShake.magnitude = Math.max(gameState.screenShake.magnitude, impact);
    }
  }

  function spawnWallEffects(x, y, team, impact) {
    const color = team === "white" ? "#70ebff" : "#ff7c8a";
    pushRing(x, y, 0.04, 0.26 + impact * 0.012, 0.18, color);
    for (let i = 0; i < 4; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.8;
      pushParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.025 + Math.random() * 0.02, 0.18 + Math.random() * 0.12, color);
    }
  }

  function spawnDestructionEffects(piece) {
    const color = piece.team === "white" ? "#9bf5ff" : "#ff7183";
    for (let i = 0; i < 24; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;
      pushParticle(piece.x, piece.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.04 + Math.random() * 0.06, 0.42 + Math.random() * 0.38, color);
    }
    pushRing(piece.x, piece.y, piece.radius * 0.8, 0.95, 0.42, color);
    pushFlash(piece.x, piece.y, piece.radius * 0.55, 0.48, 0.20, color);
    gameState.effects.push({
      kind: "death",
      x: piece.x,
      y: piece.y,
      vx: 0,
      vy: -0.22,
      glyph: PIECES[piece.type].glyph[piece.team],
      radius: piece.radius,
      color,
      life: 0.56,
      maxLife: 0.56,
    });
    gameState.screenShake.time = Math.max(gameState.screenShake.time, 0.22);
    gameState.screenShake.magnitude = Math.max(gameState.screenShake.magnitude, piece.type === "king" ? 12 : 8);
  }

  function pushParticle(x, y, vx, vy, size, life, color) {
    gameState.effects.push({ kind: "particle", x, y, vx, vy, size, color, rotation: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 9, life, maxLife: life });
  }

  function pushRing(x, y, radius, growth, life, color) {
    gameState.effects.push({ kind: "ring", x, y, vx: 0, vy: 0, radius, growth, color, life, maxLife: life });
  }

  function pushFlash(x, y, radius, growth, life, color) {
    gameState.effects.push({ kind: "flash", x, y, vx: 0, vy: 0, radius, growth, color, life, maxLife: life });
  }

  function updateEffects(deltaTime) {
    for (const effect of gameState.effects) {
      effect.life -= deltaTime;
      effect.x += (effect.vx || 0) * deltaTime;
      effect.y += (effect.vy || 0) * deltaTime;
      if (effect.kind === "particle") {
        effect.vx *= Math.pow(0.92, deltaTime * 60);
        effect.vy *= Math.pow(0.92, deltaTime * 60);
        effect.rotation += (effect.spin || 0) * deltaTime;
      }
    }
    gameState.effects = gameState.effects.filter((effect) => effect.life > 0);

    if (gameState.feedback) {
      gameState.feedback.life -= deltaTime;
      if (gameState.feedback.life <= 0) gameState.feedback = null;
    }

    if (gameState.screenShake.time > 0) {
      gameState.screenShake.time = Math.max(0, gameState.screenShake.time - deltaTime);
      gameState.screenShake.magnitude *= Math.pow(0.78, deltaTime * 60);
      if (gameState.screenShake.time === 0) gameState.screenShake.magnitude = 0;
    }
  }

  function checkWinCondition() {
    if (gameState.gameOver) return;
    if (gameState.mode === "practice") return;
    const whiteKing = gameState.pieces.find((piece) => piece.type === "king" && piece.team === "white");
    const blackKing = gameState.pieces.find((piece) => piece.type === "king" && piece.team === "black");
    const whiteDead = !whiteKing || whiteKing.hp <= 0 || !whiteKing.alive;
    const blackDead = !blackKing || blackKing.hp <= 0 || !blackKing.alive;
    if (!whiteDead && !blackDead) return;

    const doubleKO = whiteDead && blackDead;
    const winner = doubleKO ? gameState.currentPlayer : whiteDead ? "black" : "white";
    endGame(winner, doubleKO);
  }

  function endGame(winner, doubleKO) {
    gameState.gameOver = true;
    gameState.winner = winner;
    gameState.phase = "gameover";
    gameState.dragging = false;
    gameState.selectedPiece = null;
    gameState.pointer = null;
    gameState.powerRatio = 0;
    canvas.classList.remove("is-dragging");

    const playedTeam = gameState.stats ? gameState.stats[gameState.currentPlayer] : null;
    if (playedTeam) playedTeam.maxCombo = Math.max(playedTeam.maxCombo, gameState.maxCombo);

    document.getElementById("winnerGlyph").textContent = winner === "white" ? "♔" : "♚";
    document.getElementById("winnerTitle").textContent = `${winner.toUpperCase()} WINS`;
    document.getElementById("winnerSub").textContent = doubleKO
      ? "Both Kings were destroyed in the same resolution. The active player wins the double knockout."
      : "The opposing King has been destroyed.";
    addHistory(`${winner.toUpperCase()} WINS.`);
    if (winner === "white") {
      AudioManager?.victory();
    } else {
      AudioManager?.defeat();
    }
    UI.update(true);
    UI.modal("gameOverModal", true);
  }

  function switchTurn() {
    gameState.currentPlayer = gameState.currentPlayer === "white" ? "black" : "white";
    gameState.phase = "aim";
    gameState.settledFor = 0;
    gameState.turnTimeLeft = gameState.turnTime;
    addHistory(`${capitalize(gameState.currentPlayer)} to move.`);
    UI.update(true);
  }

  function expireTurnTimer() {
    if (gameState.gameOver || gameState.phase !== "aim") return;
    setFeedback(`Time up — ${gameState.currentPlayer.toUpperCase()}'s turn ended.`, 1.4);
    addHistory(`Turn timer expired for ${capitalize(gameState.currentPlayer)}.`);
    switchTurn();
  }

  function tickTurnTimer(deltaTime) {
    if (gameState.turnTime <= 0 || gameState.gameOver) return;
    if (gameState.phase !== "aim") {
      if (gameState.turnTimeLeft !== gameState.turnTime) {
        gameState.turnTimeLeft = gameState.turnTime;
      }
      return;
    }
    if (gameState.phase === "aim") {
      gameState.turnTimeLeft = Math.max(0, gameState.turnTimeLeft - deltaTime);
      if (gameState.turnTimeLeft <= 0) expireTurnTimer();
    }
  }

  function settleTurn(deltaTime) {
    if (gameState.gameOver || gameState.phase !== "physics") return;
    const allStopped = gameState.activeCollisions.size === 0 && gameState.pieces.every((piece) => !piece.alive || !piece.moving);
    if (!allStopped) {
      gameState.settledFor = 0;
      return;
    }

    gameState.settledFor += deltaTime;
    if (gameState.settledFor < GAME_CONFIG.settleDelay) return;

    const playedTeam = gameState.currentPlayer;
    if (gameState.stats && gameState.stats[playedTeam]) {
      gameState.stats[playedTeam].maxCombo = Math.max(gameState.stats[playedTeam].maxCombo, gameState.maxCombo);
    }
    gameState.combo = 0;
    gameState.comboTimer = 0;
    gameState.maxCombo = 0;

    switchTurn();
  }

  let previousTime = performance.now();
  function gameLoop(now) {
    const deltaTime = Math.min(0.033, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    gameState.simTime += deltaTime;

    if (gameState.phase === "physics" && !gameState.gameOver) {
      Physics.step(gameState, deltaTime);
    } else {
      for (const piece of gameState.pieces) Physics.recordTrail(piece, deltaTime);
    }

    updateEffects(deltaTime);
    if (gameState.comboTimer > 0) {
      gameState.comboTimer -= deltaTime;
      if (gameState.comboTimer <= 0) gameState.combo = 0;
    }
    checkWinCondition();
    settleTurn(deltaTime);
    tickTurnTimer(deltaTime);
    if (window.TutorialManager) TutorialManager.tick(gameState);
    updateDebugMetrics(deltaTime);
    threeDScene?.render(gameState, deltaTime);
    renderer.draw(gameState);
    UI.update();
    requestAnimationFrame(gameLoop);
  }

  let frameCount = 0;
  let fpsTimer = 0;
  let currentFps = 60.0;

  function updateDebugMetrics(deltaTime) {
    frameCount += 1;
    fpsTimer += deltaTime;
    if (fpsTimer >= 0.2) {
      currentFps = frameCount / fpsTimer;
      frameCount = 0;
      fpsTimer = 0;
    }

    const activeBodies = gameState.pieces.filter((p) => p.alive && p.moving).length;
    let selectedText = "None";
    let pieceVel = "0.00";

    if (gameState.selectedPiece && gameState.selectedPiece.alive) {
      const p = gameState.selectedPiece;
      selectedText = `${capitalize(p.team)} ${PIECES[p.type].name} (${p.id.slice(0, 4)})`;
      pieceVel = Math.hypot(p.vx, p.vy).toFixed(2);
    } else {
      let maxVel = 0;
      for (const p of gameState.pieces) {
        if (p.alive && p.moving) {
          const v = Math.hypot(p.vx, p.vy);
          if (v > maxVel) maxVel = v;
        }
      }
      pieceVel = maxVel.toFixed(2);
    }

    gameState.debugMetrics = {
      fps: currentFps,
      deltaTime: deltaTime * 1000,
      substeps: GAME_CONFIG.physicsSubsteps || 3,
      activeBodies,
      selectedPiece: selectedText,
      pieceVelocity: pieceVel,
      collisionCount: gameState.collisionCount || 0,
      contactPairs: gameState.hitPairs ? gameState.hitPairs.size : 0,
      settleTimer: `${gameState.settledFor.toFixed(2)}s`,
      combo: gameState.combo,
      stats: gameState.stats,
    };
  }

  function toggleDebugOverlay() {
    gameState.debugOverlay = !gameState.debugOverlay;
    const btn = document.getElementById("debugBtn");
    if (btn) btn.classList.toggle("active", gameState.debugOverlay);
    setFeedback(gameState.debugOverlay ? "Physics debug HUD enabled (D)" : "Physics debug HUD disabled (D)", 1.2);
  }

  let lowQuality = false;
  try {
    lowQuality = window.localStorage.getItem("archess-quality") === "low";
  } catch (_) {
    // Quality still defaults to high without storage.
  }

  function applyQuality() {
    threeDScene?.setQuality(lowQuality);
    const btn = document.getElementById("qualityBtn");
    if (btn) {
      btn.classList.toggle("active", lowQuality);
      btn.title = lowQuality ? "Graphics quality: LOW (toggle Q)" : "Graphics quality: HIGH (toggle Q)";
    }
  }

  function toggleQuality() {
    lowQuality = !lowQuality;
    try {
      window.localStorage.setItem("archess-quality", lowQuality ? "low" : "high");
    } catch (_) {
      // Quality still works for this session without storage.
    }
    applyQuality();
    setFeedback(lowQuality ? "Graphics quality: LOW (Q)" : "Graphics quality: HIGH (Q)", 1.2);
  }

  document.getElementById("debugBtn")?.addEventListener("click", toggleDebugOverlay);
  document.getElementById("qualityBtn")?.addEventListener("click", toggleQuality);
  applyQuality();

  const boardFrame = document.querySelector(".board-frame");

  function toggleFullscreen() {
    if (!document.fullscreenEnabled) {
      setFeedback("Fullscreen is not supported in this browser.", 1.2);
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      boardFrame?.requestFullscreen();
    }
  }

  function updateFullscreenControl() {
    const btn = document.getElementById("fullscreenBtn");
    if (btn) {
      btn.classList.toggle("active", Boolean(document.fullscreenElement));
      btn.title = document.fullscreenElement
        ? "Exit fullscreen (F)"
        : "Toggle Fullscreen (F)";
    }
  }

  document.getElementById("fullscreenBtn")?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", updateFullscreenControl);

  document.getElementById("newGameBtn").addEventListener("click", resetGame);
  document.getElementById("playAgainBtn").addEventListener("click", resetGame);
  document.getElementById("helpBtn").addEventListener("click", () => UI.modal("helpModal", true));
  document.getElementById("closeHelp").addEventListener("click", () => UI.modal("helpModal", false));
  document.getElementById("helpTutorialBtn").addEventListener("click", () => {
    UI.modal("helpModal", false);
    if (window.TutorialManager) TutorialManager.start();
  });
  document.getElementById("helpModal").addEventListener("click", (event) => {
    if (event.target.id === "helpModal") UI.modal("helpModal", false);
  });

  document.getElementById("settingsBtn").addEventListener("click", () => {
    PrefsManager?.applyControls();
    AudioManager?.unlock();
    UI.modal("settingsModal", true);
  });
  document.getElementById("closeSettings").addEventListener("click", () => UI.modal("settingsModal", false));
  document.getElementById("settingsModal").addEventListener("click", (event) => {
    if (event.target.id === "settingsModal") UI.modal("settingsModal", false);
  });

  // Subtle click feedback for UI chrome (buttons only, not the board canvas).
  document.addEventListener("click", (event) => {
    if (event.target.closest("button")) AudioManager?.click();
  });

  window.addEventListener("keydown", (event) => {
    const isInput = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if (event.key.toLowerCase() === "r" && !isInput) resetGame();
    if (event.key.toLowerCase() === "d" && !isInput) toggleDebugOverlay();
    if (event.key.toLowerCase() === "q" && !isInput) toggleQuality();
    if (event.key.toLowerCase() === "f" && !isInput) toggleFullscreen();
    if (event.key.toLowerCase() === "s" && !isInput) {
      AudioManager?.unlock();
      UI.modal("settingsModal", document.getElementById("settingsModal").classList.contains("hidden"));
    }
    if (event.key === "Escape") {
      UI.modal("helpModal", false);
      UI.modal("settingsModal", false);
      UI.modal("tuningModal", false);
      if (gameState.dragging) input.cancel();
    }
  });

  function handleResize() {
    board.resize();
    threeDScene?.resize();
  }
  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
  }
  window.addEventListener("resize", handleResize);

  resetGame();
  requestAnimationFrame(gameLoop);
})();
