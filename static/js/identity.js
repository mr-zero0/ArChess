"use strict";

window.GuestIdentity = (() => {
  const STORAGE_KEY = "archess-guest-id";
  let guestId = null;

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function init() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      guestId = stored || createId();
      window.localStorage.setItem(STORAGE_KEY, guestId);
    } catch (_) {
      guestId = guestId || createId();
    }
    return guestId;
  }

  function getId() {
    return guestId || init();
  }

  return Object.freeze({ init, getId });
})();

(() => {
  const loadUi = (name, src, marker) => {
    if (document.querySelector(`script[data-${marker}="1"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.dataset[marker] = "1";
    script.defer = true;
    document.head.appendChild(script);
  };

  const loadRankedAndProgressionUi = () => {
    loadUi("ranked", "/static/js/ranked_ui.js", "archessRankedUi");
    loadUi("progression", "/static/js/progression_ui.js", "archessProgressionUi");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadRankedAndProgressionUi, { once: true });
  } else {
    loadRankedAndProgressionUi();
  }
})();
