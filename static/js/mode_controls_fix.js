(() => {
  "use strict";
  if (window.__ArChessModeControlsFix) return;
  window.__ArChessModeControlsFix = true;

  function install() {
    const group = document.querySelector(".aps-mode-group");
    if (!group || !window.ArChessProfessionalUI) return false;

    const replacement = document.createElement("div");
    replacement.className = "aps-native-mode-group";
    replacement.setAttribute("role", "group");
    replacement.setAttribute("aria-label", "Render mode");
    replacement.style.cssText = "display:inline-flex;align-items:center;padding:3px;gap:3px;border:1px solid var(--archess-border,rgba(255,255,255,.1));border-radius:11px;background:rgba(255,255,255,.035);";

    for (const mode of ["2d", "3d"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.archessMode = mode;
      button.textContent = mode.toUpperCase();
      button.setAttribute("aria-pressed", String(window.ArChessProfessionalUI.state.mode === mode));
      button.style.cssText = "min-width:48px;height:27px;border:0;border-radius:8px;background:transparent;color:#7f8b9d;font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;transition:background .12s ease,color .12s ease,box-shadow .12s ease;";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.ArChessProfessionalUI.applyMode(mode);
        sync();
      });
      replacement.appendChild(button);
    }

    group.replaceWith(replacement);
    function sync() {
      replacement.querySelectorAll("[data-archess-mode]").forEach((button) => {
        const active = button.dataset.archessMode === window.ArChessProfessionalUI.state.mode;
        button.setAttribute("aria-pressed", String(active));
        button.disabled = false;
        button.style.background = active ? "color-mix(in srgb,var(--archess-accent) 18%,rgba(10,14,20,.92))" : "transparent";
        button.style.color = active ? "#fff" : "#7f8b9d";
        button.style.boxShadow = active ? "inset 0 0 0 1px color-mix(in srgb,var(--archess-accent) 35%,transparent),0 6px 18px color-mix(in srgb,var(--archess-accent) 9%,transparent)" : "none";
      });
    }
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-render-mode", "class"] });
    window.__ArChessModeButtons = { sync };
    return true;
  }

  const started = performance.now();
  const poll = () => { if (install() || performance.now() - started > 12000) return; setTimeout(poll, 20); };
  poll();
})();
