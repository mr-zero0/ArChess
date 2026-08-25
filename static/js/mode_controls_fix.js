(() => {
  "use strict";
  if (window.__ArChessModeControlsFix) return;
  window.__ArChessModeControlsFix = true;

  function install() {
    const group = document.querySelector(".aps-mode-group");
    const oldButtons = group?.querySelectorAll?.("[data-archess-mode]");
    if (!group || !oldButtons?.length || !window.ArChessProfessionalUI) return false;

    const modes = ["2d", "3d"];
    const current = [...oldButtons];
    const replacement = document.createElement("div");
    replacement.className = "aps-native-mode-group";
    replacement.setAttribute("role", "group");
    replacement.setAttribute("aria-label", "Render mode");

    for (const mode of modes) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.archessMode = mode;
      button.textContent = mode.toUpperCase();
      button.setAttribute("aria-pressed", String(window.ArChessProfessionalUI.state.mode === mode));
      button.addEventListener("click", () => window.ArChessProfessionalUI.applyMode(mode));
      replacement.appendChild(button);
    }

    group.replaceWith(replacement);
    const sync = () => replacement.querySelectorAll("[data-archess-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.archessMode === window.ArChessProfessionalUI.state.mode));
    });
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-render-mode", "class"], subtree: false });
    sync();
    window.__ArChessModeButtons = { sync };
    return true;
  }

  const started = performance.now();
  const poll = () => { if (install() || performance.now() - started > 12000) return; setTimeout(poll, 20); };
  poll();
})();
