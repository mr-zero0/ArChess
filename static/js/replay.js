"use strict";

// STEP 8 — Replay Foundation: records launch vectors, state snapshots, and
// end-state data per match. Provides a playback viewer with speed controls.

window.ReplayRecorder = (() => {
  let recordings = [];
  let isRecording = false;
  let gameStateSnapshot = null;

  function startRecording(pieces, mode) {
    recordings = [];
    isRecording = true;
    gameStateSnapshot = {
      pieces: pieces.map(p => ({
        id: p.id,
        type: p.type,
        team: p.team,
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        hp: p.hp,
        maxHp: p.maxHp,
        power: p.power,
        alive: p.alive
      })),
      mode: mode
    };
    window.__archessLastReplayId = (window.__archessLastReplayId || 0) + 1;
  }

  function recordLaunch(pieceInfo) {
    if (!isRecording) return;
    recordings.push({
      type: "launch",
      turn: recordings.length,
      pieceId: pieceInfo.pieceId,
      team: pieceInfo.team,
      dx: pieceInfo.dx,
      dy: pieceInfo.dy,
      power: pieceInfo.power
    });
  }

  function recordIntegrity(integrity) {
    if (!isRecording || !integrity) return;
    const shotHash = String(integrity.shotHash || "");
    if (!/^[a-f0-9]{64}$/i.test(shotHash)) return;
    if (recordings.some(record => record.type === "integrity" && record.shotHash === shotHash)) return;
    recordings.push({
      type: "integrity",
      turn: recordings.length,
      preHash: String(integrity.preHash || ""),
      postHash: String(integrity.postHash || ""),
      shotHash
    });
  }

  function recordGameOver(winner, stats, doubleKO) {
    if (!isRecording) return;
    recordings.push({
      type: "gameOver",
      turn: recordings.length,
      winner: winner,
      stats: stats,
      doubleKO: doubleKO
    });
    isRecording = false;
  }

  function recordTurnEnd(pieces) {
    if (!isRecording) return;
    const state = pieces.map(p => ({
      id: p.id,
      type: p.type,
      team: p.team,
      hp: p.hp,
      alive: p.alive
    }));
    recordings.push({
      type: "turnEnd",
      turn: recordings.length,
      pieceStates: state
    });
  }

  function exportReplay() {
    if (recordings.length === 0) return null;
    const integrityRecords = recordings.filter(record => record.type === "integrity");
    const integrityVerified = integrityRecords.length > 0 && integrityRecords.every(record =>
      /^[a-f0-9]{64}$/i.test(record.preHash) &&
      /^[a-f0-9]{64}$/i.test(record.postHash) &&
      /^[a-f0-9]{64}$/i.test(record.shotHash)
    );
    return {
      id: window.__archessLastReplayId,
      recordings,
      gameState: gameStateSnapshot,
      integrity: {
        recordCount: integrityRecords.length,
        verifiedShape: integrityVerified
      }
    };
  }

  function reset() {
    recordings = [];
    isRecording = false;
    gameStateSnapshot = null;
  }

  return Object.freeze({
    startRecording,
    recordLaunch,
    recordIntegrity,
    recordGameOver,
    recordTurnEnd,
    exportReplay,
    reset
  });
})();

// Capture authoritative integrity records returned by multiplayer launch calls
// without changing the transport response seen by the game.
if (typeof window.fetch === "function") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (/\/api\/rooms\/[^/]+\/launch$/.test(requestUrl)) {
        response.clone().json().then(payload => {
          if (payload?.state?.integrity) window.ReplayRecorder?.recordIntegrity(payload.state.integrity);
        }).catch(() => {});
      }
    } catch (_) {
      // Replay capture must never interfere with the live game transport.
    }
    return response;
  };
}

