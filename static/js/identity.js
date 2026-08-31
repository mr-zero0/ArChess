"use strict";

window.GuestIdentity = (() => {
  const STORAGE_KEY = "archess-guest-id";
  let guestId = null;
  let account = null;

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  async function loadAccount() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.authenticated && data.guestId) {
        account = data;
        guestId = data.guestId;
        window.localStorage.setItem(STORAGE_KEY, guestId);
        return data;
      }
    } catch (_) {}
    return null;
  }

  async function init() {
    await loadAccount();
    if (!guestId) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        guestId = stored || createId();
        window.localStorage.setItem(STORAGE_KEY, guestId);
      } catch (_) {
        guestId = guestId || createId();
      }
    }
    return guestId;
  }

  function getId() { return guestId || createId(); }
  function getAccount() { return account; }

  return Object.freeze({ init, getId, getAccount, loadAccount });
})();

(() => {
  const loadUi = (src, marker) => {
    if (document.querySelector(`script[data-${marker}="1"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.dataset[marker] = "1";
    script.defer = true;
    document.head.appendChild(script);
  };

  const loadRankedAndProgressionUi = () => {
    loadUi("/static/js/ranked_ui.js", "archessRankedUi");
    loadUi("/static/js/progression_ui.js", "archessProgressionUi");
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadRankedAndProgressionUi, { once: true });
  else loadRankedAndProgressionUi();
})();
