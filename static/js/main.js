/**
 * ARCHESS - Main Interactive Controller
 * Coordinates Interactive Cursor Tracker, Motion Dynamic Canvas,
 * 2D/3D Mode Controls, Themes, Telemetry Stream, and UI Modals.
 */

/* -------------------------------------------------------------
   Global Industry-Grade Sonner/shadcn Toast Notification System
------------------------------------------------------------- */
window.ArchessToast = {
  show(message, type = 'info', duration = 3200, title = '') {
    let container = document.querySelector('.archess-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'archess-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const toastClass = type === 'success' ? 'toast-success' : (type === 'error' ? 'toast-error' : 'toast-gold');
    toast.className = `archess-toast ${toastClass}`;
    toast.style.setProperty('--toast-duration', `${duration}ms`);

    let iconChar = '✦';
    if (type === 'success') iconChar = '✓';
    else if (type === 'error') iconChar = '✕';

    const displayTitle = title || (type === 'success' ? 'SUCCESS' : (type === 'error' ? 'ALERT' : 'INTEL'));

    toast.innerHTML = `
      <div class="toast-icon-wrap">${iconChar}</div>
      <div class="toast-content-col">
        <div class="toast-title-text">${displayTitle}</div>
        <div class="toast-message-body">${message}</div>
      </div>
      <div class="toast-progress-drain"></div>
    `;

    container.appendChild(toast);

    let timer = setTimeout(() => dismiss(toast), duration);

    toast.addEventListener('click', () => {
      clearTimeout(timer);
      dismiss(toast);
    });

    function dismiss(el) {
      if (el.classList.contains('toast-hiding')) return;
      el.classList.add('toast-hiding');
      setTimeout(() => el.remove(), 260);
    }
  }
};

function showToast(message, type = 'info') {
  if (window.ArchessToast && typeof window.ArchessToast.show === 'function') {
    window.ArchessToast.show(message, type);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Arena Canvas
  let arena = null;
  if (window.ArchessArena) {
    arena = new window.ArchessArena('archessCanvas');
    window.archessGame = arena;
  }

  /* -------------------------------------------------------------
     1. Interactive Tactical Cursor Tracker (Hover-Capable Devices)
  ------------------------------------------------------------- */
  const supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (supportsHover) {
    const cursorDot = document.createElement('div');
    cursorDot.className = 'custom-cursor-dot';
    const cursorRing = document.createElement('div');
    cursorRing.className = 'custom-cursor-ring';
    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorRing);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    }, { passive: true });

    function renderCursor() {
      ringX += (mouseX - ringX) * 0.22;
      ringY += (mouseY - ringY) * 0.22;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px)`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Hover states for interactive elements
    const hoverSelectors = 'a, button, input, .pillar-card, .piece-tab-item, .arena-card, .mechanic-box, .faq-item, .theme-card, .bento-card';
    document.querySelectorAll(hoverSelectors).forEach(el => {
      el.addEventListener('mouseenter', () => cursorRing.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => cursorRing.classList.remove('cursor-hover'));
    });

    const canvasElem = document.getElementById('archessCanvas');
    if (canvasElem) {
      canvasElem.addEventListener('mousedown', () => cursorRing.classList.add('cursor-drag'));
      window.addEventListener('mouseup', () => cursorRing.classList.remove('cursor-drag'));
    }
  }

  /* -------------------------------------------------------------
     2. Motion Dynamic Background Canvas
  ------------------------------------------------------------- */
  const bgCanvas = document.getElementById('bgMotionCanvas');
  if (bgCanvas) {
    const bgCtx = bgCanvas.getContext('2d');
    let bgWidth = bgCanvas.width = window.innerWidth;
    let bgHeight = bgCanvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      bgWidth = bgCanvas.width = window.innerWidth;
      bgHeight = bgCanvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * bgWidth,
        y: Math.random() * bgHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    function animateBg() {
      if (document.hidden) {
        requestAnimationFrame(animateBg);
        return;
      }
      bgCtx.clearRect(0, 0, bgWidth, bgHeight);
      bgCtx.fillStyle = 'rgba(212, 175, 55, 0.25)';

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.x += p.vx;

        p.y += p.vy;

        if (p.x < 0) p.x = bgWidth;
        if (p.x > bgWidth) p.x = 0;
        if (p.y < 0) p.y = bgHeight;
        if (p.y > bgHeight) p.y = 0;

        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        bgCtx.fill();

        // Connect nearby particles with subtle filaments
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p2.x - p.x, p2.y - p.y);
          if (dist < 110) {
            bgCtx.beginPath();
            bgCtx.strokeStyle = `rgba(212, 175, 55, ${0.08 * (1 - dist / 110)})`;
            bgCtx.lineWidth = 0.8;
            bgCtx.moveTo(p.x, p.y);
            bgCtx.lineTo(p2.x, p2.y);
            bgCtx.stroke();
          }
        }
      }
      requestAnimationFrame(animateBg);
    }
    requestAnimationFrame(animateBg);
  }

  /* -------------------------------------------------------------
     3. Battle Casualties & Material Advantage Listener (Grouped Stack)
  ------------------------------------------------------------- */
  const whiteRack = document.getElementById('whiteCasualtyRack');
  const blackRack = document.getElementById('blackCasualtyRack');
  const advBadge = document.getElementById('materialAdvantageBadge');

  const pieceGlyphs = {
    king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟'
  };

  const pieceOrder = ['queen', 'rook', 'bishop', 'knight', 'pawn', 'king'];

  const casualtyCounts = {
    white: { queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0, king: 0 },
    black: { queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0, king: 0 }
  };

  function renderCasualtyRack(team) {
    const rack = team === 'white' ? whiteRack : blackRack;
    if (!rack) return;
    const counts = casualtyCounts[team];
    const hasAny = pieceOrder.some(t => counts[t] > 0);
    if (!hasAny) {
      rack.innerHTML = '<span class="no-casualties">No casualties yet</span>';
      return;
    }
    rack.innerHTML = '';
    pieceOrder.forEach(type => {
      const count = counts[type] || 0;
      if (count > 0) {
        const chip = document.createElement('span');
        chip.className = `casualty-stack-chip ${team}-piece`;
        chip.title = `${count}x ${team.toUpperCase()} ${type.toUpperCase()}`;
        chip.innerHTML = `
          <span class="casualty-glyph">${pieceGlyphs[type] || '♟'}</span>
          ${count > 1 ? `<span class="casualty-multiplier">×${count}</span>` : ''}
        `;
        rack.appendChild(chip);
      }
    });
  }

  function handlePieceCaptured(team, type, materialDiff) {
    const normType = (type || 'pawn').toLowerCase();
    if (casualtyCounts[team] && casualtyCounts[team][normType] !== undefined) {
      casualtyCounts[team][normType]++;
    }
    renderCasualtyRack(team);

    if (advBadge) {
      if (materialDiff > 0) {
        advBadge.textContent = `+${materialDiff} White`;
        advBadge.style.color = 'var(--gold-bright)';
      } else if (materialDiff < 0) {
        advBadge.textContent = `+${Math.abs(materialDiff)} Black`;
        advBadge.style.color = 'var(--accent-crimson)';
      } else {
        advBadge.textContent = 'Balanced';
        advBadge.style.color = 'var(--gold-light)';
      }
    }
  }

  function resetCasualties() {
    casualtyCounts.white = { queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0, king: 0 };
    casualtyCounts.black = { queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0, king: 0 };
    renderCasualtyRack('white');
    renderCasualtyRack('black');
    if (advBadge) {
      advBadge.textContent = 'Balanced';
      advBadge.style.color = 'var(--gold-light)';
    }
  }

  if (arena) {
    arena.onPieceCaptured = handlePieceCaptured;
    arena.onResetArena = resetCasualties;
  }

  // Cross-engine casualty hook (shared between 2D react-chessboard and 3D arena)
  window.ArchessCapturedHandler = handlePieceCaptured;
  window.ArchessResetCasualtiesHandler = resetCasualties;

  /* -------------------------------------------------------------
     4. View Mode Controls (3D Arena, 2D Arena, 2D Classic)
  ------------------------------------------------------------- */
  const view3DArenaBtn = document.getElementById('viewMode3DArena');
  const view2DArenaBtn = document.getElementById('viewMode2DArena');
  const view2DClassicBtn = document.getElementById('viewMode2DClassic');
  const archessCanvas = document.getElementById('archessCanvas');
  const reactChessRoot = document.getElementById('reactChessboardRoot');
  const kbdHints = document.getElementById('arenaControlHints');

  let activeViewMode = '3d-arena';

  function applyViewMode(rawMode, userTriggered = false) {
    let mode = rawMode || '3d-arena';
    if (mode === '3d' || mode === '3d-arena') mode = '3d-arena';
    else if (mode === '2d' || mode === '2d-arena') mode = '2d-arena';
    else if (mode === 'classic' || mode === '2d-classic') mode = '2d-classic';
    else mode = '3d-arena';

    activeViewMode = mode;
    [view3DArenaBtn, view2DArenaBtn, view2DClassicBtn].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.getAttribute('data-view') === mode);
    });

    if (mode === '2d-classic') {
      // 2D Classic: Mount react-chessboard for standard FIDE chess
      if (archessCanvas) archessCanvas.style.display = 'none';
      if (reactChessRoot) {
        reactChessRoot.style.display = 'flex';
        const currentTheme = localStorage.getItem('archess_board_theme') || 'midnight';
        const currentMode = localStorage.getItem('archess_game_mode') || 'bot';
        if (window.mountArchess2D) {
          window.mountArchess2D('reactChessboardRoot', { theme: currentTheme, mode: currentMode, variant: 'classic' });
        }
        if (window.Archess2DChess && window.Archess2DChess.setVariant) {
          window.Archess2DChess.setVariant('classic');
        }
      }
      if (kbdHints) {
        kbdHints.innerHTML = '<span>Controls:</span> <span class="kbd-key">Drag &amp; Drop</span> <span class="kbd-key">Click to Move (Standard FIDE)</span>';
      }
      if (userTriggered) showToast('View: 2D Classic (Standard FIDE Chess)');
    } else if (mode === '2d-arena') {
      // 2D Arena: Top-down physical canvas with Drag & Launch Slingshot Impulse!
      if (reactChessRoot) reactChessRoot.style.display = 'none';
      if (archessCanvas) {
        archessCanvas.style.display = 'block';
        if (arena) {
          arena.setRenderMode('2d');
          arena.initCanvasSize();
        }
      }
      if (kbdHints) {
        kbdHints.innerHTML = '<span>Controls:</span> <span class="kbd-key">Drag &amp; Launch</span> <span class="kbd-key">Slingshot Aim</span> <span style="color: var(--gold-light); font-size: 0.72rem; margin-left: 6px;">(King: Citadel &bull; 👑 Awakens When Alone)</span>';
      }
      if (userTriggered) showToast('View: 2D Arena (Drag & Launch Kinetic Combat)');
    } else {
      // 3D Arena: Isometric tabletop physics combat on canvas with Drag & Launch!
      if (reactChessRoot) reactChessRoot.style.display = 'none';
      if (archessCanvas) {
        archessCanvas.style.display = 'block';
        if (arena) {
          arena.setRenderMode('3d');
          arena.initCanvasSize();
        }
      }
      if (kbdHints) {
        kbdHints.innerHTML = '<span>Controls:</span> <span class="kbd-key">Drag &amp; Launch</span> <span class="kbd-key">Tab</span> Cycle <span class="kbd-key">WASD</span> Aim <span class="kbd-key">Space</span> Fire <span style="color: var(--gold-light); font-size: 0.72rem; margin-left: 6px;">(King: Citadel &bull; 👑 Awakens When Alone)</span>';
      }
      if (userTriggered) showToast('View: 3D Arena (Isometric Slingshot Combat)');
    }
    localStorage.setItem('archess_view_mode', mode);
  }

  if (view3DArenaBtn) view3DArenaBtn.addEventListener('click', () => applyViewMode('3d-arena', true));
  if (view2DArenaBtn) view2DArenaBtn.addEventListener('click', () => applyViewMode('2d-arena', true));
  if (view2DClassicBtn) view2DClassicBtn.addEventListener('click', () => applyViewMode('2d-classic', true));

  const playUrlParams = new URLSearchParams(window.location.search);
  const urlViewMode = playUrlParams.get('mode') || playUrlParams.get('view');
  const savedViewMode = urlViewMode || localStorage.getItem('archess_view_mode') || '3d-arena';
  applyViewMode(savedViewMode, false);

  // Game Mode Switcher (vs Bot AI, Pass & Play) & AI Difficulty Selector
  const modeBtns = document.querySelectorAll('.game-mode-btn');
  const botDiffGroup = document.getElementById('botDifficultyToolbarGroup');
  const botDiffBtns = document.querySelectorAll('.bot-difficulty-btn');

  function updateBlackPlayerSub(mode, diff) {
    const blackSub = document.getElementById('blackPlayerSub');
    if (!blackSub) return;
    if (arena && arena.opponentName) {
      blackSub.textContent = 'Black Army • Challenged Opponent';
      return;
    }
    if (mode === 'pvp') {
      blackSub.textContent = 'Black Army • Local Guest';
      return;
    }
    const titles = {
      cadet: 'Black Army • Cadet Bot AI',
      commander: 'Black Army • Commander Bot AI',
      grandmaster: 'Black Army • Grandmaster Neural AI'
    };
    blackSub.textContent = titles[diff] || 'Black Army • Autonomous AI';
  }

  function applyBotDifficulty(diff) {
    botDiffBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-diff') === diff);
    });
    if (arena && typeof arena.setBotDifficulty === 'function') {
      arena.setBotDifficulty(diff);
    }
    const currentMode = localStorage.getItem('archess_game_mode') || 'bot';
    updateBlackPlayerSub(currentMode, diff);
    localStorage.setItem('archess_bot_difficulty', diff);
  }

  botDiffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = btn.getAttribute('data-diff') || 'commander';
      applyBotDifficulty(diff);
      const labels = {
        cadet: 'AI Tier: Cadet (Casual Recruit)',
        commander: 'AI Tier: Commander (Balanced Tactical)',
        grandmaster: 'AI Tier: Grandmaster (Predictive Bank-Shot Neural AI)'
      };
      window.ArchessToast?.show(labels[diff] || diff, 'info', 2800, 'AI TIER');
    });
  });

  function applyGameMode(mode) {
    modeBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
    const blackName = document.getElementById('blackPlayerName');
    if (blackName && (!arena || !arena.opponentName)) {
      blackName.textContent = mode === 'bot' ? 'ArChess Bot' : 'Player 2';
    }
    if (botDiffGroup) {
      botDiffGroup.style.display = mode === 'bot' ? 'flex' : 'none';
    }
    const currentDiff = localStorage.getItem('archess_bot_difficulty') || 'commander';
    updateBlackPlayerSub(mode, currentDiff);

    if (arena) {
      arena.setGameMode(mode);
    }
    if (window.Archess2DChess && window.Archess2DChess.setMode) {
      window.Archess2DChess.setMode(mode);
    }
    localStorage.setItem('archess_game_mode', mode);
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      applyGameMode(mode);
      showToast(mode === 'bot' ? 'Match Mode: Solo vs Bot AI' : 'Match Mode: Local Pass & Play (2P)');
    });
  });

  const savedMode = localStorage.getItem('archess_game_mode') || 'bot';
  const savedBotDiff = localStorage.getItem('archess_bot_difficulty') || 'commander';
  applyBotDifficulty(savedBotDiff);
  if (modeBtns.length > 0) {
    applyGameMode(savedMode);
  }

  // URL Parameter Hook: Challenge Opponent (e.g. /play?opponent=Magnus_Kinetic)
  const opponentParam = playUrlParams.get('opponent');
  if (opponentParam) {
    const blackName = document.getElementById('blackPlayerName');
    const blackSub = document.getElementById('blackPlayerSub');
    if (blackName) blackName.textContent = opponentParam;
    if (blackSub) blackSub.textContent = 'Black Army • Challenged Opponent';
    if (arena) arena.opponentName = opponentParam;
    setTimeout(() => {
      showToast(`⚔️ Challenge Match Activated: Playing vs ${opponentParam}`);
    }, 450);
  }

  // Board Theme & Piece Set Switcher (Grandmaster Atelier)
  const THEME_NAMES = {
    midnight: 'Midnight Obsidian',
    woodland: 'Woodland Walnut',
    ivory: 'Ivory & Platinum',
    emerald: 'Tournament Emerald',
    cyberpunk: 'Cyberpunk Neon',
    bloodstone: 'Imperial Bloodstone',
    oceanic: 'Oceanic Abyss'
  };

  const PIECE_NAMES = {
    classic: 'Staunton Prestige',
    neo: 'Neo Modern',
    cyber: 'Cyberpunk Neon',
    crystal: 'Frosted Crystal',
    mono: 'Tournament Mono'
  };

  const boardThemeBtns = document.querySelectorAll('.theme-board-btn');
  const boardThemeCards = document.querySelectorAll('.theme-card-item');
  const pieceThemeCards = document.querySelectorAll('.piece-card-item');
  const activeBoardLabel = document.getElementById('atelierBoardActiveName');
  const activePieceLabel = document.getElementById('atelierPieceActiveName');

  function applyBoardTheme(theme, showNotice = false) {
    const themeKey = (theme || 'midnight').toLowerCase();
    boardThemeBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-theme') === themeKey);
    });
    boardThemeCards.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-board-theme') === themeKey);
    });
    if (activeBoardLabel) {
      activeBoardLabel.textContent = THEME_NAMES[themeKey] || themeKey.toUpperCase();
    }
    if (arena) {
      arena.setBoardTheme(themeKey);
    }
    if (window.Archess2DChess && window.Archess2DChess.setTheme) {
      window.Archess2DChess.setTheme(themeKey);
    }
    window.dispatchEvent(new CustomEvent('archess_appearance_change', {
      detail: { boardTheme: themeKey }
    }));
    localStorage.setItem('archess_board_theme', themeKey);
    if (showNotice) {
      showToast(`Board Palette: ${THEME_NAMES[themeKey] || themeKey}`);
    }
  }

  function applyPieceTheme(pieceTheme, showNotice = false) {
    const pieceKey = (pieceTheme || 'classic').toLowerCase();
    pieceThemeCards.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-piece-theme') === pieceKey);
    });
    if (activePieceLabel) {
      activePieceLabel.textContent = PIECE_NAMES[pieceKey] || pieceKey.toUpperCase();
    }
    if (arena) {
      arena.setPieceTheme(pieceKey);
    }
    if (window.Archess2DChess && window.Archess2DChess.setPieceSet) {
      window.Archess2DChess.setPieceSet(pieceKey);
    }
    window.dispatchEvent(new CustomEvent('archess_appearance_change', {
      detail: { pieceTheme: pieceKey }
    }));
    localStorage.setItem('archess_piece_theme', pieceKey);
    if (showNotice) {
      showToast(`Piece Set: ${PIECE_NAMES[pieceKey] || pieceKey}`);
    }
  }

  // Grandmaster Atelier Modal Controls
  const appearanceModal = document.getElementById('appearanceModalBackdrop');
  const btnOpenAppearance = document.getElementById('btnOpenAppearanceModal');
  const btnCloseAppearance = document.getElementById('btnCloseAppearanceModal');
  const btnDoneAppearance = document.getElementById('btnDoneAppearanceModal');

  function openAppearanceModal() {
    if (appearanceModal) {
      appearanceModal.style.display = 'flex';
      appearanceModal.classList.add('active');
    }
  }

  function closeAppearanceModal() {
    if (appearanceModal) {
      appearanceModal.classList.remove('active');
      appearanceModal.style.display = 'none';
    }
  }

  if (btnOpenAppearance) {
    btnOpenAppearance.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAppearanceModal();
    });
  }
  if (btnCloseAppearance) btnCloseAppearance.addEventListener('click', closeAppearanceModal);
  if (btnDoneAppearance) btnDoneAppearance.addEventListener('click', closeAppearanceModal);
  if (appearanceModal) {
    appearanceModal.addEventListener('click', (e) => {
      if (e.target === appearanceModal) closeAppearanceModal();
    });
  }

  boardThemeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyBoardTheme(btn.getAttribute('data-theme'), true);
    });
  });

  boardThemeCards.forEach(card => {
    card.addEventListener('click', () => {
      applyBoardTheme(card.getAttribute('data-board-theme'), true);
    });
  });

  pieceThemeCards.forEach(card => {
    card.addEventListener('click', () => {
      applyPieceTheme(card.getAttribute('data-piece-theme'), true);
    });
  });

  // Check URL query param for theme: ?theme=emerald or localStorage
  const urlTheme = new URLSearchParams(window.location.search).get('theme');
  const savedTheme = urlTheme || localStorage.getItem('archess_board_theme') || 'midnight';
  const savedPiece = localStorage.getItem('archess_piece_theme') || 'classic';
  applyBoardTheme(savedTheme, false);
  applyPieceTheme(savedPiece, false);

  // Reset Arena Button (handles both 2D react-chessboard and physical arena)
  const resetBtn = document.getElementById('arenaResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if ((activeViewMode === '2d-classic' || activeViewMode === '2d-arena') && window.Archess2DChess && window.Archess2DChess.reset) {
        window.Archess2DChess.reset();
        showToast(activeViewMode === '2d-arena' ? '2D Arena Combat Board Reset' : '2D Classic Chessboard Reset');
      } else if (arena) {
        arena.resetBoard();
        showToast('Board Re-racked to Standard 32-Piece Setup');
      }
    });
  }

  // Audio Toggle with LocalStorage Persistence
  const audioBtn = document.getElementById('audioToggleBtn');
  let isMuted = localStorage.getItem('archess_audio_muted') === 'true';

  if (isMuted) {
    if (arena && arena.audio) {
      arena.audio.muted = true;
      arena.audio.updateMasterGain();
    }
    if (audioBtn) {
      audioBtn.classList.add('muted');
      audioBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    }
  }

  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      if (arena && arena.audio) {
        arena.audio.toggleMute(isMuted);
      } else {
        localStorage.setItem('archess_audio_muted', isMuted ? 'true' : 'false');
      }
      audioBtn.classList.toggle('muted', isMuted);
      audioBtn.innerHTML = isMuted 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
      showToast(isMuted ? 'Game Audio Muted' : 'Game Audio Active');
    });
  }

  /* -------------------------------------------------------------
     Dynamic Tactical Soundscape Controls & Profiles
  ------------------------------------------------------------- */
  const SOUND_PROFILE_NAMES = {
    marble: 'Grandmaster Marble & Wood',
    cyber: 'Cybernetic Synthwave',
    classic: 'Tournament Classic'
  };

  const soundProfileCards = document.querySelectorAll('.sound-card-item');
  const soundVolumeSlider = document.getElementById('soundMasterVolumeSlider');
  const soundVolumeValue = document.getElementById('soundMasterVolumeValue');
  const soundActiveName = document.getElementById('atelierSoundActiveName');

  let savedSoundProfile = localStorage.getItem('archess_sound_profile') || 'marble';
  let savedVolume = parseFloat(localStorage.getItem('archess_master_volume') || '0.8');

  function applySoundProfile(profileKey, showNotice = false) {
    if (!SOUND_PROFILE_NAMES[profileKey]) return;
    savedSoundProfile = profileKey;
    localStorage.setItem('archess_sound_profile', profileKey);

    if (arena && arena.audio) {
      arena.audio.setProfile(profileKey);
    }

    soundProfileCards.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-sound-profile') === profileKey);
    });

    if (soundActiveName) {
      soundActiveName.textContent = SOUND_PROFILE_NAMES[profileKey];
    }

    window.dispatchEvent(new CustomEvent('archess_sound_profile_change', {
      detail: { profile: profileKey }
    }));

    if (showNotice) {
      showToast(`Acoustic Profile: ${SOUND_PROFILE_NAMES[profileKey]}`);
    }
  }

  function applyMasterVolume(volPct, save = true) {
    const ratio = Math.max(0, Math.min(100, parseInt(volPct, 10))) / 100;
    savedVolume = ratio;
    if (save) {
      localStorage.setItem('archess_master_volume', ratio.toString());
    }

    if (soundVolumeSlider) soundVolumeSlider.value = Math.round(ratio * 100);
    if (soundVolumeValue) soundVolumeValue.textContent = `${Math.round(ratio * 100)}%`;

    if (arena && arena.audio) {
      arena.audio.setVolume(ratio);
    }
  }

  // Initialize Soundscape UI
  applySoundProfile(savedSoundProfile, false);
  applyMasterVolume(Math.round(savedVolume * 100), false);

  if (soundVolumeSlider) {
    soundVolumeSlider.addEventListener('input', (e) => {
      applyMasterVolume(e.target.value, true);
    });
  }

  soundProfileCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-sound-preview')) return;
      const profile = card.getAttribute('data-sound-profile');
      applySoundProfile(profile, true);
      if (arena && arena.audio) {
        arena.audio.init();
        arena.audio.playImpact(1.1);
      }
    });
  });

  // Sound preview buttons (Test Clack / Test Cushion / Preview Echo)
  document.querySelectorAll('.btn-sound-preview').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.sound-card-item');
      const soundProf = card ? card.getAttribute('data-sound-profile') : null;
      const acousticEnv = card ? card.getAttribute('data-acoustic-env') : null;

      if (soundProf) applySoundProfile(soundProf, false);
      if (acousticEnv) applyAcousticEnvironment(acousticEnv, false);

      if (arena && arena.audio) {
        arena.audio.init();
        const type = btn.getAttribute('data-preview');
        if (type === 'bounce') {
          arena.audio.playBounce();
          showToast(`Playing Cushion Thud (${SOUND_PROFILE_NAMES[soundProf || savedSoundProfile]})`);
        } else if (type === 'reverb') {
          arena.audio.playImpact(1.2);
          showToast(`Spatial Reverb Echo: ${ACOUSTIC_ENV_NAMES[acousticEnv || savedAcousticEnv]}`);
        } else {
          arena.audio.playImpact(1.3);
          showToast(`Playing Marble Clack (${SOUND_PROFILE_NAMES[soundProf || savedSoundProfile]})`);
        }
      }
    });
  });

  /* -------------------------------------------------------------
     Acoustic Spatial Ambience & Convolver Reverb (v3.1.0)
  ------------------------------------------------------------- */
  const ACOUSTIC_ENV_NAMES = {
    citadel: 'Obsidian Citadel (1.8s Reverb)',
    wood: 'Warm Walnut Salon (0.7s Reverb)',
    void: 'Cyber Void (Comb Feedback)',
    cathedral: 'Grand Cathedral (3.0s Reverb)'
  };

  const acousticEnvCards = document.querySelectorAll('.sound-card-item[data-acoustic-env]');
  const acousticActiveName = document.getElementById('atelierAcousticActiveName');
  let savedAcousticEnv = localStorage.getItem('archess_acoustic_environment') || 'citadel';

  function applyAcousticEnvironment(envKey, showNotice = false) {
    if (!ACOUSTIC_ENV_NAMES[envKey]) return;
    savedAcousticEnv = envKey;
    localStorage.setItem('archess_acoustic_environment', envKey);

    if (arena && arena.audio) {
      arena.audio.setEnvironment(envKey);
    }

    acousticEnvCards.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-acoustic-env') === envKey);
    });

    if (acousticActiveName) {
      acousticActiveName.textContent = ACOUSTIC_ENV_NAMES[envKey];
    }

    window.dispatchEvent(new CustomEvent('archess_acoustic_environment_change', {
      detail: { environment: envKey }
    }));

    if (showNotice) {
      showToast(`Acoustic Ambience: ${ACOUSTIC_ENV_NAMES[envKey]}`);
    }
  }

  applyAcousticEnvironment(savedAcousticEnv, false);

  acousticEnvCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-sound-preview')) return;
      const env = card.getAttribute('data-acoustic-env');
      applyAcousticEnvironment(env, true);
      if (arena && arena.audio) {
        arena.audio.init();
        arena.audio.playImpact(1.1);
      }
    });
  });

  // Theme Mode (Dark / Light) Toggle
  const themeToggleBtn = document.getElementById('themeModeToggleBtn');
  const drawerThemeToggleBtn = document.getElementById('drawerThemeModeToggleBtn');

  function applyThemeMode(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('archess_theme_mode', theme);
    const titleText = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('title', titleText);
      themeToggleBtn.setAttribute('aria-label', titleText);
    }
    if (drawerThemeToggleBtn) {
      drawerThemeToggleBtn.setAttribute('title', titleText);
      drawerThemeToggleBtn.setAttribute('aria-label', titleText);
    }
  }

  // Ensure current theme matches stored/detected setting
  const initialTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('archess_theme_mode') || 'dark';
  applyThemeMode(initialTheme);

  function toggleThemeMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyThemeMode(newTheme);
    showToast(newTheme === 'light' ? 'Ivory Light Mode Activated' : 'Obsidian Dark Mode Activated');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleThemeMode);
  }
  if (drawerThemeToggleBtn) {
    drawerThemeToggleBtn.addEventListener('click', toggleThemeMode);
  }

  // =========================================================================
  // MULTI-DESIGN SYSTEM CONTROLLER
  // Supports: Dark Premium, Glassmorphism, Neobrutalism, Minimal, iOS Native, Material 3
  // =========================================================================
  const designModal = document.getElementById('designPickerModal');
  const navDesignToggleBtn = document.getElementById('navDesignToggleBtn');
  const closeDesignModalBtn = document.getElementById('closeDesignModalBtn');

  const DESIGN_LABELS = {
    'dark-premium': 'Dark Premium (Obsidian & Gold)',
    'glassmorphism': 'Glassmorphism (Frosted Crystal)',
    'neobrutalism': 'Neobrutalism (Bold & Raw Pop)',
    'minimal': 'Minimalist (Zen Whitespace)',
    'ios-native': 'iOS Native (Cupertino HIG)',
    'material3': 'Material 3 (Google Material You)'
  };

  function applyUiDesign(designKey, announce = false) {
    if (!DESIGN_LABELS[designKey]) designKey = 'dark-premium';
    document.documentElement.setAttribute('data-ui-design', designKey);
    localStorage.setItem('archess_ui_design', designKey);

    // Update active state in design modal cards
    document.querySelectorAll('.design-picker-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-design-key') === designKey);
    });

    // Update active state in drawer buttons
    document.querySelectorAll('.drawer-design-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-design-key') === designKey);
    });

    // Update active state in atelier cards
    document.querySelectorAll('.atelier-design-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-design-key') === designKey);
    });

    // Update active label in atelier if present
    const atelierDesignLabel = document.getElementById('atelierDesignActiveName');
    if (atelierDesignLabel) {
      atelierDesignLabel.textContent = DESIGN_LABELS[designKey];
    }

    if (announce) {
      showToast(`${DESIGN_LABELS[designKey]} Activated`);
    }
  }

  // Initial load
  const initialDesign = document.documentElement.getAttribute('data-ui-design') || localStorage.getItem('archess_ui_design') || 'dark-premium';
  applyUiDesign(initialDesign, false);

  // Modal handlers
  if (navDesignToggleBtn && designModal) {
    navDesignToggleBtn.addEventListener('click', () => {
      designModal.classList.add('active');
    });
  }
  if (closeDesignModalBtn && designModal) {
    closeDesignModalBtn.addEventListener('click', () => {
      designModal.classList.remove('active');
    });
  }
  if (designModal) {
    designModal.addEventListener('click', (e) => {
      if (e.target === designModal) designModal.classList.remove('active');
    });
  }

  // Design modal cards click
  document.querySelectorAll('.design-picker-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-design-key');
      if (key) {
        applyUiDesign(key, true);
        if (designModal) designModal.classList.remove('active');
      }
    });
  });

  // Drawer design buttons click
  document.querySelectorAll('.drawer-design-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-design-key');
      if (key) {
        applyUiDesign(key, true);
      }
    });
  });

  // Atelier design cards click
  document.querySelectorAll('.atelier-design-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-design-key');
      if (key) {
        applyUiDesign(key, true);
      }
    });
  });


  // Play Again Button inside Victory Modal
  const playAgainBtn = document.getElementById('btnPlayAgain');
  const victoryModal = document.getElementById('victoryModal');
  if (playAgainBtn && victoryModal) {
    playAgainBtn.addEventListener('click', () => {
      victoryModal.classList.remove('active');
      if ((activeViewMode === '2d-arena' || activeViewMode === '2d-classic') && window.Archess2DChess && window.Archess2DChess.reset) {
        window.Archess2DChess.reset();
      } else if (arena) {
        arena.resetBoard();
      }
      showToast('Board Re-racked — Ready for Rematch');
    });
  }

  // Copy Match Report Button inside Victory Modal
  const copyMatchBtn = document.getElementById('btnCopyMatchReport');
  if (copyMatchBtn) {
    copyMatchBtn.addEventListener('click', () => {
      const title = document.getElementById('victoryTitle')?.textContent?.trim() || 'MATCH REPORT';
      const sub = document.getElementById('victorySub')?.textContent?.trim() || '';
      const turns = document.getElementById('statTurns')?.textContent?.trim() || '0';
      const duration = document.getElementById('statDuration')?.textContent?.trim() || '0s';
      const elo = document.getElementById('statEloChange')?.textContent?.trim() || '+0 ELO';
      const mvpName = document.getElementById('mvpName')?.textContent?.trim() || 'None';
      const mvpDmg = document.getElementById('mvpDamage')?.textContent?.trim() || '0 DMG';
      const mvpKills = document.getElementById('mvpKills')?.textContent?.trim() || '0 Kills';
      const mvpDesc = document.getElementById('mvpDesc')?.textContent?.trim() || '';
      const dmgRatio = document.getElementById('damageRatioLabel')?.textContent?.trim() || 'Balanced';
      const whiteDmg = document.getElementById('whiteTotalDamageLabel')?.textContent?.trim() || 'White: 0 DMG';
      const blackDmg = document.getElementById('blackTotalDamageLabel')?.textContent?.trim() || 'Black: 0 DMG';

      const reportText = [
        '╔═══════════════════════════════════════════════════════╗',
        '║            ARCHESS TACTICAL DEBRIEF REPORT            ║',
        '╚═══════════════════════════════════════════════════════╝',
        `• Status: ${title}`,
        `• Summary: ${sub}`,
        `• Total Turns: ${turns} | Match Duration: ${duration}`,
        `• Competitive Settlement: ${elo}`,
        '',
        '── MATCH MVP ──',
        `• Unit: ${mvpName}`,
        `• Combat Output: ${mvpDmg} | ${mvpKills}`,
        `• Citation: ${mvpDesc}`,
        '',
        '── FORCE DISTRIBUTION ──',
        `• Ratio: ${dmgRatio}`,
        `• Breakdown: ${whiteDmg} vs ${blackDmg}`,
        '',
        '── TACTICAL TIMELINE ──',
        ...Array.from(document.querySelectorAll('#timelineEventsList .timeline-event-item')).slice(0, 8).map(el => {
          const t = el.querySelector('.timeline-event-time')?.textContent || '';
          const trn = el.querySelector('.timeline-event-turn')?.textContent || '';
          const d = el.querySelector('.timeline-event-desc')?.textContent || '';
          return `• [${t}] ${trn}: ${d}`;
        }),
        '',
        'Verified on ArChess Grandmaster Ledger (https://archess.net)'
      ].join('\n');

  // Toggle Match Timeline Accordion inside Victory Modal
  const toggleTimelineBtn = document.getElementById('toggleTimelineBtn');
  const timelineEventsList = document.getElementById('timelineEventsList');
  const timelineToggleIcon = document.getElementById('timelineToggleIcon');
  if (toggleTimelineBtn && timelineEventsList) {
    toggleTimelineBtn.addEventListener('click', () => {
      const isVisible = timelineEventsList.style.display === 'flex';
      timelineEventsList.style.display = isVisible ? 'none' : 'flex';
      if (timelineToggleIcon) timelineToggleIcon.textContent = isVisible ? '▼' : '▲';
    });
  }

      navigator.clipboard.writeText(reportText).then(() => {
        const originalHtml = copyMatchBtn.innerHTML;
        copyMatchBtn.textContent = 'COPIED!';
        if (window.ArchessToast) {
          window.ArchessToast.show('Tournament debrief copied to clipboard!', 'success', 3200, 'MATCH INTEL');
        } else {
          showToast('Tournament match report copied to clipboard!');
        }
        setTimeout(() => {
          copyMatchBtn.innerHTML = originalHtml;
        }, 2200);
      }).catch(() => {
        if (window.ArchessToast) {
          window.ArchessToast.show('Could not access clipboard. Please copy manually.', 'error', 3200, 'CLIPBOARD ERROR');
        }
      });
    });
  }

  /* -------------------------------------------------------------
     Tactical Combat Replay Engine (v2.9.8)
  ------------------------------------------------------------- */
  const replayBar = document.getElementById('tacticalReplayBar');
  const replayTitle = document.getElementById('replayMatchTitle');
  const replayTicker = document.getElementById('replayEventText');
  const replayScrubber = document.getElementById('replayTurnScrubber');
  const btnReplayPlayPause = document.getElementById('btnReplayPlayPause');
  const btnReplayPrev = document.getElementById('btnReplayPrev');
  const btnReplayNext = document.getElementById('btnReplayNext');
  const btnExitReplay = document.getElementById('btnExitReplay');
  const replayPlayIcon = document.getElementById('replayPlayIcon');
  const replaySpeedBtns = document.querySelectorAll('.replay-speed-btn');
  const btnLaunchReplay = document.getElementById('btnLaunchReplay');

  let replayMatchData = null;
  let replayEvents = [];
  let replayCurrentIndex = 0;
  let replayInterval = null;
  let replaySpeed = 1;
  let isReplayPlaying = false;

  async function loadTacticalReplay(matchId) {
    if (!matchId) return;
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) throw new Error('Match not found');
      const data = await res.json();
      if (!data.success || !data.match) throw new Error('Invalid match data');

      replayMatchData = data.match;
      replayEvents = (data.match.events || []).map(e => {
        let payload = e.payload;
        if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch(err) { payload = {}; }
        }
        return {
          event_type: e.event_type,
          payload: payload,
          created_at: e.created_at
        };
      });

      // If no milestone events, synthesize at least turn summary events
      if (replayEvents.length === 0) {
        replayEvents = [
          { event_type: 'OPENING', payload: { desc: `Combat initialized: ${replayMatchData.white_username} vs ${replayMatchData.black_username}`, turn: 1 } },
          { event_type: 'CLIMAX', payload: { desc: `Engagement lasted ${replayMatchData.turns} turns with ${(replayMatchData.white_damage || 0) + (replayMatchData.black_damage || 0)} total force output.`, turn: Math.ceil(replayMatchData.turns / 2) } },
          { event_type: replayMatchData.winner === 'draw' ? 'STALEMATE' : 'VICTORY', payload: { desc: `Official match conclusion: ${replayMatchData.winner.toUpperCase()} declared.`, turn: replayMatchData.turns } }
        ];
      }

      if (replayBar) replayBar.style.display = 'flex';
      if (replayScrubber) {
        replayScrubber.min = 0;
        replayScrubber.max = Math.max(0, replayEvents.length - 1);
        replayScrubber.value = 0;
      }
      replayCurrentIndex = 0;
      updateReplayStep(0);

      window.ArchessToast?.show(`Replay loaded: Match #${matchId} (${replayEvents.length} events)`, 'success', 3200, 'REPLAY ACTIVE');
    } catch (err) {
      window.ArchessToast?.show(`Unable to load replay for Match #${matchId}`, 'error', 3500, 'REPLAY ERROR');
    }
  }

  function updateReplayStep(idx) {
    if (!replayEvents || replayEvents.length === 0) return;
    replayCurrentIndex = Math.max(0, Math.min(replayEvents.length - 1, idx));
    if (replayScrubber) replayScrubber.value = replayCurrentIndex;

    const ev = replayEvents[replayCurrentIndex];
    const turn = ev.payload?.turn || (replayCurrentIndex + 1);
    if (replayTitle) {
      replayTitle.textContent = `REPLAY: Turn ${turn} (${replayCurrentIndex + 1}/${replayEvents.length})`;
    }

    let desc = ev.payload?.desc || ev.payload?.summary || ev.event_type;
    if (replayTicker) {
      replayTicker.textContent = `[${ev.event_type}] ${desc}`;
    }

    // Trigger visual kinetic shockwave cue on canvas if arena is active
    if (arena && ev.payload?.x && ev.payload?.y && typeof arena.spawnShockwave === 'function') {
      const color = ev.payload.team === 'black' ? 'rgba(255, 59, 78, 0.8)' : 'rgba(212, 175, 55, 0.85)';
      arena.spawnShockwave(ev.payload.x, ev.payload.y, color, 80, 3);
    }
  }

  function startReplayPlayback() {
    if (isReplayPlaying) return;
    isReplayPlaying = true;
    if (btnReplayPlayPause) {
      btnReplayPlayPause.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    }

    const intervalMs = Math.max(250, Math.round(1500 / replaySpeed));
    replayInterval = setInterval(() => {
      if (replayCurrentIndex >= replayEvents.length - 1) {
        stopReplayPlayback();
        return;
      }
      updateReplayStep(replayCurrentIndex + 1);
    }, intervalMs);
  }

  function stopReplayPlayback() {
    isReplayPlaying = false;
    if (replayInterval) {
      clearInterval(replayInterval);
      replayInterval = null;
    }
    if (btnReplayPlayPause) {
      btnReplayPlayPause.innerHTML = '<svg id="replayPlayIcon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }
  }

  if (btnReplayPlayPause) {
    btnReplayPlayPause.addEventListener('click', () => {
      if (isReplayPlaying) stopReplayPlayback();
      else startReplayPlayback();
    });
  }

  if (btnReplayPrev) {
    btnReplayPrev.addEventListener('click', () => {
      stopReplayPlayback();
      updateReplayStep(replayCurrentIndex - 1);
    });
  }

  if (btnReplayNext) {
    btnReplayNext.addEventListener('click', () => {
      stopReplayPlayback();
      updateReplayStep(replayCurrentIndex + 1);
    });
  }

  if (replayScrubber) {
    replayScrubber.addEventListener('input', (e) => {
      stopReplayPlayback();
      updateReplayStep(parseInt(e.target.value, 10));
    });
  }

  replaySpeedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      replaySpeedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      replaySpeed = parseFloat(btn.getAttribute('data-speed') || '1');
      if (isReplayPlaying) {
        stopReplayPlayback();
        startReplayPlayback();
      }
    });
  });

  if (btnExitReplay) {
    btnExitReplay.addEventListener('click', () => {
      stopReplayPlayback();
      if (replayBar) replayBar.style.display = 'none';
      window.ArchessToast?.show('Exited Replay Mode — Tactical Arena Ready', 'info', 2500);
    });
  }

  if (btnLaunchReplay) {
    btnLaunchReplay.addEventListener('click', () => {
      const vModal = document.getElementById('victoryModal');
      if (vModal) vModal.classList.remove('active');
      const targetMatchId = window.lastSettledMatchId;
      if (targetMatchId) {
        loadTacticalReplay(targetMatchId);
      } else {
        window.ArchessToast?.show('Settlement recorded. Loading combat review.', 'info', 2000);
        loadTacticalReplay(1);
      }
    });
  }

  // Check URL for ?replay=<id>
  const playUrlParamsReplay = new URLSearchParams(window.location.search);
  const requestedReplayId = playUrlParamsReplay.get('replay');
  if (requestedReplayId) {
    setTimeout(() => loadTacticalReplay(requestedReplayId), 300);
  }

  /* -------------------------------------------------------------
     5. Piece Arsenal Interactive Inspector
  ------------------------------------------------------------- */
  const pieceDatabase = {
    knight: {
      name: 'The Knight',
      role: 'Shockwave Leaper & Flanker',
      classBadge: 'Specialist Class',
      glyph: '♞',
      lore: 'The agile vanguard of Archess. Endowed with curved ballistic chassis, the Knight gains kinetic velocity after wall rebounds and emits radial shockwaves upon collision.',
      stats: { speed: 92, mass: 62, impact: 86, ricochet: 90 },
      abilityName: 'Kinetic Shockwave',
      abilityDesc: 'Upon colliding with enemy targets, releases a burst of concussive force that knocks adjacent enemy units backward.'
    },
    rook: {
      name: 'The Rook',
      role: 'Heavy Siege Juggernaut',
      classBadge: 'Colossus Class',
      glyph: '♜',
      lore: 'Carved from high-density basalt stone, the Rook is an immovable battering ram. Its enormous mass bulldozes through defensive pawns, obliterating armor with raw momentum.',
      stats: { speed: 58, mass: 98, impact: 95, ricochet: 45 },
      abilityName: 'Fortified Siege Breaker',
      abilityDesc: 'Deals 2.5x momentum-scaled damage and ignores standard collision knockback from lighter pieces.'
    },
    bishop: {
      name: 'The Bishop',
      role: 'Precision Diagonal Sniper',
      classBadge: 'Assassination Class',
      glyph: '♝',
      lore: 'Crafted with polished diamond prisms, the Bishop executes hyper-velocity diagonal ricochets. It maintains near 100% velocity across multi-wall bank shots.',
      stats: { speed: 96, mass: 50, impact: 75, ricochet: 96 },
      abilityName: 'Prism Velocity Surge',
      abilityDesc: 'Increases launch speed by 15% after each consecutive wall bounce, enabling lethal multi-target trick shots.'
    },
    queen: {
      name: 'The Queen',
      role: 'Apex Kinetic Sovereign',
      classBadge: 'Apex Sovereign Class',
      glyph: '♛',
      lore: 'The absolute ruler of the Archess arena. Combining unmatched speed and devastating mass, the Queen is capable of single-handedly clearing entire defense lines.',
      stats: { speed: 98, mass: 88, impact: 100, ricochet: 82 },
      abilityName: 'Supernova Discharge',
      abilityDesc: 'Triggers catastrophic golden spark explosions on high-velocity impacts, fracturing boss defenses.'
    },
    king: {
      name: 'The King',
      role: 'Stationary Citadel & Bastion Core',
      classBadge: 'Fortress Citadel Class',
      glyph: '♚',
      lore: 'The immovable anchor of the royal line. Enclosed within a reinforced Square Fortress Wall (500 HP) precision-fitted to the chessboard tile that absorbs and deflects kinetic assaults until breached. Backed by 600 base HP and super-dense monolithic mass (6.0), the King cannot be displaced. Ramming the King or its fortress walls inflicts devastating Newtonian recoil self-damage back upon attackers.',
      stats: { speed: 0, mass: 100, impact: 98, ricochet: 38 },
      abilityName: 'Square Fortress Wall & Recoil Aegis',
      abilityDesc: 'Enclosed by a 500 HP perimeter wall fitting the chess square that must be shattered before the King can take direct damage. Attackers ramming the wall suffer 25% recoil self-damage. The King possesses 600 base HP (1,100 total durability).'
    },
    pawn: {
      name: 'The Pawn',
      role: 'Swarm Phalanx & Barricade',
      classBadge: 'Tactical Vanguard',
      glyph: '♟',
      lore: 'Though individual pawns are lightweight, grouped formations form lethal deflection walls and provide tactical shield cover for higher-value pieces.',
      stats: { speed: 70, mass: 45, impact: 55, ricochet: 65 },
      abilityName: 'Coordinated Deflection',
      abilityDesc: 'Absorbs initial enemy projectile impacts to protect vulnerable high-priority backline tiles.'
    }
  };

  const pieceTabs = document.querySelectorAll('.piece-tab-item');
  const detailName = document.getElementById('detailPieceName');
  const detailRole = document.getElementById('detailPieceRole');
  const detailBadge = document.getElementById('detailClassBadge');
  const detailGlyph = document.getElementById('detailPieceGlyph');
  const detailLore = document.getElementById('detailPieceLore');
  const detailAbilityName = document.getElementById('detailAbilityName');
  const detailAbilityDesc = document.getElementById('detailAbilityDesc');
  const statSpeed = document.getElementById('statSpeedFill');
  const statMass = document.getElementById('statMassFill');
  const statImpact = document.getElementById('statImpactFill');
  const statRicochet = document.getElementById('statRicochetFill');
  const valSpeed = document.getElementById('valSpeed');
  const valMass = document.getElementById('valMass');
  const valImpact = document.getElementById('valImpact');
  const valRicochet = document.getElementById('valRicochet');

  function updatePieceDetail(pieceKey) {
    const data = pieceDatabase[pieceKey];
    if (!data) return;

    if (detailName) detailName.textContent = data.name;
    if (detailRole) detailRole.textContent = data.role;
    if (detailBadge) detailBadge.textContent = data.classBadge;
    if (detailGlyph) detailGlyph.textContent = data.glyph;
    if (detailLore) detailLore.textContent = data.lore;
    if (detailAbilityName) detailAbilityName.textContent = data.abilityName;
    if (detailAbilityDesc) detailAbilityDesc.textContent = data.abilityDesc;

    if (statSpeed && valSpeed) {
      statSpeed.style.width = `${data.stats.speed}%`;
      valSpeed.textContent = `${data.stats.speed}/100`;
    }
    if (statMass && valMass) {
      statMass.style.width = `${data.stats.mass}%`;
      valMass.textContent = `${data.stats.mass}/100`;
    }
    if (statImpact && valImpact) {
      statImpact.style.width = `${data.stats.impact}%`;
      valImpact.textContent = `${data.stats.impact}/100`;
    }
    if (statRicochet && valRicochet) {
      statRicochet.style.width = `${data.stats.ricochet}%`;
      valRicochet.textContent = `${data.stats.ricochet}/100`;
    }
  }

  pieceTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      pieceTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const pieceKey = tab.getAttribute('data-piece-key');
      updatePieceDetail(pieceKey);
    });
  });

  updatePieceDetail('knight');

  /* -------------------------------------------------------------
     6. FAQ Accordion & Beta Key Modal
  ------------------------------------------------------------- */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  const modal = document.getElementById('betaModal');
  const openModalBtns = document.querySelectorAll('.open-beta-modal');
  const closeModalBtn = document.getElementById('closeBetaModal');
  const copyKeyBtn = document.getElementById('copyBetaKeyBtn');
  const betaKeyDisplay = document.getElementById('betaKeyText');

  function generateBetaKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ARCHESS-';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    code += '-';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (betaKeyDisplay) {
        betaKeyDisplay.textContent = generateBetaKey();
      }
      if (modal) modal.classList.add('active');
    });
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      if (modal) modal.classList.remove('active');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  if (copyKeyBtn && betaKeyDisplay) {
    copyKeyBtn.addEventListener('click', () => {
      const key = betaKeyDisplay.textContent;
      navigator.clipboard.writeText(key).then(() => {
        copyKeyBtn.textContent = 'COPIED!';
        showToast(`Access Key copied: ${key}`);
        setTimeout(() => {
          copyKeyBtn.textContent = 'COPY KEY';
        }, 2200);
      });
    });
  }

  // Toast Helper already defined at top of file

  // 3D Tilt on Cards (Desktop)
  if (window.innerWidth > 900) {
    const tiltCards = document.querySelectorAll('.pillar-card, .arena-card, .mechanic-box, .theme-card, .principle-card');
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotX = -(y / rect.height) * 6;
        const rotY = (x / rect.width) * 6;
        card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* -------------------------------------------------------------
     Side Expansion Menu Drawer Controller
  ------------------------------------------------------------- */
  const sideMenuBtn = document.getElementById('sideMenuToggleBtn');
  const drawerBackdrop = document.getElementById('sideDrawerBackdrop');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  function openSideDrawer() {
    if (drawerBackdrop) {
      drawerBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSideDrawer() {
    if (drawerBackdrop) {
      drawerBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (sideMenuBtn) {
    sideMenuBtn.addEventListener('click', openSideDrawer);
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeSideDrawer);
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', (e) => {
      if (e.target === drawerBackdrop) {
        closeSideDrawer();
      }
    });
    // Close drawer when clicking any link inside
    drawerBackdrop.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeSideDrawer);
    });
  }

  // Keyboard shortcut Esc to close drawer or modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSideDrawer();
      const authModal = document.getElementById('accountAuthModal') || document.getElementById('authModal');
      if (authModal) authModal.classList.remove('active');
      if (window.ArchessAuth && typeof window.ArchessAuth.closeModal === 'function') {
        window.ArchessAuth.closeModal();
      }
    }
  });

  /* -------------------------------------------------------------
     Hero Video Play/Pause Control
  ------------------------------------------------------------- */
  const heroVideo = document.getElementById('heroVideo');
  const videoControlBtn = document.getElementById('videoControlBtn');
  const videoControlIcon = document.getElementById('videoControlIcon');
  const videoControlText = document.getElementById('videoControlText');

  if (heroVideo && videoControlBtn) {
    videoControlBtn.addEventListener('click', () => {
      if (heroVideo.paused) {
        heroVideo.play();
        if (videoControlIcon) videoControlIcon.innerHTML = '&#10074;&#10074;';
        if (videoControlText) videoControlText.textContent = 'Pause';
        showToast('Hero cinematic resumed');
      } else {
        heroVideo.pause();
        if (videoControlIcon) videoControlIcon.innerHTML = '&#9658;';
        if (videoControlText) videoControlText.textContent = 'Play';
        showToast('Hero cinematic paused');
      }
    });
  }

  /* -------------------------------------------------------------
     PWA Service Worker Registration & Tactical Connectivity
  ------------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  window.ArchessToast?.show('Tactical update available. Refresh for latest arena.', 'info', 4000, 'UPDATE READY');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  window.addEventListener('offline', () => {
    window.ArchessToast?.show('Offline Protocol Active. Local battle simulation operating normally.', 'error', 4500, 'OFFLINE COMBAT');
    document.documentElement.classList.add('is-offline');
  });

  window.addEventListener('online', () => {
    window.ArchessToast?.show('Tactical Uplink Restored. Cloud match sync active.', 'success', 3500, 'ONLINE');
    document.documentElement.classList.remove('is-offline');
  });

  /* -------------------------------------------------------------
     Real-Time Multiplayer Controller & WebSocket Engine (v3.0.0)
  ------------------------------------------------------------- */
  const btnOpenMultiplayer = document.getElementById('btnOpenMultiplayerModal');
  const modalMultiplayer = document.getElementById('multiplayerModalBackdrop');
  const btnCloseMultiplayer = document.getElementById('btnCloseMultiplayerModal');
  const btnCancelMultiplayer = document.getElementById('btnCancelMultiplayerModal');

  const btnQuickMatch = document.getElementById('btnQuickMatch');
  const quickMatchBtnText = document.getElementById('quickMatchBtnText');
  const btnCreateRoom = document.getElementById('btnCreateRoom');
  const hostRoomInitialWrap = document.getElementById('hostRoomInitialWrap');
  const hostRoomActiveWrap = document.getElementById('hostRoomActiveWrap');
  const createdRoomCode = document.getElementById('createdRoomCode');
  const btnCopyRoomLink = document.getElementById('btnCopyRoomLink');
  const btnEnterCreatedRoom = document.getElementById('btnEnterCreatedRoom');

  const inputJoinRoomCode = document.getElementById('inputJoinRoomCode');
  const btnJoinRoomByCode = document.getElementById('btnJoinRoomByCode');

  const activeMpBar = document.getElementById('activeMultiplayerBar');
  const mpRoomTitle = document.getElementById('mpRoomTitle');
  const mpRolePill = document.getElementById('mpRolePill');
  const mpStatusText = document.getElementById('mpStatusText');
  const mpPingPill = document.getElementById('mpPingPill');
  const btnLeaveMultiplayer = document.getElementById('btnLeaveMultiplayer');
  const mpStatusDot = document.getElementById('multiplayerStatusDot');

  let activeWebSocket = null;
  let activeRoomId = null;
  let activeRole = null;
  let pingTimer = null;
  let pingStartTime = 0;

  function openMultiplayerModal() {
    if (modalMultiplayer) {
      modalMultiplayer.style.display = 'flex';
      modalMultiplayer.classList.add('active');
    }
  }

  function closeMultiplayerModal() {
    if (modalMultiplayer) {
      modalMultiplayer.classList.remove('active');
      modalMultiplayer.style.display = 'none';
    }
  }

  if (btnOpenMultiplayer) btnOpenMultiplayer.addEventListener('click', openMultiplayerModal);
  if (btnCloseMultiplayer) btnCloseMultiplayer.addEventListener('click', closeMultiplayerModal);
  if (btnCancelMultiplayer) btnCancelMultiplayer.addEventListener('click', closeMultiplayerModal);

  function getCurrentUsername() {
    try {
      const user = JSON.parse(localStorage.getItem('archess_user') || '{}');
      return user.username || 'Commander';
    } catch(e) {
      return 'Commander';
    }
  }

  function connectToCombatRoom(roomId, preferredRole = null) {
    if (!roomId) return;
    const cleanRid = roomId.trim().toUpperCase();

    // Close any prior socket
    if (activeWebSocket) {
      try { activeWebSocket.close(); } catch(e) {}
      activeWebSocket = null;
    }
    clearInterval(pingTimer);

    closeMultiplayerModal();
    if (activeMpBar) activeMpBar.style.display = 'flex';
    if (mpStatusDot) {
      mpStatusDot.className = 'multiplayer-status-dot searching';
    }
    if (mpRoomTitle) mpRoomTitle.textContent = `ROOM: ${cleanRid}`;
    if (mpStatusText) mpStatusText.textContent = 'Connecting to tactical relay...';

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/combat/${cleanRid}`;

    try {
      const ws = new WebSocket(wsUrl);
      activeWebSocket = ws;
      activeRoomId = cleanRid;

      ws.onopen = () => {
        const username = getCurrentUsername();
        ws.send(JSON.stringify({
          type: 'join',
          username: username,
          preferred_role: preferredRole
        }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          handleMultiplayerMessage(msg);
        } catch(e) {}
      };

      ws.onerror = () => {
        if (mpStatusText) mpStatusText.textContent = 'Connection error on tactical relay.';
        window.ArchessToast?.show('Failed to connect to multiplayer room.', 'error', 3000, 'RELAY ERROR');
      };

      ws.onclose = () => {
        clearInterval(pingTimer);
        if (activeWebSocket === ws) {
          activeWebSocket = null;
          if (mpStatusDot) mpStatusDot.className = 'multiplayer-status-dot';
          if (arena) arena.setMultiplayerState(false, null);
          window.ArchessToast?.show('Disconnected from combat room.', 'info', 2500, 'DISCONNECTED');
        }
      };
    } catch(err) {
      window.ArchessToast?.show('Could not establish WebSocket connection.', 'error', 3000, 'SOCKET ERROR');
    }
  }

  function handleMultiplayerMessage(msg) {
    const mtype = msg.type;

    if (mtype === 'handshake_ok') {
      activeRole = msg.role;
      if (mpRolePill) mpRolePill.textContent = `YOU: ${activeRole.toUpperCase()}`;
      if (mpStatusDot) mpStatusDot.className = 'multiplayer-status-dot connected';

      if (arena) {
        arena.setMultiplayerState(true, activeRole);
      }

      // Update player cards
      const whiteName = document.getElementById('whitePlayerName');
      const whiteSub = document.getElementById('whitePlayerSub');
      const blackName = document.getElementById('blackPlayerName');
      const blackSub = document.getElementById('blackPlayerSub');

      const roomData = msg.room || {};
      const whiteUser = roomData.white?.username || 'White Army';
      const blackUser = roomData.black?.username || 'Waiting for Challenger...';

      if (whiteName) whiteName.textContent = whiteUser;
      if (whiteSub) whiteSub.textContent = activeRole === 'white' ? 'White Army • You' : 'White Army • Opponent';
      if (blackName) blackName.textContent = blackUser;
      if (blackSub) blackSub.textContent = activeRole === 'black' ? 'Black Army • You' : (roomData.black?.username ? 'Black Army • Opponent' : 'Waiting for Challenger');

      // Start periodic ping measurement
      startPingLoop();
      window.ArchessToast?.show(`Joined Room ${msg.room_id} as ${activeRole.toUpperCase()}`, 'success', 3000, 'CONNECTED');
      return;
    }

    if (mtype === 'room_state') {
      const room = msg.room || {};
      if (room.status === 'in_combat') {
        const whiteUser = room.white?.username || 'White';
        const blackUser = room.black?.username || 'Black';
        if (mpStatusText) mpStatusText.textContent = `Combat in progress: ${whiteUser} vs ${blackUser}`;
        const blackName = document.getElementById('blackPlayerName');
        const blackSub = document.getElementById('blackPlayerSub');
        if (blackName && room.black?.username) blackName.textContent = room.black.username;
        if (blackSub) blackSub.textContent = activeRole === 'black' ? 'Black Army • You' : 'Black Army • Opponent';
      } else {
        if (mpStatusText) mpStatusText.textContent = 'Waiting for opponent to join...';
      }
      return;
    }

    if (mtype === 'opponent_aim') {
      if (arena) {
        arena.setOpponentAim(msg);
      }
      return;
    }

    if (mtype === 'opponent_aim_cancel') {
      if (arena) {
        arena.clearOpponentAim();
      }
      return;
    }

    if (mtype === 'opponent_launch') {
      if (arena) {
        arena.executeRemoteLaunch(msg.pieceId, msg.vx, msg.vy, msg.powerRatio * arena.maxPullDistance);
      }
      return;
    }

    if (mtype === 'opponent_disconnected') {
      if (mpStatusText) mpStatusText.textContent = `Opponent (${msg.role.toUpperCase()}) disconnected from room.`;
      window.ArchessToast?.show(`Opponent (${msg.role.toUpperCase()}) disconnected.`, 'warning', 4000, 'OPPONENT LEFT');
      return;
    }

    if (mtype === 'pong') {
      const latency = Math.max(1, Math.round(performance.now() - pingStartTime));
      if (mpPingPill) mpPingPill.textContent = `Ping: ${latency}ms`;
      return;
    }
  }

  function startPingLoop() {
    clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
        pingStartTime = performance.now();
        activeWebSocket.send(JSON.stringify({ type: 'ping', client_ts: Date.now() }));
      }
    }, 4000);
  }

  // Wire arena outbound callbacks to active WebSocket
  if (arena) {
    arena.onAimUpdate = (data) => {
      if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
        activeWebSocket.send(JSON.stringify({
          type: 'aim',
          pieceId: data.pieceId,
          pullScreenX: data.pullScreenX,
          pullScreenY: data.pullScreenY,
          powerRatio: data.powerRatio
        }));
      }
    };

    arena.onAimCancel = () => {
      if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
        activeWebSocket.send(JSON.stringify({ type: 'aim_cancel' }));
      }
    };

    arena.onPieceLaunchBroadcast = (data) => {
      if (activeWebSocket && activeWebSocket.readyState === WebSocket.OPEN) {
        activeWebSocket.send(JSON.stringify({
          type: 'launch',
          pieceId: data.pieceId,
          vx: data.vx,
          vy: data.vy,
          dist: data.dist,
          powerRatio: data.powerRatio
        }));
      }
    };
  }

  // 1. Quick Match Action
  if (btnQuickMatch) {
    btnQuickMatch.addEventListener('click', async () => {
      if (quickMatchBtnText) quickMatchBtnText.textContent = 'Searching...';
      btnQuickMatch.disabled = true;

      try {
        const res = await fetch('/api/multiplayer/quick_match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: getCurrentUsername() })
        });
        const data = await res.json();
        if (data.success && data.room_id) {
          connectToCombatRoom(data.room_id, data.role);
        } else {
          window.ArchessToast?.show('Could not match with opponent.', 'error', 3000, 'MATCH ERROR');
        }
      } catch(err) {
        window.ArchessToast?.show('Network error during quick match.', 'error', 3000, 'NETWORK ERROR');
      } finally {
        if (quickMatchBtnText) quickMatchBtnText.textContent = 'Find Opponent';
        btnQuickMatch.disabled = false;
      }
    });
  }

  // 2. Create Private Room Action
  let newlyCreatedRoomId = null;
  if (btnCreateRoom) {
    btnCreateRoom.addEventListener('click', async () => {
      btnCreateRoom.disabled = true;
      try {
        const res = await fetch('/api/multiplayer/rooms/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: getCurrentUsername() })
        });
        const data = await res.json();
        if (data.success && data.room_id) {
          newlyCreatedRoomId = data.room_id;
          if (createdRoomCode) createdRoomCode.textContent = data.room_id;
          if (hostRoomInitialWrap) hostRoomInitialWrap.style.display = 'none';
          if (hostRoomActiveWrap) hostRoomActiveWrap.style.display = 'flex';
        }
      } catch(e) {
        window.ArchessToast?.show('Could not generate private room.', 'error', 3000, 'ROOM ERROR');
      } finally {
        btnCreateRoom.disabled = false;
      }
    });
  }

  if (btnCopyRoomLink) {
    btnCopyRoomLink.addEventListener('click', () => {
      if (!newlyCreatedRoomId) return;
      const inviteUrl = `${window.location.origin}/play?room=${newlyCreatedRoomId}`;
      navigator.clipboard.writeText(inviteUrl).then(() => {
        window.ArchessToast?.show(`Invite link copied to clipboard: ${newlyCreatedRoomId}`, 'success', 3500, 'LINK COPIED');
      }).catch(() => {
        window.ArchessToast?.show(`Room Code: ${newlyCreatedRoomId}`, 'info', 3000, 'ROOM CODE');
      });
    });
  }

  if (btnEnterCreatedRoom) {
    btnEnterCreatedRoom.addEventListener('click', () => {
      if (newlyCreatedRoomId) {
        connectToCombatRoom(newlyCreatedRoomId, 'white');
      }
    });
  }

  // 3. Join by Room Code Action
  if (btnJoinRoomByCode) {
    btnJoinRoomByCode.addEventListener('click', () => {
      const code = (inputJoinRoomCode?.value || '').trim();
      if (!code || code.length < 3) {
        window.ArchessToast?.show('Please enter a valid room code (e.g. ARC-729)', 'warning', 2500, 'INVALID CODE');
        return;
      }
      connectToCombatRoom(code, 'black');
    });
  }

  // Leave Multiplayer Room Action
  if (btnLeaveMultiplayer) {
    btnLeaveMultiplayer.addEventListener('click', () => {
      if (activeWebSocket) {
        try { activeWebSocket.close(); } catch(e) {}
        activeWebSocket = null;
      }
      clearInterval(pingTimer);
      if (activeMpBar) activeMpBar.style.display = 'none';
      if (mpStatusDot) mpStatusDot.className = 'multiplayer-status-dot';
      if (arena) arena.setMultiplayerState(false, null);
      window.ArchessToast?.show('Returned to Local Solo Arena', 'info', 2500, 'SOLO MODE');
    });
  }

  // URL Parameter Hook: Auto-Join Room via URL (/play?room=ARC-729)
  const roomParam = playUrlParams.get('room');
  if (roomParam) {
    setTimeout(() => {
      connectToCombatRoom(roomParam, 'black');
    }, 450);
  }
});
