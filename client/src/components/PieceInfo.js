import React from 'react';
import PropTypes from 'prop-types';
import './PieceInfo.css';

const PieceInfo = ({ gameState, myTeam }) => {
  if (!gameState || !gameState?.pieces) return null;

  // Count pieces by team and type
  const whitePieces = gameState.pieces.filter(p => p.team === 'white' && p.alive);
  const blackPieces = gameState.pieces.filter(p => p.team === 'black' && p.alive);

  // Group by type
  const whiteByType = {};
  const blackByType = {};

  whitePieces.forEach(piece => {
    whiteByType[piece.type] = (whiteByType[piece.type] || 0) + 1;
  });

  blackPieces.forEach(piece => {
    blackByType[piece.type] = (blackByType[piece.type] || 0) + 1;
  });

  // Calculate team statistics
  const whiteStats = calculateTeamStats(whitePieces);
  const blackStats = calculateTeamStats(blackPieces);

  // Piece type display names and icons
  const pieceIcons = {
    pawn: '♙',
    knight: '♘',
    bishop: '♗',
    rook: '♖',
    queen: '♕',
    king: '♔'
  };

  const pieceNames = {
    pawn: 'Pawn',
    knight: 'Knight',
    bishop: 'Bishop',
    rook: 'Rook',
    queen: 'Queen',
    king: 'King'
  };

  return (
    <div className="piece-info card">
      <div className="piece-info-header">
        <h3>Forces</h3>
        <div className="team-balance">
          <div className="team-indicator white-team">
            <span className="team-label">White</span>
            <span className="team-force">{whiteStats.totalPower}</span>
          </div>
          <div className="team-vs">VS</div>
          <div className="team-indicator black-team">
            <span className="team-label">Black</span>
            <span className="team-force">{blackStats.totalPower}</span>
          </div>
        </div>
      </div>
      <div className="piece-info-content">
        <div className="team-stats white-team">
          <div className="team-header">
            <div className="team-label">White Team</div>
            <div className="team-count">{whitePieces.length}</div>
          </div>
          <div className="team-details">
            <div className="detail-row">
              <span className="detail-label">Power:</span>
              <span className="detail-value">{whiteStats.totalPower}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">HP:</span>
              <span className="detail-value">{whiteStats.totalHP}/{whiteStats.maxTotalHP}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Mass:</span>
              <span className="detail-value">{whiteStats.avgMass.toFixed(2)}</span>
            </div>
          </div>
          <div className="team-breakdown">
            {Object.entries(whiteByType).map(([type, count]) => (
              <div key={type} className="piece-type-stat">
                <div className="piece-icon">{pieceIcons[type]}</div>
                <div className="piece-info">
                  <div className="piece-name">{pieceNames[type]}</div>
                  <div className="piece-count">{count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="team-stats black-team">
          <div className="team-header">
            <div className="team-label">Black Team</div>
            <div className="team-count">{blackPieces.length}</div>
          </div>
          <div className="team-details">
            <div className="detail-row">
              <span className="detail-label">Power:</span>
              <span className="detail-value">{blackStats.totalPower}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">HP:</span>
              <span className="detail-value">{blackStats.totalHP}/{blackStats.maxTotalHP}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Mass:</span>
              <span className="detail-value">{blackStats.avgMass.toFixed(2)}</span>
            </div>
          </div>
          <div className="team-breakdown">
            {Object.entries(blackByType).map(([type, count]) => (
              <div key={type} className="piece-type-stat">
                <div className="piece-icon">{pieceIcons[type]}</div>
                <div className="piece-info">
                  <div className="piece-name">{pieceNames[type]}</div>
                  <div className="piece-count">{count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected piece details */}
      {gameState.selectedPieceId && (
        <div className="selected-piece-card">
          <div className="selected-piece-header">
            <h4>Selected Piece</h4>
            <button className="deselect-button" onClick={() => {
              // This would need to be passed as a prop or accessed via context
              console.log('Deselect piece');
            }}>
              ×
            </button>
          </div>
          <div className="selected-piece-content">
            {getSelectedPieceDetails(gameState, myTeam)}
          </div>
          {getSelectedPieceAbilities(gameState, myTeam)}
        </div>
      )}
    </div>
  );
};

const calculateTeamStats = (pieces) => {
  if (pieces.length === 0) {
    return {
      totalPower: 0,
      totalHP: 0,
      maxTotalHP: 0,
      avgMass: 0
    };
  }

  const totalPower = pieces.reduce((sum, p) => sum + p.power, 0);
  const totalHP = pieces.reduce((sum, p) => sum + p.hp, 0);
  const maxTotalHP = pieces.reduce((sum, p) => sum + p.maxHp, 0);
  const avgMass = pieces.reduce((sum, p) => sum + p.mass, 0) / pieces.length;

  return {
    totalPower,
    totalHP,
    maxTotalHP,
    avgMass
  };
};

const getPieceIcon = (type) => {
  const icons = {
    pawn: '♙',
    knight: '♘',
    bishop: '♗',
    rook: '♖',
    queen: '♕',
    king: '♔'
  };
  return icons[type] || '♟️';
};

const getSelectedPieceDetails = (gameState, myTeam) => {
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return null;

  const isOwnPiece = piece.team === myTeam;
  const hpPercentage = (piece.hp / piece.maxHp) * 100;
  const powerPercentage = (piece.piece.power / 100) * 100; // Normalize power for display

  return (
    <div className="piece-stats-section">
      <div className="piece-identity">
        <div className="piece-icon-large">{getPieceIcon(piece.type)}</div>
        <div className="piece-info-text">
          <div className="piece-name">{pieceNames[piece.type] || piece.type}</div>
          <div className={`piece-team team-${piece.team}`}>
            {piece.team.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="piece-stats-grid">
        <div className="stat-group">
          <div className="stat-label">Health</div>
          <div className="stat-value">{piece.hp}/{piece.maxHp}</div>
          <div className="hp-bar-container">
            <div
              className="hp-bar"
              style={{ width: `${hpPercentage}%` }}
            ></div>
          </div>
          {hpPercentage > 75 && <span className="hp-status hp-healthy">Healthy</span>}
          {hpPercentage > 30 && hpPercentage <= 75 && <span className="hp-status hp-wounded">Wounded</span>}
          {hpPercentage <= 30 && hpPercentage > 0 && <span className="hp-status hp-critical">Critical</span>}
          {hpPercentage === 0 && <span className="hp-status hp-dead">Destroyed</span>}
        </div>

        <div className="stat-group">
          <div className="stat-label">Power</div>
          <div className="stat-value">{piece.power}</div>
          <div className="power-bar-container">
            <div
              className="power-bar-fill"
              style={{ width: `${Math.min(piece.power / 100 * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="stat-group">
          <div className="stat-label">Mass</div>
          <div class="stat-value">{piece.mass.toFixed(2)}</div>
        </div>

        <div className="stat-group">
          <div className="stat-label">Radius</div>
          <div className="stat-value">{piece.radius.toFixed(2)}</div>
        </div>

        {isOwnPiece && (
          <div className="stat-group">
            <div className="stat-label">Status</div>
            <div className="stat-value status-{piece.alive ? 'alive' : 'dead'}">
              {piece.alive ? 'Ready' : 'Destroyed'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getSelectedPieceAbilities = (gameState, myTeam) => {
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece || piece.team !== myTeam) return null;

  // Get abilities from piece data if available, otherwise use fallback
  let abilities = piece.abilities || [];

  // If no abilities in piece data, use fallback based on piece type
  if (abilities.length === 0) {
    const abilitiesByType = {
      pawn: [
        { name: 'Swarm', description: 'Launch 3 weaker shots in a spread pattern', cooldown: 8, maxCooldown: 8 },
        { name: 'Shield', description: 'Temporary damage resistance for 5 seconds', cooldown: 12, maxCooldown: 12 }
      ],
      knight: [
        { name: 'Jump Shot', description: 'Ignore first collision, continue with reduced velocity', cooldown: 6, maxCooldown: 6 },
        { name: 'Teleport', description: 'Short-range blink before launch', cooldown: 10, maxCooldown: 10 }
      ],
      bishop: [
        { name: 'Piercing Shot', description: 'Damage continues through pieces with reduction', cooldown: 7, maxCooldown: 7 },
        { name: 'Reflective Shot', description: 'Bounce off pieces instead of stopping', cooldown: 9, maxCooldown: 9 }
      ],
      rook: [
        { name: 'Blast Shot', description: 'Area damage on impact in radius', cooldown: 10, maxCooldown: 10 },
        { name: 'Magnetic Shot', description: 'Pull pieces toward impact point', cooldown: 12, maxCooldown: 12 }
      ],
      queen: [
        { name: 'Hybrid Shot', description: 'Combine two abilities of your choice', cooldown: 15, maxCooldown: 15 },
        { name: 'Cascade Shot', description: 'Chain reaction between pieces', cooldown: 18, maxCooldown: 18 }
      ],
      king: [
        { name: 'Last Stand', description: 'Enhanced abilities when HP < 30%', cooldown: 0, maxCooldown: 0, passive: true },
        { name: 'Guard Stance', description: 'Reflect damage back to attacker', cooldown: 20, maxCooldown: 20 }
      ]
    };

    abilities = abilitiesByType[piece.type] || [];
  }

  if (abilities.length === 0) return null;

  return (
    <div className="piece-abilities-section">
      <div className="section-title">Abilities</div>
      <div className="abilities-list">
        {abilities.map((ability, index) => {
          const isReady = !ability.isActive && ability.cooldown <= 0 && !ability.isPassive;
          const cooldownPercentage = ability.maxCooldown > 0
            ? Math.max(0, Math.min(100, (1 - ability.cooldown / ability.maxCooldown) * 100))
            : 0;

          return (
            <div key={index} className={`ability-item ${ability.isPassive ? 'passive' : 'active'} ${isReady ? 'ready' : ''}`}>
              <div className="ability-header">
                <span className="ability-name">{ability.name}</span>
                {ability.isPassive && <span className="ability-tag passive">Passive</span>}
                {!ability.isPassive && ability.isActive && (
                  <span className="ability-tag active">Active</span>
                )}
                {!ability.isPassive && !ability.isActive && (
                  <span className="ability-tag cooldown">CD: {Math.ceil(ability.cooldown)}s</span>
                )}
              </div>
              <div className="ability-description">{ability.description}</div>
              {!ability.isPassive && !ability.isActive && (
                <div className="ability-cooldown-bar">
                  <div
                    className="ability-cooldown-fill"
                    style={{ width: `${cooldownPercentage}%` }}
                  ></div>
                </div>
              )}
              {!ability.isPassive && ability.isActive && (
                <div className="ability-cooldown-bar ability-active-bar">
                  <div className="ability-cooldown-fill active"></div>
                </div>
              )}
              {!ability.isPassive && !ability.isActive && isReady && (
                <button
                  className="ability-activate-button"
                  onClick={() => {
                    // In a full implementation, this would set the selected ability for launching
                    console.log(`Activating ability: ${ability.name}`);
                    // We would need to communicate this to the game state or launch controls
                  }}
                >
                  Use Ability
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

PieceInfo.propTypes = {
  gameState: PropTypes.shape({
    pieces: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      team: PropTypes.oneOf(['white', 'black']).isRequired,
      position: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired
      }).isRequired,
      velocity: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired
      }),
      hp: PropTypes.number,
      maxHp: PropTypes.number,
      power: PropTypes.number,
      radius: PropTypes.number,
      mass: PropTypes.number,
      alive: PropTypes.boolean
    })),
    selectedPieceId: PropTypes.string
  }),
  myTeam: PropTypes.oneOf(['white', 'black'])
};

export default PieceInfo;