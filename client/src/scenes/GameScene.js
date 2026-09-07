import React, { useState, useEffect, useRef } from 'react';
import useSocket from '../hooks/useSocket';
import { useNavigate, useParams } from 'react-router-dom';
import Board from '../components/Board';
import LaunchControls from '../components/LaunchControls';
import PieceInfo from '../components/PieceInfo';
import TrajectoryPreview from '../components/TrajectoryPreview';
import HUD from '../components/HUD';
import Button from '../components/Button';
import './GameScene.css';

const GameScene = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [launchControlsRef, setLaunchControlsRef] = useState(null);
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize socket connection
  useEffect(() => {
    if (!roomId) return;

    const socketInstance = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3000');
    setSocket(socketInstance);

    // Join the room
    socketInstance.emit('joinRoom', { roomId, playerData: { username: 'Player' } }, (response) => {
      if (response.success) {
        setMyTeam(response.playerId.includes('white') ? 'white' : 'black');
        setIsLoading(false);
      } else {
        alert(`Failed to join room: ${response.error}`);
        navigate('/');
      }
    });

    // Listen for game state updates
    socketInstance.on('gameStateUpdate', (state) => {
      setGameState(state);
      setIsMyTurn(state.currentTurn === myTeam);
    });

    // Listen for piece creation
    socketInstance.on('pieceCreated', (data) => {
      if (gameState) {
        const updatedPieces = [...gameState.pieces, data.piece];
        setGameState(prev => ({ ...prev, pieces: updatedPieces }));
      }
    });

    // Listen for piece removal
    socketInstance.on('pieceRemoved', (data) => {
      if (gameState) {
        const updatedPieces = gameState.pieces.filter(piece => piece.id !== data.pieceId);
        setGameState(prev => ({ ...prev, pieces: updatedPieces }));
      }
    });

    // Listen for launch confirmation
    socketInstance.on('pieceLaunched', (data) => {
      // Reset launch controls
      if (launchControlsRef.current) {
        launchControlsRef.current.reset();
      }
      setSelectedPieceId(null);
    });

    // Listen for collision events
    socketInstance.on('collisionDetected', (data) => {
      // Handle collision visualization (would be implemented in Board or Effects component)
      console.log('Collision detected:', data);
    });

    // Listen for game over
    socketInstance.on('gameOver', (data) => {
      setGameState(prev => ({ ...prev, ...data }));
      // Show game over screen (would be implemented)
      setTimeout(() => {
        alert(`Game Over! Team ${data.winner} wins`);
        navigate('/');
      }, 3000);
    });

    // Handle disconnection
    socketInstance.on('disconnect', () => {
      setIsLoading(false);
      alert('Disconnected from server');
      navigate('/');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [roomId, navigate, gameState, myTeam, launchControlsRef]);

  const handlePieceSelect = (pieceId) => {
    if (!isMyTurn) return;

    const piece = gameState?.pieces.find(p => p.id === pieceId && p.team === myTeam && p.alive);
    if (piece) {
      setSelectedPieceId(pieceId);
    }
  };

  const handleLaunch = (forceData) => {
    if (!selectedPieceId || !socket || !isMyTurn) return;

    socket.emit('launchPiece', {
      roomId,
      pieceId: selectedPieceId,
      forceData
    }, (response) => {
      if (!response.success) {
        alert(`Launch failed: ${response.error}`);
      }
    });
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom', { roomId });
    }
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="game-scene loading">
        <div className="loading-spinner"></div>
        <p>Joining game...</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-scene error">
        <p>Failed to load game state</p>
        <Button onClick={handleLeaveRoom}>Return to Lobby</Button>
      </div>
    );
  }

  return (
    <div className="game-scene">
      <div className="game-header">
        <div className="room-info">
          <h2>Room {roomId}</h2>
          <p>Team: {myTeam?.toUpperCase()}</p>
        </div>
        <div className="turn-indicator">
          <p>Turn: {isMyTurn ? 'YOUR TURN' : `${gameState.currentTurn.toUpperCase()}'S TURN`}</p>
          <div className="turn-indicator-light" style={{ backgroundColor: isMyTurn ? '#4CAF50' : '#f44336' }}></div>
        </div>
        <Button onClick={handleLeaveRoom} variant="secondary" className="leave-button">
          Leave Room
        </Button>
      </div>

      <div className="game-content">
        <div className="game-board-container">
          <Board
            gameState={gameState}
            myTeam={myTeam}
            onPieceSelect={handlePieceSelect}
            selectedPieceId={selectedPieceId}
          />

          {/* Launch controls appear when a piece is selected */}
          {selectedPieceId && (
            <LaunchControls
              ref={setLaunchControlsRef}
              onLaunch={handleLaunch}
              onCancel={() => setSelectedPieceId(null)}
              pieceId={selectedPieceId}
              gameState={gameState}
            />
          )}

          {/* Trajectory preview when aiming */}
          {selectedPieceId && launchControlsRef.current && launchControlsRef.current.isAiming && (
            <TrajectoryPreview
              pieceId={selectedPieceId}
              gameState={gameState}
              launchData={launchControlsRef.current.launchData}
            />
          )}
        </div>

        <div className="game-sidebar">
          <PieceInfo
            gameState={gameState}
            myTeam={myTeam}
          />
          <HUD
            gameState={gameState}
            myTeam={myTeam}
            isMyTurn={isMyTurn}
          />
        </div>
      </div>

      {/* Game over overlay */}
      {gameState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2>Game Over</h2>
            <p>Team {gameState.winner.toUpperCase()} wins!</p>
            <p>Total moves: {gameState.moveCount}</p>
            <Button onClick={handleLeaveRoom} variant="primary">
              Return to Lobby
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScene;