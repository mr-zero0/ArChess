"use strict";

(() => {
  const log = window.ArChessObservability || { info: () => {}, debug: () => {}, warn: () => {}, error: () => {} };
  const safe = (name, fn, fallback) => {
    try { return fn(); } catch (error) { log.error(`FUNCTION_ERROR:${name}`, error); if (typeof fallback === "function") return fallback(error); return fallback; }
  };

  const canvas = document.getElementById("gameCanvas");
  if (!canvas || !window.GameBoard || !window.GameRenderer || !window.Physics) {
    log.error("BOOT_FAILURE", new Error("Required game engine modules are missing"));
    return;
  }

  const board = new GameBoard(canvas);
  const renderer = new GameRenderer(board);
  const game = {
    currentPlayer: "white", selectedPiece: null, dragging: false, gameOver: false, winner: null,
    mode: "match", turnTime: 0, turnTimeLeft: 0, pieces: [], effects: [], pointer: null, powerRatio: 0,
    phase: "aim", activeCollisions: new Set(), hitPairs: new Map(), history: [], simTime: 0, settledFor: 0,
    collisionCount: 0, debugOverlay: false, debugMetrics: null, feedback: null,
    screenShake: { time: 0, magnitude: 0 }, combo: 0, comboTimer: 0, maxCombo: 0,
    stats: { white: null, black: null }, challenge: null,
    onImpact: null, onWallImpact: null,
  };
  window.gameState = game;

  const makeStats = () => ({ launches: 0, damage: 0, friendlyDamage: 0, kingDamage: 0, destroyed: 0, maxCombo: 0 });
  const newStats = () => ({ white: makeStats(), black: makeStats() });
  const capitalize = (v) => String(v || "").charAt(0).toUpperCase() + String(v || "").slice(1);

  function history(message) {
    game.history.push(message);
    safe("UI.log", () => UI.log(message));
    log.debug("HISTORY", { message });
  }

  function feedback(text, life = 1.4) { game.feedback = { text, life }; }

  function resetGame() {
    return safe("resetGame", () => {
      window.__ArChessLocalInputController?.cancel?.();
      game.currentPlayer = "white"; game.selectedPiece = null; game.dragging = false;
      game.gameOver = false; game.winner = null; game.phase = "aim"; game.effects = [];
      game.pointer = null; game.powerRatio = 0; game.activeCollisions.clear(); game.hitPairs.clear();
      game.history = []; game.simTime = 0; game.settledFor = 0; game.collisionCount = 0;
      game.feedback = null; game.screenShake.time = 0; game.screenShake.magnitude = 0;
      game.combo = 0; game.comboTimer = 0; game.maxCombo = 0; game.stats = newStats();
      game.challenge = window.ChallengeManager?.getActive?.() || null;
      if (window.GameModeManager) {
        const prefs = GameModeManager.get(); game.mode = game.challenge ? "challenge" : prefs.mode;
        game.turnTime = prefs.turnTime; game.turnTimeLeft = prefs.turnTime;
      }
      game.pieces = game.challenge ? ChallengeManager.buildPieces(game.challenge) : PieceFactory.setup();
      if (game.challenge) ChallengeManager.storeInitialFriendlyHp(game.pieces);
      canvas.classList.remove("is-dragging");
      UI.modal("gameOverModal", false); UI.modal("challengeResultModal", false); UI.clearLog();
      history(game.challenge ? `Challenge: ${game.challenge.name}. White to move.` : "Battle initialized. White to move.");
      window.ReplayRecorder?.startRecording?.(game.pieces, game.mode);
      UI.update(true);
      log.info("GAME_RESET", { mode: game.mode, pieces: game.pieces.length });
    }, null);
  }

  function findPiece(point) {
    let best = null, bestDistance = Infinity;
    for (const piece of game.pieces) {
      if (!piece.alive) continue;
      const distance = Math.hypot(piece.x - point.x, piece.y - point.y);
      if (distance <= piece.radius * 1.45 && distance < bestDistance) { best = piece; bestDistance = distance; }
    }
    return best;
  }

  function selectAt(point) {
    return safe("selectAt", () => {
      if (game.gameOver || game.phase !== "aim") return false;
      const piece = findPiece(point);
      if (!piece) { game.selectedPiece = null; game.dragging = false; feedback("No living piece selected.", .9); UI.update(); return false; }
      if (piece.team !== game.currentPlayer) { feedback(`Only ${game.currentPlayer.toUpperCase()} pieces can launch.`); game.selectedPiece = null; UI.update(); return false; }
      game.selectedPiece = piece; game.dragging = true; game.pointer = point; game.powerRatio = 0;
      canvas.classList.add("is-dragging"); window.AudioManager?.unlock?.(); window.AudioManager?.select?.(); UI.update();
      log.info("PIECE_SELECTED", { id: piece.id, type: piece.type, team: piece.team });
      return true;
    }, false);
  }

  function updateDrag(point) {
    safe("updateDrag", () => {
      if (!game.dragging || !game.selectedPiece) return;
      game.pointer = point;
      const distance = Math.hypot(game.selectedPiece.x - point.x, game.selectedPiece.y - point.y);
      game.powerRatio = Math.min(1, distance / GAME_CONFIG.maxDragDistance);
      window.AudioManager?.pull?.(game.powerRatio); UI.update();
    });
  }

  function releaseDrag(point) {
    safe("releaseDrag", () => {
      if (!game.dragging || !game.selectedPiece) return;
      game.pointer = point;
      const piece = game.selectedPiece;
      const dx = piece.x - point.x, dy = piece.y - point.y;
      const distance = Math.hypot(dx, dy);
      const powerAtRelease = game.powerRatio;
      game.dragging = false; canvas.classList.remove("is-dragging");
      if (distance < GAME_CONFIG.minDragDistance || !Physics.launch(piece, dx, dy)) {
        game.selectedPiece = null; game.pointer = null; game.powerRatio = 0;
        feedback("Pull farther back before releasing.", 1.0); UI.update(); return;
      }
      spawnLaunchEffects(piece); history(`${capitalize(piece.team)} ${PIECES[piece.type].name} launched.`);
      window.AudioManager?.launch?.(powerAtRelease);
      game.phase = "physics"; game.settledFor = 0; game.selectedPiece = null; game.pointer = null; game.powerRatio = 0;
      game.combo = 0; game.comboTimer = 0; game.maxCombo = 0;
      game.stats[piece.team].launches += 1;
      window.ReplayRecorder?.recordLaunch?.({ pieceId: piece.id, team: piece.team, dx, dy, power: powerAtRelease });
      UI.update(); log.info("SHOT_LAUNCHED", { id: piece.id, team: piece.team, dx, dy, power: powerAtRelease });
    });
  }

  function cancelDrag() { safe("cancelDrag", () => { game.dragging = false; game.selectedPiece = null; game.pointer = null; game.powerRatio = 0; canvas.classList.remove("is-dragging"); UI.update(); }); }

  const input = new InputController(canvas, board, { pointerDown: selectAt, pointerMove: updateDrag, pointerUp: releaseDrag, pointerCancel: cancelDrag });
  window.__ArChessLocalInputController = input;

  function recordStat(team, target, damage) {
    if (!game.stats[team] || damage <= 0) return;
    game.stats[team].damage += damage;
    if (target.team === team) game.stats[team].friendlyDamage += damage;
    if (target.type === "king") game.stats[team].kingDamage += damage;
  }

  function pushParticle(x,y,vx,vy,size,life,color){game.effects.push({kind:"particle",x,y,vx,vy,size,color,rotation:Math.random()*Math.PI,spin:(Math.random()-.5)*9,life,maxLife:life});}
  function pushRing(x,y,radius,growth,life,color){game.effects.push({kind:"ring",x,y,vx:0,vy:0,radius,growth,color,life,maxLife:life});}
  function pushFlash(x,y,radius,growth,life,color){game.effects.push({kind:"flash",x,y,vx:0,vy:0,radius,growth,color,life,maxLife:life});}
  function spawnLaunchEffects(piece){const speed=Math.hypot(piece.vx,piece.vy)||1;const bx=-piece.vx/speed,by=-piece.vy/speed;const color=piece.team==="white"?"#78efff":"#ff7d8d";for(let i=0;i<8;i++){const s=(Math.random()-.5)*1.6;pushParticle(piece.x,piece.y,bx*(1.4+Math.random()*2.2)+by*s,by*(1.4+Math.random()*2.2)-bx*s,.05+Math.random()*.035,.25+Math.random()*.22,color)}pushRing(piece.x,piece.y,piece.radius*.9,piece.radius*1.4,.22,color)}
  function spawnImpactEffects(x,y,impact,amount){const colors=["#76efff","#ffd37b","#ff7888"];for(let i=0;i<Math.min(22,8+Math.round(impact*1.2));i++){const a=Math.random()*Math.PI*2,s=1.6+Math.random()*Math.min(6.5,1.2+impact*.45);pushParticle(x,y,Math.cos(a)*s,Math.sin(a)*s,.035+Math.random()*.045,.28+Math.random()*.3,colors[i%3])}pushRing(x,y,.1,.55+impact*.025,.28,"#fff0bd");pushFlash(x,y,.08,.18+impact*.018,.12,"rgba(255,238,186,.78)");game.effects.push({kind:"damage",x,y:y-.18,vx:0,vy:-.55,amount,color:"#ffb28f",life:.72,maxLife:.72});if(impact>6.2){game.screenShake.time=Math.max(game.screenShake.time,.16);game.screenShake.magnitude=Math.max(game.screenShake.magnitude,impact)}}
  function spawnWallEffects(x,y,team,impact){const color=team==="white"?"#70ebff":"#ff7c8a";pushRing(x,y,.04,.26+impact*.012,.18,color);for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2,s=.8+Math.random()*1.8;pushParticle(x,y,Math.cos(a)*s,Math.sin(a)*s,.025+Math.random()*.02,.18+Math.random()*.12,color)}}
  function spawnDestructionEffects(piece){const color=piece.team==="white"?"#9bf5ff":"#ff7183";for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;pushParticle(piece.x,piece.y,Math.cos(a)*s,Math.sin(a)*s,.04+Math.random()*.06,.42+Math.random()*.38,color)}pushRing(piece.x,piece.y,piece.radius*.8,.95,.42,color);pushFlash(piece.x,piece.y,piece.radius*.55,.48,.2,color);game.effects.push({kind:"death",x:piece.x,y:piece.y,vx:0,vy:-.22,glyph:PIECES[piece.type].glyph[piece.team],radius:piece.radius,color,life:.56,maxLife:.56});game.screenShake.time=Math.max(game.screenShake.time,.22);game.screenShake.magnitude=Math.max(game.screenShake.magnitude,piece.type==="king"?12:8)}

  game.onImpact = ({a,b,impactSpeed,damageToA,damageToB,x,y}) => safe("onImpact",()=>{if(!a.alive||!b.alive)return;game.collisionCount++;a.hp=Math.max(0,a.hp-damageToA);b.hp=Math.max(0,b.hp-damageToB);spawnImpactEffects(x,y,impactSpeed,Math.max(damageToA,damageToB));history(`${PIECES[a.type].name} -${damageToA} HP · ${PIECES[b.type].name} -${damageToB} HP.`);window.AudioManager?.[a.type==="king"||b.type==="king"?"kingHit":"impact"]?.(impactSpeed);if(Math.max(damageToA,damageToB)>0){game.combo++;game.comboTimer=GAME_CONFIG.comboWindow;game.maxCombo=Math.max(game.maxCombo,game.combo)}recordStat(b.team,a,damageToA);recordStat(a.team,b,damageToB);if(a.hp<=0)destroyPiece(a,b.team);if(b.hp<=0)destroyPiece(b,a.team)},null);
  game.onWallImpact = (piece,impact) => safe("onWallImpact",()=>{game.collisionCount++;spawnWallEffects(piece.x,piece.y,piece.team,impact);window.AudioManager?.wall?.(impact)},null);
  function destroyPiece(piece,killerTeam){if(!piece.alive)return;piece.alive=false;piece.moving=false;piece.vx=0;piece.vy=0;spawnDestructionEffects(piece);history(`${capitalize(piece.team)} ${PIECES[piece.type].name} destroyed.`);window.AudioManager?.destroy?.(piece.type);if(killerTeam&&game.stats[killerTeam])game.stats[killerTeam].destroyed++}

  function updateEffects(dt){for(const e of game.effects){e.life-=dt;e.x+=(e.vx||0)*dt;e.y+=(e.vy||0)*dt;if(e.kind==="particle"){e.vx*=Math.pow(.92,dt*60);e.vy*=Math.pow(.92,dt*60);e.rotation+=(e.spin||0)*dt}}game.effects=game.effects.filter(e=>e.life>0);if(game.feedback){game.feedback.life-=dt;if(game.feedback.life<=0)game.feedback=null}if(game.screenShake.time>0){game.screenShake.time=Math.max(0,game.screenShake.time-dt);game.screenShake.magnitude*=Math.pow(.78,dt*60)}}
  function checkWin(){if(game.gameOver||game.mode==="practice")return;const wk=game.pieces.find(p=>p.type==="king"&&p.team==="white"),bk=game.pieces.find(p=>p.type==="king"&&p.team==="black");const wd=!wk||wk.hp<=0||!wk.alive,bd=!bk||bk.hp<=0||!bk.alive;if(wd||bd)endGame(wd&&bd?game.currentPlayer:wd?"black":"white",wd&&bd)}
  function endGame(winner,doubleKO){if(game.gameOver)return;game.gameOver=true;game.winner=winner;game.phase="gameover";game.dragging=false;game.selectedPiece=null;game.pointer=null;game.powerRatio=0;canvas.classList.remove("is-dragging");document.getElementById("winnerGlyph").textContent=winner==="white"?"♔":"♚";document.getElementById("winnerTitle").textContent=`${winner.toUpperCase()} WINS`;document.getElementById("winnerSub").textContent=doubleKO?"Both Kings were destroyed in the same resolution.":"The opposing King has been destroyed.";history(`${winner.toUpperCase()} WINS.`);window.ReplayRecorder?.recordGameOver?.(winner,game.stats,doubleKO);window.MatchHistory?.record?.({winner,doubleKO,mode:game.mode,turns:game.stats.white.launches+game.stats.black.launches});window.AudioManager?.[winner==="white"?"victory":"defeat"]?.();UI.update(true);UI.modal("gameOverModal",true);log.info("GAME_OVER",{winner,doubleKO})}
  function switchTurn(){game.currentPlayer=game.currentPlayer==="white"?"black":"white";game.phase="aim";game.settledFor=0;game.turnTimeLeft=game.turnTime;history(`${capitalize(game.currentPlayer)} to move.`);UI.update(true)}
  function settle(dt){if(game.gameOver||game.phase!=="physics")return;const stopped=game.pieces.every(p=>!p.alive||!p.moving);if(!stopped){game.settledFor=0;return}game.settledFor+=dt;if(game.settledFor<GAME_CONFIG.settleDelay)return;if(window.ReplayRecorder)ReplayRecorder.recordTurnEnd(game.pieces);if(game.challenge&&window.ChallengeManager){ChallengeManager.recordTurn();const result=ChallengeManager.check(game);if(result){game.gameOver=true;game.phase="gameover";const card=document.getElementById("challengeResultCard");if(card)card.className=`challenge-result ${result.passed?"passed":"failed"}`;document.getElementById("challengeResultTitle").textContent=result.passed?"CHALLENGE COMPLETE":"CHALLENGE FAILED";document.getElementById("challengeResultStars").innerHTML=[0,1,2].map(i=>`<span class="${i<result.stars?"":"empty"}">★</span>`).join("");document.getElementById("challengeResultMsg").textContent=result.message;UI.modal("challengeResultModal",true);return}}game.combo=0;game.maxCombo=0;switchTurn()}

  function updateDebug(dt){game.debugMetrics={fps:dt?Math.round(1/dt):60,activeBodies:game.pieces.filter(p=>p.alive&&p.moving).length,collisionCount:game.collisionCount,selectedPiece:game.selectedPiece?.id||"None",settleTimer:`${game.settledFor.toFixed(2)}s`}}
  function loop(now){const dt=Math.min(.033,Math.max(0,(now-(loop.last||now))/1000));loop.last=now;game.simTime+=dt;if(game.phase==="physics"&&!game.gameOver)Physics.step(game,dt);else for(const p of game.pieces)Physics.recordTrail(p,dt);updateEffects(dt);if(game.comboTimer>0){game.comboTimer-=dt;if(game.comboTimer<=0)game.combo=0}checkWin();settle(dt);updateDebug(dt);renderer.draw(game);UI.update();requestAnimationFrame(loop)}

  function bind(id,event,fn){const el=document.getElementById(id);if(!el)return;el.addEventListener(event,(e)=>safe(`${id}:${event}`,()=>fn(e)));}
  bind("newGameBtn","click",()=>{window.ChallengeManager?.reset?.();game.challenge=null;resetGame()});
  bind("playAgainBtn","click",()=>{window.ChallengeManager?.reset?.();game.challenge=null;resetGame()});
  bind("helpBtn","click",()=>{window.MatchHistory?.render?.(document.getElementById("matchHistoryList"));UI.modal("helpModal",true)});
  bind("closeHelp","click",()=>UI.modal("helpModal",false));
  bind("helpTutorialBtn","click",()=>{UI.modal("helpModal",false);window.TutorialManager?.start?.()});
  bind("settingsBtn","click",()=>{window.PrefsManager?.applyControls?.();window.AudioManager?.unlock?.();UI.modal("settingsModal",true)});
  bind("closeSettings","click",()=>UI.modal("settingsModal",false));
  bind("challengeBtn","click",()=>{const list=document.getElementById("challengeList");if(list&&window.ChallengeManager){list.replaceChildren();ChallengeManager.list().forEach(ch=>{const b=document.createElement("button");b.type="button";b.className="challenge-item";b.innerHTML=`<div class="challenge-icon">✦</div><div class="challenge-info"><b>${ch.name}</b><small>${ch.description}</small></div><div class="challenge-stars">${"★".repeat(ch.difficulty)}${"★".repeat(3-ch.difficulty).replace(/★/g,"☆")}</div>`;b.addEventListener("click",()=>{ChallengeManager.start(ch.id);UI.modal("challengeModal",false);resetGame()});list.appendChild(b)})}UI.modal("challengeModal",true)});
  bind("closeChallenge","click",()=>UI.modal("challengeModal",false));
  bind("challengeRetryBtn","click",()=>{UI.modal("challengeResultModal",false);resetGame()});
  bind("challengeExitBtn","click",()=>{UI.modal("challengeResultModal",false);window.ChallengeManager?.reset?.();game.challenge=null;resetGame()});
  bind("replayBtn","click",()=>{UI.modal("replayModal",true);window.ReplayViewer?.updateUI?.()});
  bind("closeReplay","click",()=>{UI.modal("replayModal",false);window.ReplayViewer?.stop?.()});
  bind("replayLoadBtn","click",()=>document.getElementById("replayFileInput")?.click());
  bind("saveReplayBtn","click",()=>window.ReplayRecorder?.exportReplay?.());
  bind("exportHistoryBtn","click",()=>window.MatchHistory?.exportData?.());
  bind("clearHistoryBtn","click",()=>{window.MatchHistory?.clear?.();window.MatchHistory?.render?.(document.getElementById("matchHistoryList"))});
  bind("closeTuning","click",()=>UI.modal("tuningModal",false));bind("closeTuning2","click",()=>UI.modal("tuningModal",false));bind("tuneBtn","click",()=>UI.modal("tuningModal",true));
  bind("debugBtn","click",()=>{game.debugOverlay=!game.debugOverlay;document.getElementById("debugBtn")?.classList.toggle("active",game.debugOverlay);feedback(game.debugOverlay?"Diagnostics enabled":"Diagnostics disabled",1.2)});
  bind("qualityBtn","click",()=>{document.getElementById("qualityBtn")?.classList.toggle("active");feedback("Graphics quality toggled",1.0)});
  bind("fullscreenBtn","click",()=>{if(document.fullscreenElement)document.exitFullscreen();else document.querySelector(".board-frame")?.requestFullscreen?.()});
  bind("replayPlay","click",()=>window.ReplayViewer?.togglePlay?.());bind("replayPrev","click",()=>window.ReplayViewer?.prev?.());bind("replayNext","click",()=>window.ReplayViewer?.next?.());bind("replaySpeed","click",()=>window.ReplayViewer?.cycleSpeed?.());bind("replayScrubber","input",e=>window.ReplayViewer?.seek?.(Number(e.target.value)));
  document.getElementById("replayFileInput")?.addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>safe("replayLoad",()=>{const data=JSON.parse(reader.result);window.ReplayViewer?.load?.(data,game,resetGame);window.ReplayViewer?.updateUI?.()});reader.onerror=()=>log.error("REPLAY_READ_ERROR",reader.error);reader.readAsText(file);e.target.value=""});
  window.addEventListener("keydown",e=>safe("keyboard",()=>{if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(k==="r")resetGame();if(k==="d")document.getElementById("debugBtn")?.click();if(k==="f")document.getElementById("fullscreenBtn")?.click();if(k==="escape"){["helpModal","settingsModal","challengeModal","challengeResultModal","replayModal","tuningModal","gameOverModal"].forEach(id=>UI.modal(id,false));if(game.dragging)input.cancel()}}));
  const resize=()=>safe("resize",()=>board.resize());window.addEventListener("resize",resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
  safe("moduleInit",()=>{UI.init(game);window.MatchHistory?.init?.();window.TuningPanel?.init?.();window.TutorialManager?.init?.(game);window.GameModeManager?.init?.();resetGame();fetch("/api/version",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>d&&UI.setVersion(d.version||"")).catch(e=>log.error("VERSION_LOAD_ERROR",e));requestAnimationFrame(loop)});
})();
