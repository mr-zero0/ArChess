"use strict";

// First-time interactive tutorial for ArChess (STEP 7).
// A non-blocking bottom card walks the player through select → aim → launch →
// chain reactions → win condition. Steps with a `when` predicate auto-advance as
// soon as the player performs the corresponding real action on the board.
// The card is pointer-transparent except its buttons, so it never blocks board
// interaction (and never disturbs headless verification that clicks the canvas).

window.TutorialManager = (() => {
  const STORAGE_KEY = "archess-tutorial-v2";

  const STEPS = [
    {
      title: "Welcome to ArChess",
      body: "This is physics chess. Every piece is a projectile. Select a living WHITE piece, then drag it backward to aim.",
      cta: "NEXT",
    },
    {
      title: "Aim & charge power",
      body: "Hold and drag backward from the piece. The further you drag, the more power. The dashed line and arrow show the launch direction.",
      when: (game) => game.dragging && game.powerRatio >= 0.15,
    },
    {
      title: "Release to launch",
      body: "Let go and the piece fires opposite your drag. Impacts damage both pieces — watch the chain reactions.",
      when: (game) => game.phase === "physics",
    },
    {
      title: "Chain reactions & friendly fire",
      body: "Every collision deals damage, including to your own pieces. The turn changes once everything settles.",
      when: (game) => game.phase === "aim" && game.currentPlayer === "black",
    },
    {
      title: "Win condition",
      body: "There is no check or checkmate. Reduce the enemy King to 0 HP to win. Good luck!",
      cta: "DONE",
    },
  ];

  let current = -1;
  let dwell = 0;
  let satisfied = false;
  let nodes = null;

  function visible() {
    return current >= 0;
  }

  function render() {
    if (!nodes || current < 0) return;
    const step = STEPS[current];
    nodes.card.classList.remove("hidden");
    nodes.title.textContent = step.title;
    nodes.body.textContent = step.body;
    nodes.nextBtn.classList.toggle("hidden", Boolean(step.when));
    nodes.nextBtn.textContent = step.cta || "NEXT";
    nodes.dots.replaceChildren();
    STEPS.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = "tutorial-dot" + (i === current ? " active" : "");
      nodes.dots.appendChild(dot);
    });
  }

  function advance() {
    if (current < 0) return;
    if (current >= STEPS.length - 1) {
      finish();
      return;
    }
    current += 1;
    dwell = 0;
    satisfied = false;
    render();
  }

  function start() {
    if (!nodes) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // Replay remains available for this session without storage.
    }
    current = 0;
    dwell = 0;
    satisfied = false;
    render();
  }

  function finish() {
    if (current < 0) return;
    current = -1;
    try {
      window.localStorage.setItem(STORAGE_KEY, "done");
    } catch (_) {
      // Tutorial still hides for this session without storage.
    }
    nodes.card.classList.add("hidden");
  }

  function tick(game) {
    if (current < 0) return;
    const step = STEPS[current];
    if (!step.when) return;
    // Latch once the action is observed so a transient state (drag release,
    // physics phase) that flips back between frames still advances the step.
    if (step.when(game)) satisfied = true;
    if (satisfied) {
      dwell += 1 / 60;
      if (dwell > 0.5) advance();
    }
  }

  function init(game) {
    nodes = {
      card: document.getElementById("tutorialCard"),
      title: document.getElementById("tutorialTitle"),
      body: document.getElementById("tutorialBody"),
      dots: document.getElementById("tutorialDots"),
      nextBtn: document.getElementById("tutorialNext"),
      skipBtn: document.getElementById("tutorialSkip"),
    };
    if (!nodes.card) return;

    nodes.nextBtn.addEventListener("click", advance);
    nodes.skipBtn.addEventListener("click", finish);

    let done = false;
    try {
      done = window.localStorage.getItem(STORAGE_KEY) === "done";
    } catch (_) {
      // Defaults to showing the tutorial when storage is unavailable.
    }
    if (!done) {
      window.setTimeout(() => {
        const openModal = document.querySelector(".modal:not(.hidden)");
        if (!openModal) start();
      }, 800);
    }
  }

  return Object.freeze({ init, tick, start, finish, visible });
})();
