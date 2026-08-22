"use strict";

window.MatchHistory = (() => {
  const STORAGE_KEY = "archess-match-history";
  const MAX_MATCHES = 20;
  let matches = [];

  function load() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(stored)) matches = stored.slice(0, MAX_MATCHES);
    } catch (_) {
      matches = [];
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    } catch (_) {
      // History remains available for this session when storage is unavailable.
    }
  }

  function init() {
    load();
    return getAll();
  }

  function record(result) {
    const entry = {
      id: GuestIdentity.getId(),
      winner: result.winner,
      doubleKO: Boolean(result.doubleKO),
      mode: result.mode || "match",
      turns: Number(result.turns) || 0,
      completedAt: new Date().toISOString(),
    };
    matches = [entry, ...matches].slice(0, MAX_MATCHES);
    save();
    return { ...entry };
  }

  function getAll() {
    return matches.map((match) => ({ ...match }));
  }

  function render(container) {
    if (!container) return;
    container.replaceChildren();
    if (matches.length === 0) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = "No completed local matches yet.";
      container.appendChild(empty);
      return;
    }
    matches.forEach((match) => {
      const row = document.createElement("div");
      row.className = "match-history-row";
      const result = document.createElement("strong");
      result.textContent = `${match.winner.toUpperCase()} WINS`;
      const detail = document.createElement("span");
      detail.textContent = `${match.mode} · ${match.turns} turns · ${new Date(match.completedAt).toLocaleDateString()}`;
      row.append(result, detail);
      container.appendChild(row);
    });
  }

  function clear() {
    matches = [];
    save();
  }

  function exportData() {
    const payload = JSON.stringify({ guestId: GuestIdentity.getId(), matches: getAll() }, null, 2);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    link.download = "archess-match-history.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    const objectUrl = link.href;
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return Object.freeze({ init, record, getAll, render, clear, exportData });
})();
