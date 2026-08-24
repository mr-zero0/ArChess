"use strict";

(() => {
  const panelId = "archessProgressionPanel";
  const buttonId = "archessProgressionButton";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  async function getJson(url, options) {
    const response = await fetch(url, {
      headers: { Accept: "application/json", ...(options?.headers || {}) },
      ...options,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function injectStyles() {
    if (document.getElementById("archessProgressionStyles")) return;
    const style = document.createElement("style");
    style.id = "archessProgressionStyles";
    style.textContent = `
      #${panelId}{position:fixed;top:78px;left:18px;z-index:90;width:min(390px,calc(100vw - 36px));max-height:calc(100vh - 96px);overflow:auto;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(14,18,24,.97);box-shadow:0 18px 50px rgba(0,0,0,.35);backdrop-filter:blur(14px);color:#f5f7fa;font:13px/1.35 system-ui,sans-serif;display:none}
      #${buttonId}{position:fixed;top:18px;left:18px;z-index:91;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:9px 14px;background:rgba(14,18,24,.86);color:#f5f7fa;cursor:pointer;font:700 12px system-ui,sans-serif;letter-spacing:.08em}
      .ar-prog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.ar-prog-title{font-weight:800;letter-spacing:.08em;text-transform:uppercase}.ar-prog-sub{opacity:.64;font-size:11px}.ar-prog-meter{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:8px}.ar-prog-meter>i{display:block;height:100%;background:#71f0a2}.ar-prog-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}.ar-prog-stat{padding:10px;border-radius:10px;background:rgba(255,255,255,.05)}.ar-prog-value{font-size:20px;font-weight:900}.ar-prog-items{display:grid;gap:7px;margin-top:10px}.ar-prog-item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:9px;border-radius:10px;background:rgba(255,255,255,.035)}.ar-prog-item.locked{opacity:.52}.ar-prog-item button{border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px 10px;background:rgba(255,255,255,.07);color:#fff;cursor:pointer}.ar-prog-item button:disabled{cursor:default;opacity:.45}.ar-prog-equipped{font-size:10px;opacity:.7;text-transform:uppercase}.ar-prog-close{border:0;background:transparent;color:#fff;opacity:.7;cursor:pointer;font-size:18px}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    if (document.getElementById(panelId)) return;
    const panel = document.createElement("section");
    panel.id = panelId;
    panel.setAttribute("aria-label", "Progression and cosmetics");
    panel.innerHTML = `
      <div class="ar-prog-head"><div><div class="ar-prog-title">Progression</div><div class="ar-prog-sub">XP • levels • cosmetics</div></div><button class="ar-prog-close" type="button" aria-label="Close">×</button></div>
      <div id="arProgProfile"></div><div id="arProgItems" class="ar-prog-items"></div>
    `;
    panel.querySelector(".ar-prog-close").addEventListener("click", () => { panel.style.display = "none"; });
    document.body.appendChild(panel);
  }

  async function equip(cosmeticId) {
    const guestId = window.GuestIdentity?.getId?.();
    if (!guestId) return;
    await getJson("/api/progression/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, cosmeticId }),
    });
    await refresh();
  }

  async function refresh() {
    const profile = document.getElementById("arProgProfile");
    const items = document.getElementById("arProgItems");
    profile.innerHTML = "<div class='ar-prog-sub'>Loading progression…</div>";
    items.innerHTML = "";
    try {
      const guestId = window.GuestIdentity?.getId?.();
      if (!guestId) throw new Error("missing guest identity");
      const data = await getJson(`/api/progression/profile/${encodeURIComponent(guestId)}`);
      const progress = data.xpToNextLevel > 0 ? Math.min(100, Math.round((data.xp / data.xpToNextLevel) * 100)) : 0;
      profile.innerHTML = `
        <div class="ar-prog-grid">
          <div class="ar-prog-stat"><div class="ar-prog-sub">LEVEL</div><div class="ar-prog-value">${escapeHtml(data.level)}</div></div>
          <div class="ar-prog-stat"><div class="ar-prog-sub">XP</div><div class="ar-prog-value">${escapeHtml(data.xp)}</div></div>
        </div>
        <div class="ar-prog-sub">${escapeHtml(data.xp)} / ${escapeHtml(data.xpToNextLevel)} XP to next level</div>
        <div class="ar-prog-meter"><i style="width:${progress}%"></i></div>
      `;
      items.innerHTML = data.cosmetics.map((item) => `
        <div class="ar-prog-item ${item.owned ? "" : "locked"}">
          <div><strong>${escapeHtml(item.name)}</strong><div class="ar-prog-sub">${escapeHtml(item.description)} • unlock level ${escapeHtml(item.unlock_level)}</div>${item.equipped ? '<div class="ar-prog-equipped">Equipped</div>' : ''}</div>
          <button type="button" data-cosmetic="${escapeHtml(item.id)}" ${item.owned && !item.equipped ? "" : "disabled"}>${item.equipped ? "EQUIPPED" : item.owned ? "EQUIP" : "LOCKED"}</button>
        </div>`).join("");
      items.querySelectorAll("button[data-cosmetic]").forEach((button) => {
        button.addEventListener("click", async () => {
          button.disabled = true;
          try { await equip(button.dataset.cosmetic); } catch (error) { console.warn("ArChess progression:", error); button.disabled = false; }
        });
      });
    } catch (error) {
      profile.innerHTML = "<div class='ar-prog-sub'>Progression data unavailable right now.</div>";
    }
  }

  function init() {
    if (!document.body) return;
    injectStyles();
    if (!document.getElementById(buttonId)) {
      const button = document.createElement("button");
      button.id = buttonId;
      button.type = "button";
      button.textContent = "PROGRESSION";
      button.addEventListener("click", async () => {
        const panel = document.getElementById(panelId);
        panel.style.display = panel.style.display === "block" ? "none" : "block";
        if (panel.style.display === "block") await refresh();
      });
      document.body.appendChild(button);
    }
    createPanel();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
