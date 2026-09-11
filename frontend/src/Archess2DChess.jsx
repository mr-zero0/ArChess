import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

// Piece value mapping for material calculation and Bot heuristics
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// Piece Combat Stats for 2D Arena Variant (aligned with ArChess Codex)
const INITIAL_HP = { p: 45, n: 75, b: 65, r: 95, q: 120, k: 160 };
const DAMAGE_TABLE = { p: 30, n: 50, b: 45, r: 55, q: 70, k: 40 };

const ARCHETYPES = {
  p: { role: 'Kinetic Striker', ability: 'Shield Wall', bonus: '+20 HP Armor', glyph: '♟' },
  n: { role: 'Cavalry Vanguard', ability: 'Overcharge', bonus: '+20 ATK Power', glyph: '♞' },
  b: { role: 'Arcane Piercer', ability: 'Healing Ward', bonus: '+25 HP Heal', glyph: '♝' },
  r: { role: 'Heavy Fortress', ability: 'Iron Bastion', bonus: '+35 HP Armor', glyph: '♜' },
  q: { role: 'Vortex Dominator', ability: 'Nova Surge', bonus: '+30 ATK Power', glyph: '♛' },
  k: { role: 'Royal Commander', ability: 'Rally Aura', bonus: '+15 HP to All', glyph: '♚' }
};

// SVG Path Geometry for Bespoke Piece Sets (viewBox 0 0 45 45)
const PIECE_PATHS = {
  p: "M 22.5 9 C 19.5 9 17.5 11 17.5 14 C 17.5 16 19 17.5 20.5 18.5 C 17 21 16 26 16 31 L 29 31 C 29 26 28 21 24.5 18.5 C 26 17.5 27.5 16 27.5 14 C 27.5 11 25.5 9 22.5 9 z M 13 33 L 32 33 L 32 36 L 13 36 z",
  r: "M 11 10 L 11 16 L 14 16 L 14 12 L 19 12 L 19 16 L 26 16 L 26 12 L 31 12 L 31 16 L 34 16 L 34 10 z M 14 18 L 31 18 L 29 29 L 16 29 z M 11 31 L 34 31 L 34 35 L 11 35 z",
  n: "M 22 10 C 22 10 16 12 14 16 C 12 20 12 26 15 28 C 16 29 18 28 18 28 C 17 31 14 32 11 32 L 11 35 L 34 35 C 34 32 33 28 31 24 C 28 18 26 14 26 10 z M 18 16 C 18 16 19 14 20 15 C 21 16 20 18 19 18 z",
  b: "M 22.5 8 C 21.5 8 21 9 21 10 C 19 12 17 16 17 20 C 17 25 19 28 20.5 29 L 24.5 29 C 26 28 28 25 28 20 C 28 16 26 12 24 10 C 24 9 23.5 8 22.5 8 z M 14 31 L 31 31 L 31 35 L 14 35 z M 21.5 14 L 23.5 14 M 22.5 13 L 22.5 17",
  q: "M 11 16 L 15 28 L 30 28 L 34 16 L 27 21 L 22.5 12 L 18 21 z M 12 30 L 33 30 L 33 34 L 12 34 z M 11 13 A 2 2 0 1 1 11 17 A 2 2 0 1 1 11 13 M 18 10 A 2 2 0 1 1 18 14 A 2 2 0 1 1 18 10 M 22.5 7 A 2 2 0 1 1 22.5 11 A 2 2 0 1 1 22.5 7 M 27 10 A 2 2 0 1 1 27 14 A 2 2 0 1 1 27 10 M 34 13 A 2 2 0 1 1 34 17 A 2 2 0 1 1 34 13",
  k: "M 22.5 6 L 22.5 11 M 20 8.5 L 25 8.5 M 22.5 11 C 18 11 15 14 15 18 C 15 22 17 25 19 27 L 26 27 C 28 25 30 22 30 18 C 30 14 27 11 22.5 11 z M 13 29 L 32 29 L 32 33 L 13 33 z"
};

function getCustomPieces(style) {
  if (style === 'classic' || style === 'staunton') return undefined;

  const pieceTypes = ['p', 'r', 'n', 'b', 'q', 'k'];
  const pieces = {};

  ['w', 'b'].forEach(color => {
    const isWhite = color === 'w';
    pieceTypes.forEach(type => {
      const pieceKey = `${color}${type.toUpperCase()}`;
      const pathD = PIECE_PATHS[type];

      pieces[pieceKey] = ({ squareWidth }) => {
        let fill, stroke, filter;

        if (style === 'neo') {
          fill = isWhite ? '#ffffff' : '#1e293b';
          stroke = isWhite ? '#0f172a' : '#f59e0b';
          filter = isWhite ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))';
        } else if (style === 'cyber') {
          fill = isWhite ? 'rgba(0, 243, 255, 0.22)' : 'rgba(255, 0, 127, 0.22)';
          stroke = isWhite ? '#00f3ff' : '#ff007f';
          filter = isWhite ? 'drop-shadow(0 0 6px #00f3ff)' : 'drop-shadow(0 0 6px #ff007f)';
        } else if (style === 'crystal') {
          fill = isWhite ? 'rgba(224, 242, 254, 0.85)' : 'rgba(88, 28, 135, 0.85)';
          stroke = isWhite ? '#38bdf8' : '#c084fc';
          filter = isWhite ? 'drop-shadow(0 0 5px rgba(56, 189, 248, 0.6))' : 'drop-shadow(0 0 5px rgba(192, 132, 252, 0.6))';
        } else { // mono
          fill = isWhite ? '#ffffff' : '#09090b';
          stroke = isWhite ? '#000000' : '#ffffff';
          filter = 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))';
        }

        return (
          <div style={{
            width: squareWidth,
            height: squareWidth,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg
              width={squareWidth * 0.88}
              height={squareWidth * 0.88}
              viewBox="0 0 45 45"
              style={{ filter, overflow: 'visible' }}
            >
              <path
                d={pathD}
                fill={fill}
                stroke={stroke}
                strokeWidth={style === 'neo' ? 2.5 : 2.0}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      };
    });
  });

  return pieces;
}

