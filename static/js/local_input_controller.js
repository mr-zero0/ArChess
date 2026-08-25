(() => {
  "use strict";
  if (window.__ArChessLocalInputController) return;
  window.__ArChessLocalInputController = true;

  const SIZE = 8;
  const boot = (install) => {
    const started = performance.now();
    const tick = () => {
      if (window.gameState && window.Physics && window.GAME_CONFIG) return install();
      if (performance.now() - started < 12000) setTimeout(tick, 40);
    };
    tick();
  };
  const pointFromEvent = (canvas, event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(SIZE, (event.clientX - rect.left) / rect.width * SIZE)), y: Math.max(0, Math.min(SIZE, (event.clientY - rect.top) / rect.height * SIZE)) };
  };

  function ensureTrajectory(wrap) {
    let overlay = document.getElementById("trajectoryCanvas");
    if (overlay && overlay.parentElement === wrap) return overlay;
    overlay?.remove();
    overlay = document.createElement("canvas");
    overlay.id = "trajectoryCanvas";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:7;pointer-events:none;mix-blend-mode:screen;display:block";
    wrap.appendChild(overlay);
    const ctx = overlay.getContext("2d");
    let width = 0, height = 0, dpr = 1;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const nextDpr = Math.min(2, window.devicePixelRatio || 1);
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;
      width = nextWidth; height = nextHeight; dpr = nextDpr;
      overlay.width = Math.max(1, Math.round(width * dpr));
      overlay.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const toScreen = (x, y) => ({ x: x / SIZE * width, y: y / SIZE * height });
    window.__ArChessTrajectoryDraw = () => {
      resize(); ctx.clearRect(0, 0, width, height);
      const game = window.gameState, piece = game?.selectedPiece, pointer = game?.pointer;
      if (!game?.dragging || !piece || !pointer || game.phase !== "aim") return;
      const dx = piece.x - pointer.x, dy = piece.y - pointer.y, distance = Math.hypot(dx, dy);
      const ratio = Math.min(1, distance / (GAME_CONFIG.maxDragDistance || 2.6));
      const eased = ratio * ratio * (3 - 2 * ratio);
      const speed = eased * (GAME_CONFIG.maxLaunchSpeed || 13.5) * (piece.launchMul ?? 1);
      const mag = Math.max(0.0001, distance);
      let vx = dx / mag * speed, vy = dy / mag * speed, x = piece.x, y = piece.y;
      const points = [], dt = 1 / 36, friction = piece.friction ?? GAME_CONFIG.friction ?? 0.985;
      const origin = toScreen(piece.x, piece.y), cursor = toScreen(pointer.x, pointer.y);
      ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.setLineDash([9,7]); ctx.lineWidth=2.5; ctx.strokeStyle=`rgba(105,231,255,${0.45+ratio*0.45})`;
      ctx.beginPath(); ctx.moveTo(origin.x,origin.y); ctx.lineTo(cursor.x,cursor.y); ctx.stroke(); ctx.setLineDash([]);
      for(let i=0;i<110;i+=1){
        x += vx*dt; y += vy*dt; const radius=piece.radius||0.28;
        if(x<radius||x>SIZE-radius){x=Math.max(radius,Math.min(SIZE-radius,x));vx*=-(piece.restitution??GAME_CONFIG.bounceFactor??0.82)}
        if(y<radius||y>SIZE-radius){y=Math.max(radius,Math.min(SIZE-radius,y));vy*=-(piece.restitution??GAME_CONFIG.bounceFactor??0.82)}
        points.push({x,y}); const decay=Math.pow(friction,dt*60); vx*=decay; vy*=decay;
        if(Math.hypot(vx,vy)<(GAME_CONFIG.minVelocity||0.18))break;
      }
      ctx.lineWidth=2; ctx.strokeStyle=`rgba(150,124,255,${0.35+ratio*0.50})`; ctx.beginPath();
      points.forEach((p,i)=>{const s=toScreen(p.x,p.y);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y)}); ctx.stroke();
      for(let i=0;i<points.length;i+=7){const s=toScreen(points[i].x,points[i].y);ctx.fillStyle=`rgba(190,245,255,${0.60-(i/Math.max(1,points.length))*0.40})`;ctx.beginPath();ctx.arc(s.x,s.y,Math.max(1.5,3.4-i*.012),0,Math.PI*2);ctx.fill()}
      if(points.length){const s=toScreen(points.at(-1).x,points.at(-1).y);ctx.strokeStyle="rgba(255,214,117,.82)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,8+ratio*7,0,Math.PI*2);ctx.stroke()}
      const label=`${Math.round(ratio*100)}% POWER`,lx=Math.max(8,Math.min(width-100,cursor.x+14)),ly=Math.max(24,Math.min(height-8,cursor.y-10));
      ctx.fillStyle="rgba(6,10,16,.90)";ctx.strokeStyle="rgba(120,231,255,.36)";ctx.beginPath();ctx.roundRect(lx,ly-19,92,26,8);ctx.fill();ctx.stroke();ctx.fillStyle="#ecfbff";ctx.font="800 10px Inter,system-ui,sans-serif";ctx.fillText(label,lx+10,ly-2);ctx.restore();
    };
    const loop=()=>{window.__ArChessTrajectoryDraw?.();requestAnimationFrame(loop)}; requestAnimationFrame(loop);
    window.addEventListener("resize",window.__ArChessTrajectoryDraw,{passive:true});
    return overlay;
  }

  function install() {
    const oldCanvas=document.getElementById("gameCanvas"), wrap=document.getElementById("boardWrap"), game=window.gameState;
    if(!oldCanvas||!wrap||!game) return;
    const canvas=oldCanvas.cloneNode(false); canvas.id="gameCanvas"; canvas.dataset.inputV2="1"; canvas.style.pointerEvents="auto"; canvas.style.touchAction="none"; canvas.style.opacity="0"; oldCanvas.replaceWith(canvas);
    const trajectory=ensureTrajectory(wrap);
    let pointerId=null, selected=null;
    const findPiece=point=>{let best=null,bestDistance=Infinity;for(const piece of game.pieces){if(!piece.alive||piece.team!==game.currentPlayer)continue;const d=Math.hypot(piece.x-point.x,piece.y-point.y),hitRadius=Math.max(piece.radius*1.65,.40);if(d<=hitRadius&&d<bestDistance){best=piece;bestDistance=d}}return best};
    canvas.addEventListener("pointerdown",event=>{
      if(event.button!==0||game.gameOver||game.phase!=="aim")return; const point=pointFromEvent(canvas,event),piece=findPiece(point); if(!piece)return;
      event.preventDefault(); pointerId=event.pointerId; selected=piece; game.selectedPiece=piece; game.dragging=true; game.pointer=point; game.powerRatio=0; ensureTrajectory(wrap); canvas.setPointerCapture?.(pointerId); window.AudioManager?.unlock?.(); window.AudioManager?.select?.(); window.UI?.update?.();
    });
    canvas.addEventListener("pointermove",event=>{if(event.pointerId!==pointerId||!selected)return;event.preventDefault();const point=pointFromEvent(canvas,event);game.pointer=point;game.powerRatio=Math.min(1,Math.hypot(selected.x-point.x,selected.y-point.y)/(GAME_CONFIG.maxDragDistance||2.6));window.AudioManager?.pull?.(game.powerRatio);window.__ArChessTrajectoryDraw?.();window.UI?.update?.()});
    canvas.addEventListener("pointerup",event=>{
      if(event.pointerId!==pointerId||!selected)return;event.preventDefault();const point=pointFromEvent(canvas,event),piece=selected,dx=piece.x-point.x,dy=piece.y-point.y,distance=Math.hypot(dx,dy),maxDrag=GAME_CONFIG.maxDragDistance||2.6;
      pointerId=null;selected=null;game.dragging=false;game.selectedPiece=null;game.pointer=null;canvas.releasePointerCapture?.(event.pointerId);window.__ArChessTrajectoryDraw?.();
      if(distance<(GAME_CONFIG.minDragDistance||.12)){game.powerRatio=0;game.feedback={text:"Pull farther to launch.",life:1};window.UI?.update?.(true);return}
      const ratio=Math.min(1,distance/maxDrag),eased=ratio*ratio*(3-2*ratio),scale=eased*maxDrag/Math.max(distance,.0001);
      if(!window.Physics.launch(piece,dx*scale,dy*scale)){game.feedback={text:"Launch rejected.",life:1.2};game.powerRatio=0;window.UI?.update?.(true);return}
      game.phase="physics";game.settledFor=0;game.powerRatio=0;game.combo=0;game.comboTimer=0;game.maxCombo=0;game.__turnStartedAt=performance.now();
      if(game.stats?.[piece.team])game.stats[piece.team].launches+=1;
      const message=`${piece.team[0].toUpperCase()+piece.team.slice(1)} ${window.PIECES?.[piece.type]?.name||piece.type} launched.`;game.history.push(message);window.UI?.log?.(message);window.AudioManager?.launch?.(ratio);window.UI?.update?.(true);
    });
    canvas.addEventListener("pointercancel",()=>{pointerId=null;selected=null;game.dragging=false;game.selectedPiece=null;game.pointer=null;game.powerRatio=0;window.__ArChessTrajectoryDraw?.();window.UI?.update?.()});
    document.body.classList.add("archess-input-v2");
  }
  boot(install);
})();
