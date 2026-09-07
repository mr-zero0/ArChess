import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Menu from '../components/Menu';
import VariantSelector from '../components/VariantSelector';
import './LobbyScene.css';

const LobbyScene = () => {
  const [socket, setSocket] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomOptions, setRoomOptions] = useState({});
  const [gameVariants, setGameVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3000');
    setSocket(socketInstance);
    setIsConnected(true);

    // Handle connection events
    socketInstance.on('connect', () => {
      console.log('Connected to server');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Handle room list updates
    socketInstance.on('roomList', (roomList) => {
      setRooms(roomList);
    });

    // Handle game variants list
    socketInstance.on('gameVariants', (variants) => {
      setGameVariants(variants);
    });

    // Handle error events
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Fetch initial data
    socketInstance.emit('getInitialData');

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Mouse tracking for interactive background
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: e.clientX,
        y: e.clientY
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleJoinRoom = (roomId) => {
    if (!username) {
      alert('Please enter a username');
      return;
    }

    socket.emit('joinRoom', { roomId, playerData: { username } });
    navigate(`/game/${roomId}`);
  };

  const handleCreateRoom = () => {
    setCreatingRoom(true);
  };

  const handleRoomOptionsSubmit = (options) => {
    setRoomOptions(options);
    setCreatingRoom(false);
  };

  const handleRoomOptionsCancel = () => {
    setCreatingRoom(false);
    setRoomOptions({});
  };

  const handleCreateRoomSubmit = () => {
    if (!username) {
      alert('Please enter a username');
      return;
    }

    const roomData = {
      ...roomOptions,
      variantId: selectedVariant,
      playerData: { username }
    };

    socket.emit('createRoom', roomData, (response) => {
      if (response.success) {
        navigate(`/game/${response.roomId}`);
      } else {
        alert(`Failed to create room: ${response.error}`);
      }
    });
  };

  const handleStartGame = () => {
    if (selectedRoom) {
      socket.emit('startGame', { roomId: selectedRoom });
    }
  };

  if (!isConnected) {
    return (
      <div className="lobby-scene connection-error">
        <div className="error-content">
          <h1>Connection Error</h1>
          <p>Unable to connect to the server. Please check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Retry Connection</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-scene">
      <header className="lobby-header">
        <div className="hero-background" style={{
          '--mouse-x': `${mousePos.x}px`,
          '--mouse-y': `${mousePos.y}px`
        }}>
          <div className="hero-content">
            <h1>Physics Chess Variant</h1>
            <div className="lobby-controls">
              <div className="username-input">
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!username.trim()}
                />
              </div>
              <Button
                onClick={handleCreateRoom}
                disabled={!username.trim() || creatingRoom}
                variant="primary"
              >
                Create Room
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="lobby-main">
        {isConnected ? (
          <>
            <section className="room-list">
              <h2>Available Rooms</h2>
              {rooms.length > 0 ? (
                <ul className="room-list-items">
                  {rooms.map((room) => (
                    <li key={room.id} className="room-item">
                      <div className="room-info">
                        <h3>Room {room.id}</h3>
                        <p>
                          Players: {room.playerCount}/{room.maxPlayers}
                          {room.playerCount >= room.maxPlayers && (
                            <span className="room-full">(Full)</span>
                          )}
                        </p>
                        <p>Mode: {room.gameMode}</p>
                        <p>Status:
                          <span className={`room-status ${room.status}`}>
                            {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                          </span>
                        </p>
                      </div>
                      <div className="room-actions">
                        {room.status === 'waiting' && room.playerCount < room.maxPlayers ? (
                          <Button
                            onClick={() => handleJoinRoom(room.id)}
                            variant="success"
                          >
                            Join
                          </Button>
                        ) : (
                          <Button disabled variant="secondary">
                            Join
                          </Button>
                        )}
                        {room.status === 'waiting' && room.playerCount > 0 ? (
                          <Button
                            onClick={handleStartGame}
                            disabled={selectedRoom !== room.id}
                            variant="warning"
                          >
                            Start Game
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-rooms">No rooms available. Create one to get started!</p>
              )}
            </section>

            {creatingRoom && (
              <Menu
                title="Create New Room"
                onSubmit={handleRoomOptionsSubmit}
                onCancel={handleRoomOptionsCancel}
              >
                <div className="room-options-form">
                  <div className="form-group">
                    <label htmlFor="game-mode">Game Mode:</label>
                    <select
                      id="game-mode"
                      value={roomOptions.gameMode || 'standard'}
                      onChange={(e) => {
                        setRoomOptions(prev => ({ ...prev, gameMode: e.target.value }));
                      }}
                    >
                      <option value="standard">Standard (King Destruction)</option>
                      <option value="timed">Timed Mode</option>
                      <option value="points">Points Mode</option>
                      <option value="survivor">Survivor Mode</option>
                      <option value="assassin">Assassin Mode</option>
                      <option value="protection">King Protection</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="max-players">Max Players:</label>
                    <select
                      id="max-players"
                      value={roomOptions.maxPlayers || 2}
                      onChange={(e) => {
                        setRoomOptions(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }));
                      }}
                    >
                      <option value="2">2 Players</option>
                      <option value="4">4 Players</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="time-limit">Time Limit (seconds):</label>
                    <input
                      type="number"
                      id="time-limit"
                      value={roomOptions.timeLimit || 300}
                      min="30"
                      max="1800"
                      step="30"
                      onChange={(e) => {
                        setRoomOptions(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }));
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="point-goal">Point Goal:</label>
                    <input
                      type="number"
                      id="point-goal"
                      value={roomOptions.pointGoal || 10}
                      min="1"
                      max="50"
                      onChange={(e) => {
                        setRoomOptions(prev => ({ ...prev, pointGoal: parseInt(e.target.value) }));
                      }}
                    />
                  </div>

                  {gameVariants.length > 0 && (
                    <div className="form-group">
                      <label htmlFor="variant-select">Game Variant:</label>
                      <VariantSelector
                        variants={gameVariants}
                        selectedVariant={selectedVariant}
                        onSelect={setSelectedVariant}
                        includeCustom={true}
                      />
                    </div>
                  )}
                </div>
              </Menu>
            )}
          </>
        ) : (
          <div className="connection-error">
            <p>Disconnected from server. Please check your connection.</p>
            <Button onClick={() => window.location.reload()}>Retry Connection</Button>
          </div>
        )}
      </main>

      <footer className="lobby-footer">
        <p>Physics Chess Variant • Built with React, Three.js & Node.js</p>
      </footer>
    </div>
  );
};

export default LobbyScene;