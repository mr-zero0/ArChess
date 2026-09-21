/**
 * ARCHESS - AI Tactical Advisor, Agentic ReAct Engine & RAG Codex HUD
 * 100% Free & Open-Source client integration.
 */

(function() {
  'use strict';

  function initAiAdvisor() {
    const btnAdvise = document.getElementById('btnAskAiCoach');
    const advisorContent = document.getElementById('aiAdvisorContent');
    const personaSelect = document.getElementById('aiPersonaSelect');
    const ragInput = document.getElementById('ragSearchInput');
    const btnRag = document.getElementById('btnRagSearch');
    const ragResults = document.getElementById('ragSearchResults');

    // 1. Autonomous ReAct Tactical Advisor
    if (btnAdvise && advisorContent) {
      btnAdvise.addEventListener('click', async () => {
        const persona = (personaSelect && personaSelect.value) || 'magnus';
        advisorContent.innerHTML = '<span style="color: #c084fc;">⚡ Running ReAct physics simulation &amp; tactical reasoning...</span>';

        // Extract active board pieces
        const pieces = [];
        if (window.archessGame && window.archessGame.pieces) {
          // If 2D arena active
          Object.values(window.archessGame.pieces).forEach(p => {
            if (p && !p.captured) {
              pieces.push({
                id: p.id || `${p.color}_${p.type}`,
                type: p.type || 'pawn',
                color: p.color || 'white',
                x: p.x || 0.0,
                y: p.y || 0.0,
                hp: p.hp || 100
              });
            }
          });
        }

        // Fallback default formation if pieces array empty
        if (pieces.length === 0) {
          pieces.push(
            { id: 'w_pawn_1', type: 'pawn', color: 'white', x: -2.0, y: 0.0, hp: 50 },
            { id: 'w_knight_1', type: 'knight', color: 'white', x: -4.0, y: -2.0, hp: 65 },
            { id: 'w_king', type: 'king', color: 'white', x: -6.0, y: 0.0, hp: 120 },
            { id: 'b_pawn_1', type: 'pawn', color: 'black', x: 2.0, y: 0.0, hp: 50 },
            { id: 'b_queen', type: 'queen', color: 'black', x: 4.0, y: 1.0, hp: 100 }
          );
        }

        const activeTurn = (window.archessGame && window.archessGame.currentTurn) || 'white';

        try {
          const resp = await fetch('/api/ai/coach/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              board_state: pieces,
              turn: activeTurn,
              persona: persona
            })
          });
          const data = await resp.json();

          if (data && data.success) {
            const angle = data.suggested_angle_deg || 0;
            const power = Math.round((data.suggested_power_ratio || 0.8) * 100);
            const piece = data.recommended_piece || 'Piece';
            const dmg = data.predicted_damage || 0;
            const bounces = data.bounces || 0;

            advisorContent.innerHTML = `
              <div style="color: #f8fafc; font-weight: 600; margin-bottom: 4px;">
                🎯 Launch: <span style="color: #38bdf8;">${piece}</span> at <span style="color: #f59e0b;">${angle}°</span> (${power}% Power)
              </div>
              <div style="color: #e2e8f0; font-size: 0.74rem; margin-bottom: 4px;">
                ${data.tactical_rationale}
              </div>
              <div style="color: #94a3b8; font-size: 0.7rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; display: flex; justify-content: space-between;">
                <span>Est. Damage: <b style="color: #ef4444;">~${dmg} HP</b></span>
                <span>Ricochets: <b style="color: #a855f7;">${bounces}</b></span>
              </div>
            `;
          } else {
            advisorContent.innerHTML = `<span style="color: #ef4444;">${data.error || 'Failed to compute trajectory.'}</span>`;
          }
        } catch (err) {
          advisorContent.innerHTML = '<span style="color: #ef4444;">Advisor service offline.</span>';
        }
      });
    }

    // 2. Semantic Codex (RAG) Search
    async function executeRagSearch() {
      if (!ragInput || !ragResults) return;
      const query = ragInput.value.trim();
      if (!query) return;

      ragResults.style.display = 'block';
      ragResults.innerHTML = '<span style="color: #60a5fa;">Searching ARCHESS Codex...</span>';

      try {
        const resp = await fetch('/api/ai/rag/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query, top_k: 2 })
        });
        const data = await resp.json();

        if (data && data.success && data.results && data.results.length > 0) {
          ragResults.innerHTML = data.results.map(r => `
            <div style="background: rgba(255,255,255,0.04); padding: 6px; border-radius: 4px; margin-bottom: 4px; border-left: 2px solid #3b82f6;">
              <strong style="color: #93c5fd; display: block;">${r.title}</strong>
              <div style="color: #cbd5e1; font-size: 0.72rem; margin-top: 2px;">${r.content}</div>
            </div>
          `).join('');
        } else {
          ragResults.innerHTML = '<span style="color: #94a3b8;">No matching codex entries found.</span>';
        }
      } catch (err) {
        ragResults.innerHTML = '<span style="color: #ef4444;">Error querying codex.</span>';
      }
    }

    if (btnRag) {
      btnRag.addEventListener('click', executeRagSearch);
    }
    if (ragInput) {
      ragInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeRagSearch();
        }
      });
    }

    // 3. Automated Post-Match Debrief Hook
    window.triggerAiMatchDebrief = async function(matchData) {
      try {
        const resp = await fetch('/api/ai/match/debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ match_data: matchData, persona: 'magnus' })
        });
        const data = await resp.json();
        if (data && data.success) {
          const debriefBox = document.getElementById('aiPostMatchDebrief');
          if (debriefBox) {
            debriefBox.innerHTML = `
              <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 8px; padding: 10px; margin-top: 12px; font-size: 0.8rem; text-align: left;">
                <div style="font-weight: 700; color: #c084fc; margin-bottom: 6px;">🧠 Grandmaster AI Debrief</div>
                <div style="margin-bottom: 4px; color: #e2e8f0;"><b>★ MVP Play:</b> ${data.mvp_play}</div>
                <div style="margin-bottom: 4px; color: #e2e8f0;"><b>⚠ Blunder:</b> ${data.critical_blunder}</div>
                <div style="color: #93c5fd;"><b>🎯 Training Tip:</b> ${data.recommended_training}</div>
              </div>
            `;
          }
        }
      } catch (err) {
        // Non-blocking telemetry
      }
    };

    // 4. Esports Shoutcaster Dynamic Commentary Hook
    window.triggerAiShoutcast = async function(combatEvent) {
      try {
        const resp = await fetch('/api/ai/shoutcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: combatEvent })
        });
        const data = await resp.json();
        if (data && data.success && data.commentary) {
          const ticker = document.getElementById('commentaryTickerText');
          if (ticker) ticker.textContent = data.commentary;

          const feed = document.getElementById('tacticalCommentaryFeed');
          if (feed) {
            const item = document.createElement('div');
            item.className = 'commentary-feed-item';
            item.innerHTML = `<span style="color: #a855f7;">[SHOUTCAST]</span> ${data.commentary}`;
            feed.insertBefore(item, feed.firstChild);
          }
        }
      } catch (err) {
        // Non-blocking
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiAdvisor);
  } else {
    initAiAdvisor();
  }
})();
