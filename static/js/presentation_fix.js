(() => {
  "use strict";
  if (window.__ArChessPresentationFix) return;
  window.__ArChessPresentationFix = true;

  const state = {
    preset: "broadcast",
    cinematic: false,
  };

  function addControls() {
    if (document.getElementById("presentationControls")) return;
    const el = document.createElement("div");
    el.id = "presentationControls";
    el.className = "presentation-controls";
    el.innerHTML = `
      <span class="presentation-label">CAMERA</span>
      <button type="button" data-camera="broadcast">BROADCAST</button>
      <button type="button" data-camera="top">TOP</button>
      <button type="button" data-camera="cinematic">CINEMATIC</button>
      <button type="button" data-camera="flip" aria-label="Flip camera">↻</button>`;
    document.body.appendChild(el);
    el.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-camera]");
      if (!button || !window.__ArChessThreeD) return;
      const mode = button.dataset.camera;
      if (mode === "flip") window.__ArChessThreeD.flip();
      else window.__ArChessThreeD.setPreset(mode);
      el.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    });
  }

  function suppressLegacyPresentation() {
    document.body.classList.add("archess-presentation-clean");
    [".left-panel", ".right-panel", ".topbar"].forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => node.setAttribute("aria-hidden", "true"));
    });
  }

  function boot() {
    suppressLegacyPresentation();
    addControls();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