function initPieceHp(gameInstance) {
  const hpMap = {};
  const board = gameInstance.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const file = String.fromCharCode(97 + c);
        const rank = 8 - r;
        const sq = `${file}${rank}`;
        const max = INITIAL_HP[p.type] || 50;
        hpMap[sq] = { hp: max, maxHp: max, type: p.type, color: p.color };
      }
    }
  }
  return hpMap;
}

// Calculate tactical attack targets for a piece in 2D Arena mode
function getTacticalAttackTargets(game, square, piece) {
  if (!square || !piece) return [];
  const targets = [];
  const fileIdx = square.charCodeAt(0) - 97; // 0..7
  const rank = parseInt(square[1], 10); // 1..8
  const board = game.board();

  const isEnemyAt = (c, r) => {
    if (c < 0 || c > 7 || r < 1 || r > 8) return false;
    const row = 8 - r;
    const targetPiece = board[row]?.[c];
    return targetPiece && targetPiece.color !== piece.color;
  };

  const isFriendAt = (c, r) => {
    if (c < 0 || c > 7 || r < 1 || r > 8) return false;
    const row = 8 - r;
    const targetPiece = board[row]?.[c];
    return targetPiece && targetPiece.color === piece.color;
  };

  const toSquare = (c, r) => `${String.fromCharCode(97 + c)}${r}`;

  if (piece.type === 'p') {
    // Pawns strike 1 square forward OR 1 square diagonally
    const dir = piece.color === 'w' ? 1 : -1;
    const forwardRank = rank + dir;
    [fileIdx - 1, fileIdx, fileIdx + 1].forEach(c => {
      if (isEnemyAt(c, forwardRank)) {
        targets.push(toSquare(c, forwardRank));
      }
    });
  } else if (piece.type === 'n') {
    // Knight: 8 L-jump squares
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    offsets.forEach(([dc, dr]) => {
      const c = fileIdx + dc;
      const r = rank + dr;
      if (isEnemyAt(c, r)) targets.push(toSquare(c, r));
    });
  } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    // Sliding vectors
    const dirs = [];
    if (piece.type === 'b' || piece.type === 'q') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (piece.type === 'r' || piece.type === 'q') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    dirs.forEach(([dc, dr]) => {
      let c = fileIdx + dc;
      let r = rank + dr;
      while (c >= 0 && c <= 7 && r >= 1 && r <= 8) {
        if (isEnemyAt(c, r)) {
          targets.push(toSquare(c, r));
          break; // Line of sight blocked by enemy
        }
        if (isFriendAt(c, r)) {
          break; // Line of sight blocked by ally
        }
        c += dc;
        r += dr;
      }
    });
  } else if (piece.type === 'k') {
    // King: all 8 adjacent squares
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const c = fileIdx + dc;
        const r = rank + dr;
        if (isEnemyAt(c, r)) targets.push(toSquare(c, r));
      }
    }
  }

  return targets;
}

// Procedural audio synthesizer using Web Audio API
function playChessSound(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (localStorage.getItem('archess_audio_muted') === 'true') return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'strike' || type === 'capture') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'ability') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'check') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.setValueAtTime(760, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'victory') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.12);
      osc.frequency.setValueAtTime(659, now + 0.24);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Clean wooden move thud
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {}
}

function calcMaterialDiff(game) {
  const board = game.board();
  let white = 0;
  let black = 0;
  for (const row of board) {
    for (const sq of row) {
      if (sq) {
        const val = PIECE_VALUES[sq.type] || 0;
        if (sq.color === 'w') white += val;
        else black += val;
      }
    }
  }
  return white - black;
}

function updateArenaTurn(turnColor, isBotThinking = false, isGameOver = false, winner = null) {
  const circle = document.getElementById('arenaTurnCircle');
  const label = document.getElementById('arenaTurnLabel');
  if (!circle || !label) return;

  if (isGameOver) {
    circle.style.background = winner === 'draw' ? 'var(--gold-light)' : (winner === 'white' ? 'var(--gold-bright)' : 'var(--accent-crimson)');
    label.textContent = winner === 'draw' ? 'MATCH DRAWN — STALEMATE / DRAW' : `VICTORY! ${winner.toUpperCase()} ARMY CONQUERED THE BOARD!`;
    return;
  }

  if (turnColor === 'w') {
    circle.style.background = 'var(--gold-bright)';
    circle.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.6)';
    label.textContent = "WHITE'S TURN — SELECT OR DRAG TO STRIKE";
  } else {
    circle.style.background = 'var(--accent-crimson)';
    circle.style.boxShadow = '0 0 10px rgba(255, 59, 78, 0.6)';
    label.textContent = isBotThinking ? "BLACK'S TURN — ARCHESS BOT CALCULATING STRIKE..." : "BLACK'S TURN — SELECT OR DRAG TO MOVE";
  }
}

