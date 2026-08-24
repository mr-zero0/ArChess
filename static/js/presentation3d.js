import * as THREE from "three";

(() => {
  "use strict";
  if (window.__ArChessPresentation3D) return;
  window.__ArChessPresentation3D = true;

  const root = document.documentElement;
  const BOARD = 8;
  const HALF = BOARD / 2;
  const presets = {
    broadcast: { radius: 11.8, yaw: 0.58, pitch: 0.68 },
    top: { radius: 11.5, yaw: 0.0, pitch: 1.48 },
    cinematic: { radius: 10.8, yaw: -0.78, pitch: 0.52 },
  };

  let canvas;
  let renderer;
  let scene;
  let camera;
  let boardGroup;
  let pieceLayer;
  let aimLine;
  let aimGlow;
  let sceneReady = false;
  let game;
  let lastTime = performance.now();
  let yaw = presets.broadcast.yaw;
  let pitch = presets.broadcast.pitch;
  let radius = presets.broadcast.radius;
  let goalYaw = yaw;
  let goalPitch = pitch;
  let goalRadius = radius;
  let draggingCamera = false;
  let lastPointer = null;
  const entries = new Map();

  const palettes = {
    wood: { light: 0xd9bc8f, dark: 0x68452f, frame: 0x2b170d, white: 0xf0e4cf, black: 0x211b18, bg: 0x08090c },
    dark: { light: 0x263b4b, dark: 0x0b1723, frame: 0x05090d, white: 0xd9e6ef, black: 0x202932, bg: 0x05070a },
    light: { light: 0xe7eef2, dark: 0x9db5c2, frame: 0xa8bcc6, white: 0xf7f3e8, black: 0x39434a, bg: 0xe9f0f4 },
  };

  function profile(type) {
    const base = [[0.31,0],[0.31,.05],[.24,.08],[.20,.20],[.16,.33],[.18,.40],[.13,.48]];
    const tops = {
      pawn: [[.20,.55],[.14,.60],[.13,.68],[.17,.74],[.11,.80],[0,.84]],
      rook: [[.25,.52],[.25,.68],[.34,.72],[.34,.80],[0,.80]],
      bishop: [[.16,.53],[.12,.62],[.19,.70],[.12,.78],[.04,.84],[0,.88]],
      queen: [[.19,.54],[.25,.62],[.15,.68],[.22,.74],[.12,.80],[.16,.88],[.04,.94],[0,.98]],
      king: [[.20,.54],[.26,.62],[.16,.68],[.17,.80],[.12,.90],[0,1.02]],
      knight: [[.17,.50],[.22,.58],[.17,.66],[.12,.72],[.06,.78],[0,.80]],
    };
    return base.concat(tops[type] || tops.pawn);
  }

  function lathe(type) { return new THREE.LatheGeometry(profile(type).map(([r,y]) => new THREE.Vector2(r,y)), 28); }

  function makePiece(type, material) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(lathe(type), material);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    if (type === "king") {
      const cross = new THREE.Group();
      const v = new THREE.Mesh(new THREE.BoxGeometry(.11,.25,.08), material);
      const h = new THREE.Mesh(new THREE.BoxGeometry(.20,.08,.08), material);
      v.position.y = 1.10; h.position.y = 1.10;
      v.castShadow = h.castShadow = true;
      cross.add(v,h); group.add(cross);
    }
    if (type === "queen") {
      const crown = new THREE.Group();
      for (let i=0;i<5;i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(.055,12,8), material);
        const a = i / 5 * Math.PI * 2;
        s.position.set(Math.cos(a)*.17,.98,Math.sin(a)*.17); s.castShadow=true; crown.add(s);
      }
      group.add(crown);
    }
    if (type === "rook") {
      for (let i=0;i<4;i++) {
        const a=i*Math.PI/2+Math.PI/4;
        const m=new THREE.Mesh(new THREE.BoxGeometry(.10,.10,.10),material);
        m.position.set(Math.cos(a)*.22,.84,Math.sin(a)*.22); m.castShadow=true; group.add(m);
      }
    }
    if (type === "knight") {
      const shape = new THREE.Shape();
      shape.moveTo(-.16,.05); shape.lineTo(-.08,.48); shape.lineTo(.02,.78); shape.lineTo(.20,.68); shape.lineTo(.27,.46); shape.lineTo(.18,.34); shape.lineTo(.10,.46); shape.lineTo(.02,.28); shape.lineTo(.12,.08); shape.closePath();
      const head = new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2}),material);
      head.position.set(0,.28,-.08); head.rotation.y=-.08; head.castShadow=true; group.add(head);
    }
    return group;
  }

  function material(color, metal=0.08, rough=.42) { return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough}); }

  function setup() {
    canvas = document.createElement("canvas");
    canvas.id = "presentation3dCanvas";
    canvas.setAttribute("aria-hidden","true");
    const wrap = document.getElementById("boardWrap");
    if (!wrap) return false;
    wrap.appendChild(canvas);

    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38,1,.1,100);
    pieceLayer = new THREE.Group();
    boardGroup = new THREE.Group();
    scene.add(boardGroup,pieceLayer);

    buildBoard();
    buildLights();
    buildAim();
    installCamera();
    resize();
    window.addEventListener("resize",resize);
    window.addEventListener("archess:themechange",applyTheme);
    sceneReady = true;
    window.__ArChessThreeD = api;
    document.body.classList.add("archess-3d-active");
    return true;
  }

  function buildBoard() {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.45,.55,9.45),material(0x2b170d,.08,.5));
    frame.position.y=-.28; frame.receiveShadow=true; boardGroup.add(frame); boardGroup.userData.frame=frame;
    const base = new THREE.Mesh(new THREE.BoxGeometry(8.75,.16,8.75),material(0x4a2919,.02,.58));
    base.position.y=-.05; base.receiveShadow=true; boardGroup.add(base);
    const geo = new THREE.BoxGeometry(.995,.09,.995);
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
      const m=material((r+c)%2?0x68452f:0xd9bc8f,.02,.5);
      const tile=new THREE.Mesh(geo,m); tile.position.set(c+0.5-HALF,.055,r+0.5-HALF); tile.receiveShadow=true; boardGroup.add(tile);
    }
    const edge = new THREE.Mesh(new THREE.BoxGeometry(8.85,.18,8.85),material(0x9b6438,.12,.36));
    edge.position.y=.13; boardGroup.add(edge);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(8.45,.10,8.45),material(0x5b351f,.02,.5));
    inner.position.y=.17; boardGroup.add(inner);
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
      const tile=new THREE.Mesh(geo,material((r+c)%2?0x68452f:0xd9bc8f,.02,.5));
      tile.position.set(c+0.5-HALF,.22,r+0.5-HALF); tile.receiveShadow=true; boardGroup.add(tile);
    }
  }

  function buildLights() {
    scene.add(new THREE.HemisphereLight(0xfff3df,0x1c2630,.9));
    const key=new THREE.DirectionalLight(0xffe2bd,3.1); key.position.set(5,10,5); key.castShadow=true; key.shadow.mapSize.set(2048,2048); key.shadow.camera.left=-7; key.shadow.camera.right=7; key.shadow.camera.top=7; key.shadow.camera.bottom=-7; key.shadow.bias=-.00035; scene.add(key);
    const fill=new THREE.DirectionalLight(0x8acfff,1.05); fill.position.set(-6,5,4); scene.add(fill);
    const rim=new THREE.DirectionalLight(0xb68cff,1.25); rim.position.set(-4,4,-7); scene.add(rim);
  }

  function buildAim() {
    const geo=new THREE.BufferGeometry(); geo.setAttribute("position",new THREE.Float32BufferAttribute([0,.18,0,0,.18,0],3));
    aimLine=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x7cecff,transparent:true,opacity:.9})); aimLine.visible=false; scene.add(aimLine);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.38,.48,40),new THREE.MeshBasicMaterial({color:0x79ecff,transparent:true,opacity:.65,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2; ring.visible=false; aimGlow=ring; scene.add(ring);
  }

  function installCamera() {
    const wrap=document.getElementById("boardWrap");
    wrap.addEventListener("contextmenu",e=>e.preventDefault());
    wrap.addEventListener("pointerdown",e=>{ if(e.button!==2) return; draggingCamera=true; lastPointer={x:e.clientX,y:e.clientY}; wrap.setPointerCapture?.(e.pointerId); });
    wrap.addEventListener("pointermove",e=>{ if(!draggingCamera) return; const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y; lastPointer={x:e.clientX,y:e.clientY}; goalYaw-=dx*.008; goalPitch=Math.max(.35,Math.min(1.5,goalPitch+dy*.006)); });
    const stop=()=>{draggingCamera=false;lastPointer=null}; wrap.addEventListener("pointerup",stop); wrap.addEventListener("pointercancel",stop);
    wrap.addEventListener("wheel",e=>{e.preventDefault();goalRadius=Math.max(7.5,Math.min(16,goalRadius+e.deltaY*.008));},{passive:false});
  }

  function setPreset(name) { const p=presets[name]||presets.broadcast; goalYaw=p.yaw; goalPitch=p.pitch; goalRadius=p.radius; }
  function flip(){goalYaw+=Math.PI;}
  function updateCamera(dt){
    const k=1-Math.pow(.001,Math.min(.1,dt)); yaw+= (goalYaw-yaw)*k; pitch+=(goalPitch-pitch)*k; radius+=(goalRadius-radius)*k;
    const y=Math.sin(pitch)*radius, h=Math.cos(pitch)*radius; camera.position.set(Math.sin(yaw)*h,y,Math.cos(yaw)*h); camera.lookAt(0,.15,0);
  }

  function squarePos(x,y){ return {x:x-HALF,z:y-HALF}; }

  function syncPieces(dt) {
    if(!game?.pieces) return;
    const seen=new Set();
    for(const piece of game.pieces){
      seen.add(piece.id);
      let e=entries.get(piece.id);
      if(!e){
        const pal=palettes[root.dataset.theme]||palettes.wood;
        const mat=material(piece.team==="white"?pal.white:pal.black,(piece.team === "white" ? .18 : .48),.28);
        const group=makePiece(piece.type,mat); group.scale.setScalar(piece.radius/.30*1.18); pieceLayer.add(group);
        const halo=new THREE.Mesh(new THREE.RingGeometry(.34,.47,32),new THREE.MeshBasicMaterial({color:piece.team==="white"?0x8defff:0xff7187,transparent:true,opacity:.0,side:THREE.DoubleSide})); halo.rotation.x=-Math.PI/2; halo.position.y=.035; group.add(halo);
        e={piece,group,halo,dead:0,seed:Math.random()*Math.PI*2}; entries.set(piece.id,e);
      }
      e.piece=piece;
      const p=squarePos(piece.x,piece.y);
      const speed=Math.hypot(piece.vx,piece.vy);
      const moving=piece.moving||speed>.18;
      const lift=moving?Math.min(.85,speed/(window.GAME_CONFIG?.maxLaunchSpeed||13.5)*.8):.10;
      const bob=moving?Math.sin(performance.now()*.012+e.seed)*.025:0;
      e.group.position.x += (p.x-e.group.position.x)*Math.min(1,dt*16);
      e.group.position.z += (p.z-e.group.position.z)*Math.min(1,dt*16);
      e.group.position.y += (lift+bob-e.group.position.y)*Math.min(1,dt*13);
      const lean=Math.min(.32,speed*.018); e.group.rotation.x += ((piece.vy>0?1:-1)*lean-e.group.rotation.x)*Math.min(1,dt*9); e.group.rotation.z += ((piece.vx>0?-1:1)*lean-e.group.rotation.z)*Math.min(1,dt*9);
      const selected=game.selectedPiece?.id===piece.id&&game.phase==="aim"; e.halo.material.opacity=(selected ? .62 : 0); if(selected)e.halo.scale.setScalar(1+Math.sin(performance.now()*.008)*.08);
      if(!piece.alive){e.dead+=dt; e.group.rotation.y+=dt*5; e.group.position.y+=dt*.7; e.group.scale.multiplyScalar(Math.max(0,1-dt*2.2)); if(e.dead>.65){pieceLayer.remove(e.group);entries.delete(piece.id);}}
    }
    for(const [id,e] of entries){if(!seen.has(id)&&e.dead<=0){pieceLayer.remove(e.group);entries.delete(id);}}
  }

  function syncAim(){
    const p=game?.selectedPiece; if(!p||!game.dragging||!game.pointer){aimLine.visible=false;aimGlow.visible=false;return;}
    const a=squarePos(p.x,p.y), b=squarePos(game.pointer.x,game.pointer.y); const y=.25; const arr=aimLine.geometry.attributes.position.array; arr[0]=a.x;arr[1]=y;arr[2]=a.z;arr[3]=b.x;arr[4]=y+.04;arr[5]=b.z; aimLine.geometry.attributes.position.needsUpdate=true; aimLine.visible=true; aimGlow.visible=true; aimGlow.position.set(a.x,.26,a.z); aimGlow.scale.setScalar(1+Math.sin(performance.now()*.01)*.06);
  }

  function applyTheme(){
    const pal=palettes[root.dataset.theme]||palettes.wood;
    scene.background=new THREE.Color(pal.bg);
    const tiles=boardGroup.children.filter(x=>x.isMesh&&x.geometry.type==="BoxGeometry");
    let idx=0; for(let r=0;r<8;r++)for(let c=0;c<8;c++){const tile=tiles[idx++];if(tile?.position.y>.15)tile.material.color.setHex((r+c)%2?pal.dark:pal.light);}
    for(const e of entries.values())e.group.traverse(n=>{if(n.isMesh&&n.material?.isMeshStandardMaterial)n.material.color.setHex(e.piece.team==="white"?pal.white:pal.black);});
  }

  function resize(){if(!renderer||!canvas)return;const wrap=document.getElementById("boardWrap");const w=wrap.clientWidth||760,h=wrap.clientHeight||w;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}

  function frame(now){
    if(!sceneReady){requestAnimationFrame(frame);return;}
    const dt=Math.min(.04,(now-lastTime)/1000);lastTime=now; game=window.gameState||game; if(game){syncPieces(dt);syncAim();} updateCamera(dt); renderer.render(scene,camera); requestAnimationFrame(frame);
  }

  const api={setPreset,flip};
  function boot(){
    if(!setup()) return;
    applyTheme();
    const old=document.getElementById("glCanvas"); if(old) old.style.display="none";
    const input=document.getElementById("gameCanvas"); if(input){input.style.opacity="0";input.style.background="transparent";input.style.zIndex="3";}
    requestAnimationFrame(frame);
  }

  function wait(){
    if(window.gameState){boot();return;}
    setTimeout(wait,30);
  }
  wait();
})();
