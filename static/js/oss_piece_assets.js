import * as THREE from "three";

(() => {
  "use strict";
  if (window.__ArChessOSSAssets) return;
  window.__ArChessOSSAssets = true;
  const ASSET_URL = "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/ABeautifulGame/glTF-Binary-KTX-ETC1S-Draco/ABeautifulGame.glb";
  const PIECE_NAMES = { king:{white:"King_W",black:"King_B"}, queen:{white:"Queen_W",black:"Queen_B"}, rook:{white:"Castle_W1",black:"Castle_B1"}, knight:{white:"Knight_W1",black:"Knight_B1"}, bishop:{white:"Bishop_W1",black:"Bishop_B1"}, pawn:{white:"Pawn_Body_W1",black:"Pawn_Body_B1"} };
  const TARGET_HEIGHT = {pawn:.62,rook:.78,knight:.86,bishop:.9,queen:1.0,king:1.08};
  const wait = (fn) => { let tries=0; const timer=setInterval(()=>{ if(fn() || ++tries>240) clearInterval(timer); },100); };

  async function load() {
    try {
      const { GLTFLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/loaders/GLTFLoader.js");
      const loader = new GLTFLoader();
      loader.setCrossOrigin?.("anonymous");
      const gltf = await new Promise((resolve,reject)=>loader.load(ASSET_URL,resolve,undefined,reject));
      const models={};
      for(const [type,teams] of Object.entries(PIECE_NAMES)) for(const [team,name] of Object.entries(teams)) {
        const source=gltf.scene.getObjectByName(name); if(!source) continue;
        const clone=source.clone(true);
        clone.traverse(node=>{ if(!node.isMesh) return; node.castShadow=true; node.receiveShadow=true; if(node.material?.clone) node.material=node.material.clone(); });
        models[`${team}:${type}`]=clone;
      }
      window.__ArChessOSSModels=models;
      apply(models);
      document.documentElement.dataset.ossPieces="ready";
    } catch(error) {
      console.warn("ArChess OSS piece pack unavailable; procedural pieces remain active.",error);
      document.documentElement.dataset.ossPieces="fallback";
    }
  }

  function apply(models) {
    const scene=window.__ArChessThreeD, state=window.gameState;
    if(!scene||!state||!scene.entries) return false;
    for(const entry of scene.entries.values()) {
      const piece=entry.piece, source=models[`${piece.team}:${piece.type}`];
      if(!source||entry.__ossModel) continue;
      const model=source.clone(true);
      const box=new THREE.Box3().setFromObject(model), size=new THREE.Vector3(); box.getSize(size);
      const height=Math.max(.001,size.y), target=TARGET_HEIGHT[piece.type]||.8;
      model.scale.setScalar(target/height);
      const after=new THREE.Box3().setFromObject(model);
      model.position.y-=after.min.y;
      model.position.x-=(after.min.x+after.max.x)*.5;
      model.position.z-=(after.min.z+after.max.z)*.5;
      model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
      for(const child of [...entry.group.children]) if(child!==entry.shadow&&child!==entry.glow) entry.group.remove(child);
      entry.group.add(model); entry.__ossModel=model;
    }
    return true;
  }

  function boot(){
    wait(()=>{const ready=Boolean(window.__ArChessThreeD&&window.gameState); if(ready) apply(window.__ArChessOSSModels||{}); return ready;});
    const start=()=>load();
    if("requestIdleCallback" in window) requestIdleCallback(start,{timeout:2200}); else setTimeout(start,1800);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