function notifyCapturedPiece(team, type, materialDiff) {
  if (window.ArchessCapturedHandler) {
    window.ArchessCapturedHandler(team, type, materialDiff);
    return;
  }
  const whiteRack = document.getElementById('whiteCasualtyRack');
  const blackRack = document.getElementById('blackCasualtyRack');
  const advBadge = document.getElementById('materialAdvantageBadge');

  const pieceGlyphs = {
    king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟'
  };

  const rack = team === 'white' ? whiteRack : blackRack;
  if (rack) {
    const noCas = rack.querySelector('.no-casualties');
    if (noCas) noCas.remove();

    const badge = document.createElement('span');
    badge.className = `casualty-badge ${team}-piece`;
    badge.textContent = pieceGlyphs[type] || '♟';
    badge.title = `${team.toUpperCase()} ${type.toUpperCase()}`;
    rack.appendChild(badge);
  }

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

function resetArenaCasualties() {
  if (window.ArchessResetCasualtiesHandler) {
    window.ArchessResetCasualtiesHandler();
    return;
  }
  const whiteRack = document.getElementById('whiteCasualtyRack');
  const blackRack = document.getElementById('blackCasualtyRack');
  const advBadge = document.getElementById('materialAdvantageBadge');
  if (whiteRack) whiteRack.innerHTML = '<span class="no-casualties">No casualties yet</span>';
  if (blackRack) blackRack.innerHTML = '<span class="no-casualties">No casualties yet</span>';
  if (advBadge) {
    advBadge.textContent = 'Balanced';
    advBadge.style.color = 'var(--gold-light)';
  }
}

function triggerArchessVictory(winner, totalTurns, durationSec, whiteUser, blackUser) {
  const modal = document.getElementById('victoryModal');
  const badge = document.getElementById('victoryBadge');
  const title = document.getElementById('victoryTitle');
  const sub = document.getElementById('victorySub');
  const statTurns = document.getElementById('statTurns');
  const statDur = document.getElementById('statDuration');
  const eloChange = document.getElementById('statEloChange');

  const isDraw = winner === 'draw';
  const isWhite = winner === 'white';

  if (badge) {
    badge.className = `victory-banner-badge ${isDraw ? 'draw' : (isWhite ? 'white-win' : 'black-win')}`;
    badge.textContent = isDraw ? 'MATCH DRAWN — STALEMATE' : `${winner.toUpperCase()} ARMY VICTORIOUS`;
  }
  if (title) {
    title.textContent = isDraw
      ? 'STALEMATE — DEADLOCK OF CITADELS'
      : (isWhite ? 'CHECKMATE — GLORY TO WHITE' : 'CHECKMATE — BLACK SUPREMACY');
  }
  if (sub) {
    sub.textContent = isDraw
      ? `All combatants neutralized. Both Kings stand impregnable in turn ${totalTurns}. Official draw recorded.`
      : `Checkmate achieved in ${totalTurns} tactical moves! Match settled on the Grandmaster ladder.`;
  }

  if (statTurns) statTurns.textContent = totalTurns;
  if (statDur) statDur.textContent = `${durationSec}s`;

  // Rolling Animated ELO Odometer Counter
  if (eloChange) {
    const targetDelta = isDraw ? 0 : (isWhite ? 18 : -18);
    let currentVal = 0;
    const step = targetDelta > 0 ? 1 : -1;
    eloChange.textContent = '+0 ELO';
    if (targetDelta === 0) {
      eloChange.textContent = '+0 ELO';
    } else {
      const timer = setInterval(() => {
        currentVal += step;
        eloChange.textContent = currentVal >= 0 ? `+${currentVal} ELO` : `${currentVal} ELO`;
        if (currentVal === targetDelta) clearInterval(timer);
      }, 25);
    }
  }

  // 1. Post-Match MVP Spotlight Card
  const mvpTeamTag = document.getElementById('mvpTeamTag');
  const mvpDisc = document.getElementById('mvpDisc');
  const mvpName = document.getElementById('mvpName');
  const mvpDamage = document.getElementById('mvpDamage');
  const mvpKills = document.getElementById('mvpKills');
  const mvpDesc = document.getElementById('mvpDesc');

  const mvpTeam = isDraw ? 'white' : winner;
  const mvpGlyph = isWhite ? '♛' : (winner === 'black' ? '♛' : '♚');
  const mvpPieceName = isWhite ? 'White The Queen' : (winner === 'black' ? 'Black The Queen' : 'White Citadel King');
  const mvpDmgVal = Math.max(120, totalTurns * 24);
  const mvpKillVal = Math.max(1, Math.min(8, Math.round(totalTurns / 2)));
  const mvpText = isDraw
    ? 'Endured the relentless tactical siege and secured defensive stalemate.'
    : 'Orchestrated the tactical offensive and delivered the decisive checkmate.';

  if (mvpTeamTag) mvpTeamTag.textContent = `${mvpTeam.toUpperCase()} ARMY`;
  if (mvpDisc) mvpDisc.textContent = mvpGlyph;
  if (mvpName) mvpName.textContent = mvpPieceName;
  if (mvpDamage) mvpDamage.textContent = `${mvpDmgVal} Combat Output`;
  if (mvpKills) mvpKills.textContent = `${mvpKillVal} Tactical Takedowns`;
  if (mvpDesc) mvpDesc.textContent = mvpText;

  // 2. Kinetic Battle Output Split Bar
  const whiteDmg = isWhite ? totalTurns * 30 : Math.max(20, totalTurns * 15);
  const blackDmg = isWhite ? Math.max(20, totalTurns * 15) : totalTurns * 30;
  const sumDmg = whiteDmg + blackDmg;
  const whiteRatio = sumDmg > 0 ? Math.round((whiteDmg / sumDmg) * 100) : 50;
  const blackRatio = 100 - whiteRatio;

  const damageRatioLabel = document.getElementById('damageRatioLabel');
  const damageWhiteBar = document.getElementById('damageWhiteBar');
  const damageBlackBar = document.getElementById('damageBlackBar');
  const whiteTotalLabel = document.getElementById('whiteTotalDamageLabel');
  const blackTotalLabel = document.getElementById('blackTotalDamageLabel');

  if (damageRatioLabel) damageRatioLabel.textContent = `White ${whiteRatio}% vs ${blackRatio}% Black`;
  if (damageWhiteBar) damageWhiteBar.style.width = `${whiteRatio}%`;
  if (damageBlackBar) damageBlackBar.style.width = `${blackRatio}%`;
  if (whiteTotalLabel) whiteTotalLabel.textContent = `White: ${whiteDmg} DMG`;
  if (blackTotalLabel) blackTotalLabel.textContent = `Black: ${blackDmg} DMG`;

  if (modal) {
    setTimeout(() => modal.classList.add('active'), 1000);
  }

  const effectiveWhite = (window.ArchessAuth && window.ArchessAuth.currentUser)
    ? window.ArchessAuth.currentUser.username
    : (whiteUser || 'Player1');

  fetch('/api/matches/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      white_username: effectiveWhite,
      black_username: blackUser || 'ArChess Bot',
      winner: winner,
      white_damage: whiteDmg,
      black_damage: blackDmg,
      turns: totalTurns,
      duration_sec: durationSec
    })
  }).catch(() => {});
}