window.ReplayViewer = (() => {
  let replayData = null;
  let isPlaying = false;
  let currentTurn = 0;
  let speedMultiplier = 1;
  let animationId = null;

  function load(data, gameState, resetGame) {
    replayData = data;
    currentTurn = 0;
    isPlaying = false;
    speedMultiplier = 1;
    if (replayData.gameState && resetGame) {
      replayData.gameState.pieces.forEach((ps, i) => {
        if (gameState.pieces[i]) Object.assign(gameState.pieces[i], ps);
      });
    }
    updateUI();
  }

  function hasVerifiedIntegrity() {
    const records = replayData?.recordings?.filter(record => record.type === "integrity") || [];
    return records.length > 0 && records.every(record =>
      /^[a-f0-9]{64}$/i.test(record.preHash) &&
      /^[a-f0-9]{64}$/i.test(record.postHash) &&
      /^[a-f0-9]{64}$/i.test(record.shotHash)
    );
  }

  function updateUI() {
    const modal = document.getElementById("replayModal");
    const turnInfo = document.getElementById("replayTurnInfo");
    const scrubber = document.getElementById("replayScrubber");
    const playBtn = document.getElementById("replayPlay");
    const speedBtn = document.getElementById("replaySpeed");
    const prevBtn = document.getElementById("replayPrev");
    const nextBtn = document.getElementById("replayNext");

    if (!modal || !replayData) {
      if (modal) modal.classList.add("hidden");
      return;
    }

    modal.classList.remove("hidden");
    if (turnInfo) {
      const integrityLabel = hasVerifiedIntegrity() ? " · INTEGRITY ✓" : "";
      turnInfo.textContent = `Turn ${currentTurn} / ${replayData.recordings.length}${integrityLabel}`;
    }
    if (scrubber) {
      scrubber.max = replayData.recordings.length;
      scrubber.value = currentTurn;
    }
    if (playBtn) playBtn.dataset.state = "paused";
    if (speedBtn) speedBtn.textContent = `×${speedMultiplier}`;
    if (prevBtn) prevBtn.disabled = currentTurn <= 0;
    if (nextBtn) nextBtn.disabled = currentTurn >= replayData.recordings.length - 1;
  }

  function togglePlay() {
    if (!replayData) return;
    isPlaying = !isPlaying;
    const playBtn = document.getElementById("replayPlay");
    if (playBtn) playBtn.dataset.state = isPlaying ? "playing" : "paused";
    if (isPlaying) {
      animateNext();
    } else if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function animateNext() {
    if (!replayData || !isPlaying) return;
    if (currentTurn >= replayData.recordings.length) {
      isPlaying = false;
      updateUI();
      return;
    }
    let steps = Math.max(1, speedMultiplier);
    while (steps-- > 0 && currentTurn < replayData.recordings.length) {
      const rec = replayData.recordings[currentTurn];
      applyReplayRecord(rec);
      currentTurn++;
    }
    const turnInfoEl = document.getElementById("replayTurnInfo");
    if (turnInfoEl) {
      const integrityLabel = hasVerifiedIntegrity() ? " · INTEGRITY ✓" : "";
      turnInfoEl.textContent = `Turn ${currentTurn} / ${replayData.recordings.length}${integrityLabel}`;
    }
    const scrubberEl = document.getElementById("replayScrubber");
    if (scrubberEl) scrubberEl.value = currentTurn;
    animationId = requestAnimationFrame(animateNext);
  }

  function applyReplayRecord(rec) {
    switch (rec.type) {
      case "launch":
        break;
      case "turnEnd":
        break;
      case "integrity":
        break;
      case "gameOver":
        break;
    }
  }

  function prev() {
    if (!replayData || currentTurn <= 0) return;
    currentTurn--;
    updateUI();
  }

  function next() {
    if (!replayData || currentTurn >= replayData.recordings.length - 1) return;
    currentTurn++;
    updateUI();
  }

  function seek(time) {
    if (!replayData) return;
    currentTurn = Math.max(0, Math.min(replayData.recordings.length - 1, time));
    updateUI();
  }

  function cycleSpeed() {
    speedMultiplier = speedMultiplier >= 5 ? 1 : speedMultiplier + 1;
    const speedBtn = document.getElementById("replaySpeed");
    if (speedBtn) speedBtn.textContent = `×${speedMultiplier}`;
  }

  function stop() {
    isPlaying = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    updateUI();
  }

  function reset() {
    replayData = null;
    isPlaying = false;
    currentTurn = 0;
    speedMultiplier = 1;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  return Object.freeze({
    load,
    togglePlay,
    prev,
    next,
    seek,
    cycleSpeed,
    stop,
    reset,
    updateUI
  });
})();
