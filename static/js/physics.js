"use strict";

const LocalPhysics = Object.freeze({
  launch(piece, dx, dy) {
    const distance = Math.hypot(dx, dy);
    if (distance < GAME_CONFIG.minDragDistance) return false;

    const clampedDistance = Math.min(distance, GAME_CONFIG.maxDragDistance);
    const scale = clampedDistance / distance;
    const response = piece.launchMul ?? 1;
    let vx = dx * scale * GAME_CONFIG.launchStrength * response;
    let vy = dy * scale * GAME_CONFIG.launchStrength * response;
    const speed = Math.hypot(vx, vy);

    if (speed > GAME_CONFIG.maxLaunchSpeed) {
      const speedScale = GAME_CONFIG.maxLaunchSpeed / speed;
      vx *= speedScale;
      vy *= speedScale;
    }

    piece.vx = vx;
    piece.vy = vy;
    piece.moving = true;
    piece.trailClock = 0;
    return true;
  },

  step(game, deltaTime) {
    const substeps = Math.max(2, Math.min(4, GAME_CONFIG.physicsSubsteps));
    const stepTime = deltaTime / substeps;
    game.activeCollisions.clear();

    for (let substep = 0; substep < substeps; substep += 1) {
      for (const piece of game.pieces) {
        if (!piece.alive || !piece.moving) continue;
        this.integrate(piece, stepTime);
        this.resolveBoundary(game, piece);
      }
      this.resolvePieceCollisions(game);
    }

    for (const piece of game.pieces) {
      if (!piece.alive) continue;
      const speed = Math.hypot(piece.vx, piece.vy);
      if (piece.moving && speed < GAME_CONFIG.minVelocity && !game.activeCollisions.has(piece.id)) {
        piece.vx = 0;
        piece.vy = 0;
        piece.moving = false;
      }
      this.recordTrail(piece, deltaTime);
    }
  },

  integrate(piece, deltaTime) {
    piece.x += piece.vx * deltaTime;
    piece.y += piece.vy * deltaTime;

    const decay = Math.pow(piece.friction ?? GAME_CONFIG.friction, deltaTime * 60);
    piece.vx *= decay;
    piece.vy *= decay;

    const speed = Math.hypot(piece.vx, piece.vy);
    if (speed > GAME_CONFIG.maxLaunchSpeed) {
      const scale = GAME_CONFIG.maxLaunchSpeed / speed;
      piece.vx *= scale;
      piece.vy *= scale;
    }
  },

  resolveBoundary(game, piece) {
    const min = piece.radius;
    const max = GAME_CONFIG.boardSize - piece.radius;
    const restitution = piece.restitution ?? GAME_CONFIG.bounceFactor;
    let hitX = false;
    let hitY = false;
    let impact = 0;

    if (piece.x < min) {
      impact = Math.max(impact, Math.abs(piece.vx));
      piece.x = min;
      if (piece.vx < 0) piece.vx *= -restitution;
      hitX = true;
    } else if (piece.x > max) {
      impact = Math.max(impact, Math.abs(piece.vx));
      piece.x = max;
      if (piece.vx > 0) piece.vx *= -restitution;
      hitX = true;
    }

    if (piece.y < min) {
      impact = Math.max(impact, Math.abs(piece.vy));
      piece.y = min;
      if (piece.vy < 0) piece.vy *= -restitution;
      hitY = true;
    } else if (piece.y > max) {
      impact = Math.max(impact, Math.abs(piece.vy));
      piece.y = max;
      if (piece.vy > 0) piece.vy *= -restitution;
      hitY = true;
    }

    if ((hitX || hitY) && impact > 1.2 && typeof game.onWallImpact === "function") {
      game.onWallImpact(piece, impact);
    }
  },

  resolvePieceCollisions(game) {
    const pieces = game.pieces;

    for (let i = 0; i < pieces.length; i += 1) {
      const a = pieces[i];
      if (!a.alive) continue;

      for (let j = i + 1; j < pieces.length; j += 1) {
        if (!a.alive) break;
        const b = pieces[j];
        if (!b.alive) continue;

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDistance = a.radius + b.radius;
        if (distance >= minDistance) continue;

        if (distance < 0.0001) {
          const seed = (i + 1) * (j + 3);
          const angle = (seed % 17) * 0.37;
          dx = Math.cos(angle) * 0.001;
          dy = Math.sin(angle) * 0.001;
          distance = 0.001;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        const invMassA = 1 / a.mass;
        const invMassB = 1 / b.mass;
        const invMassTotal = invMassA + invMassB;

        a.x -= nx * overlap * (invMassA / invMassTotal);
        a.y -= ny * overlap * (invMassA / invMassTotal);
        b.x += nx * overlap * (invMassB / invMassTotal);
        b.y += ny * overlap * (invMassB / invMassTotal);

        a.x = Math.min(GAME_CONFIG.boardSize - a.radius, Math.max(a.radius, a.x));
        a.y = Math.min(GAME_CONFIG.boardSize - a.radius, Math.max(a.radius, a.y));
        b.x = Math.min(GAME_CONFIG.boardSize - b.radius, Math.max(b.radius, b.x));
        b.y = Math.min(GAME_CONFIG.boardSize - b.radius, Math.max(b.radius, b.y));

        game.activeCollisions.add(a.id);
        game.activeCollisions.add(b.id);

        const relativeVx = b.vx - a.vx;
        const relativeVy = b.vy - a.vy;
        const relativeNormalVelocity = relativeVx * nx + relativeVy * ny;
        const impactSpeed = Math.max(0, -relativeNormalVelocity);

        if (relativeNormalVelocity < 0) {
          const restitution = ((a.restitution ?? GAME_CONFIG.bounceFactor) + (b.restitution ?? GAME_CONFIG.bounceFactor)) * 0.5;
          const impulseMagnitude = (-(1 + restitution) * relativeNormalVelocity) / invMassTotal;
          const impulseX = impulseMagnitude * nx;
          const impulseY = impulseMagnitude * ny;

          a.vx -= impulseX * invMassA;
          a.vy -= impulseY * invMassA;
          b.vx += impulseX * invMassB;
          b.vy += impulseY * invMassB;

          if (Math.hypot(a.vx, a.vy) >= GAME_CONFIG.minVelocity) a.moving = true;
          if (Math.hypot(b.vx, b.vy) >= GAME_CONFIG.minVelocity) b.moving = true;
        }

        if (impactSpeed >= GAME_CONFIG.minDamageImpact) {
          const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          const lastHit = game.hitPairs.get(pairKey) ?? -Infinity;
          if (game.simTime - lastHit >= GAME_CONFIG.collisionCooldown) {
            game.hitPairs.set(pairKey, game.simTime);
            const damageToA = this.calculateDamage(b, impactSpeed);
            const damageToB = this.calculateDamage(a, impactSpeed);
            if (typeof game.onImpact === "function") {
              game.onImpact({
                a,
                b,
                impactSpeed,
                damageToA,
                damageToB,
                x: (a.x + b.x) * 0.5,
                y: (a.y + b.y) * 0.5,
              });
            }
          }
        }
      }
    }
  },

  calculateDamage(attacker, relativeVelocity) {
    const impactForce = relativeVelocity * GAME_CONFIG.collisionMultiplier * (attacker.collisionMul ?? 1);
    const normalizedImpactForce = Math.min(1.6, impactForce / GAME_CONFIG.impactReferenceSpeed);
    const rawDamage = attacker.power * normalizedImpactForce * GAME_CONFIG.damageMultiplier * (attacker.damageMul ?? 1);
    return Math.max(1, Math.min(GAME_CONFIG.maxCollisionDamage, Math.round(rawDamage)));
  },

  recordTrail(piece, deltaTime) {
    for (const point of piece.trail) point.life -= deltaTime;
    piece.trail = piece.trail.filter((point) => point.life > 0);

    if (!piece.alive || !piece.moving) return;
    piece.trailClock += deltaTime;
    if (piece.trailClock < 0.025) return;
    piece.trailClock = 0;
    piece.trail.push({ x: piece.x, y: piece.y, life: GAME_CONFIG.trailLifetime });
    if (piece.trail.length > GAME_CONFIG.maxTrailPoints) piece.trail.shift();
  },
});

window.Physics = LocalPhysics;

// Multiplayer authority bridge. Local play continues to use the exact original physics.
(() => {
  let gameStateRef = null;
  let active = false;
  let pending = false;
  let roomCode = null;
  let localTeam = null;
  let lastError = null;

  Object.defineProperty(window, "gameState", {
    configurable: true,
    get: () => gameStateRef,
    set: (value) => { gameStateRef = value; },
  });

  const api = {
    get active() { return active; },
    get pending() { return pending; },
    get roomCode() { return roomCode; },
    get team() { return localTeam; },
    async request(url, options = {}) {
      const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.reason || data.message || data.error || `HTTP ${response.status}`);
      return data;
    },
    setStatus(message) {
      lastError = message;
      const el = document.getElementById("archessMultiStatus");
      if (el) el.textContent = message;
    },
    applySnapshot(snapshot) {
      const game = gameStateRef;
      if (!game || !snapshot?.pieces) return;
      const existing = new Map(game.pieces.map((piece) => [piece.id, piece]));
      game.pieces = snapshot.pieces.map((serverPiece) => {
        const piece = existing.get(serverPiece.id) || {
          id: serverPiece.id,
          type: serverPiece.type,
          team: serverPiece.team,
          trail: [],
          trailClock: 0,
          moving: false,
        };
        Object.assign(piece, serverPiece, {
          maxHp: serverPiece.maxHp ?? PIECES[serverPiece.type].hp,
          mass: PIECES[serverPiece.type].mass,
          radius: PIECES[serverPiece.type].radius,
          power: PIECES[serverPiece.type].power,
          launchMul: PIECES[serverPiece.type].launchMul,
          friction: PIECES[serverPiece.type].friction,
          restitution: PIECES[serverPiece.type].restitution,
          damageMul: PIECES[serverPiece.type].damageMul,
          collisionMul: PIECES[serverPiece.type].collisionMul,
          moving: false,
        });
        piece.trail ??= [];
        piece.trailClock = 0;
        return piece;
      });
      game.currentPlayer = snapshot.currentTeam;
      game.selectedPiece = null;
      game.dragging = false;
      game.pointer = null;
      game.powerRatio = 0;
      game.activeCollisions.clear();
      game.hitPairs.clear();
      game.simTime = 0;
      game.settledFor = 0;
      game.feedback = null;
      if (snapshot.gameOver) {
        // Let the existing local win-condition code open its normal game-over UI.
        game.gameOver = false;
        game.phase = "physics";
      } else {
        game.gameOver = false;
        game.phase = "aim";
      }
      window.TutorialManager?.tick?.(game);
      api.setStatus(`${localTeam?.toUpperCase() ?? "ONLINE"} · ${snapshot.gameOver ? "MATCH OVER" : snapshot.currentTeam.toUpperCase() + " TO MOVE"}`);
    },
    async createRoom() {
      const guestId = window.GuestIdentity?.getId?.();
      if (!guestId) throw new Error("Guest identity is unavailable");
      const data = await api.request("/api/rooms", { method: "POST", body: JSON.stringify({ guestId }) });
      roomCode = data.roomId;
      localTeam = "white";
      api.setStatus(`ROOM ${roomCode} · WHITE · WAITING`);
      return data;
    },
    async joinRoom(code) {
      const guestId = window.GuestIdentity?.getId?.();
      if (!guestId) throw new Error("Guest identity is unavailable");
      roomCode = String(code || "").trim().toUpperCase();
      const data = await api.request(`/api/rooms/${roomCode}/join`, { method: "POST", body: JSON.stringify({ guestId }) });
      const player = data.players?.find((entry) => entry.guestId === guestId);
      localTeam = player?.team ?? null;
      api.setStatus(`ROOM ${roomCode} · ${localTeam?.toUpperCase() ?? "CONNECTED"} · ${data.status.toUpperCase()}`);
      return data;
    },
    async startRoom() {
      if (!roomCode) throw new Error("Create or join a room first");
      const data = await api.request(`/api/rooms/${roomCode}/start`, { method: "POST", body: "{}" });
      active = true;
      pending = false;
      api.applySnapshot(data.state);
      api.setStatus(`ROOM ${roomCode} · ${localTeam.toUpperCase()} · LIVE`);
      return data;
    },
    async reconnect() {
      if (!roomCode) return null;
      const guestId = window.GuestIdentity?.getId?.();
      const data = await api.request(`/api/rooms/${roomCode}/reconnect`, { method: "POST", body: JSON.stringify({ guestId }) });
      active = true;
      const player = data.room?.players?.find((entry) => entry.guestId === guestId);
      localTeam = player?.team ?? localTeam;
      if (data.state) api.applySnapshot(JSON.parse(data.state));
      api.setStatus(`ROOM ${roomCode} · ${localTeam?.toUpperCase() ?? "ONLINE"} · RECONNECTED`);
      return data;
    },
    async launch(piece, dx, dy) {
      if (!active || !roomCode) return LocalPhysics.launch(piece, dx, dy);
      if (pending) return false;
      pending = true;
      const game = gameStateRef;
      const held = game?.pieces.find((candidate) => candidate.alive);
      if (held) held.moving = true;
      api.setStatus(`ROOM ${roomCode} · RESOLVING SHOT…`);
      try {
        const guestId = window.GuestIdentity?.getId?.();
        const data = await api.request(`/api/rooms/${roomCode}/launch`, {
          method: "POST",
          body: JSON.stringify({ guestId, launchData: { pieceId: piece.id, drag: { x: dx, y: dy } } }),
        });
        api.applySnapshot(data.state);
        return true;
      } catch (error) {
        lastError = error;
        api.setStatus(`ONLINE ERROR · ${error.message}`);
        if (game) {
          for (const candidate of game.pieces) candidate.moving = false;
          game.phase = "aim";
          game.currentPlayer = localTeam || game.currentPlayer;
          game.feedback = { text: error.message, life: 1.8 };
        }
        return false;
      } finally {
        pending = false;
      }
    },
  };

  window.ArChessMultiplayer = api;

  const onlinePhysics = Object.freeze({
    ...LocalPhysics,
    launch(piece, dx, dy) {
      if (!active) return LocalPhysics.launch(piece, dx, dy);
      void api.launch(piece, dx, dy);
      return true;
    },
    step(game, deltaTime) {
      if (!active) return LocalPhysics.step(game, deltaTime);
      if (pending) {
        const hold = game.pieces.find((piece) => piece.alive);
        if (hold) {
          hold.moving = true;
          hold.vx = 0;
          hold.vy = 0;
        }
        return;
      }
      for (const piece of game.pieces) {
        if (piece.alive) {
          piece.vx = 0;
          piece.vy = 0;
          piece.moving = false;
        }
        LocalPhysics.recordTrail(piece, deltaTime);
      }
    },
  });

  window.Physics = onlinePhysics;

  function addMultiplayerControls() {
    if (!document.body || document.getElementById("archessMultiPanel")) return;
    const panel = document.createElement("div");
    panel.id = "archessMultiPanel";
    panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:50;width:280px;padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(10,12,16,.94);backdrop-filter:blur(12px);box-shadow:0 14px 40px rgba(0,0,0,.35);font:12px/1.35 system-ui,sans-serif;color:#fff";
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
        <strong>ONLINE MATCH</strong><button id="archessMultiHide" type="button" style="border:0;background:none;color:#aaa;font-size:16px;cursor:pointer">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:7px">
        <button id="archessMultiCreate" type="button">CREATE ROOM</button>
        <button id="archessMultiStart" type="button">START</button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:7px">
        <input id="archessMultiCode" maxlength="6" placeholder="ROOM CODE" style="flex:1;min-width:0;padding:7px;border-radius:8px;border:1px solid #444;background:#181b21;color:#fff;text-transform:uppercase">
        <button id="archessMultiJoin" type="button">JOIN</button>
      </div>
      <div id="archessMultiStatus" style="color:#9aa3b2">Create or join a room.</div>`;
    document.body.appendChild(panel);

    const styleButton = (button) => {
      button.style.cssText = "padding:7px 8px;border:1px solid #3a404b;border-radius:8px;background:#1c2129;color:#fff;cursor:pointer;font-weight:700;font-size:10px;letter-spacing:.04em";
    };
    ["archessMultiCreate", "archessMultiStart", "archessMultiJoin"].forEach((id) => styleButton(document.getElementById(id)));

    document.getElementById("archessMultiHide").onclick = () => { panel.style.display = "none"; };
    document.getElementById("archessMultiCreate").onclick = async () => {
      try { await api.createRoom(); } catch (error) { api.setStatus(error.message); }
    };
    document.getElementById("archessMultiJoin").onclick = async () => {
      try { await api.joinRoom(document.getElementById("archessMultiCode").value); } catch (error) { api.setStatus(error.message); }
    };
    document.getElementById("archessMultiStart").onclick = async () => {
      try { await api.startRoom(); } catch (error) { api.setStatus(error.message); }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addMultiplayerControls, { once: true });
  else addMultiplayerControls();
})();