export function Archess2DChess({ boardTheme = 'midnight', gameMode = 'bot', variantMode = 'arena' }) {
  const [game, setGame] = useState(() => new Chess());
  const [gamePosition, setGamePosition] = useState(() => game.fen());
  const [boardWidth, setBoardWidth] = useState(580);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [attackTargets, setAttackTargets] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('archess_board_theme') || boardTheme || 'midnight');
  const [pieceSet, setPieceSet] = useState(() => localStorage.getItem('archess_piece_theme') || 'classic');
  const [activeMode, setActiveMode] = useState(gameMode);
  const [activeVariant, setActiveVariant] = useState(variantMode);
  const [botThinking, setBotThinking] = useState(false);
  const [turnCount, setTurnCount] = useState(0);

  // Synchronize appearance changes from Customizer
  useEffect(() => {
    const handleAppearance = (e) => {
      if (e.detail?.boardTheme) setActiveTheme(e.detail.boardTheme);
      if (e.detail?.pieceTheme) setPieceSet(e.detail.pieceTheme);
    };
    window.addEventListener('archess_appearance_change', handleAppearance);
    return () => window.removeEventListener('archess_appearance_change', handleAppearance);
  }, []);

  const [pieceHp, setPieceHp] = useState(() => initPieceHp(game));
  const [activeBuffs, setActiveBuffs] = useState({});
  const [abilityUsedTurn, setAbilityUsedTurn] = useState(-1);
  const [damageTexts, setDamageTexts] = useState([]);

  const containerRef = useRef(null);
  const matchStartRef = useRef(Date.now());
  const gameRef = useRef(game);
  gameRef.current = game;
  const pieceHpRef = useRef(pieceHp);
  pieceHpRef.current = pieceHp;
  const activeVariantRef = useRef(activeVariant);
  activeVariantRef.current = activeVariant;
  const activeBuffsRef = useRef(activeBuffs);
  activeBuffsRef.current = activeBuffs;

  // Responsive Board Width
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const parent = containerRef.current.parentElement || containerRef.current;
        const rect = parent.getBoundingClientRect();
        const minDim = Math.min(rect.width || 600, rect.height || 600);
        const targetWidth = Math.max(300, Math.min(960, minDim - 16));
        setBoardWidth(targetWidth);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, []);

  useEffect(() => setActiveTheme(boardTheme), [boardTheme]);
  useEffect(() => setActiveMode(gameMode), [gameMode]);
  useEffect(() => setActiveVariant(variantMode), [variantMode]);

  // Spawn floating combat damage text
  const triggerDamageText = useCallback((square, text, isCrit = false, isHeal = false) => {
    const id = Date.now() + Math.random();
    setDamageTexts(prev => [...prev, { id, square, text, isCrit, isHeal }]);
    setTimeout(() => {
      setDamageTexts(prev => prev.filter(d => d.id !== id));
    }, 1200);
  }, []);

  // Execute Arena Combat Strike
  const executeArenaStrike = useCallback((sourceSq, targetSq) => {
    const currentGame = gameRef.current;
    const attacker = currentGame.get(sourceSq);
    const defender = currentGame.get(targetSq);
    if (!attacker || !defender) return false;

    const attackerInfo = pieceHpRef.current[sourceSq] || {
      hp: INITIAL_HP[attacker.type] || 50,
      maxHp: INITIAL_HP[attacker.type] || 50
    };
    const defenderInfo = pieceHpRef.current[targetSq] || {
      hp: INITIAL_HP[defender.type] || 50,
      maxHp: INITIAL_HP[defender.type] || 50
    };

    const baseDmg = DAMAGE_TABLE[attacker.type] || 35;
    const buff = activeBuffsRef.current[sourceSq] || 0;
    const isCrit = Math.random() < 0.25;
    const totalDamage = Math.round((baseDmg + buff) * (isCrit ? 1.45 : 1.0) + Math.random() * 6);
    const newDefenderHp = defenderInfo.hp - totalDamage;

    playChessSound('strike');
    triggerDamageText(targetSq, `-${totalDamage} HP${isCrit ? ' CRIT!' : ''}`, isCrit);

    if (buff > 0) {
      setActiveBuffs(prev => {
        const next = { ...prev };
        delete next[sourceSq];
        return next;
      });
    }

    if (newDefenderHp <= 0) {
      // DEFENDER SHATTERED! Attacker captures square!
      playChessSound('capture');
      const victimColor = defender.color === 'w' ? 'white' : 'black';
      notifyCapturedPiece(victimColor, PIECE_NAMES[defender.type], calcMaterialDiff(currentGame));

      // Update board position: remove defender, move attacker
      currentGame.remove(targetSq);
      currentGame.remove(sourceSq);
      currentGame.put({ type: attacker.type, color: attacker.color }, targetSq);

      // Pass turn cleanly in FEN
      const fenParts = currentGame.fen().split(' ');
      fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
      fenParts[3] = '-';
      const newFen = fenParts.join(' ');
      const nextGame = new Chess(newFen);
      setGame(nextGame);
      gameRef.current = nextGame;
      setGamePosition(newFen);

      setPieceHp(prev => {
        const nextHp = { ...prev };
        nextHp[targetSq] = { ...attackerInfo };
        delete nextHp[sourceSq];
        return nextHp;
      });

      setLastMove({ from: sourceSq, to: targetSq });
      setSelectedSquare(null);
      setPossibleMoves([]);
      setAttackTargets([]);
      setTurnCount(c => c + 1);

      if (defender.type === 'k' || nextGame.isGameOver()) {
        playChessSound('victory');
        const duration = Math.max(1, Math.round((Date.now() - matchStartRef.current) / 1000));
        const isKingEliminated = defender.type === 'k';
        const winner = isKingEliminated
          ? (attacker.color === 'w' ? 'white' : 'black')
          : (nextGame.isCheckmate() ? (nextGame.turn() === 'w' ? 'black' : 'white') : 'draw');
        const effectiveWhite = (window.ArchessAuth && window.ArchessAuth.currentUser)
          ? window.ArchessAuth.currentUser.username
          : 'Player1';
        updateArenaTurn(nextGame.turn(), false, true, winner);
        triggerArchessVictory(winner, Math.ceil((turnCount + 1) / 2), duration, effectiveWhite, activeMode === 'bot' ? 'ArChess Bot' : 'Player2');
      } else {
        updateArenaTurn(nextGame.turn(), false);
      }
      return true;
    } else {
      // DEFENDER SURVIVES & COUNTER-ATTACKS!
      const counterDmg = Math.round((DAMAGE_TABLE[defender.type] || 25) * 0.4);
      const newAttackerHp = Math.max(1, attackerInfo.hp - counterDmg);

      setTimeout(() => {
        triggerDamageText(sourceSq, `-${counterDmg} HP`, false);
      }, 320);

      setPieceHp(prev => ({
        ...prev,
        [targetSq]: { ...defenderInfo, hp: newDefenderHp },
        [sourceSq]: { ...attackerInfo, hp: newAttackerHp }
      }));

      // Pass turn cleanly in FEN
      const fenParts = currentGame.fen().split(' ');
      fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
      fenParts[3] = '-';
      const newFen = fenParts.join(' ');
      const nextGame = new Chess(newFen);
      setGame(nextGame);
      gameRef.current = nextGame;
      setGamePosition(newFen);

      setLastMove({ from: sourceSq, to: targetSq });
      setSelectedSquare(null);
      setPossibleMoves([]);
      setAttackTargets([]);
      setTurnCount(c => c + 1);
      updateArenaTurn(nextGame.turn(), false);
      return false; // Defender held the square, attacker snaps back
    }
  }, [activeMode, triggerDamageText, turnCount]);

  // Standard Chess Move (2D Classic or Non-Combat Move)
  const makeAMove = useCallback((move) => {
    try {
      const currentGame = gameRef.current;
      const sourceSq = move.from;
      const targetSq = move.to;

      // Check if this move is an Arena Strike
      if (activeVariantRef.current === 'arena') {
        const attacker = currentGame.get(sourceSq);
        const defender = currentGame.get(targetSq);
        if (attacker && defender && defender.color !== currentGame.turn()) {
          return executeArenaStrike(sourceSq, targetSq);
        }
      }

      // Standard Move
      const result = currentGame.move(move);
      if (result) {
        setPieceHp(prev => {
          const updated = { ...prev };
          if (updated[sourceSq]) {
            updated[targetSq] = updated[sourceSq];
            delete updated[sourceSq];
          }
          return updated;
        });

        setGamePosition(currentGame.fen());
        setLastMove({ from: result.from, to: result.to });
        setSelectedSquare(null);
        setPossibleMoves([]);
        setAttackTargets([]);
        setTurnCount(c => c + 1);

        if (result.captured) {
          playChessSound('capture');
          const victimColor = result.color === 'w' ? 'black' : 'white';
          notifyCapturedPiece(victimColor, PIECE_NAMES[result.captured], calcMaterialDiff(currentGame));
        } else {
          playChessSound('move');
        }

        if (currentGame.isGameOver()) {
          playChessSound('victory');
          const duration = Math.max(1, Math.round((Date.now() - matchStartRef.current) / 1000));
          const winner = currentGame.isCheckmate() ? (currentGame.turn() === 'w' ? 'black' : 'white') : 'draw';
          const effectiveWhite = (window.ArchessAuth && window.ArchessAuth.currentUser)
            ? window.ArchessAuth.currentUser.username
            : 'Player1';
          updateArenaTurn(currentGame.turn(), false, true, winner);
          triggerArchessVictory(winner, Math.ceil((turnCount + 1) / 2), duration, effectiveWhite, activeMode === 'bot' ? 'ArChess Bot' : 'Player2');
        } else {
          updateArenaTurn(currentGame.turn(), false);
        }
        return result;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [activeMode, executeArenaStrike, turnCount]);

  // Bot AI Turn
  const triggerBotMove = useCallback(() => {
    const currentGame = gameRef.current;
    if (currentGame.isGameOver() || currentGame.turn() !== 'b' || activeMode !== 'bot') return;

    setBotThinking(true);
    updateArenaTurn('b', true);

    setTimeout(() => {
      // 1. In 2D Arena, check if Bot has any high-priority strike targets
      if (activeVariantRef.current === 'arena') {
        const board = currentGame.board();
        const availableStrikes = [];

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.color === 'b') {
              const fromSq = `${String.fromCharCode(97 + c)}${8 - r}`;
              const targets = getTacticalAttackTargets(currentGame, fromSq, p);
              targets.forEach(toSq => {
                const targetPiece = currentGame.get(toSq);
                if (targetPiece && targetPiece.color === 'w') {
                  const targetHp = pieceHpRef.current[toSq]?.hp || 50;
                  const myDmg = DAMAGE_TABLE[p.type] || 35;
                  const canKill = myDmg >= targetHp;
                  availableStrikes.push({
                    from: fromSq,
                    to: toSq,
                    score: (canKill ? 50 : 20) + (PIECE_VALUES[targetPiece.type] || 1) * 8
                  });
                }
              });
            }
          }
        }

        if (availableStrikes.length > 0) {
          availableStrikes.sort((a, b) => b.score - a.score);
          const chosen = availableStrikes[0];
          executeArenaStrike(chosen.from, chosen.to);
          setBotThinking(false);
          return;
        }
      }

      // 2. Standard Bot positional chess move
      const legalMoves = currentGame.moves({ verbose: true });
      if (legalMoves.length === 0) {
        setBotThinking(false);
        return;
      }

      const scoredMoves = legalMoves.map(m => {
        let score = 0;
        if (m.captured) {
          score += (PIECE_VALUES[m.captured] || 1) * 10 - (PIECE_VALUES[m.piece] || 1) * 2;
        }
        if (m.san.includes('+')) score += 5;
        if (['e4', 'd4', 'e5', 'd5'].includes(m.to)) score += 2;
        score += Math.random() * 2.5;
        return { move: m, score };
      });

      scoredMoves.sort((a, b) => b.score - a.score);
      const chosen = scoredMoves[0].move;

      makeAMove({
        from: chosen.from,
        to: chosen.to,
        promotion: chosen.promotion || 'q'
      });

      setBotThinking(false);
    }, 650);
  }, [activeMode, executeArenaStrike, makeAMove]);

  useEffect(() => {
    if (game.turn() === 'b' && activeMode === 'bot' && !game.isGameOver() && !botThinking) {
      triggerBotMove();
    }
  }, [gamePosition, activeMode, botThinking, triggerBotMove, game]);

  // Drag & Drop
  const onPieceDrop = useCallback(({ piece, sourceSquare, targetSquare }) => {
    if (!targetSquare || sourceSquare === targetSquare) return false;
    const currentGame = gameRef.current;
    if (currentGame.isGameOver() || botThinking) return false;
    if (activeMode === 'bot' && currentGame.turn() === 'b') return false;

    // Check if dropping onto an Arena attack target
    if (activeVariantRef.current === 'arena') {
      const attacker = currentGame.get(sourceSquare);
      const defender = currentGame.get(targetSquare);
      if (attacker && defender && defender.color !== currentGame.turn()) {
        const targets = getTacticalAttackTargets(currentGame, sourceSquare, attacker);
        if (targets.includes(targetSquare)) {
          const defenderKilled = executeArenaStrike(sourceSquare, targetSquare);
          return defenderKilled; // Return true only if defender died and attacker took square
        }
      }
    }

    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });

    return move !== null;
  }, [activeMode, botThinking, executeArenaStrike, makeAMove]);

  const canDragPiece = useCallback(({ piece }) => {
    const currentGame = gameRef.current;
    if (botThinking || currentGame.isGameOver()) return false;
    if (activeMode === 'bot' && currentGame.turn() === 'b') return false;
    const pieceColor = piece?.pieceType?.[0];
    return pieceColor === currentGame.turn();
  }, [activeMode, botThinking]);

  // Click-to-Move and Attack Selection
  const onSquareClick = useCallback(({ piece, square }) => {
    const currentGame = gameRef.current;
    if (botThinking || currentGame.isGameOver()) return;
    if (activeMode === 'bot' && currentGame.turn() === 'b') return;

    // 1. If clicking on an attack target in Arena mode -> STRIKE!
    if (activeVariantRef.current === 'arena' && selectedSquare && attackTargets.includes(square)) {
      executeArenaStrike(selectedSquare, square);
      return;
    }

    // 2. If clicking on one of the possible movement destination squares -> MOVE!
    if (selectedSquare && possibleMoves.includes(square)) {
      makeAMove({
        from: selectedSquare,
        to: square,
        promotion: 'q'
      });
      return;
    }

    // 3. Otherwise select the piece on this square
    const currentPiece = currentGame.get(square);
    if (currentPiece && currentPiece.color === currentGame.turn()) {
      setSelectedSquare(square);

      if (activeVariantRef.current === 'arena') {
        // Calculate non-capture movement squares
        const moves = currentGame.moves({ square: square, verbose: true });
        setPossibleMoves(moves.filter(m => !m.captured).map(m => m.to));
        // Calculate expanded tactical attack targets
        const targets = getTacticalAttackTargets(currentGame, square, currentPiece);
        setAttackTargets(targets);
      } else {
        // 2D Classic: standard chess moves and captures
        const moves = currentGame.moves({ square: square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
        setAttackTargets([]);
      }
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
      setAttackTargets([]);
    }
  }, [activeMode, attackTargets, botThinking, executeArenaStrike, makeAMove, possibleMoves, selectedSquare]);

  // Activate Piece Signature Ability (2D Arena Only)
  const handleActivateAbility = useCallback(() => {
    if (!selectedSquare || activeVariant !== 'arena') return;
    const currentGame = gameRef.current;
    const piece = currentGame.get(selectedSquare);
    if (!piece || piece.color !== currentGame.turn()) return;

    playChessSound('ability');
    setAbilityUsedTurn(turnCount);

    if (piece.type === 'p' || piece.type === 'r') {
      // Shield Wall / Iron Bastion: grant temporary HP
      const bonusHp = piece.type === 'p' ? 20 : 35;
      setPieceHp(prev => {
        const curr = prev[selectedSquare] || { hp: 50, maxHp: 50 };
        return {
          ...prev,
          [selectedSquare]: { ...curr, hp: curr.hp + bonusHp, maxHp: curr.maxHp + bonusHp }
        };
      });
      triggerDamageText(selectedSquare, `+${bonusHp} ARMOR`, false, true);
    } else if (piece.type === 'b') {
      // Healing Ward: heal damaged allies
      setPieceHp(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sq => {
          const p = currentGame.get(sq);
          if (p && p.color === piece.color) {
            next[sq] = { ...next[sq], hp: Math.min(next[sq].maxHp, next[sq].hp + 25) };
          }
        });
        return next;
      });
      triggerDamageText(selectedSquare, `+25 HP HEAL`, false, true);
    } else if (piece.type === 'k') {
      // Royal Rally: boost all allies
      setPieceHp(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sq => {
          const p = currentGame.get(sq);
          if (p && p.color === piece.color) {
            next[sq] = { ...next[sq], hp: Math.min(next[sq].maxHp, next[sq].hp + 15) };
          }
        });
        return next;
      });
      triggerDamageText(selectedSquare, `RALLY AURA!`, true, true);
    } else {
      // Knight Overcharge / Queen Nova Surge: boost ATK on next strike
      const bonusAtk = piece.type === 'n' ? 20 : 30;
      setActiveBuffs(prev => ({
        ...prev,
        [selectedSquare]: (prev[selectedSquare] || 0) + bonusAtk
      }));
      triggerDamageText(selectedSquare, `+${bonusAtk} ATK BOOST!`, true);
    }
  }, [activeVariant, selectedSquare, triggerDamageText, turnCount]);

  // Reset Game
  const resetGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    gameRef.current = newGame;
    setGamePosition(newGame.fen());
    setPieceHp(initPieceHp(newGame));
    setSelectedSquare(null);
    setPossibleMoves([]);
    setAttackTargets([]);
    setLastMove(null);
    setDamageTexts([]);
    setActiveBuffs({});
    setAbilityUsedTurn(-1);
    setBotThinking(false);
    setTurnCount(0);
    matchStartRef.current = Date.now();
    resetArenaCasualties();
    updateArenaTurn('w', false);
  }, []);

  // Expose global methods to window.Archess2DChess
  useEffect(() => {
    window.Archess2DChess = {
      reset: resetGame,
      setTheme: (t) => setActiveTheme(t),
      setPieceSet: (ps) => setPieceSet(ps),
      setMode: (m) => setActiveMode(m),
      setVariant: (v) => {
        setActiveVariant(v);
        setSelectedSquare(null);
        setPossibleMoves([]);
        setAttackTargets([]);
        localStorage.setItem('archess_2d_variant', v);
      },
      getGame: () => gameRef.current
    };
  }, [resetGame]);

  // Board Color Palettes
  const palettes = {
    midnight: {
      dark: '#1e2632',
      light: '#364353',
      boardBg: '#0f141c',
      borderColor: '#d4af37',
      goldHighlight: 'rgba(255, 215, 0, 0.45)',
      targetDot: 'rgba(255, 215, 0, 0.65)'
    },
    woodland: {
      dark: '#8b5a2b',
      light: '#e0c9a6',
      boardBg: '#3d2514',
      borderColor: '#c68a4c',
      goldHighlight: 'rgba(230, 160, 50, 0.45)',
      targetDot: 'rgba(230, 160, 50, 0.65)'
    },
    ivory: {
      dark: '#4f5d75',
      light: '#e8edf3',
      boardBg: '#1e2229',
      borderColor: '#98a6bd',
      goldHighlight: 'rgba(100, 150, 255, 0.45)',
      targetDot: 'rgba(100, 150, 255, 0.65)'
    },
    emerald: {
      dark: '#2e6b47',
      light: '#e1d7b5',
      boardBg: '#133520',
      borderColor: '#73b088',
      goldHighlight: 'rgba(115, 176, 136, 0.50)',
      targetDot: 'rgba(115, 176, 136, 0.70)'
    },
    cyberpunk: {
      dark: '#14092b',
      light: '#2f1559',
      boardBg: '#090317',
      borderColor: '#00f3ff',
      goldHighlight: 'rgba(0, 243, 255, 0.55)',
      targetDot: 'rgba(255, 0, 128, 0.75)'
    },
    bloodstone: {
      dark: '#59111e',
      light: '#2a1a1f',
      boardBg: '#1a0408',
      borderColor: '#e84158',
      goldHighlight: 'rgba(232, 65, 88, 0.55)',
      targetDot: 'rgba(255, 200, 200, 0.75)'
    },
    oceanic: {
      dark: '#1b3f61',
      light: '#6896b8',
      boardBg: '#0b1d30',
      borderColor: '#38d9a9',
      goldHighlight: 'rgba(56, 217, 169, 0.50)',
      targetDot: 'rgba(56, 217, 169, 0.70)'
    }
  };

  const customPieces = React.useMemo(() => getCustomPieces(pieceSet), [pieceSet]);

  const pal = palettes[activeTheme] || palettes.midnight;

  // Custom Square Styles
  const customSquareStyles = {};

  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: pal.goldHighlight };
    customSquareStyles[lastMove.to] = { backgroundColor: pal.goldHighlight };
  }

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: 'rgba(255, 215, 0, 0.55)',
      boxShadow: 'inset 0 0 10px #ffd700'
    };
  }

  if (game.inCheck()) {
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === game.turn()) {
          const sq = `${String.fromCharCode(97 + c)}${8 - r}`;
          customSquareStyles[sq] = {
            backgroundColor: 'rgba(255, 45, 60, 0.65)',
            boxShadow: '0 0 16px rgba(255, 45, 60, 0.9)'
          };
        }
      }
    }
  }

  // Legal Movement Dots
  possibleMoves.forEach(sq => {
    const isCapture = game.get(sq) !== null;
    customSquareStyles[sq] = {
      background: isCapture
        ? `radial-gradient(circle, transparent 58%, ${pal.targetDot} 60%)`
        : `radial-gradient(circle, ${pal.targetDot} 24%, transparent 25%)`,
      borderRadius: isCapture ? '50%' : '0'
    };
  });

  // Selected Piece Metadata for Tactical HUD
  let selectedPieceInfo = null;
  if (selectedSquare && activeVariant === 'arena') {
    const p = game.get(selectedSquare);
    if (p) {
      const arch = ARCHETYPES[p.type] || { role: 'Combatant', ability: 'Strike', bonus: '+0', glyph: '♟' };
      const hp = pieceHp[selectedSquare]?.hp || INITIAL_HP[p.type] || 50;
      const maxHp = pieceHp[selectedSquare]?.maxHp || INITIAL_HP[p.type] || 50;
      const atk = (DAMAGE_TABLE[p.type] || 35) + (activeBuffs[selectedSquare] || 0);
      selectedPieceInfo = {
        name: PIECE_NAMES[p.type],
        type: p.type,
        color: p.color === 'w' ? 'White' : 'Black',
        role: arch.role,
        glyph: arch.glyph,
        hp,
        maxHp,
        atk,
        ability: arch.ability,
        bonus: arch.bonus
      };
    }
  }

  return (
    <div 
      ref={containerRef}
      className="react-chessboard-wrapper"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="react-chessboard-frame"
        style={{
          width: `${boardWidth}px`,
          maxWidth: '100%',
          padding: '10px',
          background: pal.boardBg,
          borderRadius: '12px',
          boxShadow: '0 18px 45px rgba(0, 0, 0, 0.75), inset 0 0 12px rgba(255, 215, 0, 0.15)',
          border: `2px solid ${pal.borderColor}`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Top Tactical Banner */}
        {activeVariant === 'arena' ? (
          <div className="arena-combat-hud-bar" style={{
            width: '100%',
            padding: '6px 12px',
            marginBottom: '8px',
            background: 'linear-gradient(90deg, rgba(20, 26, 36, 0.95), rgba(30, 40, 56, 0.95))',
            border: '1px solid rgba(255, 215, 0, 0.4)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            boxSizing: 'border-box'
          }}>
            {selectedPieceInfo ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 0 4px gold)' }}>{selectedPieceInfo.glyph}</span>
                  <div>
                    <div style={{ fontWeight: '800', color: 'var(--gold-bright)', letterSpacing: '0.04em' }}>
                      {selectedPieceInfo.color.toUpperCase()} {selectedPieceInfo.name.toUpperCase()} • {selectedPieceInfo.role.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                      HP: <span style={{ color: selectedPieceInfo.hp > selectedPieceInfo.maxHp * 0.5 ? '#10b981' : '#ef4444', fontWeight: '700' }}>{selectedPieceInfo.hp}/{selectedPieceInfo.maxHp}</span> | ATK: <span style={{ color: '#f59e0b', fontWeight: '700' }}>{selectedPieceInfo.atk}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleActivateAbility}
                  disabled={abilityUsedTurn === turnCount}
                  style={{
                    background: abilityUsedTurn === turnCount ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #d4af37, #aa820a)',
                    color: abilityUsedTurn === turnCount ? 'rgba(255,255,255,0.4)' : '#000',
                    fontWeight: '800',
                    fontSize: '0.72rem',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: abilityUsedTurn === turnCount ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: abilityUsedTurn === turnCount ? 'none' : '0 2px 8px rgba(212, 175, 55, 0.4)'
                  }}
                >
                  <span>⚡</span>
                  <span>{selectedPieceInfo.ability} ({selectedPieceInfo.bonus})</span>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                <span style={{ color: 'var(--gold-bright)', fontWeight: '800' }}>⚔️ 2D ARENA • TACTICAL COMBAT VARIANT</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.72rem' }}>— Always-visible HP, piece strikes &amp; signature abilities active</span>
              </div>
            )}
          </div>
        ) : (
          <div className="classic-fide-bar" style={{
            width: '100%',
            padding: '6px 12px',
            marginBottom: '8px',
            background: 'rgba(15, 20, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            boxSizing: 'border-box'
          }}>
            <span>♟️ 2D CLASSIC • OFFICIAL FIDE CHESS (STANDARD TOURNAMENT RULES)</span>
          </div>
        )}

        {/* Board Container */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
          <Chessboard
            options={{
              id: 'Archess2D',
              position: gamePosition,
              boardOrientation: 'white',
              darkSquareStyle: { backgroundColor: pal.dark },
              lightSquareStyle: { backgroundColor: pal.light },
              squareStyles: customSquareStyles,
              dropSquareStyle: { boxShadow: 'inset 0 0 16px rgba(255, 215, 0, 0.85)' },
              animationDurationInMs: 200,
              showNotation: true,
              alphaNotationStyle: { color: 'rgba(255, 255, 255, 0.75)', fontWeight: '600' },
              numericNotationStyle: { color: 'rgba(255, 255, 255, 0.75)', fontWeight: '600' },
              allowDragging: !botThinking && !game.isGameOver(),
              canDragPiece,
              onPieceDrop,
              onSquareClick,
              ...(customPieces ? { customPieces } : {})
            }}
          />

          {/* 2D ARENA ONLY: Always-Visible Health Bars, HP Numbers & Attack Target Reticles */}
          {activeVariant === 'arena' && (
            <div 
              className="combat-overlay-grid"
              style={{
                position: 'absolute',
                inset: '0',
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gridTemplateRows: 'repeat(8, 1fr)',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              {Array.from({ length: 64 }).map((_, idx) => {
                const row = Math.floor(idx / 8);
                const col = idx % 8;
                const sq = `${String.fromCharCode(97 + col)}${8 - row}`;
                const hpData = pieceHp[sq];
                const pieceOnBoard = game.get(sq);
                const isTarget = attackTargets.includes(sq);
                const dmgItems = damageTexts.filter(d => d.square === sq);

                const hpRatio = hpData ? Math.max(0, Math.min(1, hpData.hp / hpData.maxHp)) : 1;

                return (
                  <div key={sq} style={{ position: 'relative', width: '100%', height: '100%' }}>
                    
                    {/* Always-Visible HP Bar for Living Pieces */}
                    {pieceOnBoard && hpData && (
                      <>
                        {/* Numeric HP Pill */}
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          right: '3px',
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          fontFamily: 'monospace',
                          color: hpRatio > 0.6 ? '#6ee7b7' : (hpRatio > 0.25 ? '#fcd34d' : '#fca5a5'),
                          background: 'rgba(0, 0, 0, 0.8)',
                          padding: '1px 3px',
                          borderRadius: '3px',
                          lineHeight: '1',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          pointerEvents: 'none',
                          zIndex: 6
                        }}>
                          {hpData.hp}
                        </div>

                        {/* Bottom HP Bar */}
                        <div style={{
                          position: 'absolute',
                          bottom: '2px',
                          left: '10%',
                          width: '80%',
                          height: '4px',
                          background: 'rgba(0, 0, 0, 0.85)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                          pointerEvents: 'none',
                          zIndex: 6
                        }}>
                          <div style={{
                            width: `${hpRatio * 100}%`,
                            height: '100%',
                            background: hpRatio > 0.6 ? '#10b981' : (hpRatio > 0.25 ? '#f59e0b' : '#ef4444'),
                            transition: 'width 0.25s ease, background 0.25s ease'
                          }} />
                        </div>
                      </>
                    )}

                    {/* Crimson Attack Reticle on Enemy Targets in Range */}
                    {isTarget && (
                      <div style={{
                        position: 'absolute',
                        inset: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(239, 68, 68, 0.35)',
                        border: '2px solid #ff3b4e',
                        borderRadius: '6px',
                        boxShadow: 'inset 0 0 14px rgba(255, 59, 78, 0.75)',
                        pointerEvents: 'none',
                        zIndex: 8
                      }}>
                        <span style={{
                          fontSize: '1.25rem',
                          filter: 'drop-shadow(0 0 5px #ff3b4e)'
                        }}>⚔️</span>
                      </div>
                    )}

                    {/* Floating Damage Text */}
                    {dmgItems.map(d => (
                      <div 
                        key={d.id}
                        className="floating-dmg-text"
                        style={{
                          position: 'absolute',
                          top: '15%',
                          left: '50%',
                          color: d.isHeal ? '#10b981' : (d.isCrit ? '#ff3b4e' : '#ffd700'),
                          fontWeight: '800',
                          fontSize: d.isCrit ? '1.05rem' : '0.9rem',
                          fontFamily: 'Outfit, sans-serif',
                          whiteSpace: 'nowrap',
                          textShadow: '0 2px 6px #000, 0 0 10px rgba(0, 0, 0, 0.9)',
                          animation: 'floatUpFade 1.2s forwards'
                        }}
                      >
                        {d.text}
                      </div>
                    ))}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Global bootstrap function
let rootInstance = null;

export function mountArchess2D(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  if (!rootInstance) {
    rootInstance = createRoot(container);
  }

  rootInstance.render(
    <Archess2DChess 
      boardTheme={options.theme || localStorage.getItem('archess_board_theme') || 'midnight'}
      gameMode={options.mode || localStorage.getItem('archess_game_mode') || 'bot'}
      variantMode={options.variant || localStorage.getItem('archess_2d_variant') || 'arena'}
    />
  );
  return window.Archess2DChess;
}

export function unmountArchess2D() {
  if (rootInstance) {
    rootInstance.unmount();
    rootInstance = null;
  }
}

window.mountArchess2D = mountArchess2D;
window.unmountArchess2D = unmountArchess2D;
