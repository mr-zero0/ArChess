(() => {
  "use strict";
  if (window.__ArChessModeControlsFix) return;
  window.__ArChessModeControlsFix = true;

  const getApi = () => window.ArChessProfessionalShell || window.ArChessProfessionalUI || null;
  const getMode = () => getApi()?.getState?.().mode || document.body.dataset.renderMode || "2d";

  function sync(group) {
    const current = getMode();
    group.querySelectorAll("[data-archess-mode]").forEach((button) => {
      const active = button.dataset.archessMode === current;
      button.setAttribute("aria-pressed", String(active));
      button.removeAttribute("disabled");
      button.style.pointerEvents = "auto";
      button.style.background = active ? "color-mix(in srgb,var(--archess-accent) 18%,rgba(10,14,20,.92))" : "transparent";
      button.style.color = active ? "#fff" : "#7f8b9d";
    });
  }

  function install() {
    const shell = document.querySelector("#archessProfessionalShell");
    const api = getApi();
    if (!shell || !api) return false;

    let group = shell.querySelector(".aps-native-mode-group");
    if (!group) {
      const source = shell.querySelector(".aps-mode-group");
      group = document.createElement("div");
      group.className = "aps-native-mode-group";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Render mode");
      group.style.cssText = "display:inline-flex;align-items:center;padding:3px;gap:3px;border:1px solid var(--archess-border,rgba(255,255,255,.1));border-radius:11px;background:rgba(255,255,255,.035);position:relative;z-index:200;pointer-events:auto;";
      for (const mode of ["2d", "3d"]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.archessMode = mode;
        button.textContent = mode.toUpperCase();
        button.style.cssText = "min-width:48px;height:27px;border:0;border-radius:8px;background:transparent;color:#7f8b9d;font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;pointer-events:auto;position:relative;z-index:201;";
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          api.applyMode?.(mode);
          sync(group);
        });
        group.appendChild(button);
      }
      if (source) source.replaceWith(group);
      else shell.querySelector(".aps-center-controls")?.prepend(group);
    }

    sync(group);
    return true;
  }

  const started = performance.now();
  const poll = () => {
    if (install()) return;
    if (performance.now() - started < 15000) setTimeout(poll, 25);
  };
  poll();
})();
