"use strict";

(() => {
  const panelId = "archessRankedPanel";
  const buttonId = "archessRankedButton";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  async function getJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
      ...options,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function injectStyles() {
    if (document.getElementById("archessRankedStyles")) return;
    const style = document.createElement("style");
    style.id = "archessRankedStyles";
    style.textContent = `
      #${panelId}{position:fixed;top:78px;right:18px;z-index:90;width:min(390px,calc(100vw - 36px));padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(14,18,24,.96);box-shadow:0 18px 50px rgba(0,0,0,.35);backdrop-filter:blur(14px);color:#f5f7fa;font:13px/1.35 system-ui,sans-serif;display:none;max-height:calc(100vh - 96px);overflow:auto}
      #${buttonId}{position:fixed;top:18px;right:18px;z-index:91;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:9px 14px;background:rgba(14,18,24,.86);color:#f5f7fa;cursor:pointer;font:700 12px system-ui,sans-serif;letter-spacing:.08em}
      #${buttonId}:hover{background:rgba(255,255,255,.10)}
      .ar-rank-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .ar-rank-title{font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .ar-rank-sub{opacity:.64;font-size:11px}
      .ar-rank-card{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:12px;border-radius:12px;background:rgba(255,255,255,.05);margin-bottom:12px}
      .ar-rank-tier{font-weight:800;font-size:18px}.ar-rank-mmr{font-size:24px;font-weight:900;text-align:right}
      .ar-rank-meta{opacity:.66;font-size:11px}.ar-rank-provisional{color:#ffbf5b}
      .ar-rank-list{display:grid;gap:5px;margin-top:8px}
      .ar-rank-row{display:grid;grid-template-columns:28px 1fr auto auto;gap:8px;align-items:center;padding:7px 8px;border-radius:9px;background:rgba(255,255,255,.035)}
      .ar-rank-row:nth-child(1){background:rgba(255,191,91,.10)}
      .ar-rank-num{font-weight:800;opacity:.6}.ar-rank-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ar-rank-rating{font-weight:800}.ar-rank-tier-mini{opacity:.62;font-size:10px}
      .ar-rank-error{padding:10px;border-radius:10px;background:rgba(255,90,90,.10);color:#ffb6b6}
      .ar-rank-close{border:0;background:transparent;color:#fff;opacity:.7;cursor:pointer;font-size:18px}
      .ar-prog{padding:12px;border-radius:12px;background:rgba(113,240,162,.06);margin:10px 0}
      .ar-prog-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ar-prog-level{font-size:18px;font-weight:900}.ar-prog-xp{font-size:11px;opacity:.7}
      .ar-prog-bar{height:7px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden;margin:8px 0}.ar-prog-fill{height:100%;background:#71f0a2}
      .ar-cosmetics{display:grid;gap:6px;margin-top:8px}.ar-cosmetic{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;border-radius:9px;background:rgba(255,255,255,.035)}
      .ar-cosmetic-name{font-weight:700}.ar-cosmetic-meta{font-size:10px;opacity:.6}.ar-equip{border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 9px;background:transparent;color:#fff;font-size:10px;cursor:pointer}.ar-equip:disabled{opacity:.45;cursor:default}
    `;
    document.head.appendChild(style);
  }

  function createButton() {
    if (document.getElementById(buttonId)) return;
    const button = document.createElement("button");
    button.id = buttonId;
    button.type = "button";
    button.textContent = "RANKED";
    button.title = "Open ranked standings";
    button.addEventListener("click", async () => {
      const panel = document.getElementById(panelId);
      panel.style.display = panel.style.display === "block" ? "none" : "block";
      if (panel.style.display === "block") await refresh();
    });
    document.body.appendChild(button);
  }

  function createPanel() {
    if (document.getElementById(panelId)) return;
    const panel = document.createElement("section");
    panel.id = panelId;
    panel.setAttribute("aria-label", "Ranked standings and progression");
    panel.innerHTML = `
      <div class="ar-rank-head"><div><div class="ar-rank-title">Ranked + Progression</div><div class="ar-rank-sub">MMR • tier • XP • cosmetics</div></div><button class="ar-rank-close" type="button" aria-label="Close">×</button></div>
      <div id="arRankProfile"></div>
      <div class="ar-rank-sub" style="margin-top:10px">TOP 10</div>
      <div id="arRankList" class="ar-rank-list"></div>
    `;
    panel.querySelector(".ar-rank-close").addEventListener("click", () => { panel.style.display = "none"; });
    document.body.appendChild(panel);
  }

  function renderProgression(progress) {
    if (!progress) return "";
    const percent = Math.max(0, Math.min(100, (Number(progress.xp || 0) / Math.max(1, Number(progress.xpToNextLevel || 1))) * 100));
    const cosmetics = (progress.cosmetics || []).map((item) => {
      const unlocked = Boolean(item.owned);
      const equipped = Boolean(item.equipped);
      return `<div class="ar-cosmetic"><div><div class="ar-cosmetic-name">${escapeHtml(item.name)}</div><div class="ar-cosmetic-meta">${escapeHtml(item.category)} • unlock Lv ${escapeHtml(item.unlock_level)}</div></div><button class="ar-equip" data-cosmetic-id="${escapeHtml(item.id)}" ${unlocked && !equipped ? "" : "disabled"}>${equipped ? "EQUIPPED" : unlocked ? "EQUIP" : "LOCKED"}</button></div>`;
    }).join("");
    return `<div class="ar-prog"><div class="ar-prog-head"><div><div class="ar-prog-level">Level ${escapeHtml(progress.level)}</div><div class="ar-rank-meta">${escapeHtml(progress.ownedCosmetics?.length || 0)} cosmetics owned</div></div><div class="ar-prog-xp">${escapeHtml(progress.xp)} / ${escapeHtml(progress.xpToNextLevel)} XP</div></div><div class="ar-prog-bar"><div class="ar-prog-fill" style="width:${percent}%"></div></div><div class="ar-cosmetics">${cosmetics}</div></div>`;
  }

  async function refresh() {
    const profile = document.getElementById("arRankProfile");
    const list = document.getElementById("arRankList");
    profile.innerHTML = "<div class='ar-rank-meta'>Loading ranked data…</div>";
    list.innerHTML = "";
    try {
      const guestId = window.GuestIdentity?.getId?.();
      const [board, me] = await Promise.all([
        getJson("/api/ranked/leaderboard?limit=10"),
        guestId ? getJson(`/api/ranked/profile/${encodeURIComponent(guestId)}`) : Promise.resolve(null),
      ]);
      if (me) {
        const p = me.progression;
        profile.innerHTML = `
          <div class="ar-rank-card">
            <div><div class="ar-rank-tier">${escapeHtml(me.tier)}</div><div class="ar-rank-meta">${me.provisional ? "Placement matches in progress" : "Ranked rating"}</div></div>
            <div class="ar-rank-mmr">${escapeHtml(me.mmr)}</div>
            <div class="ar-rank-meta">${escapeHtml(me.matchesPlayed)} matches • ${escapeHtml(me.wins)}W / ${escapeHtml(me.losses)}L</div>
            <div class="ar-rank-meta ar-rank-provisional">${me.provisional ? "PROVISIONAL" : "RATED"}</div>
          </div>${renderProgression(p)}`;
      }
      list.innerHTML = board.items.map((entry) => `
        <div class="ar-rank-row">
          <div class="ar-rank-num">#${escapeHtml(entry.rank)}</div>
          <div class="ar-rank-name">${escapeHtml(entry.guestId)}</div>
          <div class="ar-rank-tier-mini">${escapeHtml(entry.tier)}</div>
          <div class="ar-rank-rating">${escapeHtml(entry.mmr)}</div>
        </div>`).join("") || "<div class='ar-rank-meta'>No ranked matches yet.</div>";

      if (guestId) {
        profile.querySelectorAll(".ar-equip").forEach((button) => {
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              await getJson("/api/progression/equip", {
                method: "POST",
                body: JSON.stringify({ guestId, cosmeticId: button.dataset.cosmeticId }),
              });
              await refresh();
            } catch (error) {
              console.warn("ArChess cosmetic equip:", error);
              button.disabled = false;
            }
          });
        });
      }
    } catch (error) {
      profile.innerHTML = `<div class="ar-rank-error">Ranked/progression data unavailable right now.</div>`;
      list.innerHTML = "";
      console.warn("ArChess ranked panel:", error);
    }
  }

  function init() {
    if (!document.body) return;
    injectStyles();
    createButton();
    createPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
