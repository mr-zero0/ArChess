import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../styles/globals.css';

const LaunchControls = ({ onLaunch, onCancel, pieceId, gameState }) => {
  const [isAiming, setIsAiming] = useState(false);
  const [launchData, setLaunchData] = useState({ x: 0, y: 0, z: 0 });
  const [power, setPower] = useState(0);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [maxPower, setMaxPower] = useState(50);
  const [isOvercharging, setIsOvercharging] = useState(false);

  const containerRef = useRef(null);
  const dragStartRef = useRef(null);
  const animationFrameRef = useRef(null);
  const powerPulseRef = useRef(null);

  // Get piece position from gameState
  const piece = gameState?.pieces?.find(p => p.id === pieceId);

  useEffect(() => {
    // Update max power based on piece power if available
    if (piece) {
      const pieceMaxPower = Math.min(piece.power * 2, 100); // Scale piece power to launch power
      setMaxPower(pieceMaxPower);
    }
  }, [piece]);

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setIsCharging(true);
    setIsAiming(true);

    // Start power pulse animation for visual feedback
    powerPulseRef.current = setInterval(() => {
      setIsOvercharging(!isOvercharging);
    }, 500);
  };

  const handleMouseMove = (e) => {
    if (!isCharging || !dragStartRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Calculate drag vector
    const dragX = currentX - dragStartRef.current.x;
    const dragY = currentY - dragStartRef.current.y;

    // Convert to launch force (invert Y since screen Y increases downward)
    const forceX = dragX * 0.5; // Sensitivity factor
    const forceY = -dragY * 0.5; // Negative because up on screen is negative Y in world
    const forceZ = 0; // 2D game for now

    // Calculate power based on drag distance
    const distance = Math.sqrt(dragX * dragX + dragY * dragY);
    const maxDistance = Math.max(rect.width, rect.height) * 0.8; // 80% of container size
    let powerLevel = Math.min((distance / maxDistance) * 100, 100);

    // Apply piece-specific power multiplier
    if (piece) {
      powerLevel = Math.min(powerLevel * (piece.power / 50), 100); // Normalize
    }

    setPower(powerLevel);
    setChargeLevel(powerLevel / 100);
    setLaunchData({ x: forceX, y: forceY, z: forceZ });

    // Check for overcharge (visual warning)
    setIsOvercharging(powerLevel > 85);
  };

  const handleMouseUp = () => {
    if (!isCharging) return;

    setIsCharging(false);

    // Clear power pulse animation
    if (powerPulseRef.current) {
      clearInterval(powerPulseRef.current);
      powerPulseRef.current = null;
    }

    // Launch if we have sufficient power
    if (power > 5) { // Minimum threshold to launch
      onLaunch(launchData);
    }

    // Reset after launch
    setIsAiming(false);
    setPower(0);
    setChargeLevel(0);
    setIsCharging(false);
    setIsOvercharging(false);
    setLaunchData({ x: 0, y: 0, z: 0 });
    dragStartRef.current = null;
  };

  const handleKeyDown = (e) => {
    // Cancel launch with Escape key
    if (e.key === 'Escape' && isAiming) {
      e.preventDefault();
      onCancel();
      setIsAiming(false);
      setPower(0);
      setChargeLevel(0);
      setIsCharging(false);
      setIsOvercharging(false);
      setLaunchData({ x: 0, y: 0, z: 0 });
      dragStartRef.current = null;

      // Clear power pulse animation
      if (powerPulseRef.current) {
        clearInterval(powerPulseRef.current);
        powerPulseRef.current = null;
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);

      // Clear power pulse animation on unmount
      if (powerPulseRef.current) {
        clearInterval(powerPulseRef.current);
      }
    };
  }, []);

  if (!piece) return null;

  return (
    <div
      ref={containerRef}
      className={`launch-controls ${isAiming ? 'aiming' : ''} ${isOvercharging ? 'overcharging' : ''}`}
      onTouchStart={handleMouseDown}
      onTouchMove={(e) => {
        e.preventDefault();
        if (e.touches[0]) {
          handleMouseMove(e.touches[0]);
        }
      }}
      onTouchEnd={handleMouseUp}
      onTouchCancel={handleMouseUp}
    >
      <div className="launch-instructions">
        {isAiming ?
          <p>Drag to aim and launch</p> :
          <p>Click and drag to launch piece</p>
        }
      </div>

      <div className="power-indicator">
        <div className="power-bar">
          <div
            className="power-fill"
            style={{ width: `${chargeLevel * 100}%` }}
          ></div>
        </div>
        <div className="power-text">
          {Math.round(power)}%
          {power > 80 && <span className="power-warning">(High Risk!)</span>}
          {!isAiming && power === 0 && <span className="power-ready">Ready</span>}
        </div>
      </div>

      {!isAiming && (
        <div className="launch-help">
          <p>Click and hold to charge</p>
          <p>Release to launch</p>
          <p>ESC to cancel</p>
        </div>
      )}

      {/* Visual feedback for overcharge */}
      {isOvercharging && isAiming && (
        <div className="overcharge-warning">
          <span className="warning-icon">⚠</span>
          <span>Overcharge risk - may damage your piece!</span>
        </div>
      )}
    </div>
  );
};

LaunchControls.propTypes = {
  onLaunch: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  pieceId: PropTypes.string.isRequired,
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
    }))
  })
};

export default React.forwardRef(LaunchControls);