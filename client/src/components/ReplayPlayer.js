import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ReplayPlayer.css';

const ReplayPlayer = ({ replayData, onFinish }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 0.5x, etc.
  const [showControls, setShowControls] = useState(false);
  const animationFrameRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!replayData) return;

    // Start playing automatically
    setIsPlaying(true);

    const startTime = performance.now();

    const tick = () => {
      if (!isPlaying) return;

      const elapsed = (performance.now() - startTime) / 1000 * speed;
      setCurrentTime(Math.min(elapsed, replayData.duration));

      if (elapsed >= replayData.duration) {
        setIsPlaying(false);
        onFinish();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [replayData, isPlaying, speed, onFinish]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      // Pause
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      // Play
      const startTime = performance.now() - (currentTime * 1000 / speed);
      const tick = () => {
        if (!isPlaying) return;

        const elapsed = (performance.now() - startTime) / 1000 * speed;
        setCurrentTime(Math.min(elapsed, replayData.duration));

        if (elapsed >= replayData.duration) {
          setIsPlaying(false);
          onFinish();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(tick);
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    }
  };

  const setCurrentTimeHandler = (time) => {
    setCurrentTime(time);
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    // Reset playback time when changing speed to avoid jumps
    if (isPlaying) {
      setIsPlaying(false);
      setIsPlaying(true);
    }
  };

  const getCurrentMoves = () => {
    if (!replayData || !replayData.moves) return [];
    return replayData.moves.filter(move => move.time <= currentTime);
  };

  return (
    <div className="replay-player">
      <div className="replay-player-header">
        <h2>Replay Player</h2>
        <div className="replay-player-controls">
          <button
            onClick={togglePlay}
            className={`replay-button ${isPlaying ? 'pause' : 'play'}`}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          <div className="replay-time">
            {formatTime(currentTime)} / {formatTime(replayData.duration)}
          </div>

          <div className="replay-speed">
            <button
              onClick={() => handleSpeedChange(0.5)}
              className={speed === 0.5 ? 'speed-active' : ''}
            >
              0.5x
            </button>
            <button
              onClick={() => handleSpeedChange(1)}
              className={speed === 1 ? 'speed-active' : ''}
            >
              1x
            </button>
            <button
              onClick={() => handleSpeedChange(2)}
              className={speed === 2 ? 'speed-active' : ''}
            >
              2x
            </button>
          </div>
        </div>
      </div>

      <div className="replay-player-body">
        {/* In a full implementation, this would show the actual game board with pieces */}
        <div className="replay-board-placeholder">
          <div className="replay-board-grid">
            {/* Simple 8x8 grid representation */}
            {[...Array(8)].map((_, row) => (
              <div key={`row-${row}`} className="replay-board-row">
                {[...Array(8)].map((_, col) => (
                  <div
                    key={`cell-${row}-${col}`}
                    className={`replay-board-cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`}
                  >
                    {/* Would show piece here based on current game state */}
                    <div className="replay-piece-placeholder">
                      {/* Piece would be rendered based on moves up to currentTime */}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="replay-moves-log">
          <h3>Moves Log</h3>
          <div className="moves-list">
            {getCurrentMoves().map((move, index) => (
              <div key={index} className="move-entry">
                <span className="move-time">{formatTime(move.time)}s</span>
                <span className="move-type">{move.type}</span>
                {move.pieceId && <span className="move-piece">{move.pieceId}</span>}
                {move.force && (
                  <span className="move-force">
                    ({move.force.x.toFixed(1)}, {move.force.y.toFixed(1)}, {move.force.z.toFixed(1)})
                  </span>
                )}
                {move.damage && <span className="move-damage">DMG: {move.damage}</span>}
                {move.team && <span className="move-team">Team: {move.team}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds) % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

ReplayPlayer.propTypes = {
  replayData: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    duration: PropTypes.number,
    moves: PropTypes.arrayOf(PropTypes.shape({
      time: PropTypes.number.isRequired,
      type: PropTypes.string.isRequired,
      pieceId: PropTypes.string,
      force: PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number,
        z: PropTypes.number
      }),
      damage: PropTypes.number,
      team: PropTypes.oneOf(['white', 'black'])
    }))
  }),
  onFinish: PropTypes.func.isRequired
};

export default ReplayPlayer;