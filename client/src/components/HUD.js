import React from 'react';
import PropTypes from 'prop-types';
import './HUD.css';

const HUD = ({ gameState, myTeam, isMyTurn }) => {
  if (!gameState) return null;

  const timeElapsed = gameState.lastActivity ?
    Math.floor((Date.now() - gameState.lastActivity) / 1000) : 0;

  return (
    <div className="hud">
      <div className="hud-left">
        <div className="hud-item">
          <span className="hud-label">Turn:</span>
          <span className="hud-value">
            {isMyTurn ? 'YOUR TURN' : `${gameState.currentTurn.toUpperCase()}'S`}
          </span>
          <span className={`hud-turn-indicator ${isMyTurn ? 'your-turn' : 'opponent-turn'}`}></span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Move:</span>
          <span className="hud-value">{gameState.moveCount}</span>
        </div>
      </div>

      <div className="hud-center">
        <div className="hud-item">
          <span className="hud-label">Time:</span>
          <span className="hud-value">{timeElapsed}s</span>
        </div>
        {gameState.gameOver && (
          <div className="hud-item game-over">
            <span className="hud-label">Result:</span>
            <span className="hud-value winner-{gameState.winner}">
              {gameState.winner.toUpperCase()} WINS!
            </span>
          </div>
        )}
      </div>

      <div className="hud-right">
        <div className="hud-item">
          <span className="hud-label">Team:</span>
          <span className="hud-value team-{myTeam}">{myTeam.toUpperCase()}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">FPS:</span>
          <span className="hud-value">60</span> {/* Would be calculated in real implementation */}
        </div>
      </div>
    </div>
  );
};

HUD.propTypes = {
  gameState: PropTypes.shape({
    lastActivity: PropTypes.number,
    moveCount: PropTypes.number,
    gameOver: PropTypes.boolean,
    winner: PropTypes.oneOf(['white', 'black']),
    currentTeam: PropTypes.oneOf(['white', 'black'])
  }),
  myTeam: PropTypes.oneOf(['white', 'black']).isRequired,
  isMyTurn: PropTypes.bool.isRequired
};

export default HUD;