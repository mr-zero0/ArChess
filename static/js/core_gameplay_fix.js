(() => {
  "use strict";
  if (window.__ArChessCoreGameplayFix) return;
  window.__ArChessCoreGameplayFix = true;

  const waitForGame=(fn,timeout=12000)=>{const started=performance.now();const tick=()=>{if(window.gameState&&window.Physics&&window.GAME_CONFIG)return fn(window.gameState);if(performance.now()-started<timeout)setTimeout(tick,40)};tick()};

  waitForGame((game)=>{
    // Slingshot launch: opposite to the pull direction, with a smooth power curve.
    const physics=window.Physics;
    const originalLaunch=physics.launch.bind(physics);
    physics.launch=(piece,dx,dy)=>{
      const distance=Math.hypot(dx,dy),min=GAME_CONFIG.minDragDistance??.12;
      if(!piece||!piece.alive||piece.team!==game.currentPlayer||distance<min)return false;
      const maxDrag=GAME_CONFIG.maxDragDistance??2.8;
      const normalized=Math.min(1,distance/maxDrag);
      const power=normalized*normalized*(3-2*normalized);
      const scale=distance>.0001?(power*maxDrag)/distance:0;
      const ok=originalLaunch(piece,dx*scale,dy*scale);
      if(!ok)return false;
      piece.moving=true; piece.trail=[]; piece.trailClock=0;
      game.__lastLaunchAt=performance.now(); game.__lastLaunchTeam=piece.team; game.__lastLaunchPiece=piece.id;
      return true;
    };

    let stuckSince=0,lastPhysicsSignature="";
    const forceNextTurn=()=>{
      for(const p of game.pieces){if(p.alive){p.vx=0;p.vy=0;p.moving=false}}
      const previous=game.currentPlayer;
      game.currentPlayer=previous==="white"?"black":"white";
      game.phase="aim"; game.settledFor=0; game.turnTimeLeft=game.turnTime;
      game.selectedPiece=null; game.dragging=false; game.pointer=null; game.powerRatio=0;
      game.activeCollisions.clear(); game.hitPairs.clear();
      game.feedback={text:`${game.currentPlayer.toUpperCase()} TO MOVE`,life:1.0};
      window.UI?.update?.(true);
    };

    // Normal main.js settleTurn remains authoritative. This is only a recovery guard:
    // no shot can leave the game permanently stuck on White.
    setInterval(()=>{
      if(!game||game.gameOver)return;
      if(game.phase!=="physics"){stuckSince=0;lastPhysicsSignature="";return}
      const moving=game.pieces.filter(p=>p.alive&&p.moving);
      const signature=moving.map(p=>`${p.id}:${p.x.toFixed(2)}:${p.y.toFixed(2)}`).join("|");
      if(signature!==lastPhysicsSignature){lastPhysicsSignature=signature;stuckSince=0}
      if(moving.length===0){
        if(!stuckSince)stuckSince=performance.now();
        if(performance.now()-stuckSince>1000){forceNextTurn();stuckSince=0;lastPhysicsSignature=""}
      }else if(game.__lastLaunchAt&&performance.now()-game.__lastLaunchAt>9000){
        forceNextTurn();stuckSince=0;lastPhysicsSignature="";
      }
    },100);
  });

  // Load the actual high-quality 3D chess models after the renderer/game exist.
  const loadAssets=()=>import("./oss_piece_assets.js?v=20260825-3").catch(error=>console.warn("ArChess piece asset loader unavailable",error));
  if("requestIdleCallback"in window)requestIdleCallback(loadAssets,{timeout:1800});else setTimeout(loadAssets,1200);
})();
